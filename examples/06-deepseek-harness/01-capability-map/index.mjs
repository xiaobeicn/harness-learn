import assert from "node:assert/strict";

const plugins = [
  { name: "session", provides: ["session"], injects: [] },
  { name: "tools", provides: ["tools"], injects: [] },
  { name: "llm", provides: ["llm"], injects: [] },
  { name: "agent-loop", provides: ["agent"], injects: ["session", "tools", "llm"] },
  { name: "persistence", provides: ["persistence"], injects: ["session"] },
  { name: "sandbox", provides: ["sandbox"], injects: [] },
  { name: "web-ui", provides: ["ui"], injects: ["agent"] },
];

function activate(composition) {
  const pending = [...composition];
  const services = new Set();
  const order = [];

  while (pending.length > 0) {
    const index = pending.findIndex((plugin) =>
      plugin.injects.every((service) => services.has(service)),
    );
    assert.notEqual(index, -1, "composition contains an unresolved dependency cycle");
    const [plugin] = pending.splice(index, 1);
    plugin.provides.forEach((service) => services.add(service));
    order.push(plugin.name);
  }

  return { order, services };
}

const shuffled = [plugins[3], plugins[6], plugins[4], ...plugins.slice(0, 3), plugins[5]];
const result = activate(shuffled);

assert.ok(result.order.indexOf("agent-loop") > result.order.indexOf("session"));
assert.ok(result.order.indexOf("agent-loop") > result.order.indexOf("tools"));
assert.ok(result.order.indexOf("web-ui") > result.order.indexOf("agent-loop"));
assert.ok(result.services.has("sandbox"));
assert.equal(plugins.find((plugin) => plugin.name === "agent-loop").injects.includes("ui"), false);
assert.equal(plugins.find((plugin) => plugin.name === "agent-loop").injects.includes("sandbox"), false);

console.log("ok - capability dependencies, not YAML order, determine activation");
