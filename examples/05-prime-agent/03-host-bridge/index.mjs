import assert from "node:assert/strict";

class TypedHostBridge {
  handlers = new Map();
  replies = [];

  register(type, handler) {
    assert.match(type, /^[a-z_]+\.[a-z_]+$/);
    this.handlers.set(type, handler);
  }

  async request({ type, payload }, { activeCell }) {
    const handler = this.handlers.get(type);
    if (!handler) throw new Error(`unsupported host request: ${type}`);

    const data = await handler(payload);
    const channel = activeCell ? "control" : "shell";
    this.replies.push({ type, channel, data });
    return data;
  }
}

const bridge = new TypedHostBridge();
bridge.register("goal.get", (payload) => {
  assert.deepEqual(payload, {});
  return { status: "active", objective: "verify the release" };
});
bridge.register("rlm.run", ({ prompt }) => {
  assert.equal(typeof prompt, "string");
  return { session_id: "child-1", status: "queued" };
});

const goal = await bridge.request(
  { type: "goal.get", payload: {} },
  { activeCell: true },
);
const child = await bridge.request(
  { type: "rlm.run", payload: { prompt: "inspect the API" } },
  { activeCell: true },
);

assert.equal(goal.status, "active");
assert.equal(child.status, "queued");
assert.deepEqual(
  bridge.replies.map((reply) => reply.channel),
  ["control", "control"],
);
await assert.rejects(
  bridge.request({ type: "provider.call", payload: {} }, { activeCell: true }),
  /unsupported host request/,
);

console.log("ok - active cells receive typed Host replies on the control channel");
