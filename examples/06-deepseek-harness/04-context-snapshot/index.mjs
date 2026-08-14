import assert from "node:assert/strict";

function assembleSections(globalSections, scopedSections) {
  const sections = new Map(globalSections.map((section) => [section.name, section]));
  scopedSections.forEach((section) => sections.set(section.name, section));
  return [...sections.values()].sort((left, right) =>
    left.order - right.order || left.name.localeCompare(right.name),
  );
}

class RequestLog {
  events = [];
  previousRuntimeContext;

  snapshotRuntimeContext(source, content) {
    if (content === this.previousRuntimeContext) return;
    this.previousRuntimeContext = content;
    this.events.push({
      type: "user/message",
      source,
      content: content || "[runtime context cleared]",
    });
  }

  recordRequest(header, chunks) {
    this.events.push({ type: "request/header", ...structuredClone(header) });
    chunks.forEach((content) => this.events.push({ type: "assistant/chunk", content }));
    this.events.push({ type: "assistant/message", content: chunks.join("") });
  }
}

const sections = assembleSections(
  [
    { name: "identity", order: 10, text: "global identity" },
    { name: "safety", order: 20, text: "global safety" },
  ],
  [{ name: "identity", order: 10, text: "scoped identity" }],
);

assert.deepEqual(sections.map((section) => section.text), ["scoped identity", "global safety"]);

const log = new RequestLog();
log.snapshotRuntimeContext("workspace", "branch=main");
log.snapshotRuntimeContext("workspace", "branch=main");
log.snapshotRuntimeContext("workspace", "branch=feature");
log.snapshotRuntimeContext("workspace", "");
log.recordRequest(
  { provider: "fake", model: "test", system: sections, tools: ["read", "write"] },
  ["hel", "lo"],
);

assert.equal(log.events.filter((event) => event.type === "user/message").length, 3);
assert.equal(log.events.find((event) => event.type === "request/header").tools.length, 2);
assert.deepEqual(
  log.events.filter((event) => event.type === "assistant/chunk").map((event) => event.content),
  ["hel", "lo"],
);
assert.equal(log.events.at(-1).content, "hello");

console.log("ok - scoped prompt, runtime snapshots, request headers, and chunks stay auditable");
