# 来源版本更新（2026-09-07）

[返回首页](README.md) · [可机读版本清单](source-versions.json)

6 个既有来源已执行 fetch 核验；5 个干净源码工作区以 `--ff-only` 更新，Claude Code 非官方还原源无新提交。选择的是核验时各自默认跟踪分支的 HEAD，包含开发版/预发布版，不等同最新稳定发行版。

| 来源 | 初版 commit | 当前 commit | 当前版本标识 | 对应文档 |
| --- | --- | --- | --- | --- |
| pi-mono | `588915e` | [`9767ba2`](https://github.com/badlogic/pi-mono/tree/9767ba275f3e9a5ee0f5c5342249b629ab1b2282) | pi-agent-core 0.85.1 | [学习补充](01-pi-mono/source-update-2026-09-07.md) |
| opencode | `2f17fc9` | [`57ef382`](https://github.com/anomalyco/opencode/tree/57ef3828431790c53f8f333c7ffbfe88770a1812) | opencode 1.18.29 | [学习补充](02-opencode/source-update-2026-09-07.md) |
| codex | `757c151` | [`5ecb3af`](https://github.com/openai/codex/tree/5ecb3afd1bf405149e2159bfda50093b0c1b5fab) | 开发分支，以 commit 固定 | [学习补充](03-codex-cli/source-update-2026-09-07.md) |
| claude-code | `b78dd22` | [`b78dd22`](https://github.com/pengchengneo/Claude-Code/tree/b78dd22a091b717c8938ab98c736bc04825a8ee8) | 还原快照未更新；官方公开变更记录 2.1.263 | [学习补充](04-claude-code/source-update-2026-09-07.md) |
| prime-agent | `71ca6cf` | [`b9cf467`](https://github.com/PrimeIntellect-ai/prime-agent/tree/b9cf467edf8bbbd8e607991cf770407d62daa8ec) | 0.9.3；Python runtime 0.1.0 | [学习补充](05-prime-agent/source-update-2026-09-07.md) |
| deepseek-harness | `47f9438` | [`d347e70`](https://github.com/deepseek-ai/deepseek-harness/tree/d347e703908d0406b7a7ef80e3a0e594d86b2215) | 0.1.3-alpha.1 | [学习补充](06-deepseek-harness/source-update-2026-09-07.md) |

Claude Code 的公开功能另以 [Anthropic 官方 changelog](https://github.com/anthropics/claude-code/blob/ab9b2cf7bb9e4f98ff264c07a22e46d83c29c558/CHANGELOG.md) 固定到 `ab9b2cf7bb9e4f98ff264c07a22e46d83c29c558`，最新条目为 2.1.263。公开发行记录和非官方还原源码分别标注，不能用其中一个替代另一个。

## 本次重点

- Pi Mono：下一轮准备钩子时机、取消/重置约束；新增 durable Harness/Lane 进阶方向，并列出未完成项。
- OpenCode：完整条目压缩、累积摘要、请求归属、TUI 时间排序与部分 V2 配置兼容。
- Codex：审批类型迁移、终端后续输入审批、执行器路径归属、IPC/终端注入加固与同步/异步审核区别。
- Claude Code：公开 Skills/Context 诊断、恢复上下文、早期取消、路径规则修复和 headless 扩展入口。
- Prime Agent：CPython REPL/JSONL 替代 Jupyter，spawn ledger、Worker 直连、continuation、refine hook 与 generic MCP。
- DeepSeek Harness：Session v2、实时/持久流分离、迁移链、writer lease、semantic checkpoint、PTC、实验 Python/Teams 与附件。

## 如何读新版教材

先看各阶段 README 的当前版本和学习补充，再读原课。受影响课程开头列出新行为；旧正文和行级 permalink 作为初版的完整推导保留。新结论使用新 commit 的文件链接，避免替换 SHA 后使旧行号指向无关代码。

本轮静态核验覆盖课程方向及关联新增能力，不声称逐行审计每个上游改动，也不把尚未实现的设计或实验 profile 写成普遍可用功能。最小教学示例未改变；其原实验日期与运行范围继续有效，本次没有重新验证真实上游运行行为。

## 复现与后续更新

`sources/` 被根 `.gitignore` 忽略，不随学习笔记提交；版本由 `source-versions.json` 保存。首次复现可从清单的 repository 克隆到 path，再 checkout 指定完整 commit。已有工作区先检查未提交修改，fetch 后核对差异，再选择更新目标；不要强制 reset 覆盖本地内容。

后续更新应一并核对：包版本/工具链、课程引用文件、行为与 feature gate、相关测试源码、跨项目对照和术语。固定完整 commit，不能只保存移动的 main/dev/master 分支名。

+
+## 本轮验证记录
+
+- 6 个源码 HEAD 均与清单及本次 fetch 的远端跟踪分支一致，源码工作区保持干净。
+- 检查 73 份 Markdown、450 个本地链接和 247 个唯一固定源码文件引用；路径及源码行号范围检查通过，修正了 7 处初版越界行号锚点。
+- Markdown 代码围栏、版本 JSON 和 `git diff --check` 通过。
+- 未修改教学示例实现；未运行上游构建、应用或模型调用。
+