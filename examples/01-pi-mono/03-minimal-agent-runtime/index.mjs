const useInvalidArgs = process.argv.includes("--invalid-args");
let modelCalls = 0;
let toolExecutions = 0;

const tools = [
	{
		name: "echo",
		description: "Return the provided text.",
		parameters: { value: "string" },
		validate(args) {
			if (!args || typeof args.value !== "string") {
				throw new Error('echo expects a string argument named "value"');
			}
		},
		async execute(args) {
			toolExecutions += 1;
			return `echoed: ${args.value}`;
		},
	},
];

async function fakeModel(context) {
	modelCalls += 1;
	const lastMessage = context.messages.at(-1);

	if (lastMessage?.role === "user") {
		return {
			role: "assistant",
			content: [
				{
					type: "toolCall",
					id: "call-1",
					name: "echo",
					arguments: { value: useInvalidArgs ? 42 : "hello" },
				},
			],
		};
	}

	if (lastMessage?.role === "toolResult") {
		return {
			role: "assistant",
			content: [{ type: "text", text: `Model saw: ${lastMessage.content}` }],
		};
	}

	throw new Error(`Unexpected last message role: ${lastMessage?.role}`);
}

async function runAgent({ input, model, tools, emit, maxTurns = 8 }) {
	const messages = [{ role: "user", content: input }];
	const toolDefinitions = tools.map(({ name, description, parameters }) => ({
		name,
		description,
		parameters,
	}));

	emit({ type: "agent_start" });

	for (let turn = 1; turn <= maxTurns; turn += 1) {
		emit({ type: "turn_start", turn });

		if (turn === 1) {
			emit({ type: "message_start", message: messages[0] });
			emit({ type: "message_end", message: messages[0] });
		}

		const assistantMessage = await model({
			messages: structuredClone(messages),
			tools: structuredClone(toolDefinitions),
		});
		messages.push(assistantMessage);
		emit({ type: "message_start", message: assistantMessage });
		emit({ type: "message_end", message: assistantMessage });

		const toolCalls = assistantMessage.content.filter((item) => item.type === "toolCall");
		const toolResults = [];

		for (const toolCall of toolCalls) {
			emit({ type: "tool_execution_start", toolCall });
			const tool = tools.find((candidate) => candidate.name === toolCall.name);

			let toolResult;
			try {
				if (!tool) {
					throw new Error(`Unknown tool: ${toolCall.name}`);
				}
				tool.validate(toolCall.arguments);
				toolResult = {
					role: "toolResult",
					toolCallId: toolCall.id,
					toolName: toolCall.name,
					content: await tool.execute(toolCall.arguments),
					isError: false,
				};
			} catch (error) {
				toolResult = {
					role: "toolResult",
					toolCallId: toolCall.id,
					toolName: toolCall.name,
					content: error instanceof Error ? error.message : String(error),
					isError: true,
				};
			}

			emit({ type: "tool_execution_end", toolResult });
			messages.push(toolResult);
			toolResults.push(toolResult);
			emit({ type: "message_start", message: toolResult });
			emit({ type: "message_end", message: toolResult });
		}

		emit({ type: "turn_end", turn, assistantMessage, toolResults });

		if (toolCalls.length === 0) {
			emit({ type: "agent_end", messages });
			return messages;
		}
	}

	throw new Error(`Agent exceeded maxTurns=${maxTurns}`);
}

function summarizeEvent(event) {
	switch (event.type) {
		case "turn_start":
		case "turn_end":
			return `turn=${event.turn}`;
		case "message_start":
		case "message_end":
			return `role=${event.message.role}`;
		case "tool_execution_start":
			return `tool=${event.toolCall.name}`;
		case "tool_execution_end":
			return `tool=${event.toolResult.toolName} error=${event.toolResult.isError}`;
		case "agent_end":
			return `messages=${event.messages.length}`;
		default:
			return "";
	}
}

const transcript = await runAgent({
	input: "Echo hello, then tell me the result.",
	model: fakeModel,
	tools,
	emit(event) {
		console.log(event.type.padEnd(22), summarizeEvent(event));
	},
});

const finalMessage = transcript.at(-1);
const finalText = finalMessage.content.find((item) => item.type === "text")?.text;

console.log("\nSummary");
console.log(`scenario: ${useInvalidArgs ? "invalid arguments" : "valid arguments"}`);
console.log(`model calls: ${modelCalls}`);
console.log(`tool executions: ${toolExecutions}`);
console.log(`message roles: ${transcript.map((message) => message.role).join(" -> ")}`);
console.log(`final answer: ${finalText}`);
