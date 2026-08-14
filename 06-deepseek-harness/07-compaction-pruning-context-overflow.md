# 第 7 课：Compaction、Tool-result Pruning 与 Context Overflow

[返回本阶段目录](README.md) · [上一课](06-session-log-surface-persistence-fork.md) · [Compaction 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/compaction.md) · [Basic Compaction](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/compaction/compaction-basic/src/index.ts) · [课程实验](../examples/06-deepseek-harness/07-compaction-pruning/index.mjs)

## 核心问题

当 ToolResult 或完整历史超过模型窗口时，Harness 怎样缩短活动 Context，同时保持 call / result 配对、审计历史和错误可见？

## 两级回收

固定版本将回收分成两层：

1. **model-free ToolResult pruning**：对单个超大结果截取 head / marker / tail。
2. **model summary compaction**：让模型为一段 balanced history 生成 continuation checkpoint。

前者便宜且局部，后者能压缩跨多轮语义。二者都通过 Surface replacement 推进，不删除原始事件。

## Tool-result Pruner

默认 base bundle 配置：

| 参数 | 默认值 |
| --- | --- |
| `thresholdChars` | 8192 |
| `headChars` | 4096 |
| `tailChars` | 1024 |

长度按 Unicode code point 计数，不按 UTF-16 code unit。rich blocks 保持原有顺序；pruner 追加 shadow-price event 和 replacement ToolResult。

```text
large result
  → head
  → explicit omitted marker
  → tail
```

Marker 必须说明内容被删减，不能让模型把不连续文本误当完整输出。

## Summary Compaction 的合法范围

Compaction region 必须 balanced，不能切在 tool call 与对应 result 之间。开始时先追加 `compaction/start` 作为 durable lock。

摘要只有在 token count 小于被 shadow 内容时才有价值。成功 commit 为一个 `user/message` checkpoint，并使用 `surfaceOp: replace`。

```text
old surface nodes
  → choose balanced region
  → compaction/start
  → model summary
  → validate smaller
  → checkpoint replace
  → compaction/end
```

失败路径也尽量追加 `compaction/end` 与错误，使维护状态不会无声悬空。

## 两种自动触发

- `agent/pre-step` 在压力阈值到来前尝试维护。
- `agent/request-error` 识别 canonical context overflow 后尝试回收。

Overflow 后只有 Surface replacement generation 真正推进才重试请求。如果没有可压缩 region、摘要不够短或 maintenance 失败，就保留原始 overflow error。

`结论`：retry 必须以状态进展为条件，否则只是隐藏根因的循环。

## Compaction 不负责什么

- 不删除 append-only 审计事件。
- 不撤销文件、Shell、网络或外部 API 副作用。
- 不恢复进程内插件或 Subagent Activation。
- 不把尚未完成的 tool call 猜成成功。

## 实验

```bash
node examples/06-deepseek-harness/07-compaction-pruning/index.mjs
```

`实验`：脚本先用 code-point 安全方式裁剪大 ToolResult，再选择完整 call / result 对作为摘要范围；只有 generation 增加时才允许 overflow retry。

## 本课结论

- `源码`：ToolResult pruning 与 model summary 是两级独立回收机制。
- `源码`：Compaction region 保持工具配对，commit 使用 Surface replace，旧事件仍保留。
- `源码`：Overflow retry 依赖 replacement generation 推进，失败不掩盖原始错误。
- `结论`：Context maintenance 应是可证明推进的状态转换，而不是无上限重试策略。
- `限制`：实验使用确定性摘要，没有验证真实摘要模型、tokenizer 或 rich media rendering。

## 下一步

下一课离开 Context 层，进入 Approval、Filesystem、Shell 和跨平台 Sandbox，区分应用 policy 与真正的 OS enforcement。
