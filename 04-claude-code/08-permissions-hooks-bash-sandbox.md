# 第 8 课：Permission、Hooks、Bash 分类器与 Sandbox

[返回本阶段目录](README.md) · [上一课](07-session-transcript-resume-fork-rewind.md) · [官方 Permission Modes](https://code.claude.com/docs/en/permission-modes) · [官方 Sandboxing](https://code.claude.com/docs/en/sandboxing) · [课程实验](../examples/04-claude-code/08-safety-layers/index.mjs)

## 核心问题

Claude Code 的 allow / deny / ask、Permission mode、Hook、Bash 语义检查和 OS Sandbox 分别控制什么？它与第三阶段 Codex 的默认安全架构有什么区别？

## 四层安全链

```text
模型提出动作
  → PreToolUse Hook：组织策略、改 input、阻止或提供上下文
  → Permission：deny / ask / allow 与 mode
  → Tool-specific safety：命令、路径、只读性、危险语义
  → OS Sandbox：已启动进程真正可访问的文件和网络
```

任何一层都不能替代其他层。

## Rule 与 Mode

`源码`：[settings schema](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/settings/types.ts#L39-L70)支持 `allow`、`deny`、`ask` rules 和 default mode。

`文档`：公开 modes 包括 default / manual、acceptEdits、plan、dontAsk、bypassPermissions；部分版本还有 Auto mode。不要根据还原源码中的内部 mode 推断所有账户都可用。

`源码`：[权限主线](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/permissions/permissions.ts#L1158-L1318)的关键优先级：

1. 整个 Tool deny。
2. 整个 Tool ask。
3. Tool-specific permission。
4. 用户交互、content-specific ask 和 safety checks。
5. bypass / allow mode。
6. 整个 Tool allow。
7. 未决 passthrough 转为 ask。

显式 deny、content-specific ask 和保护路径 safety check 不应被普通 bypass 顺序无意覆盖。

## Hook 不是 OS Enforcement

`源码`：[PreToolUse](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/tools/toolExecution.ts#L795-L930)可：

- 返回消息或 additional context。
- 修改 input。
- 给出 permission decision。
- 阻止 continuation。

随后仍要解析最终 Permission；[拒绝会回写 error tool result](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/tools/toolExecution.ts#L995-L1071)。

Hook 是可编程控制面。若允许的 shell 进程在宿主权限下运行，Hook 本身不能阻止它利用操作系统权限做额外事情。

## Bash 不是字符串前缀匹配

`源码`：Bash rules 同时处理 exact、prefix、compound commands、wrapper、环境变量、路径和命令语义。

例如：

- deny rule 匹配时会剥离更多 env prefix，避免 `FOO=bar denied_command` 绕过。
- allow rule 不能同样宽松地剥离所有环境变量，否则 `DOCKER_HOST=evil docker ps` 可能错误继承 allow。
- [deny / ask 在路径约束前检查](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/BashTool/bashPermissions.ts#L1050-L1122)。
- [allow、mode 和 read-only](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/BashTool/bashPermissions.ts#L1124-L1169)也有明确顺序。

`结论`：Shell permission parser 本身是安全敏感组件；简单 `startsWith()` 不足以处理 shell 语言。

## Sandbox 是独立、可配置的 enforcement

`源码`：[`convertToSandboxRuntimeConfig()`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/sandbox/sandbox-adapter.ts#L167-L220)从 settings 和 permissions 提取网络域；[filesystem config](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/sandbox/sandbox-adapter.ts#L222-L380)组合 allow / deny read-write，并额外保护 settings、skills 和 Git 相关路径。

`源码`：[Sandbox 是否启用](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/sandbox/sandbox-adapter.ts#L528-L591)还取决于设置、平台和依赖；若用户明确要求 Sandbox 但不可用，应该给出原因，而不是静默制造安全错觉。

`文档/限制`：Claude Code 的本地模式可以直接继承用户机器能力；Sandbox 是可配置加固。Codex CLI 第三阶段研究的是更强的“canonical permission profile → 平台 Sandbox”默认主线，不能把两者等同。

## 实验

```bash
node examples/04-claude-code/08-safety-layers/index.mjs
```

`实验`：这是纯决策模拟器，不执行任何命令。它展示显式 deny 胜过 Hook allow，而网络 Sandbox denial 与“是否获准启动”是不同结果。

不要把示例扩展成真实 `rm` 探针。若要实验 Sandbox，使用第三阶段的 disposable 目录和无敏感数据方法。

## 本课结论

- `源码`：deny / ask、Tool safety 和保护路径先于普通 bypass / allow。
- `源码`：PreToolUse Hook 在 Permission 前运行，但不是 OS Sandbox。
- `源码`：Bash rules 需要理解 compound command、wrapper、env 和路径语义。
- `源码/文档`：Sandbox 是独立可配置的文件 / 网络 enforcement，启用还受平台与依赖影响。
- `限制`：source map 快照含内部 classifier 分支；课程只把官方文档公开的 modes 当产品契约。
