const routes = [
	{ need: "每次会话都遵守项目约定", extension: "CLAUDE.md / rules", cost: "startup context" },
	{ need: "按需加载一套工作流知识", extension: "Skill", cost: "description + invoked body" },
	{ need: "隔离上下文并限制工具", extension: "Custom Agent", cost: "separate model loop" },
	{ need: "在事件边界执行确定性策略", extension: "Hook", cost: "hook process/request" },
	{ need: "连接外部服务和工具", extension: "MCP", cost: "connection + tool schema/result" },
	{ need: "分发一组 skills/agents/hooks/MCP", extension: "Plugin", cost: "trust + lifecycle" },
];

for (const route of routes) {
	console.log(`${route.extension.padEnd(22)} ${route.need} [${route.cost}]`);
}

const endToEnd = ["user input", "context assembly", "model", "permission", "tool", "tool result", "model", "persist transcript"];
console.log(`\nend-to-end: ${endToEnd.join(" -> ")}`);
console.log("Choose the narrowest extension whose lifecycle matches the problem.");
