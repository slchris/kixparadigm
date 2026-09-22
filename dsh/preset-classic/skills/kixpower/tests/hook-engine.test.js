#!/usr/bin/env node
'use strict'
// hook-engine.test.js — hook 引擎的 **host-independent** 证据网（Sprint 2 T6 / plan.md §13.1-C，LG15）。
//
// 证据强度（plan.md §16.2 v2 阶梯，**不得越级**）：
//   E0 = 同源锚点：core 的 §B 函数体与 `dsh/preset/plugins/kix-guards.js` 的 `__internals` 同名函数
//        「规范化（去注释/空白）后逐字相等」+ 同语料 verdict 一致（本文件 §4/§5）；
//   E2 = characterization：本文件的固定用例（两套 payload schema + 每 hook 负向控制 + mutation probe）；
//   E1 = 与 `.ps1` 的逐字节差分 → **本机永久 unavailable**（无 pwsh，用户否决安装）→ 只能走 CI 的 CG4。
//   ⚠️ 本套件全绿 **不得**表述为「与原 `.ps1` 等价」（plan.md §16.2 明令禁止第 1 条）；
//       `unavailable` 也不得记为 skip/pass。
//
// 运行：`node --test skills/kixpower/tests/hook-engine.test.js`（LG15；**不**挂进 npm test 链）。
// mutation probe：`KIX_HOOK_CORE_PATH=<改坏语义的 core 副本>` 时本套件必须红（§6，机械自证）。

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

function findRepoRoot(start) {
  let dir = start
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'docs', 'sprint-1', 'plan.md'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

const REPO_ROOT = findRepoRoot(__dirname)
assert.ok(REPO_ROOT, 'repo root not found from test file location（本套件是 repo 侧 gate）')

const CORE_DEFAULT = path.join(REPO_ROOT, 'skills', 'kixpower', 'hooks', 'lib', 'kix-verdict.cjs')
const CORE_PATH = process.env.KIX_HOOK_CORE_PATH ? path.resolve(process.env.KIX_HOOK_CORE_PATH) : CORE_DEFAULT
const HOOKS_DIR = path.join(REPO_ROOT, 'skills', 'kixpower', 'hooks')
const GUARDS_PATH = path.join(REPO_ROOT, 'dsh', 'preset', 'plugins', 'kix-guards.js')

const core = require(CORE_PATH)
const guardInternals = require(GUARDS_PATH).__internals

// ── 固定上下文（判定确定性：不 spawn git、不读真实仓库状态）────────────────
function fixedContext(overrides = {}) {
  return {
    workspace: '/tmp/kix-ws',
    cwd: '/tmp/kix-ws',
    homeDir: '/tmp/kix-home',
    appData: '/tmp/kix-home/AppData/Roaming',
    role: 'producer',
    readFile: () => null,
    readSprintContext: () => ({
      progressMd: '---\nsprint: 2\nblast_radius:\n  commit_budget: 6\n',
      planMd: '',
    }),
    readReflog: () => '',
    readBranch: () => 'feature/sprint-2-node-first-host-parity',
    ...overrides,
  }
}

function evaluate(name, call, overrides) {
  const ctx = fixedContext(overrides)
  if (name === 'blast-radius-check') return core.verdictBlastRadius(call, ctx)
  if (name === 'block-source-edit') return core.verdictSourceEdit(call, ctx)
  if (name === 'block-source-edit-qa') return core.verdictSourceEditQa(call, ctx)
  if (name === 'block-dev-authority-edit') return core.verdictDevAuthorityEdit(call, ctx)
  throw new Error(`unknown hook: ${name}`)
}

function run(name, stdin, overrides) {
  return core.runHook({
    label: name,
    hookEventName: 'PreToolUse',
    evaluate: (call, ctx) => evaluate(name, call, overrides),
    context: fixedContext(overrides),
    stdin,
  })
}

// 入口级用例的载荷必须自带 cwd/workspaceFolder：入口的判定工作区来自载荷（缺失则退回进程 cwd）。
function withMeta(stdin, cwd = '/tmp/kix-ws') {
  const payload = JSON.parse(stdin)
  return JSON.stringify({ ...payload, cwd, workspaceFolder: cwd })
}

function runEntry(entry, stdin, argv = [], env = {}) {
  return spawnSync(process.execPath, [path.join(HOOKS_DIR, entry), ...argv], {
    input: stdin,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
}

// ── payload 固定夹具（两套 schema + 未知形态）─────────────────────────────
const P = {
  // 形态 3（旧 VS Code）：tool_name + tool_input（对象）
  legacy: (name, input) => JSON.stringify({ tool_name: name, tool_input: input }),
  // 形态 2（官方 camelCase）：toolName + toolArgs（JSON 字符串）
  camel: (name, input) => JSON.stringify({ toolName: name, toolArgs: JSON.stringify(input) }),
  // 形态 1（copilot-agent 1.0.70+）：toolCalls[{id,name,args}]（args 为 JSON 字符串）
  calls: (name, input) => JSON.stringify({ toolCalls: [{ id: 'call-1', name, args: JSON.stringify(input) }] }),
  unknown: (obj) => JSON.stringify(obj),
}

const FORCE_PUSH = { command: 'git push --force origin main' }

// ═══ §1 payload 归一化：三形态 + 三态判定 ═══════════════════════════════════

test('§1 normalizePayload：形态 3（tool_name/tool_input）可识别', () => {
  const n = core.normalizePayload(P.legacy('run_in_terminal', FORCE_PUSH))
  assert.equal(n.status, 'ok')
  assert.equal(n.shape, 'tool_name+tool_input')
  assert.equal(n.calls.length, 1)
  assert.equal(n.calls[0].name, 'run_in_terminal')
  assert.deepEqual(n.calls[0].input, FORCE_PUSH)
})

test('§1 normalizePayload：形态 1（toolCalls，args 为 JSON 字符串）可识别', () => {
  const n = core.normalizePayload(P.calls('bash', FORCE_PUSH))
  assert.equal(n.status, 'ok')
  assert.equal(n.shape, 'toolCalls')
  assert.deepEqual(n.calls[0].input, FORCE_PUSH)
  assert.equal(n.calls[0].argsParseFailed, false)
})

test('§1 normalizePayload：形态 2（toolName/toolArgs）可识别', () => {
  const n = core.normalizePayload(P.camel('bash', FORCE_PUSH))
  assert.equal(n.status, 'ok')
  assert.equal(n.shape, 'toolName+toolArgs')
  assert.deepEqual(n.calls[0].input, FORCE_PUSH)
})

test('§1 三形态对同一 fixture 给出同一 verdict（跨 schema 一致性）', () => {
  const verdicts = ['legacy', 'calls', 'camel'].map((shape) => {
    const stdin = shape === 'legacy' ? P.legacy('run_in_terminal', FORCE_PUSH) : shape === 'calls' ? P.calls('bash', FORCE_PUSH) : P.camel('bash', FORCE_PUSH)
    return run('blast-radius-check', stdin)
  })
  for (const result of verdicts) {
    assert.equal(result.exitCode, 2)
    assert.equal(result.status, 'deny')
  }
  assert.equal(verdicts[0].stdout[0], verdicts[1].stdout[0], '形态 1 与形态 3 的 deny 输出必须逐字节一致')
  assert.equal(verdicts[2].stdout[0], verdicts[1].stdout[0], '形态 2 与形态 3 的 deny 输出必须逐字节一致')
})

test('§1 未知载荷形态：不得静默放行（KIX-HOOK-UNKNOWN-PAYLOAD + exit 2）', () => {
  const result = run('blast-radius-check', P.unknown({ toolInvocation: { name: 'bash', args: { command: 'git commit -m x' } } }))
  assert.equal(result.status, 'unknown')
  assert.equal(result.exitCode, 2)
  assert.match(result.stdout[0], /"permissionDecision":"deny"/)
  assert.match(result.stdout[0], /KIX-HOOK-UNKNOWN-PAYLOAD/)
  assert.match(result.stderr[0], /KIX-HOOK-UNKNOWN-PAYLOAD/)
})

test('§1 tool_name 存在但 tool_input 缺失：不得静默放行（旧实现 exit 0 的静默失效点）', () => {
  const result = run('blast-radius-check', P.unknown({ tool_name: 'run_in_terminal' }))
  assert.equal(result.status, 'unknown')
  assert.equal(result.exitCode, 2)
  assert.match(result.stdout[0], /KIX-HOOK-UNKNOWN-PAYLOAD/)
})

test('§1 args 声明为字符串但不可解析：不得静默放行', () => {
  const result = run('blast-radius-check', P.unknown({ toolCalls: [{ id: 'c1', name: 'bash', args: '{not-json' }] }))
  assert.equal(result.exitCode, 2)
  assert.equal(result.status, 'deny')
  assert.match(result.stdout[0], /KIX-HOOK-UNKNOWN-PAYLOAD/)
})

test('§1 反向控制：只有元数据字段的载荷不是「形态未知」（证明标记非恒真）', () => {
  const n = core.normalizePayload(P.unknown({ hookEventName: 'PreToolUse', cwd: '/tmp', workspaceFolder: '/tmp' }))
  assert.equal(n.status, 'no-tool-call')
  assert.equal(run('blast-radius-check', P.unknown({ hookEventName: 'PreToolUse', cwd: '/tmp' })).exitCode, 0)
})

test('§1 空 stdin → 放行（无 stdout）；非法 JSON → exit 2 且不输出 JSON', () => {
  const empty = run('blast-radius-check', '')
  assert.equal(empty.exitCode, 0)
  assert.equal(empty.stdout.length, 0)
  const invalid = run('blast-radius-check', '{not-json')
  assert.equal(invalid.status, 'invalid-json')
  assert.equal(invalid.exitCode, 2)
  assert.equal(invalid.stdout.length, 0)
  assert.match(invalid.stderr[0], /不是有效 JSON/)
})

test('§1 工具名别名归一：vscode_renamesymbol → vscode_renameSymbol', () => {
  assert.equal(core.canonicalToolName('vscode_renamesymbol'), 'vscode_renameSymbol')
  assert.equal(core.canonicalToolName('Copilot.read_file'), 'read_file')
})

// ═══ §2 blast-radius-check（H-set-A 成员 1）════════════════════════════════

test('§2 blast-radius：git push --force → deny（形态 1 与形态 3 均 deny）', () => {
  for (const stdin of [P.legacy('run_in_terminal', FORCE_PUSH), P.calls('bash', FORCE_PUSH)]) {
    const result = run('blast-radius-check', stdin)
    assert.equal(result.exitCode, 2)
    assert.match(result.stdout[0], /--force/)
  }
})

test('§2 blast-radius：push 到 main/master → deny', () => {
  const result = run('blast-radius-check', P.legacy('run_in_terminal', { command: 'git push origin main' }))
  assert.equal(result.exitCode, 2)
  assert.match(result.stdout[0], /main\/master/)
})

test('§2 blast-radius：普通 git push 到 feature 分支 → ask（非 deny）', () => {
  const result = run('blast-radius-check', P.legacy('run_in_terminal', { command: 'git push origin feature/x' }))
  assert.equal(result.status, 'ask')
  assert.equal(result.exitCode, 0)
  assert.match(result.stdout[0], /"permissionDecision":"ask"/)
})

test('§2 blast-radius：破坏性 SQL（DROP）→ deny', () => {
  const result = run('blast-radius-check', P.legacy('run_in_terminal', { command: 'psql -c "DROP TABLE users"' }))
  assert.equal(result.exitCode, 2)
  assert.match(result.stdout[0], /破坏性 SQL/)
})

test('§2 blast-radius：DELETE without WHERE → deny', () => {
  const result = run('blast-radius-check', P.calls('bash', { command: "psql -c 'DELETE FROM users'" }))
  assert.equal(result.exitCode, 2)
  assert.match(result.stdout[0], /破坏性 SQL/)
})

test('§2 blast-radius：终端写用户级控制平面 → deny', () => {
  const result = run('blast-radius-check', P.legacy('run_in_terminal', { command: 'Set-Content ~/.dsh/agent.cordis.yml -Value x' }))
  assert.equal(result.exitCode, 2)
  assert.match(result.stdout[0], /CONTROL PLANE/)
})

test('§2 blast-radius：编辑用户级控制平面文件 → deny；编辑工作区文件 → allow（负向控制）', () => {
  const blocked = run('blast-radius-check', P.legacy('replace_string_in_file', { filePath: '/tmp/kix-home/.copilot/agents/a.agent.md', oldString: 'x', newString: 'y' }))
  assert.equal(blocked.exitCode, 2)
  assert.match(blocked.stdout[0], /CONTROL PLANE/)
  const allowed = run('blast-radius-check', P.legacy('replace_string_in_file', { filePath: '/tmp/kix-ws/docs/sprint-2/progress.md', oldString: 'x', newString: 'y' }))
  assert.equal(allowed.exitCode, 0)
  assert.equal(allowed.stdout.length, 0)
})

test('§2 blast-radius：commit 预算（reflog 语料 > 预算）→ deny；预算内 → allow（负向控制）', () => {
  const over = 'commit: T1\ncommit (amend): T1\ncommit: T2\ncommit: T3\ncommit: T4\ncommit: T5\ncommit: T6'
  const denied = run('blast-radius-check', P.legacy('run_in_terminal', { command: 'git commit -m "x"' }), { readReflog: () => over })
  assert.equal(denied.exitCode, 2)
  assert.match(denied.stdout[0], /预算/)
  const allowed = run('blast-radius-check', P.legacy('run_in_terminal', { command: 'git commit -m "x"' }), { readReflog: () => 'commit: T1' })
  assert.equal(allowed.exitCode, 0)
})

test('§2 blast-radius：硬上限 10（churn 计 amend）→ deny', () => {
  const churn = Array.from({ length: 11 }, (_, i) => `commit (amend): T${i}`).join('\n')
  const denied = run('blast-radius-check', P.legacy('run_in_terminal', { command: 'git commit -m "x"' }), { readReflog: () => churn })
  assert.equal(denied.exitCode, 2)
  assert.match(denied.stdout[0], /HARD CAP/)
})

test('§2 blast-radius：main 分支 commit → deny', () => {
  const denied = run('blast-radius-check', P.legacy('run_in_terminal', { command: 'git commit -m "x"' }), { readBranch: () => 'main' })
  assert.equal(denied.exitCode, 2)
  assert.match(denied.stdout[0], /main/)
})

test('§2 blast-radius 负向控制：非 git/非 SQL/非编辑的只读命令 → allow', () => {
  for (const command of ['ls -la', 'grep -rn foo src/', 'git status --short', 'cat README.md']) {
    const result = run('blast-radius-check', P.legacy('run_in_terminal', { command }))
    assert.equal(result.exitCode, 0, `必须放行：${command}`)
    assert.equal(result.stdout.length, 0)
  }
})

test('§2 blast-radius：未登记的代码执行工具 → deny（fail-closed）', () => {
  const result = run('blast-radius-check', P.legacy('mcp__custom__run_script', { code: 'x' }))
  assert.equal(result.exitCode, 2)
  assert.match(result.stdout[0], /未登记的代码执行/)
})

// ═══ §3 三个编辑边界 hook（H-set-A 成员 2-4）═══════════════════════════════

test('§3 block-source-edit(producer)：src/*.ts → deny', () => {
  const result = run('block-source-edit', P.legacy('replace_string_in_file', { filePath: '/tmp/kix-ws/src/app.ts', oldString: 'a', newString: 'b' }))
  assert.equal(result.exitCode, 2)
  assert.match(result.stdout[0], /禁止编辑源代码/)
})

test('§3 block-source-edit(producer) 负向控制：docs/**、PROJECT_BRIEF.md → allow', () => {
  for (const filePath of ['/tmp/kix-ws/docs/sprint-2/plan.md', '/tmp/kix-ws/PROJECT_BRIEF.md', '/tmp/kix-ws/README.md']) {
    const result = run('block-source-edit', P.legacy('replace_string_in_file', { filePath, oldString: 'a', newString: 'b' }))
    assert.equal(result.exitCode, 0, `必须放行：${filePath}`)
  }
})

test('§3 block-source-edit(orchestrator)：docs/sprint-2/progress.md 放行、非白名单文档拦截（角色文案）', () => {
  const allowed = run('block-source-edit', P.legacy('replace_string_in_file', { filePath: '/tmp/kix-ws/docs/sprint-2/progress.md', oldString: 'a', newString: 'b' }), { role: 'orchestrator' })
  assert.equal(allowed.exitCode, 0)
  // 白名单外文档 → 角色专属文案
  const denied = run('block-source-edit', P.legacy('replace_string_in_file', { filePath: '/tmp/kix-ws/notes.txt', oldString: 'a', newString: 'b' }), { role: 'orchestrator' })
  assert.equal(denied.exitCode, 2)
  assert.match(denied.stdout[0], /Orchestrator 只能写/)
  // 源码扩展名 → 源码黑名单优先（与 block-source-edit.ps1 同序）
  const source = run('block-source-edit', P.legacy('replace_string_in_file', { filePath: '/tmp/kix-ws/src/app.ts', oldString: 'a', newString: 'b' }), { role: 'orchestrator' })
  assert.equal(source.exitCode, 2)
  assert.match(source.stdout[0], /禁止编辑源代码/)
})

test('§3 block-source-edit：终端写文件（Set-Content）→ deny；只读终端命令 → allow（负向控制）', () => {
  const denied = run('block-source-edit', P.legacy('run_in_terminal', { command: 'Set-Content docs/x.md -Value hi' }))
  assert.equal(denied.exitCode, 2)
  assert.match(denied.stdout[0], /禁止通过终端写文件/)
  const allowed = run('block-source-edit', P.legacy('run_in_terminal', { command: 'git log --oneline -3' }))
  assert.equal(allowed.exitCode, 0)
})

test('§3 block-source-edit：跨文件符号重命名 → deny', () => {
  const result = run('block-source-edit', P.legacy('vscode_renamesymbol', { filePath: '/tmp/kix-ws/docs/x.md' }))
  assert.equal(result.exitCode, 2)
  assert.match(result.stdout[0], /重命名/)
})

test('§3 block-source-edit-qa：测试文件放行（负向控制）、业务源码拦截、QA 文档放行', () => {
  const cases = [
    ['/tmp/kix-ws/tests/unit.test.js', 0],
    ['/tmp/kix-ws/docs/qa/qa-signoff-1.md', 0],
    ['/tmp/kix-ws/src/index.ts', 2],
    ['/tmp/kix-ws/docs/sprint-2/progress.md', 2],
  ]
  for (const [filePath, expected] of cases) {
    const result = run('block-source-edit-qa', P.legacy('replace_string_in_file', { filePath, oldString: 'a', newString: 'b' }))
    assert.equal(result.exitCode, expected, `${filePath} 期望 exit ${expected}`)
  }
})

test('§3 block-source-edit-qa：git 提交/写操作 → deny（.ps1 该分支失效，本实现按意图生效）', () => {
  const denied = run('block-source-edit-qa', P.legacy('run_in_terminal', { command: 'git commit -m "test: x"' }))
  assert.equal(denied.exitCode, 2)
  assert.match(denied.stdout[0], /QA 不提交测试/)
  const allowed = run('block-source-edit-qa', P.legacy('run_in_terminal', { command: 'node --test tests/unit.test.js' }))
  assert.equal(allowed.exitCode, 0)
})

test('§3 block-dev-authority-edit：写 l2_* 权威字段 → deny', () => {
  const result = run('block-dev-authority-edit', P.legacy('replace_string_in_file', {
    filePath: '/tmp/kix-ws/docs/sprint-2/progress.md',
    oldString: 'completed_tasks: 2',
    newString: 'completed_tasks: 2\nl2_verification_passed: true',
  }))
  assert.equal(result.exitCode, 2)
  assert.match(result.stdout[0], /权威 L2\/QA 字段/)
})

test('§3 block-dev-authority-edit 负向控制：更新任务状态（非权威字段）→ allow', () => {
  const allowed = run('block-dev-authority-edit', P.legacy('replace_string_in_file', {
    filePath: '/tmp/kix-ws/docs/sprint-2/progress.md',
    oldString: '- [ ] T6',
    newString: '- [x] T6',
  }))
  assert.equal(allowed.exitCode, 0)
  assert.equal(allowed.stdout.length, 0)
})

test('§3 block-dev-authority-edit：删除 progress.md / 写 .git/ → deny', () => {
  const deleted = run('block-dev-authority-edit', P.legacy('apply_patch', { input: '*** Begin Patch\n*** Delete File: docs/sprint-2/progress.md\n*** End Patch' }))
  assert.equal(deleted.exitCode, 2)
  const gitInternal = run('block-dev-authority-edit', P.legacy('create_file', { filePath: '/tmp/kix-ws/.git/config', content: 'x' }))
  assert.equal(gitInternal.exitCode, 2)
  assert.match(gitInternal.stdout[0], /\.git\//)
})

test('§3 block-dev-authority-edit：终端写文件 → deny；cargo fmt 格式化例外 + 只读命令 → allow（负向控制）', () => {
  const denied = run('block-dev-authority-edit', P.legacy('run_in_terminal', { command: 'Set-Content docs/sprint-2/progress.md -Value x' }))
  assert.equal(denied.exitCode, 2)
  const fmt = run('block-dev-authority-edit', P.legacy('run_in_terminal', { command: 'cargo fmt --all' }))
  assert.equal(fmt.exitCode, 0)
  const readOnly = run('block-dev-authority-edit', P.legacy('run_in_terminal', { command: 'git diff --stat' }))
  assert.equal(readOnly.exitCode, 0)
})

// ═══ §4 入口 CLI 端到端（薄 CLI：stdin → core → 输出 + exit code）═══════════

test('§4 入口 blast-radius-check.cjs：形态 3 与形态 1 均 exit 2 + deny JSON', () => {
  for (const stdin of [withMeta(P.legacy('run_in_terminal', FORCE_PUSH)), withMeta(P.calls('bash', FORCE_PUSH))]) {
    const result = runEntry('blast-radius-check.cjs', stdin)
    assert.equal(result.status, 2)
    assert.match(result.stdout, /"permissionDecision":"deny"/)
  }
})

test('§4 入口 blast-radius-check.cjs 负向控制：只读命令 exit 0 且无 stdout', () => {
  const result = runEntry('blast-radius-check.cjs', withMeta(P.legacy('run_in_terminal', { command: 'ls' })))
  assert.equal(result.status, 0)
  assert.equal(result.stdout.trim(), '')
})

test('§4 入口 block-dev-authority-edit.cjs：未知形态 → exit 2 + KIX-HOOK-UNKNOWN-PAYLOAD', () => {
  const result = runEntry('block-dev-authority-edit.cjs', withMeta(P.unknown({ toolInvocation: { name: 'bash', args: { command: 'git commit -m x' } } })))
  assert.equal(result.status, 2)
  assert.match(result.stdout, /KIX-HOOK-UNKNOWN-PAYLOAD/)
  assert.match(result.stderr, /KIX-HOOK-UNKNOWN-PAYLOAD/)
})

test('§4 入口 block-source-edit.cjs --role orchestrator 生效', () => {
  const stdin = withMeta(P.legacy('replace_string_in_file', { filePath: '/tmp/kix-ws/PROJECT_BRIEF.md', oldString: 'a', newString: 'b' }))
  const asProducer = runEntry('block-source-edit.cjs', stdin, ['--role', 'producer'], { KIX_HOOK_CORE_PATH: CORE_PATH })
  assert.equal(asProducer.status, 0)
  const asOrchestrator = runEntry('block-source-edit.cjs', stdin, ['--role', 'orchestrator'], { KIX_HOOK_CORE_PATH: CORE_PATH })
  assert.equal(asOrchestrator.status, 2)
  assert.match(asOrchestrator.stdout, /Orchestrator 只能写/)
})

test('§4 入口 block-source-edit-qa.cjs：测试文件放行、源码拦截', () => {
  assert.equal(runEntry('block-source-edit-qa.cjs', withMeta(P.legacy('replace_string_in_file', { filePath: '/tmp/kix-ws/tests/a.test.js', oldString: 'a', newString: 'b' }))).status, 0)
  assert.equal(runEntry('block-source-edit-qa.cjs', withMeta(P.legacy('replace_string_in_file', { filePath: '/tmp/kix-ws/src/a.ts', oldString: 'a', newString: 'b' }))).status, 2)
})

// ═══ §5 E0 同源锚点：函数体逐字相等 + 共享语料 verdict 一致 ═════════════════

// 规范化 = 去注释 + 去空白（字符串/正则内的内容原样保留，避免把 `//` 当成注释）。
function normalizeSource(src) {
  let out = ''
  let prev = ''
  const regexPosition = () =>
    prev === '' ||
    /[(,=:[!&|?{};+\-*%^~<>]$/.test(prev) ||
    /(?:^|[^\w$])(?:return|typeof|case|in|of|do|else|yield|await|new|delete|void|instanceof|throw)$/.test(prev)
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (ch === '/' && src[i + 1] === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch
      out += ch
      i++
      while (i < src.length) {
        const c = src[i]
        if (c === '\\') {
          out += c + (src[i + 1] || '')
          i += 2
          continue
        }
        out += c
        i++
        if (c === quote) break
      }
      prev = quote
      continue
    }
    if (ch === '/' && regexPosition()) {
      out += ch
      i++
      let inClass = false
      while (i < src.length) {
        const c = src[i]
        if (c === '\\') {
          out += c + (src[i + 1] || '')
          i += 2
          continue
        }
        out += c
        i++
        if (c === '[') inClass = true
        else if (c === ']') inClass = false
        else if (c === '/' && !inClass) break
      }
      while (i < src.length && /[a-z]/i.test(src[i])) {
        out += src[i]
        i++
      }
      prev = '/'
      continue
    }
    if (!/\s/.test(ch)) {
      out += ch
      prev = (prev + ch).slice(-40)
    }
    i++
  }
  return out
}

// 从源文本抽取顶层 function / 单行或多行 const（供 helper 与常量比对；`__internals` 未导出它们）。
function extractFromSource(source, name, kind) {
  const lines = source.split('\n')
  if (kind === 'function') {
    const start = lines.findIndex((line) => line.startsWith(`function ${name}(`))
    assert.ok(start >= 0, `kix-guards.js 中找不到 function ${name}`)
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i] === '}') return lines.slice(start, i + 1).join('\n')
    }
    assert.fail(`function ${name} 未闭合`)
  }
  const start = lines.findIndex((line) => line.startsWith(`const ${name} = `))
  assert.ok(start >= 0, `kix-guards.js 中找不到 const ${name}`)
  let depth = 0
  let quote = null
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]
      if (quote) {
        if (ch === '\\') {
          j++
          continue
        }
        if (ch === quote) quote = null
        continue
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        quote = ch
        continue
      }
      if (ch === '/' && line[j + 1] === '/') break
      if (ch === '[' || ch === '(' || ch === '{') depth++
      else if (ch === ']' || ch === ')' || ch === '}') depth--
    }
    if (depth <= 0 && quote === null) return lines.slice(start, i + 1).join('\n')
  }
  assert.fail(`const ${name} 未终止`)
}

const GUARDS_SOURCE = fs.readFileSync(GUARDS_PATH, 'utf8')

test('§5 同源函数体断言：core 的每个移植函数与 __internals 同名函数规范化后逐字相等', () => {
  const names = Object.keys(core.GUARDS_PORTED)
  assert.ok(names.length >= 20, `移植函数数量异常：${names.length}`)
  for (const name of names) {
    assert.equal(typeof guardInternals[name], 'function', `__internals 缺少同名函数：${name}`)
    assert.equal(
      normalizeSource(core.GUARDS_PORTED[name].toString()),
      normalizeSource(guardInternals[name].toString()),
      `函数体漂移：${name}（core 与 kix-guards.js 不同源）`,
    )
  }
})

test('§5 同源声明覆盖 plan §13.1 点名的函数（13 个，防静默缩表）', () => {
  const required = ['stripSqlNoise', 'isDestructiveSql', 'isTerminalDestructiveSql', 'splitShellSegments', 'shellTokens', 'leadingCommand', 'gitInvocations', 'isForcePush', 'pushTargetsProtectedRef', 'resolveCommitBudget', 'countReflogCommits', 'targetsControlPlane', 'isInstallControlPlanePath']
  for (const name of required) {
    const declared = Object.prototype.hasOwnProperty.call(core.GUARDS_PORTED, name) || Object.prototype.hasOwnProperty.call(core.GUARDS_PORTED_LOCAL_HELPERS, name)
    assert.ok(declared, `同源声明缺少 plan 点名函数：${name}`)
  }
})

test('§5 本地 helper（__internals 未导出）逐字来源于 kix-guards.js 源文本', () => {
  const helpers = Object.keys(core.GUARDS_PORTED_LOCAL_HELPERS)
  assert.ok(helpers.length > 0)
  for (const name of helpers) {
    if (typeof guardInternals[name] === 'function') {
      // plan 点名但 __internals 未导出的函数（如 isInstallControlPlanePath）走本通道；
      // 若将来 kix-guards 导出它们，两条通道的断言强度相同，无需搬迁，但需在此登记。
      assert.ok(['isInstallControlPlanePath', 'isSourceRepoPresetPath'].includes(name), `${name} 已在 __internals 导出 → 应移入 GUARDS_PORTED`)
    }
    assert.equal(
      normalizeSource(core.GUARDS_PORTED_LOCAL_HELPERS[name].toString()),
      normalizeSource(extractFromSource(GUARDS_SOURCE, name, 'function')),
      `helper 漂移：${name}`,
    )
  }
})

test('§5 常量逐字来源于 kix-guards.js 源文本', () => {
  // 源侧归一：Set 常量取其字面量元素序列；标量取初始化表达式原文。
  const literalOf = (name) => {
    const raw = extractFromSource(GUARDS_SOURCE, name, 'const')
      .split('\n')
      .map((line) => line.replace(/\/\/[^\n]*$/, ''))
      .join('\n')
      .replace(/^const\s+[^=]+=\s*/, '')
    if (/^new Set\(/.test(raw)) {
      const items = raw.match(/'[^']*'|"[^"]*"/g) || []
      return [...new Set(items.map((item) => item.slice(1, -1)))].join(',')
    }
    return raw.trim()
  }
  for (const name of Object.keys(core.GUARDS_PORTED_CONSTANTS)) {
    const value = core.GUARDS_PORTED_CONSTANTS[name]
    const actual = value instanceof Set ? [...value].join(',') : String(value)
    assert.equal(actual, literalOf(name), `常量漂移：${name}`)
  }
})

test('§5 共享语料：core 与 __internals 对同一语料 verdict 一致', () => {
  const corpus = [
    'git push --force origin main',
    'git push origin feature/x',
    'git push --force-with-lease origin feature/x',
    'git reset --hard HEAD~1',
    'git clean -f',
    'git stash drop',
    'git checkout -- src/a.ts',
    'DROP TABLE users',
    "DELETE FROM users WHERE id = 1",
    'DELETE FROM users',
    'UPDATE users SET a = 1 WHERE id = 2',
    'UPDATE users SET a = 1',
    'psql -c "TRUNCATE TABLE t"',
    'Set-Content ~/.dsh/agent.cordis.yml -Value x',
    'grep -n dsh ~/.dsh/agent.cordis.yml',
    'ls -la',
    'git commit -m x',
  ]
  for (const text of corpus) {
    assert.equal(core.isForcePush(text), guardInternals.isForcePush(text), `isForcePush 分歧：${text}`)
    assert.equal(core.pushTargetsProtectedRef(text), guardInternals.pushTargetsProtectedRef(text), `pushTargetsProtectedRef 分歧：${text}`)
    assert.equal(core.isLocalDestructiveAsk(text), guardInternals.isLocalDestructiveAsk(text), `isLocalDestructiveAsk 分歧：${text}`)
    assert.equal(core.isDestructiveSql(text), guardInternals.isDestructiveSql(text), `isDestructiveSql 分歧：${text}`)
    assert.equal(core.isTerminalDestructiveSql(text), guardInternals.isTerminalDestructiveSql(text), `isTerminalDestructiveSql 分歧：${text}`)
    assert.equal(core.isTerminalControlPlaneWrite(text), guardInternals.isTerminalControlPlaneWrite(text), `isTerminalControlPlaneWrite 分歧：${text}`)
    assert.equal(core.targetsControlPlane(text), guardInternals.targetsControlPlane(text), `targetsControlPlane 分歧：${text}`)
  }
})

// ═══ §6 mutation probe：改坏 core ⇒ 本套件必须红（断言非恒真）═══════════════

const MUTANT_SUFFIX = `
// mutation probe（由 hook-engine.test.js §6 生成；仅存在于临时副本）
module.exports.normalizePayload = (raw) => ({ status: 'no-tool-call', shape: null, calls: [], detail: 'mutant', meta: { cwd: '', workspaceFolder: '' } })
module.exports.verdictBlastRadius = () => ({ decision: 'allow', reason: '' })
module.exports.verdictSourceEdit = () => ({ decision: 'allow', reason: '' })
module.exports.verdictSourceEditQa = () => ({ decision: 'allow', reason: '' })
module.exports.verdictDevAuthorityEdit = () => ({ decision: 'allow', reason: '' })
`

test('§6 mutation probe：KIX_HOOK_CORE_PATH=改坏的副本 → 套件必须红', { skip: process.env.KIX_HOOK_PROBE_CHILD === '1' ? 'probe child（防递归）' : false }, () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-hook-mutant-'))
  try {
    const relativeRequire = "require('../../scripts/kixpower-contract.cjs')"
    const contractPath = path.join(REPO_ROOT, 'skills', 'kixpower', 'scripts', 'kixpower-contract.cjs')
    const source = fs.readFileSync(CORE_DEFAULT, 'utf8')
    assert.ok(source.includes(relativeRequire), 'core 的契约 require 形态变化 → mutation probe 需同步修订')
    // mutant 落在 tmp：相对 require 必须改写为绝对路径，否则「红」的原因是模块解析失败而非语义断言
    const mutant = path.join(tmpDir, 'kix-verdict.mutant.cjs')
    fs.writeFileSync(mutant, source.replace(relativeRequire, `require(${JSON.stringify(contractPath)})`) + MUTANT_SUFFIX)
    // 子进程用**最小环境**：父进程自身是 `node --test` 的 child，其注入的测试运行器环境变量
    // 会让孙进程 `node --test` 直接 0 退出（实测：继承全量 env 时 probe 恒绿 = 假绿）。
    const env = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      TMPDIR: process.env.TMPDIR,
      LANG: process.env.LANG,
      SystemRoot: process.env.SystemRoot,
      KIX_HOOK_CORE_PATH: mutant,
      KIX_HOOK_PROBE_CHILD: '1',
    }
    const result = spawnSync(process.execPath, ['--test', __filename], {
      encoding: 'utf8',
      timeout: 240000,
      env: Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined)),
    })
    const output = `${result.stdout || ''}${result.stderr || ''}`
    assert.notEqual(result.status, 0, `mutation probe 未变红 ⇒ 断言疑似恒真（stdout 尾部：${output.slice(-600)}）`)
    assert.doesNotMatch(output, /Cannot find module/, `mutation probe 的「红」必须来自断言失败，而不是模块解析失败：${output.slice(-400)}`)
    assert.match(output, /^not ok \d+/m, 'mutation probe 必须产生断言级失败（not ok）')
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})
