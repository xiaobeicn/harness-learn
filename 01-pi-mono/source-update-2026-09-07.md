# Pi Mono 版本更新与进阶阅读（2026-09-07）

[返回本阶段](README.md) · [全部来源版本](../source-updates.md)

本次基线：`588915e → 9767ba2`，pi-agent-core 0.85.1。更新的是核验时上游 `main` 分支 HEAD；包版本相同也不代表提交相同。以下 `源码` 指新 commit，`文档` 指对应上游说明，`学习推论` 不作为运行结果。

## Loop：只在确实继续时准备下一轮

`源码`：`prepareNextTurn` 的位置发生破坏性变化。旧实现每次 `turn_end` 后都会调用，新实现先完成停止判断和队列检查，只有确实开始下一 assistant turn 才准备 Context、model 与 thinking level，然后发 `turn_start`。终止轮和最后一轮不再调用它。结束清理应放在 `agent_end`。

```text
turn_end → shouldStopAfterTurn → 判断 tools / steering / follow-up
  → 确实继续 → prepareNextTurn → 补取准备期间到达的 steering → turn_start
  → 结束 → agent_end
```

如果已有 pending steering，准备后不再取第二条，避免破坏 one-at-a-time 模式。`transformContext → convertToLlm` 的模型请求边界仍保留。

证据：[当前 loop](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/agent/src/agent-loop.ts)、[hook 类型契约](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/agent/src/types.ts)、[0.84.4 breaking change](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/agent/CHANGELOG.md)。对应第 2、4、6 课。

## Tool 与 State：阻断、取消和重置

- `源码`：`beforeToolCall` 可以返回 `block: true, terminate: true`。`terminate` 参与整批最终结果的提前终止规则，只有所有结果都要求终止才结束；单个工具拒绝不自动结束整个 Agent。
- `源码`：并行工具完成 preflight 后、真正执行前再次检查 AbortSignal，已取消的准备项生成错误结果，不启动执行体。
- `源码`：运行期间 `Agent.reset()` 明确抛错，防止清空仍在使用的 transcript、事件状态和队列。应先结束活动运行，再 reset。

证据：[执行与终止](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/agent/src/agent-loop.ts)、[reset guard](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/agent/src/agent.ts)。对应第 2、5、6 课。

## 新增进阶方向：Durable Harness、Lane 与恢复

`文档/源码`：最小 `Agent` 之外，`AgentHarness`、Session 和 repository 已转向 lane、durable operation 和共享存储。0.84.0 的变更记录明确替换旧 repository API；当前实现规范把 conversation tree、operation restart point 与 effect gate 分开。研究“崩溃时工具究竟执行过没有”时，应继续读这一层。

推荐入口：[Harness API](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/agent/src/harness/agent-harness.ts)、[调用身份与 replay memo](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/agent/src/harness/types.ts)、[实现规范与状态清单](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/agent/docs/harness.md)。`AgentTool.replay` 已声明 `never | safe`；不能据此声称任意 Shell 或外部写入可以安全重放。

`限制`：当前 storage format 4 仍在稳定前阶段。规范的 implementation status 明确保留 `watchSession`、search、JSONL 空间回收及 named-branch/streaming fork 的未完成项，不能把设计章节全部当作已交付特性。第一阶段仍以最小 Runtime 入门，第 7 课将此列为后续阅读。

## 其他值得注意的改进

`文档`：Coding Agent 修复 fork 丢失 compaction boundary、取消时没有取消 compaction，以及大工具结果之后未及时压缩的问题；这些说明压缩需要覆盖每次模型请求的边界，而不只是用户输入入口。Provider 适配还在改进流结束、thinking metadata 和模型发现。

证据：[Coding Agent changelog](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/CHANGELOG.md)。这些产品能力不并入第 3 课的零依赖最小实现。

## 验证边界

本轮完成版本、差异、实现与引用的静态核对；没有安装或运行上游应用、调用真实模型或重跑上游测试。原课程实验记录保留原日期，独立示例仍是教学模型，不是当前上游的兼容性测试。
