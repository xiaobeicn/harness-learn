# 第 8 课：Approval、Filesystem、Shell 与跨平台 Sandbox

[返回本阶段目录](README.md) · [上一课](07-compaction-pruning-context-overflow.md) · [Sandbox 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/sandbox.md) · [Approval 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/approval.md) · [课程实验](../examples/06-deepseek-harness/08-safety-decision/index.mjs)

## 核心问题

用户允许一次操作、路径位于 workspace、命令经过 Sandbox runner，这三件事分别证明什么？哪一层才限制不可信子进程？

## SandboxMode

固定源码提供三种模式：

| 模式 | 文件效果语义 |
| --- | --- |
| `read-only` | 允许读取，拒绝受治理的写入。 |
| `workspace-write` | 允许 workspace 范围内写入。 |
| `danger-full-access` | 绕过 `ctx.sandbox` 的文件约束。 |

这套 vocabulary 只治理文件 effect，不表达网络或进程可见性的完整 policy。不能从 `workspace-write` 推导“网络已隔离”。

Policy 每次调用按以下优先级解析模式：

```text
explicit approved mode
  → session override
  → deployment default
```

Workspace root 默认来自 immutable Session cwd，避免运行中 cwd 漂移改变权限边界。Base bundle 默认组合是 `workspace-write + ask`；Sandbox policy service 自身的默认值不能脱离部署组合解读。

## Approval 是授权，不是隔离

Approval 结果包括：

- `allowed-once`；
- `rejected`；
- `cancelled`；
- `unavailable`。

交互策略是 `ask` 或 `never`。没有 answerer 时返回 unavailable 并 fail closed。asked / decided 形成 log-only audit pair。

批准只表示人同意这次规范化请求。它不会自动限制命令实际访问哪些文件，也不会让恶意子进程失去宿主权限。

## Filesystem containment

`fs-sandbox` 对 canonical path 做 workspace containment，是 trusted in-process guard。它不是 kernel security boundary，并接受祖先 symlink 的 TOCTOU 风险。

另一个独立 policy 是 observation：

| 动作 | 要求 |
| --- | --- |
| overwrite | 使用版本 CAS，防止覆盖新内容。 |
| edit | 必须先观察目标。 |
| 未读先改 | 返回 `FS_NOT_OBSERVED`。 |

这解决的是 Agent 对文件版本的认知一致性，不是攻击者隔离。

## Shell OS Runner

不可信命令必须通过平台 runner：

| 平台 | 固定版本 backend |
| --- | --- |
| Linux | 优先 bubblewrap，后 Landlock。 |
| macOS | Seatbelt / `sandbox-exec`。 |
| Windows | restricted token + ACL。 |

confined 模式必须得到 wrapped argv，否则 fail closed，绝不静默原样执行。Runner 会把自身失败、普通命令非零退出与 Sandbox denial 分开分类。

Enforcement 会明确报告 full 或 partial：Windows ACL 固定是 partial，较旧 Landlock ABI 也可能 partial。

## 四层安全判断

```text
Tool schema / policy  → 动作是否合法、参数是否有效
Approval              → 用户是否授权本次动作
FS observation        → Agent 是否基于已观察版本修改
OS Sandbox runner     → 启动后进程实际上最多能访问什么
```

任何一层都不能用 Prompt 或另一层的“允许”替代。

## 实验

```bash
node examples/06-deepseek-harness/08-safety-decision/index.mjs
```

`实验`：脚本解析 deployment、session 与 explicit mode，要求写操作同时通过 observation、Approval 与 platform runner；runner 缺失时显式拒绝 confined execution。

## 本课结论

- `源码/文档`：SandboxMode 描述文件 effect；网络与进程可见性不在这套三值 vocabulary 中。
- `源码`：Approval 缺少 answerer 时 unavailable 并 fail closed，不能替代 enforcement。
- `源码`：Filesystem containment 是应用内边界，Shell runner 才对不可信子进程施加 OS policy。
- `源码`：confined backend 不可用时失败，不静默降级；partial enforcement 会显式报告。
- `限制`：本地没有运行 bubblewrap、Landlock、Seatbelt 或 Windows backend，平台保证仍是源码 / 文档证据。

## 下一步

下一课研究长任务能力如何作为可选插件挂入核心 Loop，并区分 durable Session、process-local Activation、Job 与 Goal ownership。
