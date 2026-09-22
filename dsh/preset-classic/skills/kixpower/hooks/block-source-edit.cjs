#!/usr/bin/env node
'use strict'
// block-source-edit.cjs — hook 入口（Sprint 2 T6 / plan.md §13.2）。
// 薄 CLI：stdin → `lib/kix-verdict.cjs` → stdout/stderr + exit code。判定逻辑不在此文件。
// 用法：`node block-source-edit.cjs [--role producer|orchestrator]`（与 .ps1 的 -Role 同义）。
// 对应 `block-source-edit.ps1` 为 deprecated 参照实现（T9：保留不删）。
const { main, liveContext, verdictSourceEdit } = require('./lib/kix-verdict.cjs')

const ROLES = new Set(['producer', 'orchestrator'])

process.exitCode = main((argv) => {
  const index = argv.indexOf('--role')
  const requested = index >= 0 ? argv[index + 1] : 'producer'
  const role = ROLES.has(requested) ? requested : 'producer'
  return {
    label: 'block-source-edit',
    hookEventName: 'PreToolUse',
    evaluate: (call, ctx) => verdictSourceEdit(call, ctx),
    context: (meta) => liveContext({ cwd: meta.cwd, workspace: meta.workspaceFolder, role }),
  }
}, process.argv.slice(2))
