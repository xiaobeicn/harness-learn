# Codex CLI 权限提升实验

[返回示例目录](../../README.md) · [返回课程](../../../03-codex-cli/06-escalation-experiment-phase-review.md)

这个目录提供一个最小安全探针，用于观察 workspace 内写入、workspace 外写入、deny-read 和默认网络行为。

## 静态检查

```bash
bash -n examples/03-codex-cli/06-escalation-lab/probe.sh
examples/03-codex-cli/06-escalation-lab/probe.sh help
```

## 子命令

```text
inside-write
outside-write <absolute-file>
read-bytes <absolute-file>
network-head
help
```

`outside-write` 不创建父目录，并要求父目录名严格为 `codex-sandbox-lab`。请在 Codex 会话之外预先创建这个 disposable parent，再传入一个不存在的新文件；不要使用真实配置、凭据或生产目录。

`read-bytes` 只打印字节数，不打印内容。它适合搭配无敏感内容的测试文件验证 deny-read，不应用来探测真实秘密。

实际 approval、Sandbox denial 和三平台结果记录在课程提供的表格中。本目录不预填运行结果。
