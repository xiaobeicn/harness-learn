# 第 5 课：Event 驱动 Agent State

[上一课](04-transcript-and-model-context.md) · [返回本阶段目录](README.md) · [运行代码](../../examples/01-pi-mono/05-event-driven-state/index.mjs)

## 核心问题

低层 Agent loop 如何在不知道 CLI、TUI 或服务器实现的情况下，驱动一个可观察的有状态 Agent？

## 三层结构

```text
低层 runLoop()
  → emit(event)
  → Agent.processEvent()
      → 更新 Agent State
      → await subscribers
```

| 层 | 职责 |
| --- | --- |
| Loop | 调用模型、执行工具，并按时间顺序发出事实。 |
| Agent wrapper | 管理运行生命周期，把 Event 归约成当前 State。 |
| Subscriber | 根据 Event 和已更新的 State 渲染 UI、写日志或持久化。 |

Loop 不需要导入任何 UI 代码，Subscriber 也不需要进入 loop 内部读取局部变量。

## 运行实验

代码位于 [`examples/01-pi-mono/05-event-driven-state/index.mjs`](../../examples/01-pi-mono/05-event-driven-state/index.mjs)。

```bash
node examples/01-pi-mono/05-event-driven-state/index.mjs
```

关键输出：

```text
message_start          messages=- streaming=user pending=- running=true
message_end            messages=user streaming=- pending=- running=true
message_end            messages=user→assistant streaming=- pending=- running=true
tool_execution_start   messages=user→assistant streaming=- pending=call-1 running=true
tool_execution_end     messages=user→assistant streaming=- pending=- running=true
message_end            messages=user→assistant→toolResult streaming=- pending=- running=true
message_end            messages=user→assistant→toolResult→assistant streaming=- pending=- running=true
agent_end              messages=user→assistant→toolResult→assistant streaming=- pending=- running=true

After prompt() resolved
messages=user→assistant→toolResult→assistant streaming=- pending=- running=false
agent_end listener awaited: true
```

## Event 是时间序列事实

Loop 发出的是“刚才发生了什么”：

- 一条消息开始或结束。
- 一个工具开始或结束。
- 一个 turn 完成。
- 整个 agent run 不再产生新 loop 事件。

Event 本身不必保存所有当前状态。例如 `tool_execution_start` 只说明某个 call id 开始了，不必重复携带完整 transcript。

## State 是当前快照

示例中的 `Agent.state` 保存：

| 字段 | 更新方式 |
| --- | --- |
| `messages` | 在 `message_end` 时追加完成的消息。 |
| `streamingMessage` | 在 `message_start` 时设置，在 `message_end` 时清空。 |
| `pendingToolCalls` | 工具开始时加入 call id，结束时移除。 |
| `errorMessage` | 在 `turn_end` 时读取 assistant 错误。 |
| `isStreaming` | 由 Agent wrapper 在运行开始和完全结算时维护。 |

UI 想渲染“当前正在执行几个工具”，直接读取 State；想播放动画或记录耗时，则观察 Event。

## 为什么先更新 State，再通知 Subscriber

`processEvent()` 的顺序是：

```text
event
  → reduce state
  → subscriber(event, updatedState)
```

因此收到 `tool_execution_start` 的订阅者，立刻能在 `pendingToolCalls` 里看到 `call-1`。如果顺序反过来，订阅者会看到上一个时刻的旧 State，UI 容易出现一拍延迟或竞态。

Pi Mono 的 `Agent.processEvents()` 使用相同顺序：先根据 Event 更新 `_state`，再按注册顺序 `await` 每个 listener。

## `agent_end` 不等于 `prompt()` 已 resolve

`agent_end` 的精确定义是：**loop 不会再发出新事件。**

但是处理最后事件的异步订阅者可能仍在：

- 保存会话。
- 刷新终端输出。
- 写 telemetry。
- 将最后一条消息同步到其他进程。

实验让 `agent_end` listener 等待 10ms。该 listener 看到 `running=true`；只有它完成以后，`prompt()` 才 resolve，Agent wrapper 才在 `finally` 中把 `isStreaming` 设为 `false`。

这保证调用方在 `await agent.prompt()` 返回时，最后一个 awaited subscriber 也已经结算。

## 为什么更新 `Set` 时创建副本

示例和 Pi 都在 pending tool call 变化时创建新 `Set`：

```javascript
const pending = new Set(state.pendingToolCalls);
pending.add(toolCallId);
state.pendingToolCalls = pending;
```

这会改变集合引用，让依赖引用变化的响应式 UI 更容易发现更新；同时避免订阅者持有的只读视图被原地修改。

## 这不是完整 Event Sourcing

Event 可以驱动运行态 UI，但不能据此假设整个 Agent 能从这些事件完整重建：

- system prompt、model、tools 等配置不一定出现在 Event 中。
- `isStreaming` 的开始和最终清理由 wrapper 生命周期管理。
- Event 默认不等于已经持久化的 durable log。
- Context 转换结果也不一定写入 transcript Event。

准确说法是“Event 驱动运行态 State”，不是“所有 Agent 状态都是 Event Sourced”。

## 与 Pi Mono 的对应关系

| 教学示例 | Pi Mono |
| --- | --- |
| `runLoop()` | `runLoop()` / `runAgentLoop()` |
| `emit()` | `AgentEventSink` |
| `Agent` wrapper | [`Agent`](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent.ts#L173) |
| `processEvent()` | [`Agent.processEvents()`](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent.ts#L540) |
| `prompt()` 生命周期 | [`runWithLifecycle()`](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent.ts#L482) |
| awaited subscriber | `await listener(event, signal)` |

## 30 秒复述

1. Event 和 State 分别回答什么问题？
2. 为什么 Subscriber 应该看到已经更新后的 State？
3. 为什么收到 `agent_end` 时 `isStreaming` 仍可能为 `true`？
4. 为什么这个设计不能直接称为完整 Event Sourcing？

## 下一步

[下一课](06-abort-steering-follow-up.md)学习 Abort、Steering 与 Follow-up：运行中的 Agent 如何被中断、修正方向，或在自然结束后继续处理排队消息。
