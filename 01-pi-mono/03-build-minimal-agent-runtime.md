# 第 3 课：实现最小 Agent Runtime

[上一课](02-prompt-tool-loop.md) · [返回本阶段目录](README.md) · [运行代码](../examples/01-pi-mono/03-minimal-agent-runtime/index.mjs)

## 核心问题

不连接真实模型、不使用 Agent 框架，能否亲手还原“模型 → 工具 → 模型”的最小循环？

本课使用零依赖 JavaScript 和确定性的 fake model。这样可以只观察 Runtime，不受 API Key、网络、模型随机性或供应商协议影响。

## 运行

在项目根目录执行：

```bash
node examples/01-pi-mono/03-minimal-agent-runtime/index.mjs
```

实际输出：

```text
agent_start
turn_start             turn=1
message_start          role=user
message_end            role=user
message_start          role=assistant
message_end            role=assistant
tool_execution_start   tool=echo
tool_execution_end     tool=echo error=false
message_start          role=toolResult
message_end            role=toolResult
turn_end               turn=1
turn_start             turn=2
message_start          role=assistant
message_end            role=assistant
turn_end               turn=2
agent_end              messages=4

Summary
scenario: valid arguments
model calls: 2
tool executions: 1
message roles: user -> assistant -> toolResult -> assistant
final answer: Model saw: echoed: hello
```

## 五个最小部件

完整代码在 [`index.mjs`](../examples/01-pi-mono/03-minimal-agent-runtime/index.mjs)。

### 1. Messages

示例只保留三种模型能理解的消息：

```text
user
assistant
toolResult
```

`messages` 数组既是 transcript，也是下一次模型调用的输入。生产 Runtime 通常会把完整 transcript 与发送给模型的 Context 分开处理。

### 2. Model boundary

`fakeModel(context)` 与真实模型适配器占据同一个位置：输入 messages 和工具定义，返回 assistant 消息。

它第一次看到 `user`，返回：

```text
assistant(toolCall: echo)
```

第二次看到 `toolResult`，返回最终文本。fake model 虽然是确定性的，但 Runtime 不需要知道它内部如何决策。

### 3. Tool registry

`echo` 工具包含两类信息：

- 给模型看的 `name`、`description`、`parameters`。
- 只给 Runtime 使用的 `validate()` 和 `execute()`。

Runtime 构建 `toolDefinitions` 时主动去掉执行函数。模型只能请求工具，不能直接获得或调用宿主程序里的函数。

### 4. Agent loop

循环的核心可以压缩成下面几行伪代码：

```text
while 未结束：
  assistant = model(messages, toolDefinitions)
  messages.push(assistant)

  toolCalls = assistant 中的工具请求
  if toolCalls 为空：
    return messages

  for 每个 toolCall：
    校验参数
    执行工具
    messages.push(toolResult)
```

示例加入 `maxTurns = 8`，防止错误模型无限请求工具。超过限制会显式失败，不返回伪造的成功结果。

### 5. Events

`emit(event)` 将运行过程交给外部观察者。示例只打印事件；真实调用方可以使用同一边界更新 TUI、写日志或同步状态。

Runtime 不应该把 UI 渲染写进 loop。否则同一个 loop 很难同时服务 CLI、TUI、编辑器或服务器。

## Transcript 如何增长

| 时刻 | Messages |
| --- | --- |
| 收到输入 | `user` |
| 第一次模型调用后 | `user → assistant(toolCall)` |
| 工具执行后 | `user → assistant(toolCall) → toolResult` |
| 第二次模型调用后 | `user → assistant(toolCall) → toolResult → assistant(text)` |

关键点是：工具调用请求和工具结果都必须保留。第二次模型调用需要知道“哪个请求产生了哪个结果”。示例使用 `toolCallId` 建立关联。

## 与 Pi Mono 的对应关系

| 教学示例 | Pi Mono |
| --- | --- |
| `runAgent()` | `runLoop()` 与外围的 `runAgentLoop()` |
| `fakeModel()` | 注入的 `StreamFn` / 模型适配层 |
| `messages` | `AgentContext.messages` |
| `tools` | `AgentTool[]` |
| `validate()` | `validateToolArguments()` |
| `execute()` | `AgentTool.execute()` |
| `emit()` | `AgentEventSink`，随后由 `Agent.processEvents()` 消费 |
| `toolResult` | `ToolResultMessage` |
| `maxTurns` | 教学示例自己的防无限循环限制，不能假设 Pi 使用相同策略 |

## 刻意省略的能力

这份代码不是完整 Harness。它暂时省略：

- 模型的流式响应和 `message_update`。
- 多供应商模型协议与重试。
- `transformContext()` 和 `convertToLlm()`。
- 多工具并行执行。
- steering、follow-up 和中断。
- `beforeToolCall`、`afterToolCall` 等策略 hook。
- 会话持久化、Context 压缩和 Memory。
- 权限系统与 Sandbox。

这些能力应在理解最小循环后逐层加入，而不是同时塞进第一份实现。

## 工具参数校验失败实验

同一份示例可以让 fake model 产生错误类型的工具参数：

```bash
node examples/01-pi-mono/03-minimal-agent-runtime/index.mjs --invalid-args
```

`--invalid-args` 会把工具请求从 `arguments: { value: "hello" }` 改成 `arguments: { value: 42 }`。

关键输出：

```text
tool_execution_end     tool=echo error=true

Summary
scenario: invalid arguments
model calls: 2
tool executions: 0
message roles: user -> assistant -> toolResult -> assistant
final answer: Model saw: echo expects a string argument named "value"
```

| 问题 | 实际结果 | 原因 |
| --- | --- | --- |
| `echo.execute()` 是否调用？ | 否，执行次数为 `0`。 | `validate()` 先失败。 |
| 工具结束事件是否报错？ | `error=true`。 | Runtime 把校验异常转换成失败的工具结果。 |
| 第二次模型调用是否发生？ | 是，总调用次数仍为 `2`。 | 失败的 `toolResult` 也被追加到 messages。 |
| 角色顺序是否改变？ | 否。 | 成功和失败使用相同的消息协议。 |

不要通过吞掉异常让程序继续。Runtime 应把可预期的工具失败转换成 `isError: true` 的 `toolResult`，让模型看见并决定如何恢复。

### 工具失败与 Runtime 失败

两者必须分开：

- **工具失败**：工具不存在、参数无效或执行报错。Runtime 仍能构造合法的 `toolResult`，所以 loop 可以继续。
- **Runtime 失败**：模型返回不合法消息、内部状态损坏或模型边界直接抛出无法处理的异常。此时无法保证后续协议正确，应显式终止。

Pi Mono 的 `prepareToolCall()` 和 `executePreparedToolCall()` 也会把可预期的工具错误转换成错误 ToolResult，而不是伪装成成功。

## 30 秒复述

1. 模型为什么只能看到工具定义，不能获得 `execute()`？
2. `assistant(toolCall)` 为什么也必须进入 messages？
3. 如果模型不断返回工具调用，Runtime 会发生什么？
4. 如果删除 Event，loop 还能运行吗？外部调用方会失去什么？

## 下一步

[下一课](04-transcript-and-model-context.md)将完整 transcript 与实际发送给模型的 Context 分开，复现 Pi Mono 的 `transformContext()` 和 `convertToLlm()` 边界。
