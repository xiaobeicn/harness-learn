# Prime Agent 从 IPython 到 CPython REPL（2026-09-07）

[返回本阶段](README.md) · [全部来源版本](../source-updates.md)

本次基线：`71ca6cf → b9cf467`，0.9.3；Python runtime 0.1.0。更新的是核验时上游 `main` 分支 HEAD；包版本相同也不代表提交相同。以下 `源码` 指新 commit，`文档` 指对应上游说明，`学习推论` 不作为运行结果。

## 破坏性变化：内核协议与 Python 语法

`源码/文档`：模型工具名仍叫 `ipython`，但底层已是 `ReplKernelManager` 启动的 `python -m rlm.repl`，不是 Jupyter/IPython。持久 namespace、顶层 await 和类型化 Host 请求保留；ZeroMQ shell/control/iopub 通道的旧讲解只适用于 `71ca6cf`。

```text
AgentSession → ipython 工具 → ReplKernelManager
  ↔ JSONL over stdio ↔ CPython REPL
  ↔ host_request / host_reply ↔ TypeScript 权威操作
```

普通请求串行，`interrupt` 与 `host_reply` 可以旁路处理。当前 REPL wire protocol 为 **3**，以 `ready` handshake 宣告。协议帧走原 stdout 的私有副本；用户 fd 1/2 输出走捕获管道，无法证明归属的输出标为 `id: null`，不能混进当前 cell 的结果。持久 asyncio task 保留创建它的 cell context。

`%%bash`、`%cd`、`%env` 和 `!cmd` 已移除，会产生普通 Python SyntaxError。当前写法：

```python
import os
os.chdir('/path/to/project')
result = await bash('git status --short')
print(result.output)
```

`bash()` 立即返回可 await 的 handle；一次性 `await bash(...)` 与已经显式作为后台 handle 使用的命令具有不同取消所有权，不能把“停止当前 await”一概理解成杀死所有后台工作。

证据：[工具名称与 bootstrap](https://github.com/PrimeIntellect-ai/prime-agent/blob/b9cf467edf8bbbd8e607991cf770407d62daa8ec/packages/coding-agent/src/core/tools/ipython.ts)、[REPL manager](https://github.com/PrimeIntellect-ai/prime-agent/blob/b9cf467edf8bbbd8e607991cf770407d62daa8ec/packages/coding-agent/src/core/kernel/repl-manager.ts)、[wire protocol](https://github.com/PrimeIntellect-ai/prime-agent/blob/b9cf467edf8bbbd8e607991cf770407d62daa8ec/prime-agent-runtime/src/rlm/repl.md)、[BashHandle](https://github.com/PrimeIntellect-ai/prime-agent/blob/b9cf467edf8bbbd8e607991cf770407d62daa8ec/prime-agent-runtime/src/rlm/bash.py)。对应第 1、2、3、9、10 课。

## 子 Agent 与 Daemon：拓扑权威和传输拆开

`源码/文档`：RLM family discovery 使用 supervisor-owned append-only spawn ledger，不再从 Session 文件扫描重建家族拓扑；Agents view 使用 daemon roster subscription，减少每秒轮询及重复的子任务快照推送。

新增 capability-gated direct worker peer transport：Supervisor 保留发现、授权、路由和全局控制职责，TUI 可直连 Worker 承载 session 数据。每类命令显式划为 control 或 session plane；直连凭据绑定到单个 worker process incarnation。不能把旧流程图理解成所有数据永远经过 Supervisor。

当前 Daemon protocol **7 / schema revision 27**，与 REPL protocol 3 是不同协议。`daemon.md` 仍有 “Public Daemon Protocol v4” 标题，涉及版本以源码为准。

证据：[Daemon 协议与命令分类](https://github.com/PrimeIntellect-ai/prime-agent/blob/b9cf467edf8bbbd8e607991cf770407d62daa8ec/packages/coding-agent/src/modes/daemon/daemon-protocol.ts)、[0.7.3–0.9.3 变更](https://github.com/PrimeIntellect-ai/prime-agent/blob/b9cf467edf8bbbd8e607991cf770407d62daa8ec/packages/coding-agent/CHANGELOG.md)。对应第 1、4、7、10 课。

## Context、恢复与持续运行

- `源码/文档`：namespace snapshot 改为直接向 staged file 序列化，减少内存副本；大变量的跳过/裁剪与 manifest 一起记录。必须区分 Context summary、Python state 和子 Agent ledger 三类恢复状态。
- `源码/文档`：自动 compaction 后保留 continuation；Goal 会等待尚未 settle 的子 Agent 工作，不应在子任务仍运行时不断发空的“继续”请求。
- `文档`：Heartbeat session 按普通 Session residency 管理，空闲不伪装成 running，未来唤醒仍依赖 durable wake。递归取消改为带 visited 集合的迭代遍历。
- `文档`：kernel stderr 同时落盘并保留有界内存尾部；坏协议帧与认证/重试失败应形成可见错误，不能卡住等待者。

证据：[Session continuation 与恢复](https://github.com/PrimeIntellect-ai/prime-agent/blob/b9cf467edf8bbbd8e607991cf770407d62daa8ec/packages/coding-agent/src/core/agent-session.ts)、[snapshot/restore 协议](https://github.com/PrimeIntellect-ai/prime-agent/blob/b9cf467edf8bbbd8e607991cf770407d62daa8ec/prime-agent-runtime/src/rlm/repl.md)、[恢复改进记录](https://github.com/PrimeIntellect-ai/prime-agent/blob/b9cf467edf8bbbd8e607991cf770407d62daa8ec/packages/coding-agent/CHANGELOG.md)。对应第 4、5、7、8 课。

## Refinement 与 MCP 的扩展

`源码/文档`：新增 `session_before_refine` hook，扩展可以替换规划提案或跳过一轮；rollback 绕过此 hook，扩展提供的 edits 仍经正常 apply-time validation。Refinement 结果增加 durable transcript 记录和可展开 diff。扩展改变规划来源，不绕过冲突检查或不可变 base prompt。

`源码/文档`：generic MCP 现在支持 Streamable HTTP **和 stdio**，由 kernel 持有连接。预导入 `mcp`，通过 `await mcp.list_tools(name)` / `await mcp.call_tool(name, tool, args)` 调用。旧的 “McpIntegration 仅 remote HTTP” 只描述特定 wrapper，不能再作为整个项目的能力上限。

配置由用户 settings 管理；项目级 MCP 配置不用于执行，stdio 参数直接启动进程，敏感环境变量通过引用提供。OAuth credential 与 endpoint 绑定，旧 token 需要重新登录；连接变更、timeout 与 shutdown 由 kernel 生命周期处理。ACP 还可提供 session-scoped MCP servers。

证据：[refine hook 与 apply](https://github.com/PrimeIntellect-ai/prime-agent/blob/b9cf467edf8bbbd8e607991cf770407d62daa8ec/packages/coding-agent/src/core/agent-session.ts)、[generic MCP 契约](https://github.com/PrimeIntellect-ai/prime-agent/blob/b9cf467edf8bbbd8e607991cf770407d62daa8ec/packages/coding-agent/docs/mcp-integrations.md)。对应第 6、9 课。

## 学习迁移要点

先重读第 3 课的新协议，再读第 7 课的控制/会话传输分离，最后复盘第 9 课的 MCP 信任来源。底层执行器更轻、传输更直接，不改变“Python 与 Worker 继承宿主权限，进程隔离不是 OS Sandbox”的边界。

## 验证边界

本轮完成版本、差异、实现与引用的静态核对；没有安装或运行上游应用、调用真实模型或重跑上游测试。原课程实验记录保留原日期，独立示例仍是教学模型，不是当前上游的兼容性测试。
