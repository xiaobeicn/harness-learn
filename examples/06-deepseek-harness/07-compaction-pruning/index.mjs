import assert from "node:assert/strict";

function pruneByCodePoint(value, threshold, headSize, tailSize) {
  const points = [...value];
  if (points.length <= threshold) return { value, pruned: false };
  const omitted = points.length - headSize - tailSize;
  return {
    value: `${points.slice(0, headSize).join("")}\n[... ${omitted} code points omitted ...]\n${points.slice(-tailSize).join("")}`,
    pruned: true,
  };
}

function compact(surface, start, end, summary, generation) {
  const region = surface.slice(start, end);
  const callCount = region.filter((node) => node.type === "tool/call").length;
  const resultCount = region.filter((node) => node.type === "tool/result").length;
  assert.equal(callCount, resultCount, "compaction region must keep tool pairs balanced");
  const oldSize = region.reduce((total, node) => total + [...node.content].length, 0);
  assert.ok([...summary].length < oldSize, "summary must be smaller than its region");
  return {
    surface: [...surface.slice(0, start), { type: "user/message", content: summary }, ...surface.slice(end)],
    generation: generation + 1,
  };
}

const large = "头".repeat(6) + "🙂".repeat(6) + "尾".repeat(6);
const pruned = pruneByCodePoint(large, 10, 4, 3);
assert.equal(pruned.pruned, true);
assert.ok(pruned.value.startsWith("头头头头"));
assert.ok(pruned.value.endsWith("尾尾尾"));
assert.match(pruned.value, /11 code points omitted/);

const original = [
  { type: "user/message", content: "please inspect a large file" },
  { type: "tool/call", content: "read(file)" },
  { type: "tool/result", content: pruned.value },
  { type: "assistant/message", content: "the key fact is version 7" },
];
const before = 2;
const compacted = compact(original, 0, 4, "checkpoint: inspected; version is 7", before);

assert.equal(compacted.generation, 3);
assert.equal(compacted.surface.length, 1);
assert.equal(compacted.generation > before, true, "overflow retry requires generation progress");
assert.equal(original.length, 4, "audit inputs remain available outside the Surface projection");

console.log("ok - pruning is code-point safe and compaction advances only on a balanced replace");
