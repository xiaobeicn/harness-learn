# 第 4 课：递归子 Agent、Registry 与消息回传

[返回本阶段目录](README.md) · [上一课](03-ipython-kernel-and-host-bridge.md) · [官方 RLM Programming Model](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/docs/rlm.md) · [课程实验](../examples/05-prime-agent/04-subagent-messaging/index.mjs)

## 核心问题

`await rlm("subtask")` 为什么只返回接纳句柄而不是答案？子 Agent 怎样独立运行、保留身份、回传结果并归集用量？

## Admission 与 Completion 分开

模型在 Kernel 中调用：

```python
handle = await rlm(
    "Review the authentication flow and reply with concrete findings.",
    name="auth-reviewer",
)
```

返回值只有：

```text
rlm_child_id
name
session_dir
model
```

`源码`：[`_startRlmChildRun()`](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/src/core/agent-session.ts#L9684-L9739)先校验参数、depth、名称和模型，创建 child directory 与 queued registry entry；随后把 runtime startup 和 task run 放入 detached async work，最后立即返回 handle。

因此：

```text
await rlm(...)
  = 子任务已被 Host 接纳
  ≠ 子 Agent 已启动 provider request
  ≠ 子 Agent 已完成
  ≠ 子 Agent 的答案
```

这与 OpenCode 的 Prompt admission 原理相似，但 scope 是父 Agent 的直接 child registry，而不是通用远程工作流 API。

## 子 Agent 是正常 AgentSession

`源码`：child runtime 复用 Provider hooks、ResourceLoader、ModelRegistry、Tools、Transport、Retry 与 Thinking 配置，同时获得：

- 独立 Context 和 message loop。
- 独立 Session directory / JSONL。
- 自己的可选 IPython Kernel。
- 递增后的 `RLM_DEPTH`。
- 指向父节点的身份与消息关系。

默认 `RLM_MAX_DEPTH = 1`：root 可以创建 child，child 默认不能创建 grandchild。提高 depth 是显式配置，不应由模型无限递归。

若不指定模型，child 继承 parent model；显式指定的 `provider/model` 必须在已认证 catalog 中精确存在。不可用时 spawn 失败，不静默回退。

## Fan-out 不等于等待

独立工作应分多次接纳：

```python
api = await rlm("Review public API; reply to parent.", name="api-reviewer")
tests = await rlm("Find missing tests; reply to parent.", name="test-reviewer")
docs = await rlm("Find stale docs; reply to parent.", name="docs-reviewer")
```

三个调用得到三个 handles 后，父 Agent 应结束当前 turn，让 children 并行推进。不要在同一 cell 中轮询它们直到完成，否则会重新制造同步阻塞。

## 结果通过消息或文件回流

child 明确回复：

```python
await agent_message.send(
    "Found a missing expiry check in auth/session.ts.",
    receiver_role="parent",
)
```

父 Agent 后续追问：

```python
await agent_message.send(
    "Recheck after the new regression test.",
    receiver_role="child",
    receiver_name=api.name,
)
```

`源码`：Agent family reach 被限制为 parent、siblings 和 direct children；默认单条消息最多 16,384 字符、每 Session 最多 20 条 pending，并有 token-bucket rate limit，见 [`agent-messages.ts`](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/src/core/agent-messages.ts#L7-L24)。

消息 receipt 的 `delivered` 表示已进入 idle target Context，`queued` 表示已接纳并等待后续 delivery。它不表示目标已经处理完消息。

`限制`：固定实现若 child 完成但没有显式回复，会向 parent 发送 `completed_without_reply` notice；这避免静默结束，但 admission handle 仍不会变成答案。任务 prompt 应明确要求所需结果通过消息或文件返回。

## Registry 与恢复

`await rlm.list_subagents()` 返回父 Session 的直接 children：

- stable child ID。
- active Session ID（Daemon-backed 时）。
- Session ID、name、directory。
- running / completed / error。

Registry 跟随 parent transcript 和 artifacts，可跨 Compaction、Kernel restart 与 parent restore。无关的新 parent Session 不继承这份 registry。

完成的 child 可以保留以便追问；只有确认不再需要 Context 时才 `delete_subagent()`。删除写 tombstone 并移出消息 / observation 目录，不等于抹除磁盘 transcript。

## Usage attribution

`源码`：child assistant message 完成后，Host 将 child usage 聚合到发起它的 parent assistant turn，同时追加 `child_usage_attributed` entry，见 [`AgentSession` child event handling](https://github.com/PrimeIntellect-ai/prime-agent/blob/71ca6cfd1a2f7205ca0ec1baa65d10d0ed88f6e8/packages/coding-agent/src/core/agent-session.ts#L9824-L9866)。

这解决两个视图：

- Parent Session 总成本包含 child work。
- Context tree 仍能单独显示每个 node 的 own usage，避免重复计算。

## 实验

```bash
node examples/05-prime-agent/04-subagent-messaging/index.mjs
```

`实验`：脚本并行接纳三个 child，证明 handle 先于 completion 返回；只有显式 message 才进入 parent inbox，并验证 `queued` 与 `completed` 是不同状态。

## 本课结论

- `源码/文档`：`rlm()` 是 asynchronous admission API，不是“等待另一个模型返回字符串”。
- `源码`：child 使用正常 AgentSession 与独立持久化，同时继承明确的运行配置。
- `源码`：Registry、Agent message 和 usage attribution 组成可恢复的 fan-out / fan-in 协议。
- `结论`：高质量 delegation prompt 必须写清目标、范围、证据、输出通道与是否需要显式回复。
- `限制`：共享同一工作目录的 children 仍可能产生文件竞态；独立 Session 不自动提供 Worktree 或 OS 隔离。

## 下一步

下一课区分 Session transcript、活动 Model Context、Compaction summary 与 Kernel namespace，避免把“状态持久化”理解成一个文件。
