# 第六阶段：DeepSeek Harness — Everything-as-a-Plugin 与可组合 Harness

[返回首页](../README.md) · [学习路线](../00-roadmap.md) · [横向对照](../comparison.md)

阶段状态：**教材已完成（10 / 10 课）；个人掌握清单待学习者验证**

本阶段研究 DeepSeek Harness 怎样把模型适配器、Agent loop、工具、Session、持久化、安全策略、Subagent 与 UI 都做成可组合、可卸载的 Cordis 插件：

```text
Profile + Bundle + Patch
  → Cordis Context / Service / Fiber / Effect
  → scoped Prompt / Tools / Skills
  → durable Session event log + Surface projection
  → Approval + Sandbox + long-running capabilities
```

DeepSeek Harness 不是在已有 Runtime 外只增加一个产品壳，而是把 Harness 自身拆成 capability seams。插件依赖决定加载顺序，reversible effects 决定卸载行为，Session log 保存模型真正见过的内容，Profile 决定部署组合。

## 阶段目标

以下勾选表示学习者能够独立完成，不等同于对应文档已经写完。

- [ ] 画出 Boot → Profile → Bundle / Patch → Cordis Fiber → Service 的组合路径。
- [ ] 解释 `inject`、typed event、Service 与 reversible effect 怎样支持热插拔。
- [ ] 区分 durable Inbox 的 `next-turn` 与 `next-step`，并追踪 Turn / Step 生命周期。
- [ ] 说明 System Prompt、Runtime Context snapshot、request header 与 raw stream 各保存什么。
- [ ] 复述 Tool policy waterfall、Approval、monotonic guard、ordered parallel commit 的顺序。
- [ ] 区分 append-only Session log、Surface projection、write-behind persistence 与 fork lineage。
- [ ] 解释 Tool-result pruning、model summary compaction 与 overflow retry 的推进条件。
- [ ] 区分文件路径 containment、Shell OS runner、Approval 和 SandboxMode。
- [ ] 说明 continuable Subagent 的 durable Session、process-local Activation 与 Inbox FIFO。
- [ ] 为 Cordis plugin、Skill、MCP、Hook 与动态 Cordis package 选择正确扩展边界。

## 课程

| 课程 | 统一维度 | 核心问题 |
| --- | --- | --- |
| [第 1 课：来源边界、Cordis 与总体架构](01-source-boundary-cordis-architecture.md) | 全局 | 为什么说 DeepSeek Harness 的架构单位是 capability seam，而不只是 Agent class？ |
| [第 2 课：Profile、Bundle、Patch 与插件生命周期](02-profile-bundle-patch-plugin-lifecycle.md) | State / Extension | 部署组合怎样分层，插件贡献怎样随 Fiber 卸载而回滚？ |
| [第 3 课：Inbox、Turn、Step 与 Agent Loop](03-inbox-turn-step-agent-loop.md) | Loop / State | 输入在哪个边界接纳，何时进入下一 Step 或下一 Turn？ |
| [第 4 课：System Prompt、Runtime Context 与 LLM Streaming](04-system-prompt-runtime-context-llm-streaming.md) | Context | 模型可见内容怎样组装、快照、流式记录并稳定重放？ |
| [第 5 课：Tool Registry、策略流水线与有序并发](05-tool-registry-policy-ordered-concurrency.md) | Tools / Safety | 工具怎样校验、授权、并行执行并按模型顺序提交？ |
| [第 6 课：Session Event Log、Surface、Persistence 与 Fork](06-session-log-surface-persistence-fork.md) | State / Context | 审计历史与模型活动历史怎样分离，崩溃后怎样恢复？ |
| [第 7 课：Compaction、Tool-result Pruning 与 Overflow](07-compaction-pruning-context-overflow.md) | Context / State | 怎样缩短活动 Context 又不破坏工具配对与审计历史？ |
| [第 8 课：Approval、Filesystem、Shell 与跨平台 Sandbox](08-approval-filesystem-shell-sandbox.md) | Safety | 应用授权、路径约束和 OS enforcement 分别解决什么问题？ |
| [第 9 课：Subagent、Jobs、Goal、Schedule 与 Workflow](09-subagent-jobs-goal-schedule-workflow.md) | Multi-Agent / State | 长任务能力怎样挂接核心 Loop，同时保持 durable ownership？ |
| [第 10 课：Skills、MCP、Hooks、动态 Cordis 与六项目复盘](10-skills-mcp-hooks-dynamic-cordis-review.md) | Extension / 全局 | 多种扩展面如何按能力、生命周期和信任等级选择？ |

## 固定证据版本

| 项目 | 值 |
| --- | --- |
| 官方仓库 | [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) |
| 固定源码 | [GitHub commit `47f9438`](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a) |
| 本地目录 | `sources/deepseek-harness`（由根 `.gitignore` 忽略） |
| Commit | `47f943859bef60e4160492346772ded9b24f765a` |
| Commit 时间 | `2026-08-13T19:38:46+08:00` |
| 根版本 | `0.1.0-rc.5` |
| Node / pnpm | Node `^22.19.0` 或 `>=24.0.0`；pnpm `11.7.0` |
| 源码规模 | `packages/*/*/src` 约 1324 个 TS / TSX；仓库约 2578 个 TS / TSX，浅克隆约 80 MB |
| 许可证 | MIT |

固定 commit 是为了让插件清单、事件 schema、默认 Bundle 和平台策略可复现。官方将项目标为 developer preview，并明确可能发生 breaking changes；升级源码后必须重新核对 Session format、Profile 组合、工具与扩展契约。

## 证据边界

- `源码`：官方 MIT 仓库固定 commit 中的实现与测试。
- `文档`：同一 commit 的 `docs/` 与 package README。
- `实验`：本阶段提交的独立、无外部依赖最小语义模型。
- `未验证`：本地没有安装上游 workspace 依赖、配置 Provider、启动 Web UI 或连接真实 MCP server，因此没有运行真实 DeepSeek Harness 与上游测试。
- `限制`：课程示例验证设计不变量，不保证与预发布 API 二进制兼容；当前 Session format version 为 `0`，不支持的格式会被拒绝。

## 十课形成的一条主线

```text
Profile 选择 deployment composition
  → Bundle / Patch 装载 Cordis fibers
  → Prompt 进入 durable Inbox
  → Turn claim 与 Step request
  → Prompt / Runtime Context / Tool schemas 组装
  → LLM chunks 与 request snapshot 追加到 Session
  → Tool policy / Approval / Sandbox / execution
  → ToolResult 形成下一 Step
  → Surface projection / Compaction / Persistence
  → Subagent、Goal、Schedule 或 Extension 继续改变能力
```

## 学习记录

### 记录 01–03：组合、生命周期与 Loop

- `源码/文档`：Cordis Context 提供 Service、typed events、Fiber 与 reversible effects；Agent loop 本身也是插件。
- `源码`：插件加载顺序由 `inject` 依赖决定，不由 YAML 行顺序决定。
- `源码`：Profile 叠加多个 Bundle、profile patch、home patch 与命令行 overlay；同 id patch 替换整段 config。
- `源码`：Inbox mutation 进入 Session log；`next-step` 可影响当前 Turn，`next-turn` 等当前 Turn 结束。
- `源码`：一个 Turn 包含零到多个 Step，一个 Step 是一次模型请求加其工具批次。

### 记录 04–07：模型可见事实、工具与 Session

- `源码`：同名 scoped prompt section shadow global；Runtime Context 变化会追加来源明确的 durable snapshot。
- `源码`：`request/header` 固化 provider、model、config、system 与 tools；raw chunks 和汇总 message 都入日志。
- `源码`：工具参数在 policy 前被 lossless snapshot 与冻结，结果通过 canonical schema 验证。
- `源码`：只有 classifier 精确返回 `true` 才并行；exclusive 是 barrier，最终结果仍按模型顺序提交。
- `源码`：Session 是连续 seq 的 append-only event log；Surface 的 `replace` 只 shadow 活动节点，不删除审计事件。
- `源码`：Persistence 使用 write-behind；开放 Turn 冷恢复时追加 synthetic interrupted 结局。
- `源码`：Compaction 只在 Surface generation 推进后重试 overflow，不能把原始错误伪装成成功。

### 记录 08–10：安全、长任务与扩展

- `源码/文档`：Approval、应用内路径 containment 与 Shell OS Sandbox 是不同层；confined runner 不可用时 fail closed。
- `限制`：Filesystem service 的 canonical-path containment 不是 kernel security boundary；`danger-full-access` 会绕过 Sandbox service。
- `源码`：continuable child 的 Session durable，但 Activation 与 AgentHandle 只在进程内；Agent Inbox 是唯一 turn FIFO。
- `源码/文档`：Cordis plugin、Skill、MCP、Hook 和动态 Cordis package 具有不同能力与生命周期。
- `限制`：固定版本 MCP 只桥接 Tools，不桥接 Resources / Prompts；动态 Cordis 的 `node:vm` 不是安全边界，定义也不会自动持久恢复。

## 阶段结论

第六阶段教材已经完成，但个人掌握仍需要真实启动、Provider / MCP 接入、平台 Sandbox 与 HMR 实验。DeepSeek Harness 最值得学习的是：把 Harness 的核心能力本身放进可组合、可观测、可撤销的插件生命周期，同时用 durable log 固化模型可见事实。最终对照见[Agent Harness 横向对照](../comparison.md)。
