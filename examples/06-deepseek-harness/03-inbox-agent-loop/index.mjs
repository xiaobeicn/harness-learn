import assert from "node:assert/strict";

class Agent {
  inbox = { nextStep: [], nextTurn: [] };
  events = [];

  append(type, data = {}) {
    this.events.push({ seq: this.events.length, type, data });
  }

  splice(lane, message) {
    this.inbox[lane].push(message);
    this.append("agent/inbox/spliced", { lane, message });
  }

  runTurn(toolPlan) {
    this.append("turn/start");
    const claimed = this.inbox.nextTurn.splice(0);
    let step = 0;

    do {
      this.append("step/start", { step });
      const messages = [...claimed.splice(0), ...this.inbox.nextStep.splice(0)];
      messages.forEach((message) => this.append("user/message", { message }));
      const callsTool = toolPlan[step] ?? false;
      this.append("assistant/message", { callsTool });
      if (callsTool) this.append("tool/result", { ok: true });
      this.append("step/end", { step });
      step += 1;
      if (!callsTool) break;
    } while (step < toolPlan.length);

    this.append("turn/end", { outcome: "completed" });
  }
}

const agent = new Agent();
agent.splice("nextTurn", "initial prompt");
agent.splice("nextStep", "steer current turn");
agent.runTurn([true, false]);
agent.splice("nextTurn", "followup after completion");
agent.runTurn([false]);

const visibleMessages = agent.events
  .filter((event) => event.type === "user/message")
  .map((event) => event.data.message);

assert.deepEqual(visibleMessages, [
  "initial prompt",
  "steer current turn",
  "followup after completion",
]);
assert.deepEqual(
  agent.events.filter((event) => event.type === "turn/end").map((event) => event.data.outcome),
  ["completed", "completed"],
);
assert.ok(agent.events.every((event, index) => event.seq === index));
assert.equal(agent.inbox.nextStep.length, 0);
assert.equal(agent.inbox.nextTurn.length, 0);

console.log("ok - next-step and next-turn inputs drain at distinct durable boundaries");
