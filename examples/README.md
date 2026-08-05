# 课程示例

[返回首页](../README.md)

示例代码按照“阶段 / 课程”分目录，编号与 `docs/` 保持一致：

```text
examples/
└── 01-pi-mono/
    ├── 03-minimal-agent-runtime/
    │   └── index.mjs
    ├── 04-context-boundary/
    │   └── index.mjs
    ├── 05-event-driven-state/
    │   └── index.mjs
    └── 06-run-control/
        └── index.mjs
```

| 阶段 | 课程 | 示例 | 运行方式 |
| --- | --- | --- | --- |
| Pi Mono | [第 3 课：实现最小 Agent Runtime](../docs/01-pi-mono/03-build-minimal-agent-runtime.md) | [`index.mjs`](01-pi-mono/03-minimal-agent-runtime/index.mjs) | `node examples/01-pi-mono/03-minimal-agent-runtime/index.mjs` |
| Pi Mono | [第 4 课：Transcript 与 Model Context](../docs/01-pi-mono/04-transcript-and-model-context.md) | [`index.mjs`](01-pi-mono/04-context-boundary/index.mjs) | `node examples/01-pi-mono/04-context-boundary/index.mjs` |
| Pi Mono | [第 5 课：Event 驱动 Agent State](../docs/01-pi-mono/05-event-driven-agent-state.md) | [`index.mjs`](01-pi-mono/05-event-driven-state/index.mjs) | `node examples/01-pi-mono/05-event-driven-state/index.mjs` |
| Pi Mono | [第 6 课：Abort、Steering 与 Follow-up](../docs/01-pi-mono/06-abort-steering-follow-up.md) | [`index.mjs`](01-pi-mono/06-run-control/index.mjs) | `node examples/01-pi-mono/06-run-control/index.mjs` |

在命令末尾加入 `--invalid-args`，可以运行同一课程的工具参数校验失败场景。

后续示例继续使用 `<阶段编号>-<阶段名>/<课程编号>-<主题>/`，一节课需要多个文件时也只放在自己的课程目录中。
