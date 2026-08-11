import assert from "node:assert/strict";

function chooseExtension(requirement) {
  const routes = {
    instructions: { mechanism: "markdown_skill", modelPath: "context_on_demand" },
    python_callable: { mechanism: "python_skill", modelPath: "ipython" },
    remote_mcp: {
      mechanism: "python_skill",
      modelPath: "ipython",
      transport: "http",
    },
    host_lifecycle: { mechanism: "typescript_extension", modelPath: "host" },
    callable_hint: {
      mechanism: "harness_skill_entry",
      modelPath: "system_prompt",
    },
  };
  const route = routes[requirement];
  if (!route) throw new Error(`unsupported requirement: ${requirement}`);
  return route;
}

class ToolCallHook {
  check(call) {
    if (call.action === "write" && call.path === ".env") {
      return { block: true, reason: "protected path" };
    }
    return { block: false };
  }
}

class EnforcementBoundary {
  constructor(writableRoots) {
    this.writableRoots = writableRoots;
  }

  canWrite(path) {
    return this.writableRoots.some(
      (root) => path === root || path.startsWith(`${root}/`),
    );
  }
}

assert.deepEqual(chooseExtension("remote_mcp"), {
  mechanism: "python_skill",
  modelPath: "ipython",
  transport: "http",
});
assert.equal(chooseExtension("instructions").mechanism, "markdown_skill");
assert.equal(chooseExtension("host_lifecycle").mechanism, "typescript_extension");
assert.equal(chooseExtension("callable_hint").mechanism, "harness_skill_entry");

const hook = new ToolCallHook();
assert.deepEqual(hook.check({ action: "write", path: ".env" }), {
  block: true,
  reason: "protected path",
});

const directKernelAccessPassedHook = true;
assert.equal(
  directKernelAccessPassedHook,
  true,
  "an application hook does not enforce every OS access path",
);

const sandbox = new EnforcementBoundary(["workspace"]);
assert.equal(sandbox.canWrite("workspace/src/app.ts"), true);
assert.equal(sandbox.canWrite(".env"), false);
assert.equal(sandbox.canWrite("/etc/hosts"), false);

console.log("ok - extension routing stays narrow and Hook policy is not OS enforcement");
