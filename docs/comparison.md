# Agent Harness 横向对照

[返回首页](../README.md) · [学习路线](00-roadmap.md)

每完成一个阶段再填写对应列；空白表示尚未验证。

| 维度 | Pi Mono | OpenCode | Codex CLI | Claude Code |
| --- | --- | --- | --- | --- |
| Agent loop | `源码/实验` 内层处理工具与 Steering，外层处理 Follow-up；ToolResult 驱动下一次模型调用。 | `源码` Session coordinator 串行 drain；Tool settlement、steer、queue 与 step limit 驱动 continuation。 | `源码/限制` 本阶段只验证 shell 的 ToolOrchestrator：approval → Sandbox → attempt → denial-aware retry；未重读完整模型 continuation loop。 |  |
| Context 构建 | `源码/实验` `AgentMessage[] → transformContext() → convertToLlm() → Message[]`。 | `源码` Agent system + Context Epoch baseline + chronological Session history + Tool definitions；Compaction 生成 durable checkpoint。 | `未验证` 第三阶段从 shell tool call 切入，没有研究完整 Context 构建与 Compaction。 |  |
| Tool 系统 | `源码/实验` Schema 校验、before/after hook；默认并行，可按批次退化为顺序；失败也生成 ToolResult。 | `源码` Registry materialize 固定本轮 definition / settlement；leaf 完成 schema、Permission、宿主副作用、bounded output 与 durable result。 | `源码` Shell handler 规范化权限，ExecPolicy 生成 requirement，hook / reviewer 授权，ShellRuntime 经 SandboxManager spawn，并区分拒绝、普通失败与 denial。 |  |
| 状态与持久化 | `源码` `Agent` 在内存维护 State，Event 驱动运行态更新；本阶段未研究 Session backend。 | `源码` Prompt、message、tool、compaction 进入 durable Session events / projections；执行 owner、wake、pending permission 仍是进程内状态。 | `源码/限制` TurnEnvironment 保存 cwd、workspace roots 与 permission snapshot；approval cache key 绑定 environment / command / cwd / 权限，本阶段未研究 transcript 持久化。 |  |
| Sandbox / 权限 | `文档` 无内置权限隔离，默认继承宿主进程权限；需要容器或外部 Sandbox。 | `源码/限制` allow / deny / ask 在具体 Tool leaf 授权；Bash 仍继承宿主用户的文件、进程和网络权限，不是 OS Sandbox。 | `源码/文档/限制` canonical profile 经 Seatbelt、bubblewrap + seccomp 或 Windows token / ACL 强制执行；Approval 独立控制授权，deny-read、protected metadata 与 managed proxy 可进一步收紧，但存在平台差异。 |  |
| Memory | `未验证` 本阶段没有研究 `harness/session/memory`。 | `未验证` 已确认 Context Compaction，但没有把它等同于独立的长期 Memory 系统。 | `未验证` 不属于第三阶段 Sandbox 阅读范围。 |  |
| Multi-Agent | `未验证` 不属于本阶段的最小 Runtime 阅读范围。 | `未验证` 本阶段未把 legacy task / subagent 路径当成 V2 Multi-Agent 已完成能力。 | `未验证` 不属于第三阶段 Sandbox 阅读范围。 |  |
| 扩展机制 | `源码` 可注入 StreamFn、AgentTool、Context 转换和 tool hook；CustomAgentMessages 支持应用消息。 | `源码/限制` Config、Agent、application tools、Skills、References 可扩展；固定版本 V2 的 MCP / plugin 路径尚未完全统一。 | `源码/限制` named permission profiles、ExecPolicy rules、Permission hooks、managed requirements 可扩展控制面；本阶段没有盘点完整插件与 MCP 扩展。 |  |
| 最适合学习的设计 | `结论` 低层 loop 与有状态 Agent wrapper 分离，模型和 UI 都通过依赖注入或 Event 边界解耦。 | `结论` 把数据库可靠事实、可合并 wake / live event、宿主副作用和 Client projection 分成不同可靠性边界。 | `结论` 把模型意图、授权策略、canonical permissions、平台 policy compiler 与 OS enforcement 分层，并把真实 denial 纳入控制流。 |  |

所有填写内容都应带有 `源码`、`文档`、`实验`、`结论`、`限制` 或 `未验证` 标记。
