#!/usr/bin/env node
'use strict'
// validate-memory-backlog.cjs — L4 canonical Memory lifecycle validator（Sprint 2 T2，plan.md §4-T2）。
//
// 参照实现：同目录 validate-memory-backlog.ps1（只读；差分对拍 oracle）。
// 语义等价边界（plan.md §1.1 三笔代价 + §7.2 的逐字硬要求）：
//   - 记录切分：`^\s*-\s+id:\s*(\S+)` 起，至下一条同形行或 `^##\s+` 为止；记录体按 LF 连接
//   - 规则顺序：duplicate id → improvement 语义去重 → status → 必备字段 → 状态专属条件
//   - duplicate id 命中后 **continue**：同一条记录不再产生后续错误（顺序敏感，勿重排）
//   - 输出三行恒定（version 行 + record_count + legacy_unstructured_records），有错再追加 errors 段
//   - 退出码：成功 0 / 校验失败 2 / 契约 helper 缺失 2 / backlog 缺失 2 / 根路径不存在 1
// 已知微差（不影响 fixture，记录在案）：PS 的 `\w` 是 Unicode 词字符，JS 的 `\w` 为 ASCII —— 仅在
// 非 ASCII 字段名出现时可能分歧；本 validator 的字段名表为 ASCII 常量。
//
// 产品侧零外部进程依赖（MG1）：只用 node:* 内置模块，无 oracle 探针、无子进程。

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const EXIT_OK = 0
const EXIT_INVALID = 2
const REQUIRED_FIELDS = ['type', 'problem', 'improvement', 'source', 'evidence', 'eval']

// 契约 helper 缺失时按参照实现的口径失败（而不是抛 Node 的 MODULE_NOT_FOUND）
let contract = null
try {
  contract = require('./kixpower-contract.cjs')
} catch {
  contract = null
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\#\s]/g, '\\$&')
}

// PowerShell Write-Output 的行尾口径：宿主平台换行
function writeLines(lines) {
  process.stdout.write(lines.map((line) => line + os.EOL).join(''))
}

function parseArgs(argv) {
  const args = { projectRoot: null, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--project-root') args.projectRoot = argv[i + 1] ?? null
    else if (arg.startsWith('--project-root=')) args.projectRoot = arg.slice('--project-root='.length)
    else if (arg === '--help' || arg === '-h') args.help = true
  }
  return args
}

// 记录切分：与参照实现的 `$lines[$start..($end-1)] -join "`n"` 等价
function splitRecords(lines) {
  const records = []
  for (let i = 0; i < lines.length; i++) {
    const header = /^\s*-\s+id:\s*(\S+)/.exec(lines[i])
    if (!header) continue
    const start = i
    let end = lines.length
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\s*-\s+id:\s*\S+/.test(lines[j]) || /^##\s+/.test(lines[j])) {
        end = j
        break
      }
    }
    records.push({ id: header[1], text: lines.slice(start, end).join('\n') })
    i = end - 1
  }
  return records
}

function countLegacyUnstructured(text) {
  return [...String(text).matchAll(/^\s*-\s+\[[^\]]+\]/gm)].length
}

// improvement 语义去重的规范化：`\s+` → 单空格、去首尾、去两侧引号（与 ps1 逐字对齐）
function normalizeImprovement(value) {
  return String(value)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^"+/, '').replace(/"+$/, '')
    .replace(/^'+/, '').replace(/'+$/, '')
}

function validateRecords(records, sha256) {
  const errors = []
  const seen = new Set()
  const improvementHashes = new Map()
  for (const record of records) {
    const id = record.id
    if (seen.has(id)) {
      errors.push(`duplicate id: ${id}`)
      continue
    }
    seen.add(id)
    const body = record.text

    const improvement = /^\s*improvement:\s*([\s\S]*?)(?=^\s*[A-Za-z_][\w-]*:|(?![\s\S]))/m.exec(body)
    if (improvement) {
      const value = normalizeImprovement(improvement[1])
      if (value) {
        const hash = sha256(value)
        if (improvementHashes.has(hash)) {
          errors.push(`${id}: duplicate improvement semantics with ${improvementHashes.get(hash)}`)
        } else {
          improvementHashes.set(hash, id)
        }
      }
    }

    const status = /^\s*status:\s*(candidate|validated|archived)\s*$/m.exec(body)
    if (!status) {
      errors.push(`${id}: missing or invalid status`)
      continue
    }
    const statusValue = status[1]
    for (const field of REQUIRED_FIELDS) {
      if (!new RegExp(`^\\s*${escapeRegex(field)}:\\s*`, 'm').test(body)) errors.push(`${id}: missing ${field}`)
    }
    if (statusValue === 'archived' && !/^\s*archive_reason:\s*(rejected|superseded|stale)\s*$/m.test(body)) {
      errors.push(`${id}: archived record needs archive_reason`)
    }
    if (statusValue === 'validated' && (!/kind:\s*trial/m.test(body) || !/result:\s*pass/m.test(body))) {
      errors.push(`${id}: validated record needs a trial/pass evidence`)
    }
    if (statusValue === 'candidate' && !/kind:\s*origin/m.test(body)) {
      errors.push(`${id}: candidate record needs origin evidence`)
    }
  }
  return errors
}

function main(argv) {
  const args = parseArgs(argv)
  if (args.help) {
    process.stdout.write('usage: validate-memory-backlog.cjs --project-root <dir>' + os.EOL)
    return EXIT_OK
  }
  if (!args.projectRoot) {
    process.stderr.write('validate-memory-backlog.cjs: --project-root is required' + os.EOL)
    return EXIT_INVALID
  }
  if (!contract) {
    writeLines(['memory_backlog: missing contract helper'])
    return EXIT_INVALID
  }

  const root = path.resolve(args.projectRoot)
  if (!fs.existsSync(root)) {
    process.stderr.write(`validate-memory-backlog.cjs: cannot resolve ${args.projectRoot}` + os.EOL)
    return 1
  }
  const backlog = path.join(root, '.kixpower', 'memory', 'repo', 'harness-backlog.md')
  if (!fs.existsSync(backlog)) {
    writeLines(['memory_backlog: missing'])
    return EXIT_INVALID
  }

  const text = fs.readFileSync(backlog, 'utf8')
  const records = splitRecords(text.split(/\r?\n/))
  const errors = validateRecords(records, contract.sha256Hex)

  writeLines([
    'memory_backlog: valid',
    `record_count: ${records.length}`,
    `legacy_unstructured_records: ${countLegacyUnstructured(text)}`,
  ])
  if (errors.length > 0) {
    writeLines(['errors:', ...errors.map((error) => `  - ${error}`)])
    return EXIT_INVALID
  }
  return EXIT_OK
}

module.exports = {
  EXIT_OK,
  EXIT_INVALID,
  REQUIRED_FIELDS,
  parseArgs,
  splitRecords,
  countLegacyUnstructured,
  normalizeImprovement,
  validateRecords,
  main,
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2))
}
