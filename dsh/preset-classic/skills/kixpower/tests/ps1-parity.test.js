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

function runOracle(script, { cwd = REPO_ROOT } = {}) {
  return spawnSync(ORACLE, ['-NoProfile', '-NonInteractive', '-Command', script], { cwd, encoding: 'buffer' })
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

const PARITY_CASES = [
  { name: 'kixpower-contract.cjs', desc: '契约 helper（Get-KixRequiredLocalGates + 规范化 manifest + SHA-256）', run: compareContract },
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
  const planText = CONTRACT_FIXTURE_PLAN
  const gates = contract.requiredLocalGates(planText)
  assert.equal(gates.length, 2, 'fixture 必须 ≥2 条 required local_gate（避开单元素解包差异）')
  assert.deepEqual(gates.map((g) => g.id), ['LG1', 'LG2'])
  const manifest = contract.gateManifestJson(gates)
  assert.equal(manifest.includes('\n'), false)
  assert.equal(manifest, '[{"id":"LG1","type":"local_gate","cmd":"npm run test:installer","expect":"exit 0","required":true},'
    + '{"id":"LG2","type":"local_gate","cmd":"npm run test:consistency","expect":"exit 0","required":true}]')
  assert.match(contract.sha256Hex(manifest), /^[0-9a-f]{64}$/)
})
