#!/usr/bin/env node
'use strict'
// block-source-edit-qa.cjs — hook 入口（Sprint 2 T6 / plan.md §13.2）。
// 薄 CLI：stdin → `lib/kix-verdict.cjs` → stdout/stderr + exit code。判定逻辑不在此文件。
// 对应 `block-source-edit-qa.ps1` 为 deprecated 参照实现（T9：保留不删）。
const { main, liveContext, verdictSourceEditQa } = require('./lib/kix-verdict.cjs')

process.exitCode = main({
  label: 'block-source-edit-qa',
  hookEventName: 'PreToolUse',
  evaluate: verdictSourceEditQa,
  context: (meta) => liveContext({ cwd: meta.cwd, workspace: meta.workspaceFolder, role: 'qa' }),
})
