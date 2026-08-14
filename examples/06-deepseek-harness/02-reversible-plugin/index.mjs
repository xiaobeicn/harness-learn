import assert from "node:assert/strict";

class Context {
  services = new Map();
  listeners = new Map();

  mount(plugin) {
    for (const dependency of plugin.injects ?? []) {
      assert.ok(this.services.has(dependency), `missing service: ${dependency}`);
    }

    const disposers = [];
    const fiber = {
      state: "LOADING",
      provide: (name, value) => {
        assert.equal(this.services.has(name), false, `duplicate service: ${name}`);
        this.services.set(name, value);
        disposers.push(() => this.services.delete(name));
      },
      on: (event, listener) => {
        const set = this.listeners.get(event) ?? new Set();
        set.add(listener);
        this.listeners.set(event, set);
        disposers.push(() => set.delete(listener));
      },
      effect: (setup) => disposers.push(setup()),
    };

    plugin.apply(fiber, this.services);
    fiber.state = "ACTIVE";
    return () => {
      fiber.state = "UNLOADING";
      disposers.reverse().forEach((dispose) => dispose());
      fiber.state = "DISPOSED";
      return fiber.state;
    };
  }
}

const ctx = new Context();
const disposeRegistry = ctx.mount({
  apply(fiber) {
    fiber.provide("tools", new Map());
  },
});

let openResources = 0;
const disposeTool = ctx.mount({
  injects: ["tools"],
  apply(fiber, services) {
    const tools = services.get("tools");
    tools.set("read", () => "data");
    fiber.effect(() => () => tools.delete("read"));
    fiber.on("request", () => "observed");
    fiber.effect(() => {
      openResources += 1;
      return () => {
        openResources -= 1;
      };
    });
  },
});

assert.equal(ctx.services.get("tools").get("read")(), "data");
assert.equal(ctx.listeners.get("request").size, 1);
assert.equal(openResources, 1);
assert.equal(disposeTool(), "DISPOSED");
assert.equal(ctx.services.get("tools").has("read"), false);
assert.equal(ctx.listeners.get("request").size, 0);
assert.equal(openResources, 0);
disposeRegistry();
assert.equal(ctx.services.has("tools"), false);

console.log("ok - one fiber disposal reverses registry, listener, and resource effects");
