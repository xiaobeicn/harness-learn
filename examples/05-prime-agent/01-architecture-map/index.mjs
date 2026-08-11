import assert from "node:assert/strict";

const components = {
  client: {
    owns: ["rendering", "keyboard", "ui_preferences"],
  },
  supervisor: {
    owns: ["routing", "attachments", "worker_health"],
    neverOwns: ["provider_execution", "kernel_execution"],
  },
  worker: {
    owns: ["root_session_tree", "scheduler", "kernels"],
  },
  agentSession: {
    owns: ["provider_calls", "context", "transcript", "child_lifecycle"],
  },
  kernel: {
    owns: ["python_namespace", "cell_execution"],
    neverOwns: ["provider_credentials", "session_transcript"],
  },
};

const promptFlow = [
  ["render input", "client"],
  ["route command", "supervisor"],
  ["select root runtime", "worker"],
  ["build model context", "agentSession"],
  ["execute Python cell", "kernel"],
  ["append transcript", "agentSession"],
];

for (const [, owner] of promptFlow) {
  assert.ok(components[owner], `unknown owner: ${owner}`);
}

assert.equal(new Set(promptFlow.map(([, owner]) => owner)).size, 5);
assert.ok(components.supervisor.neverOwns.includes("provider_execution"));
assert.ok(components.kernel.neverOwns.includes("session_transcript"));
assert.ok(components.worker.owns.includes("root_session_tree"));

console.log("ok - prompt ownership crosses five explicit architecture boundaries");
