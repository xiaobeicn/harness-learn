const parent = {
	system: ["core", "project instructions"],
	messages: ["user task", "read result", "design decision"],
	tools: ["Read", "Edit", "Bash", "Agent"],
};

function spawn({ mode, prompt, allowedTools }) {
	const inheritedMessages = mode === "fork" ? [...parent.messages] : [];
	return {
		mode,
		system: mode === "fork" ? [...parent.system] : ["agent-specific system"],
		messages: [...inheritedMessages, prompt],
		tools: parent.tools.filter(tool => allowedTools.includes(tool)),
		transcript: `sidechain-${mode}.jsonl`,
	};
}

const fresh = spawn({ mode: "fresh", prompt: "Inspect auth module with the supplied brief", allowedTools: ["Read"] });
const fork = spawn({ mode: "fork", prompt: "Implement the design decision", allowedTools: ["Read", "Edit", "Bash"] });
console.log(JSON.stringify({ fresh, fork }, null, 2));
console.log("Background changes delivery timing, not the need for an independent transcript and explicit result handoff.");
