# 第 10 课：Subagent 生命周期、Context 隔离与后台任务

[返回本阶段目录](README.md) · [上一课](09-auto-memory-recall-governance.md) · [官方 Subagents 文档](https://code.claude.com/docs/en/sub-agents) · [课程实验](../examples/04-claude-code/10-subagent-context/index.mjs)

## 核心问题

Fresh agent、fork agent、前台 agent、后台 agent 和 worktree isolation 各改变哪一层？Subagent 为什么既能降低主 Context 噪声，又可能增加成本？

## Subagent 是独立 Loop

`文档`：官方将 subagent 的主要收益概括为 Context isolation、并行化、专门指令与工具限制。普通 subagent 有自己的 Context，完成后向主 Agent 返回摘要。

实现心智模型：

```text
Parent AgentTool call
  → 选择 agent definition / model / tools / permission view
  → 构造独立 initial messages 和 system prompt
  → 创建独立 ToolUseContext
  → 运行独立 query loop
  → 写 sidechain transcript
  → 前台直接返回，或后台通知完成
```

## Fresh 与 Fork

`源码`：[Agent Tool prompt](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/AgentTool/prompt.ts#L83-L112)说明：

- Fresh agent：零对话 Context，父 Agent 必须给完整 brief。
- Fork agent：继承父对话 Context，prompt 更像针对已有上下文的指令。

这两者的取舍：

| 方式 | 优点 | 风险 |
| --- | --- | --- |
| Fresh | 干净、低噪声、明确隔离 | brief 不完整就会误解任务 |
| Fork | 继承决策和已知事实、可共享 prompt cache | 带入父 Context 噪声，不能递归无限 fork |

`结论`：Fresh 节省主 Context，不代表它“自动知道项目背景”；Fork 节省重复说明，不代表它不需要明确 scope。

## Agent 自己的运行环境

`源码`：[fresh / fork 的 message、read state、CLAUDE.md 和 Git context 处理](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/AgentTool/runAgent.ts#L368-L409)不同。

`源码`：[工具与权限视图](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/AgentTool/runAgent.ts#L415-L500)由 agent definition 和父 context 组合；Agent 还可预加载 [Skills 与专用 MCP tools](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/AgentTool/runAgent.ts#L530-L704)。

最终创建独立 ToolUseContext：

- sync agent 可共享部分 parent callback。
- async agent 使用独立 abort / app-state view。
- tool list、thinking config、MCP clients 可与父 Agent 不同。

## 前台、后台与继续

前台 / 后台改变的是调度和结果交付：

- 前台：父 Agent 等待 subagent 完成，再继续本轮。
- 后台：父 Agent 立即拿到 task / agent ID，可继续独立工作；完成通知在后续 turn 进入。

`源码`：[Agent Tool prompt 的 foreground / background 契约](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/AgentTool/prompt.ts#L202-L272)还说明可以用 worktree 让文件副作用隔离。

后台不是“轮询文件直到完成”。正确模式是：

```text
launch → 继续独立工作 → notification → 消化真实结果
```

## Sidechain 与 Resume

`源码`：[初始消息和 agent metadata](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/AgentTool/runAgent.ts#L732-L756)在独立 query loop 前写入 sidechain transcript。

`源码`：[`resumeAgentBackground()`](https://github.com/pengchengneo/Claude-Code/blob/b78dd22a091b717c8938ab98c736bc04825a8ee8/src/tools/AgentTool/resumeAgent.ts#L42-L112)读取 transcript 和 metadata，过滤未完成 tool use，恢复原 agent type；原 worktree 消失时只能退回父 cwd。

因此“继续 Agent”不是再启动一个同名新 Agent，而是恢复它的独立状态链。

## Worktree 隔离的边界

Worktree 隔离：

- 提供独立 Git working tree，减少多个 Agent 同改文件。
- 不自动合并变更。
- 不等于容器或 OS Sandbox。
- 不隔离网络、进程、用户凭据和 worktree 外路径。

## 实验

```bash
node examples/04-claude-code/10-subagent-context/index.mjs
```

`实验`：Fresh 只得到新 brief，Fork 继承父 messages；两者都由 allowed tools 得到自己的工具池和 sidechain transcript。

练习：让 Fresh agent 只收到“修复它”，解释结果为什么不可依赖；再写一个包含目标、范围、已知事实、输出格式的完整 brief。

## 本课结论

- `文档/源码`：Subagent 拥有独立 Context 和 loop，最后返回结果摘要。
- `源码`：Fresh 从零开始，Fork 继承父 Context。
- `源码`：Agent 可有独立 tools、permissions、Skills、MCP 和 sidechain transcript。
- `结论`：前台 / 后台是调度选择，fresh / fork 是 Context 选择，worktree 是文件隔离选择。
- `限制`：还原源码中的 fork、coordinator 或 remote 分支可能受 feature gate；公开可用性以官方文档和本机实验为准。
