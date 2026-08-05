# 第二阶段：OpenCode — 完整 Coding Agent

[返回首页](../../README.md) · [学习路线](../00-roadmap.md) · [横向对照](../comparison.md)

阶段状态：**课程内容已完成；个人掌握清单保留未勾选**

## 阶段目标

以下勾选表示学习者能够独立完成，不等同于对应文档已经写完。

- [ ] 识别 Runtime 与 CLI/TUI、Server、Session、配置、权限等产品层的边界。
- [ ] 追踪一次“读文件 → 修改文件 → 执行验证”的完整任务。
- [ ] 理解 Prompt admission、会话持久化、中断、恢复和错误传播。
- [ ] 理解模型供应商、工具系统、权限和项目级指令如何接入。
- [ ] 解释本地 TUI 为什么仍然使用 Client/Server 边界。
- [ ] 总结 OpenCode 相比 Pi Mono 新增的关键系统。

## 课程

| 课程 | 状态 | 核心问题 |
| --- | --- | --- |
| [第 1 课：从 Runtime 到完整产品边界](01-runtime-to-product-boundaries.md) | 已完成 | 一个 Runtime 怎样成为 CLI、TUI、Server 和桌面产品？ |
| [第 2 课：Prompt Admission 与 Durable Session](02-prompt-admission-durable-session.md) | 已完成 | 用户输入为何先持久化，再调度模型执行？ |
| [第 3 课：Tool、Permission 与执行闭环](03-tool-permission-execution-loop.md) | 已完成 | 模型的 tool call 如何变成受策略约束且可追踪的宿主副作用？ |
| [第 4 课：System Context 与项目级指令](04-system-context-project-instructions.md) | 已完成 | 配置、Agent 和项目环境如何进入每一次 provider request？ |
| [第 5 课：Model Provider 与 Context Compaction](05-model-provider-context-compaction.md) | 已完成 | 模型怎样被解析和调用，Context 超限后如何继续？ |
| [第 6 课：Event Stream 与客户端状态同步](06-event-stream-client-state.md) | 已完成 | durable events 怎样成为 TUI 可见的实时状态？ |
| [第 7 课：完整 Coding Task 端到端追踪与阶段复盘](07-coding-task-end-to-end-review.md) | 已完成 | 一次任务怎样贯穿 prompt、模型、工具、权限、验证、历史与 UI？ |

## 固定源码版本

| 项目 | 值 |
| --- | --- |
| 官方仓库 | `https://github.com/anomalyco/opencode.git` |
| 固定源码 | [GitHub commit `2f17fc9`](https://github.com/anomalyco/opencode/tree/2f17fc9613771af3de3b5a2715b836037d80c4b1) |
| 本地目录 | `sources/opencode` |
| Commit | `2f17fc9613771af3de3b5a2715b836037d80c4b1` |
| Commit 时间 | `2026-08-05T12:49:28+08:00` |
| `opencode` package | `1.18.13` |
| Package manager | Bun `1.3.14` |
| 默认分支 | `dev` |

固定 commit 是为了让目录、依赖关系和调用链可以复现。OpenCode 迭代很快，升级源码版本后必须重新验证课程结论。

## 本阶段阅读策略

OpenCode 同时包含多个产品 surface、Client/Server、V2 Session Core 和迁移兼容路径。本阶段按用户请求链阅读，不按 package 数量横向扫仓库：

```text
CLI / TUI
  → Client / SDK
  → Server / Protocol
  → Durable Session
  → Model turn
  → Permission / Tool
  → Event projection
  → UI
```

每次只确认当前链条必需的文件。看到 `legacy`、V1 或 V2 路径时明确记录，不把迁移期的两套实现混成一个架构。

## 学习记录

### 记录 01：产品与传输边界（2026-08-05）

- `源码`：CLI 主包通过 yargs 组合 TUI、run、serve、session、agent、MCP、插件等产品命令。
- `源码`：默认 TUI 启动 worker，worker 内承载 Server，并通过内部 fetch/RPC 与 UI 通信。
- `源码`：`opencode run` 可以使用本地 in-process server，也可以 `--attach` 到远端 server。
- `源码`：`opencode serve` 提供无头 HTTP Server，UI 不是执行内核的唯一入口。
- `结论`：OpenCode 把 Coding Agent 作为可被多个客户端访问的应用服务，而不只是包在 TUI 里的 Agent loop。
- `下一步`：从客户端 prompt API 追踪到 V2 durable session admission 和 execution wake。

### 记录 02：Prompt Admission 与 Session 执行（2026-08-05）

- `源码`：V2 prompt API 先发布 `PromptAdmitted` 并投影 `session_input`，再发送 advisory execution wake。
- `源码`：API 成功返回 `SessionInput.Admitted`，不等待模型开始或回答完成。
- `源码`：pending input 通过 `admitted_seq` 与 nullable `promoted_seq` 区分“可靠接纳”和“模型可见”。
- `源码`：`steer` 在 provider-turn 安全边界成批推进；`queue` 在 Session 本来要空闲时逐条推进。
- `源码`：同一 Session 的 drain 串行且 wake 可合并，不同 Session 可以并发。
- `限制`：当前执行所有权仍是进程本地；durable admission 不代表 provider continuation 已具备崩溃自动恢复。
- `下一步`：追踪 Tool Registry、Permission、工具副作用和 durable tool result。

### 记录 03：Tool、Permission 与执行闭环（2026-08-05）

- `源码`：Runner 在启动本地工具副作用前先持久化 `Tool.Called`，结算后再持久化 `Tool.Success` 或 `Tool.Failed`。
- `源码`：Tool Registry 为一次 provider turn materialize definitions 与 settlement closure，并拒绝被替换或移除的 stale registration。
- `源码`：Registry 的 definition filtering 只控制 catalog visibility；具体 built-in leaf 在副作用前通过 `PermissionV2.assert()` 做资源级授权。
- `源码`：`PermissionV2` 支持 `allow`、`deny`、`ask`，用户可回复 `once`、`always` 或 `reject`；只有 saved allow rules 持久化到 SQL。
- `源码`：同一 provider turn 中已记录的多个 local tools 可以并发，Runner 等全部结算后重新读取历史并开始 continuation。
- `源码`：ToolOutputStore 对模型可见的大文本统一截断，并把完整内容放入 managed storage。
- `限制`：Permission 不是 OS Sandbox；工具副作用在 durable call 与 settlement 之间仍没有通用 exactly-once crash recovery。
- `未验证`：本地未安装 OpenCode workspace dependencies，本课未运行上游 Bun tests。
- `下一步`：追踪 System Context、Agent 配置和项目级指令如何构造 provider request。

### 记录 04：System Context 与项目级指令（2026-08-05）

- `源码`：Runner 将当前 Agent system 与 Session Context Epoch baseline 作为两个有序 system parts。
- `源码`：System Context Source 使用 namespaced key、codec、baseline、update、removed 和结构化 snapshot 表达可刷新上下文。
- `源码`：V2 当前组合环境、日期、全局及 upward `AGENTS.md`、Skill Guidance 和 Reference Guidance。
- `源码`：第一次执行保存 baseline、snapshot 与 `baseline_seq`；后续变化成为 durable `ContextUpdated` system message。
- `源码`：临时不可观察使用 `unavailable`，已有 Session 保留旧 Context；第一次 initialization 会阻止 provider request。
- `源码`：Skills 在 system 中只暴露名称和描述，完整内容通过受权限控制的 `skill` tool 按需加载。
- `限制`：`Config.Info.instructions` paths / URLs 与 MCP instructions 尚未进入本课追踪的 V2 Context Epoch active path。
- `未验证`：本地未安装 OpenCode workspace dependencies，本课未运行上游 Bun tests。
- `下一步`：追踪 Model Provider resolution、协议适配与 Context Compaction。

### 记录 05：Model Provider 与 Context Compaction（2026-08-05）

- `源码`：V2 Runner 按 Session model、Catalog default、首个受支持 available model 的顺序解析模型；显式模型不可用时不静默 fallback。
- `源码`：Catalog 合并 Provider / Model 配置、availability、Integration credential 和 variant，再映射到 `@opencode-ai/llm` Route。
- `源码`：固定版本 V2 Runner 只接入 OpenAI Responses、Anthropic Messages 与带 URL 的 OpenAI-compatible Chat 三类 Route。
- `源码`：HTTP executor 对 retryable status 做最多两次短重试；Session Runner 没有通用 provider-turn retry，Context overflow 是独立的一次恢复分支。
- `源码`：主动压缩按完整 request 估算阈值，将较旧历史总结为 anchored summary，并保留最近约 8,000 tokens 的序列化原文。
- `源码`：成功摘要成为 durable Compaction checkpoint；Runner 从该 sequence 选历史，Context Epoch 同时尝试建立新 baseline generation。
- `限制`：Agent model / request、manual compact 与 `compaction.prune` 尚未接入本课追踪的 V2 active path。
- `未验证`：本地未安装 OpenCode workspace dependencies，本课未运行上游 Bun tests。
- `下一步`：追踪 durable Session events 如何通过 Server / SDK 同步为客户端实时状态。

### 记录 06：Event Stream 与客户端状态同步（2026-08-05）

- `源码`：V2 Session `history` 提供有限分页，`event` 使用显式 `after` sequence 先补历史再持续 tail。
- `源码`：durable stream 先订阅 aggregate wake，再查询数据库；wake 只负责提示，数据库 sequence 才是可靠事实来源。
- `源码`：`/api/event` 与 `/global/event` 是无 Session cursor 的 live streams，不能描述为 durable replay。
- `源码`：V2 bridge 同时发普通实时 event 和带 sequence 的 `sync` envelope；普通 TUI 会过滤 `sync`。
- `源码`：本地 TUI 通过 Worker RPC 传 fetch / events，远程 TUI 通过 `/global/event` SSE，并在 16ms 内批量归约事件。
- `源码`：现有 TUI 同时挂载 Sync / Data 两个 Stores；主要 UI 仍使用 REST snapshot + global delta 的 Sync path。
- `源码`：Session hydration 用 touched message / part 集合保护 live delta，并把可见消息限制为最近 100 条。
- `限制`：全局流重连没有 replay cursor，也不会主动完整 rehydrate；断线窗口中的 live event 可能丢失。
- `限制`：V2 permission / question 和执行状态尚未与主要 TUI 状态系统完整统一。
- `未验证`：本地未安装 OpenCode workspace dependencies，本课未运行上游 Bun tests。
- `下一步`：用一次完整 Coding Task 串联第二阶段的 Server、Session、模型、工具、权限、事件与 UI 边界。

### 记录 07：完整 Coding Task 与阶段复盘（2026-08-05）

- `源码`：一次 read → edit → bash 任务由多个 provider turns 组成，每个 durable tool result 都成为下一轮的新 observation。
- `源码`：Prompt、Tool 与 Step lifecycle 可按 Session sequence 回放；text / reasoning / tool-input delta 只用于 live streaming，Ended 保存完整值。
- `源码`：Edit 在 approval 后重新读取文件并通过 `writeIfUnchanged` 防止 stale overwrite；Bash 返回 exit、output、timeout 和 truncation 状态。
- `结论`：验证不是 Runtime 的特殊完成状态，而是模型必须正确解释的一次 Tool observation。
- `结论`：完整任务必须同时观察 durable Session facts、进程 operational state、宿主副作用和 Client projection。
- `结论`：OpenCode 在 Pi Mono loop 外增加了 Client / Server、durable Session、Provider / Context、Permission / Coding Tools 和 UI projection。
- `限制`：Permission 不是 OS Sandbox，外部副作用没有通用 exactly-once，进程崩溃后也没有自动 continuation recovery。
- `限制`：V2 TUI 状态迁移、长期 Memory 与 Multi-Agent 不属于本阶段已验证完成能力。
- `未验证`：本地未安装 OpenCode workspace dependencies，本课未运行真实 Coding Task 或上游 Bun tests。
- `下一步`：为第二阶段文档建立并推送 Git checkpoint，然后进入 Codex CLI，研究生产级 Sandbox 与审批边界。
