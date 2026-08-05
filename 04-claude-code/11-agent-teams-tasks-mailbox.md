# 第 11 课：Agent Teams、Tasks、Mailbox 与权限同步

[返回本阶段目录](README.md) · [上一课](10-subagent-lifecycle-context-isolation.md) · [官方 Agent Teams 文档](https://code.claude.com/docs/en/agent-teams) · [课程实验](../examples/04-claude-code/11-team-coordination/index.mjs)

## 核心问题

Agent Team 相比多个 Subagent 多了什么？任务所有权、依赖、消息、空闲状态和权限请求怎样在多个独立 Agent 之间同步？

## Subagent 与 Team 的分界

| 能力 | 普通 Subagent | Agent Team |
| --- | --- | --- |
| 主关系 | 父 → 子，一次委派 | leader ↔ teammates，持续协作 |
| 状态 | 每个 sidechain transcript | team config + shared task list + 每人 transcript |
| 通信 | 主要返回父 Agent | direct message / broadcast / protocol mailbox |
| 任务 | prompt 内描述 | 有 owner、status、dependencies 的 shared Tasks |
| 权限 | 子 Agent 自己的 permission view | worker 请求可转发给 leader / 用户 |
| 生命周期 | 完成后返回 | idle、wake、reassign、shutdown |

`结论`：Agent Team 的本质不是“多开几个模型”，而是增加协调状态和通信协议。

## Team = 成员目录 + Task list

`源码`：[`TeamCreateTool`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/TeamCreateTool/TeamCreateTool.ts#L128-L212)：

1. 限制 leader 同时管理一个 team。
2. 写入 team config，记录 leader、session、model、cwd 和成员。
3. 创建对应 task directory。
4. 把 team context 放入 AppState。

官方 Tool prompt 将它概括为 `Team = TaskList`。磁盘上的 team config 是成员发现目录，task list 是协调事实。

## Tasks 不是聊天中的 Todo

`源码`：[`Task` schema](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/tasks.ts#L69-L89)包含：

```text
id, subject, description
owner
status: pending | in_progress | completed
blocks[]
blockedBy[]
```

`源码`：[`claimTask()`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/tasks.ts#L541-L603)在锁内检查 owner、completed 和 unresolved blockers；更严格路径还会原子检查同一 Agent 是否已经忙于别的任务。

因此可靠 claim 至少满足：

- 任务存在且未完成。
- 没有未完成依赖。
- 未被其他 Agent 拥有。
- 在要求单任务时，claimant 当前不忙。

## Teammate 是独立运行者

`源码`：[`spawnTeammate()`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/shared/spawnMultiAgent.ts#L1084-L1093)统一进入 spawn handler。

还原快照支持至少两类 backend：

- in-process：同一 Node/Bun 进程中，用独立 agent context 跑 loop。
- pane / process：通过 tmux、iTerm 等启动另一个 Claude Code 实例。

`源码`：[in-process teammate](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/shared/spawnMultiAgent.ts#L889-L1014)不会保留父完整 messages，也不会再通过 mailbox 重复发送初始 prompt。

运行后 teammate 在每个 turn 结束进入 idle。Idle 表示“等待新输入”，不是完成或崩溃；消息可重新唤醒它。

## Mailbox 是协议层

`源码`：[`writeToMailbox()`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/teammateMailbox.ts#L128-L182)在文件锁下重新读取 inbox、追加消息并写回。

Mailbox 同时承载：

- 普通 direct message。
- task assignment。
- idle notification。
- permission request / response。
- sandbox network request / response。
- plan approval。
- mode update。
- shutdown request / approved / rejected。

`源码`：[结构化协议消息集合](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/teammateMailbox.ts#L1065-L1089)必须走专门 handler，不能作为普通自然语言重复注入。

## Permission 同步

`源码`：[`permissionSync.ts` 的协议说明](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/swarm/permissionSync.ts#L1-L19)描述完整流程：

```text
worker 遇到 ask
  → 写 permission_request
  → leader 发现 pending request
  → 用户在 leader UI 决定
  → permission_response 回到 worker
  → worker 继续或收到拒绝
```

权限同步不能自动扩大全队权限。批准中带来的 permission update 仍要有明确 scope，并传播到正确 worker context。

## 协调成本何时值得

适合 Team：

- 三个以上相对独立、可明确分工的工作流。
- 需要 peers 持续交流、重新分配任务。
- 任务依赖图需要长期可见。

不适合：

- 单文件小改。
- 后一步完全依赖前一步结果，无法并行。
- 共享热点文件没有 ownership。
- 主 Agent 自己尚未理解需求，只想把模糊问题甩给 team。

## 实验

```bash
node examples/04-claude-code/11-team-coordination/index.mjs
```

`实验`：Task 2 在 Task 1 完成前不能 claim；解除依赖后 client-agent 才能取得所有权。Permission request 通过 leader mailbox 传递，而不是假装已授权。

## 本课结论

- `源码`：Team config、shared Tasks 和 Mailbox 是 Agent Team 的三类协调状态。
- `源码`：Task claim 需要 owner、status、dependency 和锁共同保证。
- `源码`：Permission / plan / shutdown 都是显式结构化协议。
- `结论`：Multi-Agent 的难点是 ownership、通信和收束，不是并发启动。
- `限制`：Agent Teams 的账户、平台和 feature 可用性会变化；以官方文档和本机 `/help` 为准。
