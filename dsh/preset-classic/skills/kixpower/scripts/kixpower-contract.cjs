#!/usr/bin/env node
'use strict'
// kixpower-contract.cjs — trust-chain 契约 helper 的 Node 实现（Sprint 2 T1）。
//
// 语义参照实现：同目录 kixpower-contract.ps1（只读，禁改；它是差分对拍的 oracle）。
// 本文件**只移植 trust-chain 消费者实际用到的函数**（plan.md §4-T1 步骤 A 的清单）：
//   frontmatter / yamlScalar / yamlList / inlineYamlList / indentedBlocks /
//   planGateRecords / requiredLocalGates / gateManifestConflicts / gateManifestJson /
//   sha256Hex / isSha
// hooks 侧的终端写入检测、git 子命令解析等 helper **不在移植范围**（无 Node 消费者，
// 属 plan.md §2 的 explicit non-goal：不做三块之外的 Node 化）。
//
// 硬约束（plan.md §7-MG1 / §7.4）：本文件是产品代码 —— 运行时零外部进程依赖，
// 不 spawn 任何 shell，不引用宿主能力探针；只用 node:* 内置模块。
//
// 规范化规则（plan.md §7.2 manifest_spec，逐字可复算）：
//   field_set = [id, type, cmd, expect, required]（顺序固定）
//   sort      = by id（见 sortById 的 order 参数：culture | codepoint）
//   serialization = compact JSON（无缩进、无 BOM、无尾随换行）
//   digest    = sha256(utf8(manifest_json)) 小写十六进制

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

// ── 排序（plan.md §7.2 order_ambiguity）────────────────────────────────────
// 参照实现用 `Sort-Object id`（.NET culture-aware 字符串比较）。Node 侧：
//   order='culture'   → Intl.Collator（ICU，与 .NET 5+ 同一 collation 引擎）
//   order='codepoint' → Array#sort 默认（UTF-16 码位序）
// 两者对 `LG1..LG11` 这类「前缀相同 + 十进制后缀」的 id **给出同一顺序**（实测：
// ICU 不做 natural/numeric 排序，`LG10 < LG2` 在两种序下都成立）。该实测结果
// 已用于 R-1 的排查（见 tests/trust-chain.test.js 的 E3 断言）。
const CULTURE_COLLATOR = (() => {
  try {
    return new Intl.Collator('en-US', { sensitivity: 'variant' })
  } catch {
    return null
  }
})()

const MANIFEST_FIELDS = ['id', 'type', 'cmd', 'expect', 'required']
// Sprint 2 起 verifiable_gates 的 required gate 可带 host_requires（§7 LG10）；
// 该字段**不进** plan.md §7.2 的规范化 field_set（那是对既有 ps1 语义的复算），
// 只作为 L2 manifest 的可选扩展维度（plan.md:700）。
const MANIFEST_FIELDS_WITH_HOST = [...MANIFEST_FIELDS, 'host_requires']

function escapeRegex(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\#\s]/g, '\\$&')
}

function unique(values) {
  const out = []
  for (const v of values) if (!out.includes(v)) out.push(v)
  return out
}

// ── YAML 局部解析（与 kixpower-contract.ps1 逐字对齐）──────────────────────

// Get-KixFrontmatter：返回 `---` 之间的 body；无 frontmatter 返回 ''
function frontmatter(text) {
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s|$)/m.exec(String(text ?? ''))
  return match ? match[1] : ''
}

// Get-KixYamlScalar：首个 `key:` 行的值；去除行尾注释与两侧引号；无匹配返回 null
function yamlScalar(text, key) {
  const match = new RegExp('^[ \\t]*' + escapeRegex(key) + ':[ \\t]*([^\\r\\n]*)', 'm').exec(String(text ?? ''))
  if (!match) return null
  return match[1]
    .replace(/\s+#[\s\S]*$/, '')
    .trim()
    .replace(/^"+/, '').replace(/"+$/, '')
    .replace(/^'+/, '').replace(/'+$/, '')
}

// Convert-KixYamlItem：列表项的规范化；空值返回 null
function yamlItem(value) {
  const clean = String(value ?? '')
    .replace(/\s+#[\s\S]*$/, '')
    .trim()
    .replace(/^"+/, '').replace(/"+$/, '')
    .replace(/^'+/, '').replace(/'+$/, '')
    .trim()
  return clean ? clean : null
}

// Get-KixYamlList：`key:` 的 inline `[...]` 与 block `- x` 两种形态，去重保序。
// inline 项内的 `{a,b}` 花括号组按逗号保护（与 ps1 的 __KIX_COMMA__ 等价）。
function yamlList(text, key) {
  const pattern = new RegExp(
    '^[ \\t]*' + escapeRegex(key) + ':[ \\t]*(\\[[^\\r\\n\\]]*\\])?((?:\\r?\\n[ \\t]+-[^\\r\\n]*)*)',
    'm',
  )
  const match = pattern.exec(String(text ?? ''))
  if (!match) return []
  const items = []
  const inline = match[1] || ''
  if (inline) {
    const body = inline.trim().replace(/^\[+/, '').replace(/\]+$/, '')
    const protectedBody = body.replace(/\{[^{}]*\}/g, (group) => group.replace(/,/g, '\u0000KIX_COMMA\u0000'))
    for (const raw of protectedBody.split(',')) {
      const value = yamlItem(raw.replace(/\u0000KIX_COMMA\u0000/g, ','))
      if (value) items.push(value)
    }
  }
  for (const line of String(match[2] || '').split(/\r?\n/)) {
    const item = /^\s*-\s*(.+)$/.exec(line)
    if (!item) continue
    const value = yamlItem(item[1])
    if (value) items.push(value)
  }
  return unique(items)
}

// Get-KixInlineYamlList：全文扫描 `{`/`,`/换行 之后的 `key: [...]`，去重保序
function inlineYamlList(text, key) {
  const pattern = new RegExp('(?:^|[{,\\r\\n])\\s*' + escapeRegex(key) + '\\s*:\\s*\\[([^\\]]*)\\]', 'gi')
  const values = []
  for (const match of String(text ?? '').matchAll(pattern)) {
    const protectedBody = match[1].replace(/\{[^{}]*\}/g, (group) => group.replace(/,/g, '\u0000KIX_COMMA\u0000'))
    for (const raw of protectedBody.split(',')) {
      const value = yamlItem(raw.replace(/\u0000KIX_COMMA\u0000/g, ','))
      if (value) values.push(value)
    }
  }
  return unique(values)
}

// Get-KixIndentedBlocks：抓取 `Header:`（可带 inline 值）之后所有缩进更深或注释行，
// 以 LF 连接成一个 block；同级/更浅的非注释行终止。
function indentedBlocks(text, header) {
  const lines = String(text ?? '').split(/\r?\n/)
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const headerMatch = new RegExp('^([ \\t]*)' + escapeRegex(header) + ':[ \\t]*([^#]*)$').exec(lines[i])
    if (!headerMatch) continue
    const indent = headerMatch[1].length
    const body = []
    const inlineValue = headerMatch[2].trim()
    if (inlineValue) body.push(inlineValue)
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j]
      if (/\S/.test(line)) {
        const lineIndent = line.length - line.trimStart().length
        if (lineIndent <= indent && !/^[ \t]*#/.test(line)) break
      }
      body.push(line)
    }
    blocks.push(body.join('\n'))
  }
  return blocks
}

// ── plan.md gate 记录（trust-chain 的输入面）──────────────────────────────

// Get-KixPlanGateRecords：verifiable_gates 块中每条 `- id:` 记录
function planGateRecords(planText) {
  const records = []
  const gatePattern = /^[ \t]*-\s+id:\s*([^\r\n#]+)([\s\S]*?)(?=^[ \t]*-\s+id:|(?![\s\S]))/gm
  for (const block of indentedBlocks(planText, 'verifiable_gates')) {
    gatePattern.lastIndex = 0
    let gate
    while ((gate = gatePattern.exec(block)) !== null) {
      const id = yamlItem(gate[1])
      if (!id) continue
      const body = gate[2]
      let type = yamlScalar(body, 'type')
      const owner = yamlScalar(body, 'owner')
      const cmd = yamlScalar(body, 'cmd') || yamlScalar(body, 'command')
      const expect = yamlScalar(body, 'expect')
      let required = yamlScalar(body, 'required')
      if (!required) required = 'true'
      if (!type && owner === 'L2') type = 'local_gate'
      if (!type) type = 'legacy'
      records.push({
        id,
        type,
        cmd: cmd || '',
        expect: expect || '',
        required: !/^(?:false|no|0)$/i.test(required),
        owner: owner || '',
        // Sprint 2 扩展维度（非 §7.2 field_set）：block 或 inline 两种写法
        host_requires: unique([...yamlList(body, 'host_requires'), ...inlineYamlList(body, 'host_requires')]),
      })
    }
  }
  return records
}

function sortById(gates, { order = 'culture' } = {}) {
  const list = Array.isArray(gates) ? gates.slice() : []
  const compare = order === 'codepoint' || !CULTURE_COLLATOR
    ? (a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0)
    : (a, b) => CULTURE_COLLATOR.compare(String(a.id), String(b.id))
  return list.sort(compare)
}

// Get-KixRequiredLocalGates：type=local_gate 且 required 的记录，按 id 排序后按 id 去重
function requiredLocalGates(planText) {
  const gates = sortById(planGateRecords(planText).filter((r) => r.type === 'local_gate' && r.required))
  const seen = new Set()
  const out = []
  for (const gate of gates) {
    if (seen.has(gate.id)) continue
    seen.add(gate.id)
    out.push(gate)
  }
  return out
}

// Get-KixGateManifestConflicts：同 id 但 {type|cmd|expect|required} 签名不一致 → 冲突
function gateManifestConflicts(planText) {
  const groups = new Map()
  for (const record of planGateRecords(planText)) {
    if (!groups.has(record.id)) groups.set(record.id, [])
    groups.get(record.id).push(record)
  }
  const conflicts = []
  for (const [id, group] of groups) {
    const signatures = unique(group.map((r) => `${r.type}|${r.cmd}|${r.expect}|${r.required}`)).sort()
    if (signatures.length > 1) conflicts.push({ id, signatures })
  }
  return conflicts
}

// Get-KixGateManifestJson：§7.2 field_set 的 compact JSON。
// 已知与参照实现的唯一形状差异：**单元素** manifest 在 ps1 侧被 ConvertTo-Json
// 退化为对象（PowerShell 数组单元素解包），本实现恒为数组；manifest 实际 ≥2 条，
// 差分 fixture 亦不构造 n=1 用例（plan.md §7.2 escape_ambiguity 同口径：先取证再固化）。
function gateManifestJson(gates, { order = 'culture', fields = MANIFEST_FIELDS } = {}) {
  return JSON.stringify(sortById(gates, { order }).map((gate) => {
    const out = {}
    for (const field of fields) {
      if (field === 'required') out.required = Boolean(gate.required)
      else if (field === 'host_requires') out.host_requires = Array.isArray(gate.host_requires) ? gate.host_requires.slice() : []
      else out[field] = String(gate[field] ?? '')
    }
    return out
  }))
}

// Get-KixSha256：UTF-8 字节的 SHA-256，小写十六进制（PS 侧 sha256(utf8(text)) 等价）
function sha256Hex(text) {
  return crypto.createHash('sha256').update(Buffer.from(String(text ?? ''), 'utf8')).digest('hex')
}

// Test-KixSha：完整 40 位十六进制 SHA
function isSha(value) {
  return Boolean(value) && /^[0-9a-fA-F]{40}$/.test(String(value))
}

// ── 文件读取（消费者共用）────────────────────────────────────────────────

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

function resolveDir(dir) {
  return path.resolve(String(dir ?? '.'))
}

module.exports = {
  MANIFEST_FIELDS,
  MANIFEST_FIELDS_WITH_HOST,
  frontmatter,
  yamlScalar,
  yamlItem,
  yamlList,
  inlineYamlList,
  indentedBlocks,
  planGateRecords,
  requiredLocalGates,
  gateManifestConflicts,
  gateManifestJson,
  sortById,
  sha256Hex,
  isSha,
  readText,
  resolveDir,
}
