import assert from "node:assert/strict";

class Goal {
  status = "active";
  continuations = 0;

  afterAssistantTurn() {
    if (this.status !== "active") return undefined;
    this.continuations += 1;
    return "continue toward the durable objective";
  }

  complete({ verified }) {
    assert.equal(verified, true, "completion requires explicit verification");
    this.status = "complete";
  }
}

class AutonomousPolicy {
  lastFailedFingerprint;
  gateRuns = 0;

  evaluate(fingerprint, gate) {
    if (fingerprint === this.lastFailedFingerprint) {
      return { continue: true, gateRan: false, reason: "workspace unchanged" };
    }
    this.gateRuns += 1;
    const passed = gate();
    if (!passed) this.lastFailedFingerprint = fingerprint;
    return { continue: !passed, gateRan: true, reason: passed ? "passed" : "failed" };
  }
}

class Scheduler {
  constructor(interval) {
    this.interval = interval;
    this.nextRunAt = 0;
    this.claimedTicks = new Set();
  }

  claimDue(now) {
    if (now < this.nextRunAt || this.claimedTicks.has(this.nextRunAt)) return undefined;
    const scheduledFor = this.nextRunAt;
    this.claimedTicks.add(scheduledFor);
    this.nextRunAt = scheduledFor + this.interval;
    return { scheduledFor };
  }
}

const goal = new Goal();
assert.equal(goal.afterAssistantTurn(), "continue toward the durable objective");
assert.equal(goal.status, "active");
goal.complete({ verified: true });
assert.equal(goal.afterAssistantTurn(), undefined);

const autonomous = new AutonomousPolicy();
assert.deepEqual(autonomous.evaluate("tree-a", () => false), {
  continue: true,
  gateRan: true,
  reason: "failed",
});
assert.deepEqual(autonomous.evaluate("tree-a", () => false), {
  continue: true,
  gateRan: false,
  reason: "workspace unchanged",
});
assert.equal(autonomous.gateRuns, 1);
assert.equal(autonomous.evaluate("tree-b", () => true).continue, false);

const scheduler = new Scheduler(10);
const first = scheduler.claimDue(0);
assert.deepEqual(first, { scheduledFor: 0 });
assert.equal(scheduler.nextRunAt, 10, "schedule advances before delivery");

const deliveryCrashed = true;
assert.equal(deliveryCrashed, true);
assert.equal(scheduler.claimDue(0), undefined, "crash must not replay the claimed tick");
assert.deepEqual(scheduler.claimDue(10), { scheduledFor: 10 });

console.log("ok - objectives, continuations, gates, and scheduled ticks stay distinct");
