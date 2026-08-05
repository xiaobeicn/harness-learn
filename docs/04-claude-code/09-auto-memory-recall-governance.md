# 第 9 课：Auto Memory、Recall 与长期知识治理

[返回本阶段目录](README.md) · [上一课](08-permissions-hooks-bash-sandbox.md) · [官方 Memory 文档](https://code.claude.com/docs/en/memory) · [课程实验](../../examples/04-claude-code/09-memory-policy/index.mjs)

## 核心问题

Memory 与 CLAUDE.md、Session transcript、Compaction summary 有什么区别？哪些信息值得跨会话保存，哪些信息保存后反而会污染未来决策？

## 四种持久信息不要混为一谈

| 机制 | 谁写 | 生命周期 | 适合内容 |
| --- | --- | --- | --- |
| CLAUDE.md / rules | 人或团队 | 版本化、每次会话 | 稳定规范和明确指令 |
| Session transcript | Runtime | 单会话、可 resume | 完整消息、工具和分支事实 |
| Compaction summary | 模型 + Harness | 当前会话后半段 | continuation 所需压缩状态 |
| Auto Memory | 后台提取 Agent / Claude | 跨会话 | 不易从项目重新推导的学习 |

`结论`：Memory 是跨会话 Context 的候选缓存，不是 transcript 的替代品，也不是偷偷修改项目规则的地方。

## 存储布局

`源码`：[`paths.ts`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/memdir/paths.ts#L21-L55)根据环境、bare mode、remote storage 和 settings 决定是否启用；默认根位于 [`~/.claude`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/memdir/paths.ts#L79-L90)。

`源码`：[项目 Memory 使用 canonical Git root](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/memdir/paths.ts#L198-L235)，让同一仓库的多个 worktree 共享项目知识；入口为 [`memory/MEMORY.md`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/memdir/paths.ts#L253-L259)。

## 两级结构与启动预算

`源码`：[`MEMORY.md` 最多加载 200 行、25 KB](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/memdir/memdir.ts#L34-L103)。这与官方文档公开说明一致。

为了避免入口无限增长，采用：

```text
MEMORY.md
  ├─ 少量高价值事实
  └─ topic header / index
       ├─ build.md
       ├─ auth.md
       └─ user-preferences.md
```

`源码`：[topic file + MEMORY.md index](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/memdir/memdir.ts#L205-L234)将“启动必须知道”和“按需回忆”分开。

## Memory 类型与写入准则

`源码`：[四种 Memory 类型](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/memdir/memoryTypes.ts#L14-L21)是：

- user：稳定偏好。
- feedback：用户对 Agent 行为的纠正。
- project：非显然的项目知识。
- reference：未来可能复用的外部事实。

`源码`：[治理规则](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/memdir/memoryTypes.ts#L180-L202)明确反对保存可从代码、Git 或 CLAUDE.md 推导的信息，并要求当前 observation 优先于陈旧 Memory。

不应保存：

- 当前 branch、git status、文件内容。
- package.json 已经明确记录的命令。
- 临时 todo 和尚未证实的猜测。
- secrets、token 或用户未授权的敏感信息。
- 已写在 CLAUDE.md 的重复规则。

## Recall 不是把所有 Topic 塞回来

`源码`：[`findRelevantMemories.ts`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/memdir/findRelevantMemories.ts#L18-L75)使用 side query 从 topic headers 中最多选择 5 个相关 Memory。

这形成检索链：

```text
当前任务
  → 读取轻量 topic headers
  → side query 选择少量相关 topic
  → 按需加载正文
  → 当前 observation 可推翻旧记录
```

## 谁负责提取

`源码`：[后台 fork Agent](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/extractMemories/extractMemories.ts#L329-L427)在有限 turns 内提取 Memory；[只对主 Agent 执行](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/extractMemories/extractMemories.ts#L527-L566)，避免每个 subagent 重复写入和放大噪声。

Memory extraction 本身仍是模型判断，所以必须允许用户通过 `/memory` 审计、编辑和删除。

## 实验

```bash
node examples/04-claude-code/09-memory-policy/index.mjs
```

`实验`：候选知识中，能从代码或 Git 推导的条目被拒绝；其余条目进入 MEMORY.md 索引与 topic。

增加一条“我猜线上数据库偶尔丢连接”，思考在没有 observation 时为什么不该持久化。

## 本课结论

- `文档/源码`：MEMORY.md 启动加载有 200 行 / 25 KB 上限。
- `源码`：canonical Git root 让 worktrees 共享项目 Memory。
- `源码`：入口索引与 topic files 支持有限 Context 下的按需 recall。
- `源码`：可从代码、Git、CLAUDE.md 推导的信息不应写入 Memory；新 observation 优先。
- `限制`：Memory 是模型提取结果，可能陈旧或错误，必须可审计，不能成为不可见 policy。
