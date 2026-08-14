import assert from "node:assert/strict";

class Session {
  events = [];
  surface = [];
  openTurn = false;

  append(type, data = {}, surfaceOp) {
    const event = Object.freeze({ seq: this.events.length, type, data: structuredClone(data), surfaceOp });
    this.events.push(event);
    if (surfaceOp?.kind === "append") this.surface.push(event.seq);
    if (surfaceOp?.kind === "replace") {
      this.surface.splice(surfaceOp.start, surfaceOp.end - surfaceOp.start, event.seq);
    }
    if (type === "turn/start") this.openTurn = true;
    if (type === "turn/end") this.openTurn = false;
    return event;
  }

  deriveMessages() {
    return this.surface.map((seq) => this.events[seq].data.content);
  }

  fork() {
    assert.equal(this.openTurn, false, "cannot fork an open turn");
    return {
      parentSession: "root",
      seedLength: this.events.length,
      seed: structuredClone(this.events),
    };
  }
}

const session = new Session();
session.append("turn/start");
session.append("user/message", { content: "old question" }, { kind: "append" });
session.append("assistant/message", { content: "old answer" }, { kind: "append" });
session.append("turn/end", { outcome: "completed" });
session.append(
  "user/message",
  { content: "checkpoint: question answered" },
  { kind: "replace", start: 0, end: 2 },
);

assert.deepEqual(session.deriveMessages(), ["checkpoint: question answered"]);
assert.equal(session.events.some((event) => event.data.content === "old question"), true);
assert.equal(session.events.some((event) => event.data.content === "old answer"), true);
assert.ok(session.events.every((event, index) => event.seq === index));
assert.equal(session.fork().seedLength, 5);

session.append("turn/start");
assert.throws(() => session.fork(), /open turn/);
session.append("turn/end", { outcome: "interrupted" });
assert.equal(session.fork().seedLength, 7);

console.log("ok - Surface replacement changes model history without deleting audit events");
