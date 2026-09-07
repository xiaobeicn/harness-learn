# DeepSeek Harness Session v2 与组合能力更新（2026-09-07）

[返回本阶段](README.md) · [全部来源版本](../source-updates.md)

本次基线：`47f9438 → d347e70`，0.1.3-alpha.1。更新的是核验时上游 `master` 分支 HEAD；包版本相同也不代表提交相同。以下 `源码` 指新 commit，`文档` 指对应上游说明，`学习推论` 不作为运行结果。

## Session v2：实时流与持久结算分开

`源码`：`SESSION_FORMAT_VERSION` 已从 **0 升至 2**。旧版 `assistant/chunk` 逐条 durable event 与 `sourceEventSeqs` 引用不再是当前写入格式。

```text
模型 chunks → agent/assistant-stream（实时、进程内）
  → 成功/有可见前缀：assistant/message + 内嵌 compact timed stream
  → 无 Surface 消息的失败尝试：assistant/attempt + 内嵌 stream
  → semantic checkpoint → persistence
```

`assistant/message` 与 `assistant/attempt` 都保存已结算尝试的 stream；中断且已有可见文本的 message 可标 `interrupted: true`，未派发 tool calls 不混入。硬崩溃若发生在结算前，实时 frames 可能丢失，不能再声称所有已显示 token 均已入 durable log。

`SessionSeq` 等序列类型与 `session/end-seed` 边界也已调整。历史 codec 负责把旧 `seedLength` 转换到当前语义；不要按原始行号推断新日志的所有引用。

证据：[当前 Session schema](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/core/session/src/types.ts)、[流式尝试结算](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/core/agent-loop/src/assistant-stream.ts)、[新版生命周期](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/docs/agent-lifecycle.md)。对应第 1、3、4、6 课。

## 持久化：句柄、检查点与写入所有权

`源码/文档`：Session persistence 变为 handle-based seam，`create/open/stat/list` 与单会话 `read/append/flush/close` 分开。当前第一方 Session backend 只有 JSONL，SQLite Session backend 已移除；这不等于所有通用 storage 都不再有 SQLite。

默认物理编码为带校验的 Zstandard frames，也可配置 `compression: 'none'`。当前代文件名为 `session.v2.jsonl.zstd` 或 `session.v2.jsonl`。创建可以延迟 materialize；append batch 在 `fsync` 后返回，创建成功不自动代表已经存在磁盘文件。

`session-checkpoint-policy` 在模型请求到达 adapter 前、顶层 tool body 产生副作用前，以及 Step 边界 flush。失败时禁止后续动作；仅有 backend 而未挂载 checkpoint policy 的组合具有更弱的崩溃保证。已持久化 call 没有 result 时恢复为 `TOOL_OUTCOME_UNKNOWN`，不自动重放未知副作用。

写句柄还有跨进程排他 lease：POSIX `flock`，Windows 使用从路径派生的 named kernel semaphore。进程退出释放锁，存活但卡住的 writer 仍阻止其他 writer；NFS 与 Windows login-session 范围属于限制。

证据：[handle 契约](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/session/session-persistence/src/handle.ts)、[lease 实现](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/session/session-persistence-jsonl/src/lease.ts)、[编码与所有权](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/session/session-persistence-jsonl/README.md)、[检查点策略](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/session/session-checkpoint-policy/src/index.ts)。对应第 2、5、6、8 课。

## 格式迁移与投影

`源码/文档`：静态 format catalog 装配 v0、v1、v2 codec 与相邻迁移边；初始化检查连续性，不能由运行时插件任意注册缺失迁移。历史代保持不可变，当前代以独占方式发布；最高代无法解释时拒绝，不自动回退旧代或支持降级。

Session projection 增加共享派生状态、按 `viewKey` 标识的变化通知、整段历史的 turn outline，以及 `loadThrough` 历史分页。实时 UI 缓存、派生 projection 和完整审计日志因此更需要分别阅读。

证据：[静态 codec/edge 清单](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/session/session-format-catalog/src/generated.ts)、[迁移契约](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/session/session-format-catalog/README.md)、[projection](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/session/session-projection/README.md)、[turn outline](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/session/session-turn-outline/README.md)。对应第 6、7 课。

## Prompt、PTC 与 Python 后端

`源码`：System Prompt section 的相同 `order` 现在以 code-unit name 排序，常用 section/context 位置由中心分配。插件加载顺序不应意外改变 prompt prefix。见 [确定性 Prompt 排序](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/core/system-prompt/src/index.ts)。

工具配置原 `code` 模式改为 `ptc`，入口为 `run_code`；模型通过生成的 SDK 在程序内访问工具。新的 `tools/ptc-dispatch-log` 明确程序内调用的日志边界。见 [mode 与 dispatch](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/core/tools/src/index.ts)、[PTC 入口](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/core/tools/src/ptc.ts)。

`文档/源码`：新增私有实验 `code-runtime-python`，每次 run 启动一个 CPython 3.10+ 子进程，用 fd 3 传 JSONL，stdout/stderr 留给程序输出。它只支持显式源码组合，默认 shipped profiles 没有挂载；当前拒绝非 Unix 平台。它不是 Prime Agent 那种跨 cell 持久 Python namespace，也不是安全 Sandbox。

证据：[实验 Python Runtime](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/experimental/code-runtime-python/README.md)。对应第 4、5、8、10 课。

## Profile、附件与长任务新增

- `源码`：Profile 默认组合新增 SDK、SDK-minimal、ACP 等入口，patch reload 策略也由 profile 声明；包解析和 profile-owned fallback 边界需读新 [profile loader](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/boot/app-boot/src/profile.ts)，不能照抄旧模板清单。
- `源码/文档`：通用文件附件贯穿上传、提交、prompt admission 与 projection。文件的可展示状态、宿主存储引用和模型可读内容分开管理。见 [attachment](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/attachment/attachment/README.md)、[file upload](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/client/file-upload/README.md)。
- `源码/文档`：相邻 Agent 的消息统一走 `Agent.steer()`，运行中在最近 Step boundary claim，空闲目标被唤醒，冷目标先恢复。`interrupt` 保留未 claim 的 inbox 和 Activation，已 claim 到中断 turn 的消息不重新排队。见 [continuable child 与消息契约](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/docs/subsystems/subagent.md)。
- `源码/变更记录`：增加实验 Agent Teams 组合与子 Agent model selection/authorization；不能因存在实验 profile 就视为所有部署默认启用。
- `文档`：MCP 仍只桥接 Tools；受模型图片能力与 attachment feature 支持时可投影 image blocks，其余不支持内容返回有界诊断。见 [MCP 当前边界](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/mcp/mcp-client/README.md)。

对应第 2、3、4、9、10 课。Inbox splice 仍写 Session event，但“进入内存日志”“flush 成功”“消息已进入模型请求”是三个时刻，不从 admission handle 推导完整的磁盘或执行保证。

## 验证边界

本轮完成版本、差异、实现与引用的静态核对；没有安装或运行上游应用、调用真实模型或重跑上游测试。原课程实验记录保留原日期，独立示例仍是教学模型，不是当前上游的兼容性测试。
