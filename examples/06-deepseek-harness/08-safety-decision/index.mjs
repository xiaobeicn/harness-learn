import assert from "node:assert/strict";

function resolveMode({ approved, session, deployment }) {
  return approved ?? session ?? deployment;
}

function authorizeWrite({ mode, observed, approval, runnerAvailable, withinWorkspace }) {
  if (!observed) return { ok: false, code: "FS_NOT_OBSERVED" };
  if (approval !== "allowed-once") return { ok: false, code: `APPROVAL_${approval.toUpperCase()}` };
  if (mode === "read-only") return { ok: false, code: "SANDBOX_READ_ONLY" };
  if (mode === "workspace-write" && !withinWorkspace) {
    return { ok: false, code: "SANDBOX_OUTSIDE_WORKSPACE" };
  }
  if (mode !== "danger-full-access" && !runnerAvailable) {
    return { ok: false, code: "SANDBOX_RUNNER_UNAVAILABLE" };
  }
  return { ok: true, enforcement: mode === "danger-full-access" ? "bypassed" : "full" };
}

assert.equal(
  resolveMode({ approved: "read-only", session: "danger-full-access", deployment: "workspace-write" }),
  "read-only",
);
assert.deepEqual(
  authorizeWrite({
    mode: "workspace-write",
    observed: false,
    approval: "allowed-once",
    runnerAvailable: true,
    withinWorkspace: true,
  }),
  { ok: false, code: "FS_NOT_OBSERVED" },
);
assert.deepEqual(
  authorizeWrite({
    mode: "workspace-write",
    observed: true,
    approval: "unavailable",
    runnerAvailable: true,
    withinWorkspace: true,
  }),
  { ok: false, code: "APPROVAL_UNAVAILABLE" },
);
assert.deepEqual(
  authorizeWrite({
    mode: "workspace-write",
    observed: true,
    approval: "allowed-once",
    runnerAvailable: false,
    withinWorkspace: true,
  }),
  { ok: false, code: "SANDBOX_RUNNER_UNAVAILABLE" },
);
assert.deepEqual(
  authorizeWrite({
    mode: "workspace-write",
    observed: true,
    approval: "allowed-once",
    runnerAvailable: true,
    withinWorkspace: true,
  }),
  { ok: true, enforcement: "full" },
);

console.log("ok - observation, approval, path policy, and OS runner remain separate gates");
