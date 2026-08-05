# 第 2 课：从 `prompt()` 追踪工具循环

[上一课](01-agent-runtime-mental-model.md) · [返回本阶段目录](README.md)

## 核心问题

一次 `Agent.prompt()` 如何经过模型调用、工具执行和结果回填，最终生成回答？

本课结论基于阶段目录中记录的固定 commit。

## 真实调用链

```text
Agent.prompt(input)
  → normalizePromptInput()
  → runPromptMessages()
  → createContextSnapshot() + createLoopConfig()
  → runAgentLoop()
  → runLoop()
      → streamAssistantResponse()
          → transformContext()
          → convertToLlm()
          → streamFn(model, llmContext)
      → assistant 是否包含 toolCall？
          ├─ 否：结束当前运行
          └─ 是：executeToolCalls()
                 → 找工具
                 → 准备并校验参数
                 → beforeToolCall()
                 → tool.execute()
                 → afterToolCall()
                 → 创建 ToolResultMessage
                 → 写回 context.messages
                 → 回到 streamAssistantResponse()
```

## 源码入口

- [`Agent.prompt()`](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent.ts#L344)：拒绝并发运行，将字符串变成 `user` 消息。
- `createContextSnapshot()`：复制当前 system prompt、messages 和 tools，作为本次运行的起点。
- [`runAgentLoop()`](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent-loop.ts#L31)：加入本次 prompt，发出 `agent_start` 和首个 `turn_start`。
- `runLoop()`：内层循环处理工具调用和 steering，外层循环处理 follow-up。
- `streamAssistantResponse()`：Agent 消息进入模型 API 前的转换边界。
- `executeToolCalls()`：默认并行执行；全局配置为顺序执行，或批次中任一工具要求顺序执行时，整个批次改为顺序执行。
- `createToolResultMessage()`：把工具运行结果变成模型能理解的 `toolResult` 消息。

## `Agent` 与 loop 的分工

[`agent.ts`](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent.ts) 是有状态的外壳，负责：

- 保存会话和运行状态。
- 把输入规范化成 Agent 消息。
- 防止同一个 Agent 同时运行多个 prompt。
- 建立 Context 与配置快照。
- 根据 Event 更新公开状态并通知订阅者。

[`agent-loop.ts`](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent-loop.ts) 是循环核心，负责：

- 调用模型流。
- 识别 assistant 消息里的工具调用。
- 校验、执行和收集工具结果。
- 将工具结果写回上下文。
- 根据工具、队列、错误和停止 hook 决定是否继续。

## 三种“消息集合”

| 集合 | 用途 |
| --- | --- |
| `Agent._state.messages` | Agent 持有的完整会话记录。 |
| `AgentContext.messages` | 一次 loop 使用的上下文快照，并在循环中持续追加。 |
| `llmContext.messages` | 经 `transformContext()` 和 `convertToLlm()` 处理后，真正发送给模型的消息。 |

因此，压缩或过滤模型上下文不必直接删除完整会话记录。

`transformContext()` 先处理 Agent 消息，例如裁剪旧消息或注入外部上下文；`convertToLlm()` 再过滤或转换成模型协议支持的 `user`、`assistant`、`toolResult`。

## 工具结果为什么触发下一次模型调用

工具只返回 observation，不替模型生成最终回答。工具执行后，Runtime 把 `ToolResultMessage` 追加到上下文；内层循环因此再次调用模型。

第二次模型请求能同时看到：

```text
user message
assistant toolCall
toolResult
```

模型据此解释工具结果、决定继续调用工具，或生成最终文本。

## 循环停止条件

已从源码确认的主要出口：

1. assistant 没有工具调用，也没有 steering 或 follow-up 消息。
2. 模型返回 `error` 或 `aborted`。
3. `shouldStopAfterTurn()` 在完整 turn 结束后返回 `true`。
4. 一批工具结果全部带有 `terminate: true`，跳过自动的下一次模型调用。

额外的安全细节：如果模型因为输出长度限制而截断，Pi 不会执行其中任何工具调用，因为参数可能是不完整但仍能通过解析和校验的 JSON。

## Event 的作用

Event 不是附属日志，而是 Runtime 与 UI 的边界：

```text
agent_start
  → turn_start
  → message_start / message_update / message_end
  → tool_execution_start / update / end
  → turn_end
  → 下一轮 turn_start，或 agent_end
```

`Agent.processEvents()` 先用事件更新 `isStreaming`、`streamingMessage`、`messages`、`pendingToolCalls` 和 `errorMessage`，再通知订阅者。TUI 或其他调用方只需订阅事件，不需要进入 loop 内部。

## 实验

执行仓库自带的聚焦测试：

```bash
cd sources/pi-mono/packages/agent
node ../../node_modules/vitest/dist/cli.js --run test/agent-loop.test.ts \
  -t 'should handle tool calls and results'
```

结果：`1 passed | 20 skipped`。

fake model 第一次返回 `echo` 工具调用，工具执行后生成 `toolResult`，fake model 第二次返回最终文本。没有调用真实模型 API。

安装依赖时发现当前 Node.js `22.14.0` 低于项目要求的 `22.19.0`。聚焦测试通过，但完整构建或更广泛验证前需要先升级 Node.js。

## 30 秒复述

不看调用链，尝试回答：

1. `Agent` 和 `agent-loop.ts` 各负责什么？
2. 工具执行完成后，为什么 Runtime 通常不能直接结束？
3. 完整会话记录和真正发送给模型的消息为什么可能不同？
4. Event 为什么是 Runtime 的核心接口，而不只是日志？

## 下一步

亲手实现一个不连接真实模型的最小 Agent Runtime，并打印完整事件序列。
