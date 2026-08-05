# Agent Harness 横向对照

[返回首页](../README.md) · [学习路线](00-roadmap.md)

每完成一个阶段再填写对应列；空白表示尚未验证。

| 维度 | Pi Mono | OpenCode | Codex CLI | Claude Code |
| --- | --- | --- | --- | --- |
| Agent loop | `源码/实验` 内层处理工具与 Steering，外层处理 Follow-up；ToolResult 驱动下一次模型调用。 |  |  |  |
| Context 构建 | `源码/实验` `AgentMessage[] → transformContext() → convertToLlm() → Message[]`。 |  |  |  |
| Tool 系统 | `源码/实验` Schema 校验、before/after hook；默认并行，可按批次退化为顺序；失败也生成 ToolResult。 |  |  |  |
| 状态与持久化 | `源码` `Agent` 在内存维护 State，Event 驱动运行态更新；本阶段未研究 Session backend。 |  |  |  |
| Sandbox / 权限 | `文档` 无内置权限隔离，默认继承宿主进程权限；需要容器或外部 Sandbox。 |  |  |  |
| Memory | `未验证` 本阶段没有研究 `harness/session/memory`。 |  |  |  |
| Multi-Agent | `未验证` 不属于本阶段的最小 Runtime 阅读范围。 |  |  |  |
| 扩展机制 | `源码` 可注入 StreamFn、AgentTool、Context 转换和 tool hook；CustomAgentMessages 支持应用消息。 |  |  |  |
| 最适合学习的设计 | `结论` 低层 loop 与有状态 Agent wrapper 分离，模型和 UI 都通过依赖注入或 Event 边界解耦。 |  |  |  |

所有填写内容都应带有 `源码`、`文档`、`实验` 或 `推测` 标记。
