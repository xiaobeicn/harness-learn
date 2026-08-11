# 第 8 课：Goal、Autonomous、Heartbeat 与 Schedule

[返回本阶段目录](README.md) · [上一课](07-daemon-worker-recovery.md) · [官方 Long-Running Agents](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/docs/long-running-agents.md) · [课程实验](../examples/05-prime-agent/08-long-running-policy/index.mjs)

## 核心问题

一次普通 assistant turn 结束后，Harness 根据什么立即继续、等待下个时间点，或真正停止？谁可以创建和完成这些长期状态？

## 五种机制解决不同问题

| 机制 | Owner | 保存 / 决定什么 | 进入 Session 的时机 |
| --- | --- | --- | --- |
| Goal | 用户或 Host 显式创建；Agent 可读取、完成 | 持久 objective、status、usage、可选 token budget | 普通 turn 结束后，active Goal 形成 continuation。 |
| Autonomous | Host policy | gate、continuation / turn / token / time limits | 当前 turn 可结束时判断是否立即注入 follow-up。 |
| `/heartbeat` | 用户 | 当前 Session 的一个可见 recurring instruction | 到期后按 steer 或 follow-up delivery。 |
| `rlm_heartbeat` | Agent | 当前 Session 内多个程序化 recurring instructions | 到期后按各自 delivery mode。 |
| General schedule | 用户或自动化 | 对 addressable Agent 的 one-shot / cron prompt | Scheduler 到期 claim 后投递。 |

`文档`：[`long-running-agents.md`](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/docs/long-running-agents.md#L112-L170)明确区分三种时间调度 surface。Agent 不能用 `rlm_heartbeat` 替换或清除用户拥有的 `/heartbeat`。

## Goal 保存目标，不自行证明完成

Goal 具有 `active`、`paused`、`budget_limited`、`complete`、`error` 等状态，并记录：

- objective 与 goal ID。
- tokens used、elapsed time、continuations used。
- 可选 token budget。
- 创建和更新时间。

普通 assistant turn 的自然停止不会把 Goal 标成成功。只有模型在核对完整 objective 后显式执行：

```python
await goal.complete()
```

`源码`：[`goals.ts`](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/src/core/goals.ts#L207-L229)生成的 continuation prompt 明确要求先审计每项要求；预算接近耗尽或准备停止都不是 completion 证据。

创建 Goal 同样是显式用户或 Host 行为。Harness 不应把每个普通请求偷偷升级为无限长期目标。

## Autonomous 是有界 continuation policy

Autonomous 不保存业务目标，它回答：

> 当前没有人类输入时，是否应再给 Agent 一轮？

判断可使用：

- maximum continuations。
- maximum assistant turns。
- token budget。
- wall-clock deadline。
- 一个或多个 quality gate commands。

Gate 失败时，其 bounded output 回灌给 Agent，允许下一轮修复。固定实现记录 workspace fingerprint；如果 worktree 自同一个失败后没有变化，就不会反复执行相同 gate，而会要求先产生可观察进展。

`源码`：[`autonomous.ts`](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/src/core/autonomous.ts#L232-L360)把 limit、gate retry 与 unchanged-workspace 检查分开。错误不通过 silent retry 被掩盖。

Goal 与 Autonomous 可以同时存在：

```text
Goal       → 我们要完成什么，当前状态是什么？
Autonomous → 当前 turn 后是否允许、需要继续？
```

## Continuation 有 arrival race

AgentSession 在普通 loop 可停止时依次检查已接纳 action、active Goal 与 Autonomous policy。异步运行 gate 或 evaluator 期间可能有新用户输入到达。

因此实现记录 arrival epoch：如果 policy 判断完成时输入代际已经变化，就不注入基于旧世界的 continuation。新输入应该先成为下一次权威上下文。

`结论`：长任务 policy 不能只判断 `messages.length`；它必须与输入接纳顺序协调。

## Schedule 先 Claim / Advance，再 Delivery

`源码`：[`cron-jobs.ts`](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/src/core/cron-jobs.ts#L1574-L1624)对 due job 的处理顺序是：

```text
读取 due tick
  → 持久化 dispatch claim
  → 先推进 nextRunAt / 完成 one-shot
  → 再把 prompt 交给 target Session
```

这样 Worker 在 delivery 之后、settlement 之前 crash 时，不会把同一个不确定 tick 自动投递第二遍。恢复会把 claim 标为 interrupted，保留已经推进的 schedule，只处理未来 tick。

同一个 job 仍有 active claim 时，后续 missed ticks 会 coalesce，而不是累积为无界 backlog。不同 target Session 则可独立 dispatch。

## Busy Session 的 Delivery Mode

- `steer`：有意进入当前 active work，适合“现在就重新观察”的 heartbeat。
- `follow_up`：等待当前 turn 完成，适合不应打断临界修改的检查。
- idle target：可以直接作为新 prompt 接纳。

Delivery receipt 的 `queued` 只证明已接纳等待，不等于 prompt 已执行或工作已完成。

## 实验

```bash
node examples/05-prime-agent/08-long-running-policy/index.mjs
```

`实验`：脚本让 active Goal 在普通 turn 后继续，仅显式 `complete()` 才停止；Autonomous gate 失败后要求 worktree 变化才可重跑；Scheduler 则在 delivery 前先 claim 并推进 `nextRunAt`，模拟 crash 后不会重复同一 tick。

## 本课结论

- `源码/文档`：Goal 是 durable objective；只有 `goal.complete()` 表示成功。
- `源码/文档`：Autonomous 是有 gate 和多重 budget 的 Host continuation policy。
- `源码/文档`：用户 heartbeat、Agent heartbeat 与 general schedule 的 owner 和影响范围不同。
- `源码`：Schedule 先 claim / advance 再 delivery；结果不确定的 tick 不会自动重复投递。
- `结论`：持续运行必须把“为什么继续”“何时继续”“谁允许继续”“怎样证明完成”拆开。
- `限制`：外部副作用是否幂等仍由具体任务负责；Scheduler 不会把任意命令变成事务。

## 下一步

下一课回到能力接入，比较 Skill、MCP、TypeScript Extension 与 Continual Harness entry，并明确它们各自的信任边界。
