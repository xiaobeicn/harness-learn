import assert from "node:assert/strict";

const transcript = [
  { id: "root", parentId: null, kind: "user", text: "migrate the API" },
  { id: "plan", parentId: "root", kind: "assistant", text: "plan v1" },
  { id: "failed", parentId: "plan", kind: "tool", text: "old branch failed" },
  { id: "replan", parentId: "root", kind: "assistant", text: "plan v2" },
  { id: "edit", parentId: "replan", kind: "tool", text: "edited api.ts" },
  { id: "verify", parentId: "edit", kind: "tool", text: "tests pass" },
];

function activePath(entries, leafId) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const path = [];
  let current = byId.get(leafId);
  while (current) {
    path.push(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path.reverse();
}

function compactProjection(path, keepLast, summary) {
  const kept = path.slice(-keepLast);
  return [
    { kind: "compaction_summary", text: summary },
    ...kept,
  ];
}

const path = activePath(transcript, "verify");
assert.deepEqual(path.map((entry) => entry.id), [
  "root",
  "replan",
  "edit",
  "verify",
]);

const modelContext = compactProjection(
  path,
  2,
  "Goal: migrate API. Plan v2 applied; preserve verification evidence.",
);

assert.equal(modelContext[0].kind, "compaction_summary");
assert.deepEqual(modelContext.slice(1).map((entry) => entry.id), [
  "edit",
  "verify",
]);
assert.equal(transcript.length, 6);
assert.equal(transcript.find((entry) => entry.id === "failed").text, "old branch failed");

console.log("ok - compaction changes the active projection, not append-only history");
