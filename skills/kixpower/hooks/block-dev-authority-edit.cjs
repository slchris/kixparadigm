#!/usr/bin/env node
'use strict'
// block-dev-authority-edit.cjs — hook 入口（Sprint 2 T6 / plan.md §13.2）。
// 薄 CLI：stdin → `lib/kix-verdict.cjs` → stdout/stderr + exit code。判定逻辑不在此文件。
// 对应 `block-dev-authority-edit.ps1` 为 deprecated 参照实现（T9：保留不删）。
const { main, liveContext, verdictDevAuthorityEdit } = require('./lib/kix-verdict.cjs')

process.exitCode = main({
  label: 'block-dev-authority-edit',
  hookEventName: 'PreToolUse',
  evaluate: verdictDevAuthorityEdit,
  context: (meta) => liveContext({ cwd: meta.cwd, workspace: meta.workspaceFolder }),
})
