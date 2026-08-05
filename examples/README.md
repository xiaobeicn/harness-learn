# 课程示例

[返回首页](../README.md)

示例代码按照“阶段 / 课程”分目录，编号与根目录中的课程保持一致：

```text
examples/
├── 01-pi-mono/
│   ├── 03-minimal-agent-runtime/index.mjs
│   ├── 04-context-boundary/index.mjs
│   ├── 05-event-driven-state/index.mjs
│   └── 06-run-control/index.mjs
├── 03-codex-cli/
    └── 06-escalation-lab/
        ├── README.md
        └── probe.sh
└── 04-claude-code/
    ├── 01-harness-map/index.mjs
    ├── 02-agent-loop/index.mjs
    ├── 03-instruction-precedence/index.mjs
    ├── 04-context-admission/index.mjs
    ├── 05-compaction/index.mjs
    ├── 06-tool-executor/index.mjs
    ├── 07-session-dag/index.mjs
    ├── 08-safety-layers/index.mjs
    ├── 09-memory-policy/index.mjs
    ├── 10-subagent-context/index.mjs
    ├── 11-team-coordination/index.mjs
    └── 12-extension-routing/index.mjs
```

| 阶段 | 课程 | 示例 | 运行方式 |
| --- | --- | --- | --- |
| Pi Mono | [第 3 课：实现最小 Agent Runtime](../01-pi-mono/03-build-minimal-agent-runtime.md) | [`index.mjs`](01-pi-mono/03-minimal-agent-runtime/index.mjs) | `node examples/01-pi-mono/03-minimal-agent-runtime/index.mjs` |
| Pi Mono | [第 4 课：Transcript 与 Model Context](../01-pi-mono/04-transcript-and-model-context.md) | [`index.mjs`](01-pi-mono/04-context-boundary/index.mjs) | `node examples/01-pi-mono/04-context-boundary/index.mjs` |
| Pi Mono | [第 5 课：Event 驱动 Agent State](../01-pi-mono/05-event-driven-agent-state.md) | [`index.mjs`](01-pi-mono/05-event-driven-state/index.mjs) | `node examples/01-pi-mono/05-event-driven-state/index.mjs` |
| Pi Mono | [第 6 课：Abort、Steering 与 Follow-up](../01-pi-mono/06-abort-steering-follow-up.md) | [`index.mjs`](01-pi-mono/06-run-control/index.mjs) | `node examples/01-pi-mono/06-run-control/index.mjs` |
| Codex CLI | [第 6 课：权限提升实验与阶段复盘](../03-codex-cli/06-escalation-experiment-phase-review.md) | [`probe.sh`](03-codex-cli/06-escalation-lab/probe.sh) | `examples/03-codex-cli/06-escalation-lab/probe.sh help` |
| Claude Code | [第 1 课：来源边界与 Harness 总体架构](../04-claude-code/01-source-boundary-and-harness-map.md) | [`index.mjs`](04-claude-code/01-harness-map/index.mjs) | `node examples/04-claude-code/01-harness-map/index.mjs` |
| Claude Code | [第 2 课：输入接纳与 Agent Loop](../04-claude-code/02-input-admission-and-agent-loop.md) | [`index.mjs`](04-claude-code/02-agent-loop/index.mjs) | `node examples/04-claude-code/02-agent-loop/index.mjs` |
| Claude Code | [第 3 课：System Prompt、CLAUDE.md 与项目指令](../04-claude-code/03-system-prompt-claudemd-project-instructions.md) | [`index.mjs`](04-claude-code/03-instruction-precedence/index.mjs) | `node examples/04-claude-code/03-instruction-precedence/index.mjs` |
| Claude Code | [第 4 课：Skills、Attachments 与动态 Context](../04-claude-code/04-skills-attachments-dynamic-context.md) | [`index.mjs`](04-claude-code/04-context-admission/index.mjs) | `node examples/04-claude-code/04-context-admission/index.mjs` |
| Claude Code | [第 5 课：Token 压力、Microcompact 与 Compaction](../04-claude-code/05-token-pressure-microcompact-compaction.md) | [`index.mjs`](04-claude-code/05-compaction/index.mjs) | `node examples/04-claude-code/05-compaction/index.mjs` |
| Claude Code | [第 6 课：Tool Contract、注册、并发与结果回灌](../04-claude-code/06-tool-contract-registry-execution.md) | [`index.mjs`](04-claude-code/06-tool-executor/index.mjs) | `node examples/04-claude-code/06-tool-executor/index.mjs` |
| Claude Code | [第 7 课：Session、Transcript、Resume、Fork 与 Rewind](../04-claude-code/07-session-transcript-resume-fork-rewind.md) | [`index.mjs`](04-claude-code/07-session-dag/index.mjs) | `node examples/04-claude-code/07-session-dag/index.mjs` |
| Claude Code | [第 8 课：Permission、Hooks、Bash 分类器与 Sandbox](../04-claude-code/08-permissions-hooks-bash-sandbox.md) | [`index.mjs`](04-claude-code/08-safety-layers/index.mjs) | `node examples/04-claude-code/08-safety-layers/index.mjs` |
| Claude Code | [第 9 课：Auto Memory、Recall 与长期知识治理](../04-claude-code/09-auto-memory-recall-governance.md) | [`index.mjs`](04-claude-code/09-memory-policy/index.mjs) | `node examples/04-claude-code/09-memory-policy/index.mjs` |
| Claude Code | [第 10 课：Subagent 生命周期、Context 隔离与后台任务](../04-claude-code/10-subagent-lifecycle-context-isolation.md) | [`index.mjs`](04-claude-code/10-subagent-context/index.mjs) | `node examples/04-claude-code/10-subagent-context/index.mjs` |
| Claude Code | [第 11 课：Agent Teams、Tasks、Mailbox 与权限同步](../04-claude-code/11-agent-teams-tasks-mailbox.md) | [`index.mjs`](04-claude-code/11-team-coordination/index.mjs) | `node examples/04-claude-code/11-team-coordination/index.mjs` |
| Claude Code | [第 12 课：Plugin、MCP、Hooks、Skills 扩展与端到端复盘](../04-claude-code/12-extension-system-end-to-end-review.md) | [`index.mjs`](04-claude-code/12-extension-routing/index.mjs) | `node examples/04-claude-code/12-extension-routing/index.mjs` |

Pi Mono 示例在命令末尾加入 `--invalid-args`，可以运行同一课程的工具参数校验失败场景。

后续示例继续使用 `<阶段编号>-<阶段名>/<课程编号>-<主题>/`，一节课需要多个文件时也只放在自己的课程目录中。
