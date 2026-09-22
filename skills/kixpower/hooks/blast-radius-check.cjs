#!/usr/bin/env node
'use strict'
// blast-radius-check.cjs — hook 入口（Sprint 2 T6 / plan.md §13.2）。
// 薄 CLI：stdin → `lib/kix-verdict.cjs` → stdout/stderr + exit code。判定逻辑不在此文件。
// 对应 `blast-radius-check.ps1` 为 deprecated 参照实现（T9：保留不删）。
const { main, liveContext, verdictBlastRadius } = require('./lib/kix-verdict.cjs')

process.exitCode = main({
  label: 'blast-radius-check',
  hookEventName: 'PreToolUse',
  evaluate: verdictBlastRadius,
  context: (meta) => liveContext({ cwd: meta.cwd, workspace: meta.workspaceFolder }),
})
