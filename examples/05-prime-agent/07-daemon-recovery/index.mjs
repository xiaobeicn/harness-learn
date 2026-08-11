import assert from "node:assert/strict";

function recoverView({ clientCursor, serverGeneration, replay, snapshot }) {
  if (
    clientCursor?.generation === serverGeneration &&
    replay.complete === true
  ) {
    const events = replay.events.filter(
      (event) =>
        event.cursor.generation === serverGeneration &&
        event.cursor.sequence > clientCursor.sequence,
    );
    return { source: "replay", state: events.at(-1)?.state ?? snapshot };
  }
  return { source: "snapshot", state: structuredClone(snapshot) };
}

class CommandJournal {
  entries = new Map();

  begin(clientId, commandId) {
    const key = JSON.stringify([clientId, commandId]);
    const existing = this.entries.get(key);
    if (existing?.result !== undefined) {
      return { status: "complete", result: existing.result };
    }
    if (existing) return { status: "uncertain" };
    this.entries.set(key, { received: true });
    return { status: "new" };
  }

  recordResult(clientId, commandId, result) {
    const key = JSON.stringify([clientId, commandId]);
    const entry = this.entries.get(key);
    assert.ok(entry, "receipt must be durable before result");
    entry.result = result;
  }
}

const replayed = recoverView({
  clientCursor: { generation: "worker-a", sequence: 4 },
  serverGeneration: "worker-a",
  replay: {
    complete: true,
    events: [
      { cursor: { generation: "worker-a", sequence: 5 }, state: { turns: 5 } },
    ],
  },
  snapshot: { turns: 5 },
});
assert.deepEqual(replayed, { source: "replay", state: { turns: 5 } });

const resynchronized = recoverView({
  clientCursor: { generation: "worker-a", sequence: 99 },
  serverGeneration: "worker-b",
  replay: { complete: false, events: [] },
  snapshot: { turns: 7, recovered: true },
});
assert.deepEqual(resynchronized, {
  source: "snapshot",
  state: { turns: 7, recovered: true },
});

const journal = new CommandJournal();
let worldMutations = 0;

assert.deepEqual(journal.begin("client-1", "command-1"), { status: "new" });
worldMutations += 1;
journal.recordResult("client-1", "command-1", { written: true });
assert.deepEqual(journal.begin("client-1", "command-1"), {
  status: "complete",
  result: { written: true },
});
assert.equal(worldMutations, 1);

assert.deepEqual(journal.begin("client-1", "command-2"), { status: "new" });
worldMutations += 1;
const afterCrash = journal.begin("client-1", "command-2");
assert.deepEqual(afterCrash, { status: "uncertain" });
assert.equal(worldMutations, 2, "uncertain mutations must not be replayed");

console.log("ok - snapshots resync generations and uncertain mutations stay uncertain");
