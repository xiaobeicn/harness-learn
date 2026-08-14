# 第 6 课：Session Event Log、Surface、Persistence 与 Fork

[返回本阶段目录](README.md) · [上一课](05-tool-registry-policy-ordered-concurrency.md) · [Session 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/session.md) · [Persistence 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/persistence.md) · [课程实验](../examples/06-deepseek-harness/06-session-surface/index.mjs)

## 核心问题

为什么完整 Session 日志不能直接等同于下一次发给模型的 messages？异步落盘、崩溃恢复与 Fork 各自保持什么不变量？

## Append-only Event Log

`源码`：Session 接受事件时要求：

- `seq` 从 0 开始连续；
- `data` 是 lossless JSON；
- 接受后对象 deep-freeze；
- 核心生命周期使用已声明 event type。

核心事件包括 turn / step、user message、assistant chunk / message、tool call / result、request header / context 与 Inbox splice。

Session log 是审计事实集合，不直接等于模型历史。

## Session Surface

message-producing event 必须声明 `surfaceOp`：

| 操作 | 语义 |
| --- | --- |
| `append` | 在当前 Surface 末尾增加节点。 |
| `replace(start, end)` | 用新节点 shadow 一段活动节点。 |

Compaction 使用 `replace` 让摘要成为新的活动 Context 起点，但旧事件仍留在 append-only log。`deriveMessages()` 只从当前 Surface 节点投影模型消息。

```text
event log: [m1, call, result, m2, compaction checkpoint]
surface:   [checkpoint]  ← m1..m2 被 shadow，未删除
```

这让审计、UI、模型 Context 和 storage backend 不必共享一个破坏性数组。

## Session Header 与事件分离

Header 保存 version、id、createdAt、cwd、parentSession、seedLength、origin、delegationDepth 与 agentPreset 等 lineage / 启动事实。

固定版本 `SESSION_FORMAT_VERSION = 0`。不支持的格式会被拒绝，而不是猜测旧字段含义。

## Write-behind Persistence

`session/event` 热路径不等待磁盘 I/O。Persistence 使用 fixed batching window 异步写入；`session/flush` 会排空到 quiescence。

| Backend | 布局 |
| --- | --- |
| JSONL | 每个 Session 一个 artifact，默认 checksummed concatenated Zstd frames。 |
| SQLite | 每个 event 一行。 |

二者实现相同 Session persistence seam。异步写入提升热路径响应，但需要显式 flush / shutdown 契约，不能把“事件已在内存接受”误称为“已持久落盘”。

## 崩溃与开放 Turn

冷加载不会截断一个只有 `turn/start`、没有 `turn/end` 的日志。恢复逻辑追加 synthetic `turn/end`，结果是 interrupted。

这样既保留崩溃事实，又把 Session 恢复为 balanced 状态。已经发生的外部副作用不会因追加 interrupted marker 自动回滚。

## Fork 的合法前缀

Fork 只允许选择 balanced、没有 open Turn 的 prefix。新 Session header 记录 parent lineage 与 seed length。

`结论`：Fork 复制可重放对话前缀，不复制进程内 Activation，也不对文件和网络世界做事务快照。

## 实验

```bash
node examples/06-deepseek-harness/06-session-surface/index.mjs
```

`实验`：脚本追加连续事件，用 replace checkpoint 改写 Surface projection，同时断言旧 message 仍在审计 log；再验证 Fork 拒绝 open Turn prefix。

## 本课结论

- `源码`：Session 是连续 seq、lossless JSON、deep-frozen 的 append-only event log。
- `源码`：Surface 通过 append / replace 决定模型活动节点，replace 不删除审计历史。
- `源码/文档`：Persistence 是异步 write-behind，JSONL 与 SQLite 是可替换 backend。
- `源码`：开放 Turn 冷恢复追加 interrupted 结局；Fork 只接受 balanced prefix。
- `限制`：实验是内存模型，没有验证 Zstd frame、SQLite transaction、真实 flush 或 crash injection。

## 下一步

下一课查看 Surface replacement 的主要使用者：Tool-result pruner 与 model summary compaction，以及 overflow 后为什么必须检查 generation 是否真的推进。
