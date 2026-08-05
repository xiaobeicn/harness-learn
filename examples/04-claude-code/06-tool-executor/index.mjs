const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const events = [];

const tools = {
	read: { concurrent: true, validate: input => typeof input.path === "string", call: async input => { await delay(10); return `read:${input.path}`; } },
	search: { concurrent: true, validate: input => typeof input.query === "string", call: async input => { await delay(5); return `match:${input.query}`; } },
	write: { concurrent: false, validate: input => typeof input.path === "string", call: async input => `wrote:${input.path}` },
};

async function execute(call) {
	const tool = tools[call.name];
	if (!tool) return { toolUseId: call.id, isError: true, output: `Unknown tool: ${call.name}` };
	if (!tool.validate(call.input)) return { toolUseId: call.id, isError: true, output: "Invalid input" };
	events.push(`start:${call.name}`);
	const output = await tool.call(call.input);
	events.push(`end:${call.name}`);
	return { toolUseId: call.id, isError: false, output };
}

async function executeStreaming(calls) {
	const results = [];
	let parallel = [];
	const flush = async () => results.push(...(await Promise.all(parallel.map(execute))));
	for (const call of calls) {
		if (tools[call.name]?.concurrent) parallel.push(call);
		else {
			await flush();
			parallel = [];
			results.push(await execute(call));
		}
	}
	await flush();
	return results;
}

const results = await executeStreaming([
	{ id: "1", name: "read", input: { path: "a.ts" } },
	{ id: "2", name: "search", input: { query: "TODO" } },
	{ id: "3", name: "write", input: { path: "a.ts" } },
	{ id: "4", name: "missing", input: {} },
]);
console.log(events.join(" -> "));
console.log(JSON.stringify(results, null, 2));
