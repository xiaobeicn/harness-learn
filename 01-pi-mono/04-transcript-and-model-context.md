# 第 4 课：Transcript 与 Model Context

[上一课](03-build-minimal-agent-runtime.md) · [返回本阶段目录](README.md) · [运行代码](../examples/01-pi-mono/04-context-boundary/index.mjs)

## 核心问题

为什么 Agent 保存的完整会话记录，不一定等于这一次真正发送给模型的消息？

## 四层数据

一次模型请求至少要区分四层：

```text
完整 transcript
  → transformContext(AgentMessage[])
  → convertToLlm(Message[])
  → model context
```

| 层 | 作用 |
| --- | --- |
| Transcript | 保存会话事实，供恢复、审计、分叉和 UI 展示。 |
| Transformed context | 针对本次请求裁剪、压缩或注入 Agent 级消息。 |
| LLM messages | 过滤 UI 消息，并转换成模型协议支持的角色和内容。 |
| Model context | system prompt、LLM messages、工具定义等最终请求数据。 |

核心不变量是：**构造 Model Context 不应该顺手改写完整 transcript。**

## 运行实验

代码位于 [`examples/01-pi-mono/04-context-boundary/index.mjs`](../examples/01-pi-mono/04-context-boundary/index.mjs)。

```bash
node examples/01-pi-mono/04-context-boundary/index.mjs
```

实际输出：

```text
pipeline: transformContext -> convertToLlm -> model
transcript roles: user -> assistant -> notification -> user
after transformContext: notification -> user
model context roles: user
transcript unchanged: true
model answer: Received 1 message: Current question
```

## 第一步：完整 transcript

实验从四条消息开始：

```text
user("Old question")
assistant("Old answer")
notification("UI-only: indexing finished")
user("Current question")
```

`notification` 是应用层消息。TUI 或调用方可能需要展示它，但模型协议不认识这个角色。

如果 Runtime 只允许模型原生消息进入 transcript，应用就只能把 UI 状态硬塞进 prompt，或者另建一套无法统一回放的历史记录。

## 第二步：`transformContext()`

教学示例使用最简单的裁剪：

```javascript
return messages.slice(-2);
```

结果为：

```text
notification → user
```

这个函数仍然工作在 AgentMessage 层，所以它可以看见应用自定义消息。真实实现可以在这里：

- 按 token 预算裁剪历史。
- 把旧对话压缩成摘要。
- 注入当前项目或外部资源。
- 保留 UI 或 Harness 使用的自定义消息。

`slice(-2)` 只是演示边界，不是生产级 Context 策略。

## 第三步：`convertToLlm()`

转换函数只保留模型协议支持的角色：

```text
user | assistant | toolResult
```

因此 `notification` 被过滤，最终只剩当前 `user` 消息。

两步转换不应该混为一谈：

- `transformContext()` 决定本次请求需要哪些 Agent 级信息。
- `convertToLlm()` 保证这些信息符合模型协议。

## 为什么 transcript 没有变化

示例向转换流水线传入 transcript 的结构化副本，并在结束后比较原始 JSON。输出 `transcript unchanged: true`。

Pi Mono 的 `streamAssistantResponse()` 也把转换结果保存在局部变量中：先读取 `context.messages`，再依次调用 `transformContext()` 和 `convertToLlm()`，而不是把转换结果直接覆盖回会话记录。

这使得“模型暂时看不到某条消息”和“系统永久删除了某条消息”成为两个不同操作。

## Context 裁剪的协议风险

生产实现不能任意 `slice()`：

1. assistant 的 `toolCall` 与对应 `toolResult` 不能被裁成不完整的协议片段。
2. 被保留的开头和结尾必须满足模型供应商的角色约束。
3. 摘要必须明确它是派生 Context，不能伪装成原始消息。
4. 转换失败不能静默返回捏造内容；Pi 的 hook 合约要求调用方返回原消息或其他安全结果，而不是抛出未处理异常。

这也是 Context 管理比“删除最旧的几条消息”更难的原因。

## 与 Pi Mono 的对应关系

| 教学示例 | Pi Mono |
| --- | --- |
| `transcript` | `Agent._state.messages` |
| `requestModel()` | `streamAssistantResponse()` 中的请求边界 |
| `transformContext()` | `AgentLoopConfig.transformContext` |
| `convertToLlm()` | `AgentLoopConfig.convertToLlm` |
| `fakeModel()` | 注入的 `StreamFn` / 模型供应商适配层 |
| `notification` | 通过 `CustomAgentMessages` 扩展的应用消息 |

## 30 秒复述

1. Transcript 和 Model Context 的职责分别是什么？
2. 为什么 `notification` 可以保存在 transcript，却不能直接发送给模型？
3. `transformContext()` 和 `convertToLlm()` 为什么要分成两步？
4. 随意裁掉一条 `toolResult` 可能破坏什么？

## 下一步

[下一课](05-event-driven-agent-state.md)实现由 Event 驱动的 Agent State，观察低层 loop 如何在不了解 UI 的情况下驱动有状态外壳。
