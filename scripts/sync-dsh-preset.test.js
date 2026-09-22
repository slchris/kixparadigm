'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { isInside } = require('./sync-dsh-preset.cjs')

const ROOT = path.resolve(__dirname, '..')
const SCRIPT = path.join(ROOT, 'scripts', 'sync-dsh-preset.cjs')

// Sprint 2 T4：被测件由 `sync-dsh-preset.ps1` 切到 `sync-dsh-preset.cjs`（宿主能力条件从
// `pwsh` 降为 `node`）→ 原先 5 条「无 pwsh ⇒ SKIP」用例中有 3 条可在任何含 node 的宿主上真跑；
// 余 2 条是**平台型**（win32 无 developer-mode 时不建原生 symlink；win32 路径大小写不敏感 →
// 大小写变体夹具在那里不构成拒绝条件），与 pwsh 能力无关，故保留 `SKIP: windows-only` 通道。
// skip 文案仍统一为机器可识别前缀 `SKIP: <category> — <具体原因>`（plan LG1 / MG1）。
const SKIP_WINDOWS_ONLY = 'SKIP: windows-only — '

function runSync(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  })
}

test('sync expands repository directory pointers into materialized targets', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-sync-preset-'))
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }))

  const target = path.join(temp, '.agent-presets', 'kixparadigm')
  fs.mkdirSync(path.join(target, 'skills'), { recursive: true })
  fs.writeFileSync(path.join(target, 'skills', 'existing.txt'), 'existing\n', 'utf8')

  const common = [
    '--preset-root', target,
    '--preset-id', 'kixparadigm',
    '--source-dir', path.join('dsh', 'preset'),
  ]
  const sync = runSync(['--force', ...common])
  assert.equal(sync.status, 0, sync.stderr || sync.stdout)
  assert.equal(fs.existsSync(path.join(target, 'skills', 'skills')), false)
  assert.equal(fs.existsSync(path.join(target, 'skills', 'kixparadigm', 'SKILL.md')), true)
  assert.equal(fs.readFileSync(path.join(target, 'skills', 'existing.txt'), 'utf8'), 'existing\n')

  const dryRun = runSync(['--dry-run', ...common])
  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout)
  assert.match(dryRun.stdout, /added 0 \/ updated 0/)
})

test('sync preserves ordinary files whose content names a directory', (t) => {
  const bundle = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-sync-bundle-'))
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-sync-target-'))
  t.after(() => fs.rmSync(bundle, { recursive: true, force: true }))
  t.after(() => fs.rmSync(target, { recursive: true, force: true }))

  fs.mkdirSync(path.join(bundle, 'src'), { recursive: true })
  fs.mkdirSync(path.join(bundle, 'linked'), { recursive: true })
  fs.writeFileSync(path.join(bundle, 'src', 'ordinary.txt'), '../linked\n', 'utf8')
  fs.writeFileSync(path.join(bundle, 'linked', 'file.txt'), 'linked\n', 'utf8')

  const sync = runSync([
    '--force',
    '--bundle-root', bundle,
    '--source-dir', 'src',
    '--preset-root', target,
  ])
  assert.equal(sync.status, 0, sync.stderr || sync.stdout)
  assert.equal(fs.readFileSync(path.join(target, 'ordinary.txt'), 'utf8'), '../linked\n')
  assert.equal(fs.existsSync(path.join(target, 'ordinary.txt', 'file.txt')), false)
})

test('sync expands an explicitly declared native directory symlink', (t) => {
  if (process.platform === 'win32') {
    t.skip(`${SKIP_WINDOWS_ONLY}native symlink fixture requires no Windows developer-mode privilege`)
    return
  }

  const bundle = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-sync-symlink-'))
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-sync-symlink-target-'))
  t.after(() => fs.rmSync(bundle, { recursive: true, force: true }))
  t.after(() => fs.rmSync(target, { recursive: true, force: true }))

  fs.mkdirSync(path.join(bundle, 'src'), { recursive: true })
  fs.mkdirSync(path.join(bundle, 'linked'), { recursive: true })
  fs.writeFileSync(path.join(bundle, 'linked', 'file.txt'), 'linked\n', 'utf8')
  fs.symlinkSync('../linked', path.join(bundle, 'src', 'alias'), 'dir')

  const sync = runSync([
    '--force',
    '--bundle-root', bundle,
    '--source-dir', 'src',
    '--preset-root', target,
    '--directory-pointers', path.join('src', 'alias'),
  ])
  assert.equal(sync.status, 0, sync.stderr || sync.stdout)
  assert.equal(fs.readFileSync(path.join(target, 'alias', 'file.txt'), 'utf8'), 'linked\n')
})

test('sync rejects a case-variant sibling as outside the bundle on POSIX', (t) => {
  if (process.platform === 'win32') {
    t.skip(`${SKIP_WINDOWS_ONLY}Windows paths are case-insensitive`)
    return
  }

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-sync-case-'))
  const bundle = path.join(temp, 'bundle')
  const sibling = path.join(temp, 'BUNDLE')
  const target = path.join(temp, 'target')
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }))

  fs.mkdirSync(path.join(bundle, 'src'), { recursive: true })
  fs.mkdirSync(sibling, { recursive: true })
  fs.writeFileSync(path.join(bundle, 'src', 'alias'), '../../BUNDLE\n', 'utf8')
  fs.writeFileSync(path.join(sibling, 'file.txt'), 'outside\n', 'utf8')

  const sync = runSync([
    '--force',
    '--bundle-root', bundle,
    '--source-dir', 'src',
    '--preset-root', target,
    '--directory-pointers', path.join('src', 'alias'),
  ])
  assert.notEqual(sync.status, 0)
  assert.match(sync.stderr, /outside the bundle/)
  assert.equal(fs.existsSync(path.join(target, 'alias', 'file.txt')), false)
})

test('sync fails closed for missing or out-of-source declared pointers', (t) => {
  const bundle = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-sync-declared-'))
  const missingTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-sync-missing-target-'))
  const outsideTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-sync-outside-target-'))
  t.after(() => fs.rmSync(bundle, { recursive: true, force: true }))
  t.after(() => fs.rmSync(missingTarget, { recursive: true, force: true }))
  t.after(() => fs.rmSync(outsideTarget, { recursive: true, force: true }))

  fs.mkdirSync(path.join(bundle, 'src'), { recursive: true })
  fs.mkdirSync(path.join(bundle, 'other'), { recursive: true })
  fs.mkdirSync(path.join(bundle, 'linked'), { recursive: true })
  fs.writeFileSync(path.join(bundle, 'src', 'file.txt'), 'source\n', 'utf8')
  fs.writeFileSync(path.join(bundle, 'other', 'alias'), '../linked\n', 'utf8')
  fs.writeFileSync(path.join(bundle, 'linked', 'file.txt'), 'linked\n', 'utf8')

  const missing = runSync([
    '--force',
    '--bundle-root', bundle,
    '--source-dir', 'src',
    '--preset-root', missingTarget,
    '--directory-pointers', path.join('src', 'missing'),
  ])
  assert.notEqual(missing.status, 0)
  assert.match(missing.stderr, /does not exist/)
  assert.equal(fs.existsSync(path.join(missingTarget, 'file.txt')), false)

  const outside = runSync([
    '--force',
    '--bundle-root', bundle,
    '--source-dir', 'src',
    '--preset-root', outsideTarget,
    '--directory-pointers', path.join('other', 'alias'),
  ])
  assert.notEqual(outside.status, 0)
  assert.match(outside.stderr, /outside the selected source/)
  assert.equal(fs.existsSync(path.join(outsideTarget, 'file.txt')), false)
})

// ── Sprint 3 T4：大小写不敏感分支必须**两侧对称**归一化 ────────────────────────
// 背景：CI run 35729103867 的 windows-latest ×2 红 —— `Directory pointer escapes bundle root:
// dsh\preset\skills`。根因是移植版只把 root 前缀转小写（`rootPrefix.toLowerCase()`），candidate
// 原样保留 ⇒ Windows runner 的大写盘符 `D:\...` 永远不匹配小写前缀，合法指针被误判为逃逸。
// 参照实现是对称的（ps1:48/80 定义单点 $comparison，:92/:93/:115/:135 两侧同用）。
//
// 该分支在 POSIX 宿主上走不到（CASE_INSENSITIVE = SEP === '\\'），故 isInside 支持注入大小写模式
// 与分隔符 —— **不新增平台型 skip**（plan LG1 要求 skipped 恒为 0，Windows 侧覆盖由 CI 承担）。
const WINDOWS_PATHS = { caseInsensitive: true, sep: '\\' }
const POSIX_PATHS = { caseInsensitive: false, sep: '/' }
// 与 CI windows runner 同形（大写盘符 + 反斜杠）
const WINDOWS_ROOT = 'D:\\a\\kixparadigm\\kixparadigm'
const WINDOWS_POINTER = 'D:\\a\\kixparadigm\\kixparadigm\\dsh\\preset\\skills'

test('isInside keeps a case-insensitive pointer inside a case-insensitive root (T3 regression)', () => {
  // CI 实际形状：盘符大写、root 与 candidate 同大小写 —— 只转 root 的旧实现此处返回 false
  assert.equal(isInside(WINDOWS_POINTER, WINDOWS_ROOT, WINDOWS_PATHS), true)
  // 仅大小写不同：candidate 小写 / 盘符大小写相反，两个方向都必须为 inside
  assert.equal(isInside(WINDOWS_POINTER.toLowerCase(), WINDOWS_ROOT, WINDOWS_PATHS), true)
  assert.equal(isInside(WINDOWS_POINTER, 'd:\\A\\KIXPARADIGM\\KIXPARADIGM', WINDOWS_PATHS), true)
  // 相等分支（candidate === root）在大小写不敏感模式下同样成立
  assert.equal(isInside(WINDOWS_ROOT, WINDOWS_ROOT, WINDOWS_PATHS), true)
})

test('isInside stays Ordinal in case-sensitive mode (POSIX semantics unchanged)', () => {
  assert.equal(isInside('/tmp/kix/BUNDLE/src', '/tmp/kix/bundle', POSIX_PATHS), false)
  assert.equal(isInside('/tmp/kix/bundle/src', '/tmp/kix/bundle', POSIX_PATHS), true)
  // 默认参数必须仍绑宿主常量：POSIX 宿主 ⇒ Ordinal，win32 宿主 ⇒ OrdinalIgnoreCase
  const hostJoin = (...parts) => parts.join(path.sep)
  assert.equal(
    isInside(hostJoin('/tmp', 'BUNDLE', 'src'), hostJoin('/tmp', 'bundle')),
    process.platform === 'win32',
  )
})

test('isInside rejects genuinely escaping paths in case-insensitive mode (control group)', () => {
  // 控制组：证明上一条断言不是「恒真」—— 同一模式下的真逃逸必须为 false
  assert.equal(isInside('D:\\a\\kixparadigm\\kixparadigm-evil\\skills', WINDOWS_ROOT, WINDOWS_PATHS), false)
  assert.equal(isInside('D:\\a\\other\\skills', WINDOWS_ROOT, WINDOWS_PATHS), false)
  assert.equal(isInside('D:\\a\\kixparadigm', WINDOWS_ROOT, WINDOWS_PATHS), false)
})
