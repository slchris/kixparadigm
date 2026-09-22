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
const path = require('node:path')

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

test('E3：Sprint 2 plan 自身可复算（12 required gate，LG10 带 host_requires）', () => {
  assert.ok(REPO_ROOT, 'repo root not found from test file location')
  const plan = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'sprint-2', 'plan.md'), 'utf8')
  const gates = contract.requiredLocalGates(plan)
  const ids = gates.map((g) => g.id)
  assert.equal(ids.length, 12)
  assert.deepEqual(ids.slice().sort(), ['LG1', 'LG10', 'LG11', 'LG12', 'LG2', 'LG3', 'LG4', 'LG5', 'LG6', 'LG7', 'LG8', 'LG9'])
  assert.deepEqual(gates.filter((g) => g.host_requires.length).map((g) => [g.id, g.host_requires]), [['LG10', ['pwsh']]])
  assert.equal(contract.gateManifestConflicts(plan).length, 0)
  assert.match(contract.sha256Hex(contract.gateManifestJson(gates)), /^[0-9a-f]{64}$/)
})
