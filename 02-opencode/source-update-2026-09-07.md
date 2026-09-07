# OpenCode 版本更新与迁移边界（2026-09-07）

[返回本阶段](README.md) · [全部来源版本](../source-updates.md)

本次基线：`2f17fc9 → 57ef382`，opencode 1.18.29。更新的是核验时上游 `dev` 分支 HEAD；包版本相同也不代表提交相同。以下 `源码` 指新 commit，`文档` 指对应上游说明，`学习推论` 不作为运行结果。

## V2 主线与 V1 兼容继续分开

`源码`：本轮比较课程引用的 V2 路径，输入接纳、执行调度、Tool Registry、Permission 和 Context source 主线没有对应文件差异；相关改动集中在 compaction、projector 和 runner request metadata。不要把 `packages/opencode/src/session/` 的产品路径改进归到 `packages/core/src/session/` 的 V2 Runner。

`源码`：新增 [V2 → V1 配置适配](https://github.com/anomalyco/opencode/blob/57ef3828431790c53f8f333c7ffbfe88770a1812/packages/opencode/src/config/v2-compat.ts)，将能表示的 V2 配置转为 V1，返回 invalid / unsupported / conflict 诊断；unsupported 项会被省略并带诊断。这是部分配置迁移，不证明 V1 已完整执行 V2 的 Session 与插件契约。对应第 1、4、7 课。

## Compaction：完整条目与累积摘要

`源码`：[V2 compaction](https://github.com/anomalyco/opencode/blob/57ef3828431790c53f8f333c7ffbfe88770a1812/packages/core/src/session/compaction.ts) 不再按剩余字符数把边界条目一分为二。它从最新记录向前选择完整序列化条目，超预算的边界条目交给摘要，因此 recent 区可能少于目标预算，单条极大消息也可能完全进入摘要侧。

更新摘要现在显式区分 `<conversation>` 与 `<prior-summary>`，要求携带仍有效的目标、约束、用户指令和并行工作线；最近对话与旧摘要冲突时以最近对话为准。旧摘要未带入新摘要的事实会丢失，因此不能把“当前片段没再提到”当作删除依据。

## Session 移动与回退的 Context Epoch

`源码`：[Session projector](https://github.com/anomalyco/opencode/blob/57ef3828431790c53f8f333c7ffbfe88770a1812/packages/core/src/session/projector.ts) 在 `SessionEvent.Moved` 与 `RevertEvent.Committed` 投影路径不再直接 reset Context Epoch。会话移动/回退之后的 Context 观察与 baseline 处理，应与 [runner](https://github.com/anomalyco/opencode/blob/57ef3828431790c53f8f333c7ffbfe88770a1812/packages/core/src/session/runner/llm.ts) 和 [Context Epoch](https://github.com/anomalyco/opencode/blob/57ef3828431790c53f8f333c7ffbfe88770a1812/packages/core/src/session/context-epoch.ts) 一起阅读，移动和回退不再由 projector 先清空 system context；这与压缩摘要的生成是独立的状态转换。对应第 4、5、7 课。

## 请求归属覆盖压缩请求

`源码`：V2 Runner 为请求增加 `x-session-affinity`、`X-Session-Id`，子会话还带 `x-parent-session-id`。Compaction request 继承原请求的 `http` 配置，使主请求和摘要请求保持会话归属。Header 是传输 metadata，不是额外的 system prompt，也不提供执行去重保证。

证据：[请求构造](https://github.com/anomalyco/opencode/blob/57ef3828431790c53f8f333c7ffbfe88770a1812/packages/core/src/session/runner/llm.ts)、[摘要 HTTP 配置](https://github.com/anomalyco/opencode/blob/57ef3828431790c53f8f333c7ffbfe88770a1812/packages/core/src/session/compaction.ts)。对应第 2、5、7 课。

## 客户端：时间排序与恢复边界

`源码`：[TUI Sync](https://github.com/anomalyco/opencode/blob/57ef3828431790c53f8f333c7ffbfe88770a1812/packages/tui/src/context/sync.tsx) 的 hydration 先按 `time.created`、再以 ID 打破平局排序，再选最近 100 条；删除消息按 ID 查找。不能继续将消息 ID 大小当作显示时间顺序。

这次排序修正没有把 global live stream 变成 durable replay。Session cursor、global SSE 和 REST hydration 的差别仍是第 6 课的关键限制。

## 产品层新增与改进

`源码/变更记录`：V1 产品路径增加 Azure CLI authentication，改善请求 header/chunk timeout、provider reasoning 回放和 compaction。对应入口为 [Provider](https://github.com/anomalyco/opencode/blob/57ef3828431790c53f8f333c7ffbfe88770a1812/packages/opencode/src/provider/provider.ts)、[产品层压缩](https://github.com/anomalyco/opencode/blob/57ef3828431790c53f8f333c7ffbfe88770a1812/packages/opencode/src/session/compaction.ts)、[产品层 retry](https://github.com/anomalyco/opencode/blob/57ef3828431790c53f8f333c7ffbfe88770a1812/packages/opencode/src/session/retry.ts)。这些适合第 5 课做 V1/V2 对读，不据此改写 V2 支持的 Route 或重试次数。

## 验证边界

本轮完成版本、差异、实现与引用的静态核对；没有安装或运行上游应用、调用真实模型或重跑上游测试。原课程实验记录保留原日期，独立示例仍是教学模型，不是当前上游的兼容性测试。
