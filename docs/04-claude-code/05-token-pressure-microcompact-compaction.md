# 第 5 课：Token 压力、Microcompact 与 Compaction

[返回本阶段目录](README.md) · [上一课](04-skills-attachments-dynamic-context.md) · [官方 Context 文档](https://code.claude.com/docs/en/context-window) · [课程实验](../../examples/04-claude-code/05-compaction/index.mjs)

## 核心问题

Context 接近上限时，Claude Code 先丢什么、后总结什么？Compaction 为什么不仅是“让模型写一段摘要”？

## 三个不同动作

| 动作 | 改变什么 | 目的 |
| --- | --- | --- |
| Tool-result budget / snip | 限制或删除超大、中间范围 observation | 先消除局部膨胀 |
| Microcompact | 清理旧的、可重新取得的 Tool results | 保留对话结构，释放低价值 token |
| Compaction | 用结构化 summary + boundary 重建后续 Context | 跨过整体历史过长的问题 |

`文档`：[官方工作原理](https://code.claude.com/docs/en/how-claude-code-works#when-context-fills-up)说明系统会先清理较旧工具输出，必要时再总结会话。

## 触发阈值不是窗口上限

`源码`：[`autoCompact.ts`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/compact/autoCompact.ts#L28-L90)会为摘要请求和继续工作预留 token，因此自动压缩阈值必须早于硬上限。

如果等到输入刚好塞满才开始摘要，摘要请求本身就没有输出空间。

`源码`：[自动压缩路径](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/compact/autoCompact.ts#L241-L350)优先考虑 Session Memory，并为连续失败设置 circuit breaker。原因是：

```text
超大单条 observation
  → compact
  → summary 后仍超限
  → 再 compact
  → 若无 breaker，会形成昂贵死循环
```

## Query 中的压力处理顺序

`源码`：[query 的 Context 压力链](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/query.ts#L365-L468)大致经过：

```text
tool-result budget
  → history snip
  → microcompact
  → context collapse
  → autocompact
```

这体现一个通用原则：先处理局部、可逆、低语义损失的内容，再用全局有损摘要。

## Microcompact 保留什么

`源码`：[`microCompact.ts` 的可清理工具集合](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/compact/microCompact.ts#L40-L50)不是任意消息；[清理旧 Tool results](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/compact/microCompact.ts#L422-L517)仍会至少保留近期结果。

旧文件读取通常可重读，旧测试日志可能已被新测试覆盖；但最近一次失败原因或刚读取的目标文件仍是下一步决策的重要证据。

## Compaction 是重建协议

`源码`：[正式 compact](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/compact/compact.ts#L400-L491)先运行 PreCompact hooks，再发起独立摘要请求。

摘要 Prompt 要求保存[用户意图、文件修改、错误、待办和当前工作](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/compact/prompt.ts#L61-L143)。生成后还会：

- 清理旧读取缓存。
- 在预算内重新读取少量近期文件。
- 恢复 Plan、Skills、异步 Agent、动态 tools 和 MCP 信息。
- 构造 compact boundary、summary 和新的 attachments。

对应源码见[恢复运行信息](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/compact/compact.ts#L517-L624)和[新 Context 构造](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/compact/compact.ts#L633-L748)。

因此好摘要不是“聊天纪要”，而是 continuation checkpoint：

```text
目标 + 已作决策 + 真实修改 + 验证证据 + 失败原因 + 未完成工作
```

## 实验

```bash
node examples/04-claude-code/05-compaction/index.mjs
```

`实验`：脚本先替换旧 Tool results，再生成包含四类 invariant 的 summary。

故意删除 `verification` 字段重新运行，观察 invariant 检查失败。思考：如果摘要只写“修好了 auth”，恢复后的 Agent 会缺哪类证据？

## 本课结论

- `文档`：Claude Code 先清旧工具输出，再在需要时总结历史。
- `源码`：自动阈值必须为摘要和后续工作预留 token。
- `源码`：Compaction 还会恢复近期文件、Plan、Skills、Agents、Tools 和 MCP 运行信息。
- `结论`：Compaction 是有损 Context checkpoint；transcript boundary 与摘要内容同样重要。
- `限制`：某些 microcompact / context collapse 路径受 build 或 feature gate 控制，不能假定所有公开版本完全相同。
