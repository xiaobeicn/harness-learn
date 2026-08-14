# Agent Harness 术语对照表

[返回首页](README.md) · [学习路线](00-roadmap.md) · [横向对照](comparison.md) · [自研设计基线](harness-design-summary.md)

## 使用说明

本文统一六个项目学习记录中反复出现的英文术语。表中的“推荐中文”用于理解和中文写作，不要求改写源码标识符、协议字段、产品名称或命令行参数。

建议遵守以下约定：

1. 第一次出现时写成“推荐中文（English）”，后续可按语境使用中文简称。
2. 函数、类型、事件名和配置值保持源码原样，例如 `Tool.Called`、`PermissionProfile`、`workspace-write`。
3. 官方机制名称可以保留英文，例如 Skill、Hook、MCP；中文主要负责解释语义。
4. 同一个词在不同项目中的精确边界可能不同；表中先给跨项目共同含义，再注明重要差异。
5. `durable`、`safe`、`sandboxed` 等词只在有对应实现证据时使用，不能仅凭命名推断保证。

## 一、最容易混淆的术语

| 术语组 | 应怎样区分 |
| --- | --- |
| Agent Runtime / Coding Agent / Agent Harness | Runtime 是模型与工具循环内核；Coding Agent 是面向代码任务的产品；Harness 是包住模型的完整运行环境。 |
| Transcript / Model Context / Client Projection | Transcript 是完整会话事实；Model Context 是一次模型请求视图；Client Projection 是 UI 当前维护的渲染状态。 |
| Prompt admitted / promoted / completed | Admitted 表示输入已可靠接纳；Promoted 表示已进入模型可见历史；Completed 才表示本次执行链已经结束。 |
| Retry / Continuation | Retry 是重新尝试同一操作；Continuation 是获得新 observation 后开始下一轮决策。工具结果触发的是 continuation，不是重试。 |
| Tool visibility / Permission / Sandbox | Visibility 决定模型是否看见工具；Permission 决定这次调用是否授权；Sandbox 限制已启动进程实际上能做什么。 |
| Rejected / Failed / Denied | Rejected 表示执行前被策略或审批拒绝；Failed 常表示已经执行但失败；Denied 特指命中 Sandbox 或权限边界。 |
| Durable event / Live event | Durable event 已进入可重放事实日志；live event 只服务在线更新，断线时可能丢失。 |
| Snapshot / Event / State | Snapshot 是某时刻完整视图；Event 是一次变化事实；State 是事件或数据归约后的当前状态。 |
| Microcompact / Compaction | Microcompact 清理旧的低价值工具结果；Compaction 用摘要和边界重建后续活动 Context。 |
| Compaction summary / Memory | Compaction summary 服务当前 Session 的继续执行；Memory 保存少量跨会话知识。 |
| RLM / Continual Harness | RLM 是持久 IPython、Host Bridge 与递归 child 的执行模型；Continual Harness 是进入未来 Context 的持久补充状态。 |
| Admission handle / Completion result | Handle 只证明工作被接纳并提供稳定身份；最终结果必须由完成状态、消息或持久记录证明。 |
| Resume / Fork / Rewind / Rollback | Resume 继续原 Session；Fork 创建新分支；Rewind 改变选中的会话或文件节点；Rollback 才表示撤销真实世界副作用。 |
| Worktree isolation / OS Sandbox | Worktree 只隔离 Git 工作目录；OS Sandbox 约束文件、网络、进程及子进程能力。 |
| Worker / Kernel process / OS Sandbox | Worker 与 Kernel 可隔离生命周期和故障；只有 OS 或外部 enforcement 才限制真实系统权限。 |
| Network capability / Managed proxy | Capability 决定进程是否有网络能力；Proxy 决定流量是否经过域名和方法策略。 |
| Foreground / Background / Fresh / Fork | 前后台描述调度；Fresh/Fork 描述 Subagent 初始 Context，二者是不同维度。 |
| Event log / Session Surface | Event log 保存 append-only 审计事实；Surface 决定当前模型历史，replace 只 shadow 旧节点而不删除事件。 |
| Plugin loaded / contribution visible | 插件 ACTIVE 不表示其贡献对所有 Agent 可见；Scope chain 仍决定 Prompt、Tool、Skill 与 Service 的读取视图。 |

## 二、基础架构与 Agent Loop

| 英文 / 源码用词 | 推荐中文 | 含义 |
| --- | --- | --- |
| Model | 模型 | 接收 Context，生成文本、推理内容或 Tool Call 的模型。 |
| Agent | 智能体 | 在 Harness 中根据目标持续观察、决策和行动的运行者。 |
| Agent Runtime | 智能体运行时 | 驱动“模型 → 工具 → 结果 → 模型”并维护运行控制的内核。 |
| Coding Agent | 编码智能体 | 加入文件、搜索、编辑、Shell、项目感知和验证能力的 Agent 产品。 |
| Agent Harness | 智能体运行框架 | 包住模型的完整系统，包括 Runtime、Context、Tools、State、Safety、UI 和 Extension。 |
| Capability seam | 能力接缝 / 能力边界 | Provider 与 consumer 通过稳定 Service、event 或 registry contract 组合的边界。 |
| Cordis | Cordis 插件运行框架 | DeepSeek Harness 用于 Context、Service、typed event、Fiber 与 reversible effect 的组合底座。 |
| Cordis Context | Cordis 作用域上下文 | 插件访问当前 scope 的 Service、event 与 effect API 的视图，不等同于 Model Context。 |
| Service | 服务能力 | 由 provider 插件发布、consumer 通过依赖注入访问的可替换能力。 |
| Fiber | 插件纤程 / 生命周期实例 | 管理一个插件 PENDING、LOADING、ACTIVE、UNLOADING、DISPOSED 或 FAILED 状态的运行实例。 |
| Effect | 可逆副作用 | 插件激活时建立并返回 disposer、在 Fiber 卸载时撤销的注册或资源变化。 |
| Profile | 部署组合档 | DeepSeek Harness home 中组合 Bundles、Patch 与 agent preset 的具名部署入口。 |
| Bundle | 插件组合包 | 可复用的一组 Cordis Patch，用于装配 base、web-app 或 headless 等能力。 |
| Patch | 组合补丁 | 按稳定 id 增删或替换 composition row 的配置层；固定版本同 id config 为整段替换。 |
| RLM | 递归语言模型 / RLM 编程模型 | Prime Agent 中以持久 IPython 操作 Context、调用能力并可递归创建 child Agent 的执行方式。 |
| Persistent Kernel | 持久计算内核 | 跨 Tool Calls 与 Compaction 保留 Python namespace 的长寿命 IPython 进程。 |
| Host Bridge | 宿主桥接 | Kernel 通过 typed request 请求 Provider、Session、Goal 或 child 等 Host 权威操作的协议边界。 |
| Agent Loop / Loop | 智能体循环 / 执行循环 | 重复构造请求、调用模型、执行工具、回灌结果并判断是否继续的控制结构。 |
| Query | 一次查询执行 | 从一条输入开始，由 Harness 驱动到停止、失败或等待用户的完整执行链。 |
| Turn | 轮次 | 一次用户意图的处理边界；各项目不同，DeepSeek Harness 的一个 Turn 可含 0..n Step。 |
| Step | 执行步 | 一次阶段性模型或工具推进；DeepSeek Harness 中明确为一次模型请求及其工具批次。 |
| Continuation | 继续执行 | 得到新的 Tool Result、Steering 或其他 observation 后，再构造下一次模型请求。 |
| Stop condition | 停止条件 | 最终文本、预算耗尽、Abort、不可恢复错误或 Hook 决策等结束边界。 |
| Stop reason | 停止原因 | 记录正常结束、工具调用、超限、取消或错误等终止原因。 |
| `maxTurns` / step limit | 最大轮次 / 步数上限 | 由 Harness 强制的成本与失控保护边界。 |
| Stream | 流式输出 | 模型或工具逐步产生增量事件，而不是等待完整结果后一次返回。 |
| Delta | 增量片段 | 流中的新增文本、推理或工具输入片段，通常服务实时体验。 |
| Observation | 观察结果 / 新事实 | 工具输出、错误、权限拒绝或环境变化等供下一轮模型决策使用的信息。 |
| Model boundary | 模型边界 | Runtime 与具体模型 Provider 之间的请求、流和错误协议。 |
| Fake model / fake stream | 模拟模型 / 模拟流 | 测试 Runtime 时替代真实 Provider 的确定性实现。 |

## 三、输入接纳与运行控制

| 英文 / 源码用词 | 推荐中文 | 含义 |
| --- | --- | --- |
| Prompt | 提示 / 用户输入 | 进入 Agent 的用户任务或后续控制消息；不等同于完整 Model Context。 |
| Prompt admission | 输入接纳 | 先把输入变成可靠 Session 事实，再单独调度执行。 |
| Admitted | 已接纳 | 输入已经可靠保存，但不表示模型已开始执行。 |
| Promoted | 已推进 / 已转为模型可见 | Pending input 已在安全边界进入 Session history。 |
| Durable inbox | 持久输入箱 | 保存已接纳、尚待执行或推进的 Session 输入。 |
| `next-step` inbox | 下一步输入箱 | DeepSeek Harness 中在当前 Turn 的下一 Step claim 的 steer / inject 队列。 |
| `next-turn` inbox | 下一轮输入箱 | DeepSeek Harness 中等待当前 Turn 结束后再 claim 的 followup 队列。 |
| Wake | 唤醒通知 | 告诉执行器“可能有新工作”；可以合并，不应当作可靠业务事实。 |
| Drain | 排空执行 | 一个执行 owner 串行处理当前 Session 中可推进的工作。 |
| Coordinator | 协调器 | 保证同一 Session 单执行链、不同 Session 可并发的调度组件。 |
| Steering / steer | 运行中纠偏 | 在当前安全边界后尽快进入下一轮、修正当前任务方向的输入。 |
| Follow-up | 后续输入 | 当前任务本可结束时再推进的下一条工作。 |
| Queue | 排队输入 | 等当前 Session 稳定或空闲后，按顺序逐条推进的工作。 |
| Abort | 中止 | 通过 signal 请求当前模型或工具协作式停止。 |
| Cancel | 取消 | 泛指取消请求；是否终止子进程或回滚副作用取决于具体实现。 |
| Interrupt | 打断 | 产品层停止当前 active execution 的操作，精确语义由项目定义。 |
| AbortSignal | 中止信号 | 向模型流、工具和子任务传播协作式取消的标准机制。 |
| Safe boundary / drain point | 安全边界 / 排空点 | 允许注入输入、改变工具批次或切换 Context 的确定时机。 |
| Settlement | 结算 | 把已开始的工具或步骤最终记录为成功、失败、拒绝或中断。 |
| Idempotency | 幂等性 | 同一请求重复提交不会产生重复效果。 |
| Idempotency key | 幂等键 | 用于识别同一次逻辑请求的稳定 ID，例如 Prompt message ID。 |
| Reconcile | 对账 / 重合确认 | 重试时发现已有等价事实并返回，而不是重复创建。 |
| Exactly-once | 恰好一次 | 副作用只发生一次的强保证；仅有 durable call/result 通常不能自动提供。 |
| Admission handle | 接纳句柄 | 工作被接受后立即返回的稳定 ID 与初始状态，不包含最终答案或 completion 保证。 |
| Goal | 持久目标 | 跨 turn 保存的显式 objective 与 usage 状态；普通 turn 结束不代表目标完成。 |
| Autonomous mode | 自主续行模式 | Host 根据 gate 与 turn、token、time 等限制决定是否继续注入新一轮的有界策略。 |
| Schedule | 定时任务 | 在指定时间向目标 Session 投递 prompt 的 one-shot、interval 或 cron 状态。 |
| `/heartbeat` | 用户周期提示 | Prime Agent 中由用户拥有的当前 Session recurring instruction，与连接存活检测不是同一机制。 |
| `rlm_heartbeat` | Agent 心跳任务 | 由 Agent 在当前 Session 内创建和管理的 recurring instruction，不拥有用户 `/heartbeat`。 |

## 四、Context 与 Token 管理

| 英文 / 源码用词 | 推荐中文 | 含义 |
| --- | --- | --- |
| Context | 上下文 | 模型本轮能够看到的指令、消息、工具定义和动态信息。 |
| Context window | 上下文窗口 | 模型一次请求可容纳的输入与输出总预算。 |
| Token | 词元 | 模型计费与 Context 容量使用的基本单位。 |
| Token budget | 词元预算 | 为输入、输出、工具结果或摘要预留的容量上限。 |
| Transcript | 会话全量记录 | 用于恢复、审计和分支的完整消息与工具事实，不等于每轮都发给模型。 |
| Context projection | 上下文投影 | 从 Transcript、环境和规则中选择本轮真正发送给模型的视图。 |
| System prompt | 系统提示 | 通过模型 API system 通道提供的核心产品行为与约束。 |
| System context | 系统环境上下文 | cwd、平台、Git 状态和运行环境等系统层信息。 |
| User context | 用户上下文 | 项目指令、Memory、日期等作为消息前缀进入的上下文。 |
| Context source | 上下文来源 | 具有稳定身份、加载、baseline、update 和 removed 语义的信息来源。 |
| Runtime Context | 运行时上下文 | DeepSeek Harness 将动态环境内容按来源渲染为 durable `user/message` snapshot 的机制。 |
| Baseline | 基线 | 某一时间点完整、稳定的环境或规则表示。 |
| Snapshot | 快照 | 某一时刻的结构化完整状态，用于比较、恢复或投影。 |
| Context update | 上下文更新 | Baseline 之后按时间顺序告诉模型的环境或规则变化。 |
| Context Epoch | 上下文时期 / 上下文代 | 一段共享稳定 baseline 与 snapshot 的 Context generation。 |
| `baseline_seq` | 基线序号 | Baseline 已吸收到哪个 durable sequence，用于避免重复发送旧更新。 |
| Unavailable | 暂时不可用 | 来源暂时无法观察；不应误判为内容已被删除。 |
| Removed | 已移除 | 来源被可靠确认消失，旧内容不再适用。 |
| Attachment | 动态附件 / 上下文附件 | 运行中发现并注入下一轮的规则、通知、Hook Context 或能力变化。 |
| Context admission | 上下文接纳 | 按相关性、新鲜度、生命周期和预算决定信息是否进入本轮。 |
| Progressive disclosure | 渐进披露 | 启动只展示简短目录，任务匹配后再加载完整 Skill、Memory 或 Tool schema。 |
| Deferred loading | 延迟加载 | 只有搜索或调用时才加载完整内容或 schema。 |
| Prompt cache | 提示缓存 | Provider 对稳定请求前缀的缓存；前缀变化会影响命中率。 |
| Tool-result budget | 工具结果预算 | 限制 Tool Result 在 Context 中占用的 token 或字符数量。 |
| Tool-result pruning | 工具结果裁剪 | 对超大 ToolResult 保留 head / marker / tail，并用 Surface replacement shadow 原节点。 |
| Snip / truncation | 截取 / 截断 | 删除或缩短局部大输出，同时明确告诉模型内容不完整。 |
| Microcompact | 微压缩 | 清理旧的、可重新获取的 Tool Result，尽量保留消息结构。 |
| Compaction | 上下文压缩 | 用结构化摘要、近期原文和边界重建后续活动 Context。 |
| Compaction checkpoint | 压缩检查点 | 保存目标、决策、修改、验证、失败和下一步的可继续状态。 |
| Compact boundary | 压缩边界 | 决定恢复或构造模型 Context 时，从哪里开始使用摘要后的历史。 |
| Context overflow | 上下文溢出 | 实际请求超过模型 Context window。 |
| Overflow recovery | 溢出恢复 | 在尚未产生输出时，通过一次受控 Compaction 重建请求。 |
| Recent context | 近期原文 | Compaction 后仍保留的最近对话和工具事实，作为摘要的原文锚点。 |
| Kernel namespace | 内核命名空间 | Persistent Kernel 中保存的 variables、imports 与 helper functions；与 Transcript 或 Compaction summary 不同。 |
| Continual Harness | 持续 Harness 状态 | Prime Agent 保存的 prompt、memory、skill、subagent 补充条目，按 local / global scope 进入未来 Context。 |
| Refinement | Harness 精炼 | 从 trajectory 规划并应用小型 Harness state edits 的 plan / apply 流程，带校验、冲突检查、历史和回滚。 |

## 五、Tools 与副作用

| 英文 / 源码用词 | 推荐中文 | 含义 |
| --- | --- | --- |
| Tool | 工具 | Harness 暴露给模型、由 Runtime 执行或转发的结构化能力。 |
| Tool contract | 工具契约 | 名称、描述、schema、执行、并发、权限、风险和结果策略的完整定义。 |
| Tool definition | 工具定义 | 本轮模型可见的名称、说明与输入 schema，不包含直接宿主执行权。 |
| Tool schema | 工具模式 | 约束输入或输出结构的 JSON Schema、Zod 或其他 codec。 |
| Tool registry | 工具注册表 | 管理候选工具、当前实现和本轮可见目录的组件。 |
| Policy waterfall | 策略瀑布链 | 多个插件按顺序检查、收紧或包裹一次 Tool execution 的组合事件链。 |
| Monotonic guard | 单调收紧守卫 | 防止后续 policy 阶段重新放宽已经拒绝或收紧的安全决定。 |
| Code mode | 代码工具模式 | 模型只直接调用 `run_code`，内部程序再经 Tool SDK 调用受 scope 约束的工具。 |
| Exclusive barrier | 独占屏障 | 写或未知并发性的 Tool 等待此前调用完成，并阻止后续调用越过的调度边界。 |
| Materialization | 实体化 / 本轮固化 | 为一次模型 Turn 固定 Tool definitions 与 settlement identity。 |
| Tool visibility | 工具可见性 | 决定本轮模型是否看到某项能力，不等于调用已获授权。 |
| Tool call / `tool_use` | 工具调用请求 | 模型提出的工具名、调用 ID 与结构化参数。 |
| Tool result | 工具结果 | Runtime 对应 Tool Call 返回的成功、错误、拒绝或中断 observation。 |
| Error ToolResult | 错误工具结果 | 将未知工具、校验失败、权限拒绝或执行异常显式回灌给模型。 |
| Tool leaf | 工具叶实现 | 解析具体资源、检查权限并执行最终副作用的实现层。 |
| Built-in tool | 内置工具 | 随 Harness 提供的 Read、Edit、Bash 等工具。 |
| Application tool | 应用工具 | 由宿主应用注册的自定义本地工具。 |
| Provider-executed tool | Provider 执行工具 | 由模型供应商在远端执行，Harness 只记录和还原结果的工具。 |
| Deferred tool | 延迟工具 | 启动时只展示名称或描述，需要时再加载完整 schema。 |
| Input validation | 输入校验 | 在副作用前检查工具参数结构与业务约束。 |
| Output validation | 输出校验 | 在回灌模型或持久化前检查工具返回值结构。 |
| Side effect | 副作用 | 文件、进程、网络、数据库或外部服务产生的真实状态变化。 |
| Host side effect | 宿主副作用 | 在运行 Harness 的机器或环境中发生的副作用。 |
| Concurrency-safe | 可安全并发 | Tool contract 声明可与同组工具并行且不会产生危险时序冲突。 |
| Tool batch | 工具批次 | 同一 assistant output 中需要按并发 contract 组织执行的一组 Tool Calls。 |
| Stale tool call | 陈旧工具调用 | 模型看到的工具实现已被替换或移除，Runtime 拒绝执行新实现。 |
| Stale content | 陈旧内容 | Edit 基于的旧文件内容已变化，需要重新读取后再修改。 |
| Compare-and-write | 比较后写入 | 写入前确认当前 bytes 与预期一致，避免覆盖并发变化。 |
| Output bounding | 输出限界 | 控制模型可见输出的行数、字节数或 token，并保存完整结果到其他存储。 |
| Tool hook | 工具钩子 | 在工具执行前后运行的确定性扩展点，例如 PreToolUse / PostToolUse。 |
| PreToolUse | 工具执行前钩子 | 可补充 Context、修改输入、给出权限建议或阻止执行。 |
| PostToolUse | 工具执行后钩子 | 在得到真实结果后执行格式化、检查或附加 Context。 |

## 六、Session、事件与客户端状态

| 英文 / 源码用词 | 推荐中文 | 含义 |
| --- | --- | --- |
| Session | 会话 | 保存输入、消息、工具、Context 边界与恢复状态的执行容器。 |
| Session history | 会话历史 | 按顺序投影出的用户、模型、工具和系统更新。 |
| Durable | 持久可靠 / 可恢复 | 已进入可靠存储并具有明确恢复语义；不自动等于 exactly-once。 |
| Event | 事件 | 表示一次已经发生的状态变化。 |
| Event log | 事件日志 | 按顺序保存可回放事件的事实存储。 |
| Durable event | 持久事件 | 已可靠保存、可按 sequence 重放的事件。 |
| Ephemeral event | 临时事件 | 只服务当前进程或在线客户端、断线后可能丢失的事件。 |
| Event stream | 事件流 | 按发生顺序持续传输事件的通道；是否可靠取决于存储和 cursor。 |
| Sequence / `seq` | 序号 | 一个 Session aggregate 内单调推进的事件位置。 |
| Cursor | 游标 | 客户端最后成功归约的 sequence，用于补读缺口。 |
| Generation cursor | 代际游标 | `{generation, sequence}` 事件位置；generation 变化后旧 sequence 不再可比较，应以 snapshot 对齐。 |
| Replay | 重放 | 从事件日志重新读取事实并重建状态。 |
| Projection | 投影 | 从完整事实构造面向模型、客户端或查询的特定视图。 |
| Session Surface | 会话活动表面 | DeepSeek Harness 从 append-only log 维护的模型活动节点集合。 |
| `surfaceOp` | 表面操作 | message event 声明的 append 或 replace 操作；replace shadow 区间但不删除审计事件。 |
| Request header | 请求头快照 | 保存一次模型请求的 provider、model、config、system 与 tools 的 durable 记录。 |
| Write-behind | 异步延后写入 | 事件热路径先接受，Persistence 再按批次落盘；需要 flush 契约区分内存接纳与持久完成。 |
| Client projection | 客户端投影 | UI 为渲染维护的当前状态，不是 Server 的唯一真相。 |
| Reducer | 归约器 | 按顺序把 Event 应用到 State 的确定性函数。 |
| Hydration | 状态装载 | 用 REST 或存储快照初始化客户端状态，再与 live delta 合并。 |
| Live stream | 实时流 | 为在线体验发送最新变化，通常不保证断线回放。 |
| Durable stream | 可重放持久流 | 先按 cursor 补历史，再持续 tail 新事件的流。 |
| PubSub | 发布订阅 | 进程内或分布式的事件通知机制；不应默认当成 durable log。 |
| Heartbeat | 连接心跳 | 维持连接和检测存活的周期消息，不代表业务状态变化；Prime Agent 的 `/heartbeat` 产品命令另指用户周期提示。 |
| Backpressure | 背压 | 消费者跟不上生产者时限制缓存、批量处理或显式失败的机制。 |
| Bounded subscriber | 有界订阅者 | 使用固定容量队列，防止慢客户端无限占用内存。 |
| Batch / batching | 批处理 | 在短时间窗口内归约多个 delta，减少 UI 重复渲染。 |
| Operational state | 运行态 | active owner、pending permission、tool fiber 等当前进程状态。 |
| Execution owner | 执行所有者 | 当前负责推进某个 Session 的进程或协调器实例。 |
| Activation | 运行激活实例 | DeepSeek Harness continuable child 的 process-local AgentHandle owner；durable Session 最多对应一个 live Activation。 |

## 七、持久化、恢复与分支

| 英文 / 源码用词 | 推荐中文 | 含义 |
| --- | --- | --- |
| Append-only | 只追加 | 新事实只追加，不原地覆盖或删除旧历史。 |
| JSONL | 逐行 JSON | 每行一个 JSON 对象的日志格式，适合追加和流式读取。 |
| DAG | 有向无环图 | 通过父节点关系表达会话分支而不删除旧分支。 |
| `parentUuid` | 父节点标识 | 指向当前 transcript entry 的逻辑父节点。 |
| Leaf | 叶节点 | 当前选中会话分支的最后一个节点。 |
| Resume | 恢复原会话 | 使用原 Session ID 和状态继续追加。 |
| Fork / branch | 分叉 / 创建分支 | 从选中历史创建新 Session 或新分支，保留原会话。 |
| Rewind | 回退选择点 | 将活动会话或文件状态切回较早 checkpoint；不等于通用副作用回滚。 |
| Rollback | 事务回滚 | 撤销真实副作用并恢复一致世界状态，需要专门事务或补偿设计。 |
| Checkpoint | 检查点 | 可用于恢复的消息、文件或 Context 状态锚点。 |
| File checkpoint | 文件检查点 | 记录可恢复的文件内容或修改状态，不覆盖网络、数据库等副作用。 |
| Sidechain transcript | 侧链会话记录 | Subagent 独立于主 Agent 保存的 transcript。 |
| Crash recovery | 崩溃恢复 | 进程退出后根据 durable facts 识别并恢复或结算未完成工作。 |
| Reconciliation | 状态对账 | 对比 durable facts 与真实宿主状态，判断副作用是否已发生。 |
| Session lease | 会话租约 | 按 canonical transcript path 保护持久 Session 单写者 ownership 的进程协调锁。 |
| Command journal | 命令日志 | 在 dispatch 前保存 receipt，并记录 result / acknowledgement 以支持去重和恢复判断的追加日志。 |
| Uncertain mutation | 结果不确定的变更 | 副作用可能已发生但 durable result 缺失；必须显式对账，不能假定失败或自动重放。 |

## 八、安全、权限与 Sandbox

| 英文 / 源码用词 | 推荐中文 | 含义 |
| --- | --- | --- |
| Safety | 安全控制 | 限制模型行为、授权范围和真实执行能力的整体设计。 |
| Threat model | 威胁模型 | 明确要防御的误操作、恶意仓库、Prompt Injection、依赖脚本和越权场景。 |
| Blast radius | 影响半径 | 单次错误或恶意操作最多能影响的资源范围。 |
| Policy | 策略 | 根据输入和配置产生允许、询问或拒绝决策的规则集合。 |
| Permission | 权限 | 对特定 Tool、action 或 resource 的调用许可。 |
| Approval | 审批 / 授权确认 | 在执行前由用户、Hook 或自动 reviewer 决定是否继续。 |
| Reviewer | 审批者 | 作出批准或拒绝决定的用户或自动系统。 |
| Guardian | 自动安全审批者 | 在 Codex 执行链中对权限请求做自动审查的组件。 |
| `allow` | 允许 | 当前规则允许调用继续。 |
| `deny` | 拒绝 | 当前规则明确禁止调用。 |
| `ask` | 询问 | 暂停当前工具，等待审批决定。 |
| `once` | 仅本次允许 | 只批准当前 pending request。 |
| `always` | 保存允许规则 | 批准当前请求，并在允许时持久化后续匹配规则。 |
| `reject` | 拒绝请求 | 不执行当前副作用，并向模型返回拒绝事实。 |
| Approval policy | 审批策略 | 决定什么情况下可以或必须向 reviewer 请求授权。 |
| `on-request` | 按需审批 | 普通命令可在 Sandbox 内执行；模型请求提升或策略要求时再审批。 |
| `never` | 永不询问 | 不弹审批；Sandbox 仍可存在，越界失败直接返回模型。 |
| `untrusted` / `UnlessTrusted` | 未信任模式 | 只自动允许有限安全操作，其他操作需要审批。 |
| Permission rule | 权限规则 | 由 action、resource pattern 与 effect 构成的授权判断。 |
| Permission mode | 权限模式 | 一组产品级默认交互和授权行为，例如 plan、acceptEdits。 |
| Permission Profile | 权限配置档 | 文件和网络 enforcement 的 canonical runtime representation。 |
| Managed profile | 运行时托管权限档 | Harness 构造并执行文件系统与网络 Sandbox。 |
| Disabled profile | 禁用外层 Sandbox | Harness 不施加自身文件 Sandbox，属于明确高风险或外部隔离场景。 |
| External profile | 外部隔离权限档 | 文件系统 enforcement 由外部环境负责，Harness 仍可管理其他能力。 |
| Sandbox | 沙箱 / 隔离执行环境 | 在 OS 或外部环境层限制进程及其子进程的实际文件、网络和系统能力。 |
| Sandbox policy | 沙箱策略 | 描述可读、可写、拒绝和网络能力的抽象规则。 |
| `read-only` | 只读模式 | 允许读取，不允许工作区写入的常见 Sandbox 配置。 |
| `workspace-write` | 工作区可写模式 | 允许写 workspace roots 和指定临时目录，同时保留受保护 carve-outs。 |
| `danger-full-access` | 危险完全访问模式 | 不施加这套本地文件 Sandbox，应只用于已有可靠外部隔离的环境。 |
| Escalation | 权限提升 | 为当前调用请求比默认 profile 更大的能力。 |
| `require_escalated` | 请求提升执行 | 明确要求使用更高权限的执行路径，并提供理由。 |
| Additional permissions | 附加权限 | 在基础 profile 上为一次命令请求的精确权限 overlay。 |
| Sticky permissions | 会话内持续权限 | 已批准并可在当前受限范围内复用的权限片段。 |
| Writable root | 可写根目录 | Sandbox 允许写入的绝对路径根。 |
| Read carve-out | 只读挖除项 | 从可写根中重新划为只读的子路径。 |
| Deny-read | 禁止读取 | 不仅禁止写入，还阻止读取敏感文件或目录。 |
| Protected metadata | 受保护元数据 | `.git`、`.agents`、`.codex` 等会改变 Git 或 Harness 后续行为的控制文件。 |
| Canonical path | 规范路径 | 解析相对路径、符号链接等后用于权限判断的稳定目标。 |
| Symlink | 符号链接 | 可能让表面位于 workspace 的路径指向外部真实目标，必须纳入 canonical 检查。 |
| Fail closed | 失败时拒绝 | 规则损坏、来源不可验证或 Sandbox 不可用时默认阻止，而不是放行。 |
| Enforcement level | 强制等级 | Sandbox backend 显式报告 full 或 partial，避免把平台能力不足伪装成完整隔离。 |
| FS observation policy | 文件观察策略 | 写入前要求已读取版本或 CAS，未观察编辑返回 `FS_NOT_OBSERVED`；不是 OS security boundary。 |
| Sandbox denial | 沙箱拒绝 | 命令已启动，但真实访问被 OS 或网络策略阻止。 |
| Network capability | 网络能力 | Sandbox 是否允许进程获得网络访问能力。 |
| Managed proxy | 受控代理 | 对允许的流量继续执行域名、方法、本地绑定或 socket 策略。 |
| Domain allowlist | 域名允许列表 | Proxy 允许访问的域名集合；冲突时通常 deny 优先。 |

## 九、模型 Provider 与协议适配

| 英文 / 源码用词 | 推荐中文 | 含义 |
| --- | --- | --- |
| Provider | 模型供应商 / 提供方 | 提供模型、认证、API 与连接能力的服务。 |
| Model catalog | 模型目录 | 当前部署可用模型、能力、限制、价格和默认值的运行时真相。 |
| Model reference | 模型引用 | Session 选择的 provider ID、model ID 和 variant。 |
| Route | 调用路由 | 将模型部署绑定到 Protocol、Endpoint、Auth、Framing 和 Transport。 |
| Protocol | 协议适配 | 构造 Provider request body，并把响应解析成 canonical events。 |
| Endpoint | 服务端点 | 模型 API 的 base URL 与 path。 |
| Auth / credential | 认证 / 凭据 | API key、OAuth token 或签名方式；不应作为普通 body 记录。 |
| Framing | 分帧协议 | SSE、JSON lines、WebSocket 等流式边界。 |
| Transport | 传输层 | HTTP 或 WebSocket 的实际网络 I/O。 |
| Variant | 模型变体 | 同一模型 Route 下 reasoning effort、temperature 或 service tier 等请求组合。 |
| Fallback | 回退选择 | 首选模型不可用时选择其他模型；显式模型失败不应被静默回退掩盖。 |
| Retry | 重试 | 在满足幂等和阶段条件时重新尝试同一网络或执行操作。 |
| Retryable error | 可重试错误 | 限流、短暂服务错误等被明确分类为可安全再次尝试的错误。 |
| Exponential backoff | 指数退避 | 重试间隔逐步增长并通常加入随机抖动的策略。 |

## 十、Memory、Extension 与 Multi-Agent

| 英文 / 源码用词 | 推荐中文 | 含义 |
| --- | --- | --- |
| Instruction | 指令 | 对 Agent 行为、项目约定或工作流程的明确要求。 |
| Project instruction | 项目指令 | `AGENTS.md`、`CLAUDE.md` 或 rules 中与项目相关的稳定约束。 |
| Rule | 规则 | 可带路径条件或匹配条件的项目、权限或扩展约束。 |
| Skill | 技能 | 按需加载的知识、步骤、工具范围和工作流包。 |
| Python-backed Skill | Python 技能包 | 同时含 `SKILL.md` 与真实 Python package、可从 Persistent Kernel import / call 的 Skill。 |
| Harness skill entry | Harness 技能条目 | Continual Harness 中对既有 Python callable 的 reference 与 argument contract，不是可执行 package。 |
| Hook | 钩子 | 在确定事件边界运行的可编程扩展，例如 PreToolUse、Stop、Compact。 |
| MCP | 模型上下文协议 | 连接外部 tools、resources 和 prompts 的标准协议。 |
| Plugin | 插件 | 将 Skills、Agents、Hooks、MCP 等能力组合、命名空间化并分发的边界。 |
| Extension | 扩展机制 | 为 Harness 增加指令、知识、工具、策略或 Agent 的方式。 |
| Dynamic Cordis package | 动态 Cordis 包 | DeepSeek Harness 中由模型 define / run / stop / undefine 的进程内临时扩展；不自动持久，`node:vm` 不是安全边界。 |
| Agent definition | Agent 定义 | 描述专用 Agent 的 system prompt、model、tools、permissions、Skills 和 limits。 |
| Custom Agent | 自定义 Agent | 具有独立 Context、工具或模型边界的可复用 Agent 角色。 |
| Memory | 长期记忆 | 跨 Session 保存、未来可能复用且不易重新推导的少量知识。 |
| Auto Memory | 自动记忆 | 由后台模型从历史中提取并保存的候选跨会话知识。 |
| Memory index | 记忆索引 | 启动时加载的小型入口，列出高价值事实和可按需读取的主题。 |
| Topic file | 主题记忆文件 | 保存某个领域详细长期知识、需要时再加载的文件。 |
| Recall | 回忆 / 检索记忆 | 根据当前任务选择少量相关 Memory topic 注入 Context。 |
| Subagent | 子智能体 | 拥有独立 loop、Context、Tool view、permission view 和 transcript 的 Agent。 |
| Continuable child | 可续行子智能体 | 使用 durable Session / Inbox 接受多轮 followup，并按需建立 process-local Activation 的 child。 |
| Job | 后台工作记录 | 以 owner Session 授权和查询的通用后台 operation registry。 |
| Workflow | 编排工作流 | 在 worker thread 中运行 orchestration script 并启动 Subagents 的能力；worker / vm 不构成授权边界。 |
| Fresh agent | 全新上下文 Agent | 从零对话 Context 启动，父 Agent 必须提供完整 brief。 |
| Fork agent | 继承上下文 Agent | 继承父 Context 后启动独立 loop。 |
| Foreground agent | 前台 Agent | 父 Agent 等待其完成后再继续。 |
| Background agent | 后台 Agent | 父 Agent 启动后继续工作，完成结果通过通知回传。 |
| Brief | 任务简报 | 给 Fresh Agent 的目标、范围、已知事实、约束和输出格式。 |
| Worktree isolation | Worktree 文件隔离 | 使用独立 Git working tree 减少多个 Agent 同时修改相同文件。 |
| Agent Team | Agent 团队 | 多个持续运行的 Agent，加上共享 Tasks、Mailbox 和权限同步。 |
| Leader | 负责人 Agent | 创建 Team、分配任务、处理协调和权限请求的主 Agent。 |
| Teammate | 队友 Agent | 具有独立 loop、状态与 mailbox 的团队成员。 |
| Task | 结构化任务 | 包含 ID、描述、owner、status 和 dependencies 的协调事实。 |
| Ownership / owner | 所有权 / 负责人 | 明确哪个 Agent 负责推进某个 Task 或文件范围。 |
| Dependency | 依赖 | 一个 Task 开始前必须完成的其他 Task。 |
| Claim | 领取任务 | 在锁和依赖检查下取得 Task ownership。 |
| Mailbox | 消息箱 | Agent 间传递 direct message、Task、permission、plan 和 shutdown 协议的通道。 |
| Permission sync | 权限同步 | Worker 将 ask 转发给 Leader / 用户，再接收 scoped response 的协议。 |
| Idle | 空闲等待 | Agent 当前没有可执行输入、等待新消息；不等于完成或崩溃。 |
| Shutdown protocol | 关闭协议 | 通过 request、approved 或 rejected 消息有序结束 Teammate。 |

## 十一、平台机制与常见缩写

| 英文 / 缩写 | 推荐中文 | 含义 |
| --- | --- | --- |
| CLI | 命令行界面 | 通过命令和标准输入输出使用 Harness。 |
| TUI | 终端用户界面 | 在终端中提供交互式布局和实时状态。 |
| UI | 用户界面 | 面向用户展示状态并接收输入的界面。 |
| API | 应用程序接口 | Client 与 Server 或模块之间的调用契约。 |
| SDK | 软件开发工具包 | 封装 API、类型和事件订阅的客户端库。 |
| RPC | 远程过程调用 | 跨进程或传输边界调用服务方法。 |
| SSE | 服务器发送事件 | 基于 HTTP 的单向事件流格式；本身不提供 durable replay。 |
| JSONL | 逐行 JSON | 每行一个 JSON 对象，适合 append-only transcript。 |
| DAG | 有向无环图 | 用父子关系表达可分支 Session history。 |
| MCP | 模型上下文协议 | 外部工具、资源和提示接入协议。 |
| LSP | 语言服务器协议 | 编辑器或 Harness 获取代码诊断、跳转和语义信息的协议。 |
| ACL | 访问控制列表 | Windows 等平台用于表达对象访问权限的机制。 |
| WSL2 | 第二代 Windows Linux 子系统 | 使用虚拟化 Linux 内核，可运行 Linux Sandbox 后端。 |
| Seatbelt | macOS 沙箱机制 | 通过动态 profile 限制进程文件和网络访问。 |
| `sandbox-exec` | macOS 沙箱启动器 | 使用 Seatbelt profile 启动受限进程的固定系统工具。 |
| bubblewrap / bwrap | Linux 隔离工具 | 使用 namespace 和 bind mount 构造受限文件与网络视图。 |
| Landlock | Linux 文件访问控制 | Linux 内核的非特权文件访问限制机制；旧 ABI 可能只能提供 partial enforcement。 |
| Namespace | Linux 命名空间 | 隔离 mount、network、process 等系统资源视图。 |
| seccomp | 系统调用过滤 | Linux 内核限制进程可调用系统调用的机制。 |
| `no_new_privs` | 禁止获得新权限 | Linux 进程属性，阻止后续 `exec` 获得额外 privilege。 |
| Restricted token | 受限访问令牌 | Windows 通过收紧身份和能力启动子进程的机制。 |
| Capability SID | 能力安全标识 | Windows 用于配合 token 与 ACL 表达受限能力的 SID。 |

## 十二、六个项目的常见源码名速查

### Pi Mono

| 源码名 | 中文理解 |
| --- | --- |
| `Agent` | 有状态 Agent wrapper，负责 State、队列、Abort 和订阅。 |
| `agent-loop.ts` | 低层模型与工具循环核心。 |
| `AgentMessage` | Harness 内可包含应用自定义消息的消息类型。 |
| `transformContext()` | 在 AgentMessage 层构造本次请求视图。 |
| `convertToLlm()` | 过滤并转换为模型协议支持的消息。 |
| `AgentEvent` | Loop 向 wrapper 和外部系统发出的运行事件。 |
| `ToolResultMessage` | 与 Tool Call 对应、可驱动下一轮的工具结果消息。 |
| `StreamFn` | 可注入的流式模型调用边界。 |

### OpenCode

| 源码名 | 中文理解 |
| --- | --- |
| `PromptAdmitted` | 输入已进入 durable Session inbox。 |
| `Prompted` | 输入已在安全边界进入模型可见历史。 |
| `SessionRunCoordinator` | 保证同一 Session 串行 drain 的协调器。 |
| `ToolRegistry.materialize()` | 为当前 provider turn 固定工具目录和结算身份。 |
| `PermissionV2.assert()` | Tool leaf 在副作用前进行资源级授权。 |
| `Tool.Called` | 工具副作用开始前的 durable 调用事实。 |
| `Tool.Success` / `Tool.Failed` | 工具成功或失败的 durable 结算事实。 |
| `SessionContextEpoch` | 管理 Context baseline、snapshot 与更新代际。 |
| `ContextUpdated` | 按时间顺序记录环境或项目指令变化的 system message。 |
| `EventV2.durable()` | 按 durable sequence 补读并 tail Session events。 |
| `SyncProvider` | 现有 TUI 的 REST snapshot + live delta 状态源。 |
| `DataProvider` | 面向 V2 events 的客户端 reducer。 |

### Codex CLI

| 源码名 | 中文理解 |
| --- | --- |
| `AskForApproval` | 审批交互策略。 |
| `PermissionProfile` | 文件与网络 enforcement 的 canonical runtime 表示。 |
| `TurnEnvironment` | 本轮 environment、cwd、workspace roots、shell 和权限快照。 |
| `ExecPolicy` | 将 Shell command 分类为 Allow、Prompt 或 Forbidden。 |
| `ExecApprovalRequirement` | Orchestrator 使用的 Skip、NeedsApproval 或 Forbidden 控制结果。 |
| `ToolOrchestrator` | 统一组织审批、Sandbox、执行与 denial retry。 |
| `SandboxManager` | 将抽象 profile 转换为平台执行后端。 |
| `SandboxErr::Denied` | 已执行但命中 OS 或网络边界的拒绝结果。 |
| `require_escalated` | Tool Call 明确请求更高权限执行的参数。 |
| `additional_permissions` | 为当前命令请求的精确附加权限。 |

### Claude Code

| 源码名 / 产品名 | 中文理解 |
| --- | --- |
| `queryLoop()` | 驱动模型、工具结果和停止判断的外层循环。 |
| CLAUDE.md | 每次相关会话都应接纳的项目或用户稳定指令。 |
| Attachment | 运行中动态注入的规则、通知或 Context 增量。 |
| Microcompact | 优先清理旧 Tool Result 的局部 Context 回收。 |
| Compaction | 生成 continuation checkpoint 并重建活动 Context。 |
| Auto Memory | 后台提取并可跨会话 recall 的候选长期知识。 |
| Sidechain | Subagent 独立于主 Agent 的 transcript 链。 |
| Agent Team | 具有 Team config、shared Tasks、Mailbox 和 permission sync 的多 Agent 协作。 |
| Skill | 按需加载的工作流与知识包。 |
| Hook | 在确定事件边界运行的策略或自动化。 |
| Plugin | 组合并分发 Skills、Agents、Hooks 和 MCP 等扩展的边界。 |

### Prime Agent

| 源码名 | 中文理解 |
| --- | --- |
| `AgentSession` | Provider、Context、工具、队列、Compaction、Goal 与 child lifecycle 的权威 Session owner。 |
| `KernelManager` | 启动并管理 IPython、Jupyter sockets、cell serialization、Host request 与 namespace snapshot。 |
| `host.request` | Python shim 经 Jupyter comm 发给 TypeScript Host 的 typed request target。 |
| `rlm()` / `rlm.run` | Kernel 侧 child admission API 与对应 Host request；返回 handle，不返回 child 最终答案。 |
| `SessionManager` | 读写 append-only JSONL tree、branch 与 Session metadata 的持久化组件。 |
| Continual Harness state | local / global 的 prompt、memory、skill、subagent 补充条目集合。 |
| `planRefinement()` / `_applyRefine()` | 将模型规划与 turn-boundary 冲突检查、原子 apply 分开的 Refinement 两阶段。 |
| `DaemonAgentConnection` | Client 侧 attachment、event replay、snapshot 与 reconnect 边界。 |
| `DaemonEventCursor` | 由 generation + sequence 构成的事件位置。 |
| `CommandRecoveryJournal` | 按 client ID + command ID 去重已完成 mutation，并保留 uncertain 状态。 |
| `GoalState` | durable objective、status、usage、budget 与 continuation 计数。 |
| `AutonomousRuntimeState` | Gate、continuation / turn / token / time limit 与 workspace fingerprint 状态。 |
| `AgentCronJob` | user heartbeat、RLM heartbeat 或 general schedule 的持久 job。 |

### DeepSeek Harness

| 源码名 | 中文理解 |
| --- | --- |
| `Context` | Cordis 的 scoped plugin context，提供 Service、event 与 effect API，不是模型 Context。 |
| Fiber | 一个插件的加载、ACTIVE、卸载与失败生命周期实例。 |
| `ctx.effect()` | 注册 setup / disposer 对，使插件 side effect 随 Fiber 卸载撤销。 |
| Profile / Bundle / Patch | 具名部署组合、可复用组合层与按 id 定位的配置 overlay。 |
| `ReactLoopAgent` | 以 idle / maintenance / running phase 驱动 durable Inbox、Turn 与 Step 的 Agent 实现。 |
| `agent/inbox/spliced` | 记录 next-step / next-turn 队列变化、供恢复重放的 Session event。 |
| `request/header` | 固化 provider、model、config、system 与 tool definitions 的请求快照。 |
| `ToolRuntime` | 统一执行参数快照、policy、Approval、guard、body、finalizer 与 canonical result 的边界。 |
| `SessionSurface` | 通过 append / replace 从完整 event log 投影模型活动历史。 |
| `SESSION_FORMAT_VERSION` | 固定版本为 `0`；不支持的持久格式会被拒绝。 |
| Activation | continuable child 的 process-local live owner；child Session 本身可持久恢复。 |
| `dynamicCordisRunner` | 管理会话拥有的进程内动态 Cordis 定义与 run / stop 生命周期的 Service。 |

## 维护规则

后续新增学习记录时：

1. 新术语第一次出现应链接或补充到本表。
2. 不为源码类型强行创造与现有文档不一致的中文名。
3. 若不同项目对同一词的定义不同，应增加项目限定，而不是覆盖共同定义。
4. 对带安全保证的词注明证据范围和平台限制。
5. 对已经废弃或只存在于固定 commit 的术语标记版本边界。
