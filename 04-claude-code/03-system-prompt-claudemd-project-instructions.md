# 第 3 课：System Prompt、CLAUDE.md 与项目指令

[返回本阶段目录](README.md) · [上一课](02-input-admission-and-agent-loop.md) · [官方 Memory 文档](https://code.claude.com/docs/en/memory) · [课程实验](../examples/04-claude-code/03-instruction-precedence/index.mjs)

## 核心问题

Claude Code 怎样区分产品级 System prompt、运行环境、用户 / 项目指令和 Memory？访问嵌套目录时，为什么 Context 还能继续增长？

## 三个不同通道

`源码`：[`QueryContext`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/queryContext.ts#L30-L73)把三类内容分开：

| 通道 | 典型内容 | 进入模型的位置 |
| --- | --- | --- |
| System prompt | 核心行为、工具规则、产品约束 | API system 参数 |
| System context | cwd、平台、Git 快照、运行环境 | 追加到 system prompt |
| User context | CLAUDE.md、rules、Memory、日期等 | messages 前缀 |

`源码`：[System context](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/context.ts#L113-L150)包含会话开始时的 Git 快照；[User context](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/context.ts#L152-L188)包含 CLAUDE.md 聚合结果和日期。

`源码`：在 query 中，[System context 先追加到 System prompt](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/query.ts#L449-L460)，而[User context 作为消息前缀](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/query.ts#L659-L663)。它们不是一段巨大字符串。

## CLAUDE.md 发现顺序

`文档`：官方将 `CLAUDE.md` 定义为每次会话都应知道的持久项目或用户指令，并区分它与 Auto Memory。

`源码`：[`claudemd.ts` 的加载主线](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/claudemd.ts#L790-L1007)按以下类别发现内容：

```text
Managed instructions
  → User instructions
  → 从项目根到 CWD 的 Project / Local instructions
  → Auto Memory / Team Memory
```

识别的文件形态包括 [`CLAUDE.md`、`.claude/CLAUDE.md`、rules 和 local 文件](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/claudemd.ts#L886-L933)。

这里的“顺序”主要是 provenance 和拼装顺序，不应武断简化成“最后一条总能覆盖前面”。冲突解决还受具体提示文本、managed policy 和模型判断影响。

## Rules 与嵌套指令

项目很大时，把所有规则放在根 CLAUDE.md 会永久占用 Context。Claude Code 提供两种细化：

- `.claude/rules/*.md`：可通过 frontmatter 路径条件限制适用文件。
- 嵌套目录的 CLAUDE.md：只有访问相应路径时才需要注入。

`源码`：[按目标路径动态加载嵌套指令和 conditional rules](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/claudemd.ts#L1249-L1396)；[嵌套 CLAUDE.md 作为 attachment 注入并去重](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/attachments.ts#L1691-L1775)。

因此 Context 不是“会话开始时一次性冻结”：

```text
启动：根指令进入基线
读取 packages/api/...：发现 nested CLAUDE.md
下一轮：nested instructions 作为新 attachment 进入 Context
```

## 写 CLAUDE.md 的边界

适合：

- 项目长期约定、验证命令、架构边界。
- 每个参与者都必须遵守的高价值规则。
- 不能从代码轻易推导的团队约定。

不适合：

- 大篇 API 参考资料：改成 Skill，按需加载。
- 临时任务状态：留在 Session / Task。
- 当前分支、文件内容等可观测事实：让工具读取。
- 个人偶发偏好且不该提交：使用 user / local scope。

## 实验

```bash
node examples/04-claude-code/03-instruction-precedence/index.mjs
```

`实验`：同一基线分别访问根文件与 `packages/api/` 文件，后者新增 nested rule，但不会删除根规则。

扩展练习：把 `memory` 块移到最前，思考“存储来源顺序”和“语义优先级”是否是一回事。

## 本课结论

- `源码`：System prompt、System context 和 User context 是独立构件。
- `源码`：CLAUDE.md 按 managed、user、root-to-CWD project/local、Memory 分类装配。
- `源码`：嵌套指令和 conditional rules 会在访问目标路径后动态注入。
- `结论`：CLAUDE.md 是高频、持久 Context，不是知识仓库；越常驻，越应短而稳定。
- `限制`：模型面对冲突指令的最终行为不是简单的数组覆盖算法。
