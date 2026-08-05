const sources = {
	managed: ["Never expose secrets"],
	user: ["Prefer concise explanations"],
	projectRoot: ["Run focused tests"],
	projectNested: ["For packages/api, use pnpm test:api"],
	local: ["Use my local fixture directory"],
	memory: ["The API package uses port 4100"],
};

function assembleInstructions(targetPath) {
	const blocks = [
		["managed", sources.managed],
		["user", sources.user],
		["project-root", sources.projectRoot],
	];
	if (targetPath.startsWith("packages/api/")) blocks.push(["project-nested", sources.projectNested]);
	blocks.push(["local", sources.local], ["auto-memory", sources.memory]);
	return blocks;
}

for (const target of ["README.md", "packages/api/src/server.ts"]) {
	console.log(`\ntarget=${target}`);
	for (const [source, rules] of assembleInstructions(target)) {
		console.log(`${source.padEnd(15)} ${rules.join("; ")}`);
	}
}

console.log("\nThe later discovery of a nested rule adds context; it does not erase the root rules.");
