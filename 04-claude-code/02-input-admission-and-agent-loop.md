# 第 2 课：输入接纳与 Agent Loop

[返回本阶段目录](README.md) · [上一课](01-source-boundary-and-harness-map.md) · [官方工作原理](https://code.claude.com/docs/en/how-claude-code-works) · [课程实验](../examples/04-claude-code/02-agent-loop/index.mjs)

## 核心问题

用户输入进入 Claude Code 后，谁驱动“模型 → 工具 → 结果 → 模型”？一次模型调用、一次工具批次和一次 Agent turn 分别在哪里结束？

## 官方心智模型与实现心智模型

`文档`：官方把工作过程概括为 gather context、take action、verify results，并强调三者会反复交织。

实现层需要更精确：

```text
一次 query
  └─ queryLoop while(true)
       ├─ 准备本轮 Context
       ├─ 流式调用模型
       ├─ 收集 text / thinking / tool_use
       ├─ 有 tool_use：执行并生成 tool_result
       └─ 无 continuation：运行停止逻辑并结束
```

`源码`：[`State` 与 `queryLoop()`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/query.ts#L203-L307)分别保存跨模型轮次状态和驱动真正的 `while (true)`。

## 一次模型轮次

`源码`：[模型请求组装](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/query.ts#L659-L708)把 messages、system prompt 和可见 tools 交给模型流。

流中可能同时出现：

- 增量文本或 thinking。
- 一个或多个 `tool_use`。
- token usage、停止原因和错误。

`源码`：[流中发现 `tool_use`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/query.ts#L826-L845)就会标记 continuation，满足条件时还可提前启动工具。这说明 Harness 不必等完整 assistant message 全部结束才开始准备执行。

## Tool result 为什么是 continuation

`源码`：[工具执行阶段](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/query.ts#L1360-L1409)收集标准化 results；随后[results 被写回 messages](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/query.ts#L1678-L1727)，检查 `maxTurns` 后进入下一模型轮次。

所以：

```text
tool completed ≠ task completed
tool_result = 新 observation
新 observation + 原上下文 = 下一次模型决策的输入
```

工具失败也必须返回真实 error result。若 Harness 把失败吞掉，模型会在错误世界状态上继续推理。

## 并发不是“所有工具 Promise.all”

`源码`：[`StreamingToolExecutor` 的规则](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/tools/StreamingToolExecutor.ts#L34-L40)区分 concurrency-safe 工具；[安全工具可并发、非安全工具独占](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/services/tools/StreamingToolExecutor.ts#L127-L150)。

这避免了两个常见错误：

- 把互不影响的读取全部串行，浪费延迟。
- 让写入和依赖旧内容的读取并发，制造时序不确定性。

## 五类停止边界

`源码`：[无工具调用后的收束路径](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/query.ts#L1062-L1357)还要处理 overflow recovery、Stop hooks 和 token budget。完整停止边界包括：

1. 模型给出最终文本且没有 continuation。
2. 到达 `maxTurns` 或其他预算。
3. 用户 abort / interrupt。
4. 不可恢复 API 或 Context 错误。
5. Stop hook 阻止停止并要求继续，或允许结束。

`结论`：模型的 `end_turn` 只是候选停止信号；Harness 才拥有最终的运行控制权。

## 实验

```bash
node examples/04-claude-code/02-agent-loop/index.mjs
node examples/04-claude-code/02-agent-loop/index.mjs --max-turns
```

`实验`：正常场景经历两次模型调用；第二个场景持续产生 tool call，最终由 Harness 的 `maxTurns` 停止。

观察并解释：

- 为什么正常场景的第一轮不能直接结束？
- 为什么 `maxTurns` 是 Safety / Cost guard，而不是模型能力？
- 若工具结果顺序变化，下一轮 Context 会怎样变化？

## 本课结论

- `文档`：官方 agentic loop 是 context、action、verification 的自适应循环。
- `源码`：`queryLoop()` 而不是模型驱动外层 continuation。
- `源码`：tool results 写回消息以后才构成下一模型轮次。
- `源码`：并发由工具的 concurrency contract 控制，写型工具不能任意并发。
- `限制`：课程未运行还原源码；实验是独立最小 Runtime，用于验证概念而非宣称内部字节级行为。
