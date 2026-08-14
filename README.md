# Agent Harness 学习笔记

这是一套从最小 Agent Runtime 出发，逐步学习完整 Coding Agent、生产级 Sandbox、复杂 Harness 架构、RLM 长任务系统，最终研究可组合插件化 Harness 的公开学习笔记。

## 学习顺序

```text
Pi Mono
  → OpenCode
  → Codex CLI
  → Claude Code
  → Prime Agent
  → DeepSeek Harness
```

完整目标和阶段关系见[学习路线](00-roadmap.md)。


## 文档目录

| 内容 | 入口 |
| --- | --- |
| 总体路线与学习方法 | [00-roadmap.md](00-roadmap.md) |
| 第一阶段：Pi Mono | [01-pi-mono/README.md](01-pi-mono/README.md) |
| 第二阶段：OpenCode | [02-opencode/README.md](02-opencode/README.md) |
| 第三阶段：Codex CLI | [03-codex-cli/README.md](03-codex-cli/README.md) |
| 第四阶段：Claude Code 完整 Harness | [04-claude-code/README.md](04-claude-code/README.md) |
| 第五阶段：Prime Agent RLM 与持续进化 Harness | [05-prime-agent/README.md](05-prime-agent/README.md) |
| 第六阶段：DeepSeek Harness 可组合插件化 Harness | [06-deepseek-harness/README.md](06-deepseek-harness/README.md) |
| 课程示例 | [examples/README.md](examples/README.md) |
| 六个 Harness 横向对照 | [comparison.md](comparison.md) |
| 六个 Harness 的优秀设计与自研基线 | [harness-design-summary.md](harness-design-summary.md) |
| Agent Harness 术语对照表 | [glossary.md](glossary.md) |
| 单次学习记录模板 | [learning-log-template.md](learning-log-template.md) |

## 阅读约定

笔记中的结论会标记证据来源：

- `源码`：已经从实现中验证。
- `文档`：来自项目官方文档。
- `实验`：已经通过实际运行验证。
- `实验步骤`：提供了可复现方法，但尚未代替学习者执行。
- `结论`：基于前述证据形成的阶段性理解。
- `限制`：已经确认的适用边界或平台差异。
- `未验证` / `推测`：证据仍不足，不能当作已验证结论。

本地固定版本的上游源码统一放在 `sources/`。
