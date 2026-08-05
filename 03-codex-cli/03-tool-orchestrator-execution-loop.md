# 第 3 课：Tool Orchestrator 执行闭环

[返回本阶段目录](README.md) · [上一课](02-config-to-permission-profile.md) · [下一课](04-platform-sandbox-backends.md)

## 核心问题

一次 shell tool call 怎样经过命令策略、权限审批、Sandbox、进程执行与失败处理？

## 先记住一条主链

```text
Shell handler
  → 规范化 additional permissions
  → ExecPolicy 得出 Allow / Prompt / Forbidden
  → ExecApprovalRequirement
  → Permission hook / Guardian / 用户
  → 选择 Sandbox
  → ShellRuntime 构造执行请求
  → SandboxManager 编译平台命令
  → spawn
  → 成功 / 普通失败 / Sandbox denial
  → 仅在策略允许时受控重试
```

这条链的价值是把“模型发出了 Bash”拆成多个可审计决策点。

## 入口：Shell handler 先处理权限请求

固定源码的 [`run_exec_like()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/tools/handlers/shell.rs#L63-L138) 先读取 tool call 中的：

```text
command / cwd / env / timeout
sandbox_permissions
additional_permissions
justification / prefix_rule
```

然后把本次请求与本 turn 已批准的 sticky permissions 合并、规范化并验证。additional permissions 不是可以直接信任的普通参数；它必须处于相应 feature 与 approval policy 允许的路径中。

一个重要 guard 是：未经预批准的显式 Sandbox override，只能在 `OnRequest` 下提出。其他 approval policy 下，handler 会直接把拒绝原因返回模型，而不是制造一个永远无法完成的审批请求。

`源码`：如果命令实际是 `apply_patch`，shell handler 还会先尝试拦截，转入专用 patch 路径；见 [`shell.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/tools/handlers/shell.rs#L140-L156)。这说明 tool 名称不是唯一的执行语义，handler 仍能在进入通用 ShellRuntime 前做结构化分流。

## ExecPolicy：把命令分类成三个控制结果

Shell handler 将 command、approval policy、permission profile、Windows Sandbox 状态和权限提升请求交给 [`ExecPolicyManager`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/exec_policy.rs#L307-L425)。Policy 的底层 decision 被翻译为：

| ExecPolicy decision | Orchestrator requirement | 含义 |
| --- | --- | --- |
| `Allow` | `Skip` | 不需要审批；只有每个解析出的命令段都被显式 allow rule 命中时，才可能要求首次执行绕过 Sandbox。 |
| `Prompt` | `NeedsApproval` | 必须经 reviewer；若当前 approval policy 禁止该类 prompt，则转为 `Forbidden`。 |
| `Forbidden` | `Forbidden` | 不启动命令，直接返回拒绝原因。 |

[`ExecApprovalRequirement`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/tools/sandboxing.rs#L162-L198) 是 Orchestrator 使用的统一控制类型。它还可携带 proposed execpolicy amendment，供用户批准类似命令前缀时使用。

### 未命中显式规则时怎么办

固定源码的 [`render_decision_for_unmatched_command()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/exec_policy.rs#L719-L820) 给出关键默认语义：

| Approval policy | 普通、非危险、未提升命令 | 危险命令 | 关键原因 |
| --- | --- | --- | --- |
| `on-request` | 受限 Sandbox 内直接 `Allow` | `Prompt` | 让 Sandbox 执行边界内的日常命令；显式 override 才询问。 |
| `never` | `Allow`，仍在 Sandbox 中执行 | `Forbidden` | 不能询问不等于不能运行安全边界内命令。 |
| `untrusted` / `UnlessTrusted` | 只有已知安全、简单读取命令自动 `Allow`，其他 `Prompt` | `Prompt` | 对不可信项目采用更保守的命令授权。 |
| granular | 大体镜像 `on-request`，再按 granular 开关决定 prompt 或拒绝 | 取决于对应开关 | 将规则审批与 Sandbox 审批拆开控制。 |

这修正了一个常见误解：

```text
on-request ≠ 每条 shell command 都弹框
never      ≠ 每条 shell command 都禁止
```

两者都依赖 OS Sandbox 承担边界内自动执行的风险控制。

## Approval resolution：先配置 hook，再 reviewer

Orchestrator 遇到 `NeedsApproval` 后进入统一的 [`resolve_tool_approval()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/tools/approvals.rs#L190-L274)：

```text
PermissionRequest hook
  ├─ Allow → 直接批准
  ├─ Deny  → 直接拒绝
  └─ None  → 继续
             ├─ Guardian / 自动 reviewer
             └─ 用户 reviewer
```

Hook 是配置策略的一部分，Guardian 是自动审批者，User 是交互式授权者。三种来源都会被记录，但拒绝原因会按来源区分，不能把配置拒绝伪装成“用户拒绝”。

### Approval cache 的边界

ShellRuntime 的 [`ApprovalKey`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/tools/runtimes/shell.rs#L95-L136) 包含：

```text
environment_id
canonical command
cwd
sandbox_permissions
additional_permissions
```

因此一次批准不能仅凭命令文本泛化。相同的 `npm test` 换了执行环境、cwd 或请求权限范围，就不是同一个 cache key。

## Orchestrator：统一控制顺序

[`ToolOrchestrator::run()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/tools/orchestrator.rs#L136-L213) 先处理 requirement：

- `Skip`：记录配置批准；strict auto review 打开时仍会经过 Guardian；
- `Forbidden`：返回 `ToolError::Rejected`，命令未启动；
- `NeedsApproval`：调用选定 reviewer，只有批准后继续。

之后它把本轮 workspace roots 具体化后的 profile、网络状态和 tool 的 Sandbox preference 一起交给 `SandboxManager`，选择第一次 attempt 的平台后端；见 [`orchestrator.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/tools/orchestrator.rs#L215-L276)。

注意两种“允许”并不等价：

```text
Skip { bypass_sandbox: false } → 不审批，但仍使用 Sandbox
Skip { bypass_sandbox: true  } → 显式 policy trust 允许首次绕过
```

只有显式规则完整覆盖解析出的命令段，才会产生后一种强语义。普通 heuristics `Allow` 不自动变成 full access。

## ShellRuntime：把 attempt 变成真实进程

[`ShellRuntime::run()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/tools/runtimes/shell.rs#L254-L347) 负责：

1. 选择 turn environment 的 shell；
2. 准备 shell snapshot 与环境变量；
3. 保留 deny-read 时修正 escalation 行为；
4. 构造 `SandboxCommand`；
5. 通过 `SandboxAttempt::env_for()` 调用 `SandboxManager::transform()`；
6. `execute_env()` 启动并等待真实命令。

`SandboxManager::transform()` 会合成 base profile 与已经批准的 additional permissions，再把抽象策略编译成平台请求；实现入口见 [`manager.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/sandboxing/src/manager.rs#L310-L440)。

## 三种失败必须区分

| 结果 | 是否执行过 | 应怎样返回 |
| --- | --- | --- |
| `Forbidden` / approval denied | 没有启动 | 返回策略拒绝。 |
| 普通非零 exit、超时、程序错误 | 已执行 | 保留 stdout、stderr、exit code 或具体错误。 |
| `SandboxErr::Denied` | 已执行，但命中 OS / 网络策略 | 保留原始 output，并按 policy 判断是否允许重试。 |

Sandbox denial 不是“工具坏了”，而是边界成功阻止了访问。Runtime 不能吞掉真实 stderr，更不能返回一个假的成功结果。

## Denial 后不是无条件去掉 Sandbox

固定源码的 retry 分支见 [`orchestrator.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/tools/orchestrator.rs#L330-L412)：

- tool 必须声明 `escalate_on_failure()`；ShellRuntime 当前为 true；
- approval policy 必须允许对应重试路径；
- network denial 必须能解析出有效 network approval context；
- 自动 reviewer 的严格模式可能要求新的 Guardian review；
- reviewer 拒绝时，不执行第二次 attempt；
- 第二次仍失败，就返回第二次真实错误。

`never` 下 denial 直接回到模型。`on-request` 的普通文件系统 denial 也不会靠“先失败再自动弹框”实现权限请求；模型应在 tool call 中显式提出允许的 escalation。当前特例主要是可识别的 managed network approval flow。

## deny-read 为什么阻止无 Sandbox 重试

deny-read 只能在受控执行边界内成立。若 retry 直接改成 `SandboxType::None`，秘密文件就重新可读。

因此 [`unsandboxed_execution_allowed()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/core/src/tools/sandboxing.rs#L281-L306) 明确检查 deny-read：

```text
存在 denied-read restriction
  → escalation 仍不能简单绕过 filesystem sandbox
  → RequireEscalated 会退回受限 attempt
  → denial 保持可见
```

这是“管理员约束不能被普通批准削弱”在执行闭环中的具体落点。

## 端到端伪代码

```text
handle_shell(call):
  requested = normalize(call.additional_permissions)
  reject_impossible_escalation(call, approval_policy)

  decision = exec_policy.evaluate(call.command, effective_profile)
  requirement = translate(decision, approval_policy)

  if requirement == forbidden:
    return rejected(reason)

  if requirement == needs_approval:
    require(resolve_by_hook_guardian_or_user(call))

  attempt = select_sandbox(effective_profile, requirement, call.permissions)
  result = runtime.spawn(attempt)

  if result is not sandbox_denial:
    return result

  if retry_is_not_allowed(result, approval_policy, effective_profile):
    return original_denial_with_output

  require(resolve_retry_approval())
  return runtime.spawn(controlled_retry_attempt)
```

## 快速判断练习

1. `on-request + workspace-write` 下执行普通 `cargo test`，一定先弹审批吗？
2. `never + workspace-write` 下普通命令是否完全不能运行？
3. 用户批准工作区 A 的命令后，工作区 B 的同名命令能否仅凭文本命中 cache？
4. 有 deny-read 时，批准 `require_escalated` 能否直接丢掉 Sandbox？

答案：

1. 不一定。未命中危险规则且没有显式提升时，可以在 Sandbox 内直接执行。
2. 可以运行；危险命令会被拒绝，普通命令依赖 Sandbox 限制实际能力。
3. 不能。cache key 还包含 environment、cwd 与权限范围。
4. 不能简单丢掉；否则 deny-read 会被绕过。

## 30 秒复述

1. ExecPolicy 的三个 decision 怎样映射到 Orchestrator？
2. `Allow` 为什么不总是等于 bypass Sandbox？
3. Permission hook、Guardian 与用户的先后关系是什么？
4. 普通失败和 Sandbox denial 为什么要分开处理？
5. denial retry 需要满足哪些条件？

## 当前证据边界

- `源码`：固定 commit 的 Shell handler、ExecPolicy、Approval resolution、Orchestrator、ShellRuntime 与 denial retry 已静态核对。
- `限制`：本课沿 shell tool 主线，不代表 apply_patch、MCP、skills、computer use 等工具拥有完全相同的 approval requirement。
- `未验证`：没有运行固定 commit 的 shell integration tests，也没有捕获真实 approval UI 与 Sandbox denial。

## 下一步

下一课继续向下：同一个 `PermissionProfile` 在 macOS、Linux / WSL2 和原生 Windows 上分别怎样变成操作系统约束。
