# 第 4 课：System Prompt、Runtime Context 与 LLM Streaming

[返回本阶段目录](README.md) · [上一课](03-inbox-turn-step-agent-loop.md) · [System Prompt 源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/core/system-prompt/src/index.ts) · [Runtime Context](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/core/agent-loop/src/runtime-context.ts) · [课程实验](../examples/06-deepseek-harness/04-context-snapshot/index.mjs)

## 核心问题

插件可以动态改变 Prompt、Context 和工具目录。DeepSeek Harness 怎样保证模型实际看到的请求可以审计和稳定重放？

## 三类输入不要混在一起

| 内容 | 机制 | 生命周期 |
| --- | --- | --- |
| 稳定行为指令 | 有序 System Prompt sections | 随 scope / plugin composition 变化。 |
| 动态环境事实 | Runtime Context entries | 内容变化时形成 durable snapshot。 |
| 对话与工具历史 | Session Surface projection | 随 append / replace events 演进。 |

`源码`：System Prompt section 有稳定排序；同名 scoped section shadow global section。工具 schema 与 Prompt assembly 一起生成，也使用稳定顺序。

稳定排序不仅为了输出美观。只要 provider、system、tools 和前缀消息不变，模型请求前缀更容易复用 KV cache；插件集合变化则从第一个变化 token 开始失效。

## Runtime Context 是 durable snapshot

Runtime Context 不会在每个请求前无痕读取世界状态。固定源码会把来源明确的内容渲染为 `user/message` snapshot：

```text
source A changed
  → render current value
  → append durable user/message
  → future requests project that snapshot
```

只有内容变化才追加；从有内容变为空也写显式 marker。这样恢复时不会猜测过去某个 Step 的 cwd、git 状态或动态提示究竟是什么。

`结论`：项目坚持“model-visible means logged”。只要内容改变了模型行为，就应在 Session 中留下可解释来源。

## Request Header 固化请求边界

`request/header` 保存：

- provider 与 model；
- provider config；
- 完整 system prompt；
- 当前 tool definitions；
- 创建原因，例如 first request、resume 或 composition change。

`request/context` 另存路由与容量信息。两者与历史消息分开，使“发了什么”和“为什么选择这个请求配置”都能检查。

## Streaming 不是只有最终文本

LLM 返回的原始 chunks 逐个写为 `assistant/chunk`。`BlockAssembler` 把它们汇总为规范 block，再写 `assistant/message`。

```text
provider raw stream
  → assistant/chunk × n
  → BlockAssembler
  → assistant/message
  → tool calls or final text
```

这同时服务实时 UI、崩溃诊断与最终模型历史。若 max-tokens 截断了 tool call，assembler 不把不完整调用交给执行器。

## Snapshot 与 Projection 的边界

- request header 是一次请求的配置快照。
- raw chunks 是 Provider 实际输出的流事实。
- assistant message 是规范化后的对话节点。
- Session Surface 决定哪些 message nodes 进入下一次模型请求。

它们有关联，但不能互相替代。只保存最终文本会失去流式故障证据；只保存 raw chunks 又会把 Provider 方言泄漏给后续 Context 构建。

## 实验

```bash
node examples/06-deepseek-harness/04-context-snapshot/index.mjs
```

`实验`：脚本对 scoped prompt sections 做 shadow 与稳定排序，仅在 Runtime Context 变化时追加 snapshot，并断言 request header 与流式 chunks 都留下独立记录。

## 本课结论

- `源码`：System Prompt 与 Tool schemas 使用稳定、有作用域的 assembly。
- `源码`：Runtime Context 变化形成来源明确的 durable message，清空也显式记录。
- `源码`：request header 固化 provider、model、config、system 与 tools；raw chunks 和汇总 message 分开保存。
- `结论`：可组合 Harness 必须让动态模型输入可审计，否则热插拔只会制造不可重放的隐式状态。
- `限制`：实验没有验证任何 Provider 的真实 chunk 方言、token 统计或 KV-cache 命中。

## 下一步

下一课进入 Tool Runtime，查看 lossless 参数、策略 waterfall、Approval、结果 schema 与有序并发怎样接上这份请求快照。
