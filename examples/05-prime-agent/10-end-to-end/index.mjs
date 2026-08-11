import assert from "node:assert/strict";

class LongTaskHarness {
  transcript = [];
  artifacts = new Map();
  worldEffects = 0;
  goal = { status: "active" };

  append(type, data) {
    this.transcript.push({ id: this.transcript.length + 1, type, ...data });
  }

  runScheduledPrompt(prompt) {
    this.append("schedule_claimed", { prompt });
    this.append("daemon_routed", { activeSessionId: "root-1" });
    this.append("prompt_admitted", { prompt });
    this.append("model_request", { toolCatalog: ["ipython"] });
    this.append("tool_call", { tool: "ipython", code: "await rlm(...)" });

    const childHandle = { sessionId: "child-1", status: "queued" };
    this.append("host_request", { requestType: "rlm.run", childHandle });
    this.append("tool_result", { childHandle });

    this.worldEffects += 1;
    this.artifacts.set("verification.txt", "focused checks passed");
    this.append("artifact_saved", { path: "verification.txt" });

    this.goal.status = "complete";
    this.append("goal_completed", { verified: true });
    return childHandle;
  }

  recoverProjection() {
    return {
      lastId: this.transcript.at(-1).id,
      goalStatus: this.goal.status,
      artifacts: [...this.artifacts.keys()],
    };
  }
}

const harness = new LongTaskHarness();
const handle = harness.runScheduledPrompt("verify the release");

assert.deepEqual(handle, { sessionId: "child-1", status: "queued" });
assert.deepEqual(
  harness.transcript.map((entry) => entry.type),
  [
    "schedule_claimed",
    "daemon_routed",
    "prompt_admitted",
    "model_request",
    "tool_call",
    "host_request",
    "tool_result",
    "artifact_saved",
    "goal_completed",
  ],
);
assert.equal(harness.transcript[3].toolCatalog.length, 1);
assert.equal(harness.transcript[3].toolCatalog[0], "ipython");
assert.equal(harness.artifacts.get("verification.txt"), "focused checks passed");
assert.equal(harness.goal.status, "complete");

const beforeRecovery = harness.worldEffects;
const projection = harness.recoverProjection();
assert.deepEqual(projection, {
  lastId: 9,
  goalStatus: "complete",
  artifacts: ["verification.txt"],
});
assert.equal(
  harness.worldEffects,
  beforeRecovery,
  "recovering events must not replay world mutations",
);

console.log("ok - one long task crosses routing, RLM, Host, persistence, and completion");
