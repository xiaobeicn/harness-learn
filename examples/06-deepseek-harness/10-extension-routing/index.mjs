import assert from "node:assert/strict";

function chooseExtension(requirement) {
  if (requirement.needsService || requirement.needsUi || requirement.needsTypedEvents) {
    return requirement.temporary ? "dynamic-cordis" : "cordis-plugin";
  }
  if (requirement.externalToolProtocol) return "mcp";
  if (requirement.compatibilityAutomation) return "hook";
  if (requirement.instructions) return "skill";
  throw new Error("no matching extension surface");
}

class MiniHarness {
  events = [];
  tools = new Map();
  surface = [];

  mountTool(name, execute) {
    this.tools.set(name, execute);
    return () => this.tools.delete(name);
  }

  run(prompt, toolName) {
    this.events.push({ type: "agent/inbox/spliced", prompt });
    this.events.push({ type: "turn/start" });
    this.events.push({ type: "request/header", tools: [...this.tools.keys()] });
    const result = this.tools.get(toolName)();
    this.events.push({ type: "tool/result", toolName, result });
    this.surface.push({ role: "user", content: prompt }, { role: "tool", content: result });
    this.events.push({ type: "turn/end", outcome: "completed" });
    return result;
  }
}

assert.equal(chooseExtension({ instructions: true }), "skill");
assert.equal(chooseExtension({ externalToolProtocol: true }), "mcp");
assert.equal(chooseExtension({ compatibilityAutomation: true }), "hook");
assert.equal(chooseExtension({ needsService: true }), "cordis-plugin");
assert.equal(chooseExtension({ needsUi: true, temporary: true }), "dynamic-cordis");

const harness = new MiniHarness();
const dispose = harness.mountTool("mcp__docs__search", () => "one verified result");
assert.equal(harness.run("find the architecture evidence", "mcp__docs__search"), "one verified result");
assert.deepEqual(harness.events.map((event) => event.type), [
  "agent/inbox/spliced",
  "turn/start",
  "request/header",
  "tool/result",
  "turn/end",
]);
assert.equal(harness.surface.length, 2);
dispose();
assert.equal(harness.tools.size, 0, "plugin disposal must retract its tool contribution");

console.log("ok - extension routing and one reversible request path preserve lifecycle boundaries");
