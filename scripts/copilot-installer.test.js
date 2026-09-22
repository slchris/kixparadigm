'use strict'

// copilot-installer.test.js — T7（H-B 接线与失败关闭）的双向证据（plan §16 LG16）。
//
// 覆盖矩阵（缺任一向 ⇒ LG16 unmet）：
//   ① 正向：真装进临时 COPILOT_HOME → exit 0、装完 agent 清单里 0 个未解析 `{{`、
//      已移植 hook 的 launcher（`node`）可解析且指向真实存在的 `.cjs`；
//   ② 负向-残留：fixture 注入 `{{KIX_RESIDUE_PROBE}}` → **必须** exit ≠ 0 且输出含 `KIX-INSTALLER-RESIDUE`；
//   ③ 空作用域不许假绿：作用域 0 个 `.sh` → 输出 `skip: chmod +x (0 .sh files)`，且**不得**出现 `ok` 级
//      chmod 播报（原实现无条件 `ok` = silent failure 的一半）；
//   ④ 负向-node（orchestrator 核验补充 #2）：注入低版本 node / PATH 无 node → **必须** exit ≠ 0 且输出含
//      `KIX-INSTALLER-NO-NODE`（`node` 在方案 B 下是 Copilot 侧 hook 与 trust-chain 的宿主硬前置）。
//   ⑤ 静态对称：两个 installer 必须携带同一组失败关闭标记，且旧占位符层（hook launcher / hook extension
//      token）命中数为 0 —— `install.ps1` 本地无 pwsh，可执行验证只能走 CG5（CI windows），此处只做静态判据。
//   ⑥ 非交互同意门（Sprint 3 T1）：`--yes` 正向 exit 0 且标记不出现（反向控制）／无开关 + stdin 关闭
//      ⇒ **exit 3** + `KIX-INSTALLER-CONFIRM-REQUIRED`（修复前为静默 exit 1 无输出）／管道喂 `y`
//      ⇒ exit 3（契约反转钉死）。TTY 交互路径在无 pty 的 harness 中不可断言 ⇒ 静态判据 + 本地人工证据。
//
// win32：bash 段以平台型 skip 收口（文案机器可识别 `SKIP: windows-only — `），静态段照常运行。
// Sprint 3 T1 起 bash 段**必须**显式传 `--yes`（harness 默认 `input: ''` = stdin 已关闭）。

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const REPO_ROOT = path.resolve(__dirname, '..')
const INSTALL_SH = path.join(REPO_ROOT, 'install.sh')
const INSTALL_PS1 = path.join(REPO_ROOT, 'install.ps1')
const POSIX = process.platform !== 'win32'
const SKIP_WINDOWS_ONLY = 'SKIP: windows-only — '
// bash 用**绝对路径**调用：'PATH 无 node' 支把 PATH 收窄成白名单，届时 `bash` 不在其中
const BASH = ['/bin/bash', '/usr/bin/bash', '/usr/local/bin/bash'].find((f) => fs.existsSync(f)) || 'bash'

// ── 夹具 ──────────────────────────────────────────────────────────────────
// bundle 只物化 agents/ + 两个 installer，其余资产走 symlink（真装时 `cp -R` 会跟随后复制）；
// 这样注入残留只需改一个临时文件，不碰仓库工作树。
function makeTempBundle({ tamperAgent = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-installer-bundle-'))
  for (const name of ['skills', 'prompts', 'instructions', 'memories']) {
    fs.symlinkSync(path.join(REPO_ROOT, name), path.join(root, name), 'dir')
  }
  fs.cpSync(path.join(REPO_ROOT, 'agents'), path.join(root, 'agents'), { recursive: true })
  fs.copyFileSync(INSTALL_SH, path.join(root, 'install.sh'))
  fs.copyFileSync(INSTALL_PS1, path.join(root, 'install.ps1'))
  if (tamperAgent) {
    fs.appendFileSync(path.join(root, 'agents', tamperAgent), '\n<!-- {{KIX_RESIDUE_PROBE}} -->\n', 'utf8')
  }
  return root
}

function makeTarget(root) {
  const home = path.join(root, 'copilot-home')
  fs.mkdirSync(home, { recursive: true })
  fs.mkdirSync(path.join(root, 'vscode-prompts'), { recursive: true })
  fs.mkdirSync(path.join(root, 'vscode-memory'), { recursive: true })
  return home
}

// VS Code 面必须重定向进临时目录：夹具**不得**写用户真实的 ~/Library/... 或 ~/.config/...
function targetEnv(root) {
  return {
    VSCODE_PROMPTS_DIR: path.join(root, 'vscode-prompts'),
    VSCODE_MEMORY_DIR: path.join(root, 'vscode-memory'),
  }
}

function runInstaller(bundle, home, { args = [], env = {}, path: pathOverride = null, input = '' } = {}) {
  const childEnv = { ...process.env, ...targetEnv(path.dirname(home)), ...env }
  if (pathOverride !== null) childEnv.PATH = pathOverride
  return spawnSync(BASH, [path.join(bundle, 'install.sh'), ...args, home], {
    cwd: bundle,
    encoding: 'utf8',
    // 默认 `input: ''` = stdin 已关闭（非 TTY + 立即 EOF）：Sprint 3 T1 起无人值守路径必须显式传
    // `--yes`，否则 consent gate 以 exit 3 失败关闭 —— 旧的 `input: 'y\n'` 已不再被接受（契约反转）。
    input,
    env: childEnv,
  })
}

function listFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) listFiles(p, out)
    else out.push(p)
  }
  return out
}

// PATH 白名单夹具：只提供 install.sh 真正会调用的外部命令（**不含 node**），
// 用于「宿主没有 node」这一支；比删 PATH 更稳（不同机器 node 安装位置不同）。
function makeNodeLessPath() {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-node-less-bin-'))
  const needed = ['sed', 'grep', 'find', 'chmod', 'rm', 'cp', 'mkdir', 'basename', 'dirname', 'uname', 'tr', 'cat']
  const missing = []
  for (const name of needed) {
    const resolved = (process.env.PATH || '').split(path.delimiter)
      .map((dir) => path.join(dir, name))
      .find((candidate) => {
        try {
          fs.accessSync(candidate, fs.constants.X_OK)
          return fs.statSync(candidate).isFile()
        } catch {
          return false
        }
      })
    if (!resolved) { missing.push(name); continue }
    fs.symlinkSync(resolved, path.join(bin, name))
  }
  return { bin, missing }
}

function makeVersionStubBin(version) {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'kix-node-stub-bin-'))
  const stub = path.join(bin, 'node')
  fs.writeFileSync(stub, `#!/bin/sh\necho v${version}\n`, 'utf8')
  fs.chmodSync(stub, 0o755)
  return bin
}

function assertNoOkChmod(stdout) {
  for (const line of String(stdout).split('\n')) {
    if (/chmod/.test(line)) assert.doesNotMatch(line, /\[v\]|^\s*ok\b/, `空作用域仍播报成功：${line}`)
  }
}

// ── ① 正向 ────────────────────────────────────────────────────────────────
test('install.sh 正向：装入临时 COPILOT_HOME → exit 0 且装完 0 个未解析 {{', { skip: POSIX ? false : `${SKIP_WINDOWS_ONLY}bash installer` }, (t) => {
  const bundle = makeTempBundle()
  const home = makeTarget(bundle)
  t.after(() => fs.rmSync(bundle, { recursive: true, force: true }))

  const result = runInstaller(bundle, home, { args: ['--yes'] })
  assert.equal(result.status, 0, result.stderr || result.stdout)

  const residue = listFiles(path.join(home, 'agents'))
    .filter((file) => fs.readFileSync(file, 'utf8').includes('{{'))
  assert.deepEqual(residue, [], `装完仍有未解析占位符：${residue.join(', ')}`)
  assert.equal(fs.existsSync(path.join(home, 'agents', 'kixpower-qa.agent.md')), true)

  // 已移植 hook 的 launcher 可解析，且每条 node 命令指向真实存在的 .cjs
  assert.equal(spawnSync('node', ['--version'], { encoding: 'utf8' }).status, 0, 'node launcher 不可解析')
  const hookDir = path.join(home, 'skills', 'kixpower', 'hooks')
  let commands = 0
  for (const file of listFiles(path.join(home, 'agents'))) {
    const text = fs.readFileSync(file, 'utf8')
    for (const match of text.matchAll(/command: 'node "([^"]+\.cjs)"([^']*)'/g)) {
      commands++
      assert.equal(fs.existsSync(match[1]), true, `hook 入口不存在：${match[1]}`)
      assert.equal(path.dirname(match[1]), hookDir, `hook 入口不在安装目录内：${match[1]}`)
    }
  }
  assert.equal(commands, 10, `已移植 hook 声明数应为 10（blast-radius ×5 + block-dev-authority-edit ×2 + block-source-edit ×2 + block-source-edit-qa ×1），实得 ${commands}`)
})

// ── ② 负向：残留占位符 ────────────────────────────────────────────────────
test('install.sh 负向-residue：注入 {{KIX_RESIDUE_PROBE}} → exit ≠ 0 且含 KIX-INSTALLER-RESIDUE（不落盘）', { skip: POSIX ? false : `${SKIP_WINDOWS_ONLY}bash installer` }, (t) => {
  const bundle = makeTempBundle({ tamperAgent: 'kixpower-qa.agent.md' })
  const home = makeTarget(bundle)
  t.after(() => fs.rmSync(bundle, { recursive: true, force: true }))

  const result = runInstaller(bundle, home, { args: ['--dry-run', '--yes'] })
  assert.notEqual(result.status, 0, `残留占位符未 fail-closed：${result.stdout}`)
  assert.match(result.stdout + result.stderr, /KIX-INSTALLER-RESIDUE/)
  assert.equal(listFiles(path.join(home, 'agents')).length, 0, 'dry-run 不应落盘')
})

// ── ③ 空作用域不许假绿 ────────────────────────────────────────────────────
test('install.sh 空作用域：0 个 .sh → 输出 skip: chmod +x (0 .sh files) 且无 ok 级 chmod 播报', { skip: POSIX ? false : `${SKIP_WINDOWS_ONLY}bash installer` }, (t) => {
  const bundle = makeTempBundle()
  const home = makeTarget(bundle)
  t.after(() => fs.rmSync(bundle, { recursive: true, force: true }))

  const result = runInstaller(bundle, home, { args: ['--yes'] })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /skip: chmod \+x \(0 \.sh files\)/)
  assertNoOkChmod(result.stdout)
})

// ── ④ 负向：宿主 node 缺失 / 版本过低 ─────────────────────────────────────
test('install.sh 负向-node：低版本 node（v18.4.0）→ exit ≠ 0 且含 KIX-INSTALLER-NO-NODE', { skip: POSIX ? false : `${SKIP_WINDOWS_ONLY}bash installer` }, (t) => {
  const bundle = makeTempBundle()
  const home = makeTarget(bundle)
  const stub = makeVersionStubBin('18.4.0')
  t.after(() => { fs.rmSync(bundle, { recursive: true, force: true }); fs.rmSync(stub, { recursive: true, force: true }) })

  const result = runInstaller(bundle, home, { args: ['--dry-run', '--yes'], path: `${stub}${path.delimiter}${process.env.PATH}` })
  assert.notEqual(result.status, 0, `低版本 node 未 fail-closed：${result.stdout}`)
  assert.match(result.stdout + result.stderr, /KIX-INSTALLER-NO-NODE/)
})

test('install.sh 负向-node：PATH 无 node → exit ≠ 0 且含 KIX-INSTALLER-NO-NODE', { skip: POSIX ? false : `${SKIP_WINDOWS_ONLY}bash installer` }, (t) => {
  const bundle = makeTempBundle()
  const home = makeTarget(bundle)
  const { bin, missing } = makeNodeLessPath()
  t.after(() => { fs.rmSync(bundle, { recursive: true, force: true }); fs.rmSync(bin, { recursive: true, force: true }) })
  assert.deepEqual(missing, [], `夹具缺外部命令：${missing.join(', ')}`)

  const result = runInstaller(bundle, home, { args: ['--dry-run', '--yes'], path: bin })
  assert.notEqual(result.status, 0, `无 node 未 fail-closed：${result.stdout}`)
  assert.match(result.stdout + result.stderr, /KIX-INSTALLER-NO-NODE/)
})

// ── ⑥ 非交互同意门（Sprint 3 T1；plan §3.1 契约表 + §6 LG7/MG1）─────────────
// 原缺陷：`set -euo pipefail`（install.sh:29）+ 裸 `read` ⇒ stdin EOF 时 read 返回非零，set -e
// 立即中止，`info "Aborted."; exit 0` 不可达 ⇒ 表现为**静默 exit 1 且无任何输出**。
// 新契约：非 TTY 调用必须显式 `--yes`；否则**不读 stdin**、打印 `KIX-INSTALLER-CONFIRM-REQUIRED`
// 并以 exit 3 失败关闭（管道喂 `y` 亦不再被接受 —— plan P6 的契约反转）。
// TTY 交互路径（`read` + `Aborted.` + exit 0）在无 pty 的 spawn harness 中不可断言 ⇒ 本文件不覆盖
// （本地人工证据：`script -q /dev/null` 下 `y` ⇒ 走完安装、`n`/EOF ⇒ Aborted + exit 0）。
// **不新增平台型 skip**（LG1 要求 `# skipped` 恒为 0）。
const CONFIRM_MARKER = 'KIX-INSTALLER-CONFIRM-REQUIRED'
const CONFIRM_PATTERN = new RegExp(CONFIRM_MARKER)

test('install.sh --yes 无人值守（stdin 关闭）→ exit 0 且输出不含 CONFIRM 标记', { skip: POSIX ? false : `${SKIP_WINDOWS_ONLY}bash installer` }, (t) => {
  const bundle = makeTempBundle()
  const home = makeTarget(bundle)
  t.after(() => fs.rmSync(bundle, { recursive: true, force: true }))

  const result = runInstaller(bundle, home, { args: ['--dry-run', '--yes'], input: '' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  // 反向控制（证明下一条用例的标记判定非恒真）：显式开关给出的正向路径不得出现该标记
  assert.doesNotMatch(result.stdout + result.stderr, CONFIRM_PATTERN)
  assert.equal(listFiles(path.join(home, 'agents')).length, 0, 'dry-run 不应落盘')
})

test('install.sh 无 --yes + stdin 关闭 → exit 3 + KIX-INSTALLER-CONFIRM-REQUIRED（原为静默 exit 1 无输出）', { skip: POSIX ? false : `${SKIP_WINDOWS_ONLY}bash installer` }, (t) => {
  const bundle = makeTempBundle()
  const home = makeTarget(bundle)
  t.after(() => fs.rmSync(bundle, { recursive: true, force: true }))

  const result = runInstaller(bundle, home, { args: ['--dry-run'], input: '' })
  assert.equal(result.status, 3, `非交互且无开关未按 exit 3 失败关闭：${result.stdout}${result.stderr}`)
  const combined = result.stdout + result.stderr
  assert.match(combined, CONFIRM_PATTERN)
  // 「静默」本身是被修掉的缺陷：标记与输出必须同时存在（exit 码 + 机器可识别标记双判据）
  assert.ok(combined.trim().length > 0, '失败关闭路径不得无输出（本缺陷的原始表现）')
  assert.equal(listFiles(path.join(home, 'agents')).length, 0, '未获同意不应落盘')
})

test('install.sh 管道喂 y（非 TTY 且无 --yes）→ exit 3 + 标记（契约反转：旧行为 exit 0）', { skip: POSIX ? false : `${SKIP_WINDOWS_ONLY}bash installer` }, (t) => {
  const bundle = makeTempBundle()
  const home = makeTarget(bundle)
  t.after(() => fs.rmSync(bundle, { recursive: true, force: true }))

  const result = runInstaller(bundle, home, { args: ['--dry-run'], input: 'y\n' })
  assert.equal(result.status, 3, `管道喂 y 未被拒绝（契约反转未生效）：${result.stdout}${result.stderr}`)
  assert.match(result.stdout + result.stderr, CONFIRM_PATTERN)
  assert.equal(listFiles(path.join(home, 'agents')).length, 0, '未获显式同意不应落盘')
})

// ── ⑤ 静态对称（install.ps1 的本地唯一通道）────────────────────────────────
test('两个 installer 静态对称：失败关闭标记齐备 + 旧占位符层 0 命中', () => {
  const sh = fs.readFileSync(INSTALL_SH, 'utf8')
  const ps1 = fs.readFileSync(INSTALL_PS1, 'utf8')
  // Sprint 3 T1/T2 契约表（plan §3.1）的静态判据 = MG1：两侧标记名逐字相同、各有开关解析与非 TTY
  // 判定、该分支退出码同为 3。**只证明声明存在，不证明行为**（ps1 行为只能走 CG5）。
  const contract = [
    ['install.sh', sh, [/--yes/, /-y\|--yes\)/, /\[ ! -t 0 \]/, /if ! read -r -p "Proceed\? \[y\/N\] " confirm; then/]],
    ['install.ps1', ps1, [/\[switch\]\$Yes/, /\[Console\]::IsInputRedirected/, /try \{ \$confirm = Read-Host 'Proceed\? \[y\/N\]' \} catch/]],
  ]
  for (const [name, text, patterns] of contract) {
    assert.match(text, CONFIRM_PATTERN, `${name} 缺 CONFIRM 失败关闭标记`)
    assert.match(text, new RegExp(`${CONFIRM_MARKER}[\\s\\S]{0,400}?exit 3`), `${name} CONFIRM 分支未以 exit 3 收口`)
    for (const pattern of patterns) assert.match(text, pattern, `${name} 缺契约元素 ${pattern}`)
  }
  for (const [name, text] of [['install.sh', sh], ['install.ps1', ps1]]) {
    assert.match(text, /KIX-INSTALLER-NO-NODE/, `${name} 缺 node 失败关闭标记`)
    assert.match(text, /KIX-INSTALLER-RESIDUE/, `${name} 缺残留失败关闭标记`)
    assert.match(text, /skip: /, `${name} 缺空作用域 skip 播报`)
    // 旧占位符层（hook launcher / hook extension）必须 0 命中（MG8 ①）
    const legacy = text.match(/HOOK_LAUNCHER|HOOK_EXT/g) || []
    assert.equal(legacy.length, 0, `${name} 仍含旧占位符 token：${legacy.join(', ')}`)
    // 前置判定必须在 pre-flight 与拷贝后各出现一次，且调用晚于拷贝（不得只在文档里声明）
    const calls = text.match(/Assert-NodeRuntime\s+'[a-z-]+'|require_node_runtime "[a-z-]+"/g) || []
    assert.equal(calls.length, 2, `${name} node 前置判定调用点应恰为 2（pre-flight + post-copy），实得 ${calls.length}`)
    assert.ok(text.indexOf(calls[1]) > text.indexOf('CopilotHome'), `${name} 第二次 node 判定必须在拷贝步骤之后`)
  }
})

test('MG8 ②/③ 静态判据：root agents 的 node 形式声明 == 10，且每个 .cjs 入口存在', () => {
  const hookDir = path.join(REPO_ROOT, 'skills', 'kixpower', 'hooks')
  let declarations = 0
  const referenced = new Set()
  for (const file of fs.readdirSync(path.join(REPO_ROOT, 'agents'))) {
    if (!file.endsWith('.agent.md')) continue
    const text = fs.readFileSync(path.join(REPO_ROOT, 'agents', file), 'utf8')
    for (const match of text.matchAll(/node "\{\{COPILOT_HOME\}\}\/skills\/kixpower\/hooks\/([a-z-]+\.cjs)"/g)) {
      declarations++
      referenced.add(match[1])
    }
  }
  assert.equal(declarations, 10, `已移植 hook 声明数应为 10，实得 ${declarations}`)
  assert.deepEqual([...referenced].sort(), [
    'blast-radius-check.cjs',
    'block-dev-authority-edit.cjs',
    'block-source-edit-qa.cjs',
    'block-source-edit.cjs',
  ])
  for (const name of referenced) {
    assert.equal(fs.existsSync(path.join(hookDir, name)), true, `入口缺失：${name}`)
  }
})
