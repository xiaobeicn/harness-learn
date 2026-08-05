const echoTool = {
	name: "echo",
	async execute(args) {
		return `echoed: ${args.value}`;
	},
};

async function fakeModel(messages) {
	const lastMessage = messages.at(-1);

	if (lastMessage?.role === "user") {
		return {
			role: "assistant",
			content: [{ type: "toolCall", id: "call-1", name: "echo", arguments: { value: "hello" } }],
		};
	}

	return {
		role: "assistant",
		content: [{ type: "text", text: `Model saw: ${lastMessage.content}` }],
	};
}

async function runLoop({ input, model, tools, emit }) {
	const messages = [];
	let turn = 1;

	await emit({ type: "agent_start" });
	await emit({ type: "turn_start", turn });

	const userMessage = { role: "user", content: input };
	messages.push(userMessage);
	await emit({ type: "message_start", message: userMessage });
	await emit({ type: "message_end", message: userMessage });

	while (true) {
		const assistantMessage = await model(structuredClone(messages));
		messages.push(assistantMessage);
		await emit({ type: "message_start", message: assistantMessage });
		await emit({ type: "message_end", message: assistantMessage });

		const toolCalls = assistantMessage.content.filter((item) => item.type === "toolCall");
		const toolResults = [];

		for (const toolCall of toolCalls) {
			await emit({ type: "tool_execution_start", toolCall });
			const tool = tools.find((candidate) => candidate.name === toolCall.name);
			const toolResult = tool
				? {
						role: "toolResult",
						toolCallId: toolCall.id,
						toolName: toolCall.name,
						content: await tool.execute(toolCall.arguments),
						isError: false,
					}
				: {
						role: "toolResult",
						toolCallId: toolCall.id,
						toolName: toolCall.name,
						content: `Unknown tool: ${toolCall.name}`,
						isError: true,
					};

			await emit({ type: "tool_execution_end", toolResult });
			messages.push(toolResult);
			toolResults.push(toolResult);
			await emit({ type: "message_start", message: toolResult });
			await emit({ type: "message_end", message: toolResult });
		}

		await emit({ type: "turn_end", turn, assistantMessage, toolResults });

		if (toolCalls.length === 0) {
			await emit({ type: "agent_end", messages });
			return messages;
		}

		turn += 1;
		await emit({ type: "turn_start", turn });
	}
}

class Agent {
	constructor({ model, tools }) {
		this.model = model;
		this.tools = tools;
		this.listeners = new Set();
		this.state = {
			messages: [],
			isStreaming: false,
			streamingMessage: undefined,
			pendingToolCalls: new Set(),
			errorMessage: undefined,
		};
	}

	subscribe(listener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	async prompt(input) {
		if (this.state.isStreaming) {
			throw new Error("Agent is already running");
		}

		this.state.isStreaming = true;
		this.state.errorMessage = undefined;

		try {
			await runLoop({
				input,
				model: this.model,
				tools: this.tools,
				emit: (event) => this.processEvent(event),
			});
		} finally {
			this.state.isStreaming = false;
			this.state.streamingMessage = undefined;
			this.state.pendingToolCalls = new Set();
		}
	}

	async processEvent(event) {
		switch (event.type) {
			case "message_start":
				this.state.streamingMessage = event.message;
				break;
			case "message_end":
				this.state.streamingMessage = undefined;
				this.state.messages.push(event.message);
				break;
			case "tool_execution_start": {
				const pending = new Set(this.state.pendingToolCalls);
				pending.add(event.toolCall.id);
				this.state.pendingToolCalls = pending;
				break;
			}
			case "tool_execution_end": {
				const pending = new Set(this.state.pendingToolCalls);
				pending.delete(event.toolResult.toolCallId);
				this.state.pendingToolCalls = pending;
				break;
			}
			case "turn_end":
				if (event.assistantMessage.errorMessage) {
					this.state.errorMessage = event.assistantMessage.errorMessage;
				}
				break;
			case "agent_end":
				this.state.streamingMessage = undefined;
				break;
		}

		for (const listener of this.listeners) {
			await listener(event, this.state);
		}
	}
}

function summarizeState(state) {
	const roles = state.messages.map((message) => message.role).join("→") || "-";
	const streaming = state.streamingMessage?.role ?? "-";
	const pending = [...state.pendingToolCalls].join(",") || "-";
	return `messages=${roles} streaming=${streaming} pending=${pending} running=${state.isStreaming}`;
}

const agent = new Agent({ model: fakeModel, tools: [echoTool] });
let agentEndListenerFinished = false;

agent.subscribe(async (event, state) => {
	console.log(event.type.padEnd(22), summarizeState(state));
	if (event.type === "agent_end") {
		await new Promise((resolve) => setTimeout(resolve, 10));
		agentEndListenerFinished = true;
	}
});

await agent.prompt("Echo hello, then tell me the result.");

console.log("\nAfter prompt() resolved");
console.log(summarizeState(agent.state));
console.log(`agent_end listener awaited: ${agentEndListenerFinished}`);
