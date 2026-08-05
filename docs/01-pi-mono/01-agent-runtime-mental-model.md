# 第 1 课：Agent Runtime 心智模型

[返回本阶段目录](README.md) · [下一课](02-prompt-tool-loop.md)

## 核心问题

Agent Runtime 比一次普通的模型调用多了什么？

## 普通聊天调用

普通聊天调用通常是一个单向过程：

```text
messages → model → response
```

调用方准备消息，模型生成一次响应，调用结束。

## Agent Runtime

Agent Runtime 在模型外增加了一个受控循环：

```text
state → model → tool request → tool executor → observation → state
          ↑                                              ↓
          └──────────────── next turn ───────────────────┘
```

模型不直接操作文件或运行命令。模型生成结构化的工具请求，Runtime 负责执行，再把执行结果作为 observation 放回上下文。模型得到新信息后，决定继续调用工具还是输出最终答案。

## 最小 Runtime 的五部分

| 部分 | 最先要问的问题 |
| --- | --- |
| Model adapter | 如何把统一请求转换成不同模型供应商的 API？ |
| Message/context | Runtime 保存的消息与真正发给模型的消息是否相同？ |
| Tool registry | 模型能看到哪些工具及其参数结构？ |
| Agent loop | 工具调用后为何会再次请求模型，何时停止？ |
| State/events | UI、日志或调用方如何知道 Runtime 正在做什么？ |

## Runtime 与 Harness 的边界

- Runtime 是驱动模型和工具循环的内核。
- Coding Agent 在 Runtime 上加入文件、Shell、搜索、编辑和项目感知。
- Harness 是更完整的运行环境，还可能包含权限、Sandbox、持久化、Context 管理、Memory 和 Multi-Agent。

这不是绝对的产品命名规则，而是本学习项目用于拆解系统的分析边界。

## 本课结论

第一阶段最重要的判断标准是：**先能完整解释一次循环，再去理解更多功能。**

下一课会进入 Pi Mono 源码，从 `Agent.prompt()` 追踪一次真实工具循环。
