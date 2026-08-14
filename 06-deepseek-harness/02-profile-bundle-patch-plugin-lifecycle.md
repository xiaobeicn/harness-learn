# 第 2 课：Profile、Bundle、Patch 与插件生命周期

[返回本阶段目录](README.md) · [上一课](01-source-boundary-cordis-architecture.md) · [Profile 源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/boot/app-boot/src/profile.ts) · [Base Patch](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/bundle/base/cordis.patch.yml) · [课程实验](../examples/06-deepseek-harness/02-reversible-plugin/index.mjs)

## 核心问题

部署配置怎样变成运行中的插件树？插件卸载时，Service、事件监听器和工具注册为什么不会泄漏？

## Profile、Bundle 与 Patch

`源码/文档`：Profile 是 Harness home 中的具名部署组合，Bundle 是可叠加的一组 Patch。固定版本提供的模板包括：

```text
web      = base + web-app
headless = base + headless
```

最终组合按以下层次形成：

```text
多个 bundles（按声明顺序）
  → profile/cordis.patch.yml
  → Harness home patch
  → CLI --patch overlays
```

Patch 使用稳定 `id` 定位已有条目。同 id 的 config 是整段替换，不是任意深合并；错误引用或不满足 schema 倾向显式失败。

## 为什么不能把 YAML 顺序当依赖

Cordis 插件通过 `inject` 声明所需 Service。Loader 可以先看到 consumer，但它会保持等待，直到 provider 激活。

```text
shell-tool injects tools + bash
approval-policy injects tools
bash provider injects sandbox
```

只有依赖图才决定可激活性。行顺序主要影响 Patch 叠加与同层展示，不应承担隐含依赖契约。

## Reversible effects

插件的贡献必须附着于 Fiber 生命周期：

| 写法 | 激活时 | 卸载时 |
| --- | --- | --- |
| `ctx.on(...)` | 注册监听器 | 自动移除监听器 |
| registry `register(...)` | 加入当前 scope | 自动撤销 registration |
| `ctx.effect(setup)` | 执行 setup | 调用 setup 返回的 disposer |
| Service provider | 发布能力 | 消费者重新等待或重组 |

`源码`：卸载不是“从数组里删掉插件名”。Fiber 先进入 UNLOADING，停止新工作并等待清理，随后 DISPOSED。加载错误进入 FAILED，而不是伪装成 ACTIVE。

## Scope 与 shadowing

同一种能力可以存在于 global 与 agent scope：

```text
global tool: search
  └─ preset scope tool: search   ← 对该 preset shadow global
```

这使 Agent preset 可以改写工具、Prompt section 或 Skill provider，而不修改全局组合。读取视图沿 scope chain 合并，最近层优先。

## Base Bundle 不是“小内核”

固定版本的 base bundle 同时装载 LLM、Session、Persistence、Tools、Filesystem、Shell、Sandbox、Approval、Subagent、Compaction 等大量插件。

`结论`：Everything-as-a-Plugin 描述的是组合机制，不表示默认产品只启用很少能力。Profile 仍应作为一项需要审计的 deployment policy。

## 两类失败要分开

1. **Composition failure**：依赖缺失、配置无效或插件加载失败，Fiber 不进入 ACTIVE。
2. **Runtime failure**：已激活插件的一次工具或事件处理失败，由对应协议产生显式错误结果。

不能用空 Service 或假成功值掩盖 composition failure，否则 consumer 会在更晚、更难定位的位置失败。

## 实验

```bash
node examples/06-deepseek-harness/02-reversible-plugin/index.mjs
```

`实验`：脚本先装载 registry Service，再激活依赖它的 Tool 插件；卸载 Fiber 后同时验证 listener、tool 和 disposer side effect 已撤销。

## 本课结论

- `源码/文档`：Profile 决定部署组合，Bundle 提供可复用 Patch 层，命令行 overlay 位于最后。
- `源码`：Patch 通过 id 定位并替换整段 config；`inject` 而非 YAML 行顺序决定依赖激活。
- `源码`：Context API 与 registry registration 绑定 Fiber，可在卸载时撤销。
- `结论`：可热插拔的前提是所有贡献都进入可逆生命周期，而不是插件自己修改全局单例。
- `限制`：本课实验是最小生命周期模型，没有验证真实 Cordis HMR 的异步 quiescence。

## 下一步

下一课从已激活的 composition 进入 `ReactLoopAgent`，追踪 durable Inbox、Turn、Step 与 ToolResult continuation。
