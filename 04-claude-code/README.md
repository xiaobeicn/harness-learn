# 第四阶段：Claude Code — 完整 Agent Harness

[返回首页](../README.md) · [学习路线](../00-roadmap.md) · [横向对照](../comparison.md)

阶段状态：**教材已完成（12 / 12 课）；个人掌握清单待学习者验证**

本阶段研究完整的 Claude Code Harness 架构，并沿六个维度展开：

```text
Loop → Context → Tools → State → Safety → Extension
             ↘ Memory / Subagent / Agent Teams ↗
```

课程覆盖模型循环、上下文、工具、副作用、持久化和安全边界，并深入分析 Memory、Subagent 与 Agent Teams。

## 阶段目标

以下勾选表示学习者能够独立完成，不等同于对应文档已经写完。

- [ ] 不看源码画出 Claude Code 的 model → tool → result → model 循环和停止条件。
- [ ] 区分 System prompt、System context、User context、CLAUDE.md、Attachments 和 Skills。
- [ ] 解释 Microcompact、Compaction、compact boundary 与 resume 的关系。
- [ ] 追踪一次 tool use 的 schema、Hook、Permission、执行和 error result 回灌。
- [ ] 解释 append-only JSONL、parentUuid、resume、fork 和 rewind。
- [ ] 区分 Permission rule / mode、Bash 语义检查与 OS Sandbox。
- [ ] 说明 CLAUDE.md、Session、Compaction summary 和 Auto Memory 的边界。
- [ ] 比较 fresh / fork、foreground / background、worktree isolation。
- [ ] 解释 Agent Team 的 Tasks、Mailbox、ownership、dependency 和 permission sync。
- [ ] 在 CLAUDE.md、Skill、Custom Agent、Hook、MCP、Plugin 之间选择最窄扩展。
- [ ] 用六维框架完成前四个 Harness 的阶段性横向比较。

## 课程

| 课程 | 统一维度 | 核心问题 |
| --- | --- | --- |
| [第 1 课：来源边界与 Harness 总体架构](01-source-boundary-and-harness-map.md) | 全局 | 怎样严谨使用非官方 source map 还原，并建立六维地图？ |
| [第 2 课：输入接纳与 Agent Loop](02-input-admission-and-agent-loop.md) | Loop | 谁驱动 continuation，Agent 在什么条件下停止？ |
| [第 3 课：System Prompt、CLAUDE.md 与项目指令](03-system-prompt-claudemd-project-instructions.md) | Context | 产品指令、环境、项目规则和 Memory 怎样分层？ |
| [第 4 课：Skills、Attachments 与动态 Context](04-skills-attachments-dynamic-context.md) | Context / Extension | 信息如何按生命周期发现、注入和延迟加载？ |
| [第 5 课：Token 压力、Microcompact 与 Compaction](05-token-pressure-microcompact-compaction.md) | Context / State | 超长历史怎样清理、总结和恢复 continuation？ |
| [第 6 课：Tool Contract、注册、并发与结果回灌](06-tool-contract-registry-execution.md) | Tools | 一次 tool use 怎样安全执行并变成新 observation？ |
| [第 7 课：Session、Transcript、Resume、Fork 与 Rewind](07-session-transcript-resume-fork-rewind.md) | State | append-only JSONL 怎样支持分支和恢复？ |
| [第 8 课：Permission、Hooks、Bash 分类器与 Sandbox](08-permissions-hooks-bash-sandbox.md) | Safety | 授权、命令判断和 OS enforcement 各控制什么？ |
| [第 9 课：Auto Memory、Recall 与长期知识治理](09-auto-memory-recall-governance.md) | Context / State | 哪些知识值得跨会话保存，如何避免陈旧污染？ |
| [第 10 课：Subagent 生命周期、Context 隔离与后台任务](10-subagent-lifecycle-context-isolation.md) | Loop / Context / State | Fresh、Fork、前后台和 worktree 各改变什么？ |
| [第 11 课：Agent Teams、Tasks、Mailbox 与权限同步](11-agent-teams-tasks-mailbox.md) | Multi-Agent | 多 Agent 怎样管理 ownership、依赖、通信与授权？ |
| [第 12 课：Plugin、MCP、Hooks、Skills 扩展与端到端复盘](12-extension-system-end-to-end-review.md) | Extension / 全局 | 如何选择扩展并用六维框架复盘完整任务？ |

## 固定证据版本

| 项目 | 值 |
| --- | --- |
| 非官方还原仓库 | [pengchengneo/Claude-Code](https://github.com/pengchengneo/Claude-Code) |
| 固定源码 | [GitHub commit `b78dd22`](https://github.com/pengchengneo/Claude-Code/tree/b78dd22a091b717c8938ab98c736bc04825a8ee8) |
| 本地目录 | `sources/claude-code`（由根 `.gitignore` 忽略） |
| Commit | `b78dd22a091b717c8938ab98c736bc04825a8ee8` |
| 文件规模 | 1,987 个 TS / TSX 文件，约 44 MB |
| 官方公开契约 | [Claude Code 官方文档](https://code.claude.com/docs/en/overview) |
| 官方文档目录核验 | `claude_code_docs_map.md`，2026-08-05 更新 |

## 来源限制

`源码`：还原仓库 [README](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/README.md#L1-L10)自述来自官方 npm 包的 source map，并明确标记非官方。

因此：

- 不称其为 Anthropic 官方开源源码。
- 不运行还原源码，不把还原仓库实现复制到教材。
- 只引用固定 commit 的 GitHub permalink。
- 公开功能以官方文档为准；内部 / feature-gated 路径只作为快照分析。
- 源码升级后要重新验证函数、顺序、默认值和 feature gate。

## 十二课形成的一条主线

```text
用户输入
  → queryLoop 组装 Context
  → System prompt + CLAUDE.md + Memory + Attachments
  → 模型流产生 text / tool_use
  → Tool lookup + schema + PreToolUse
  → Permission + tool-specific safety + optional Sandbox
  → tool.call() + 标准化 result
  → JSONL transcript / sidechain / Tasks
  → 下一轮、Compaction、Subagent、Team 或结束
```

## 学习记录

### 记录 01–02：来源与 Loop

- `源码`：研究源是固定 commit 的非官方 source map 还原，不是官方源码。
- `文档`：官方把 Claude Code 定义为模型外部的 agentic harness。
- `源码`：`queryLoop()` 驱动模型轮次，tool results 触发 continuation，Harness 掌握停止边界。

### 记录 03–05：Context

- `源码`：System prompt、System context、User context 分开构建。
- `源码`：CLAUDE.md 按 managed、user、root-to-CWD project/local、Memory 装配，嵌套规则动态注入。
- `文档/源码`：Skills、MCP schema 和 Attachments 支持按需 Context。
- `源码`：压力处理从局部 Tool result 清理走向全局 Compaction；summary 是 continuation checkpoint。

### 记录 06–08：Tools、State、Safety

- `源码`：Tool contract 包含 schema、并发、权限、风险和结果策略。
- `源码`：Session 是 append-only JSONL；parentUuid 将 entries 组织成可恢复分支链。
- `源码`：PreToolUse、Permission rules / modes、Bash semantics 与 Sandbox 是不同安全层。
- `限制`：Claude Code 本地 Sandbox 是可配置加固，不能直接等同 Codex 第三阶段的 canonical profile 主线。

### 记录 09–11：Memory 与 Multi-Agent

- `源码/文档`：MEMORY.md 启动加载限制为 200 行 / 25 KB；topic files 提供按需 recall。
- `源码`：Fresh agent 零 Context，Fork 继承父 Context；每个 Agent 有 sidechain transcript 和专用工具视图。
- `源码`：Agent Team 通过 team config、Tasks、Mailbox 和 permission sync 协调持续运行的 teammates。

### 记录 12：Extension 与复盘

- `源码/文档`：CLAUDE.md、Skill、Custom Agent、Hook、MCP、Plugin 对应不同生命周期。
- `结论`：先选最窄的扩展，再考虑用 Plugin 组合和分发。
- `结论`：Claude Code Harness 通过六维闭环组织 Context、Memory、Subagent 与 Agent Teams。

## 阶段结论

第四阶段教材已经完成，但阶段目标仍由学习者在独立复述、真实 CLI 实验和扩展练习后自行勾选。前四阶段的阶段性对照见[Agent Harness 横向对照](../comparison.md)，最终对照在第五阶段完成。
