#!/usr/bin/env node
'use strict'
// sync-dsh-preset.cjs — 把 bundle 内的 source preset 同步进 DSH agent-preset 目录（Sprint 2 T4，plan.md §4-T4）。
//
// 参照实现：同目录 sync-dsh-preset.ps1（197 行，保留为 Copilot 路径的兼容层；只读对拍 oracle）。
// 行为契约（**不变**）：只增改、绝不删除目标侧独有文件；源侧是事实源；dry-run 只报告不落盘。
//
// 逐段对应（行号指参照实现）：
//   param/默认值          :13-32  → parseArgs（`--bundle-root/--preset-id/--source-dir/--preset-root/--dry-run/--force/--directory-pointers`）
//   源不存在              :39-41  → fail（Write-Error + $ErrorActionPreference='Stop' → 非零退出）
//   默认目录指针          :46-56  → defaultDirectoryPointers（仅当未显式声明且 src == <bundle>/dsh/preset）
//   目标不存在            :58-66  → 提示后 fail-closed（非交互 stdin 视为 'n'）
//   Get-FileHashSafe      :68-70  → fileHashSafe（读失败返回 ''）
//   Get-SourceEntries     :76-145 → sourceEntries（声明指针展开 + 源树扫描，指针条目在前）
//   同步循环              :154-179 → 分类 added/updated/same（dry-run 不落盘）
//   目标侧独有             :181-186 → targetOnly（**只报告，不删除**）
//   汇总输出              :188-197 → 逐字对齐的 stdout
//
// 与参照实现的差异（记录在案）：
//   1. 错误输出格式：PS 的 `throw`/`Write-Error` 会打印异常记录（含 CategoryInfo/堆栈），本实现只打印一行消息到 stderr。
//      退出码语义一致（非零），消息文本一致（parity 用例只比较成功路径的 stdout + 目标树摘要）。
//   2. `Copy-Item` 对符号链接文件的行为未定义，本实现按「读取链接目标内容」落盘。
//   3. 非交互 stdin 下 PS 的 `Read-Host` 返回空 → 视为 'n'；本实现同样 fail-closed（不覆盖、不卡住）。
//   4. 新增 `--help`/`-h`（打印 usage 后 exit 0）：ps1 无 `-Help` 参数（传了会被 param 绑定拒绝）。
//      仅新增入口、不改既有行为；parity 用例不喂 `--help`（参照侧无对应路径，比较无意义）。

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')

const SEP = path.sep
// Windows 路径大小写不敏感；POSIX 上 Ordinal
const CASE_INSENSITIVE = SEP === '\\'

function comparePaths(a, b) {
  const left = CASE_INSENSITIVE ? String(a).toLowerCase() : String(a)
  const right = CASE_INSENSITIVE ? String(b).toLowerCase() : String(b)
  return left === right
}

function out(line) {
  process.stdout.write(`${line}\n`)
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
}

class SyncError extends Error {}

function parseArgs(argv) {
  const args = {
    bundleRoot: path.resolve(__dirname, '..'),
    presetId: 'kixparadigm',
    sourceDir: path.join('dsh', 'preset'),
    presetRoot: '',
    dryRun: false,
    force: false,
    directoryPointers: null,
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i] ?? ''
    if (arg === '--bundle-root') args.bundleRoot = next()
    else if (arg.startsWith('--bundle-root=')) args.bundleRoot = arg.slice('--bundle-root='.length)
    else if (arg === '--preset-id') args.presetId = next()
    else if (arg.startsWith('--preset-id=')) args.presetId = arg.slice('--preset-id='.length)
    else if (arg === '--source-dir') args.sourceDir = next()
    else if (arg.startsWith('--source-dir=')) args.sourceDir = arg.slice('--source-dir='.length)
    else if (arg === '--preset-root') args.presetRoot = next()
    else if (arg.startsWith('--preset-root=')) args.presetRoot = arg.slice('--preset-root='.length)
    else if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--force') args.force = true
    else if (arg === '--directory-pointers') {
      if (args.directoryPointers === null) args.directoryPointers = []
      args.directoryPointers.push(next())
    } else if (arg.startsWith('--directory-pointers=')) {
      if (args.directoryPointers === null) args.directoryPointers = []
      args.directoryPointers.push(...arg.slice('--directory-pointers='.length).split(',').filter(Boolean))
    } else if (arg === '--help' || arg === '-h') args.help = true
  }
  return args
}

// ── 目录/文件遍历（不跟随符号链接；复制语义见文件头差异 2）──────────────────
function listFilesRecursive(root) {
  const files = []
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
      const childRel = rel ? path.join(rel, entry.name) : entry.name
      if (entry.isDirectory()) {
        stack.push(childRel)
      } else if (entry.isSymbolicLink()) {
        let isDir = false
        try {
          isDir = fs.statSync(path.join(root, childRel)).isDirectory()
        } catch {
          isDir = false
        }
        if (isDir) stack.push(childRel)
        else files.push(childRel)
      } else {
        files.push(childRel)
      }
    }
  }
  return files
}

function fileHashSafe(target) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex').toUpperCase()
  } catch {
    return ''
  }
}

function isInside(candidate, root) {
  const rootPrefix = String(root).replace(/[\\/]+$/, '') + SEP
  return comparePaths(candidate, root) || String(candidate).startsWith(CASE_INSENSITIVE ? rootPrefix.toLowerCase() : rootPrefix)
}

function readPointerTarget(pointerPath, declaredPath) {
  const stat = fs.statSync(pointerPath)
  if (stat.isDirectory()) {
    const link = fs.lstatSync(pointerPath).isSymbolicLink() ? fs.readlinkSync(pointerPath) : null
    return link ? path.resolve(path.dirname(pointerPath), link) : pointerPath
  }
  const linkTarget = fs.readFileSync(pointerPath, 'utf8').trim()
  if (!linkTarget || linkTarget.includes('\n') || linkTarget.includes('\r') || path.isAbsolute(linkTarget)) {
    throw new SyncError(`Configured directory pointer is not a relative one-line path: ${declaredPath}`)
  }
  return path.resolve(path.dirname(pointerPath), linkTarget)
}

// ── Get-SourceEntries（参照实现 :76-145）─────────────────────────────────
function sourceEntries(sourceRoot, bundleRoot, pointerPaths) {
  const entries = []
  const pointerRoots = []

  for (const declaredPath of pointerPaths) {
    if (!declaredPath || path.isAbsolute(declaredPath)) {
      throw new SyncError(`Directory pointer paths must be non-empty and bundle-relative: ${declaredPath}`)
    }
    const pointerPath = path.resolve(bundleRoot, declaredPath)
    if (!isInside(pointerPath, bundleRoot)) throw new SyncError(`Directory pointer escapes bundle root: ${declaredPath}`)
    if (!isInside(pointerPath, sourceRoot)) throw new SyncError(`Directory pointer is outside the selected source: ${declaredPath}`)
    if (!fs.existsSync(pointerPath)) throw new SyncError(`Directory pointer does not exist: ${declaredPath}`)

    const target = readPointerTarget(pointerPath, declaredPath)
    if (!isInside(target, bundleRoot) || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
      throw new SyncError(`Configured directory pointer target is outside the bundle or not a directory: ${declaredPath}`)
    }

    const relative = pointerPath.slice(sourceRoot.length).replace(/^[\\/]+/, '')
    for (const linkedRelative of listFilesRecursive(target)) {
      entries.push({
        file: path.join(target, linkedRelative),
        relative: path.join(relative, linkedRelative),
      })
    }
    pointerRoots.push(pointerPath)
  }

  for (const relative of listFilesRecursive(sourceRoot)) {
    const full = path.join(sourceRoot, relative)
    const pointerEntry = pointerRoots.some((pointerRoot) => isInside(full, pointerRoot))
    if (pointerEntry) continue
    entries.push({ file: full, relative: full.slice(sourceRoot.length).replace(/^[\\/]+/, '') })
  }
  return entries
}

function defaultDirectoryPointers(bundleRoot, sourceRoot) {
  const defaultPointerSource = path.resolve(bundleRoot, 'dsh', 'preset')
  if (!comparePaths(path.resolve(sourceRoot), defaultPointerSource)) return []
  return [path.join('dsh', 'preset', 'skills')]
}

function main(argv) {
  const args = parseArgs(argv)
  if (args.help) {
    out('usage: sync-dsh-preset.cjs [--bundle-root <dir>] [--preset-id <id>] [--source-dir <dir>]')
    out('                           [--preset-root <dir>] [--dry-run] [--force] [--directory-pointers <p[,p]>]')
    return 0
  }

  try {
    let presetRoot = args.presetRoot
    if (!presetRoot) {
      const dshHome = process.env.DSH_HOME || path.join(process.env.USERPROFILE || os.homedir(), '.dsh')
      presetRoot = path.join(dshHome, '.agent-presets', args.presetId)
    }

    // 只用词法规范化（不做符号链接解析），与 PS 的 Get-Item.FullName 同口径
    const bundle = path.resolve(args.bundleRoot)
    const sourceRoot = path.join(bundle, args.sourceDir)
    if (!fs.existsSync(sourceRoot)) throw new SyncError(`Preset source does not exist: ${sourceRoot}`)
    const src = path.resolve(sourceRoot)

    const pointerPaths = args.directoryPointers === null
      ? defaultDirectoryPointers(bundle, src)
      : args.directoryPointers

    if (!fs.existsSync(presetRoot)) {
      out(`[sync] Target does not exist and will be created: ${presetRoot}`)
      if (!args.dryRun && !args.force) {
        // 非交互 stdin（无 TTY）时 Read-Host 返回空 → 'n' → fail-closed
        if (!process.stdin.isTTY) throw new SyncError('Create the target? (y/N) → n (non-interactive)')
        const answer = readAnswer('Create the target? (y/N)')
        if (answer !== 'y' && answer !== 'Y') {
          process.exitCode = 1
          return 1
        }
      }
    } else {
      presetRoot = path.resolve(presetRoot)
    }

    const entries = sourceEntries(src, bundle, pointerPaths)
    const sourceRelatives = new Set()
    const added = []
    const updated = []
    const same = []
    const targetOnly = []

    for (const entry of entries) {
      const relative = entry.relative
      sourceRelatives.add(relative)
      const destination = path.join(presetRoot, relative)
      if (!fs.existsSync(destination)) {
        added.push(relative)
        if (!args.dryRun) {
          fs.mkdirSync(path.dirname(destination), { recursive: true })
          fs.copyFileSync(entry.file, destination)
        }
      } else if (fileHashSafe(entry.file) !== fileHashSafe(destination)) {
        updated.push(relative)
        if (!args.dryRun) {
          if (args.force) {
            fs.copyFileSync(entry.file, destination)
          } else if (process.stdin.isTTY && ['y', 'Y'].includes(readAnswer(`Overwrite ${relative} ? (y/N)`))) {
            fs.copyFileSync(entry.file, destination)
          } else {
            out(`  Skipped: ${relative}`)
          }
        }
      } else {
        same.push(relative)
      }
    }

    if (fs.existsSync(presetRoot)) {
      for (const relative of listFilesRecursive(presetRoot)) {
        if (!sourceRelatives.has(relative)) targetOnly.push(relative)
      }
    }

    const mode = args.dryRun ? 'dry-run' : 'sync'
    out('')
    out(`[sync] ${mode} complete: added ${added.length} / updated ${updated.length} / unchanged ${same.length} / target-only ${targetOnly.length}`)
    if (added.length) out(`  Added: ${added.join(', ')}`)
    if (updated.length) out(`  Updated: ${updated.join(', ')}`)
    if (targetOnly.length) out(`  Target-only (not deleted): ${targetOnly.join(', ')}`)
    if (!args.dryRun && (added.length || updated.length)) {
      out('')
      out('[sync] Restart DSH and open a new session to load the synchronized preset.')
    }
    return 0
  } catch (error) {
    if (error instanceof SyncError) {
      fail(error.message)
      return 1
    }
    throw error
  }
}

function readAnswer(question) {
  out(question)
  try {
    const buffer = Buffer.alloc(1024)
    const read = fs.readSync(0, buffer, 0, buffer.length, null)
    return buffer.slice(0, read).toString('utf8').trim()
  } catch {
    return ''
  }
}

module.exports = {
  SyncError,
  parseArgs,
  listFilesRecursive,
  fileHashSafe,
  sourceEntries,
  defaultDirectoryPointers,
  main,
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2))
}
