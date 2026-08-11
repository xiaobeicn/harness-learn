import assert from "node:assert/strict";

class PersistentKernel {
  namespace = new Map();

  execute(call) {
    if (call.operation === "set") {
      this.namespace.set(call.name, call.value);
      return { stored: call.name };
    }
    if (call.operation === "product") {
      const values = this.namespace.get(call.name);
      assert.ok(values, `missing variable: ${call.name}`);
      const value = values.reduce((total, item) => total * item, 1);
      this.namespace.set(call.output, value);
      return { value };
    }
    throw new Error(`unknown operation: ${call.operation}`);
  }
}

const scriptedTurns = [
  {
    type: "tool_call",
    tool: "ipython",
    input: { operation: "set", name: "factors", value: [6, 7] },
  },
  {
    type: "tool_call",
    tool: "ipython",
    input: { operation: "product", name: "factors", output: "answer" },
  },
  { type: "assistant", text: "The answer is 42." },
];

function runLoop(turns, kernel, getHostContinuation = () => undefined) {
  const transcript = [];

  for (const turn of turns) {
    transcript.push(turn);
    if (turn.type === "tool_call") {
      assert.equal(turn.tool, "ipython");
      transcript.push({
        type: "tool_result",
        tool: turn.tool,
        result: kernel.execute(turn.input),
      });
      continue;
    }
    const continuation = getHostContinuation();
    if (continuation) transcript.push(continuation);
    else return transcript;
  }

  throw new Error("script ended before the loop reached a stop condition");
}

const kernel = new PersistentKernel();
const transcript = runLoop(scriptedTurns, kernel);

assert.equal(kernel.namespace.get("answer"), 42);
assert.equal(transcript.filter((entry) => entry.type === "tool_result").length, 2);
assert.equal(transcript.at(-1).text, "The answer is 42.");

console.log("ok - one ipython tool drives a normal loop and reuses persistent state");
