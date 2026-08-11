# 第 5 课：Session Tree、Compaction 与 Kernel 连续性

[返回本阶段目录](README.md) · [上一课](04-recursive-subagents-and-messaging.md) · [官方 Compaction](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/docs/compaction.md) · [课程实验](../examples/05-prime-agent/05-session-compaction/index.mjs)

## 核心问题

一个长任务同时需要审计历史、短模型 Context、持久 Python state 和可恢复子 Agent。Prime Agent 怎样把这些状态分层？

## JSONL 保存一棵树

`源码`：Session header 保存 ID、cwd、parent Session、RLM depth 和 Git context；每个 entry 都有：

```ts
type
id
parentId
timestamp
```

常见 entry 包括 message、model change、thinking change、compaction、branch summary、custom、goal state、child usage attribution 与 daemon status。

`源码`：[`SessionManager`](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/src/core/session-manager.ts#L1181-L1190)把 Session 定义为 append-only tree。当前 leaf 到 root 的 `parentId` 链决定活动 branch；切换 leaf 不删除其他分支。

```text
root user
  └─ assistant
      ├─ user A ─ assistant A   ← old leaf
      └─ user B ─ assistant B   ← active leaf
```

Transcript 是完整 JSONL facts；模型本轮看到的是从 active leaf 投影出的 Context。

## Compaction 只重建活动 Context

`源码`：Compaction entry 保存：

- `summary`。
- `firstKeptEntryId`。
- `tokensBefore`。
- 可选 custom instructions 与 file-operation details。

[`buildSessionContext()`](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/src/core/session-manager.ts#L477-L596)沿 active parent chain 找到最新 Compaction，然后构造：

```text
Compaction summary
  + firstKeptEntryId 起的近期原文
  + Compaction 之后的新消息
```

旧 entries 仍在 JSONL 中用于审计和 tree navigation，只是不再全部发送给模型。

`文档`：默认 `keepRecentTokens` 为 20,000、`reserveTokens` 为 16,384；实际设置可变，不能把这两个值当成跨版本协议。

## Branch summary 解决另一类 Context 丢失

Compaction 总结“当前 branch 的旧历史”；Branch summary 总结“从一个 branch 离开时的工作”，并把结果附到新位置。

| 机制 | 触发 | 解决的问题 |
| --- | --- | --- |
| Compaction | threshold、overflow、`/compact` | 当前 branch 太长。 |
| Branch summary | `/tree` 切换 branch | 新 branch 需要知道被离开路径的重要结果。 |

二者都使用结构化 goal / progress / decisions / next steps / file lists，但 entry type 与导航语义不同。

## Kernel namespace 是第四层状态

Compaction 发生后，模型消息被摘要；当前 IPython process 不因此重启：

```python
changed_files = [...]
test_failures = {...}
helper = lambda ...
```

这些变量仍可在下一次 `ipython` call 使用。持久 Session 还可把 namespace best-effort snapshot 到 artifacts，以便 Kernel restart / Session revival。

必须保持四层分离：

| 层 | 用途 | 不保证 |
| --- | --- | --- |
| Session JSONL | 审计、恢复、分支 | 每轮全部进入模型。 |
| Model Context projection | 当前决策 | 保存完整历史。 |
| Kernel namespace | 程序化 working state | 外部副作用事务一致。 |
| World state | 文件、进程、网络、服务 | 随 Session rewind 自动回滚。 |

## Child state 同样分层

每个 child 有自己的 JSONL 和 artifacts。Parent registry 保存如何找到 direct child，但不会把 child 全 transcript 拼入 parent Context。

Parent 可以：

- 读 child message。
- 观察 bounded rollout。
- 读 child 写入的文件。
- 根据 registry 继续或删除 child。

这种设计避免并行 children 的全部 Token 直接污染 parent Context。

## Context overflow 的恢复边界

`源码`：Context overflow 不进入普通 provider retry；它由 Compaction 分支处理。固定实现只做一次 compact-and-retry recovery，失败后显式报告，避免无限压缩重试掩盖真实问题。

`结论`：Retry 重放同一请求；Compaction 是用新 Context checkpoint 发起 continuation。二者不能混称。

## 实验

```bash
node examples/05-prime-agent/05-session-compaction/index.mjs
```

`实验`：脚本构建一个带分支的 append-only tree，选择 active leaf 后应用 Compaction，断言旧 branch 仍可审计，而模型 projection 只包含 summary + kept messages。

## 本课结论

- `源码`：`parentId` 让一个 JSONL 文件保存多分支 Session tree。
- `源码`：Compaction entry 与 `firstKeptEntryId` 改变活动 Context 投影，不删除旧 entries。
- `源码/文档`：Kernel state 跨普通 Tool calls 与 Compaction存在，并可在持久 Session 中 best-effort snapshot。
- `结论`：Transcript、Context、Kernel namespace、child registry 和 world state 必须分别推理。
- `限制`：Session rewind、Kernel restore 与外部副作用 rollback 是三种能力；Prime Agent 不提供通用事务回滚。

## 下一步

下一课研究第五层状态：Continual Harness 怎样从轨迹中提炼 prompt、memory、skill 与 subagent 条目，并避免自动学习污染 base prompt。
