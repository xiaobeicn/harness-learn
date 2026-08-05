const budget = 120;
const candidates = [
	{ name: "system prompt", tokens: 35, priority: 100, lifetime: "session" },
	{ name: "CLAUDE.md", tokens: 28, priority: 95, lifetime: "session" },
	{ name: "auto memory index", tokens: 12, priority: 80, lifetime: "session" },
	{ name: "skill descriptions", tokens: 18, priority: 60, lifetime: "discoverable" },
	{ name: "nested rule attachment", tokens: 14, priority: 85, lifetime: "path-triggered" },
	{ name: "full skill body", tokens: 42, priority: 70, lifetime: "on-demand" },
	{ name: "old tool output", tokens: 50, priority: 10, lifetime: "replaceable" },
];

let used = 0;
const admitted = [];
const deferred = [];
for (const item of [...candidates].sort((a, b) => b.priority - a.priority)) {
	if (used + item.tokens <= budget) {
		admitted.push(item);
		used += item.tokens;
	} else {
		deferred.push(item);
	}
}

console.log(`budget=${budget} used=${used}`);
console.log("admitted:");
for (const item of admitted) console.log(`  ${item.name} (${item.lifetime}, ${item.tokens})`);
console.log("deferred or compacted:");
for (const item of deferred) console.log(`  ${item.name} (${item.lifetime}, ${item.tokens})`);

if (admitted.some(item => item.name === "old tool output")) throw new Error("replaceable output should lose admission first");
