# Claude Code 来源核验与公开功能补充（2026-09-07）

[返回本阶段](README.md) · [全部来源版本](../source-updates.md)

本次基线：`b78dd22 → b78dd22`，还原快照未更新；官方公开变更记录 2.1.263。更新的是核验时上游 `main` 分支 HEAD；包版本相同也不代表提交相同。以下 `源码` 指新 commit，`文档` 指对应上游说明，`学习推论` 不作为运行结果。

## 两类来源分别固定

非官方 source-map 还原仓库仍是 `b78dd22`，本次 fetch 没有新提交。其 `999.0.0-restored` 只是恢复工程的 package 占位值，不能映射到当前 Claude Code 发行版本。

新增公开版本证据：[Anthropic 官方 CHANGELOG](https://github.com/anthropics/claude-code/blob/ab9b2cf7bb9e4f98ff264c07a22e46d83c29c558/CHANGELOG.md)，固定 commit `ab9b2cf7bb9e4f98ff264c07a22e46d83c29c558`，核验时首个版本为 **2.1.263**。2.1.263 只笼统记载可靠性修复，以下具体功能来自同一文件的 2.1.261、2.1.260 条目。它们是官方发布说明，未从旧还原源码验证，也没有运行验证。

## Context 与 Skills：预算需要可观察

`文档`：2.1.261 新增 `bashOutputMaxChars`、`taskOutputMaxChars`，可提高命令和后台任务输出内联上限，最多 128K 字符；其余内容保存到文件。字符数不等于 token 数，增大上限会改变下一轮 Context 压力。

同版新增 `/skill-doctor`，用于观察已加载 Skills 的使用情况与 Context 成本。2.1.260 的 `/cost` 与 status line 增加 prompt-cache miss 的可能原因，例如 system prompt、tool definitions 改变或 TTL 到期。这些是诊断信号，不是模型正确性证明。对应第 4、5、12 课。

## Session 与输入：恢复必须还原实际请求

`文档`：2.1.261 修复 resume 丢失并行工具调用附近的 hook 输出和其他 Context；也修复 SDK/cloud 在首条 prompt 已提交、turn 尚未启动时忽略 Stop/interrupt。

`学习推论`：恢复测试应比较模型请求中的消息和 hook context，而不只检查聊天文本是否出现；取消测试应覆盖 admitted-but-not-started 窗口。对应第 2、6、7 课。不能认为旧 source-map 快照已经包含这些修复。

## Safety：规则解释与远程状态

`文档`：2.1.260 修复含括号路径的 Read/Edit/Write permission rules 被忽略、Bash sandbox 未执行相应写保护，以及 zsh 特殊赋值隐藏 command substitution 被错误放行的问题。

2.1.261 修复 Remote Control 展示陈旧 permission mode；`/status` 和 `claude doctor` 增加 Organization policy 加载失败原因。策略是否成功加载、UI 显示与宿主执行一致，都是权限验证的一部分。对应第 8、11 课。

## Subagent 与扩展入口

`文档`：2.1.261 增加 `--append-subagent-system-prompt-file`；2.1.260 为 headless/SDK 增加 `/reload-plugins`，并提供 `/advisor` 文本入口。文件输入解决命令行长度问题，不扩大子 Agent 的授权；reload 的公开可用性也不等于旧快照里的插件生命周期已同步变化。对应第 3、10、12 课。

本次没有新的还原实现可用于证明 Auto Memory 或 Agent Teams 内部架构变化，第 9、11 课保留原内部证据版本。所有公开能力仍可能受产品版本、组织策略与运行 surface 影响。

## 验证边界

本轮完成版本、差异、实现与引用的静态核对；没有安装或运行上游应用、调用真实模型或重跑上游测试。原课程实验记录保留原日期，独立示例仍是教学模型，不是当前上游的兼容性测试。
