const transcript = [
	{ type: "user", text: "Fix auth refresh; preserve public API." },
	{ type: "tool_result", tool: "Read", text: "very long old file content", age: 9 },
	{ type: "assistant", text: "The refresh path drops the rotated token." },
	{ type: "tool_result", tool: "Bash", text: "old test output: 2 failed", age: 7 },
	{ type: "assistant", text: "Edited src/auth.ts." },
	{ type: "tool_result", tool: "Bash", text: "latest test output: 18 passed", age: 1 },
];

function microcompact(messages) {
	return messages.map(message =>
		message.type === "tool_result" && message.age > 3
			? { ...message, text: `[cleared ${message.tool} result]` }
			: message,
	);
}

function compact(messages) {
	return {
		type: "summary",
		userIntent: messages.find(message => message.type === "user")?.text,
		changes: ["src/auth.ts edited to retain rotated token"],
		verification: messages.at(-1).text,
		pending: [],
	};
}

const micro = microcompact(transcript);
const summary = compact(micro);
console.log(JSON.stringify({ micro, compactBoundary: true, summary }, null, 2));

for (const key of ["userIntent", "changes", "verification", "pending"]) {
	if (!(key in summary)) throw new Error(`summary lost invariant: ${key}`);
}
