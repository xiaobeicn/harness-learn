# 第 5 课：Tool Registry、策略流水线与有序并发

[返回本阶段目录](README.md) · [上一课](04-system-prompt-runtime-context-llm-streaming.md) · [Tools 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/tools.md) · [Tool Runtime](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/core/tools/src/index.ts) · [课程实验](../examples/06-deepseek-harness/05-ordered-tool-execution/index.mjs)

## 核心问题

多个插件可以注册工具和策略。一次模型 tool call 怎样在动态组合下仍保持参数、授权、结果与 Session 顺序确定？

## ToolDefinition 是完整协议

`源码`：一个工具必须提供：

- 输入 schema；
- canonical output schema；
- model / UI render；
- `execute` 实现；
- 可选 approval、并发分类与 finalizer 行为。

参数先转换为 lossless JSON snapshot 并冻结，再进入策略。输出也经过 schema 验证；异常与验证失败统一形成 `ToolExecutionFailure`，不会返回伪造 success。

## 一次执行的流水线

```text
materialize args
  → tools/pre-execute waterfall
  → optional approval
  → monotonic guards
  → tools/execute around-waterfall
  → tool body
  → tools/post-execute
  → definition finalizer
  → freeze canonical result
  → tools/result event
```

pre policy 可以收紧、拒绝或重写允许改写的部分；monotonic guard 防止后续阶段重新放宽已经收紧的决定。Around waterfall 可以包住 body，但必须把控制权明确交给下一层。

## 错误也必须结算

以下情况都会生成与 call 对应的显式 ToolResult：

- 未知工具；
- 参数 schema 失败；
- policy / approval 拒绝；
- 执行抛错或取消；
- output schema 失败。

这让 Session replay 始终保持 call / result 配对，模型也能根据错误修正，而不是等待一个永远不会出现的结果。

## Scope 与 presentation mode

scoped registration 可以 shadow global 工具；scope restriction 按交集收紧。工具展示有三种模式：

| 模式 | 模型直接看到什么 |
| --- | --- |
| `native` | 注册后的原生 tool schemas。 |
| `code` | 只直接调用 `run_code`，内部程序再用 Tool SDK。 |
| `both` | 同时提供两种入口。 |

`源码`：code-mode collapse 在执行边界也强制，不只是 Prompt 建议，模型不能用隐藏原生名绕过展示策略。

## 有序并发调度

工具 classifier 只有精确返回 `true` 才允许 parallel。异常、未知或非 true 都 fail closed 为 exclusive。

```text
call 1: parallel ┐
call 2: parallel ├─ bounded rolling pool
call 3: exclusive┘  ← barrier，等前面完成且阻止后面越过
call 4: parallel
```

pre-policy 和最终 commit 保持模型输出顺序；只有 dispatch / body 可以重叠。Abort 会为尚未启动的调用补 synthetic error result，避免 Session 出现悬空 call。

`结论`：并发是执行优化，不得改变政策顺序、日志顺序或模型观察顺序。

## Approval 在哪里

Approval 位于 pre-policy 之后、tool body 之前。它回答“本次已规范化动作是否得到人类授权”，不能替代 Tool schema、应用 policy 或 OS Sandbox。

没有 answerer 时结果是 unavailable 并 fail closed；asked / decided 作为 log-only audit pair 留下证据。

## 实验

```bash
node examples/06-deepseek-harness/05-ordered-tool-execution/index.mjs
```

`实验`：脚本并行 dispatch 两个只读工具，让一个写工具形成 barrier，再并行后续调用；完成时间故意乱序，但 commit 和结果仍按模型 call 顺序排列。

## 本课结论

- `源码`：参数在 policy 前 lossless snapshot 并冻结，输出使用 canonical schema 验证。
- `源码`：pre、approval、guard、around、body、post、finalizer 和 result event 有确定顺序。
- `源码`：只有 classifier 精确返回 true 才并行；exclusive 是 barrier，commit 仍保持模型顺序。
- `结论`：动态工具系统的正确性来自统一 execution boundary，而不是要求每个 Tool 自己重复实现授权和日志。
- `限制`：实验验证调度不变量，没有运行真实 shell、approval UI 或 code mode SDK。

## 下一步

下一课研究这些 call、result、request 与 message 怎样进入 append-only Session，并通过 Surface、Persistence 与 Fork 形成不同视图。
