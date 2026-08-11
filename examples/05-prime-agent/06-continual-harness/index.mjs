import assert from "node:assert/strict";

class HarnessStore {
  local = new Map();
  global = new Map([["stable-style", { kind: "prompt", content: "Prefer focused checks." }]]);
  history = [];

  apply(scope, edits) {
    assert.ok(scope === "local" || scope === "global");
    const target = this[scope];
    const snapshots = [];

    for (const edit of edits) {
      if (edit.id === "base_system_prompt") {
        throw new Error("base system prompt is immutable");
      }
      const before = target.get(edit.id);
      if (edit.operation === "delete") target.delete(edit.id);
      else target.set(edit.id, structuredClone(edit.entry));
      snapshots.push({
        id: edit.id,
        before: before ? structuredClone(before) : undefined,
        after: target.get(edit.id) ? structuredClone(target.get(edit.id)) : undefined,
      });
    }

    this.history.push({ scope, snapshots });
  }

  rollbackLast() {
    const record = this.history.pop();
    assert.ok(record, "nothing to roll back");
    const target = this[record.scope];
    for (const snapshot of record.snapshots.toReversed()) {
      if (snapshot.before === undefined) target.delete(snapshot.id);
      else target.set(snapshot.id, snapshot.before);
    }
  }
}

const store = new HarnessStore();
store.apply("local", [
  {
    operation: "create",
    id: "release-check",
    entry: {
      kind: "memory",
      content: "The release must include a clean focused test run.",
    },
  },
]);

assert.equal(store.local.get("release-check").kind, "memory");
assert.equal(store.global.size, 1);
assert.equal(store.history[0].scope, "local");
await assert.rejects(
  async () =>
    store.apply("local", [
      {
        operation: "update",
        id: "base_system_prompt",
        entry: { kind: "prompt", content: "replace everything" },
      },
    ]),
  /immutable/,
);

store.rollbackLast();
assert.equal(store.local.has("release-check"), false);
assert.equal(store.global.get("stable-style").content, "Prefer focused checks.");

console.log("ok - refinement is scoped, auditable, and reversible");
