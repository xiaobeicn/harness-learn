# 第一阶段：Pi Mono — 最小 Agent Runtime

[返回首页](../../README.md) · [学习路线](../00-roadmap.md) · [横向对照](../comparison.md)

## 阶段目标

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
| 第 3 课：实现最小 Agent Runtime | 待开始 | 不使用真实模型，能否亲手还原这个循环？ |

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
