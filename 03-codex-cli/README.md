# 第三阶段：Codex CLI — 生产级 Sandbox

[返回首页](../README.md) · [学习路线](../00-roadmap.md) · [横向对照](../comparison.md)

阶段状态：**教材已完成（6 / 6 课）；个人掌握清单待学习者验证**

## 阶段目标

以下勾选表示学习者能够独立完成，不等同于对应文档已经写完。

- [ ] 区分模型决策、Harness 策略与操作系统隔离各自的职责。
- [ ] 理解 sandbox、approval policy 和命令执行之间的关系。
- [ ] 追踪文件写入、命令执行和权限提升的完整控制路径。
- [ ] 比较 macOS、Linux / WSL2 与原生 Windows 的隔离机制及能力边界。
- [ ] 解释为什么“提示模型不要做”不能代替 Sandbox。

## 课程

| 课程 | 状态 | 核心问题 |
| --- | --- | --- |
| [第 1 课：Sandbox、Approval 与威胁模型](01-sandbox-approval-threat-model.md) | 已完成 | Sandbox、Approval 和模型决策分别控制什么？ |
| [第 2 课：配置到 Permission Profile](02-config-to-permission-profile.md) | 已完成 | CLI、配置和管理约束如何合成为有效权限？ |
| [第 3 课：Tool Orchestrator 执行闭环](03-tool-orchestrator-execution-loop.md) | 已完成 | 一次 shell tool call 怎样经过审批、隔离、执行和失败处理？ |
| [第 4 课：三种操作系统 Sandbox 后端](04-platform-sandbox-backends.md) | 已完成 | Seatbelt、bubblewrap / seccomp 与 Windows Sandbox 怎样落实同一策略？ |
| [第 5 课：文件系统、网络与受保护路径](05-filesystem-network-protected-paths.md) | 已完成 | writable roots、网络隔离和 `.git` 等 carve-out 如何执行？ |
| [第 6 课：权限提升实验与阶段复盘](06-escalation-experiment-phase-review.md) | 已完成 | 一次越界操作怎样失败、申请授权并以受控方式重试？ |

## 固定源码版本

| 项目 | 值 |
| --- | --- |
| 官方仓库 | `https://github.com/openai/codex.git` |
| 固定源码 | [GitHub commit `757c151`](https://github.com/openai/codex/tree/757c151a0e920c6238801866a3d13e010dfeddb8) |
| 本地目录 | `sources/codex` |
| Commit | `757c151a0e920c6238801866a3d13e010dfeddb8` |
| Commit 时间 | `2026-08-05T08:04:15Z` |
| 源码版本字段 | Rust workspace `0.0.0`；npm wrapper `0.0.0-dev` |
| Rust toolchain | `1.95.0` |
| Node / pnpm | Node `>=22`；pnpm `10.33.0` |
| 默认分支 | `main` |

仓库 main 分支使用开发占位版本号，因此本阶段以 commit 而不是 package version 作为可复现边界。升级 commit 后，必须重新验证策略类型、默认值、执行顺序和平台实现。

## 本阶段阅读策略

第三阶段不重复阅读完整 Agent loop，而是从模型产生 shell tool call 的位置切入：

```text
模型提出 tool call / 权限请求
  → Harness 计算 approval requirement
  → reviewer 或用户作出授权决定
  → 选择平台 Sandbox
  → 把抽象 Permission Profile 编译成 OS 约束
  → spawn 命令及其子进程
  → 返回成功、普通失败或 Sandbox denial
  → 必要时按策略申请受控重试
```

源码正在从旧的 `sandbox_mode` / `SandboxPolicy` 接口迁移到更细粒度的 `PermissionProfile`。课程会明确区分兼容层、当前 canonical representation 与真正的 OS enforcement，不把同名类型当成同一层。

## 学习记录

### 记录 01：Sandbox、Approval 与威胁模型（2026-08-05）

- `文档`：Sandbox 定义命令技术上能访问的文件与网络边界；Approval policy 定义何时必须暂停并取得授权。
- `源码`：`AskForApproval` 与 `SandboxPolicy` 是独立类型，`workspace-write + never` 等组合在概念和实现上都成立。
- `源码`：`ToolOrchestrator` 集中执行 approval requirement、Sandbox 选择、首次运行和受策略约束的 denial 处理。
- `源码`：平台选择映射为 macOS Seatbelt、Linux helper 和原生 Windows restricted-token 后端；Linux helper 当前默认使用 bubblewrap，再施加 seccomp。
- `源码`：`workspace-write` 不是整个工作区无条件可写；`.git`、`.agents`、`.codex` 默认仍是受保护 metadata 路径。
- `结论`：模型负责提出意图，Approval 负责授权边界，Sandbox 负责执行边界；只有最后一层能约束已经启动的子进程。
- `限制`：本课建立控制平面地图，尚未逐项验证配置合并、每种 tool 的 approval requirement 与各平台规则细节。
- `未验证`：没有构建固定 commit 或运行上游测试；本课只修改学习文档并进行静态源码核对。
- `下一步`：追踪 CLI flags、config layers、managed requirements 如何收敛成 turn 使用的有效 Permission Profile。

### 记录 02：配置到 Permission Profile（2026-08-05）

- `源码`：`ConfigLayerStack` 合并多层配置并保留 key origin 与 layer fingerprint；CLI 的 `sandbox_mode`、直接 `permission_profile`、`default_permissions` override 不能混用。
- `源码`：named profile 经过继承与编译后形成 canonical `PermissionProfile::Managed / Disabled / External`，legacy sandbox mode 也会先迁移到同一表示。
- `源码`：管理员要求通过 `Constrained<T>` 验证或规范化候选值，不能按普通可覆盖配置理解。
- `源码`：`:workspace_roots` 保持符号形式，到 `TurnEnvironment` 才绑定本轮环境的真实 workspace roots。
- `限制`：loader 层级与 legacy / profiles 迁移状态以固定 commit 为准，升级版本后需重新验证。

### 记录 03：Tool Orchestrator 执行闭环（2026-08-05）

- `源码`：Shell handler 先处理 sticky 与 additional permissions，再由 ExecPolicy 输出 `Allow / Prompt / Forbidden` 并转换为统一 requirement。
- `源码`：`on-request` 允许普通非危险命令直接在 restricted Sandbox 内执行；`never` 仍可运行普通命令，但危险命令在不能询问时会被拒绝。
- `源码`：Permission hook 优先于 Guardian / 用户 reviewer；approval cache key 包含 environment、canonical command、cwd 与权限范围。
- `源码`：Orchestrator 区分未执行的策略拒绝、普通执行失败与 Sandbox denial；重试必须满足 policy，不能伪造成功。
- `限制`：本课沿 shell tool 主线，不把其他工具当成完全相同的 approval flow。

### 记录 04：三种操作系统 Sandbox 后端（2026-08-05）

- `源码`：macOS 使用固定 `/usr/bin/sandbox-exec`，把读、写、deny-read 与 network 规则编译为动态 Seatbelt profile。
- `源码`：Linux / WSL2 默认先由 bubblewrap 构造 filesystem / network namespace，再在内层应用 `no_new_privs + seccomp`；Landlock 是 legacy opt-in，默认失败不会静默回退。
- `源码`：原生 Windows 使用 restricted token、capability SID / ACL，并根据配置选择 unelevated 或 elevated backend；proxy enforcement 需要 elevated path。
- `限制`：内部枚举 `LinuxSeccomp` 不能概括当前完整后端；WSL1 不支持需要 bubblewrap 的当前默认路径。
- `未验证`：没有在三个操作系统上构建并运行固定 commit。

### 记录 05：文件系统、网络与受保护路径（2026-08-05）

- `源码`：同目标规则冲突时 `deny > write > read`；workspace profile 以 root 可读、workspace roots 与临时目录可写为基线。
- `源码`：`.git`、`.agents`、`.codex` 默认从 writable root 中 carve 成只读，`.git` pointer 的真实 gitdir 也进入保护范围。
- `源码`：additional permissions 先规范化，再 merge 或与 reviewer grant 求交集；deny-read 不能在 escalation 中被静默丢弃。
- `源码/文档`：network capability 与 managed proxy 是两个开关；domain 冲突 deny 胜 allow，local binding 与任意 Unix socket 默认关闭。
- `文档/限制`：原生 Windows managed deny-read 作用于 direct file tools，但 shell subprocess reads 不使用同一规则。

### 记录 06：权限提升实验与阶段复盘（2026-08-05）

- `实验步骤`：提供安全探针，覆盖 workspace 内写入、workspace 外 denial、精确 additional permission、`require_escalated`、默认网络和 `never`。
- `实验步骤`：结果模板要求记录 Codex version / commit、平台、active policy、config origin、原始 denial 与实际授权范围。
- `结论`：生产级 Sandbox 不是单个 API，而是配置收敛、不可弱化约束、审批控制、平台 enforcement 与真实失败反馈构成的闭环。
- `未验证`：探针未替学习者执行真实 approval / escalation，也没有预填 macOS、Linux / WSL2、原生 Windows 结果。

## 阶段结论

第三阶段教材已经完成，但阶段目标仍由学习者在完成复述与跨平台实验后自行勾选。下一阶段入口是[Claude Code：完整 Agent Harness](../04-claude-code/README.md)。
