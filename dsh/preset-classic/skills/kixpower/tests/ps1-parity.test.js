#!/usr/bin/env node
'use strict'
// ps1-parity.test.js — 差分对拍（E1）证据通道（Sprint 2 T1；T2/T3/T4 追加各自移植件）。
//
// 证据强度（plan.md §7.3）：同一 fixture 分别喂**参照实现 .ps1** 与 **Node 移植 .cjs**，
// 比对 stdout **逐字节** + exit code。只有它能证伪「行为等价」。
//
// 三态（plan.md §7 LG10，机械可区分）：
//   parity: PASS        宿主具备 oracle 能力，且全部 fixture 逐字节一致 + exit code 一致 → 计入通过
//   parity: FAIL        任一 fixture 不一致 / oracle 存在但探针非 0 → unmet
//   parity: unavailable 宿主缺 oracle 能力（探针 ENOENT）→ **不计入通过**，也不是 skip
//
// `unavailable` 的实现要点（为什么不用 t.skip）：`node --test` 的 skip 与 pass 一样让进程
// exit 0，会被下游读成「本文件全绿 ⇒ 等价性已证」——这正是 §1.2 要消灭的「假绿」。故
// unavailable 走**显式失败**路径：进程非 0，且 stdout/诊断首行为机器可识别的 `parity: unavailable`。
// gate 读取规则：exit 0 + `parity: PASS` = 通过；exit≠0 + `parity: FAIL` = unmet；
// exit≠0 + `parity: unavailable` = 能力缺失（LG10 记 unavailable，走 §7.3 降级路径）。
//
// ⚠ v2 修订（plan.md §13.1 T6 步骤 D，2026-09-22）：三态的**进程退出码**目标为
//   0=PASS / 1=FAIL / 2=unavailable。实测（Node 22.14）：`node --test <file>` 把测试子进程的任何
//   失败**归一化为 exit 1**（本文件内 `process.exit(2)` / `process.exitCode = 2` 均被外层 runner 抹平）
//   → **本 gate 的 cmd（`node --test …`）无法表达 2**。因此：
//   - 本文件保留状态行作为唯一的三态机器可读通道（`parity: PASS|FAIL|unavailable`，T1 设计不变）；
//   - 三态退出码在 **CI step**（`.github/workflows/ci.yml` 的 "Parity vs pwsh reference (E1, three-state)"）
//     按状态行映射为 0/1/2，供 CG4 机械定档；
//   - 本地 `unavailable` 的进程退出码仍为 1（非 0 ⇒ 不计入通过；禁止写成 skip/pass/「已等价」）。
//   该机制限制已登记在 `docs/sprint-2/progress.md`（`parity_exit_code:` 行）。
//
// 运行：`node --test skills/kixpower/tests/ps1-parity.test.js`（LG10）。
// **不挂进 npm test 链**（plan.md §2 / §7-MG1）：否则无 oracle 的宿主会把 canonical 链变红。

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const contract = require('../scripts/kixpower-contract.cjs')

// oracle：差分对拍的参照解释器（宿主能力，非产品依赖；plan.md §7.4 的 verification-only 边界）
const ORACLE = process.platform === 'win32' ? 'pwsh.exe' : 'pwsh'

function findRepoRoot(start) {
  let dir = start
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'skills', 'kixpower', 'scripts', 'kixpower-contract.ps1'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

const REPO_ROOT = findRepoRoot(__dirname)

// ── 能力探针（HB-1 形状：真跑一次版本查询 + ENOENT 判据）────────────────────
function probeOracle() {
  const probe = spawnSync(ORACLE, ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'], {
    encoding: 'utf8',
  })
  if (probe.error && probe.error.code === 'ENOENT') {
    return { available: false, reason: `probe ENOENT: ${ORACLE} not found on PATH`, probe }
  }
  if (probe.error) return { available: false, reason: `probe error: ${probe.error.message}`, probe }
  if (probe.status !== 0) {
    return { available: false, reason: `probe exit ${probe.status}: ${String(probe.stderr || '').trim().split('\n')[0]}`, probe }
  }
  return { available: true, version: String(probe.stdout || '').trim(), probe }
}

const ORACLE_INFO = probeOracle()

function psQuote(value) {
  return "'" + String(value).replace(/'/g, "''") + "'"
}

// script：经 -Command 执行的脚本片段；args：经 -File 执行的参数数组（二者互斥）
function runOracle(script, { cwd = REPO_ROOT, args = null } = {}) {
  const argv = args ? ['-NoProfile', '-NonInteractive', ...args] : ['-NoProfile', '-NonInteractive', '-Command', script]
  return spawnSync(ORACLE, argv, { cwd, encoding: 'buffer' })
}

function runNode(args, { cwd = REPO_ROOT } = {}) {
  return spawnSync(process.execPath, args, { cwd, encoding: 'buffer' })
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

// ── fixture ───────────────────────────────────────────────────────────────
// 2 条 required local_gate（>1，避开 ps1 ConvertTo-Json 的单元素解包差异）+ 1 条非 required。
// 内容全 ASCII 且不含引号/HTML 敏感字符：让 §7.2 的 escape_ambiguity 不参与本 fixture
// （转义规则随参照实现版本而异，需先取证再固化，不在差分通道里赌）。
const CONTRACT_FIXTURE_PLAN = [
  'verifiable_gates:',
  '  local_gate:',
  '    - id: LG1',
  '      type: local_gate',
  '      cmd: "npm run test:installer"',
  '      expect: "exit 0"',
  '      required: true',
  '    - id: LG2',
  '      type: local_gate',
  '      cmd: "npm run test:consistency"',
  '      expect: "exit 0"',
  '      required: true',
  '    - id: LG3',
  '      type: local_gate',
  '      cmd: "npm run audit:pressures"',
  '      expect: "exit 0"',
  '      required: false',
  '    - id: CG1',
  '      type: ci_gate',
  '      cmd: "gh pr checks"',
  '      expect: "success"',
  '      required: true',
  '',
].join('\n')

function writeContractFixture() {
  const dir = tempDir('kix-parity-contract-')
  const file = path.join(dir, 'plan.md')
  fs.writeFileSync(file, CONTRACT_FIXTURE_PLAN, 'utf8')
  return { dir, file }
}

// ── 对拍用例 ──────────────────────────────────────────────────────────────
// 每个用例返回 { label, expectedLines, oracle, node } 供逐字节比较。
function compareContract() {
  const fixture = writeContractFixture()
  try {
    const planText = fs.readFileSync(fixture.file, 'utf8')
    const gates = contract.requiredLocalGates(planText)
    const manifest = contract.gateManifestJson(gates)
    const nodeOut = Buffer.from(`${manifest}\n${contract.sha256Hex(manifest)}\n`, 'utf8')

    const script = [
      "$ErrorActionPreference = 'Stop'",
      `. ${psQuote(path.join(REPO_ROOT, 'skills', 'kixpower', 'scripts', 'kixpower-contract.ps1'))}`,
      `$plan = Get-Content -Raw -LiteralPath ${psQuote(fixture.file)}`,
      '$gates = @(Get-KixRequiredLocalGates -PlanText $plan)',
      '$json = Get-KixGateManifestJson -Gates $gates',
      '[Console]::Out.Write($json + "`n" + (Get-KixSha256 -Text $json) + "`n")',
    ].join('\n')
    const oracleResult = runOracle(script)
    // 参照实现的序号即 §7.2 的 canonical 顺序（culture-aware）；本机实测两种顺序同值，
    // 若某宿主上不同，本用例会以 exit/stdout 差异暴露（而非静默取一种）。
    return { label: 'kixpower-contract', oracle: oracleResult, node: { status: 0, stdout: nodeOut, stderr: Buffer.alloc(0) } }
  } finally {
    fs.rmSync(fixture.dir, { recursive: true, force: true })
  }
}

// ── T2：validate-memory-backlog 的差分对拍 ─────────────────────────────────
// fixture 分两组：合法（三行统计 + exit 0）与非法（errors 段逐字 + exit 2）。
// 非法组刻意把 4 类规则各放一条：重复 id / 缺 status / validated 缺 trial+pass / archived 缺 archive_reason
// —— 使「逐字对齐」覆盖规则集合与错误顺序，而不只是 happy path。
const VALIDATOR_BACKLOG_VALID = [
  '- id: HB-1',
  '  type: rule',
  '  problem: p1',
  '  improvement: i1',
  '  source: s1',
  '  evidence: e1',
  '  eval:',
  '    kind: origin',
  '    result: observed',
  '  status: candidate',
  '',
  '- id: HB-2',
  '  type: rule',
  '  problem: p2',
  '  improvement: i2',
  '  source: s2',
  '  evidence: e2',
  '  eval: e2',
  '  status: archived',
  '  archive_reason: stale',
  '',
].join('\n')

const VALIDATOR_BACKLOG_INVALID = [
  '- id: HB-1',
  '  type: rule',
  '  problem: p1',
  '  improvement: i1',
  '  source: s1',
  '  evidence: e1',
  '  eval: e1',
  '  status: candidate',
  '',
  '- id: HB-1',
  '  type: rule',
  '  problem: p1b',
  '  improvement: i1b',
  '  source: s1',
  '  evidence: e1',
  '  eval: e1',
  '  status: candidate',
  '',
  '- id: HB-2',
  '  type: rule',
  '  problem: p2',
  '  improvement: i2',
  '  source: s2',
  '  evidence: e2',
  '  eval: e2',
  '  status: validated',
  '',
  '- id: HB-3',
  '  type: rule',
  '  problem: p3',
  '  improvement: i3',
  '  source: s3',
  '  evidence: e3',
  '  eval: e3',
  '  status: archived',
  '',
].join('\n')

function makeParityBacklog(content) {
  const root = tempDir('kix-parity-backlog-')
  const dir = path.join(root, '.kixpower', 'memory', 'repo')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'harness-backlog.md'), content, 'utf8')
  return root
}

function compareValidator(kind) {
  const root = makeParityBacklog(kind === 'valid' ? VALIDATOR_BACKLOG_VALID : VALIDATOR_BACKLOG_INVALID)
  try {
    const oracle = runOracle(null, {
      args: ['-NoProfile', '-NonInteractive', '-File', path.join(REPO_ROOT, 'skills', 'kixpower', 'scripts', 'validate-memory-backlog.ps1'), '-ProjectRoot', root],
    })
    const node = runNode([path.join(REPO_ROOT, 'skills', 'kixpower', 'scripts', 'validate-memory-backlog.cjs'), '--project-root', root])
    return { label: `validate-memory-backlog#${kind}`, oracle, node }
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

// ── T3：verification-fidelity-check 的差分对拍 ────────────────────────────
// 直接对**当前仓库**跑（两边读同一 revision 的工作树 → 输出必须逐字节一致），
// 覆盖 baseline 分支与真实 scope/fidelity 计算两条路径。
function compareFidelity(prevSprint) {
  const ps1 = path.join(REPO_ROOT, 'skills', 'kixpower', 'scripts', 'verification-fidelity-check.ps1')
  const cjs = path.join(REPO_ROOT, 'skills', 'kixpower', 'scripts', 'verification-fidelity-check.cjs')
  const oracle = runOracle(null, { args: ['-NoProfile', '-NonInteractive', '-File', ps1, '-ProjectRoot', REPO_ROOT, '-PrevSprint', String(prevSprint)] })
  const node = runNode([cjs, '--project-root', REPO_ROOT, '--prev-sprint', String(prevSprint)])
  return { label: `verification-fidelity-check#prev${prevSprint}`, oracle, node }
}

// ── T4：sync-dsh-preset 的差分对拍（**dry-run 专用夹具**）──────────────────
// 为什么只对拍 dry-run：
//   ① 不落盘 → oracle 与 node 可共用同一棵临时树，夹具无副作用、可重复；
//   ② stdout 面收敛为「空行 + 汇总行 + 单条 Added」这些**与遍历顺序无关**的行，避开
//      `Get-ChildItem -Recurse`（PS）与 DFS（本实现）在多样本下的顺序差异 —— 顺序差异不是行为
//      差异，但会污染逐字节对拍，属夹具噪声而非证据。
// 完整行为矩阵（目录指针展开 / 原生 symlink / 大小写变体 / fail-closed 两例）由
// `scripts/sync-dsh-preset.test.js` 的 5 条功能用例对 Node 版独立覆盖（§16.2 的 E0/E2 通道）。
// 附带口径：ps1 的 Added/Updated/Target-only 行带 -ForegroundColor，PS 在**输出被重定向**时
// 按 $PSStyle.OutputRendering='Host' 抹掉 ANSI → 捕获到的 stdout 无转义序列（pwsh 7+ 行为）。
function makeParitySyncBundle({ inSync }) {
  const root = tempDir('kix-parity-sync-')
  const bundle = path.join(root, 'bundle')
  const target = path.join(root, 'target')
  fs.mkdirSync(path.join(bundle, 'src'), { recursive: true })
  fs.mkdirSync(target, { recursive: true })
  fs.writeFileSync(path.join(bundle, 'src', 'only.txt'), 'only\n', 'utf8')
  if (inSync) fs.writeFileSync(path.join(target, 'only.txt'), 'only\n', 'utf8')
  return { root, bundle, target }
}

function compareSync(inSync) {
  const fixture = makeParitySyncBundle({ inSync })
  try {
    const ps1 = path.join(REPO_ROOT, 'scripts', 'sync-dsh-preset.ps1')
    const cjs = path.join(REPO_ROOT, 'scripts', 'sync-dsh-preset.cjs')
    const oracle = runOracle(null, {
      args: ['-File', ps1, '-BundleRoot', fixture.bundle, '-SourceDir', 'src', '-PresetRoot', fixture.target, '-DryRun', '-Force'],
    })
    const node = runNode([cjs, '--bundle-root', fixture.bundle, '--source-dir', 'src', '--preset-root', fixture.target, '--dry-run', '--force'])
    return { label: `sync-dsh-preset#dry-run${inSync ? '-in-sync' : '-add-one'}`, oracle, node }
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true })
  }
}

const PARITY_CASES = [
  { name: 'kixpower-contract.cjs', desc: '契约 helper（Get-KixRequiredLocalGates + 规范化 manifest + SHA-256）', run: compareContract },
  {
    name: 'validate-memory-backlog.cjs#valid',
    desc: 'memory lifecycle validator（合法 fixture：三行统计 + exit 0）',
    run: () => compareValidator('valid'),
  },
  {
    name: 'validate-memory-backlog.cjs#invalid',
    desc: 'memory lifecycle validator（非法 fixture：errors 段逐字 + exit 2）',
    run: () => compareValidator('invalid'),
  },
  {
    name: 'sync-dsh-preset.cjs#dry-run-in-sync',
    desc: 'sync（dry-run；目标已一致 → added 0 / updated 0 / unchanged 1）',
    run: () => compareSync(true),
  },
  {
    name: 'sync-dsh-preset.cjs#dry-run-add-one',
    desc: 'sync（dry-run；缺 1 个文件 → Added 单条目 + 汇总行）',
    run: () => compareSync(false),
  },
  {
    name: 'verification-fidelity-check.cjs#baseline',
    desc: 'fidelity check（--prev-sprint 0 的 baseline 分支）',
    run: () => compareFidelity(0),
  },
  {
    name: 'verification-fidelity-check.cjs#sprint1',
    desc: 'fidelity check（对真实仓库跑 Sprint 1 → 2 的 scope/fidelity 计算）',
    run: () => compareFidelity(1),
  },
]

function summarize(result) {
  const exitEqual = result.oracle.status === result.node.status
  const stdoutEqual = Buffer.compare(result.oracle.stdout, result.node.stdout) === 0
  const detail = [
    `exit oracle=${result.oracle.status} node=${result.node.status}`,
    `stdout oracle=${JSON.stringify(String(result.oracle.stdout).slice(0, 200))}`,
    `stdout node=${JSON.stringify(String(result.node.stdout).slice(0, 200))}`,
  ].join(' | ')
  return { ok: exitEqual && stdoutEqual, exitEqual, stdoutEqual, detail }
}

const RESULTS = ORACLE_INFO.available
  ? PARITY_CASES.map((c) => ({ name: c.name, ...summarize(c.run()) }))
  : []

// 机器可识别状态行（gate 机械读取；QA signoff 逐条登记）
if (!ORACLE_INFO.available) {
  console.log(`parity: unavailable — ${ORACLE_INFO.reason}（E1 差分对拍通道不存在；不计入通过，plan.md §7 LG10）`)
} else if (RESULTS.every((r) => r.ok)) {
  console.log(`parity: PASS — oracle ${ORACLE_INFO.version}；${RESULTS.length} 个移植件在全部 fixture 上 stdout 逐字节一致且 exit code 一致`)
} else {
  console.log(`parity: FAIL — oracle ${ORACLE_INFO.version}；首个分歧：${RESULTS.find((r) => !r.ok).detail}`)
}

function assertParity(name) {
  if (!ORACLE_INFO.available) {
    // 不是 skip、不是 pass：显式非 0 + 状态行（见文件头三态说明）
    assert.fail(`parity: unavailable — ${ORACLE_INFO.reason}`)
  }
  const result = RESULTS.find((r) => r.name === name)
  assert.ok(result, `missing parity result for ${name}`)
  assert.equal(result.exitEqual, true, `exit code mismatch — ${result.detail}`)
  assert.equal(result.stdoutEqual, true, `stdout not byte-identical — ${result.detail}`)
}

for (const parityCase of PARITY_CASES) {
  test(`parity: ${parityCase.name} — ${parityCase.desc}`, () => {
    assertParity(parityCase.name)
  })
}

test('parity harness 自检：fixture 与 oracle 契约形状（不依赖 oracle 能力）', () => {
  assert.ok(REPO_ROOT, 'repo root not found from test file location')
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'skills', 'kixpower', 'scripts', 'kixpower-contract.ps1')), '参照实现缺失（E1 的 oracle 输入）')
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'skills', 'kixpower', 'scripts', 'validate-memory-backlog.ps1')), 'validator 参照实现缺失（E1 的 oracle 输入）')
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'skills', 'kixpower', 'scripts', 'verification-fidelity-check.ps1')), 'fidelity 参照实现缺失（E1 的 oracle 输入）')
  // 覆盖登记自检：**已落地**的 Node 移植件必须登记 parity 用例（plan.md §4-T4 的关键归属要求：
  // 4 个移植件的差分断言一律留在这个文件里，不得回到各自的功能测试文件）
  const portedArtifacts = ['kixpower-contract.cjs', 'validate-memory-backlog.cjs', 'verification-fidelity-check.cjs', 'sync-dsh-preset.cjs']
  for (const file of portedArtifacts) {
    const candidates = [
      path.join(REPO_ROOT, 'skills', 'kixpower', 'scripts', file),
      path.join(REPO_ROOT, 'scripts', file),
    ]
    if (!candidates.some((candidate) => fs.existsSync(candidate))) continue
    const stem = file.replace(/\.cjs$/, '')
    assert.ok(PARITY_CASES.some((c) => c.name.startsWith(stem)), `${file} 已落地但未登记 parity 用例`)
  }
  const planText = CONTRACT_FIXTURE_PLAN
  const gates = contract.requiredLocalGates(planText)
  assert.equal(gates.length, 2, 'fixture 必须 ≥2 条 required local_gate（避开单元素解包差异）')
  assert.deepEqual(gates.map((g) => g.id), ['LG1', 'LG2'])
  const manifest = contract.gateManifestJson(gates)
  assert.equal(manifest.includes('\n'), false)
  assert.equal(manifest, '[{"id":"LG1","type":"local_gate","cmd":"npm run test:installer","expect":"exit 0","required":true},'
    + '{"id":"LG2","type":"local_gate","cmd":"npm run test:consistency","expect":"exit 0","required":true}]')
  assert.match(contract.sha256Hex(manifest), /^[0-9a-f]{64}$/)
  // 非法 fixture 必须真的非法：4 类规则各命中一次（否则 E1 的 invalid 用例是空转）
  const invalidRoot = makeParityBacklog(VALIDATOR_BACKLOG_INVALID)
  try {
    const nodeResult = runNode([path.join(REPO_ROOT, 'skills', 'kixpower', 'scripts', 'validate-memory-backlog.cjs'), '--project-root', invalidRoot])
    assert.equal(nodeResult.status, 2)
    const out = String(nodeResult.stdout)
    for (const expected of [
      'duplicate id: HB-1',
      'HB-2: validated record needs a trial/pass evidence',
      'HB-3: archived record needs archive_reason',
    ]) assert.ok(out.includes(expected), `invalid fixture 未命中 ${expected}: ${out}`)
  } finally {
    fs.rmSync(invalidRoot, { recursive: true, force: true })
  }
})
