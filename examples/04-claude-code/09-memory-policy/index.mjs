const candidates = [
	{ text: "User prefers pnpm over npm", type: "user", derivable: false },
	{ text: "Build command is in package.json", type: "project", derivable: true },
	{ text: "Never rename public API without asking", type: "feedback", derivable: false },
	{ text: "Current branch is feature/auth", type: "project", derivable: true },
	{ text: "OAuth provider rejects duplicate nonce", type: "reference", derivable: false },
];

const accepted = candidates.filter(candidate => !candidate.derivable);
const memoryIndex = accepted.map((memory, index) => ({
	topic: `topic-${index + 1}.md`,
	header: memory.text,
	type: memory.type,
}));

console.log("MEMORY.md index");
for (const item of memoryIndex) console.log(`- [${item.type}] ${item.header} -> ${item.topic}`);
console.log("\nRejected because code, Git, or CLAUDE.md can answer it:");
for (const item of candidates.filter(candidate => candidate.derivable)) console.log(`- ${item.text}`);

if (memoryIndex.length > 5) throw new Error("recall candidate set exceeded teaching limit");
