class MessageQueue {
	#messages = [];

	enqueue(message) {
		this.#messages.push(message);
	}

	drainOne() {
		const message = this.#messages.shift();
		return message ? [message] : [];
	}
}

class Agent {
	constructor({ model, tools = [] }) {
		this.model = model;
		this.tools = tools;
		this.listeners = new Set();
		this.steeringQueue = new MessageQueue();
		this.followUpQueue = new MessageQueue();
		this.abortController = undefined;
	}

	subscribe(listener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	steer(content) {
		this.steeringQueue.enqueue({ role: "user", content, source: "steering" });
	}

	followUp(content) {
		this.followUpQueue.enqueue({ role: "user", content, source: "follow-up" });
	}

	abort() {
		this.abortController?.abort();
	}

	async prompt(content) {
		if (this.abortController) {
			throw new Error("Agent is already running");
		}

		this.abortController = new AbortController();
		try {
			return await runLoop({
				prompts: [{ role: "user", content, source: "prompt" }],
				model: this.model,
				tools: this.tools,
				signal: this.abortController.signal,
				getSteeringMessages: () => this.steeringQueue.drainOne(),
				getFollowUpMessages: () => this.followUpQueue.drainOne(),
				emit: async (event) => {
					for (const listener of this.listeners) {
						await listener(event);
					}
				},
			});
		} finally {
			this.abortController = undefined;
		}
	}
}

async function runLoop({
	prompts,
	model,
	tools,
	signal,
	getSteeringMessages,
	getFollowUpMessages,
	emit,
}) {
	const messages = [...prompts];
	let pendingMessages = getSteeringMessages();
	let firstTurn = true;

	await emit({ type: "agent_start" });
	await emit({ type: "turn_start" });
	for (const prompt of prompts) {
		await emit({ type: "message_end", message: prompt });
	}

	while (true) {
		let hasMoreToolCalls = true;

		while (hasMoreToolCalls || pendingMessages.length > 0) {
			if (firstTurn) {
				firstTurn = false;
			} else {
				await emit({ type: "turn_start" });
			}

			for (const message of pendingMessages) {
				messages.push(message);
				await emit({ type: "message_end", message });
			}
			pendingMessages = [];

			let assistantMessage;
			try {
				assistantMessage = await model(structuredClone(messages), signal);
			} catch (error) {
				assistantMessage = {
					role: "assistant",
					content: [],
					stopReason: signal.aborted ? "aborted" : "error",
					errorMessage: error instanceof Error ? error.message : String(error),
				};
			}

			messages.push(assistantMessage);
			await emit({ type: "message_end", message: assistantMessage });

			if (assistantMessage.stopReason === "error" || assistantMessage.stopReason === "aborted") {
				await emit({ type: "turn_end", message: assistantMessage, toolResults: [] });
				await emit({ type: "agent_end", messages });
				return messages;
			}

			const toolCalls = assistantMessage.content.filter((item) => item.type === "toolCall");
			const toolResults = [];
			hasMoreToolCalls = toolCalls.length > 0;

			for (const toolCall of toolCalls) {
				await emit({ type: "tool_execution_start", toolCall });
				const tool = tools.find((candidate) => candidate.name === toolCall.name);
				if (!tool) {
					throw new Error(`Unknown tool: ${toolCall.name}`);
				}

				let content;
				let isError = false;
				try {
					content = await tool.execute(toolCall.arguments, signal);
				} catch (error) {
					content = error instanceof Error ? error.message : String(error);
					isError = true;
				}
				const toolResult = {
					role: "toolResult",
					toolCallId: toolCall.id,
					toolName: toolCall.name,
					content,
					isError,
				};
				await emit({ type: "tool_execution_end", toolResult });
				messages.push(toolResult);
				toolResults.push(toolResult);
				await emit({ type: "message_end", message: toolResult });
			}

			await emit({ type: "turn_end", message: assistantMessage, toolResults });
			pendingMessages = getSteeringMessages();
		}

		const followUpMessages = getFollowUpMessages();
		if (followUpMessages.length > 0) {
			pendingMessages = followUpMessages;
			continue;
		}

		break;
	}

	await emit({ type: "agent_end", messages });
	return messages;
}

function abortableDelay(milliseconds, signal) {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new Error("Operation aborted"));
			return;
		}

		const timer = setTimeout(() => {
			signal.removeEventListener("abort", onAbort);
			resolve();
		}, milliseconds);
		const onAbort = () => {
			clearTimeout(timer);
			reject(new Error("Operation aborted"));
		};
		signal.addEventListener("abort", onAbort, { once: true });
	});
}

function printEvent(event) {
	switch (event.type) {
		case "turn_start":
			console.log("turn_start");
			break;
		case "message_end":
			console.log(
				`message  role=${event.message.role} source=${event.message.source ?? "model"}${
					event.message.stopReason ? ` stop=${event.message.stopReason}` : ""
				}`,
			);
			break;
		case "tool_execution_start":
			console.log(`tool_start name=${event.toolCall.name}`);
			break;
		case "tool_execution_end":
			console.log(`tool_end   name=${event.toolResult.toolName}`);
			break;
		case "turn_end":
			console.log("turn_end");
			break;
		case "agent_end":
			console.log("agent_end");
			break;
	}
}

async function runSteeringScenario() {
	console.log("STEERING");
	const tool = {
		name: "slow_step",
		async execute(_args, signal) {
			await abortableDelay(10, signal);
			return "original step completed";
		},
	};
	const model = async (messages) => {
		const lastMessage = messages.at(-1);
		if (lastMessage.source === "prompt") {
			return {
				role: "assistant",
				content: [{ type: "toolCall", id: "call-1", name: "slow_step", arguments: {} }],
			};
		}
		return { role: "assistant", content: [{ type: "text", text: `Accepted: ${lastMessage.content}` }] };
	};
	const agent = new Agent({ model, tools: [tool] });
	agent.subscribe(async (event) => {
		printEvent(event);
		if (event.type === "tool_execution_start") {
			console.log("control  steering queued");
			agent.steer("Change direction");
		}
	});
	await agent.prompt("Start task");
}

async function runFollowUpScenario() {
	console.log("\nFOLLOW-UP");
	const model = async (messages) => {
		const lastMessage = messages.at(-1);
		return { role: "assistant", content: [{ type: "text", text: `Answered: ${lastMessage.content}` }] };
	};
	const agent = new Agent({ model });
	agent.subscribe(printEvent);
	console.log("control  follow-up queued");
	agent.followUp("One more question");
	await agent.prompt("First question");
}

async function runAbortScenario() {
	console.log("\nABORT");
	const model = async (_messages, signal) => {
		await abortableDelay(50, signal);
		return { role: "assistant", content: [{ type: "text", text: "Too late" }] };
	};
	const agent = new Agent({ model });
	agent.subscribe(printEvent);
	const run = agent.prompt("Start slow model");
	setTimeout(() => {
		console.log("control  abort requested");
		agent.abort();
	}, 10);
	const messages = await run;
	const finalMessage = messages.at(-1);
	console.log(`result   stopReason=${finalMessage.stopReason} error=${finalMessage.errorMessage}`);
}

await runSteeringScenario();
await runFollowUpScenario();
await runAbortScenario();
