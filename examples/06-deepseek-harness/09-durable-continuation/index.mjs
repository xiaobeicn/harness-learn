import assert from "node:assert/strict";

class DurableChildSession {
  inbox = [];
  events = [];
  activation = undefined;
  goal = { revision: 0, phase: "active" };

  admit(message) {
    const messageId = `message-${this.events.length + 1}`;
    this.inbox.push({ messageId, message });
    this.events.push({ type: "agent/inbox/spliced", messageId, message });
    return messageId;
  }

  startContinuable(initialMessage) {
    const messageId = this.admit(initialMessage);
    this.activation = { id: "activation-1", state: "running" };
    return { childId: "child-1", messageId };
  }

  settleNext() {
    assert.ok(this.activation, "an Activation is required to run a turn");
    const input = this.inbox.shift();
    this.events.push({ type: "turn/end", input, outcome: "completed" });
    return input;
  }

  coldResume() {
    assert.equal(this.activation, undefined);
    this.activation = { id: "activation-2", state: "running" };
  }

  updateGoal(expectedRevision, phase) {
    assert.equal(expectedRevision, this.goal.revision, "stale goal revision");
    this.goal = { revision: this.goal.revision + 1, phase };
  }
}

const child = new DurableChildSession();
const receipt = child.startContinuable("initial investigation");
assert.deepEqual(receipt, { childId: "child-1", messageId: "message-1" });
assert.equal(child.inbox.length, 1, "admission returns before turn completion");
assert.equal(child.settleNext().message, "initial investigation");

child.activation = undefined;
child.admit("follow up after process restart");
child.coldResume();
assert.equal(child.settleNext().message, "follow up after process restart");
child.updateGoal(0, "complete");
assert.throws(() => child.updateGoal(0, "active"), /stale goal revision/);
assert.deepEqual(child.goal, { revision: 1, phase: "complete" });

console.log("ok - a durable child inbox survives while each Activation remains process-local");
