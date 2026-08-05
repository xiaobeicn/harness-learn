# 第 4 课：三种操作系统 Sandbox 后端

[返回本阶段目录](README.md) · [上一课](03-tool-orchestrator-execution-loop.md) · [下一课](05-filesystem-network-protected-paths.md)

## 核心问题

同一个 `PermissionProfile`，怎样在 macOS、Linux / WSL2 与原生 Windows 上落实成不同的 OS enforcement？

## 先记住一句话

```text
PermissionProfile 是共同语义
平台 Sandbox 是不同编译后端
能力相似不代表机制、限制和失败方式完全相同
```

## 平台选择只决定入口，不概括全部机制

固定源码的 [`SandboxType`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/sandboxing/src/manager.rs#L34-L73) 目前映射为：

| Host | 枚举 | 实际执行后端 |
| --- | --- | --- |
| macOS | `MacosSeatbelt` | `/usr/bin/sandbox-exec` + 动态 Seatbelt profile。 |
| Linux / WSL2 | `LinuxSeccomp` | `codex-linux-sandbox` helper，默认 bubblewrap namespace + 内层 seccomp / `no_new_privs`。 |
| 原生 Windows | `WindowsRestrictedToken` | restricted token、capability SID / ACL 与 unelevated 或 elevated backend。 |

内部名字 `LinuxSeccomp` 是历史兼容命名，不能据此断言“Linux 只有 seccomp”。真正的管线必须继续追到 helper。

## macOS：把策略编译为 Seatbelt profile

### 固定系统入口

Codex 只使用固定路径 `/usr/bin/sandbox-exec`，而不是从 `PATH` 搜索同名程序；源码解释这是为了避免恶意仓库注入假二进制，见 [`seatbelt.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/sandboxing/src/seatbelt.rs#L20-L30)。

`SandboxManager::transform()` 把命令改写为：

```text
/usr/bin/sandbox-exec -p <dynamic profile> -D... -- <original command>
```

入口见 [`manager.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/sandboxing/src/manager.rs#L344-L371)。原命令不需要理解 Sandbox，它只是在 Seatbelt 子进程中启动。

### 动态 profile 的组成

[`create_seatbelt_command_args()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/sandboxing/src/seatbelt.rs#L623-L752) 合成：

```text
base policy
+ file-read allow rules
+ file-write allow rules
+ deny-read rules
+ network rules
+ 可选 platform-default read rules
```

文件写权限以 writable roots 为 allow 基线，再排除 read-only subpaths 和受保护 metadata names。deny-read glob 会被转换成锚定 regex，同时拒绝 `file-read*` 与 unlink-style write，避免进程通过破坏性操作探测被禁止的路径；见 [`seatbelt.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/sandboxing/src/seatbelt.rs#L441-L472)。

### 网络

Seatbelt 动态网络规则可以：

- 完全允许网络；
- 默认不授予外网；
- 只放行 managed proxy 的 loopback ports；
- 独立控制 local binding；
- 只允许列出的 Unix sockets。

这里的“允许连接本机代理”不是“允许任意外网”，最终域名和方法仍可由 managed proxy 过滤。

## Linux / WSL2：bubblewrap 外层 + seccomp 内层

### 为什么是两阶段

固定源码的 Linux helper 注释已经写明顺序：

1. bubblewrap 构造 filesystem view；
2. 进入已经隔离的环境后应用 `no_new_privs` + seccomp；
3. `execvp` 最终用户命令。

见 [`linux_run_main.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/linux-sandbox/src/linux_run_main.rs#L78-L119) 与 [`run_main()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/linux-sandbox/src/linux_run_main.rs#L144-L202)。这样安排是因为部分 bubblewrap 安装依赖 setuid；若太早设置 `no_new_privs`，可能先破坏 bubblewrap 自己建立 namespace 的能力。

### bubblewrap 如何表示文件策略

[`bwrap.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/linux-sandbox/src/bwrap.rs#L1-L11) 给出目标语义：

```text
默认只读 filesystem view
+ 显式 writable roots
- writable roots 内的 .git / .agents / .codex 等只读 carve-out
```

实际 mount 顺序很重要；[`create_filesystem_args()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/linux-sandbox/src/bwrap.rs#L351-L380) 先建立只读 root 或空的 tmpfs 视图，再放入最小 `/dev`、readable roots、writable bind mounts，最后重新覆盖 read-only 与 unreadable subpaths。

网络受限时，bubblewrap 使用新的 network namespace；[`BwrapNetworkMode`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/linux-sandbox/src/bwrap.rs#L85-L103) 区分 full access、isolated 与 proxy-only。proxy-only 仍先 unshare network，随后由 helper 建立受控代理路由。

### system bwrap 与 bundled helper

Launcher 优先使用满足能力检查的 system `bwrap`；若没有，再使用 Codex 旁边的 bundled resource；两者都没有就显式失败，见 [`launcher.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/linux-sandbox/src/launcher.rs#L36-L67)。

这条分支不会静默变成“无 Sandbox”。缺少后端是启动错误，而不是安全降级。

### Landlock 是 legacy opt-in

当 `use_legacy_landlock = false` 时，默认路径使用 bubblewrap，而且 bubblewrap 失败不会自动回退到 Landlock；固定源码在 [`linux_run_main.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/linux-sandbox/src/linux_run_main.rs#L217-L261) 明确写出这点。

Landlock 路径仍保留作 legacy opt-in，但受限 read policy 等能力不完全相同。安全系统不应在默认后端出错时偷偷切换到语义更弱的实现。

### WSL1 与 WSL2

WSL2 走 Linux bubblewrap 路径。WSL1 无法支持当前需要 bubblewrap 的组合；[`ensure_linux_bubblewrap_is_supported()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/sandboxing/src/manager.rs#L656-L670) 会返回显式错误。

因此文档里的“Linux / WSL2”不能简写成“所有 WSL”。

## 原生 Windows：restricted token + capability / ACL

### 两种 token mode

Windows 将 managed profile 解析为 [`ResolvedWindowsSandboxPermissions`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/windows-sandbox-rs/src/resolved_permissions.rs#L13-L58)，再根据是否存在 writable roots 选择：

```text
ReadOnlyCapability
WritableRootsCapability
```

它只接受 managed、restricted filesystem profile；full-disk write 不能假装由这个 Windows Sandbox 强制执行。

### restricted token 与 capability SID

固定源码使用 `CreateRestrictedToken`，加入 capability SID、logon SID 等 restricting identities，并设置 restricted token 的 default DACL；见 [`token.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/windows-sandbox-rs/src/token.rs#L448-L505)。

直观理解是：

```text
Token 决定进程携带哪些受限身份与能力
ACL 决定这些身份能访问哪些文件系统对象
```

这与 Linux mount namespace 或 macOS Seatbelt policy 的技术机制不同，但都在进程启动边界实施限制。

### unelevated 与 elevated backend

Windows unified exec 统一了两种启动路径：

| backend | 何时使用 | 特点 |
| --- | --- | --- |
| legacy / unelevated | 未要求 elevated 且不强制 proxy | 当前用户上下文内的 direct restricted-token spawn。 |
| elevated | 选择 elevated 或启用 proxy enforcement | 通过 elevated command runner IPC 启动受限会话。 |

选择逻辑见 [`unified_exec/mod.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/windows-sandbox-rs/src/unified_exec/mod.rs#L22-L95)。若传入 network proxy restricting SID，却没有 elevated backend，Runtime 会显式报错。

Windows 请求还可以选择 private desktop，降低子进程与用户桌面对象交互的范围；它是 Windows 专属加固项，不属于跨平台 `PermissionProfile` 本身。

## 同一语义怎样落到三个后端

| 抽象要求 | macOS | Linux / WSL2 | 原生 Windows |
| --- | --- | --- | --- |
| root 只读 | Seatbelt file-read allow、无 root write allow | `--ro-bind / /` 或 scoped tmpfs view | read-only capability / ACL。 |
| workspace 可写 | Seatbelt writable-root allow | writable `--bind` | writable-root capability / ACL。 |
| metadata carve-out | write rule 中排除 subpath / metadata regex | writable bind 后重新 `--ro-bind` / mask | writable root 中保留 read-only subpaths。 |
| 默认禁网 | 不生成通用 network allow | unshare network namespace + seccomp | resolved network block / proxy enforcement。 |
| 受控代理 | 只放行 loopback proxy 与允许的 socket | proxy-only netns + routing bridge | elevated backend + restricting SID / proxy settings。 |

这张表表示目标语义，不保证三端所有边角能力完全相同。下一课会专门列出 deny-read glob 与原生 Windows subprocess 的限制。

## 为什么不能只测试一个平台

一份 profile 在 macOS 能被 Seatbelt 原生 regex 表达，在 Linux 可能需要启动前扫描并生成具体 mask，在 Windows 可能只能对 direct tool 或 ACL 能表达的目标生效。

因此生产验证至少要分三层：

```text
策略单元测试     → 共同语义是否正确
后端参数测试     → 是否编译成预期 Seatbelt / bwrap / Windows request
目标平台集成测试 → OS 是否真的拒绝目标访问
```

仅在 macOS 看到 denial，不能证明 Linux 和 Windows 已经同样生效。

## 30 秒复述

1. 为什么 `LinuxSeccomp` 这个名字不足以描述当前 Linux Sandbox？
2. Linux 为什么先 bubblewrap、后 `no_new_privs` 与 seccomp？
3. 默认 bubblewrap 失败为什么不能静默退回 Landlock？
4. Windows 的 read-only 与 writable-roots token mode 怎样选择？
5. managed proxy 为什么会影响 Windows backend 选择？

## 当前证据边界

- `源码`：固定 commit 的平台选择、Seatbelt profile 构造、bubblewrap / seccomp 管线、Landlock legacy 分支和 Windows token / backend 选择已静态核对。
- `限制`：三端实现的能力不完全对称；类型名称也包含迁移历史，结论以执行路径而不是枚举名为准。
- `未验证`：没有在 macOS、Linux / WSL2、原生 Windows 上构建并运行固定 commit，本课没有声称获得真实 OS denial 结果。

## 下一步

下一课回到共同策略层，研究 writable roots、deny-read、受保护 metadata 与 managed network 怎样组合，以及哪些限制不能跨平台等价实现。
