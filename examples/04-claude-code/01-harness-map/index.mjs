const dimensions = [
	["Loop", "query loop", "模型与工具为何继续或停止"],
	["Context", "prompt + messages", "本轮模型实际看到什么"],
	["Tools", "tool contract + executor", "意图如何变成可观察副作用"],
	["State", "JSONL + parent chain", "会话如何恢复、分叉与回退"],
	["Safety", "rules + hooks + sandbox", "谁授权、谁真正限制进程"],
	["Extension", "skills + agents + MCP + plugins", "能力如何加入 Harness"],
];

const names = dimensions.map(([name]) => name);
if (new Set(names).size !== dimensions.length) {
	throw new Error("Harness dimensions must be unique");
}

console.log("Claude Code harness map\n");
for (const [name, mechanism, question] of dimensions) {
	console.log(`${name.padEnd(10)} ${mechanism.padEnd(28)} ${question}`);
}

console.log("\nCross-cutting topics");
console.log("Memory     Context + State");
console.log("Subagent   Loop + Context + Tools + State");
console.log("Agent Team Subagent + shared Tasks + Mailbox + permission sync");
