const policy = {
	deny: [/^rm -rf /],
	allow: [/^npm test$/],
	sandbox: { writableRoots: ["/workspace"], network: false },
};

function decide(command, hookDecision = "passthrough") {
	if (policy.deny.some(rule => rule.test(command))) return { layer: "rule", decision: "deny" };
	if (hookDecision === "deny") return { layer: "PreToolUse hook", decision: "deny" };
	if (policy.allow.some(rule => rule.test(command))) return { layer: "rule", decision: "allow" };
	if (hookDecision === "allow") return { layer: "PreToolUse hook", decision: "allow" };
	return { layer: "permission mode", decision: "ask" };
}

const scenarios = [
	["npm test", "passthrough"],
	["rm -rf /workspace/build", "allow"],
	["curl https://example.com", "passthrough"],
];

for (const [command, hook] of scenarios) {
	const permission = decide(command, hook);
	const enforcement = command.startsWith("curl") && !policy.sandbox.network ? "network denied by sandbox" : "not executed in this simulator";
	console.log(JSON.stringify({ command, hook, permission, enforcement }));
}

console.log("Permission answers whether to launch; sandbox bounds what a launched process can actually do.");
