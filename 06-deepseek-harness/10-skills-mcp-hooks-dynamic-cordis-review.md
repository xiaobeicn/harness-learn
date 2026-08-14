# 第 10 课：Skills、MCP、Hooks、动态 Cordis 与六项目复盘

[返回本阶段目录](README.md) · [上一课](09-subagent-jobs-goal-schedule-workflow.md) · [Extensions 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/extensions.md) · [Skills 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/skills.md) · [MCP Client](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/mcp/mcp-client/README.md) · [课程实验](../examples/06-deepseek-harness/10-extension-routing/index.mjs) · [六项目横向对照](../comparison.md)

## 核心问题

同一个“扩展能力”可以写成 Cordis plugin、Skill、MCP server、兼容 Hook 或动态 Cordis package。怎样按能力、生命周期与信任面选择，而不是只看接入是否方便？

## 五种扩展面

| 扩展面 | 适合什么 | 生命周期 / 信任 |
| --- | --- | --- |
| Cordis plugin | Service、events、effects、tools、prompt、UI 与核心行为。 | 最强、类型化、随 Fiber 可卸载；受部署信任。 |
| Skill | 可发现、按需加载的说明与资源。 | Provider registry 合并，正文仅在调用时加载。 |
| MCP | 外部进程 / 服务提供标准工具。 | transport 生命周期独立，工具注册随插件代际替换。 |
| Hook | 兼容 Claude Code / Codex 的部分事件自动化。 | 只覆盖兼容子集，不等同原生 Cordis API。 |
| 动态 Cordis package | 会话内快速试验 Host / Browser 插件。 | 进程内、可 run / stop，不自动持久，按 bash 权限看待。 |

## Skills 的作用域与按需加载

`ctx.skills` 合并 global 与 per-scope providers，近层同名 skill shadow 远层。单层内按 rank、provider order、local order 决定 winner。

本地 discovery rank 从项目 `.dsh/skills`、项目 `.agents/skills`、custom、用户目录到 bundled 依次排列。Catalog 只向模型展示可调用 Skill 的 name / description，不在每次请求塞入正文或绝对路径；完整 body 由 `get()` 按需加载。

Provider 失败可以产生 incomplete observation。Incomplete catalog 不缓存，consumer 可保留 last-good filtered catalog 并稍后重试，不能把暂时发现失败当成权威空目录。

## MCP Tool Bridge

固定版本一个 plugin instance 对应一个 MCP server，支持 `stdio` 与 `streamable-http`。工具注册为：

```text
mcp__<serverName>__<rawName>
```

名字规范化后仍用 `(serverName, rawName)` 的确定性 hash 防碰撞。连接后先 `listTools()` 再原子注册 generation；list-changed 或 reconnect 会替换 generation，不累积旧 schema。

断线时 last-good tools 可暂时保留但调用失败；超过 reconnect attempt budget 后会撤销。插件卸载取消 reconnect 并注销工具。

`限制`：当前只桥接 MCP Tools，Resources 与 Prompts 没有 Harness consumer；native model history 对 image、audio、resource 只保留 placeholder，完整 JSON 只在 execution-local canonical value 中存在。

## Hooks 是兼容桥

固定源码分别提供 [Codex](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/hooks/hooks-codex/README.md) 与 [Claude Code](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/hooks/hooks-claude-code/README.md) 风格 Hook bridge，但只实现各自支持的事件子集。Hook 适合迁移已有自动化；需要 typed Service、可组合 waterfall、UI slot 或精确 disposer 时，应选择原生 Cordis plugin。

兼容名称不能证明语义与原产品所有版本完全相同，仍需按固定 package README 验证事件和 payload。

## 动态 Cordis

模型可通过 [Cordis toolset](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/extensions/tool-cordis/README.md) 的 `cordis_inspect`、`cordis_define`、`cordis_run`、`cordis_stop` 与 `cordis_undefine` 操作当前进程中的临时 package；生命周期与信任边界由 [Host runner](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/extensions/cordis-host-runner/README.md) 定义。

- define 只记录并语法检查，不自动 run。
- run 装载 Host half，并可把 Browser half 发送给打开的 Web 页面。
- stop 撤销运行贡献但保留定义。
- undefine 停止并忘记定义。
- 定义只在进程内存；Session log 只留 metadata，不保存 code，不会在重启后恢复。

Host half 使用 `node:vm` 隐藏或重定向常见 globals，并提供受限 ctx façade。但 host-realm helper 可逃逸，`vmTimeoutMs` 也只约束同步阶段；异步代码可超出时间界限。

`限制`：这不是 security boundary，应按授予 bash 的信任等级启用。带 Browser half 的 package 在没有页面时会等待到当前 Turn 取消。

## 六个项目各取一块

```text
Pi Mono          → 小而可测试的 Agent loop
OpenCode         → durable facts、执行 owner 与 client projection
Codex CLI        → canonical permission + Approval + OS enforcement
Claude Code      → Context 生命周期、Memory 与显式 Multi-Agent 协调
Prime Agent      → persistent Python、typed Host、RLM 与 Daemon continuity
DeepSeek Harness → Cordis capability seams、reversible effects 与 logged model visibility
```

自研 Harness 时可以形成以下基线：

1. Runtime core 对 Provider、UI、Persistence 与 Sandbox 依赖注入。
2. 所有模型可见动态内容留下 durable snapshot。
3. Tool 参数、policy、Approval、执行、结果和 commit 经过统一边界。
4. 审计 log 与模型 Surface 分离，Compaction 只推进 projection。
5. 进程状态、durable Session、外部副作用与 client projection 分层。
6. 每个扩展贡献绑定 scope 与 reversible lifecycle。
7. 安全依赖 canonical resource 与 OS enforcement，不依赖 Prompt 或 `node:vm`。
8. 长任务对象分别声明 admission、owner、completion、resume 与 crash semantics。

## 实验

```bash
node examples/06-deepseek-harness/10-extension-routing/index.mjs
```

`实验`：脚本根据扩展需求选择 Skill、MCP、Hook、Cordis plugin 或 dynamic package，并串联 composition、Inbox、request snapshot、ToolResult、Surface 与卸载回滚。

## 阶段复述题

1. Profile、Bundle 与 Patch 分别是什么？
2. Fiber unload 为什么能撤销 Tool 和 event listener？
3. `next-step` 与 `next-turn` 的 claim 时机有什么不同？
4. request header、raw chunks、assistant message 与 Surface 各保存什么？
5. 为什么并发 tool body 仍能保持模型顺序 commit？
6. Approval、Filesystem containment 与 OS Sandbox 各解决什么？
7. child Session durable 与 Activation process-local 怎样共同支持 cold followup？
8. 哪类扩展可以提供 Service 和 UI，哪类只提供按需说明，哪类只桥接外部 Tools？

## 本课结论

- `源码/文档`：Cordis plugin 是最强原生扩展面；Skill、MCP 与 Hook 分别服务知识、外部工具和兼容自动化。
- `源码`：MCP generation 原子替换并随 lifecycle 撤销；固定版本只桥接 Tools。
- `源码/文档`：动态 Cordis 适合临时试验，但定义不持久，`node:vm` 不是安全边界。
- `结论`：DeepSeek Harness 最有辨识度的贡献是让 Harness 本身成为 scoped、可组合、可撤销的能力图，并要求模型可见变化可记录。
- `限制`：本阶段未安装或运行真实 DeepSeek Harness、MCP server、Web browser half 与跨平台 Sandbox；所有“实验”是课程语义模型。

## 后续

回到[六个 Agent Harness 横向对照](../comparison.md)，逐列检查证据标签。升级上游 commit 时，首先复核 Profile patch 语义、Session format、Tool pipeline、MCP capability 与动态扩展信任边界。
