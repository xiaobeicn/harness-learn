# 第 9 课：Subagent、Jobs、Goal、Schedule 与 Workflow

[返回本阶段目录](README.md) · [上一课](08-approval-filesystem-shell-sandbox.md) · [Subagent 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/subagent.md) · [Jobs 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/jobs.md) · [课程实验](../examples/06-deepseek-harness/09-durable-continuation/index.mjs)

## 核心问题

DeepSeek Harness 怎样在不膨胀核心 Loop 的情况下加入多 Agent 与长期运行？为什么 child Session durable，不代表 child process 永远常驻？

## Subagent 是 capability seam

`源码/文档`：Subagent 不硬编码在核心 Agent loop 中。多个 provider 可以并存：

- in-process spawn；
- in-process fork；
- ACP；
- Codex；
- Claude Code；
- dsh SDK。

one-shot 与 continuable 是不同调用路径。前者等待一次 settlement；后者建立可多轮 followup 的 child identity。

## Durable Session 与 Activation

continuable child 的三个层次：

| 层 | 生命周期 | 保存什么 |
| --- | --- | --- |
| child Session | durable | transcript、Inbox、lineage 与 Turn events。 |
| Activation | process-local | 当前恢复出来的运行实例，最多一个。 |
| AgentHandle | process-local | 驱动当前 Agent 与 descendants 的句柄。 |

Agent Inbox 是唯一 turn FIFO。`startContinuable()` 在 initial message 被 Inbox 接受后就返回 childId + messageId，不等待 Turn 完成。

冷 followup 可以从持久 Session 重建 Activation。Activation 可执行多轮并等待 descendants，但进程 teardown 后不会假装仍在运行。

## Authorization 与回传

父子授权使用 live parent / ancestor 关系，不依赖 message 中可伪造的 source 字段。Child report 与 runtime settlement notice 分开，避免把运行时生成的说明文字冒充 child 自己的答案。

Disposal 采用 child-first；Session 可以在 Activation 和进程结束后继续存在，供后续 resume。

## Jobs、Goal 与 Schedule

对应的固定文档入口是 [Goal](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/goal.md)、[Schedule](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/schedule.md)与 [Workflow](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/workflow.md)。

| 能力 | 回答的问题 | Durable 边界 |
| --- | --- | --- |
| Job | 现在有哪些后台工作，谁拥有它？ | owner Session 授权，不把可预测 id 当 secret。 |
| Goal | 当前 Session 的 durable objective 是什么？ | revision CAS 更新；durable phase 与 process activation 分离。 |
| Schedule | 什么时候把 reminder 送回 Session？ | session-local 记录，dispatch 为 ordinary followup。 |

Schedule 对 overdue fixed-rate 只取最近一次，避免补发无限 backlog。但 admission 与 durable dispatch 之间仍可能出现 at-least-once 重复，consumer 需要幂等。

Goal 的 revision CAS 防止并发更新静默覆盖；Goal complete 也不自动证明所有外部副作用已验证。

## Workflow

Workflow 在 worker thread 中执行模型生成的 orchestration script，并从脚本启动 Subagents：

```text
model-generated workflow
  → worker thread
  → subagent providers
  → normalized settlements
  → workflow result / cancellation
```

`result` 不通过 rejected promise 表示业务失败；cancel / dispose 有 bounded settle。Worker 与 `vm` 改善生命周期和故障 containment，但不是授权边界。

## 五种能力为什么不应合成一个 Scheduler

- Subagent 管另一个 Agent 的执行与消息。
- Job 管后台 operation registry。
- Goal 管长期 objective 与 revision。
- Schedule 管时间触发 admission。
- Workflow 管一次脚本化 orchestration。

它们可以协作，但 ownership、completion 和 crash semantics 不同。合成一个模糊 `task` 状态会让“已接纳”“正在运行”“目标完成”和“提醒已发送”互相冒充。

## 实验

```bash
node examples/06-deepseek-harness/09-durable-continuation/index.mjs
```

`实验`：脚本创建 durable child Session，启动 process-local Activation，接纳初始消息后立即返回；模拟进程丢失后用同一 Inbox 恢复并处理 followup，同时验证 stale Goal revision 被拒绝。

## 本课结论

- `源码/文档`：Subagent 是可选 capability，多 provider 可并存；one-shot 与 continuable 使用不同契约。
- `源码`：child Session durable，Activation / AgentHandle process-local，Agent Inbox 是唯一 turn FIFO。
- `源码`：authorization 基于 live ancestry；child report 与 runtime settlement notice 分离。
- `源码/文档`：Job、Goal、Schedule 与 Workflow 分别拥有后台工作、目标、时间 admission 与编排。
- `限制`：Workflow worker / vm 不是 security boundary；Schedule dispatch 存在已记录的 at-least-once 窗口。

## 下一步

最后一课比较 Cordis plugin、Skill、MCP、Hook 和动态 Cordis package，并把六个阶段的设计贡献串成一条自研基线。
