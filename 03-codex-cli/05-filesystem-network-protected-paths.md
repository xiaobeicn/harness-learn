# 第 5 课：文件系统、网络与受保护路径

[返回本阶段目录](README.md) · [上一课](04-platform-sandbox-backends.md) · [下一课](06-escalation-experiment-phase-review.md) · [官方 Permissions 文档](https://developers.openai.com/codex/permissions)

## 核心问题

writable roots、deny-read、`.git` 等 protected metadata 与 managed network，怎样共同决定命令能接触的资源？

## 先记住两个独立策略

```text
Filesystem policy：路径能否读、能否写、是否拒绝
Network policy：进程是否获得网络能力，以及是否必须经过受控代理
```

二者都属于有效 `PermissionProfile`，但有各自的解析与 enforcement 机制。

## 文件系统不是一个 `writable: true` 布尔值

固定源码的 [`FileSystemAccessMode`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/protocol/src/permissions.rs#L90-L128) 有三种值：

```text
read
write
deny
```

对于同样具体的冲突项，优先级是：

```text
deny > write > read
```

路径层级也参与优先级。固定源码的 [`resolve_access_with_cwd()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/protocol/src/permissions.rs#L701-L718) 先选择匹配目标路径的条目，再取 specificity 与 access precedence 更高的结果；无法安全解析的目标默认 `Deny`。

所以策略可以表达：

```text
/workspace                 write
/workspace/docs            read
/workspace/docs/private    deny
/workspace/docs/public     write
```

更深的具体规则可以收紧或重新开放子树，但同目标的 deny 不能被同等具体的 write 冲掉。

## Special paths：配置语义与本机路径分离

[`FileSystemSpecialPath`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/protocol/src/permissions.rs#L130-L171) 定义：

| special path | 含义 |
| --- | --- |
| `:root` | 当前平台 filesystem root。 |
| `:minimal` | 平台运行命令所需的最小只读系统路径集合。 |
| `:workspace_roots` | 本轮一个或多个 workspace roots，可附相对子路径。 |
| `:tmpdir` | 环境中的临时目录。 |
| `:slash_tmp` | Unix `/tmp`。 |

Special path 让 profile 可以跨环境保存；真正执行时再根据 workspace、环境变量与平台展开。未知的新 special token 仍可被旧 Runtime 表示并 warn / ignore，避免新配置让旧客户端直接无法加载。

## `:workspace` built-in 的真实边界

[`FileSystemSandboxPolicy::workspace_write()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/protocol/src/permissions.rs#L574-L627) 构造的策略可以概括为：

```text
:root                    read
:workspace_roots         write
:slash_tmp               write（除非显式排除）
:tmpdir                  write（除非显式排除）
:workspace_roots/.git    read
:workspace_roots/.agents read
:workspace_roots/.codex  read
+ 配置的额外 writable roots
```

这比“只能写 cwd”更准确：有效 workspace root 可以有多个，临时目录通常也可写；同时 writable root 内有受保护 carve-out。

## 为什么保护 `.git`、`.agents` 与 `.codex`

固定源码把三者列为 [`PROTECTED_METADATA_PATH_NAMES`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/protocol/src/permissions.rs#L22-L31)：

| 路径 | 写入可能改变什么 |
| --- | --- |
| `.git` | hooks、config、refs、index 与后续 Git 行为。 |
| `.agents` | Agent 发现和项目级指令 / 技能入口。 |
| `.codex` | Codex 项目配置、行为与权限输入。 |

在一个 writable root 里写这些目录，不只是“修改仓库文件”，还可能改变 Harness 下一轮的可信控制输入。

protected metadata 有两道防线：

1. direct tool 在执行前可通过 [`forbidden_agent_metadata_write()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/protocol/src/permissions.rs#L40-L70) 拒绝写入；
2. 平台 Sandbox 把这些子路径从 writable root 中重新 carve 成只读。

若用户在 profile 中为具体 metadata path 写出显式 write rule，策略可以有意覆盖默认保护；这必须被理解为显式扩大信任，而不是 workspace-write 的默认行为。

### `.git` 可能是 pointer file

Git worktree 或 submodule 中，`.git` 可能是指向真实 gitdir 的文件，而不是目录。固定源码会解析并保护对应真实 gitdir，避免只保护 pointer 本身却留下实际 metadata 可写；处理入口在 [`default_read_only_subpaths_for_writable_root()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/protocol/src/permissions.rs#L1601-L1649)。

这说明安全检查不能只做字符串 `path.starts_with(workspace)`。

## deny-read：不仅是“不写”

`read` carve-out 仍允许读取；`deny` 才是不可读。典型用途包括：

```text
~/.ssh
workspace 中的 **/*.env
生成的 credentials
管理员指定的秘密目录
```

固定源码的 [`ReadDenyMatcher`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/protocol/src/permissions.rs#L250-L345) 同时处理：

- 精确 deny roots；
- 路径的规范化与 symlink / canonical 候选；
- glob deny patterns；
- direct tool 的运行时读取检查。

若 deny glob 语法损坏，direct read 检查会 fail closed，即把读取视为禁止，而不是把配置错误变成秘密泄漏。

### Glob 的平台差异

macOS Seatbelt 可以把 glob 转为 regex rule。Linux / WSL2 和原生 Windows 对 unbounded `**` 通常需要在 Sandbox 启动前有界扫描并展开已存在的匹配项，因此配置提供 `glob_scan_max_depth`。

`限制`：启动前 snapshot 无法自动覆盖执行过程中才新出现的未知路径；direct tools 仍可用原始 matcher 检查，但 shell subprocess 的覆盖能力由平台后端决定。不要把三端的 glob 实现写成完全等价。

## Additional permissions 不能直接拼接未经检查的数据

每条命令可以在有效 profile 上请求一个 partial overlay。固定源码先调用 [`normalize_additional_permissions()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/sandboxing/src/policy_transforms.rs#L19-L70)：

- 规范化真实路径，同时保留有意义的 symlink 表达；
- 去重；
- 只允许 glob 用于 deny-read，不接受 glob write grant；
- 去掉空 overlay。

已有批准与新请求组合时，有两种不同运算：

```text
merge        → 合并已经有效的权限片段
intersection → 只保留“请求范围 ∩ reviewer 实际批准范围”
```

[`intersect_permission_profiles()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/sandboxing/src/policy_transforms.rs#L126-L196) 还会保留约束已接受 grant 的 deny entries，防止“批准一个可写目录”顺便删除里面原有的秘密文件 deny。

最终 [`effective_permission_profile()`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/sandboxing/src/policy_transforms.rs#L433-L520) 在不改变 enforcement owner 的前提下，合成文件与网络权限。

## 网络有两个不同的开关

这是本阶段最容易混淆的地方：

| 开关 | 回答的问题 |
| --- | --- |
| `NetworkSandboxPolicy::Restricted / Enabled` | Sandbox 是否允许命令拥有网络能力？ |
| `NetworkProxyConfig.enabled` 与 domains / mode | 是否启动并强制受控代理，以及代理允许访问什么？ |

[`NetworkSandboxPolicy`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/protocol/src/permissions.rs#L73-L88) 默认是 `Restricted`。而 [`NetworkProxyConfig`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/network-proxy/src/config.rs#L113-L166) 默认 `enabled = false`。

因此：

```text
开启 network proxy 不会自动授予 network capability
授予 network capability 也不一定启用 domain-filtering proxy
```

只有两侧配置共同满足，命令流量才会通过 managed proxy 按 domain / method policy 处理。

## Domain、HTTP mode 与本地访问

### Domain 冲突时 deny 胜出

[`NetworkDomainPermission`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/network-proxy/src/config.rs#L18-L97) 把 precedence 编码为：

```text
None < Allow < Deny
```

相同 pattern 同时出现 allow 与 deny 时，effective entry 是 deny。

### Limited 与 Full 是代理方法策略

[`NetworkMode`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/network-proxy/src/config.rs#L279-L299) 当前定义：

- `limited`：HTTP 只允许 `GET / HEAD / OPTIONS`；HTTPS CONNECT 需要 MITM 才能对内部方法执行同类策略；
- `full`：允许所有 HTTP methods，HTTPS CONNECT 可直接 tunnel。

这是代理层的“读式 / 完整网络操作”区别，不是 filesystem `read-only`。

### 默认不暴露本地桥接能力

本地 binding、private network 与 Unix socket 都可能成为越过域名 allowlist 的旁路，例如连接 Docker socket。默认配置：

```text
allow_local_binding = false
dangerously_allow_all_unix_sockets = false
proxy listener 绑定 loopback
```

非 loopback proxy 地址会被 clamp 回 `127.0.0.1`，除非显式开启危险选项；Unix socket proxying 启用时仍强制 listener 回到 loopback。实现见 [`config.rs`](https://github.com/openai/codex/blob/757c151a0e920c6238801866a3d13e010dfeddb8/codex-rs/network-proxy/src/config.rs#L300-L370)。

“允许联网”不能自动推导为“允许监听局域网端口”或“允许任意 Unix socket”。

## 原生 Windows 的重要 deny-read 限制

`文档/限制`：当前官方 managed configuration 文档明确说明：原生 Windows 的 managed deny-read 会作用于 direct file tools，但 shell subprocess reads 不使用这条 Sandbox rule。

这意味着在原生 Windows 上：

```text
direct read_file(secret) → 可以由 managed deny-read 拒绝
shell: type secret       → 不能把同一规则视为已等价覆盖
```

因此需要 shell subprocess 级秘密隔离时，不能只依赖这条原生 Windows managed deny-read；应使用更强的外部环境隔离、ACL / 账户边界或避免把秘密挂载进环境。这里必须标注平台限制，不能写成“已经全覆盖”。

## 一张策略检查表

对任意资源请求依次问：

1. 当前 canonical profile 是 `Managed`、`Disabled` 还是 `External`？
2. `:workspace_roots` 已绑定到哪些绝对路径？
3. 目标路径匹配的最具体 entry 是 read、write 还是 deny？
4. 是否命中 protected metadata、symlink target 或 `.git` pointer 的真实位置？
5. additional permissions 是否经过审批、规范化和 intersection？
6. network capability 是否 Enabled？
7. managed proxy 是否启用，domain、method、local binding、Unix socket policy 是什么？
8. 当前平台能否完整表达该规则，有没有已知限制？

## 30 秒复述

1. 文件规则冲突时，deny、write、read 的优先级是什么？
2. `:workspace` 为什么不是“仓库里全部可写”？
3. deny-read glob 损坏时，direct tool 为什么要 fail closed？
4. network policy 与 network proxy 为什么必须分开理解？
5. 原生 Windows managed deny-read 的 subprocess 限制是什么？

## 当前证据边界

- `源码`：固定 commit 的 path resolution、workspace policy、protected metadata、deny matcher、additional permission transforms 与 proxy config 已静态核对。
- `文档`：named profile、domain policy 与原生 Windows managed deny-read 限制来自当前官方 Codex 文档。
- `限制`：deny-read glob 与 shell subprocess enforcement 具有平台差异，不能把 direct tool checks 代替 OS 后端验证。
- `未验证`：没有对固定 commit 运行真实文件、网络、symlink、Git worktree 或三平台 deny-read 实验。

## 下一步

最后一课使用安全探针串起配置、审批与 Sandbox denial，并明确区分已静态验证、可复现实验步骤和仍未验证的三平台结果。
