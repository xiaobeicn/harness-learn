# 第 4 课：Skills、Attachments 与动态 Context

[返回本阶段目录](README.md) · [上一课](03-system-prompt-claudemd-project-instructions.md) · [官方 Context 文档](https://code.claude.com/docs/en/context-window) · [官方 Skills 文档](https://code.claude.com/docs/en/skills) · [课程实验](../examples/04-claude-code/04-context-admission/index.mjs)

## 核心问题

一个 Harness 为什么不能把所有可能有用的信息都塞进启动 Prompt？Claude Code 如何通过描述、attachment 和按需加载控制 Context 成本？

## Context admission，而不是字符串拼接

把候选信息按生命周期分类更准确：

| 生命周期 | 内容 | 何时出现 |
| --- | --- | --- |
| 基线常驻 | System prompt、环境、根 CLAUDE.md、Memory 入口 | 会话开始 |
| 可发现 | Skill / Agent / MCP tool 的名称和短描述 | 启动或能力变化 |
| 路径触发 | nested CLAUDE.md、conditional rules / skills | 访问匹配路径后 |
| 调用触发 | 完整 Skill body、具体 MCP schema | 真正调用或搜索时 |
| 一次性 observation | 文件内容、命令输出、Hook additional context | 某次工具或事件后 |
| 可替换 | 旧 Tool results、已被摘要覆盖的细节 | token 压力时清理 |

`文档`：[官方 Context 页面](https://code.claude.com/docs/en/context-window)说明 Skill 在启动时主要贡献描述，完整内容在调用时加载；MCP tools 默认可延迟加载具体 schema。

## Skill 的渐进披露

`源码`：[`getSkillsPath()`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/skills/loadSkillsDir.ts#L67-L94)区分 managed、user、project 和 plugin 来源；[`SKILL.md` 目录格式](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/skills/loadSkillsDir.ts#L405-L470)读取 frontmatter 与正文。

`源码`：[frontmatter parser](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/skills/loadSkillsDir.ts#L185-L264)支持：

- description / when-to-use。
- allowed tools。
- model / effort。
- hooks。
- `context: fork` 和指定 agent。
- user / model invocation 控制。

启动时只需要让模型知道“存在什么能力、何时用”。Skill 真正被调用后，正文才以 meta user message 进入会话。这样用少量 discovery token 换取大块知识的按需加载。

## Attachments 是运行时 Context 总线

Attachment 不只代表用户上传文件。它还可承载：

- nested CLAUDE.md。
- 动态 agent / tool listing delta。
- Hook 返回的 additional context。
- 异步 Agent 通知。
- compaction 后需要恢复的运行信息。

`源码`：[nested CLAUDE.md attachment](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/attachments.ts#L1691-L1775)会根据已经加载的路径去重。它把“运行中刚发现的新规则”变成下一轮模型可见 observation。

## Context 稳定性与 Prompt Cache

越靠前、越稳定的块越适合缓存；动态能力列表若直接重写 System prompt，容易让后续缓存前缀失效。因此设计上常把变化内容放到后续 attachment：

```text
稳定 system prefix
  + 稳定 tool prefix / deferred names
  + chronological conversation
  + dynamic attachment deltas
```

这不是单纯的 token 优化，还影响延迟和成本。加入一个插件、连接一个 MCP server 或加载一个 Agent，最好只让必要的 Context 区段变化。

## Admission 的三个判断

每条信息进入模型前问：

1. **相关性**：本轮决策真的需要吗？
2. **新鲜度**：它是否被当前代码、Git 或新 observation 推翻？
3. **可恢复性**：清掉后能否用工具重新取得，还是必须摘要保留？

`结论`：Context management 的核心不是最大化“知道”，而是在固定窗口中最大化下一次决策的有效信息密度。

## 实验

```bash
node examples/04-claude-code/04-context-admission/index.mjs
```

`实验`：脚本在固定预算下按优先级接纳基线、指令和路径规则，把旧 tool output 与完整 Skill body 推迟或清理。

修改预算为 80，观察最先掉出的内容。再把 `old tool output` priority 提高到 99，解释这为何可能造成长期会话“刚 compact 又立刻满”。

## 本课结论

- `文档`：Skill 描述和完整正文采用渐进披露，MCP schema 也可延迟。
- `源码`：Skill 有来源、工具、模型、Hook 和执行上下文等 frontmatter 契约。
- `源码`：Attachments 把运行时发现的指令与状态增量注入后续轮次。
- `结论`：高质量 Harness 必须管理信息生命周期，而不只是拼接 Prompt。
- `限制`：实验使用显式 priority；真实实现由多个专门机制共同决定，没有一个统一数字排序器。
