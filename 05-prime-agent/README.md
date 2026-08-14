# 第五阶段：Prime Agent — RLM 与持续进化 Harness

[返回首页](../README.md) · [学习路线](../00-roadmap.md) · [横向对照](../comparison.md)

阶段状态：**教材已完成（10 / 10 课）；个人掌握清单待学习者验证**

本阶段研究 Prime Agent 怎样把 Coding Agent 重组为一个以持久 IPython 为模型控制面、能够递归委派并持续改进补充 Harness 状态的长任务系统：

```text
RLM / IPython
  → typed host bridge
  → AgentSession / child sessions
  → daemon-backed continuity
  → continual harness refinement
```

Prime Agent 建立在 Pi 系列包的 Agent loop、消息和 TUI 基础上。本阶段不会重复第一阶段的全部 loop 细节，而会重点研究它新增或显著强化的 RLM、Kernel、Continual Harness、Daemon、Goal、Schedule 与 Agent communication。

## 阶段目标

以下勾选表示学习者能够独立完成，不等同于对应文档已经写完。

- [ ] 画出 TUI → AgentConnection → Supervisor → Worker → AgentSession → IPython 的完整边界。
- [ ] 解释为什么默认只有一个 `ipython` 模型工具，文件、Shell、Skill 和 MCP 能力怎样在其中组合。
- [ ] 追踪一次 `await rlm(...)` 从 Jupyter comm 到子 `AgentSession` 的接纳与运行。
- [ ] 区分子 Agent 的 admission handle、完成结果、消息回传和 usage attribution。
- [ ] 解释 JSONL Session tree、Compaction boundary 与 Kernel snapshot 分别保存什么。
- [ ] 区分 RLM runtime、Continual Harness、已安装 Skill 与 Harness skill entry。
- [ ] 说明 `/refine` 的 plan / apply、local / global、冲突检查与 rollback 边界。
- [ ] 解释 Daemon generation cursor、snapshot recovery、command journal 和 uncertain side effect。
- [ ] 区分 Goal、Autonomous、Heartbeat、RLM heartbeat 与 Schedule。
- [ ] 明确 Worker / Kernel 进程隔离不是 OS Sandbox，并完成截至本阶段五个 Harness 的对照。

## 课程

| 课程 | 统一维度 | 核心问题 |
| --- | --- | --- |
| [第 1 课：来源边界、Pi 血缘与总体架构](01-source-boundary-and-architecture.md) | 全局 | Prime Agent 在 Pi Runtime 之上增加了哪些进程和状态边界？ |
| [第 2 课：单工具 RLM Loop 与 Context 构建](02-single-tool-rlm-loop-and-context.md) | Loop / Context | 为什么一个持久 `ipython` 工具足以成为模型的程序化控制面？ |
| [第 3 课：IPython Kernel、Jupyter 通道与 Host Bridge](03-ipython-kernel-and-host-bridge.md) | Tools / Safety | Python 怎样调用 Host 权威操作，为什么回复必须走 control channel？ |
| [第 4 课：递归子 Agent、Registry 与消息回传](04-recursive-subagents-and-messaging.md) | Multi-Agent | `rlm()` 为什么只返回接纳句柄，子 Agent 怎样运行、恢复和回传结果？ |
| [第 5 课：Session Tree、Compaction 与 Kernel 连续性](05-session-tree-compaction-kernel-state.md) | Context / State | Transcript、模型 Context、摘要和 Python namespace 怎样分别保存？ |
| [第 6 课：Continual Harness、Refinement 与回滚](06-continual-harness-refinement.md) | Context / State / Extension | Harness 怎样从轨迹中形成小而可审计的补充状态更新？ |
| [第 7 课：Daemon、Worker、重连与崩溃恢复](07-daemon-worker-recovery.md) | State | 客户端断开、Supervisor 替换或 Worker 崩溃后，哪些状态可以恢复？ |
| [第 8 课：Goal、Autonomous、Heartbeat 与 Schedule](08-long-running-continuation-policies.md) | Loop / State | 无用户新输入时，Harness 根据什么继续、停止或稍后重新进入 Session？ |
| [第 9 课：Skills、MCP、Extensions 与信任边界](09-skills-mcp-extensions-safety.md) | Extension / Safety | 应怎样选择扩展面，并避免把进程边界误当成安全边界？ |
| [第 10 课：长任务端到端复盘与阶段性五项目对照](10-end-to-end-review.md) | 全局 | 一次可递归、可恢复、可改进的长任务怎样贯穿六个维度？ |

## 固定证据版本

| 项目 | 值 |
| --- | --- |
| 官方仓库 | [PrimeIntellect-ai/prime-agent](https://github.com/PrimeIntellect-ai/prime-agent) |
| 固定源码 | [GitHub commit `71ca6cf`](https://github.com/PrimeIntellect-ai/prime-agent/tree/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8) |
| 本地目录 | `sources/prime-agent`（由根 `.gitignore` 忽略） |
| Commit | `71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8` |
| Commit 时间 | `2026-08-10T22:09:01-04:00` |
| 默认分支 | `main` |
| Workspace package 版本 | `0.7.1` |
| Python runtime 版本 | `prime-agent-runtime 0.1.0` |
| 源码规模 | 939 个 TS / TSX / Python 文件，约 29 MB |
| 许可证 | MIT |

固定 commit 是为了让目录、协议版本和调用链可复现。Prime Agent 迭代很快，升级源码后必须重新核对默认工具、Daemon schema、Session 语义和实验结论。

## 证据边界

- `源码`：官方 MIT 仓库固定 commit 中的实现。
- `文档`：同一 commit 随仓库发布的官方 README 与 `packages/coding-agent/docs/`。
- `实验`：本阶段提交的独立、无外部依赖最小模型。
- `未验证`：本地没有安装上游 workspace 依赖，也没有配置模型凭据，因此没有运行真实 Prime Agent、上游测试或付费模型调用。
- `限制`：固定版本的 `daemon.md` 仍写“protocol v4”，而 [`daemon-protocol.ts`](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/src/modes/daemon/daemon-protocol.ts#L47-L63) 已定义 v7 / schema revision 15。本阶段涉及实现版本时以固定源码为准，并保留这条文档滞后记录。

## 十课形成的一条主线

```text
用户、Schedule、Goal 或 Agent message
  → AgentConnection / daemon routing
  → Session input queue
  → Agent loop 构造 Context
  → 模型只调用 ipython
  → Kernel 执行 Python / %%bash / Skill
  → typed host request 返回 AgentSession
  → child、goal、message、compact 或 refine 状态变化
  → ToolResult / custom message 回灌
  → JSONL + artifacts + daemon events
  → continuation、detach、resume 或 stop
```

## 学习记录

### 记录 01–03：架构、Loop 与 Kernel

- `源码/文档`：正常交互路径把 UI、Supervisor、每根 Session tree 的 Worker、AgentSession 和 IPython Kernel 分开。
- `源码`：默认 built-in tool catalog 只有 `ipython`；Extension 可以显式加入或替换工具。
- `源码`：低层 Agent loop 仍处理 ToolResult、Steering、Follow-up；AgentSession 再注入 Goal / Autonomous continuation。
- `源码`：Kernel 与 Host 使用 Jupyter ZeroMQ 通道和 `host.request` comm；Host 保留 Provider、凭据、Session 和调度权威。
- `限制`：Kernel / Worker 隔离生命周期和故障，不限制同一 OS 用户权限。

### 记录 04–06：递归、Context 与持续改进

- `源码/文档`：`rlm()` 在子任务接纳后立即返回 handle，子 Agent 使用独立 AgentSession、Context、Session 目录和可选 Kernel。
- `源码`：直接子 Agent registry、usage attribution 和消息协议使后台结果在后续 turn 回到父 Agent。
- `源码`：JSONL `parentId` 形成 Session tree；Compaction 改写活动 Context，不删除审计历史。
- `源码`：Kernel namespace snapshot 与 Compaction summary 是不同状态层。
- `源码`：Continual Harness 保存 prompt、memory、skill、subagent 四类补充条目；local 为默认，global 必须显式请求。
- `源码`：`/refine` 先规划结构化 edits，再在 turn boundary 重读、冲突检查、原子保存并重建 system prompt；base prompt 不可改。

### 记录 07–09：持续运行、恢复与扩展

- `源码/文档`：Supervisor 管路由、attachment 与恢复；一个 Worker 管一棵 root Session tree 及其 descendants。
- `源码`：事件 cursor 由 generation + sequence 构成；无法完整 replay 时以一致 snapshot 为恢复基线。
- `源码`：mutation journal 对已完成 command 去重，对结果不确定的 command 不盲目重放。
- `源码/文档`：Goal 保存目标；Autonomous 决定是否注入下一轮；Heartbeat / Schedule 决定何时重新进入 Session。
- `源码/文档`：Python-backed Skill、Kernel 内 MCP integration 与 TypeScript Extension 是三种不同扩展边界。
- `限制`：默认执行模型生成的 Python 和项目命令时继承宿主用户权限；Hook gate 不是 OS enforcement。

### 记录 10：端到端结论

- `结论`：Prime Agent 最有辨识度的设计是“持久 Python 控制面 + 类型化 Host 权威面”。
- `结论`：RLM child、Daemon、Goal、Schedule 和 Kernel snapshot 共同解决长任务连续性，但不能替代 Context、状态与副作用的显式边界。
- `结论`：Continual Harness 把“从轨迹学习”限制为可审计的小型补充状态变更，而不是让模型重写不可变 base prompt。
- `限制`：强自治会放大权限风险；生产部署仍应组合 Codex 阶段的最小权限 Approval 与 OS Sandbox 思路。

## 阶段结论

第五阶段教材已经完成，但个人掌握仍需要真实 CLI 运行、独立复述和安全环境中的长任务实验。本阶段的结论已汇入持续更新的[Agent Harness 横向对照](../comparison.md)。
