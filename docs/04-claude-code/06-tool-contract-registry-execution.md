# 第 6 课：Tool Contract、注册、并发与结果回灌

[返回本阶段目录](README.md) · [上一课](05-token-pressure-microcompact-compaction.md) · [官方 Tools 说明](https://code.claude.com/docs/en/how-claude-code-works#tools) · [课程实验](../../examples/04-claude-code/06-tool-executor/index.mjs)

## 核心问题

模型输出一个 `tool_use` 后，怎样经过工具发现、输入校验、Hook、Permission、执行和 result 标准化？为什么 Tool contract 不只是 JSON Schema？

## Tool contract 的完整面

`源码`：[`Tool.ts`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/Tool.ts#L362-L503)中的契约覆盖：

- 名称、描述、input / output schema。
- `call()` 与结果映射。
- 是否 concurrency-safe。
- 是否只读、是否有破坏性。
- permission check 与用户交互要求。
- 延迟发现 / 延迟加载。
- 结果大小和持久化策略。

`源码`：[大结果可落盘](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/Tool.ts#L456-L466)，而 Read 等工具可选择不采用同一持久化方式。Context 中的 tool result 和磁盘上的完整 output 可能不是同一个大小。

## 注册表决定“模型能看见什么”

`源码`：[Base tools](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools.ts#L193-L250)只是候选集合。

真正发送前还要：

1. 根据 build、模式和环境判断 `isEnabled()`。
2. 应用 blanket deny，避免把已禁用工具暴露给模型。
3. 合并 built-in 与 MCP tools。
4. 排序、按名称去重。
5. 对 deferred tools 只保留可发现信息。

对应见[deny 过滤](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools.ts#L253-L327)和[统一组装](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools.ts#L329-L367)。

`结论`：工具“存在于代码中”、当前 Harness “已注册”、本轮“发送给模型”是三种不同状态。

## 一次调用的顺序

```text
tool_use(name, input)
  → lookup / alias compatibility
  → Zod schema + tool-specific validation
  → PreToolUse hooks（可改 input / 决定权限 / 阻止）
  → Permission decision
  → tool.call()
  → 标准化 success / error tool_result
  → PostToolUse hooks
  → result 写回 Context
```

`源码`：[lookup 与未知工具错误](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/tools/toolExecution.ts#L337-L490)把错误也变成真实 Tool result；[schema 和 tool-specific validation](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/tools/toolExecution.ts#L599-L733)发生在副作用前。

`源码`：[PreToolUse hooks](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/tools/toolExecution.ts#L795-L930)先于最终权限决策；[只有获准后](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/tools/toolExecution.ts#L1206-L1223)才调用 `tool.call()`。

## Deny 也必须回灌

`源码`：[Permission deny](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/tools/toolExecution.ts#L995-L1104)会构造 `is_error: true` 的 `tool_result`。

这让模型知道：

- 该动作没有发生。
- 拒绝原因是什么。
- 是否可换用更窄的动作，或应向用户解释阻塞。

如果 UI 只弹拒绝框但不把拒绝写回模型 Context，模型很可能继续假设工具成功。

## 并发的正确单位

同一 assistant message 可有多个 tool calls，但 executor 仍要按照 contract 分组：

- 多个只读、concurrency-safe 工具可并发。
- 非安全工具前先 drain 并发组，再独占执行。
- 结果必须按 tool use ID 对应，不靠完成时间猜测。

## 实验

```bash
node examples/04-claude-code/06-tool-executor/index.mjs
```

`实验`：Read 与 Search 并发，Write 等待它们结算；未知工具返回 error result，而不是抛出后让整个 Runtime 消失。

给 `write` 输入空对象，观察 validation result。然后把它错误标记为 `concurrent: true`，解释现实系统中可能出现的 stale read / lost update。

## 本课结论

- `源码`：Tool contract 同时描述 schema、执行、并发、权限、风险和结果策略。
- `源码`：候选工具还要经过模式过滤、deny、MCP 合并和去重，才成为本轮模型可见集合。
- `源码`：PreToolUse → Permission → `tool.call()` 是关键顺序。
- `结论`：标准化 error result 是 Agent 自我纠错的一部分，不是 UI 附属功能。
- `限制`：不同工具有专用验证和授权逻辑，不能把 Bash 的规则机械套到所有 Tool。
