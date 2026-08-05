# 第 7 课：Session、Transcript、Resume、Fork 与 Rewind

[返回本阶段目录](README.md) · [上一课](06-tool-contract-registry-execution.md) · [官方 Sessions 文档](https://code.claude.com/docs/en/sessions) · [课程实验](../../examples/04-claude-code/07-session-dag/index.mjs)

## 核心问题

Claude Code 怎样把长对话存成可恢复状态？为什么 append-only JSONL 加 `parentUuid` 可以同时支持继续、分支、回退和 compact boundary？

## Transcript 不是简单数组文件

`文档`：[官方工作原理](https://code.claude.com/docs/en/how-claude-code-works#work-with-sessions)说明每条消息、tool use 和 result 写入 `~/.claude/projects/` 下的 plaintext JSONL。

`源码`：主会话路径是 `<project-dir>/<session-id>.jsonl`；[subagent transcript](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/sessionStorage.ts#L247-L281)存到 session 目录的 `subagents/agent-<id>.jsonl`，旁边 metadata 记录 agent type 和 worktree。

每个参与对话链的 entry 具有：

```text
uuid
parentUuid
sessionId
type / content
cwd / gitBranch / timestamp ...
```

`源码`：[写入 message chain](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/sessionStorage.ts#L993-L1068)为每条消息记录父 UUID。compact boundary 特殊地把物理 `parentUuid` 设为 null，并保留 logical parent。

## Append-only DAG

正常会话是一条链：

```text
u1 ← a1 ← tool-result-u2 ← a2
```

Rewind 后不必删除 `a2`，只需从 `u2` 写新孩子：

```text
u1 ← a1 ← u2 ← a2   原分支
              └─ b2  新分支
```

`源码`：[`buildConversationChain()`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/sessionStorage.ts#L2063-L2093)从 leaf 逆向沿 `parentUuid` 到根，检测 cycle 后再 reverse。

所以 JSONL 物理上保留所有历史，恢复时只投影选中 leaf 的祖先链。

## Resume 与 Fork 的区别

`文档`：

- Resume：复用原 session ID，在原 transcript 后继续追加。
- Fork / branch：复制所选历史到新 session ID，原会话保持不变。

`源码`：[`processResumedConversation()`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/sessionRestore.ts#L403-L487)在非 fork 时切换到原 session、接管原 transcript；fork 保留启动时的新 session ID，并为新日志重新盖章。

Resume 恢复的不只 messages。[`restoreSessionStateFromLog()`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/sessionRestore.ts#L95-L149)还处理 file-history、attribution、context-collapse state 和 todos；后续流程恢复 agent setting、mode、worktree 和 metadata。

## Compact boundary 如何参与恢复

Compaction 后，老消息仍可能物理存在于 JSONL，但不应重新全部进入模型。

`源码`：大 transcript 的[分块读取](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/sessionStoragePortable.ts#L473-L520)识别真实 `compact_boundary`，避免用户文本中的同名字符串误判；[load path](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/utils/sessionStorage.ts#L3520-L3579)可在文件层跳过 boundary 前的大块陈旧内容。

这把两种历史区分开：

- **审计历史**：磁盘上仍存在。
- **活动 Context 投影**：从最新 leaf / boundary 重建。

## Rewind 不是事务回滚

文件 checkpoint 能恢复被记录的文件内容，但不能保证撤销：

- 已发送的网络请求。
- 数据库写入和部署。
- 外部系统状态。
- 未纳入 checkpoint 的进程副作用。

`结论`：Conversation rewind、file rewind 和世界状态 rollback 是三件事。生产 Harness 必须明确它能恢复哪一层。

## 实验

```bash
node examples/04-claude-code/07-session-dag/index.mjs
```

`实验`：同一 append-only entry 集合，从 `a2` 与 `b2` 两个 leaf 恢复出两条不同会话链。

练习：加入 `{ uuid: "cycle", parentUuid: "cycle" }` 并从它恢复，确认 cycle guard 生效。

## 本课结论

- `文档`：Claude Code 将 Session 记录为本地 plaintext JSONL，支持 resume、fork 和 rewind。
- `源码`：`parentUuid` 把 append-only entries 组织成可分支 DAG。
- `源码`：Resume 恢复 messages 之外的文件历史、todos、agent、mode 和 worktree 等状态。
- `源码`：compact boundary 同时影响 Context 和 transcript load。
- `限制`：checkpoint 不是外部副作用事务，Fork 也不是文件系统自动隔离；需要 worktree 等额外机制。
