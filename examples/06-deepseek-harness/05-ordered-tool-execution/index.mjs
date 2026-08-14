import assert from "node:assert/strict";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const calls = [
  { id: 0, name: "read-a", parallel: true, delay: 30 },
  { id: 1, name: "read-b", parallel: true, delay: 5 },
  { id: 2, name: "write", parallel: false, delay: 1 },
  { id: 3, name: "read-c", parallel: true, delay: 1 },
];

const dispatched = [];
const finished = [];
const committed = [];

async function execute(call) {
  const args = Object.freeze(structuredClone({ id: call.id }));
  dispatched.push(call.name);
  await sleep(call.delay);
  finished.push(call.name);
  return Object.freeze({ id: args.id, ok: true, output: call.name });
}

async function runOrdered(batch) {
  const results = [];
  for (let index = 0; index < batch.length; ) {
    if (batch[index].parallel === true) {
      const group = [];
      while (index < batch.length && batch[index].parallel === true) {
        group.push(batch[index]);
        index += 1;
      }
      results.push(...(await Promise.all(group.map(execute))));
    } else {
      results.push(await execute(batch[index]));
      index += 1;
    }
  }
  results.forEach((result) => committed.push(result.output));
  return results;
}

const results = await runOrdered(calls);

assert.deepEqual(dispatched, ["read-a", "read-b", "write", "read-c"]);
assert.deepEqual(finished, ["read-b", "read-a", "write", "read-c"]);
assert.deepEqual(committed, ["read-a", "read-b", "write", "read-c"]);
assert.deepEqual(results.map((result) => result.id), [0, 1, 2, 3]);
assert.ok(finished.indexOf("write") > finished.indexOf("read-a"), "exclusive call is a barrier");

console.log("ok - tool bodies overlap, exclusive calls form barriers, and commit stays ordered");
