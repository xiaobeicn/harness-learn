import assert from "node:assert/strict";

class ChildRegistry {
  children = new Map();
  parentInbox = [];

  admit(name, task) {
    const sessionId = `child-${this.children.size + 1}`;
    const record = { sessionId, name, task, status: "queued" };
    this.children.set(sessionId, record);
    return Object.freeze({ sessionId, name, status: "queued" });
  }

  async startAll() {
    await Promise.all(
      [...this.children.values()].map(async (child) => {
        child.status = "running";
        child.result = await child.task();
        child.status = "completed";
      }),
    );
  }

  sendToParent(sessionId, message) {
    const child = this.children.get(sessionId);
    assert.ok(child, `unknown child: ${sessionId}`);
    this.parentInbox.push({ from: sessionId, message });
  }
}

const registry = new ChildRegistry();
const handles = [
  registry.admit("api", async () => "API reviewed"),
  registry.admit("tests", async () => "tests pass"),
  registry.admit("docs", async () => "docs reviewed"),
];

assert.deepEqual(handles.map((handle) => handle.status), [
  "queued",
  "queued",
  "queued",
]);
assert.ok(handles.every((handle) => !("result" in handle)));
assert.ok(
  [...registry.children.values()].every((child) => child.status === "queued"),
);

await registry.startAll();
assert.ok(
  [...registry.children.values()].every((child) => child.status === "completed"),
);
assert.equal(registry.parentInbox.length, 0);

registry.sendToParent(handles[1].sessionId, "Verification result: tests pass");
assert.deepEqual(registry.parentInbox, [
  {
    from: "child-2",
    message: "Verification result: tests pass",
  },
]);

console.log("ok - admission handles precede completion and messages are explicit");
