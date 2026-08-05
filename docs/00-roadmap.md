# Agent Harness 学习路线

[返回首页](../README.md)

## 学习目标

目标不是只会使用四个工具，而是逐层理解：一个模型如何被包装成可执行、可控制、可扩展的 Coding Agent。

```text
第一阶段：Pi Mono
    ↓  理解最小 Agent Runtime
第二阶段：OpenCode
    ↓  理解完整 Coding Agent
第三阶段：Codex CLI
    ↓  理解生产级 Sandbox 与安全控制
第四阶段：Claude Code
       理解高级 Context、Memory 与 Multi-Agent
```

这四个阶段是为了学习而安排的观察顺序，并不表示后一个项目在实现上严格包含前一个项目的全部设计。

## 术语

| 术语 | 在本项目中的含义 |
| --- | --- |
| Model | 接收上下文并生成文本、推理内容或工具调用的模型。 |
| Agent Runtime | 驱动“模型 → 工具 → 结果 → 模型”循环，并维护运行状态的内核。 |
| Coding Agent | 面向代码任务的 Agent 产品，通常加入文件、Shell、搜索、编辑和项目感知能力。 |
| Agent Harness | 包住模型的整套运行环境；除 Runtime 外，还可能包含上下文管理、权限、Sandbox、持久化、UI、Memory 和 Multi-Agent 编排。 |

## 统一分析框架

所有项目都沿下面这条主线阅读：

```text
用户输入
  → 组装上下文
  → 调用模型
  → 解析模型输出
  → 执行工具
  → 把结果写回上下文
  → 再次调用模型
  → 结束、失败或等待用户
```

每个 Harness 都用六个问题比较：

1. **Loop**：谁驱动循环，循环在什么条件下结束？
2. **Context**：哪些信息会发给模型，超长后如何压缩？
3. **Tools**：工具如何声明、调用、校验和返回结果？
4. **State**：会话状态如何保存、恢复和分叉？
5. **Safety**：命令和文件操作在哪里执行，谁负责授权？
6. **Extension**：如何加入自定义工具、指令、技能或子 Agent？

## 阶段入口

1. [Pi Mono：最小 Agent Runtime](01-pi-mono/README.md)
2. [OpenCode：完整 Coding Agent](02-opencode/README.md)
3. [Codex CLI：生产级 Sandbox](03-codex-cli/README.md)
4. [Claude Code：Context、Memory 与 Multi-Agent](04-claude-code/README.md)

## 每次学习的固定节奏

1. 只提出一个核心问题。
2. 沿一条调用链阅读，不按目录逐文件浏览。
3. 用最小输入观察真实行为。
4. 回到源码定位类型、函数和状态变化。
5. 记录证据、结论和仍未解决的问题。
6. 不看源码，独立复述整个过程。

记录新课程时使用[学习记录模板](learning-log-template.md)。

## 最终产出

完成四个阶段后，应得到：

- 一套不依赖具体产品的 Agent Harness 心智模型。
- 四张关键调用流程图。
- 一张有源码、文档或实验依据的[横向对照表](comparison.md)。
- 一个自己实现的最小 Agent Runtime。
- 一份关于 Sandbox、Context、Memory 和 Multi-Agent 取舍的总结。
