# 第一阶段：Pi Mono — 最小 Agent Runtime

[返回首页](../../README.md) · [学习路线](../00-roadmap.md) · [横向对照](../comparison.md)

阶段状态：**课程内容已完成；个人掌握清单保留未勾选**

## 阶段目标

以下勾选表示学习者能够独立完成，不等同于对应文档已经写完。

- [ ] 能用自己的话解释 Agent Runtime 和普通聊天调用的区别。
- [ ] 能从一次用户输入追踪到一次或多次模型调用。
- [ ] 找到消息、模型、工具、状态和事件的核心类型。
- [ ] 看懂工具调用结果如何回到上下文并触发下一轮。
- [ ] 能运行并修改一个最小 Agent 示例。
- [ ] 画出 Pi Mono 的最小运行时流程图。

## 课程

| 课程 | 状态 | 核心问题 |
| --- | --- | --- |
| [第 1 课：Agent Runtime 心智模型](01-agent-runtime-mental-model.md) | 已完成 | Runtime 比普通模型调用多了什么？ |
| [第 2 课：从 `prompt()` 追踪工具循环](02-prompt-tool-loop.md) | 已完成 | 一次工具调用如何触发下一轮模型调用？ |
| [第 3 课：实现最小 Agent Runtime](03-build-minimal-agent-runtime.md) | 已完成 | 不使用真实模型，能否亲手还原这个循环？ |
| [第 4 课：Transcript 与 Model Context](04-transcript-and-model-context.md) | 已完成 | 完整记录为什么不一定全部发送给模型？ |
| [第 5 课：Event 驱动 Agent State](05-event-driven-agent-state.md) | 已完成 | loop 如何与 UI 和有状态外壳解耦？ |
| [第 6 课：Abort、Steering 与 Follow-up](06-abort-steering-follow-up.md) | 已完成 | 运行中的 Agent 如何接受控制和排队消息？ |
| [第 7 课：第一阶段复盘](07-phase-review.md) | 已完成 | 能否独立画出并解释最小 Agent Runtime？ |

## 固定源码版本

| 项目 | 值 |
| --- | --- |
| 官方仓库 | `https://github.com/badlogic/pi-mono.git` |
| 固定源码 | [GitHub commit `588915e`](https://github.com/badlogic/pi-mono/tree/588915ec71714688cee8b7153339e8bdebb3e82e) |
| 本地目录 | `sources/pi-mono` |
| Commit | `588915ec71714688cee8b7153339e8bdebb3e82e` |
| Commit 时间 | `2026-08-04T23:31:23+02:00` |
| `pi-agent-core` 版本 | `0.83.0` |
| 源码要求 | Node.js `>=22.19.0` |
| 当前环境 | Node.js `22.14.0`，低于源码要求 |

固定 commit 是为了让文件路径和结论可以复现。更新源码版本时，需要重新检查课程中的调用链和行级行为。

## 仓库边界

| Package | 职责 | 本阶段是否深入 |
| --- | --- | --- |
| `pi-ai` | 统一不同模型供应商的模型与流式调用接口。 | 只把它当作模型边界。 |
| `pi-agent-core` | Agent loop、状态、工具执行和事件流。 | 是，本阶段核心。 |
| `pi-coding-agent` | 加入文件工具、Shell、会话和交互界面的 Coding Agent。 | 暂不深入。 |
| `pi-tui` | 终端 UI 渲染。 | 否。 |

## 推荐阅读顺序

以下路径已经按固定版本源码确认：

1. [项目根 README](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/README.md)：确认 monorepo 的 package 边界。
2. [Agent Core README](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/README.md)：阅读最小示例、消息流和事件流。
3. [types.ts](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/types.ts)：只看 `AgentState`、`AgentContext`、`AgentTool` 和 `AgentEvent`。
4. [agent.ts](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent.ts)：从 `Agent.prompt()` 读到 `runAgentLoop()`。
5. [agent-loop.ts](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/src/agent-loop.ts)：读模型调用、工具执行、结果回填和停止条件。
6. [agent-loop.test.ts](https://github.com/badlogic/pi-mono/blob/588915ec71714688cee8b7153339e8bdebb3e82e/packages/agent/test/agent-loop.test.ts)：用 fake stream 验证真实事件和循环次数。

`packages/agent/src/harness/`、Context 压缩、Session 和 Coding Agent 暂不展开；它们不是理解最小循环的前置知识。

## 学习记录

### 记录 01：路线初始化（2026-08-05）

- `结论`：四个项目按“最小运行时 → 完整产品 → 生产安全 → 高级编排”排列。
- `结论`：所有阶段统一使用 Loop、Context、Tools、State、Safety、Extension 六个维度分析。
- `下一步`：取得 Pi Mono 源码，确认版本，然后完成一次自顶向下的仓库导览。

### 记录 02：最小 Runtime 调用链（2026-08-05）

- `源码`：确认 `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui` 的职责边界。
- `源码`：确认 `Agent` 是状态与生命周期外壳，`agent-loop.ts` 是循环核心。
- `源码`：确认消息在模型边界依次经过 `transformContext()` 和 `convertToLlm()`。
- `源码`：确认工具调用经过查找、参数处理与校验、前置 hook、执行、后置 hook，再生成 `ToolResultMessage`。
- `实验`：fake stream 工具循环聚焦测试通过，验证一次工具执行会触发第二次模型调用。
- `限制`：当前 Node.js 版本低于源码声明的最低版本；尚未运行完整构建。
- `下一步`：亲手实现一个不连接真实模型的最小 Agent Runtime，观察完整事件序列。

### 记录 03：实现最小 Runtime（2026-08-05）

- `实验`：使用零依赖 JavaScript 实现 messages、model boundary、tool registry、agent loop 和 events。
- `实验`：fake model 完成两次调用，中间执行一次 `echo` 工具。
- `实验`：最终消息顺序为 `user → assistant → toolResult → assistant`。
- `限制`：示例刻意省略流式响应、并行工具、Context 转换、队列、取消和持久化。
- `下一步`：修改工具参数触发校验错误，观察错误 `toolResult` 如何返回模型。

### 记录 04：工具参数校验失败（2026-08-05）

- `实验`：使用 `--invalid-args` 让 fake model 为 `echo` 生成错误类型的参数。
- `实验`：参数校验失败后，`echo.execute()` 执行次数为 `0`。
- `实验`：Runtime 生成 `isError: true` 的 `toolResult`，第二次模型调用仍然发生。
- `结论`：工具失败是模型可观察并可恢复的结果，不等于 Agent loop 自身失败。
- `下一步`：将完整 transcript 与实际发送给模型的 Context 分开。

### 记录 05：Context 请求视图（2026-08-05）

- `实验`：transcript 包含历史消息、UI 专用 `notification` 和当前用户输入。
- `实验`：`transformContext()` 裁剪历史，`convertToLlm()` 再过滤模型不支持的消息。
- `实验`：模型只收到当前 `user` 消息，原始 transcript 保持不变。
- `结论`：Model Context 是会话状态针对一次模型请求的投影，不等于完整 transcript。
- `下一步`：实现由 Event 驱动的 Agent State，分离低层 loop 与有状态外壳。

### 记录 06：Event 驱动 State（2026-08-05）

- `实验`：低层 loop 只发出 Event，不直接维护公开 UI State。
- `实验`：`Agent.processEvent()` 先更新 messages、streamingMessage 和 pendingToolCalls，再调用订阅者。
- `实验`：异步 `agent_end` 订阅者完成前 `isStreaming` 保持 `true`，`prompt()` 不会提前 resolve。
- `结论`：Event 是 loop 与外部系统的时间序列协议，State 是对事件和生命周期的当前归约结果。
- `限制`：这不是完整 Event Sourcing；模型、工具和 system prompt 等配置并非全部由事件重建。
- `下一步`：学习 Abort、Steering 与 Follow-up 如何控制正在运行或即将结束的 loop。

### 记录 07：运行控制（2026-08-05）

- `实验`：在工具运行中加入 Steering，确认当前工具先完成，纠偏消息再进入下一 turn。
- `实验`：预先排入 Follow-up，确认它只在首轮本可自然结束后被注入。
- `实验`：通过 AbortSignal 中断慢模型，最终 assistant 消息为 `stopReason=aborted`。
- `结论`：Steering、Follow-up 和 Abort 的注入时机、是否等待当前 turn、是否继续调用模型都不同。
- `限制`：Abort 是协作式中断，不会自动回滚已经完成的文件或进程副作用。
- `下一步`：完成第一阶段复盘，独立画出最小 Runtime 流程图并填写横向对照表的 Pi Mono 列。

### 记录 08：第一阶段课程复盘（2026-08-05）

- `结论`：最小 Runtime 可以拆成有状态外壳、Context 请求视图、模型边界、Tool loop、Event 协议和运行控制。
- `文档`：完成端到端流程图和常见误区整理。
- `文档`：横向对照表已填写有源码、官方文档或实验依据的 Pi Mono 项目。
- `文档`：已加入可折叠的公开参考答案，便于学习者自行复盘。
- `说明`：学习者选择继续下一阶段；个人掌握项不由课程完成状态代为勾选。
