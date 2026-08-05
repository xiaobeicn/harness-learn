# 第 6 课：Abort、Steering 与 Follow-up

[上一课](05-event-driven-agent-state.md) · [返回本阶段目录](README.md) · [运行代码](../examples/01-pi-mono/06-run-control/index.mjs)

## 核心问题

一个正在运行或即将结束的 Agent，如何被中断、修正方向，或继续处理排队消息？

## 三种控制不是一回事

| 控制 | 目的 | 注入时机 | 当前工作 |
| --- | --- | --- | --- |
| Steering | 修正正在进行的任务方向。 | 当前 assistant turn 和工具批次结束后、下一次模型调用前。 | 不自动取消当前工具。 |
| Follow-up | 当前任务自然结束后继续处理新请求。 | 没有工具调用和 Steering、Agent 本来要停止时。 | 等待当前运行自然到达停止点。 |
| Abort | 尽快停止当前模型或工具工作。 | 立即触发 AbortSignal。 | 由模型或工具协作响应，不回滚既有副作用。 |

把它们都实现成“向 messages 追加一条 user 消息”会丢失时序和安全语义。

## Pi Mono 的两层循环

Pi 的 `runLoop()` 使用两层循环：

```text
外层循环：Agent 本来结束后，处理 Follow-up
  └─ 内层循环：处理工具调用与 Steering
```

简化后的控制点：

```text
模型响应
  → 执行当前工具批次
  → turn_end
  → 读取 Steering queue
      ├─ 有：注入消息，开始下一 turn
      └─ 无工具、无 Steering：准备停止
          → 读取 Follow-up queue
              ├─ 有：回到外层循环
              └─ 无：agent_end
```

Abort 不属于任一消息队列。它通过独立的 `AbortController` 传播给模型、工具和需要响应取消的 hook。

## 运行实验

代码位于 [`examples/01-pi-mono/06-run-control/index.mjs`](../examples/01-pi-mono/06-run-control/index.mjs)。

```bash
node examples/01-pi-mono/06-run-control/index.mjs
```

示例依次运行 Steering、Follow-up 和 Abort 三个场景。

## 场景一：Steering

关键输出：

```text
tool_start name=slow_step
control  steering queued
tool_end   name=slow_step
message  role=toolResult source=model
turn_end
turn_start
message  role=user source=steering
```

Steering 在工具运行时进入队列，但没有跳过或取消 `slow_step`。当前工具结果先成为 transcript 的一部分，当前 `turn_end` 发出以后，纠偏消息才在下一 turn 注入。

因此 Steering 的语义是“完成当前原子工作后改变下一步”，不是抢占式中断。

## 场景二：Follow-up

关键输出：

```text
control  follow-up queued
turn_start
message  role=user source=prompt
message  role=assistant source=model
turn_end
turn_start
message  role=user source=follow-up
```

第一次 assistant 没有工具调用，Agent 本来可以结束。只有到这个停止点，Follow-up 才被取出并开启下一 turn。

如果当前任务仍在连续调用工具，Follow-up 不应插入中间改变其语义。

## 场景三：Abort

关键输出：

```text
control  abort requested
message  role=assistant source=model stop=aborted
turn_end
agent_end
result   stopReason=aborted error=Operation aborted
```

`Agent.abort()` 触发当前 `AbortController`。慢模型监听 signal，取消计时并返回 aborted 结果；loop 不再读取 Steering 或 Follow-up queue，直接结束。

### Abort 是协作式的

AbortSignal 只表达取消意图：

- 模型请求需要将 signal 传给 HTTP 或 stream 实现。
- 工具需要在耗时步骤间检查 signal，或把它传给底层 API。
- 已经写入文件、发送请求或启动的外部副作用不会自动回滚。
- 忽略 signal 的同步阻塞代码不会被 JavaScript 自动杀死。

因此 Abort 不是事务回滚，也不是 Sandbox 的进程强杀保证。

## Queue mode

Pi 的 Steering 和 Follow-up queue 都支持：

- `one-at-a-time`：默认，每次取最旧的一条。
- `all`：在一个 drain point 取出全部排队消息。

教学示例只实现默认的 `one-at-a-time`。无论采用哪种模式，都必须保持 FIFO，不能让后来的消息悄悄越过先到消息。

## 与 Pi Mono 的对应关系

| 教学示例 | Pi Mono |
| --- | --- |
| `steeringQueue` | `PendingMessageQueue` + [`Agent.steer()`](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent.ts#L283) |
| `followUpQueue` | `PendingMessageQueue` + [`Agent.followUp()`](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent.ts#L288) |
| `abortController` | [`Agent.abort()`](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent.ts#L319) |
| 内层循环 | [工具与 Steering](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent-loop.ts#L173) |
| 外层循环 | [Follow-up](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent-loop.ts#L169) |

## 30 秒复述

1. Steering 为什么不会跳过当前正在执行的工具？
2. Follow-up 在什么条件下才会进入 Context？
3. Abort 为什么不能保证回滚文件修改？
4. 为什么 Steering 和 Follow-up 需要两个队列？

## 下一步

[下一课](07-phase-review.md)完成第一阶段复盘：从空白开始画出最小 Agent Runtime，解释每条边，并把已验证结论写入横向对照表。
