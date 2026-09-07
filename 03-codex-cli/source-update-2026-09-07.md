# Codex 权限与 Sandbox 更新（2026-09-07）

[返回本阶段](README.md) · [全部来源版本](../source-updates.md)

本次基线：`757c151 → 5ecb3af`，开发分支，以 commit 固定。更新的是核验时上游 `main` 分支 HEAD；包版本相同也不代表提交相同。以下 `源码` 指新 commit，`文档` 指对应上游说明，`学习推论` 不作为运行结果。

## Approval 类型发生兼容迁移

`源码`：当前 `AskForApproval` 包含内部 `UnlessTrusted`、`OnRequest`、`Granular`、`Never`；`on-failure` 作为反序列化别名映射到 `OnRequest`，不再是独立的失败后自动升级策略。`untrusted` 仍有内部序列化表示，不能把“退出公开选项”理解为整个协议已无该类型。

`Granular` 分别控制 sandbox approval、execpolicy rules、skill approval、request_permissions 和 MCP elicitation 是否允许进入询问流程。它们是审批通道开关，不是直接给文件或网络授予权限。

证据：[AskForApproval 与 GranularApprovalConfig](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/protocol/src/protocol.rs)。对应第 1、2、6 课；旧版策略表和实验预期按此修正。

## 终端输入也是动作

`源码`：新的审批边界覆盖 `write_stdin`。向已获得较高权限的交互进程发送新输入，可能相当于让该进程执行新命令。实现使用保留的进程权限、当前 step 的审批设置和待发送输入决定审核，而不是把一次 spawn 的同意扩展成无限授权。

同一 terminal 的读写通过 interaction lock 串行；审批之后还会重新核对进程身份，防止进程 ID 被复用。审核内容过大时拒绝执行，不会只审核前缀然后发送未审核的尾部。空输入轮询与有内容的输入分别处理。

证据：[write_stdin 执行链](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/core/src/unified_exec/process_manager.rs)、[工具入口与拒绝回传](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs)。对应第 3、6 课。

## 执行器的路径与权限归属

`源码`：Permission profile 的发现、选择、解析已经有独立入口；远程任务的 resume/fork 需要保留原权限，路径必须按目标执行器解释，不能借用本地客户端的 cwd/home。

阅读 [profile catalog](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/core/src/config/permission_profile_catalog.rs)、[profile selection](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/core/src/config/permission_profile_selection.rs)、[resolved profile](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/core/src/config/resolved_permission_profile.rs)，并结合 [上游 catalog 回归测试](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/app-server/tests/suite/v2/permission_profile_list.rs)。这里引用测试证明存在相应检查，不代表本轮运行过它。对应第 2、5 课。

## OS 后端的具体加固

- `源码`：Linux bubblewrap 参数新增 IPC namespace 隔离。文件系统和网络隔离之外，共享 IPC 也应纳入威胁模型。见 [bwrap 参数](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/linux-sandbox/src/bwrap.rs)。
- `源码`：`codex sandbox` 的 macOS 调试执行路径追加针对 `TIOCSTI` 的 `file-ioctl` deny，防止子进程向宿主控制终端注入输入。见 [macOS debug sandbox](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/cli/src/debug_sandbox.rs)、[PTY 回归场景](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/cli/tests/sandbox_tty.rs)；不要从这个修改泛化出所有平台或所有终端路径已验证。
- `变更记录`：Windows 增加[认证 provisioning client](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/windows-sandbox-rs/src/provisioning_client.rs) 与 [MXC adapter](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/sandboxing/src/windows_mxc.rs)，属于独立后端/部署演进，不能宣称所有安装默认切到该路径。既有 restricted-token、ACL 与 fail-closed 边界仍需按实际配置确认。

对应第 4、5、6 课。

## 自动审批与异步监控分开

`源码/文档`：Guardian v2 将动作执行前的 synchronous reviewer 与异步 scoring 拆开。异步监控可能在动作发生后暂停任务，不能替代工具执行前授权或 OS enforcement。

证据：[同步 reviewer](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs)、[异步 scorer](https://github.com/openai/codex/blob/5ecb3afd1bf405149e2159bfda50093b0c1b5fab/codex-rs/ext/guardian-v2/src/async_scorer/mod.rs)、[官方 Agent approvals & security](https://developers.openai.com/codex/agent-approvals-security)（2026-09-07 核验）。官方说明还明确：command network proxy 的目标域名策略不覆盖 MCP、浏览器与模型连接；网络授权与启用 proxy enforcement 是两个开关。

工具链更新：Rust 仍为 `1.95.0`，Node `>=22`，pnpm 从 `10.33.0` 更新到 `10.34.5`。本阶段使用 main commit 固定开发源码，不把占位 workspace 版本当作发行版号。

## 验证边界

本轮完成版本、差异、实现与引用的静态核对；没有安装或运行上游应用、调用真实模型或重跑上游测试。原课程实验记录保留原日期，独立示例仍是教学模型，不是当前上游的兼容性测试。
