#!/usr/bin/env node
'use strict'
// verification-fidelity-check.cjs — Verification Fidelity Check v5.7（Sprint 2 T3，plan.md §4-T3）。
//
// 参照实现：同目录 verification-fidelity-check.ps1（320 行，只读；差分对拍 oracle）。
// 逐段对应（行号指参照实现）：
//   Convert-GlobToRegex :27-54 → globToRegex（花括号展开 → 占位符 → 转义 `.` → 还原）
//   Test-GlobMatch      :56-63 → globMatch（PowerShell 的 `-match` 默认**大小写不敏感**，故用 'i'）
//   Get-ModulePrefixes  :65-122 → modulePrefixes（扫仓库实际布局；语言无关；不跟随符号链接）
//   baseline 解析       :124-156 → resolveBaseline（progress.sprint_baseline_sha → plan.baseline_commit → done.baseline_commit）
//   changed files       :158-168 → collectChangedFiles（git diff/diff --cached/status + baseline 或 --since）
//   scope 组装          :175-234 → 读 target_rules（block + flow）与 legacy target_files
//   判定与输出          :236-320 → in_scope / whitelisted / ungated / ratio + `fidelity_v5:` YAML 段
//
// 与参照实现的已知差异（记录在案，均不影响 parity fixture 与当前仓库）：
//   1. `Sort-Object` / `Sort-Object -Unique` 是 **culture-aware 且大小写不敏感**；本实现用
//      Intl.Collator(sensitivity:'accent') 近似（ICU collation，与 .NET 5+ 同引擎），
//      并对唯一化使用大小写折叠键。
//   2. `[math]::Round(x, 1)` 为银行家舍入，本实现用 Math.round（半值方向不同，仅 0.05 边界）。
//   3. PowerShell `\w`/`Get-ChildItem -Recurse` 的符号链接语义按「列出但不递归」实现（见 walkEntries）。
// 产品侧零外部进程依赖（MG1）：只 spawn `git`（本工具的核心输入就是 git 历史，非宿主能力依赖）。

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

let contract = null
try {
  contract = require('./kixpower-contract.cjs')
} catch {
  contract = null
}

// Rust/前端起源的旧布局前缀已废弃（v5.0 反过拟合）：改为扫描实际目录结构
const EXCLUDED_SEGMENTS = /(^|\/)(node_modules|vendor|\.git|target|build|dist|\.next)(\/|$)/
const CHANGED_FILE_EXCLUDES = /^(docs\/|\.github\/|README|CHANGELOG|LICENSE)/i

function writeLines(lines) {
  process.stdout.write(lines.map((line) => line + os.EOL).join(''))
}

function parseArgs(argv) {
  const args = { projectRoot: null, prevSprint: 0, since: null, rules: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--project-root') args.projectRoot = argv[++i] ?? null
    else if (arg.startsWith('--project-root=')) args.projectRoot = arg.slice('--project-root='.length)
    else if (arg === '--prev-sprint') args.prevSprint = Number(argv[++i] ?? 0)
    else if (arg.startsWith('--prev-sprint=')) args.prevSprint = Number(arg.slice('--prev-sprint='.length))
    else if (arg === '--since') args.since = argv[++i] ?? null
    else if (arg.startsWith('--since=')) args.since = arg.slice('--since='.length)
    else if (arg === '--rules') args.rules = true
    else if (arg === '--help' || arg === '-h') args.help = true
  }
  return args
}

// ── glob（参照实现 :27-63）────────────────────────────────────────────────
function globToRegex(glob) {
  const STARSTAR_SLASH = '<<SSS>>'
  const STARSTAR = '<<SS>>'
  const STAR = '<<S>>'
  const QMARK = '<<Q>>'
  let regex = String(glob)
  while (/\{([^}]+)\}/.test(regex)) {
    const matched = /\{([^}]+)\}/.exec(regex)
    const alternatives = matched[1].split(',').map((alt) => escapeRegexLiteral(alt.trim())).join('|')
    regex = regex.split(matched[0]).join(`(${alternatives})`)
  }
  regex = regex.split('**/').join(STARSTAR_SLASH)
  regex = regex.split('**').join(STARSTAR)
  regex = regex.split('*').join(STAR)
  regex = regex.split('?').join(QMARK)
  regex = regex.replace(/\./g, '\\.')
  regex = regex.split(STARSTAR_SLASH).join('(.*/)?')
  regex = regex.split(STARSTAR).join('.*')
  regex = regex.split(STAR).join('[^/]*')
  regex = regex.split(QMARK).join('[^/]')
  return `^${regex}$`
}

function escapeRegexLiteral(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function globMatch(target, globs) {
  for (const glob of globs) {
    try {
      if (new RegExp(globToRegex(glob), 'i').test(target)) return true
    } catch { /* 与参照实现的 try/catch 同口径：非法 glob 跳过 */ }
  }
  return false
}

// ── 目录/文件遍历（不跟随符号链接；排除构建与依赖目录）──────────────────────
function walkEntries(root, { dirsOnly = false } = {}) {
  const found = []
  const stack = ['']
  while (stack.length > 0) {
    const rel = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(rel ? path.join(root, rel) : root, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name
      if (EXCLUDED_SEGMENTS.test(childRel)) continue
      let isDir = entry.isDirectory()
      if (entry.isSymbolicLink()) {
        // Get-ChildItem 会把「指向目录的链接」列为 Directory，但默认不递归进去
        try {
          isDir = fs.statSync(path.join(root, childRel)).isDirectory()
        } catch {
          isDir = false
        }
        if (isDir) found.push({ type: 'dir', rel: childRel })
        else if (!dirsOnly) found.push({ type: 'file', rel: childRel })
        continue
      }
      if (isDir) {
        found.push({ type: 'dir', rel: childRel })
        stack.push(childRel)
      } else if (!dirsOnly) {
        found.push({ type: 'file', rel: childRel })
      }
    }
  }
  return found
}

// ── Get-ModulePrefixes（参照实现 :65-122）─────────────────────────────────
function modulePrefixes(moduleName, root, unresolved) {
  const prefixes = []
  const normalizedModule = String(moduleName).replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  const moduleParts = normalizedModule.split('/')
  const moduleLeaf = moduleParts[moduleParts.length - 1]
  const moduleParent = moduleParts.length > 1 ? moduleParts.slice(0, -1).join('/') : ''
  const lower = (value) => String(value).toLowerCase()

  for (const entry of walkEntries(root, { dirsOnly: true })) {
    const rel = entry.rel
    const name = rel.split('/').pop()
    // PowerShell `-eq` 对字符串默认大小写不敏感（.NET OrdinalIgnoreCase 仅出现在 EndsWith 处）
    if (
      lower(name) === lower(normalizedModule)
      || lower(rel) === lower(normalizedModule)
      || lower(rel).endsWith(`/${lower(normalizedModule)}`)
    ) {
      prefixes.push(`${rel}/**`)
      prefixes.push(rel)
    }
  }
  for (const entry of walkEntries(root)) {
    if (entry.type !== 'file') continue
    const rel = entry.rel
    const withoutExtension = rel.replace(/\.[^/.]+$/, '')
    if (!withoutExtension) continue
    const slash = withoutExtension.lastIndexOf('/')
    const directory = slash > 0 ? withoutExtension.slice(0, slash) : ''
    const fileLeaf = withoutExtension.slice(slash + 1)
    const parentMatches = !moduleParent
      || lower(directory) === lower(moduleParent)
      || lower(directory).endsWith(`/${lower(moduleParent)}`)
    const leafMatches = lower(fileLeaf) === lower(moduleLeaf)
      || lower(fileLeaf).startsWith(`${lower(moduleLeaf)}_`)
      || lower(fileLeaf).startsWith(`${lower(moduleLeaf)}-`)
    let tokenMatches = true
    for (const token of normalizedModule.split(/[/_-]/).filter(Boolean)) {
      if (!lower(rel).includes(lower(token))) {
        tokenMatches = false
        break
      }
    }
    if (
      (parentMatches && leafMatches)
      || lower(rel) === lower(normalizedModule)
      || lower(withoutExtension) === lower(normalizedModule)
      || lower(rel).endsWith(`/${lower(normalizedModule)}`)
      || lower(withoutExtension).endsWith(`/${lower(normalizedModule)}`)
      || (tokenMatches && moduleParts.length > 1)
    ) {
      prefixes.push(rel)
    }
  }
  if (prefixes.length === 0) unresolved.push(moduleName)
  return prefixes
}

// ── baseline / since（参照实现 :124-156）──────────────────────────────────
function readFrontmatterSha(planOrProgressContent, key) {
  if (!planOrProgressContent) return null
  const candidate = contract.yamlScalar(contract.frontmatter(planOrProgressContent), key)
  return contract.isSha(candidate) ? candidate : null
}

// ── changed files（参照实现 :158-168）────────────────────────────────────
function git(root, gitArgs) {
  const result = spawnSync('git', ['-c', 'core.quotepath=false', '-C', root, ...gitArgs], { encoding: 'utf8' })
  return String(result.stdout ?? '')
}

function toLines(text) {
  return String(text).split('\n').filter((line) => line.length > 0)
}

function collectChangedFiles({ root, baselineSha, sinceDate }) {
  const collected = []
  if (baselineSha) {
    collected.push(...toLines(git(root, ['diff', '--name-only', baselineSha, 'HEAD'])))
    collected.push(...toLines(git(root, ['diff', '--name-only'])))
    collected.push(...toLines(git(root, ['diff', '--name-only', '--cached'])))
    for (const line of toLines(git(root, ['status', '--porcelain']))) {
      if (line.length >= 4) collected.push(line.slice(3).replace(/^"+|"+$/g, ''))
    }
  } else {
    collected.push(...toLines(git(root, ['log', `--since=${sinceDate}`, '--name-only', '--format='])))
  }
  const filtered = collected.filter((file) => file && !CHANGED_FILE_EXCLUDES.test(file))
  return sortUnique(filtered)
}

// Sort-Object / Sort-Object -Unique 的近似（culture-aware、大小写不敏感）
const COLLATOR = (() => {
  try {
    return new Intl.Collator('en-US', { sensitivity: 'accent' })
  } catch {
    return null
  }
})()

function sortUnique(values) {
  const sorted = values.slice().sort((a, b) => (COLLATOR ? COLLATOR.compare(a, b) : a < b ? -1 : a > b ? 1 : 0))
  const seen = new Set()
  const out = []
  for (const value of sorted) {
    const key = String(value).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

// ── plan 侧 scope 组装（参照实现 :175-217）───────────────────────────────
function collectScope(planContent) {
  const allGlobs = []
  const allModules = []
  const mechanicalAnchors = []
  const legacyTargetFiles = []
  if (!planContent) return { allGlobs, allModules, mechanicalAnchors, legacyTargetFiles }

  for (const ruleBlock of contract.indentedBlocks(planContent, 'target_rules')) {
    allGlobs.push(...contract.yamlList(ruleBlock, 'globs'))
    allModules.push(...contract.yamlList(ruleBlock, 'modules'))
    mechanicalAnchors.push(...contract.yamlList(ruleBlock, 'of'))
    allGlobs.push(...contract.inlineYamlList(ruleBlock, 'globs'))
    allModules.push(...contract.inlineYamlList(ruleBlock, 'modules'))
    mechanicalAnchors.push(...contract.inlineYamlList(ruleBlock, 'of'))
  }
  const inlineRuleBodies = []
  for (const match of planContent.matchAll(/target_rules:[ \t]*\{([^}\r\n]*(?:\{[^}\r\n]*\}[^}\r\n]*)*)\}/g)) {
    inlineRuleBodies.push(match[1])
  }
  for (const match of planContent.matchAll(/target_rules:[ \t]*\{((?:(?!\r?\n[ \t]*\}).)*?)\r?\n[ \t]*\}/gs)) {
    inlineRuleBodies.push(match[1])
  }
  for (const body of inlineRuleBodies) {
    allGlobs.push(...contract.inlineYamlList(body, 'globs'))
    allModules.push(...contract.inlineYamlList(body, 'modules'))
    mechanicalAnchors.push(...contract.inlineYamlList(body, 'of'))
  }

  for (const match of planContent.matchAll(/target_files:[ \t]*\n((?:[ \t]*-[ \t]*[^\n]+\n?)+)/g)) {
    for (const line of match[1].split('\n')) {
      const item = /^\s*-\s*(.+)/.exec(line)
      if (item) legacyTargetFiles.push(item[1].trim().replace(/"/g, ''))
    }
  }
  for (const match of planContent.matchAll(/target_files:[ \t]*\[([^\]]+)\]/g)) {
    for (const raw of match[1].split(',')) {
      const cleaned = raw.trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '').trim()
      if (cleaned) legacyTargetFiles.push(cleaned)
    }
  }
  return { allGlobs, allModules, mechanicalAnchors, legacyTargetFiles }
}

const WHITELIST_GLOBS = [
  'tests/**', '**/*_test.{rs,go,py}', '**/*.spec.{ts,tsx,js}', '**/*.test.{ts,tsx,js}',
  'docs/**', '**/{README,CHANGELOG,LICENSE}*', '**/*.lock',
  '{target,node_modules,dist,build}/**', '.github/**', '.vscode/**',
  'benches/**',
  '**/*.md',
  '**/package-lock.json', '**/pnpm-lock.yaml', '**/Cargo.lock', '**/go.sum',
]

function round1(value) {
  return Math.round(value * 10) / 10
}

function main(argv) {
  const args = parseArgs(argv)
  if (args.help) {
    process.stdout.write('usage: verification-fidelity-check.cjs --project-root <dir> [--prev-sprint N] [--since YYYY-MM-DD] [--rules]' + os.EOL)
    return 0
  }
  if (!args.projectRoot) {
    process.stderr.write('verification-fidelity-check.cjs: --project-root is required' + os.EOL)
    return 2
  }
  if (!contract) {
    writeLines(['verification_fidelity: missing contract helper'])
    return 2
  }

  const prevSprint = Number(args.prevSprint)
  if (!(prevSprint > 0)) {
    writeLines(['=== Verification Fidelity Check v5.7 ===', 'verification_fidelity: baseline', 'baseline_source: no_previous_sprint'])
    return 0
  }

  const root = path.resolve(args.projectRoot)
  const planFile = path.join(root, `docs/sprint-${prevSprint}/plan.md`)
  const progressFile = path.join(root, `docs/sprint-${prevSprint}/progress.md`)
  const planContent = fs.existsSync(planFile) ? fs.readFileSync(planFile, 'utf8') : ''
  const progressContent = fs.existsSync(progressFile) ? fs.readFileSync(progressFile, 'utf8') : ''

  // baseline：progress.sprint_baseline_sha → plan.baseline_commit → done.baseline_commit
  let baselineSha = null
  let baselineSource = 'none'
  const progressSha = readFrontmatterSha(progressContent, 'sprint_baseline_sha')
  if (progressSha) {
    baselineSha = progressSha
    baselineSource = 'progress.sprint_baseline_sha'
  }
  if (!baselineSha) {
    const planSha = readFrontmatterSha(planContent, 'baseline_commit')
    if (planSha) {
      baselineSha = planSha
      baselineSource = 'plan.baseline_commit'
    }
  }
  if (!baselineSha) {
    const doneFile = path.join(root, `docs/sprint-${prevSprint}/done.md`)
    if (fs.existsSync(doneFile)) {
      const doneSha = readFrontmatterSha(fs.readFileSync(doneFile, 'utf8'), 'baseline_commit')
      if (doneSha) {
        baselineSha = doneSha
        baselineSource = 'done.baseline_commit'
      }
    }
  }

  let sinceDate = args.since
  if (!sinceDate) {
    const match = /last_updated:\s*(\d{4}-\d{2}-\d{2})/i.exec(progressContent)
    if (match) sinceDate = match[1]
  }
  if (!sinceDate) {
    const fallback = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    sinceDate = fallback.toISOString().slice(0, 10)
  }

  writeLines([
    '=== Verification Fidelity Check v5.7 ===',
    `Sprint: ${prevSprint} | Since: ${sinceDate} | Rules: ${args.rules ? 'True' : 'False'}`,
    `Baseline: ${baselineSha} (${baselineSource})`,
    '',
  ])

  const changedFiles = collectChangedFiles({ root, baselineSha, sinceDate })
  if (changedFiles.length === 0) {
    writeLines(['PASS no_source_changes'])
    return 0
  }

  const { allGlobs, allModules, mechanicalAnchors, legacyTargetFiles } = collectScope(planContent)
  const unresolvedModules = []
  const moduleGlobs = []
  for (const moduleName of allModules) moduleGlobs.push(...modulePrefixes(moduleName, root, unresolvedModules))
  const scopeGlobs = sortUnique([...allGlobs, ...moduleGlobs, ...legacyTargetFiles])

  const inScope = []
  const whitelisted = []
  const ungated = []
  for (const file of changedFiles) {
    let covered = false
    if (globMatch(file, scopeGlobs)) covered = true
    if (!covered && globMatch(file, WHITELIST_GLOBS)) {
      whitelisted.push(file)
      covered = true
    }
    if (covered) inScope.push(file)
    else ungated.push(file)
  }

  const ratio = changedFiles.length > 0 ? round1((ungated.length / changedFiles.length) * 100) : 0
  const unresolvedSorted = sortUnique(unresolvedModules)

  const lines = [
    '[Scope Rules]',
    `  globs: ${allGlobs.length}`,
    `  modules: ${allModules.length} -> ${moduleGlobs.length} expanded`,
    `  unresolved_modules: ${unresolvedSorted.length}`,
  ]
  for (const moduleName of unresolvedSorted) lines.push(`    - ${moduleName}`)
  lines.push(`  mechanical_links: ${mechanicalAnchors.length} -> unresolved_offline: ${mechanicalAnchors.length}`)
  lines.push(`  legacy target_files: ${legacyTargetFiles.length}`)
  lines.push(`  total scope globs: ${scopeGlobs.length}`)
  lines.push('')
  lines.push('[Verification Fidelity]')
  lines.push(`  total changed: ${changedFiles.length}`)
  lines.push(`  in_scope (rules): ${inScope.length - whitelisted.length}`)
  lines.push(`  whitelisted: ${whitelisted.length}`)
  lines.push(`  ungated: ${ungated.length} (${ratio}%)`)
  if (ungated.length === 0) {
    lines.push('  PASS')
  } else if (ratio <= 20) {
    lines.push('  LOW_RISK')
  } else {
    lines.push('  HIGH_RISK (top 20 ungated):')
    for (const file of ungated.slice(0, 20)) lines.push(`    - ${file}`)
    if (ungated.length > 20) lines.push(`    ... +${ungated.length - 20} more`)
  }

  // 方法2-C：task liveness 标注（dead-path / gated-off）
  let deadPathTasks = 0
  let gatedOffTasks = 0
  let totalLivenessTasks = 0
  if (fs.existsSync(planFile)) {
    for (const match of planContent.matchAll(/liveness:\s*(live|gated-off|dead-path)/g)) {
      totalLivenessTasks += 1
      if (match[1] === 'dead-path') deadPathTasks += 1
      if (match[1] === 'gated-off') gatedOffTasks += 1
    }
  }

  // 方法2-B：与上一 Sprint 的 drift-check.md 比较 ungated_ratio_pct
  let prevRatio = null
  const prevDriftFile = path.join(root, `docs/sprint-${prevSprint}/drift-check.md`)
  if (fs.existsSync(prevDriftFile)) {
    const prevContent = fs.readFileSync(prevDriftFile, 'utf8')
    const match = /ungated_ratio_pct:\s*([\d.]+)/.exec(prevContent)
    if (match) prevRatio = Number(match[1])
  }
  const ratioDelta = prevRatio === null ? null : round1(ratio - prevRatio)

  lines.push('')
  lines.push('[Fidelity v5.7 累积度量]')
  lines.push('fidelity_v5:')
  lines.push(`  sprint: ${prevSprint}`)
  lines.push(`  baseline_sha: ${baselineSha}`)
  lines.push(`  baseline_source: ${baselineSource}`)
  lines.push(`  ungated_ratio_pct: ${ratio}`)
  if (ratioDelta !== null) {
    const trend = ratioDelta < 0 ? 'improving' : ratioDelta > 0 ? 'regressing' : 'stable'
    lines.push(`  ungated_ratio_delta_vs_prev: ${ratioDelta}  # ${trend}`)
  }
  lines.push(`  liveness_marked_tasks: ${totalLivenessTasks}`)
  lines.push(`  dead_path_tasks: ${deadPathTasks}`)
  lines.push(`  gated_off_tasks: ${gatedOffTasks}`)
  if (deadPathTasks > 0 || gatedOffTasks > 0) {
    lines.push('  warning: 检出 dead-path/gated-off task —— 复查是否优化了生产不启用的代码（lessons L2 死代码 / L10 gate 死路径）')
  }
  writeLines(lines)
  return 0
}

module.exports = {
  globToRegex,
  globMatch,
  walkEntries,
  modulePrefixes,
  collectChangedFiles,
  collectScope,
  sortUnique,
  parseArgs,
  WHITELIST_GLOBS,
  main,
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2))
}
