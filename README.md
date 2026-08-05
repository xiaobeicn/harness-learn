# Agent Harness 学习笔记

这是一套从最小 Agent Runtime 出发，逐步学习完整 Coding Agent、生产级 Sandbox，以及高级 Context、Memory 与 Multi-Agent 的公开学习笔记。

## 学习顺序

```text
Pi Mono
  → OpenCode
  → Codex CLI
  → Claude Code
```

完整目标和阶段关系见[学习路线](docs/00-roadmap.md)。

## 当前进度

学习进度：**第三阶段 · Codex CLI 教材已完成，等待个人实验与掌握确认**

- 阶段复盘：[权限提升实验与第三阶段复盘](docs/03-codex-cli/06-escalation-experiment-phase-review.md)
- 已完成教材：[Codex CLI · 生产级 Sandbox](docs/03-codex-cli/README.md)
- 下一阶段：[Claude Code · 高级 Context、Memory 与 Multi-Agent](docs/04-claude-code/README.md)
- 说明：个人掌握清单保留未勾选，不由文档完成状态代替

## 文档目录

| 内容 | 入口 |
| --- | --- |
| 总体路线与学习方法 | [docs/00-roadmap.md](docs/00-roadmap.md) |
| 第一阶段：Pi Mono | [docs/01-pi-mono/README.md](docs/01-pi-mono/README.md) |
| 第二阶段：OpenCode | [docs/02-opencode/README.md](docs/02-opencode/README.md) |
| 第三阶段：Codex CLI | [docs/03-codex-cli/README.md](docs/03-codex-cli/README.md) |
| 第四阶段：Claude Code | [docs/04-claude-code/README.md](docs/04-claude-code/README.md) |
| 课程示例 | [examples/README.md](examples/README.md) |
| 四个 Harness 横向对照 | [docs/comparison.md](docs/comparison.md) |
| 单次学习记录模板 | [docs/learning-log-template.md](docs/learning-log-template.md) |

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
