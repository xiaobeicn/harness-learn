# Agent Harness 横向对照

[返回首页](../README.md) · [学习路线](00-roadmap.md)

每完成一个阶段再填写对应列；空白表示尚未验证。

| 维度 | Pi Mono | OpenCode | Codex CLI | Claude Code |
| --- | --- | --- | --- | --- |
| Agent loop | `源码/实验` 内层处理工具与 Steering，外层处理 Follow-up；ToolResult 驱动下一次模型调用。 | `源码` Session coordinator 串行 drain；Tool settlement、steer、queue 与 step limit 驱动 continuation。 |  |  |
| Context 构建 | `源码/实验` `AgentMessage[] → transformContext() → convertToLlm() → Message[]`。 | `源码` Agent system + Context Epoch baseline + chronological Session history + Tool definitions；Compaction 生成 durable checkpoint。 |  |  |
| Tool 系统 | `源码/实验` Schema 校验、before/after hook；默认并行，可按批次退化为顺序；失败也生成 ToolResult。 | `源码` Registry materialize 固定本轮 definition / settlement；leaf 完成 schema、Permission、宿主副作用、bounded output 与 durable result。 |  |  |
| 状态与持久化 | `源码` `Agent` 在内存维护 State，Event 驱动运行态更新；本阶段未研究 Session backend。 | `源码` Prompt、message、tool、compaction 进入 durable Session events / projections；执行 owner、wake、pending permission 仍是进程内状态。 |  |  |
| Sandbox / 权限 | `文档` 无内置权限隔离，默认继承宿主进程权限；需要容器或外部 Sandbox。 | `源码/限制` allow / deny / ask 在具体 Tool leaf 授权；Bash 仍继承宿主用户的文件、进程和网络权限，不是 OS Sandbox。 |  |  |
| Memory | `未验证` 本阶段没有研究 `harness/session/memory`。 | `未验证` 已确认 Context Compaction，但没有把它等同于独立的长期 Memory 系统。 |  |  |
| Multi-Agent | `未验证` 不属于本阶段的最小 Runtime 阅读范围。 | `未验证` 本阶段未把 legacy task / subagent 路径当成 V2 Multi-Agent 已完成能力。 |  |  |
| 扩展机制 | `源码` 可注入 StreamFn、AgentTool、Context 转换和 tool hook；CustomAgentMessages 支持应用消息。 | `源码/限制` Config、Agent、application tools、Skills、References 可扩展；固定版本 V2 的 MCP / plugin 路径尚未完全统一。 |  |  |
| 最适合学习的设计 | `结论` 低层 loop 与有状态 Agent wrapper 分离，模型和 UI 都通过依赖注入或 Event 边界解耦。 | `结论` 把数据库可靠事实、可合并 wake / live event、宿主副作用和 Client projection 分成不同可靠性边界。 |  |  |

所有填写内容都应带有 `源码`、`文档`、`实验` 或 `推测` 标记。
