const scenario = process.argv.includes("--max-turns") ? "max-turns" : "normal";
let calls = 0;

async function fakeModel(messages) {
	calls += 1;
	const last = messages.at(-1);
	if (scenario === "max-turns") {
		return { role: "assistant", toolCalls: [{ id: `t${calls}`, name: "observe", input: { value: calls } }] };
	}
	if (last.role === "user") {
		return { role: "assistant", toolCalls: [{ id: "t1", name: "observe", input: { value: 42 } }] };
	}
	return { role: "assistant", text: `final: observed ${last.output}` };
}

async function queryLoop({ input, maxTurns = 3 }) {
	const messages = [{ role: "user", content: input }];
	for (let turn = 1; turn <= maxTurns; turn += 1) {
		const assistant = await fakeModel(messages);
		messages.push(assistant);
		console.log(`turn ${turn}: model -> ${assistant.toolCalls ? "tool_use" : "text"}`);

		if (!assistant.toolCalls?.length) return { stop: "end_turn", messages };
		for (const call of assistant.toolCalls) {
			const result = { role: "tool", toolUseId: call.id, output: call.input.value, isError: false };
			messages.push(result);
			console.log(`turn ${turn}: tool -> result(${result.output})`);
		}
	}
	return { stop: "max_turns", messages };
}

const result = await queryLoop({ input: "Observe a value, then answer." });
console.log(`stop=${result.stop} modelCalls=${calls} messages=${result.messages.length}`);
