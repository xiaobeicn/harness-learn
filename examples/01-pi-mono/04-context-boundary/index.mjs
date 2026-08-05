const transcript = [
	{ role: "user", content: "Old question" },
	{ role: "assistant", content: "Old answer" },
	{ role: "notification", content: "UI-only: indexing finished" },
	{ role: "user", content: "Current question" },
];

const originalTranscript = JSON.stringify(transcript);
const pipeline = [];

async function transformContext(messages) {
	pipeline.push("transformContext");
	return messages.slice(-2);
}

function convertToLlm(messages) {
	pipeline.push("convertToLlm");
	return messages.filter(
		(message) => message.role === "user" || message.role === "assistant" || message.role === "toolResult",
	);
}

async function fakeModel(context) {
	pipeline.push("model");

	if (context.messages.some((message) => message.role === "notification")) {
		throw new Error("Model received an unsupported notification message");
	}

	return {
		role: "assistant",
		content: `Received ${context.messages.length} message: ${context.messages.at(-1)?.content}`,
	};
}

async function requestModel({ systemPrompt, transcript, transformContext, convertToLlm, model }) {
	const transformedMessages = await transformContext(structuredClone(transcript));
	const llmMessages = await convertToLlm(transformedMessages);
	const assistantMessage = await model({ systemPrompt, messages: llmMessages });

	return { transformedMessages, llmMessages, assistantMessage };
}

const result = await requestModel({
	systemPrompt: "Answer the latest user question.",
	transcript,
	transformContext,
	convertToLlm,
	model: fakeModel,
});

const roles = (messages) => messages.map((message) => message.role).join(" -> ");

console.log(`pipeline: ${pipeline.join(" -> ")}`);
console.log(`transcript roles: ${roles(transcript)}`);
console.log(`after transformContext: ${roles(result.transformedMessages)}`);
console.log(`model context roles: ${roles(result.llmMessages)}`);
console.log(`transcript unchanged: ${JSON.stringify(transcript) === originalTranscript}`);
console.log(`model answer: ${result.assistantMessage.content}`);
