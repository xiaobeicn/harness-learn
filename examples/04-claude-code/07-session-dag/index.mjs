const entries = [
	{ uuid: "u1", parentUuid: null, role: "user", text: "Build feature" },
	{ uuid: "a1", parentUuid: "u1", role: "assistant", text: "Read files" },
	{ uuid: "u2", parentUuid: "a1", role: "user", text: "Tool result" },
	{ uuid: "a2", parentUuid: "u2", role: "assistant", text: "Original answer" },
	{ uuid: "b2", parentUuid: "u2", role: "assistant", text: "Rewound branch answer" },
];

function buildChain(leafUuid) {
	const byId = new Map(entries.map(entry => [entry.uuid, entry]));
	const chain = [];
	const seen = new Set();
	let current = byId.get(leafUuid);
	while (current) {
		if (seen.has(current.uuid)) throw new Error("cycle in transcript");
		seen.add(current.uuid);
		chain.push(current);
		current = current.parentUuid ? byId.get(current.parentUuid) : undefined;
	}
	return chain.reverse();
}

console.log("append-only entries:", entries.map(entry => entry.uuid).join(", "));
console.log("resume original:", buildChain("a2").map(entry => entry.uuid).join(" -> "));
console.log("rewind branch: ", buildChain("b2").map(entry => entry.uuid).join(" -> "));
console.log("fork-session copies the chosen chain but writes future entries under a new session ID.");
