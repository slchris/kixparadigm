#!/usr/bin/env node
'use strict'
// trust-chain.test.js — trust-chain 的 **characterization** 证据通道（Sprint 2 T1）。
//
// 证据强度（plan.md §7.3）：本套件**不需要 oracle 宿主能力**，它证明的是
//   「.cjs 的输出符合**从参照实现 .ps1 语义反推**的固定期望」+ 负向控制证明断言非恒真。
// 它**不能**证明与参照实现的实际行为一致 —— 那是 ps1-parity.test.js（E1，LG10）的职责，
// 在该通道 `unavailable` 时，本套件的绿**不得**表述为「等价性已证」（§7.3 阶梯）。
//
// 契约模块：skills/kixpower/scripts/kixpower-contract.cjs（3 副本字节一致）。
// 运行：`node --test skills/kixpower/tests/trust-chain.test.js`（LG9；**不**挂进 npm test 链）。

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const contract = require('../scripts/kixpower-contract.cjs')

// Sprint 1 的冻结凭据（docs/sprint-1/progress.md:35，L2 纪元记录值）。
// E3 = 用它对本实现做一次回归取证（plan.md §7.3-E3 / MG3）。
const FROZEN_MANIFEST_SHA256 = '46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb'

// 从测试文件位置向上寻找仓库根（源副本 3 层；两个 preset 镜像副本层数不同）。
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

// ── fixture：覆盖 §7.2 关心的全部形态 ──────────────────────────────────────
// LG2 故意用 `expect: >-`（折叠块）：参照实现的 Get-KixYamlScalar 取的是**行首字面量**
// `>-`，不是 YAML 折叠后的正文 —— 这正是 R-1 的 first_divergence 候选点，必须被钉住。
// LG11 的 required: false 与 MG1 的无 type（legacy）用于覆盖过滤分支。
const PLAN_FIXTURE = [
  '# fixture plan',
  '',
  '```yaml',
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
  '      expect: >-',
  '        exit 0；stdout 含 CONSISTENCY OK',
  '      required: true',
  '    - id: LG10',
  '      type: local_gate',
  '      cmd: "node --test parity.test.js"',
  '      expect: "exit 0"',
  '      required: true',
  '      host_requires: [oracle-bin]',
  '    - id: LG11',
  '      type: local_gate',
  '      cmd: "node --test extra.test.js"',
  '      expect: "exit 0"',
  '      required: false',
  '    - id: CG1',
  '      type: ci_gate',
  '      cmd: "gh pr checks"',
  '      expect: "success"',
  '      required: true',
  '  manual_gate:',
  '    - id: MG1',
  '      cmd: "grep -c x y | wc -l"',
  '      expect: "0"',
  '      required: true',
  '```',
].join('\n')

test('frontmatter 提取 `---` body，无 frontmatter 返回空串', () => {
  assert.equal(contract.frontmatter('---\nsprint: 2\nstatus: planning\n---\n\n# body\n'), 'sprint: 2\nstatus: planning')
  assert.equal(contract.frontmatter('# no frontmatter\n'), '')
})

test('yamlScalar 去注释/去引号；无匹配返回 null', () => {
  const text = '  commit_budget: 6   # hook 读取\nquoted: "a b"\nsingle: \'c\'\n'
  assert.equal(contract.yamlScalar(text, 'commit_budget'), '6')
  assert.equal(contract.yamlScalar(text, 'quoted'), 'a b')
  assert.equal(contract.yamlScalar(text, 'single'), 'c')
  assert.equal(contract.yamlScalar(text, 'absent'), null)
})

test('yamlList 支持 block / inline / 花括号保护，去重保序', () => {
  const block = 'globs:\n  - "a/**"\n  - src/b.rs\n  - "a/**"\n'
  assert.deepEqual(contract.yamlList(block, 'globs'), ['a/**', 'src/b.rs'])
  const inline = 'globs: [src/{payment,gateway}.rs, "docs/**"]\n'
  assert.deepEqual(contract.yamlList(inline, 'globs'), ['src/{payment,gateway}.rs', 'docs/**'])
  assert.deepEqual(contract.yamlList('other: 1\n', 'globs'), [])
})

test('inlineYamlList 全文扫描 flow 映射（模块/globs 的 inline 形态）', () => {
  const text = 'target_rules: { globs: [a/*.js, b/*.cjs], modules: [scripts] }\n'
  assert.deepEqual(contract.inlineYamlList(text, 'globs'), ['a/*.js', 'b/*.cjs'])
  assert.deepEqual(contract.inlineYamlList(text, 'modules'), ['scripts'])
})

test('indentedBlocks 以缩进边界切块，注释行不终止、同级非注释行终止', () => {
  const text = ['target_rules:', '  globs: [a]', '  # 注释行保留', '  modules: [b]', 'next_section: 1', ''].join('\n')
  const blocks = contract.indentedBlocks(text, 'target_rules')
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0], '  globs: [a]\n  # 注释行保留\n  modules: [b]')
  assert.deepEqual(contract.indentedBlocks('nothing: 1\n', 'target_rules'), [])
})

test('planGateRecords 解析 5 字段 + owner 兜底 + legacy 默认', () => {
  const records = contract.planGateRecords(PLAN_FIXTURE)
  assert.deepEqual(records.map((r) => r.id), ['LG1', 'LG2', 'LG10', 'LG11', 'CG1', 'MG1'])
  const lg2 = records.find((r) => r.id === 'LG2')
  assert.equal(lg2.type, 'local_gate')
  assert.equal(lg2.expect, '>-')          // 行首字面量语义（§7.2 first_divergence 候选）
  assert.equal(lg2.required, true)
  const mg1 = records.find((r) => r.id === 'MG1')
  assert.equal(mg1.type, 'legacy')        // 无 type 且 owner ≠ L2
  assert.equal(mg1.cmd, 'grep -c x y | wc -l')
  assert.deepEqual(records.find((r) => r.id === 'LG10').host_requires, ['oracle-bin'])
})

test('owner: L2 是 local_gate 的兼容映射（历史计划）', () => {
  const legacyPlan = ['verifiable_gates:', '  local_gate:', '    - id: L1', '      owner: L2', '      command: "cargo test"', '      required: true'].join('\n')
  const [record] = contract.planGateRecords(legacyPlan)
  assert.equal(record.type, 'local_gate')
  assert.equal(record.cmd, 'cargo test')
})

test('requiredLocalGates：只取 local_gate + required，按 id 排序且按 id 去重', () => {
  const gates = contract.requiredLocalGates(PLAN_FIXTURE)
  assert.deepEqual(gates.map((g) => g.id), ['LG1', 'LG10', 'LG2'])
  assert.equal(gates.every((g) => g.type === 'local_gate' && g.required), true)
})

test('gateManifestConflicts 检测同 id 不同签名，签名相同不报', () => {
  const plan = [
    'verifiable_gates:',
    '  local_gate:',
    '    - id: LG1',
    '      type: local_gate',
    '      cmd: "npm test"',
    '      required: true',
    '    - id: LG1',
    '      type: local_gate',
    '      cmd: "npm run other"',
    '      required: true',
    '    - id: LG2',
    '      type: local_gate',
    '      cmd: "npm test"',
    '      required: true',
    '    - id: LG2',
    '      type: local_gate',
    '      cmd: "npm test"',
    '      required: true',
  ].join('\n')
  const conflicts = contract.gateManifestConflicts(plan)
  assert.deepEqual(conflicts.map((c) => c.id), ['LG1'])
  assert.equal(conflicts[0].signatures.length, 2)
})

test('gateManifestJson：字段顺序固定 + compact + 按 id 排序（§7.2 manifest_spec）', () => {
  const gates = contract.requiredLocalGates(PLAN_FIXTURE)
  const json = contract.gateManifestJson(gates)
  assert.equal(
    json,
    '[{"id":"LG1","type":"local_gate","cmd":"npm run test:installer","expect":"exit 0","required":true},'
    + '{"id":"LG10","type":"local_gate","cmd":"node --test parity.test.js","expect":"exit 0","required":true},'
    + '{"id":"LG2","type":"local_gate","cmd":"npm run test:consistency","expect":">-","required":true}]',
  )
  assert.equal(json.includes('\n'), false)
  assert.equal(json.charCodeAt(0), 0x5b)             // 无 BOM
  // host_requires 是 L2 manifest 的可选扩展维度（plan.md:700），不进 §7.2 field_set
  const extended = contract.gateManifestJson(gates, { fields: contract.MANIFEST_FIELDS_WITH_HOST })
  assert.match(extended, /"id":"LG10".*"host_requires":\["oracle-bin"\]/)
})

test('sha256Hex / isSha：规范化摘要与 SHA 判据', () => {
  assert.equal(contract.sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  assert.equal(contract.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assert.equal(contract.sha256Hex('中文').length, 64)
  assert.equal(contract.isSha('a'.repeat(40)), true)
  assert.equal(contract.isSha('a'.repeat(39)), false)
  assert.equal(contract.isSha(null), false)
})

test('E3 冻结凭据复算：对 docs/sprint-1/plan.md 的 required local_gate 集合算 digest', () => {
  assert.ok(REPO_ROOT, 'repo root not found from test file location')
  const plan = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'sprint-1', 'plan.md'), 'utf8')
  const gates = contract.requiredLocalGates(plan)
  assert.equal(gates.length, 8, 'Sprint 1 的 required local_gate 应为 8 条（LG1..LG6 + LG10/LG11）')

  const manifestCulture = contract.gateManifestJson(gates, { order: 'culture' })
  const manifestCodepoint = contract.gateManifestJson(gates, { order: 'codepoint' })
  const digestCulture = contract.sha256Hex(manifestCulture)
  const digestCodepoint = contract.sha256Hex(manifestCodepoint)

  // 实测（本机 node v22 / ICU）：culture-aware 与 UTF-16 码位序对 `LG1..LG11` **给出同一顺序**
  // → plan.md §7.2 的 order_ambiguity 假设（culture 序 = LG1,LG2,...,LG10）**不成立**，
  //    排序不可能是 R-1 的分歧来源。该断言把这一测量结果钉住（不得只在文档里写）。
  assert.equal(digestCulture, digestCodepoint, '两种排序在本输入上必须同序（order_ambiguity 被实测否证）')
  assert.match(digestCodepoint, /^[0-9a-f]{64}$/)

  // E3 的关系记录：本实现复算值 ≠ 冻结凭据（plan.md §7-MG3 的 mismatch 观测）。
  // 若将来某次复算**相等** → U-1 关闭，本断言与其注释必须同步更新（这是刻意的失败哨兵）。
  assert.notEqual(
    digestCodepoint,
    FROZEN_MANIFEST_SHA256,
    'E3 观测：本实现与 Sprint 1 冻结凭据一致 —— U-1/R-1 关闭，需更新 progress.md 的 R1-digest-recompute 行',
  )
  assert.equal(digestCodepoint, 'b533cf263e04895bc54b776e0542d433a2a222e372ceeb55970810654af08b0d')
})

test('E3：Sprint 2 plan 自身可复算（v2 口径 13 required gate；LG10 移出 required 但 host_requires 保留）', () => {
  assert.ok(REPO_ROOT, 'repo root not found from test file location')
  const plan = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'sprint-2', 'plan.md'), 'utf8')
  const gates = contract.requiredLocalGates(plan)
  const ids = gates.map((g) => g.id)
  // plan.md §16.5（增量重规划，2026-09-22）：required local_gate v2 = 13 条
  // （T1 时的 12 条 = §7 口径，含 LG10；v2 移除 LG10、新增 LG15/LG16 → 13）。本断言随生效口径更新。
  assert.equal(ids.length, 13)
  assert.deepEqual(ids.slice().sort(), ['LG1', 'LG11', 'LG12', 'LG15', 'LG16', 'LG2', 'LG3', 'LG4', 'LG5', 'LG6', 'LG7', 'LG8', 'LG9'])
  // LG10 仍是三态语义的载体：required: false + host_requires: [pwsh]，故不出现在 required 集合里；
  // 用全量 gate 记录断言它未被删除、且 host_requires 维度仍被解析（否则 §16.1 的修订会被静默吞掉）。
  const lg10 = contract.planGateRecords(plan).filter((g) => g.id === 'LG10')
  assert.equal(lg10.length, 1, 'LG10 必须仍存在于 plan 的 verifiable_gates 中（潜伏通道，§16.1）')
  assert.equal(lg10[0].required, false)
  assert.deepEqual(lg10[0].host_requires, ['pwsh'])
  assert.equal(contract.gateManifestConflicts(plan).length, 0)
  assert.match(contract.sha256Hex(contract.gateManifestJson(gates)), /^[0-9a-f]{64}$/)
})

// ═══════════════════════════════════════════════════════════════════════════
// T2：validate-memory-backlog.cjs（L4 canonical lifecycle validator）
//
// 证据形状：**CLI 端到端 spawn**（fixture 根 → exit code + stdout 行），不依赖 oracle 能力。
// 4 组负向控制（缺 status / 重复 id / validated 缺 trial+pass / archived 缺 archive_reason）
// 是「断言非恒真」的机械证明：每组必须同时命中 exit 2 **与**对应错误文案。
// ═══════════════════════════════════════════════════════════════════════════

const VALIDATOR = path.join(__dirname, '..', 'scripts', 'validate-memory-backlog.cjs')

function makeBacklogRoot(content) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-backlog-'))
  const dir = path.join(root, '.kixpower', 'memory', 'repo')
  fs.mkdirSync(dir, { recursive: true })
  if (content !== null) fs.writeFileSync(path.join(dir, 'harness-backlog.md'), content, 'utf8')
  return root
}

function runValidator(root) {
  const result = spawnSync(process.execPath, [VALIDATOR, '--project-root', root], { encoding: 'utf8' })
  return { status: result.status, stdout: result.stdout, lines: result.stdout.split(os.EOL).filter(Boolean) }
}

// 合法 candidate 记录（kind: origin 满足 candidate 的 origin 证据要求；6 个必备字段齐全）
function candidateRecord(id, improvement) {
  return [
    `- id: ${id}`,
    '  type: rule',
    `  problem: p-${id}`,
    `  improvement: ${improvement}`,
    '  source: "some/source.cjs:1"',
    '  evidence:',
    '    - task: "Sprint 2"',
    '      kind: origin',
    '      result: observed',
    '  eval:',
    '    kind: origin',
    '    result: observed',
    '  status: candidate',
    '',
  ].join('\n')
}

test('T2 正向控制：合法 backlog → exit 0 + 三行统计', () => {
  const root = makeBacklogRoot(candidateRecord('HB-1', 'do a thing') + candidateRecord('HB-2', 'do another thing'))
  const result = runValidator(root)
  assert.equal(result.status, 0, result.stdout)
  assert.deepEqual(result.lines, ['memory_backlog: valid', 'record_count: 2', 'legacy_unstructured_records: 0'])
})

test('T2 负向控制①：缺 status → exit 2 + missing or invalid status', () => {
  const root = makeBacklogRoot(['- id: HB-1', '  type: rule', '  problem: p', '  improvement: i', '  source: s', '  evidence: e', '  eval: e', ''].join('\n'))
  const result = runValidator(root)
  assert.equal(result.status, 2)
  assert.ok(result.lines.includes('errors:'), result.stdout)
  assert.ok(result.lines.includes('  - HB-1: missing or invalid status'), result.stdout)
})

test('T2 负向控制②：重复 id → exit 2 + duplicate id，且该记录不再产生后续错误（规则顺序）', () => {
  const root = makeBacklogRoot(candidateRecord('HB-1', 'first') + candidateRecord('HB-1', 'second'))
  const result = runValidator(root)
  assert.equal(result.status, 2)
  const errors = result.lines.filter((l) => l.startsWith('  - '))
  assert.deepEqual(errors, ['  - duplicate id: HB-1'])
})

test('T2 负向控制③：validated 缺 trial+pass → exit 2', () => {
  const root = makeBacklogRoot([
    '- id: HB-1',
    '  type: rule',
    '  problem: p',
    '  improvement: i',
    '  source: s',
    '  evidence: e',
    '  eval:',
    '    kind: origin',
    '    result: observed',
    '  status: validated',
    '',
  ].join('\n'))
  const result = runValidator(root)
  assert.equal(result.status, 2)
  assert.ok(result.lines.includes('  - HB-1: validated record needs a trial/pass evidence'), result.stdout)
})

test('T2 负向控制④：archived 缺 archive_reason → exit 2', () => {
  const root = makeBacklogRoot([
    '- id: HB-1',
    '  type: rule',
    '  problem: p',
    '  improvement: i',
    '  source: s',
    '  evidence: e',
    '  eval: e',
    '  status: archived',
    '',
  ].join('\n'))
  const result = runValidator(root)
  assert.equal(result.status, 2)
  assert.ok(result.lines.includes('  - HB-1: archived record needs archive_reason'), result.stdout)
})

test('T2：candidate 缺 origin 证据 / improvement 语义重复 / legacy 计数 / missing backlog', () => {
  const noOrigin = makeBacklogRoot(candidateRecord('HB-1', 'i').replaceAll('kind: origin', 'kind: trial'))
  const noOriginResult = runValidator(noOrigin)
  assert.equal(noOriginResult.status, 2)
  assert.ok(noOriginResult.lines.includes('  - HB-1: candidate record needs origin evidence'))

  const dupImprovement = makeBacklogRoot(candidateRecord('HB-1', 'same text') + candidateRecord('HB-2', '  same   text  '))
  const dupResult = runValidator(dupImprovement)
  assert.equal(dupResult.status, 2)
  assert.ok(dupResult.lines.includes('  - HB-2: duplicate improvement semantics with HB-1'), dupResult.stdout)

  const legacy = makeBacklogRoot(candidateRecord('HB-1', 'i') + '- [legacy] unstructured line\n- [legacy 2] another\n')
  const legacyResult = runValidator(legacy)
  assert.equal(legacyResult.status, 0)
  assert.deepEqual(legacyResult.lines, ['memory_backlog: valid', 'record_count: 1', 'legacy_unstructured_records: 2'])

  const missing = runValidator(makeBacklogRoot(null))
  assert.equal(missing.status, 2)
  assert.deepEqual(missing.lines, ['memory_backlog: missing'])

  const unresolved = runValidator(path.join(os.tmpdir(), 'kix-backlog-does-not-exist-12345'))
  assert.equal(unresolved.status, 1)
  assert.deepEqual(unresolved.lines, [])
})

test('T2 验收：对真实 repo 运行 → exit 0 且 record_count 等于文件中 `- id:` 记录数（派生，非写死）', () => {
  assert.ok(REPO_ROOT, 'repo root not found from test file location')
  const backlogPath = path.join(REPO_ROOT, '.kixpower', 'memory', 'repo', 'harness-backlog.md')
  const text = fs.readFileSync(backlogPath, 'utf8')
  const derived = [...text.matchAll(/^\s*-\s+id:\s*\S+/gm)].length
  const result = runValidator(REPO_ROOT)
  assert.equal(result.status, 0, result.stdout)
  assert.ok(result.lines.includes('memory_backlog: valid'), result.stdout)
  assert.ok(result.lines.includes(`record_count: ${derived}`), `${result.stdout} (derived=${derived})`)
})

// ═══════════════════════════════════════════════════════════════════════════
// T3：verification-fidelity-check.cjs
// glob 语义是最容易写错的一环（花括号展开 / 占位符顺序 / `-match` 大小写不敏感），
// 先钉固定用例；CLI 的 baseline 分支是唯一完全确定性的端到端路径（不依赖 git 状态）。
// ═══════════════════════════════════════════════════════════════════════════

const fidelity = require('../scripts/verification-fidelity-check.cjs')
const FIDELITY_CLI = path.join(__dirname, '..', 'scripts', 'verification-fidelity-check.cjs')

test('T3 glob：花括号 / 双星 / 单星 / 问号 / 大小写不敏感', () => {
  assert.equal(fidelity.globMatch('docs/readme.md', ['**/*.md']), true)
  assert.equal(fidelity.globMatch('readme.md', ['**/*.md']), true)
  assert.equal(fidelity.globMatch('src/a/b.rs', ['src/**']), true)
  assert.equal(fidelity.globMatch('src/b.rs', ['src/**']), true)
  assert.equal(fidelity.globMatch('other/b.rs', ['src/**']), false)
  assert.equal(fidelity.globMatch('a/x.js', ['{a,b}/**']), true)
  assert.equal(fidelity.globMatch('b/x.js', ['{a,b}/**']), true)
  assert.equal(fidelity.globMatch('c/x.js', ['{a,b}/**']), false)
  assert.equal(fidelity.globMatch('src/a.js', ['src/*.js']), true)
  assert.equal(fidelity.globMatch('src/nested/a.js', ['src/*.js']), false)
  assert.equal(fidelity.globMatch('ab.cjs', ['a?.cjs']), true)
  assert.equal(fidelity.globMatch('a/b.cjs', ['a?.cjs']), false)
  // PowerShell `-match` 默认大小写不敏感 → 与参照实现同口径
  assert.equal(fidelity.globMatch('docs/x.md', ['Docs/**']), true)
  assert.equal(fidelity.globMatch('scripts/sync-dsh-preset.cjs', ['scripts/sync-dsh-preset.cjs']), true)
  assert.equal(fidelity.globToRegex('docs/**'), '^docs/.*$')
})

test('T3 CLI：--prev-sprint 0 → baseline 三行（确定性，无 git 依赖）', () => {
  const result = spawnSync(process.execPath, [FIDELITY_CLI, '--project-root', REPO_ROOT, '--prev-sprint', '0'], { encoding: 'utf8' })
  assert.equal(result.status, 0)
  assert.deepEqual(result.stdout.split(os.EOL).filter(Boolean), [
    '=== Verification Fidelity Check v5.7 ===',
    'verification_fidelity: baseline',
    'baseline_source: no_previous_sprint',
  ])
})

test('T3 CLI：对真实 repo 跑 Sprint 1 → 2，输出累积 YAML 段且 baseline 取自 progress', () => {
  assert.ok(REPO_ROOT, 'repo root not found from test file location')
  const result = spawnSync(process.execPath, [FIDELITY_CLI, '--project-root', REPO_ROOT, '--prev-sprint', '1'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stdout)
  const out = result.stdout
  assert.match(out, /\[Scope Rules\]/)
  assert.match(out, /\[Verification Fidelity\]/)
  assert.match(out, /baseline_source: progress\.sprint_baseline_sha/)
  assert.match(out, /ungated_ratio_pct: [\d.]+/)
  assert.match(out, /liveness_marked_tasks: \d+/)
  // 计数自洽：in_scope + whitelisted + ungated == total（三分类互斥完备）
  const total = Number(/total changed: (\d+)/.exec(out)[1])
  const inScope = Number(/in_scope \(rules\): (\d+)/.exec(out)[1])
  const whitelisted = Number(/whitelisted: (\d+)/.exec(out)[1])
  const ungated = Number(/ungated: (\d+)/.exec(out)[1])
  assert.equal(inScope + whitelisted + ungated, total)
})
