# 第 3 课：Inbox、Turn、Step 与 Agent Loop

[返回本阶段目录](README.md) · [上一课](02-profile-bundle-patch-plugin-lifecycle.md) · [Agent Lifecycle](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/agent-lifecycle.md) · [Agent Loop 源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/core/agent-loop/src/agent.ts) · [课程实验](../examples/06-deepseek-harness/03-inbox-agent-loop/index.mjs)

## 核心问题

一条输入在哪个边界变成 durable fact？`steer`、`inject` 与 `followup` 为什么不能都直接塞进当前模型请求？

## Durable Inbox

`源码`：Agent Inbox 把待处理消息分成两条队列：

| 队列 | 输入 | 可见时机 |
| --- | --- | --- |
| `next-step` | `steer`、`inject` | 当前 Turn 的下一次 Step claim。 |
| `next-turn` | `followup` | 当前 Turn 结束后的新 Turn。 |

每次 splice 都写入 `agent/inbox/spliced` Session event。恢复时由日志重放队列，而不是只相信进程内数组。

Inbox 接纳只说明消息已经排入对应位置，不说明它已经发给模型或执行完成。

## Turn 与 Step

```text
Turn
  ├─ Step 1 = model request + tool batch
  ├─ Step 2 = tool results + model request + tool batch
  └─ Step n = model request with no tool call
```

- Turn 在第一次 claim 前写 `turn/start`。
- 一个 Turn 包含零到多个 Step。
- Step 在发请求前写 `step/start`，结束时写 `step/end`。
- 一次 Step 是一次模型请求及其工具批次，不是一次任意函数调用。

## 一次 Step 的顺序

固定源码的主路径可以压缩为：

```text
agent/pre-step
  → step/start
  → append claimed user/message
  → session.deriveMessages()
  → assemble request header / context
  → stream LLM chunks
  → assistant/message
  → execute tool batch
  → step/end
```

`agent/pre-step` 可以拒绝本步或改写即将进入的消息。进入模型可见历史的消息随后被 durable 记录。

## Continuation 与停止

| 本步结局 | 下一动作 |
| --- | --- |
| 没有 tool call | 当前 Turn completed。 |
| 产生 ToolResult | 开始下一 Step。 |
| tool 标记 `concludesTurn` | 完成当前 Turn。 |
| abort / policy block | 写对应 Turn outcome。 |
| max tokens / error | 保存显式结局，不伪装 completed。 |

Turn 终止前还有 `agent/turn-stopping` 扩展点。最终 `turn/end` 可保存 completed、aborted、blocked、error 或 max-tokens；冷恢复开放 Turn 时还会形成 synthetic interrupted。

## Phase 不是历史

`ReactLoopAgent` 的进程内 phase 是 `idle`、`maintenance` 或 `running`。它适合协调当前操作，但不能取代 durable Turn / Step events。

```text
phase = 当前进程正在做什么
Session events = 已经接受并记录了什么
```

恢复、Fork 和 UI projection 必须依赖后者。

## 错误边界

`kick()` 在 driver 边界包含错误，防止一个 rejected promise 让执行 owner 静默死亡。但错误会先通过 `agent/error` 报告，并写入当前 Turn 的结局。

`结论`：containment 的目标是保持 runtime 可继续服务，不是吞掉错误或返回假成功。

## 实验

```bash
node examples/06-deepseek-harness/03-inbox-agent-loop/index.mjs
```

`实验`：脚本接纳一个 prompt、一个 steer 和一个 followup；第一 Turn 用两步消费 prompt / steer，第二 Turn 才消费 followup，并断言所有 splice 与生命周期事件连续记录。

## 本课结论

- `源码`：Inbox mutation 是 durable event，`next-step` 与 `next-turn` 有不同 drain point。
- `源码/文档`：Turn 包含零到多个 Step；Step 把一次模型请求与其工具批次作为一个生命周期单元。
- `源码`：工具结果驱动下一 Step，无工具调用通常完成 Turn。
- `结论`：Steering 的正确性来自显式接纳位置与 claim 边界，而不是在 stream 中任意篡改请求。
- `限制`：实验没有调用真实 Provider，也没有覆盖并发 arrival 与 abort race。

## 下一步

下一课继续追踪一次 Step 怎样组装 System Prompt、Runtime Context 和 Tool schemas，并把 raw stream 变成可重放的模型可见事实。
