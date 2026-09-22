#!/usr/bin/env node
'use strict'
// kix-verdict.cjs — 单一 hook 引擎 core（Sprint 2 T6 / plan.md §13.1 ADR-S2-1）。
//
// 角色：4 个已移植 hook（H-set-A）的**唯一判定实现**；`hooks/*.cjs` 入口只做 stdin → core → 输出。
// canonical 归属：本文件是已移植 hook 的唯一 canonical；对应 `hooks/*.ps1` 为 deprecated 参照实现
// （plan.md §13.4 / T9：保留不删，标记 deprecated）。
//
// 证据锚点（plan.md §16.2 v2 阶梯）：
//   E0 = 既有 JS 测试网（`dsh/preset/plugins/kix-guards.js` 的 1476 行 + `kix-guards.test.js` 159 断言）
//        —— §B 的函数体**逐字移植**自该文件，并由 `tests/hook-engine.test.js` 的「同源函数体断言」机械绑定；
//   E2 = characterization（`tests/hook-engine.test.js` 的固定用例 + 每 hook 负向控制 + mutation probe）；
//   E1 = 差分对拍（与 `.ps1` 逐字节）→ **本地永久 unavailable**（无 pwsh，用户否决安装）→ CG4（CI）。
//   **禁止**把本文件的绿表述为「与原 `.ps1` 等价」（plan.md §16.2 明令禁止第 1 条）。
//
// 已知与 `.ps1` 的行为分歧（如实登记，不静默）：
//   1. commit 计数口径：`.ps1` blast-radius 用 `git reflog --format=%H` 数**全部** reflog 条目；
//      本实现用 kix-guards `countReflogCommits`（%gs 口径：`commits`=逻辑 commit 计预算，
//      `churn`=含 amend 的对象创建计硬上限）。依据 = ADR-S2-1（kix-guards 语义为 E0 锚点）。
//   2. `block-source-edit-qa.ps1:53-54` 调用 `Test-KixGitCommitCommand`/`Test-KixGitWriteCommand`，
//      二者在 `kixpower-contract.ps1` 中**嵌套于其他函数体内**（`:358/:368/:397`），hook 顶层作用域
//      取不到 → 该分支在 `.ps1` 上抛 CommandNotFoundException 后继续（= QA git 写分支失效）。
//      本实现按**意图**生效（QA 的 git 提交/写操作被 deny），并以此差异为 `hook-engine-evidence:`
//      的一条登记项（`.ps1` 侧不改，属 plan.md §2 的「不改 .ps1」边界）。
//   3. `blast-radius-check.ps1` 的嵌套 `args` 解析失败会把 `$input` 置 `$null` 后放行（静默失效）；
//      本实现按 orchestrator 核验要求改为 fail-closed（`KIX-HOOK-UNKNOWN-PAYLOAD`，见 §A 三态）。
//
// 产品侧零 pwsh 运行时引用（MG1）：本文件只用 `node:*` 内置模块，无 pwsh 探针、无 pwsh 字符串。
//
// 真实宿主载荷 schema **未取证**（OQ9）：`DSH-ADAPTATION.md:56`（2026-08-16）为文档级证据，
// 本机无真实 Copilot 会话采样 → 本文件只声明「容忍两套 schema」，**不**声明「已确认线上 schema」。

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { homedir } = os

const { frontmatter, yamlScalar } = require('../../scripts/kixpower-contract.cjs')

// ═══════════════════════════════════════════════════════════════════════════
// §A 载荷归一化：三形态 + 未知形态 fail-closed（plan.md §12.2 / §13.1-A.1）
//
// 三形态（canonical 行为参照 = `blast-radius-check.ps1:99-143` 的 Get-KixNormalizedToolCalls）：
//   形态 1  `toolCalls:[{id,name,args}]`   args 为 JSON 字符串（copilot-agent 1.0.70+）
//   形态 2  `toolName` + `toolArgs`        toolArgs 为 JSON 字符串（官方 camelCase）
//   形态 3  `tool_name` + `tool_input`     旧 VS Code 格式（tool_input 为对象或 JSON 字符串）
//
// 三态判定（**强于** `.ps1` 的 `if (-not $argsObj) { exit 0 }` 静默放行）：
//   ① 可识别载荷 + 无需检查    → allow（无 stdout）
//   ② 可识别载荷 + 命中规则    → deny（stdout 单行 JSON + exit 2）
//   ③ 载荷形态无法识别         → **不得** allow：deny + 机器可识别标记 `KIX-HOOK-UNKNOWN-PAYLOAD`
//      （含 `args` 声明了却是不可解析 JSON：`.ps1` 把 `$input` 置 `$null` 后放行 = 静默失效）
// ═══════════════════════════════════════════════════════════════════════════

const PAYLOAD_MARKER = 'KIX-HOOK-UNKNOWN-PAYLOAD'

// 纯元数据字段：只有这些键时判定为「本载荷没有工具调用」（allow），而不是「形态未知」（deny）。
const META_ONLY_KEYS = new Set([
  'hookeventname',
  'hook_event_name',
  'cwd',
  'workspacefolder',
  'workspace_folder',
  'sessionid',
  'session_id',
  'transcriptpath',
  'transcript_path',
  'timestamp',
])
const TOOL_LIKE_KEY = /tool|call|command|input|args|invocation|payload|name/i

function parseJsonText(text) {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (error) {
    return { ok: false, error }
  }
}

function normalizeArgs(raw) {
  if (raw === undefined || raw === null) return { input: null, argsRaw: null, argsParseFailed: false }
  if (typeof raw === 'string') {
    const parsed = parseJsonText(raw)
    if (parsed.ok) return { input: parsed.value, argsRaw: raw, argsParseFailed: false }
    // 声明了 args 但不是可解析 JSON：ps1 置 $null 后放行；本实现 fail-closed
    return { input: null, argsRaw: raw, argsParseFailed: true }
  }
  return { input: raw, argsRaw: null, argsParseFailed: false }
}

// normalizePayload(rawText) → { status, shape, calls, detail, meta }
// status: empty | invalid-json | unknown | no-tool-call | ok
// meta = { cwd, workspaceFolder }（判定用的工作区上下文，来自载荷本身；缺失时留空由调用方兜底）
function normalizePayload(rawText) {
  const text = String(rawText === undefined || rawText === null ? '' : rawText)
  const emptyMeta = { cwd: '', workspaceFolder: '' }
  if (text.trim() === '') return { status: 'empty', shape: null, calls: [], detail: 'stdin 为空', meta: emptyMeta }

  const parsed = parseJsonText(text)
  if (!parsed.ok) return { status: 'invalid-json', shape: null, calls: [], detail: parsed.error.message, meta: emptyMeta }

  const payload = parsed.value
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const kind = Array.isArray(payload) ? 'array' : payload === null ? 'null' : typeof payload
    return { status: 'unknown', shape: null, calls: [], detail: `顶层 JSON 不是对象（${kind}）`, meta: emptyMeta }
  }

  const meta = {
    cwd: String(payload.cwd === undefined || payload.cwd === null ? '' : payload.cwd),
    workspaceFolder: String(
      (payload.workspaceFolder === undefined || payload.workspaceFolder === null ? '' : payload.workspaceFolder)
      || (payload.workspace_folder === undefined || payload.workspace_folder === null ? '' : payload.workspace_folder)
      || '',
    ),
  }

  // 形态 1：toolCalls 数组
  if (Object.prototype.hasOwnProperty.call(payload, 'toolCalls')) {
    const list = Array.isArray(payload.toolCalls) ? payload.toolCalls : []
    const calls = list.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return { name: '', input: null, argsRaw: null, argsParseFailed: true }
      }
      return { name: String(item.name === undefined || item.name === null ? '' : item.name), ...normalizeArgs(item.args) }
    })
    return {
      status: calls.length > 0 ? 'ok' : 'no-tool-call',
      shape: 'toolCalls',
      calls,
      detail: `toolCalls[${calls.length}]`,
      meta,
    }
  }

  // 形态 2：toolName + toolArgs（camelCase 官方）
  if (Object.prototype.hasOwnProperty.call(payload, 'toolName')) {
    const call = { name: String(payload.toolName === undefined || payload.toolName === null ? '' : payload.toolName), ...normalizeArgs(payload.toolArgs) }
    return { status: 'ok', shape: 'toolName+toolArgs', calls: [call], detail: 'toolName', meta }
  }

  // 形态 3：tool_name + tool_input（旧格式）
  if (Object.prototype.hasOwnProperty.call(payload, 'tool_name')) {
    if (!Object.prototype.hasOwnProperty.call(payload, 'tool_input')) {
      // tool_name 在、tool_input 缺：旧实现的 `if (-not $argsObj) { exit 0 }` 会在此静默放行
      return { status: 'unknown', shape: null, calls: [], detail: 'tool_name 存在但 tool_input 缺失（无法区分「无参数」与「形态漂移」）', meta }
    }
    const call = { name: String(payload.tool_name === undefined || payload.tool_name === null ? '' : payload.tool_name), ...normalizeArgs(payload.tool_input) }
    return { status: 'ok', shape: 'tool_name+tool_input', calls: [call], detail: 'tool_name', meta }
  }

  // 无任何已知工具字段：含工具样字段名 → 形态未知（fail-closed）；只有元数据 → 本载荷无工具调用
  const keys = Object.keys(payload)
  const toolLike = keys.filter((key) => TOOL_LIKE_KEY.test(key) && !META_ONLY_KEYS.has(key.toLowerCase()))
  if (toolLike.length > 0) {
    return { status: 'unknown', shape: null, calls: [], detail: `未识别的工具载荷字段：${toolLike.join(',')}`, meta }
  }
  return { status: 'no-tool-call', shape: null, calls: [], detail: `载荷无可判定的工具调用（keys=${keys.join(',') || '∅'}）`, meta }
}

// ═══════════════════════════════════════════════════════════════════════════
// §B 逐字移植自 `dsh/preset/plugins/kix-guards.js` 的纯函数（E0 同源锚点）
//
// 由 `tests/hook-engine.test.js` 的「同源函数体断言」机械绑定：core 声明的每个函数，
// 其规范化函数体（去注释/空白）必须与 `kix-guards.js` 中**同名函数**逐字相等。
// **禁止**在本区块内改动任何字节（除整体重新抽取）——改动即 LG15 红。
// ═══════════════════════════════════════════════════════════════════════════

// @@KIX_GUARDS_VERBATIM_BEGIN@@
// ── 常量（逐字移植；同源断言覆盖）────────────────────────────────────────
const COMMIT_HARD_CAP = 10          // 9 Ways 防线：绝对硬上限，不可配（失控熔断，v15 起预算线 steer 化后是唯一硬拦截）
const COMMIT_BUDGET_DEFAULT = 3     // 冷启动兜底（δ 未知时的保守值；v15 回退 v14 的无证据提升 6——见头部 v15 死亡证明）
const DB_CLIENT_NAMES = new Set(['psql', 'mysql', 'mariadb', 'sqlite3', 'sqlcmd', 'clickhouse-client', 'duckdb'])
const SQL_PAYLOAD_FLAGS = new Set(['-c', '--command', '-e', '--execute', '-Q', '--query'])
const GIT_GLOBAL_OPTIONS_WITH_VALUE = new Set([
  '-C', '-c', '--config-env', '--exec-path', '--git-dir', '--work-tree',
  '--namespace', '--super-prefix', '--attr-source',
])
const GIT_PUSH_VALUE_FLAGS = new Set([
  '-o', '--push-option', '--repo', '--receive-pack', '--exec', '--recurse-submodules',
])
const CONTROL_PLANE_MODIFY_ANY = new Set([
  'rm', 'del', 'erase', 'rd', 'rmdir', 'remove-item', 'ri',
  'mv', 'move', 'move-item', 'mi', 'ren', 'rename', 'rename-item',
  'touch', 'mkdir', 'md', 'new-item', 'ni', 'chmod', 'chown', 'icacls',
  'attrib', 'set-content', 'sc', 'add-content', 'ac', 'clear-content', 'clc',
  'out-file', 'set-item', 'si', 'tee',
])
const CONTROL_PLANE_DEST_LAST = new Set([
  'cp', 'copy', 'copy-item', 'cpi', 'robocopy', 'install',
  'ln', 'link', 'wget', 'curl', 'iwr', 'invoke-webrequest',
])
const DOWNLOAD_OUTPUT_FLAGS = new Set(['-o', '--output', '--output-document', '-outfile', '--outfile'])

function stripSqlNoise(text) {
  let t = String(text || '')
  t = t.replace(/'(?:''|[^'])*'/g, ' ')
  t = t.replace(/"(?:""|[^"])*"/g, ' ')
  t = t.replace(/\/\*[\s\S]*?\*\//g, ' ')
  t = t.replace(/(?:--|#)[^\r\n]*/g, ' ')
  return t
}

function isDestructiveSql(text) {
  const t = stripSqlNoise(text)
  for (const stmt of t.split(';')) {
    if (/\b(?:drop|truncate|alter)\b/i.test(stmt)) return true
    if ((/\bdelete\b[^;]*?\bfrom\b/i.test(stmt) || /\bupdate\b[^;]*?\bset\b/i.test(stmt)) && !/\bwhere\b/i.test(stmt)) return true
  }
  return false
}

function splitShellSegments(text) {
  const parts = []
  let cur = ''
  let pendingSep = null
  let quote = null
  let escaped = false
  const heredocs = []
  const flush = () => {
    const value = cur.trim()
    if (value) parts.push({ text: value, sepBefore: pendingSep })
    cur = ''
    pendingSep = null
  }
  const s = String(text || '')
  const consumeHeredocBody = (from, tag, stripTabs) => {
    let i = from
    while (i <= s.length) {
      const lineStart = i
      while (i < s.length && s[i] !== '\n' && s[i] !== '\r') i++
      let line = s.slice(lineStart, i)
      if (stripTabs) line = line.replace(/^\t+/, '')
      if (line === tag) {
        if (s[i] === '\r' && s[i + 1] === '\n') return i + 2
        if (s[i] === '\n' || s[i] === '\r') return i + 1
        return i
      }
      if (i >= s.length) return i
      if (s[i] === '\r' && s[i + 1] === '\n') i += 2
      else i += 1
    }
    return i
  }
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (quote) {
      cur += ch
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"') { quote = ch; cur += ch; continue }
    if (ch === '#' && (cur === '' || i === 0 || /\s/.test(s[i - 1]))) {
      while (i < s.length && s[i] !== '\n' && s[i] !== '\r') i++
      i--
      continue
    }
    if (ch === '\\' && i + 1 < s.length) { cur += ch + s[i + 1]; i++; continue }
    if (ch === '<' && s[i + 1] === '<' && s[i + 2] !== '<') {
      cur += '<<'
      i += 2
      let stripTabs = false
      if (s[i] === '-') { stripTabs = true; cur += '-'; i++ }
      while (s[i] === ' ' || s[i] === '\t') { cur += s[i]; i++ }
      let tag = ''
      if (s[i] === "'" || s[i] === '"') {
        const q = s[i]
        cur += q
        i++
        while (i < s.length && s[i] !== q) { tag += s[i]; cur += s[i]; i++ }
        if (s[i] === q) { cur += q; i++ }
      } else {
        while (i < s.length && !/\s/.test(s[i]) && s[i] !== ';' && s[i] !== '&' && s[i] !== '|') {
          tag += s[i]
          cur += s[i]
          i++
        }
      }
      if (tag) heredocs.push({ tag, stripTabs })
      i--
      continue
    }
    if (ch === ';' || ch === '\n' || ch === '\r') {
      flush()
      pendingSep = ';'
      if ((ch === '\n' || ch === '\r') && heredocs.length) {
        if (ch === '\r' && s[i + 1] === '\n') i++
        let pos = i + 1
        while (heredocs.length) {
          const h = heredocs.shift()
          pos = consumeHeredocBody(pos, h.tag, h.stripTabs)
        }
        i = pos - 1
      }
      continue
    }
    if (ch === '&' && s[i + 1] === '&') { flush(); pendingSep = '&&'; i++; continue }
    if (ch === '|' && s[i + 1] === '|') { flush(); pendingSep = '||'; i++; continue }
    if (ch === '|') { flush(); pendingSep = '|'; continue }
    cur += ch
  }
  flush()
  return parts
}

function shellTokens(segment) {
  const tokens = []
  let cur = ''
  let quote = null
  let escaped = false
  const s = String(segment || '')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (quote) {
      if (escaped) { cur += ch; escaped = false }
      else if (ch === '\\') escaped = true
      else if (ch === quote) quote = null
      else cur += ch
      continue
    }
    if (ch === "'" || ch === '"') { quote = ch; continue }
    if (ch === '#' && (i === 0 || /\s/.test(s[i - 1]))) break
    if (ch === '\\' && i + 1 < s.length) {
      const next = s[i + 1]
      if (/[\s'"\\|&;<>#*?(){}[\]$`!]/.test(next)) { cur += next; i++; continue }
    }
    if (/\s/.test(ch)) { if (cur) { tokens.push(cur); cur = '' } continue }
    cur += ch
  }
  if (cur) tokens.push(cur)
  return tokens
}

function commandBasename(token) {
  const value = String(token || '')
  return value.replace(/^["']|["']$/g, '').replace(/\.exe$/i, '').split(/[\\/]/).pop().toLowerCase()
}

function leadingCommand(tokens) {
  const list = Array.isArray(tokens) ? tokens : []
  let i = 0
  while (i < list.length) {
    const t = list[i]
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) { i++; continue }
    if (/^(?:sudo|doas|env|command)$/i.test(t)) { i++; continue }
    break
  }
  while (i < list.length && list[i].startsWith('-')) {
    i += (i + 1 < list.length && !list[i + 1].startsWith('-')) ? 2 : 1
  }
  if (i >= list.length) return undefined
  return { name: commandBasename(list[i]), args: list.slice(i + 1) }
}

function extractSqlPayload(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i]
    const eq = raw.match(/^(--[a-z-]+)=(.*)$/i)
    if (eq && SQL_PAYLOAD_FLAGS.has(eq[1].toLowerCase())) return eq[2]
    if (SQL_PAYLOAD_FLAGS.has(raw.toLowerCase())) {
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) return tokens[i + 1]
    }
  }
  return undefined
}

function isTerminalDestructiveSql(text) {
  const parts = splitShellSegments(text)
  for (let i = 0; i < parts.length; i++) {
    const tokens = shellTokens(parts[i].text)
    const cmd = leadingCommand(tokens)
    if (!cmd || !DB_CLIENT_NAMES.has(cmd.name)) continue
    const payload = extractSqlPayload(tokens.slice(1))
    if (payload !== undefined) {
      if (isDestructiveSql(payload)) return true
      continue
    }
    if (parts[i].sepBefore === '|' && i > 0) {
      const prev = leadingCommand(shellTokens(parts[i - 1].text))
      if (prev && /^(?:echo|printf|cat|head|tail)$/.test(prev.name) && isDestructiveSql(parts[i - 1].text)) return true
    }
  }
  return false
}

function gitInvocations(text) {
  const out = []
  for (const part of splitShellSegments(text)) {
    const command = leadingCommand(shellTokens(part.text))
    if (!command || command.name !== 'git') continue
    const tokens = command.args
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t === '--') continue
      if (GIT_GLOBAL_OPTIONS_WITH_VALUE.has(t)) {
        if (i + 1 < tokens.length) i++
        continue
      }
      if (/^-(?:C|c).+/.test(t) || t.startsWith('--')) continue
      if (t.startsWith('-')) continue
      out.push({ sub: t, args: tokens.slice(i + 1) })
      break
    }
  }
  return out
}

function gitSubcommands(text) {
  return new Set(gitInvocations(text).map((inv) => inv.sub))
}

function hasGitSubcommand(text, sub) {
  return gitSubcommands(text).has(sub)
}

function forEachGitPushArg(args, visit) {
  const list = Array.isArray(args) ? args : []
  for (let i = 0; i < list.length; i++) {
    const t = String(list[i])
    const eq = t.indexOf('=')
    const base = eq === -1 ? t : t.slice(0, eq)
    if (GIT_PUSH_VALUE_FLAGS.has(t)) {
      i++
      continue
    }
    if (eq !== -1 && (GIT_PUSH_VALUE_FLAGS.has(base) || base === '--force-with-lease' || base === '--signed')) continue
    if (visit(t) === true) return true
  }
  return false
}

function isForcePush(text) {
  for (const inv of gitInvocations(text)) {
    if (String(inv.sub).toLowerCase() !== 'push') continue
    if (forEachGitPushArg(inv.args, (t) => {
      if (t === '--force' || t === '--force=true' || t === '--force=1') return true
      if (t === '-f' || (/^-[a-zA-Z0-9]+$/.test(t) && t.includes('f') && t !== '--follow-tags')) return true
      if (t === '--mirror') return true
      if (t.startsWith('+') && t.length > 1 && !/\s/.test(t)) return true
      return false
    })) return true
  }
  return false
}

function pushTargetsProtectedRef(text) {
  for (const inv of gitInvocations(text)) {
    if (String(inv.sub).toLowerCase() !== 'push') continue
    if (forEachGitPushArg(inv.args, (t) => {
      if (t === '--all') return true
      if (/\s/.test(t)) return false
      if (/^refs\/heads\/(?:main|master)$/.test(t)) return true
      if (/(?:^|:)(?:refs\/heads\/)?(?:main|master)$/.test(t) && !t.startsWith('-')) return true
      return false
    })) return true
  }
  return false
}

function isLocalDestructiveAsk(text) {
  return (
    /\breset\s+--hard\b/.test(text) ||
    /\bclean\b[^;&|]*-[a-z]*f/.test(text) ||
    /\bbranch\s+-D\b/.test(text) ||
    /\bstash\s+(?:drop|clear)\b/.test(text) ||
    /\bcheckout\s+--/.test(text) ||
    /\brestore\b/.test(text)
  )
}

function isSourceRepoPresetPath(low) {
  // v15.1：豁免覆盖全部 preset 变体目录（preset / preset-classic /
  // preset-classic-en / preset-null）。出生证明：2026-08-20 会话实弹——
  // 编辑 dsh/preset-null/agent.cordis.yml（源仓库事实源）被裸 agent.cordis.yml
  // 兜底分支误 remind；旧正则 /preset(?:\/|$)/ 匹配不到 preset-xxx 变体名。
  // 安装面检查先于本豁免执行，~/.dsh 与 .agent-presets 路径不受影响。
  return /(?:^|\/)(?:dsh|en)\/preset[-\w]*(?:\/|$)/.test(low)
}

function isInstallControlPlanePath(low) {
  // v18.1（2026-09-08，QA 取证 P2）：DSH 宿主进程 environ 可无 HOME/USERPROFILE
  // （实测 /proc/<pid>/environ 仅 6 个变量）→ 旧实现 home=''，/root/.dsh/... 等
  // 绝对路径漏判控制平面。补 os.homedir() 兜底（HOME 缺失时走 passwd），
  // 不放宽既有边界：仍只做「home 下的 .dsh」与安装面/显式 ~ 写法判定。
  const home = (process.env.USERPROFILE || process.env.HOME || homedir() || '').toLowerCase().replace(/\\/g, '/')
  return (
    low.includes('.agent-presets') ||
    (home !== '' && low.includes(home + '/.dsh')) ||
    low.includes('~/.dsh') ||
    low.includes('$home/.dsh') ||
    low.includes('$env:userprofile/.dsh') ||
    low.includes('%userprofile%/.dsh')
  )
}

function targetsControlPlane(text) {
  const low = String(text || '').toLowerCase().replace(/\\/g, '/')
  // 安装面先于源路径豁免：挡住 dsh/preset/../../.dsh/.agent-presets 这类绕过。
  if (isInstallControlPlanePath(low)) return true
  if (isSourceRepoPresetPath(low)) return false
  return low.includes('agent.cordis.yml')
}

function downloadOutputTarget(args) {
  for (let i = 0; i < args.length; i++) {
    const raw = args[i]
    if (DOWNLOAD_OUTPUT_FLAGS.has(raw.toLowerCase())) {
      if (i + 1 < args.length) return args[i + 1]
      continue
    }
    const eq = raw.match(/^(--output|--output-document|--outfile)=(.*)$/i)
    if (eq) return eq[2]
  }
  return undefined
}

function lastNonFlagArg(args) {
  for (let i = args.length - 1; i >= 0; i--) {
    if (!args[i].startsWith('-')) return args[i]
  }
  return undefined
}

function redirectTargetsControlPlane(text) {
  const re = /(?:[12]?>>?|&>)\s*(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/g
  let m
  while ((m = re.exec(text))) {
    const target = m[1] || m[2] || m[3]
    if (target && targetsControlPlane(target)) return true
  }
  return false
}

function isTerminalControlPlaneWrite(text) {
  const t = String(text || '')
  if (redirectTargetsControlPlane(t)) return true
  const parts = splitShellSegments(t)
  for (const part of parts) {
    const tokens = shellTokens(part.text)
    const cmd = leadingCommand(tokens)
    if (!cmd) continue
    if (CONTROL_PLANE_MODIFY_ANY.has(cmd.name)) {
      if (cmd.args.some((a) => targetsControlPlane(a))) return true
      continue
    }
    if (cmd.name === 'wget' || cmd.name === 'curl' || cmd.name === 'iwr' || cmd.name === 'invoke-webrequest') {
      const out = downloadOutputTarget(cmd.args)
      if (out && targetsControlPlane(out)) return true
      continue
    }
    if (CONTROL_PLANE_DEST_LAST.has(cmd.name)) {
      const dest = lastNonFlagArg(cmd.args)
      if (dest && targetsControlPlane(dest)) return true
      if ((cmd.name === 'mv' || cmd.name === 'move' || cmd.name === 'move-item' || cmd.name === 'mi') &&
        cmd.args.some((a) => targetsControlPlane(a))) return true
      continue
    }
    if (cmd.name === 'git' && /^clone$/i.test(cmd.args[0] || '')) {
      const dest = lastNonFlagArg(cmd.args.slice(1))
      if (dest && targetsControlPlane(dest)) return true
    }
  }
  return false
}

function repoRootFromText(text) {
  for (const part of splitShellSegments(text)) {
    const command = leadingCommand(shellTokens(part.text))
    if (!command) continue
    if (command.name === 'git') {
      const tokens = command.args
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i]
        if (t === '--') break
        if (t === '-C' && i + 1 < tokens.length) return tokens[i + 1]
        if (t.startsWith('-C') && t.length > 2) return t.slice(2)
        if (GIT_GLOBAL_OPTIONS_WITH_VALUE.has(t)) {
          if (i + 1 < tokens.length) i++
          continue
        }
        if (t.startsWith('-')) continue
        break
      }
      continue
    }
    if (command.name === 'cd' && command.args[0]) return command.args[0]
  }
  return undefined
}

function countReflogCommits(reflogText) {
  const lines = String(reflogText || '').split('\n').map((l) => l.trim()).filter(Boolean)
  let commits = 0
  let churn = 0
  for (const s of lines) {
    if (s.startsWith('commit')) churn++
    if (s.startsWith('commit:') || s.startsWith('commit (initial):')) commits++
  }
  return { commits, churn }
}

function resolveCommitBudget({ progressMd, planMd }) {
  let budget = COMMIT_BUDGET_DEFAULT
  let fromProgress = false
  if (progressMd) {
    const m = /^---[\s\S]*?blast_radius:[\s\S]*?commit_budget:\s*(\d+)/.exec(progressMd)
    if (m) { budget = Number(m[1]); fromProgress = true }
  }
  if (!fromProgress && planMd) {
    const m = /task_sizing:[\s\S]*?derived_commit_budget:\s*(\d+)/.exec(planMd)
    if (m) {
      budget = Number(m[1])
    } else {
      const m2 = /blast_radius:[\s\S]*?max_commits:\s*(\d+)/.exec(planMd)
      if (m2) budget = Number(m2[1])
    }
  }
  return budget
}

function commitBudgetSource({ progressMd, planMd }) {
  if (progressMd && /^---[\s\S]*?blast_radius:[\s\S]*?commit_budget:\s*(\d+)/.test(progressMd)) return 'progress.md blast_radius.commit_budget'
  if (planMd && /task_sizing:[\s\S]*?derived_commit_budget:\s*(\d+)/.test(planMd)) return 'plan.md task_sizing.derived_commit_budget'
  if (planMd && /blast_radius:[\s\S]*?max_commits:\s*(\d+)/.test(planMd)) return 'plan.md blast_radius.max_commits'
  return '冷启动默认 ' + COMMIT_BUDGET_DEFAULT
}
// @@KIX_GUARDS_VERBATIM_END@@

// 同源移植声明（plan.md §13.1 步骤 A.2 的 (a) 绑定断言输入面）。
// GUARDS_PORTED = `kix-guards.js` 的 `__internals` **同名导出**：函数体必须规范化后逐字相等。
// GUARDS_PORTED_LOCAL_HELPERS = 逐字移植但 `__internals` 未导出的模块内 helper（无可比对对象，
//   由 `tests/hook-engine.test.js` 直接从 `kix-guards.js` 源文本按名抽取比对）。
const GUARDS_PORTED = {
  stripSqlNoise,
  isDestructiveSql,
  isTerminalDestructiveSql,
  splitShellSegments,
  shellTokens,
  leadingCommand,
  extractSqlPayload,
  isTerminalControlPlaneWrite,
  redirectTargetsControlPlane,
  isForcePush,
  isLocalDestructiveAsk,
  pushTargetsProtectedRef,
  gitInvocations,
  gitSubcommands,
  hasGitSubcommand,
  targetsControlPlane,
  repoRootFromText,
  resolveCommitBudget,
  commitBudgetSource,
  countReflogCommits,
}

// 逐字移植但 `kix-guards.js` 的 `__internals` **未导出** → 无同名可比对对象：
//   模块内 helper（commandBasename/forEachGitPushArg/downloadOutputTarget/lastNonFlagArg）
//   + plan §13.1 点名但未导出的 isInstallControlPlanePath / isSourceRepoPresetPath。
// 二者的「逐字」由测试的**源文本按名抽取**通道保证（等价强度，通道不同）。
const GUARDS_PORTED_LOCAL_HELPERS = {
  commandBasename,
  forEachGitPushArg,
  downloadOutputTarget,
  lastNonFlagArg,
  isInstallControlPlanePath,
  isSourceRepoPresetPath,
}

const GUARDS_PORTED_CONSTANTS = {
  COMMIT_HARD_CAP,
  COMMIT_BUDGET_DEFAULT,
  DB_CLIENT_NAMES,
  SQL_PAYLOAD_FLAGS,
  GIT_GLOBAL_OPTIONS_WITH_VALUE,
  GIT_PUSH_VALUE_FLAGS,
  CONTROL_PLANE_MODIFY_ANY,
  CONTROL_PLANE_DEST_LAST,
  DOWNLOAD_OUTPUT_FLAGS,
}

// ═══════════════════════════════════════════════════════════════════════════
// §C hooks 侧 helper：从 `kixpower-contract.ps1` 的 hooks 侧函数移植
//
// T1 显式**不**移植这批（plan.md §4-T1 步骤 A 清单只含 trust-chain 消费者所需函数）；
// hook 入口需要它们，故在 T6 移植。canonical 行为参照即该 `.ps1`（deprecated 参照实现）。
// ═══════════════════════════════════════════════════════════════════════════

// Get-KixCanonicalToolName（blast-radius-check.ps1:60-95）：运行时名 / Claude 名 / 旧扩展名归一。
const CANONICAL_TOOL_MAP = new Map(Object.entries({
  powershell: 'powershell', bash: 'bash', edit: 'edit', create: 'create',
  view: 'view', grep: 'grep', glob: 'glob', ask_user: 'ask_user',
  task: 'task', web_fetch: 'web_fetch', web_search: 'web_search',
  update_todo: 'update_todo', read_powershell: 'read_powershell',
  stop_powershell: 'stop_powershell', sql: 'sql', skill: 'skill',
  read: 'view', write: 'create', webfetch: 'web_fetch',
  websearch: 'web_search', askuserquestion: 'ask_user',
  todowrite: 'update_todo', agent: 'task',
  run_in_terminal: 'run_in_terminal', create_and_run_task: 'create_and_run_task',
  replace_string_in_file: 'replace_string_in_file',
  insert_edit_into_file: 'insert_edit_into_file',
  edit_notebook_file: 'edit_notebook_file',
  apply_patch: 'apply_patch',
  create_file: 'create_file', create_directory: 'create_directory',
  delete_file: 'delete_file', vscode_renamesymbol: 'vscode_renameSymbol',
  runsubagent: 'runSubagent', explore_subagent: 'explore_subagent',
  read_file: 'read_file',
  grep_search: 'grep_search', semantic_search: 'semantic_search',
  file_search: 'file_search', list_dir: 'list_dir',
  manage_todo_list: 'manage_todo_list', vscode_askquestions: 'vscode_askQuestions',
  run_notebook_cell: 'run_notebook_cell', get_terminal_output: 'get_terminal_output',
}))

function toolLeaf(toolName) {
  const parts = String(toolName === undefined || toolName === null ? '' : toolName).trim().split('.')
  return parts[parts.length - 1]
}

function canonicalToolName(toolName) {
  const name = String(toolName === undefined || toolName === null ? '' : toolName).trim()
  if (name === '') return ''
  const leaf = toolLeaf(name)
  if (CANONICAL_TOOL_MAP.has(leaf.toLowerCase())) return CANONICAL_TOOL_MAP.get(leaf.toLowerCase())
  if (CANONICAL_TOOL_MAP.has(name.toLowerCase())) return CANONICAL_TOOL_MAP.get(name.toLowerCase())
  return leaf.toLowerCase()
}

// Test-KixSuspiciousExecutionTool（kixpower-contract.ps1:250-272）
const SUSPICIOUS_KNOWN_SAFE = new Set([
  'run_in_terminal', 'create_and_run_task', 'runSubagent', 'explore_subagent',
  'read', 'search', 'read_file', 'grep_search', 'semantic_search', 'file_search',
  'list_dir', 'view_image', 'get_errors', 'manage_todo_list', 'vscode_askQuestions',
  'run_notebook_cell',
  'powershell', 'bash', 'view', 'edit', 'create', 'grep', 'glob', 'ask_user',
  'task', 'web_fetch', 'web_search', 'update_todo', 'read_powershell',
  'stop_powershell', 'sql', 'skill', 'write', 'delete_file',
])
function suspiciousExecutionTool(toolName, canonical) {
  const name = String(toolName === undefined || toolName === null ? '' : toolName)
  const leaf = toolLeaf(name)
  if (['install_extension', 'run_vscode_command', 'create_new_workspace', 'create_new_jupyter_notebook'].includes(leaf)) return true
  if (SUSPICIOUS_KNOWN_SAFE.has(name) || SUSPICIOUS_KNOWN_SAFE.has(leaf)) return false
  if (canonical && SUSPICIOUS_KNOWN_SAFE.has(canonical)) return false
  return /(?:run(?:code|script|snippet|cell)?|exec(?:ute)?|eval|snippet|shell|python|jupyter|pylance|debug(?:ger)?|(?:^|[_-])repl(?:$|[_-])|kernel|interpreter|code[-_]?execution)/i.test(name)
}

// Get-KixTerminalCommand（kixpower-contract.ps1:274-301）
function terminalCommand(ToolLeaf, ToolInput) {
  const parts = []
  const input = ToolInput && typeof ToolInput === 'object' ? ToolInput : {}
  if (ToolLeaf === 'create_and_run_task') {
    const task = input.task
    if (task && task.command) parts.push(String(task.command))
    else if (input.command) parts.push(String(input.command))
    if (task) {
      for (const key of ['args', 'arguments']) {
        const value = task[key]
        if (value === undefined || value === null) continue
        for (const arg of (Array.isArray(value) ? value : [value])) {
          parts.push(typeof arg === 'string' ? arg : JSON.stringify(arg))
        }
      }
    }
  } else if (input.command) {
    parts.push(String(input.command))
  }
  return parts.join(' ')
}

// Get-KixPathValues（kixpower-contract.ps1:233-248）
function pathValues(ToolInput) {
  const values = []
  const input = ToolInput && typeof ToolInput === 'object' ? ToolInput : {}
  for (const key of ['filePath', 'file_path', 'dirPath', 'path', 'uri']) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key]) values.push(String(input[key]))
  }
  if (Array.isArray(input.files)) {
    for (const file of input.files) {
      if (!file || typeof file !== 'object') continue
      if (file.path) values.push(String(file.path))
      else if (file.filePath) values.push(String(file.filePath))
    }
  }
  return values
}

// Get-KixNormalizedPath（kixpower-contract.ps1:212-231）：file:// 解析 + BasePath 拼接 + 正斜杠化
function normalizedPath(value, basePath) {
  try {
    let candidate = String(value === undefined || value === null ? '' : value).trim()
    if (/^file:/i.test(candidate)) {
      let uri
      try {
        uri = new URL(candidate)
      } catch {
        return null
      }
      if (uri.protocol !== 'file:') return null
      candidate = decodeURIComponent(uri.pathname)
      if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(candidate)) candidate = candidate.slice(1)
      // UNC：file://host/share → \\host\share
      if (uri.host) candidate = `//${uri.host}${candidate}`
    }
    if (basePath && !path.isAbsolute(candidate)) candidate = path.join(String(basePath), candidate)
    return path.resolve(candidate).replace(/\\/g, '/')
  } catch {
    return null
  }
}

// Get-KixGitCommandParts（kixpower-contract.ps1:303-356）：git 调用的 subcommand/arguments/inlineConfigKeys
function gitCommandParts(Command) {
  const command = String(Command === undefined || Command === null ? '' : Command)
  const gitMatch = /(?<![\w.-])git(?:\.exe)?(?![\w.-])([\s\S]*)/i.exec(command)
  if (!gitMatch) return null
  const argsText = gitMatch[1].split(/[;&|\r\n]/)[0]
  const tokenMatches = argsText.match(/"(?:\\.|[^"])*"|'(?:''|[^'])*'|[^\s;&|]+/g) || []
  const tokens = tokenMatches.map((token) => token.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''))
  if (tokens.length === 0) return null

  const valueOptions = new Set(['-c', '-C', '--config', '--git-dir', '--work-tree', '--namespace', '--super-prefix', '--exec-path', '--config-env'])
  const flagOptions = new Set(['--no-pager', '--paginate', '--literal-pathspecs', '--glob-pathspecs', '--icase-pathspecs', '--no-replace-objects', '--bare'])
  const inlineConfigKeys = []
  let index = 0
  while (index < tokens.length) {
    const token = String(tokens[index])
    if (valueOptions.has(token)) {
      if ((token === '-c' || token === '--config') && index + 1 < tokens.length) {
        const inlineValue = String(tokens[index + 1])
        if (/^[^=]+=/.test(inlineValue)) inlineConfigKeys.push(inlineValue.split('=', 2)[0])
      }
      index += 2
      continue
    }
    if (/^(?:-c|-C|--config|--git-dir|--work-tree|--namespace|--super-prefix|--exec-path|--config-env)=/.test(token)) {
      const m1 = /^(?:-c|--config)=([^=]+)=/.exec(token)
      const m2 = /^--config-env=([^=]+)=/.exec(token)
      if (m1) inlineConfigKeys.push(m1[1])
      else if (m2) inlineConfigKeys.push(m2[1])
      index++
      continue
    }
    const stuck = /^-c([^\s=]+)=/.exec(token)
    if (stuck) {
      inlineConfigKeys.push(stuck[1])
      index++
      continue
    }
    if (/^-C\S/.test(token)) {
      index++
      continue
    }
    if (flagOptions.has(token) || token.startsWith('--')) {
      index++
      continue
    }
    break
  }
  if (index >= tokens.length) return null
  const args = index + 1 < tokens.length ? tokens.slice(index + 1) : []
  return {
    subcommand: String(tokens[index]).toLowerCase(),
    arguments: args,
    inlineConfigKeys: [...new Set(inlineConfigKeys)].sort(),
  }
}

function gitCommandPartsAll(Command) {
  const command = String(Command === undefined || Command === null ? '' : Command)
  const matches = command.match(/(?<![\w.-])git(?:\.exe)?(?![\w.-])[^;&|\r\n]*/gi) || []
  const parts = []
  for (const match of matches) {
    const part = gitCommandParts(match)
    if (part) parts.push(part)
  }
  return parts
}

// Test-KixGitWriteCommand（kixpower-contract.ps1:368-395）
const GIT_WRITE_COMMANDS = new Set(['apply', 'am', 'checkout', 'restore', 'clean', 'reset', 'stash', 'update-index', 'rm', 'mv', 'merge', 'rebase', 'cherry-pick', 'revert', 'read-tree', 'checkout-index', 'pull', 'reflog', 'gc', 'prune', 'maintenance', 'commit-tree', 'update-ref', 'symbolic-ref', 'hash-object', 'replace', 'fast-import'])
const GIT_SENSITIVE_CONFIG_KEYS = /^(?:alias\.|core\.(?:hooksPath|editor|pager|sshCommand|gitProxy)|gc\.reflogExpire(?:Unreachable)?|credential\.helper|diff\.external|difftool\..*\.cmd|filter\..*\.(?:clean|smudge|process)|sequence\.editor|core\.fsmonitor)/i
function gitWriteCommand(Command) {
  const parts = gitCommandPartsAll(Command)
  if (parts.length === 0) return false
  for (const part of parts) {
    if (part.inlineConfigKeys.some((key) => GIT_SENSITIVE_CONFIG_KEYS.test(key))) return true
    if (part.subcommand === 'config') {
      const args = part.arguments
      if (args.some((arg) => /^(?:--get(?:-all|-regexp)?|--list|-l|--show-origin|--show-names)$/i.test(arg))) continue
      const firstConfigKey = args.find((arg) => arg && !arg.startsWith('-'))
      if (firstConfigKey && GIT_SENSITIVE_CONFIG_KEYS.test(String(firstConfigKey))) return true
      continue
    }
    if (!GIT_WRITE_COMMANDS.has(part.subcommand)) continue
    if (part.subcommand === 'apply' && part.arguments.includes('--check')) continue
    if (part.subcommand === 'clean' && part.arguments.some((arg) => /^(?:-\w*n\w*|--dry-run)$/.test(arg))) continue
    if (part.subcommand === 'stash' && part.arguments.length > 0 && ['list', 'show', '--list'].includes(part.arguments[0])) continue
    if (part.subcommand === 'reflog') {
      const firstReflogArg = part.arguments.find((arg) => arg && !arg.startsWith('-'))
      if (!firstReflogArg || ['show', 'list', 'exists'].includes(firstReflogArg)) continue
    }
    return true
  }
  return false
}

// Test-KixGitCommitCommand（kixpower-contract.ps1:397-403）
function gitCommitCommand(Command) {
  for (const part of gitCommandPartsAll(Command)) {
    if (part.subcommand === 'commit' || part.arguments.includes('--amend')) return true
  }
  return false
}

// Test-KixTerminalWriteCommand（kixpower-contract.ps1:446-500）语义：终端不得借 shell 写文件。
// 分段用 kix-guards 的 `splitShellSegments`（E0 锚点；PS 侧为嵌套的 Get-KixCommandSegments）。
const TERMINAL_WRITE_TOKEN = String.raw`(?<![\w.-])`
const TERMINAL_WRITE_PATTERN = String.raw`(?:${TERMINAL_WRITE_TOKEN}(?:Set-Content|sc|Add-Content|ac|Out-File|Clear-Content|clc|Copy-Item|cpi|cp|copy|Move-Item|mi|mv|move|Remove-Item|ri|rm|del|erase|rmdir|rd|New-Item|ni|md|mkdir|Tee-Object|tee|touch|truncate)(?![\w.-])|${TERMINAL_WRITE_TOKEN}(?:sed\s+-i|perl\s+-pi)(?![\w.-])|\[(?:System\.)?IO\.(?:File|StreamWriter|FileStream)\]|::(?:WriteAllText|WriteAllBytes|AppendAllText)|${TERMINAL_WRITE_TOKEN}(?:pwsh|powershell|cmd|bash|sh|zsh|python|python3|node|ruby|perl)(?![\w.-])[^;&|\r\n]*(?:\s(?:--?|/)(?:c|k|Command|EncodedCommand|enc|e|eval|print|pe|p|File|f)(?=\s|=|$))|${TERMINAL_WRITE_TOKEN}(?:gofmt\s+-w|prettier\b[^;&|\r\n]*--write|ruff\b[^;&|\r\n]*--fix)(?![\w.-])|${TERMINAL_WRITE_TOKEN}(?:Invoke-Expression|iex|Set-Alias|New-Alias|Remove-Alias)(?![\w.-])|>{1,2}\s*(?!\$null\b|/dev/null\b|&\d\b)[^|;\s]+)`
const TERMINAL_WRITE_RE = new RegExp(TERMINAL_WRITE_PATTERN, 'i')
const TERMINAL_WEB_CLIENT_RE = /(?:(?:System\.)?Net\.WebClient|New-Object\s+(?:-TypeName\s+)?["']?(?:System\.)?Net\.WebClient)/i
const TERMINAL_DOWNLOAD_RE = new RegExp(String.raw`${TERMINAL_WRITE_TOKEN}(?:Invoke-WebRequest|iwr|wget|Invoke-RestMethod|irm)(?![\w.-])[^;&|\r\n]*\s-(?:O|Of|Ou|Out|OutF|OutFi|OutFil|OutFile|OutputFile|Literal|LiteralP|LiteralPath|Path)(?=\s|=|$)`, 'i')
const TERMINAL_CURL_RE = new RegExp(String.raw`${TERMINAL_WRITE_TOKEN}(?:curl|curl\.exe)(?![\w.-])[^;&|\r\n]*(?:\s(?:-o|--output|--remote-name|--remote-name-all)(?:\s|=|(?=[^\s;&|]))|\s-O(?:\s|$))`, 'i')
const TERMINAL_WGET_RE = new RegExp(String.raw`${TERMINAL_WRITE_TOKEN}(?:wget|wget\.exe)(?![\w.-])[^;&|\r\n]*(?:\s(?:-O|--output-document|--directory-prefix|-P)(?:\s|=|(?=[^\s;&|])))`, 'i')
const TERMINAL_EXPORT_RE = new RegExp(String.raw`${TERMINAL_WRITE_TOKEN}(?:Export-Csv|Export-Clixml|Export-Pssession)(?![\w.-])[^;&|\r\n]*\s-(?:P|Pa|Pat|Path|Literal|LiteralP|LiteralPath|Destination)(?=\s|=|$)`, 'i')
const TERMINAL_TRANSFER_RE = new RegExp(String.raw`${TERMINAL_WRITE_TOKEN}(?:Start-BitsTransfer|bitsadmin)(?![\w.-])[^;&|\r\n]*(?:\s-(?:D|De|Des|Dest|Desti|Destin|Destina|Destination|S|So|Sou|Sour|Source)|\s/transfer\b)`, 'i')
const TERMINAL_CERTUTIL_RE = new RegExp(String.raw`${TERMINAL_WRITE_TOKEN}certutil(?![\w.-])[^;&|]*\s-(?:decode|decodehex|encode)\b`, 'i')
const TERMINAL_FSUTIL_RE = new RegExp(String.raw`${TERMINAL_WRITE_TOKEN}fsutil(?![\w.-])[^;&|]*\bfile\s+createnew\b`, 'i')
const TERMINAL_REMOTE_TRANSFER_RE = /(?:^|[;&|\r\n])\s*(?:sudo\s+)?(?:scp|rsync)(?:\.exe)?(?=\s|$)/i
const TERMINAL_RUST_FIX_RE = new RegExp(String.raw`(?:${TERMINAL_WRITE_TOKEN}cargo(?:\.exe)?(?![\w.-])\s+(?:fix\b|clippy\b[^;&|\r\n]*(?<![\w-])--fix(?![\w-]))|${TERMINAL_WRITE_TOKEN}rustfmt(?:\.exe)?(?![\w.-]))`, 'i')
const TERMINAL_CARGO_FMT_RE = new RegExp(String.raw`${TERMINAL_WRITE_TOKEN}cargo(?:\.exe)?(?![\w.-])\s+fmt\b[^;&|\r\n]*`, 'i')

function terminalWriteCommand(Command, { allowFormatting = false } = {}) {
  const command = String(Command === undefined || Command === null ? '' : Command)
  const segments = splitShellSegments(command).map((part) => part.text)
  if (segments.length > 1) {
    return segments.some((segment) => terminalWriteCommand(segment, { allowFormatting }))
  }
  if (TERMINAL_WRITE_RE.test(command)) return true
  if (TERMINAL_WEB_CLIENT_RE.test(command)) return true
  if (TERMINAL_DOWNLOAD_RE.test(command)) return true
  if (TERMINAL_CURL_RE.test(command)) return true
  if (TERMINAL_WGET_RE.test(command)) return true
  if (TERMINAL_EXPORT_RE.test(command)) return true
  if (TERMINAL_TRANSFER_RE.test(command)) return true
  if (TERMINAL_CERTUTIL_RE.test(command)) return true
  if (TERMINAL_FSUTIL_RE.test(command)) return true
  if (TERMINAL_REMOTE_TRANSFER_RE.test(command)) return true
  if (gitWriteCommand(command)) return true
  if (TERMINAL_RUST_FIX_RE.test(command) && !/(?<![\w-])--check(?![\w-])/.test(command)) return true
  if (TERMINAL_CARGO_FMT_RE.test(command)) {
    if (!allowFormatting && !/(?<![\w-])--check(?![\w-])/.test(command)) return true
  }
  return false
}

// Get-KixSqlFileReferences（kixpower-contract.ps1:495-517）
const SQL_FILE_REFERENCE_PATTERNS = [
  /(?:^|[\s;&|])<\s*(?:"(?<quoted>[^"]+)"|'(?<single>[^']+)'|(?<bare>[^\s;&|]+))/i,
  /(?:^|[\s;&|])(?:-f|--file|--queries-file|-InputFile)(?:=|\s+)(?:"(?<quoted>[^"]+)"|'(?<single>[^']+)'|(?<bare>[^\s;&|]+))/i,
  /(?:^|[\s;&|])(?:source|\\i|\.read)\s+(?:"(?<quoted>[^"]+)"|'(?<single>[^']+)'|(?<bare>[^\s;&|]+))/i,
  /\b(?:Get-Content|cat|type)\s+(?:-Raw\s+)?(?:"(?<quoted>[^"]+)"|'(?<single>[^']+)'|(?<bare>[^\s;&|]+))/i,
]
function sqlFileReferences(Command) {
  const command = String(Command === undefined || Command === null ? '' : Command)
  const references = new Map()
  for (const pattern of SQL_FILE_REFERENCE_PATTERNS) {
    for (const match of command.matchAll(new RegExp(pattern.source, 'gi'))) {
      const value = match.groups.quoted || match.groups.single || match.groups.bare
      if (!value) continue
      if (!references.has(value)) references.set(value, { path: value, resolvable: !/^(?:\$|%|\(|`|\{)/.test(value) })
    }
  }
  return [...references.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

// Test-KixAuthorityLineOverlap（block-dev-authority-edit.ps1:102-123）
function authorityLineOverlap(fileText, fragment) {
  const text = String(fileText === undefined || fileText === null ? '' : fileText)
  const needle = String(fragment === undefined || fragment === null ? '' : fragment)
  if (!needle) return false
  if (!text.split(/\r?\n/).some((line) => AUTHORITY_FIELD_RE.test(line))) return false
  let searchFrom = 0
  while (searchFrom < text.length) {
    const index = text.indexOf(needle, searchFrom)
    if (index < 0) break
    const lineStart = text.lastIndexOf('\n', index)
    const begin = lineStart < 0 ? 0 : lineStart + 1
    const lineEnd = text.indexOf('\n', index + needle.length)
    const end = lineEnd < 0 ? text.length : lineEnd
    const line = text.slice(begin, end).replace(/\r+$/, '')
    if (AUTHORITY_FIELD_RE.test(line)) return true
    searchFrom = index + Math.max(1, needle.length)
  }
  return false
}

// block-dev-authority-edit.ps1:100 的权威字段模式（新增：多行 + 反斜杠转义形态）
const AUTHORITY_FIELD_RE = /(?:^|[^\w]|\\[nrt])(?:l2_verification_passed|l2_verification_status|l2_verified_sha|l2_gate_manifest_sha256|l2_stash_refs|qa_started_sha|qa_verified_sha|qa_gate_manifest_sha256|qa_test_changes|ci_pending)\s*:/im

// ═══════════════════════════════════════════════════════════════════════════
// §D 判定层：4 个已移植 hook（H-set-A）的规则集合
// ═══════════════════════════════════════════════════════════════════════════

// 工具名集合一律小写：PowerShell 的 `-eq` 大小写不敏感（`vscode_renamesymbol` 必须命中
// `vscode_renameSymbol`）→ 比较前统一 toLowerCase，避免大小写差异导致漏拦。
const EDIT_TOOLS = ['apply_patch', 'replace_string_in_file', 'insert_edit_into_file', 'edit_notebook_file', 'create_file', 'create_or_update_file', 'delete_file', 'push_files']
const LOCAL_EDIT_TOOLS = ['apply_patch', 'replace_string_in_file', 'insert_edit_into_file', 'edit_notebook_file', 'create_file', 'create_directory', 'delete_file', 'vscode_renamesymbol', 'edit', 'create', 'write']
const BLOCKED_EXECUTION_TOOLS = ['create_and_run_task', 'create_new_workspace', 'create_new_jupyter_notebook', 'run_vscode_command', 'install_extension', 'run_notebook_cell']
const REMOTE_FILE_EDIT_RE = /mcp_github.*(?:create_or_update_file|delete_file|push_files)/i
const GITHUB_WRITE_RE = /(?:mcp_github.*(?:create_or_update_file|delete_file|push_files)|GitHub-(?:create_or_update_file|delete_file|push_files)|create_or_update_file|delete_file|push_files)/i
const GITHUB_MUTATION_RE = /(?:mcp_github.*(?:_write|create_|update_|delete_|merge_|add_.*comment|assign_|fork_|push_files|request_|submit_|resolve_|unresolve_)|GitHub-(?:add_issue_comment|create_issue|create_pull_request|create_pull_request_review|create_repository|create_branch|update_issue|update_pull_request_branch|merge_pull_request|fork_repository))/i
const SQL_TOOL_RE = /(?:dbx.*execute|sql.*execute|execute.*sql)/i
const APPLY_PATCH_PATH_RE = /^\*\*\* (?:Add|Update|Delete) File:\s*(.+?)(?:\s+->.*)?\s*$/gm
const BLOCKED_SOURCE_PATTERNS = [
  /(^|\/)src\//,
  /(^|\/)app\//,
  /(^|\/)api\//,
  /(^|\/)components\//,
  /(^|\/)lib\//,
  /(^|\/)utils\//,
  /(^|\/)hooks\//,
  /(^|\/)styles\//,
  /\.(js|ts|jsx|tsx|mjs|cjs|mts|cts|py|java|go|rs|cpp|c|h|cs|rb|php|kt|kts|scala|swift|dart|lua|ex|exs|erl|hrl|fs|fsx|vb|sh|bash|zsh|fish|ps1|psm1|sql|html|css|scss|sass|less|vue|svelte|xml|proto|ipynb)$/,
  /package\.json$/,
  /tsconfig\.json$/,
  /next\.config\./,
  /vite\.config\./,
  /webpack\.config\./,
  /docker-compose\.yml$/,
  /Dockerfile$/,
  /\.env/,
]
const SOURCE_ALLOWED_ORCHESTRATOR = [
  /^docs\/\.kixpower-current-sprint$/,
  /^docs\/\.kixpower-qa-session\.json$/,
  /^docs\/sprint-\d+\/progress\.md$/,
  /^docs\/sprint-\d+\/hill-climbing\.md$/,
  /^docs\/reviews\/.+\.md$/,
  /^\.kixpower\/memory\/repo\/(harness-backlog|lessons-learned)\.md$/,
]
const SOURCE_ALLOWED_PRODUCER = [
  /^docs\//,
  /^README\.md$/,
  /^PROJECT_BRIEF\.md$/,
  /^\.github\//,
  /^\.gitignore$/,
  /^\.kixpower\/memory\/repo\/(harness-backlog|lessons-learned)\.md$/,
]
const QA_ALLOWED_PATTERNS = [
  /(^|\/)docs\/qa\/qa-signoff-\d+\.md$/,
  /(^|\/)\.kixpower\/memory\/repo\/lessons-learned\.md$/,
  /__tests__\//,
  /(^|\/)tests?\//,
  /(^|\/)e2e\//,
  /(^|\/)cypress\//,
  /_test\.go$/,
  /\.test\./,
  /\.spec\./,
  /\.stories\./,
]
const PROGRESS_RELATIVE_RE = /^docs\/sprint-\d+\/progress\.md$/i

function deny(reason) {
  return { decision: 'deny', reason }
}
function ask(reason) {
  return { decision: 'ask', reason }
}
function allow() {
  return { decision: 'allow', reason: '' }
}

function applyPatchPaths(input) {
  const text = String(input === undefined || input === null ? '' : input)
  const paths = []
  for (const match of text.matchAll(APPLY_PATCH_PATH_RE)) paths.push(match[1])
  return paths
}

// targetPathsOf（blast-radius-check.ps1:173-183 的分支形状）
function targetPathsOf(canonical, argsObj) {
  if (!argsObj || typeof argsObj !== 'object') return []
  if (canonical === 'apply_patch' && argsObj.input) return applyPatchPaths(argsObj.input)
  return pathValues(argsObj)
}

function protectedControlPlaneRoots(ctx) {
  const roots = []
  if (ctx.homeDir) roots.push(normalizedPath(path.join(ctx.homeDir, '.copilot'), null))
  if (ctx.appData) roots.push(normalizedPath(path.join(ctx.appData, 'Code', 'User'), null))
  return roots.filter(Boolean)
}
function protectedControlPlaneFiles(ctx) {
  const files = []
  if (ctx.appData) files.push(normalizedPath(path.join(ctx.appData, 'Code', 'User', 'settings.json'), null))
  return files.filter(Boolean)
}
function isInside(target, root) {
  const lowTarget = target.toLowerCase()
  const lowRoot = String(root).toLowerCase()
  return lowTarget === lowRoot || lowTarget.startsWith(`${lowRoot}/`)
}

// ── blast-radius-check.cjs 的判定（blast-radius-check.ps1:146-513）───────────
function verdictBlastRadius(call, ctx) {
  try {
    const toolName = call.name
    const canonical = canonicalToolName(toolName)
    const leaf = canonical.toLowerCase()
    const argsObj = call.input && typeof call.input === 'object' ? call.input : null

    if (suspiciousExecutionTool(toolName, canonical)) {
      return deny('BLAST RADIUS: 未登记的代码执行/脚本工具无法验证副作用，拒绝执行。')
    }

    let cmd = ''
    if (argsObj) {
      cmd = terminalCommand(canonical, argsObj)
      if (!cmd && argsObj.command) cmd = String(argsObj.command)
      if (!cmd && Object.prototype.hasOwnProperty.call(argsObj, 'code')) cmd = String(argsObj.code)
    }

    // 控制平面自保护：kixpower agent 不得改写自身 Agent/Skill/Prompt/全局设置后再绕过门禁
    if (LOCAL_EDIT_TOOLS.includes(leaf)) {
      const targetPaths = targetPathsOf(canonical, argsObj)
      if (leaf === 'apply_patch' && targetPaths.length === 0 && argsObj && argsObj.input) {
        return deny('CONTROL PLANE: 无法从 patch 提取目标路径，拒绝可能改写用户级控制平面。')
      }
      if (targetPaths.length === 0 && ['create_file', 'delete_file', 'replace_string_in_file', 'insert_edit_into_file'].includes(leaf)) {
        return deny('CONTROL PLANE: 编辑工具未提供可验证目标路径，拒绝执行。')
      }
      const base = ctx.workspace || ctx.cwd || process.cwd()
      const roots = protectedControlPlaneRoots(ctx)
      const files = protectedControlPlaneFiles(ctx)
      for (const targetPath of targetPaths) {
        const normalizedTarget = normalizedPath(targetPath, base)
        if (!normalizedTarget) return deny('CONTROL PLANE: 无法规范化编辑目标路径，拒绝执行。')
        if (files.includes(normalizedTarget) || roots.some((root) => isInside(normalizedTarget, root))) {
          return deny('CONTROL PLANE: 当前 kixpower agent 禁止修改用户级 Agent/Skill/Prompt/Hook/设置。请退出该 agent 后由用户维护。')
        }
      }
    }

    const projectRoot = ctx.workspace || ctx.cwd || process.cwd()
    const isTerminal = ['run_in_terminal', 'create_and_run_task', 'powershell', 'bash'].includes(leaf)
    const isGitHubWrite = GITHUB_WRITE_RE.test(toolName)
    const isGitHubMutation = GITHUB_MUTATION_RE.test(toolName)
    const isSqlTool = SQL_TOOL_RE.test(toolName)

    if (isSqlTool) {
      let found = false
      for (const field of ['sql', 'query', 'statement', 'command']) {
        if (argsObj && Object.prototype.hasOwnProperty.call(argsObj, field) && argsObj[field]) {
          cmd = String(argsObj[field])
          found = true
          break
        }
      }
      if (!found) return deny('BLAST RADIUS: SQL mutation 工具未提供可检查的 sql/query/statement 字段，拒绝执行。')
    }
    if (!(isTerminal || isGitHubWrite || isGitHubMutation || isSqlTool)) return allow()

    const isGitCommand = isTerminal && /(?:^|[^\w.-])git(?:\.exe)?(?:[^\w.-]|$)/i.test(cmd)
    const isGitCommit = isGitCommand && gitCommitCommand(cmd)
    const isGitPush = isGitCommand && gitInvocations(cmd).some((inv) => ['push', 'send-pack'].includes(String(inv.sub).toLowerCase()))
    const isTerminalSql = isTerminal && /\b(?:psql|mysql|mariadb|sqlite3|sqlcmd|clickhouse-client|duckdb)\b/i.test(cmd)

    let terminalSqlForInspection = cmd
    let sqlRefsForInspection = []
    if (isTerminalSql) {
      sqlRefsForInspection = sqlFileReferences(cmd)
      for (const ref of sqlRefsForInspection) {
        terminalSqlForInspection = terminalSqlForInspection.split(ref.path).join(' ')
      }
    }

    let operationRoot = projectRoot
    if (isGitCommand) {
      const gitCMatch = /\bgit(?:\.exe)?\b(?:(?![;&|]).)*?\s-C\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/i.exec(cmd)
      if (gitCMatch) {
        const gitCPath = gitCMatch[1] || gitCMatch[2] || gitCMatch[3]
        const resolved = normalizedPath(gitCPath, projectRoot)
        if (!resolved) return deny('无法解析 git -C 的目标仓库路径，拒绝执行 Git 写操作。')
        operationRoot = resolved
      }
    }

    if (isTerminal && isTerminalControlPlaneWrite(cmd)) {
      return deny('CONTROL PLANE: 禁止通过命令改写用户级 Agent/Skill/Prompt/Hook/设置。')
    }

    const flags = {
      commitBudget: COMMIT_BUDGET_DEFAULT,
      commitHardCap: COMMIT_HARD_CAP,
      commitWarnThreshold: COMMIT_HARD_CAP,
      branchRequired: true,
      blockForcePush: true,
      blockDestructiveSql: true,
    }
    let commitBudgetSource = 'default'
    if (ctx.readSprintContext) {
      const sprintContext = ctx.readSprintContext(operationRoot) || {}
      if (sprintContext.progressMd) {
        const progressMd = sprintContext.progressMd
        flags.commitBudget = resolveCommitBudget({ progressMd, planMd: sprintContext.planMd })
        commitBudgetSource = commitBudgetSourceOf({ progressMd, planMd: sprintContext.planMd })
        const budget = /^---[\s\S]*?blast_radius:[\s\S]*?commit_budget:\s*(\d+)/.exec(progressMd)
        if (budget) commitBudgetSource = 'progress.md blast_radius.commit_budget'
        if (sprintContext.branchRequired !== undefined) flags.branchRequired = sprintContext.branchRequired
        if (sprintContext.blockForcePush !== undefined) flags.blockForcePush = sprintContext.blockForcePush
        if (sprintContext.blockDestructiveSql !== undefined) flags.blockDestructiveSql = sprintContext.blockDestructiveSql
        if (sprintContext.commitWarnThreshold !== undefined) flags.commitWarnThreshold = sprintContext.commitWarnThreshold
      }
    }

    if (isGitCommit && ctx.readReflog) {
      const reflogText = ctx.readReflog(operationRoot)
      if (reflogText !== undefined && reflogText !== null) {
        const counted = countReflogCommits(reflogText)
        if (counted.churn >= flags.commitHardCap) {
          return deny(`BLAST RADIUS HARD CAP: 已 commit ${counted.churn} 次（绝对硬上限 ${flags.commitHardCap}）。立即停止并拆分 Sprint；不得从 plan.md 覆盖硬上限。`)
        }
        if (counted.commits >= flags.commitBudget) {
          return deny(`BLAST RADIUS: 已 commit ${counted.commits} 次（预算 ${flags.commitBudget}，来源：${commitBudgetSource}）。Producer 必须按 DAG 重算并同步预算；派生值超过 ${flags.commitHardCap} 时拆分 Sprint。`)
        }
      }
    }

    if (flags.blockDestructiveSql && isTerminalSql) {
      const sqlVerdict = inspectTerminalSql({ text: terminalSqlForInspection, refs: sqlRefsForInspection, projectRoot, ctx })
      if (sqlVerdict) return sqlVerdict
    }

    if (flags.blockDestructiveSql && isSqlTool && isDestructiveSql(cmd)) {
      return deny('BLAST RADIUS: 检测到破坏性 SQL（DROP/TRUNCATE/ALTER 或 DELETE/UPDATE without WHERE）。')
    }

    if (flags.blockForcePush && isGitPush && (isForcePush(cmd) || /\bpush\b[^;&|]*\s\+\S+/.test(cmd))) {
      return deny('BLAST RADIUS: git push --force 会重写远端历史。需用户明确确认；优先使用 --force-with-lease 或 git revert。')
    }
    if (isGitCommand && isLocalDestructiveAsk(cmd)) {
      return ask('检测到会丢失本地工作的 Git 操作。请确认目标仓库、分支和待丢弃内容。')
    }
    if (isGitPush) {
      if (pushTargetsProtectedRef(cmd)) {
        return deny('BLAST RADIUS: 禁止直接 push 到 main/master。请推送 feature 分支并通过 PR 合并。')
      }
      return ask('git push 会写入共享远端。确认远端、源分支和目标分支后再继续。')
    }
    if (flags.branchRequired && isGitCommit && ctx.readBranch) {
      const branch = String(ctx.readBranch(operationRoot) || '').trim()
      if (branch === 'main' || branch === 'master') {
        return deny(`BLAST RADIUS: 禁止在 ${branch} 分支直接 commit。先创建 feature 分支并通过 PR/MR 合并。`)
      }
    }
    if (isGitHubWrite) {
      const targetBranch = argsObj ? argsObj.branch || argsObj.target_branch || argsObj.ref : null
      if (!targetBranch) return deny('BLAST RADIUS: GitHub 远程写入未提供目标 branch，无法确认不是 main/master。请显式提供 feature branch。')
      if (targetBranch === 'main' || targetBranch === 'master') {
        return deny('BLAST RADIUS: 禁止通过 GitHub 工具直接写 main/master。写入 feature 分支并通过 PR 合并。')
      }
    }
    if (isGitHubMutation) {
      return ask('该 GitHub 操作会写入共享系统。确认目标、内容与分支后再继续。')
    }
    return allow()
  } catch (error) {
    // v6.1 崩溃 fail-closed（blast-radius-check.ps1:509-512）：解析/判定异常绝不静默放行
    return deny(`BLAST RADIUS: 门禁判定异常（${error && error.message ? error.message : String(error)}），fail-closed 拒绝执行。`)
  }
}

// commitBudgetSource（kix-guards 同名函数）+ ps1 的「progress.md 优先」标注
function commitBudgetSourceOf({ progressMd, planMd }) {
  return commitBudgetSource({ progressMd, planMd })
}

// 终端 DB 客户端 + SQL 文件检查（blast-radius-check.ps1:394-427）
// 返回 null = 放行继续；返回 verdict = 立即 deny
function inspectTerminalSql({ text, refs, projectRoot, ctx }) {
  if (/\b(?:DELETE|UPDATE|DROP|TRUNCATE|ALTER)\b/i.test(text)) {
    return deny('BLAST RADIUS: 终端数据库客户端中的破坏性 SQL 无法可靠静态解析。请改用结构化 DBX 工具或先在事务/只读副本中验证。')
  }
  for (const ref of refs) {
    if (!ref.resolvable) return deny('BLAST RADIUS: SQL 文件路径无法静态解析，拒绝执行。')
    const sqlPath = normalizedPath(ref.path, projectRoot)
    const readFile = ctx.readFile || ((file) => {
      try {
        return fs.readFileSync(file, 'utf8')
      } catch {
        return null
      }
    })
    const fileSql = sqlPath ? readFile(sqlPath) : null
    if (sqlPath === null || fileSql === null || fileSql === undefined) {
      return deny('BLAST RADIUS: SQL 文件不存在或无法读取，拒绝执行。')
    }
    const normalizedSql = stripSqlNoise(fileSql)
    if (/\b(?:DROP|TRUNCATE|ALTER)\b/i.test(normalizedSql)) {
      return deny('BLAST RADIUS: SQL 文件包含破坏性 DDL（DROP/TRUNCATE/ALTER）。')
    }
    for (const statement of normalizedSql.split(';')) {
      if ((/\bDELETE\b[^;]*?\bFROM\b/i.test(statement) || /\bUPDATE\b[^;]*?\bSET\b/i.test(statement)) && !/\bWHERE\b/i.test(statement)) {
        return deny('BLAST RADIUS: SQL 文件包含 DELETE/UPDATE without WHERE。')
      }
    }
  }
  return null
}

// ── block-source-edit.cjs 的判定（block-source-edit.ps1:36-201）──────────────
function verdictSourceEdit(call, ctx) {
  const role = ctx.role === 'orchestrator' ? 'orchestrator' : 'producer'
  const toolName = call.name
  const leaf = toolLeaf(toolName).toLowerCase()
  const argsObj = call.input && typeof call.input === 'object' ? call.input : null

  if (suspiciousExecutionTool(toolName, canonicalToolName(toolName))) {
    return deny('当前 agent 禁止使用未登记的代码执行/脚本工具；请使用受边界检查的终端或编辑工具。')
  }
  if (BLOCKED_EXECUTION_TOOLS.includes(leaf)) {
    return deny('当前 agent 禁止使用可绕过文档写边界的执行或脚手架工具。')
  }
  if (leaf === 'run_in_terminal') {
    const command = terminalCommand(leaf, argsObj)
    if (terminalWriteCommand(command)) return deny('当前 agent 禁止通过终端写文件；请使用受路径检查的编辑工具。')
    return allow()
  }
  if (leaf === 'vscode_renamesymbol') return deny('当前 agent 禁止执行跨文件符号重命名。')
  if (!argsObj || (!EDIT_TOOLS.includes(leaf) && !REMOTE_FILE_EDIT_RE.test(toolName))) return allow()

  const targetPaths = leaf === 'apply_patch' && argsObj.input ? applyPatchPaths(argsObj.input) : pathValues(argsObj)
  if (targetPaths.length === 0) return allow()

  return editPathBoundary({ targetPaths, ctx, toolName, leaf, argsObj, role, allowedPatterns: role === 'orchestrator' ? SOURCE_ALLOWED_ORCHESTRATOR : SOURCE_ALLOWED_PRODUCER })
}

// ── block-source-edit-qa.cjs 的判定（block-source-edit-qa.ps1:32-191）────────
function verdictSourceEditQa(call, ctx) {
  const toolName = call.name
  const leaf = toolLeaf(toolName).toLowerCase()
  const argsObj = call.input && typeof call.input === 'object' ? call.input : null

  if (suspiciousExecutionTool(toolName, canonicalToolName(toolName))) {
    return deny('QA 禁止使用未登记的代码执行/脚本工具；请使用受边界检查的终端或测试工具。')
  }
  if (BLOCKED_EXECUTION_TOOLS.includes(leaf)) {
    return deny('QA 禁止使用可绕过测试/文档写边界的执行或脚手架工具。')
  }
  if (leaf === 'run_in_terminal') {
    const command = terminalCommand(leaf, argsObj)
    // 分歧登记（见文件头「已知与 .ps1 的行为分歧」第 2 条）：.ps1 调用的两个函数取其嵌套作用域
    // 之外不可见 → 该分支在 .ps1 上失效；本实现按意图生效。
    if (gitCommitCommand(command) || gitWriteCommand(command) || terminalWriteCommand(command)) {
      return deny('QA 不提交测试或业务变更；测试变更必须返回 Orchestrator 重新执行 L2/QA。')
    }
    return allow()
  }
  if (leaf === 'vscode_renamesymbol') return deny('QA 禁止执行跨文件符号重命名。')
  if (!argsObj || (!EDIT_TOOLS.includes(leaf) && !REMOTE_FILE_EDIT_RE.test(toolName))) return allow()

  const targetPaths = leaf === 'apply_patch' && argsObj.input ? applyPatchPaths(argsObj.input) : pathValues(argsObj)
  if (targetPaths.length === 0) return allow()

  return editPathBoundary({ targetPaths, ctx, toolName, leaf, argsObj, role: 'qa', allowedPatterns: QA_ALLOWED_PATTERNS, qaOrder: true })
}

function editPathBoundary({ targetPaths, ctx, toolName, leaf, role, allowedPatterns, qaOrder = false }) {
  const workspace = ctx.workspace || ctx.cwd || process.cwd()
  const normalizedWorkspace = normalizedPath(workspace, null)
  if (!normalizedWorkspace) return deny('无法规范化工作区路径，拒绝编辑。')
  const denyOutside = role === 'qa' ? 'QA 禁止编辑工作区外文件。' : '当前 agent 禁止编辑工作区外文件。'
  const denyBlocked = role === 'qa'
    ? 'QA agent 禁止编辑业务源代码。只允许写测试文件和 QA 文档。发现 Bug 请提 Issue 交 Dev 修复。'
    : '当前 agent 禁止编辑源代码文件。发现 Bug 请提 Issue，让 Dev 团队修复。'
  const denyFallback = role === 'qa'
    ? 'QA 只能编辑测试文件和 docs/qa/qa-signoff-N.md。'
    : role === 'orchestrator'
      ? 'Orchestrator 只能写 progress.md、hill-climbing.md 和 docs/reviews/*.md；规划与 PROJECT_BRIEF 交 Producer。'
      : 'Producer 只能编辑 PROJECT_BRIEF.md、顶层 docs/**、README.md、.github/** 和 .gitignore。'

  for (const targetPath of targetPaths) {
    const normalizedTarget = normalizedPath(targetPath, workspace)
    if (!normalizedTarget) return deny('无法规范化目标路径，拒绝编辑。')
    if (!isInside(normalizedTarget, normalizedWorkspace)) return deny(denyOutside)
    const relPath = normalizedTarget.slice(normalizedWorkspace.length).replace(/^\/+/, '')
    if (qaOrder) {
      if (allowedPatterns.some((pattern) => pattern.test(relPath))) continue
      if (BLOCKED_SOURCE_PATTERNS.some((pattern) => pattern.test(relPath))) return deny(denyBlocked)
      return deny(denyFallback)
    }
    // Producer / Orchestrator：源码黑名单优先（即使命中 docs/ 白名单也不得写源码扩展名文件）
    if (BLOCKED_SOURCE_PATTERNS.some((pattern) => pattern.test(relPath))) return deny(denyBlocked)
    if (allowedPatterns.some((pattern) => pattern.test(relPath))) continue
    return deny(denyFallback)
  }
  return allow()
}

// ── block-dev-authority-edit.cjs 的判定（block-dev-authority-edit.ps1:37-184）──
function verdictDevAuthorityEdit(call, ctx) {
  const toolName = call.name
  const leaf = toolLeaf(toolName).toLowerCase()
  const argsObj = call.input && typeof call.input === 'object' ? call.input : null

  if (suspiciousExecutionTool(toolName, canonicalToolName(toolName))) {
    return deny('当前 agent 禁止使用未登记的代码执行/脚本工具；请使用受边界检查的终端或编辑工具。')
  }
  if (!argsObj) return allow()

  if (leaf === 'run_notebook_cell') {
    const notebookCode = [argsObj.code, argsObj.cell, argsObj.content].filter(Boolean).join('\n')
    if (notebookCode.trim() === '') {
      return deny('Dev notebook cell 的代码正文不可验证；拒绝可能改写 progress.md 或 L2/QA 权威字段的执行。')
    }
    if (AUTHORITY_FIELD_RE.test(notebookCode) || /progress\.md/i.test(notebookCode)) {
      return deny('Dev notebook 执行不得改写 progress.md 或 L2/QA 权威字段。')
    }
    return allow()
  }

  const isRemoteFileEdit = REMOTE_FILE_EDIT_RE.test(toolName)
  const targetPaths = targetPathsOf(canonicalToolName(toolName) === 'apply_patch' ? 'apply_patch' : leaf, argsObj)

  if (['run_in_terminal', 'create_and_run_task'].includes(leaf)) {
    const command = terminalCommand(leaf, argsObj)
    if (terminalWriteCommand(command, { allowFormatting: true })) {
      return deny('Dev/Producer 不得通过终端写文件或改变 Git 状态（Dev 的 cargo fmt --all 格式化例外除外）；请使用受路径检查的编辑工具，权威 L2/QA 字段由 Orchestrator 写入。')
    }
    return allow()
  }
  if (!EDIT_TOOLS.includes(leaf) && !isRemoteFileEdit) return allow()
  if (targetPaths.length === 0) {
    if ((leaf === 'apply_patch' && argsObj.input && /progress\.md/i.test(String(argsObj.input))) || isRemoteFileEdit) {
      return deny('无法从 patch 解析 progress.md 目标路径，拒绝可能改写权威字段。')
    }
    return allow()
  }

  const workspace = ctx.workspace || ctx.cwd || process.cwd()
  const normalizedWorkspace = normalizedPath(workspace, null)
  if (!normalizedWorkspace) return deny('无法规范化工作区路径，拒绝可能改写 progress.md。')

  const serializedInput = JSON.stringify(argsObj)
  for (const targetPath of targetPaths) {
    const normalizedTarget = normalizedPath(targetPath, normalizedWorkspace)
    if (!normalizedTarget) {
      if (/progress\.md/i.test(String(targetPath))) return deny('无法规范化 progress.md 目标路径，拒绝编辑。')
      continue
    }
    if (!isInside(normalizedTarget, normalizedWorkspace)) continue
    const relativePath = normalizedTarget.slice(normalizedWorkspace.length).replace(/^\/+/, '')
    if (/^\.git(?:\/|$)/i.test(relativePath)) {
      return deny('Dev/Producer 不得直接编辑 .git/ 内部文件（config/logs/refs/stash）；此操作可注入 alias/hook 或篡改 reflog/stash baseline。')
    }
    if (!PROGRESS_RELATIVE_RE.test(relativePath)) continue
    if (isRemoteFileEdit) {
      return deny('Dev/Producer 不得通过 GitHub 远程文件工具修改 progress.md；请由 Orchestrator 在本地记录权威状态。')
    }
    if (['create_file', 'create_or_update_file', 'delete_file', 'push_files'].includes(leaf)) {
      return deny('Dev 不得整体创建、覆盖、删除或推送 progress.md；请使用受保护的局部任务状态编辑，并由 Orchestrator 记录权威 L2/QA 字段。')
    }
    let authorityEdit = AUTHORITY_FIELD_RE.test(serializedInput)
    if (!authorityEdit) {
      for (const field of ['content', 'newString', 'new_str', 'newText', 'replacement', 'input']) {
        if (Object.prototype.hasOwnProperty.call(argsObj, field) && AUTHORITY_FIELD_RE.test(String(argsObj[field]))) {
          authorityEdit = true
          break
        }
      }
    }
    if (!authorityEdit && ['replace_string_in_file', 'insert_edit_into_file'].includes(leaf)) {
      const readFile = ctx.readFile || ((file) => {
        try {
          return fs.readFileSync(file, 'utf8')
        } catch {
          return ''
        }
      })
      const progressText = readFile(normalizedTarget) || ''
      let oldFragment = ''
      for (const key of ['oldString', 'old_str', 'oldText', 'old_code']) {
        if (Object.prototype.hasOwnProperty.call(argsObj, key) && argsObj[key]) {
          oldFragment = String(argsObj[key])
          break
        }
      }
      if (oldFragment && authorityLineOverlap(progressText, oldFragment)) authorityEdit = true
      if (leaf === 'insert_edit_into_file' && !oldFragment) authorityEdit = true
    }
    if (authorityEdit) {
      return deny('Dev 不得写入权威 L2/QA 字段（l2_* / qa_*）；请由 Orchestrator 记录验证结果。')
    }
    if (leaf === 'apply_patch' && /^\*\*\* Delete File:/im.test(String(argsObj.input))) {
      return deny('Dev 不得删除 progress.md；权威 L2/QA 状态必须保持可验证。')
    }
  }
  return allow()
}

// ═══════════════════════════════════════════════════════════════════════════
// §E CLI runner：入口共用（deny > ask > allow 聚合；与 .ps1 输出协议同构）
// ═══════════════════════════════════════════════════════════════════════════

function decisionJson(hookEventName, decision, reason) {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName,
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  })
}

// runHook({ label, hookEventName, evaluate, context, stdin }) →
//   { exitCode, stdout: [line], stderr: [line], status }
function runHook({ label, hookEventName, evaluate, context, stdin }) {
  const normalized = normalizePayload(stdin)
  if (normalized.status === 'empty' || normalized.status === 'no-tool-call') {
    return { exitCode: 0, stdout: [], stderr: [], status: normalized.status }
  }
  if (normalized.status === 'invalid-json') {
    return {
      exitCode: 2,
      stdout: [],
      stderr: [`${label}: hook input 不是有效 JSON，拒绝执行。`],
      status: normalized.status,
    }
  }
  if (normalized.status === 'unknown') {
    const reason = `${label}: ${PAYLOAD_MARKER} —— ${normalized.detail}；载荷形态无法识别，按 fail-closed 拒绝执行。`
    return {
      exitCode: 2,
      stdout: [decisionJson(hookEventName, 'deny', reason)],
      stderr: [`${PAYLOAD_MARKER}: ${label} 载荷形态无法识别（${normalized.detail}）`],
      status: normalized.status,
    }
  }

  const resolvedContext = typeof context === 'function' ? context(normalized.meta || {}) : context
  let denyReason = null
  let askReason = null
  for (const call of normalized.calls) {
    if (call.argsParseFailed) {
      denyReason = `${label}: ${PAYLOAD_MARKER} —— 工具调用 ${call.name || '(未命名)'} 的 args 声明为字符串但不是可解析 JSON；按 fail-closed 拒绝执行。`
      break
    }
    const verdict = evaluate(call, resolvedContext) || { decision: 'allow', reason: '' }
    if (verdict.decision === 'deny') {
      denyReason = verdict.reason
      break
    }
    if (verdict.decision === 'ask' && askReason === null) askReason = verdict.reason
  }
  if (denyReason) {
    return { exitCode: 2, stdout: [decisionJson(hookEventName, 'deny', denyReason)], stderr: [], status: 'deny' }
  }
  if (askReason) {
    return { exitCode: 0, stdout: [decisionJson(hookEventName, 'ask', askReason)], stderr: [], status: 'ask' }
  }
  return { exitCode: 0, stdout: [], stderr: [], status: 'allow' }
}

function readStdinSync() {
  try {
    return fs.readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

// 入口共用 main：stdin → core → stdout/stderr + exit code（薄 CLI，无判定逻辑）
function main(factory, argv) {
  const options = typeof factory === 'function' ? factory(argv || []) : factory
  const result = runHook({ ...options, stdin: readStdinSync() })
  for (const line of result.stdout) process.stdout.write(`${line}\n`)
  for (const line of result.stderr) process.stderr.write(`${line}\n`)
  return result.exitCode
}

// ── 实时上下文（生产路径）：git/文件系统读取；测试注入 stub 以保持判定确定性 ──
function liveContext(opts = {}) {
  const cwd = opts.cwd || process.cwd()
  const homeDir = opts.homeDir !== undefined ? opts.homeDir : (homedir() || '')
  return {
    workspace: opts.workspace || cwd,
    cwd,
    homeDir,
    appData: opts.appData !== undefined ? opts.appData : (process.env.APPDATA || ''),
    role: opts.role,
    readFile: opts.readFile,
    readSprintContext: opts.readSprintContext || defaultSprintContext,
    readReflog: opts.readReflog || defaultReflog,
    readBranch: opts.readBranch || defaultBranch,
  }
}

function runGit(args, cwd) {
  try {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 5000 })
    if (result.error || result.status !== 0) return null
    return String(result.stdout || '')
  } catch {
    return null
  }
}

function defaultReflog(operationRoot) {
  try {
    if (!fs.existsSync(path.join(operationRoot, '.git'))) return null
  } catch {
    return null
  }
  const out = runGit(['reflog', '--since=1 hour ago', '--format=%gs', 'HEAD'], operationRoot)
  return out === null ? null : out
}

function defaultBranch(operationRoot) {
  const out = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], operationRoot)
  return out === null ? null : out.trim()
}

function defaultSprintContext(operationRoot) {
  const docsRoot = path.join(operationRoot, 'docs')
  let dirs = []
  try {
    dirs = fs.readdirSync(docsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^sprint-\d+$/.test(entry.name))
      .map((entry) => ({ name: entry.name, n: Number(entry.name.slice('sprint-'.length)) }))
      .sort((a, b) => b.n - a.n)
  } catch {
    return {}
  }
  if (dirs.length === 0) return {}
  let currentSprint = 0
  try {
    const marker = fs.readFileSync(path.join(docsRoot, '.kixpower-current-sprint'), 'utf8').trim()
    if (/^\d+$/.test(marker)) currentSprint = Number(marker)
  } catch {
    currentSprint = 0
  }
  const chosen = dirs.find((dir) => dir.n === currentSprint) || dirs[0]
  const sprintDir = path.join(docsRoot, chosen.name)
  const readIfExists = (file) => {
    try {
      return fs.readFileSync(file, 'utf8')
    } catch {
      return null
    }
  }
  const progressMd = readIfExists(path.join(sprintDir, 'progress.md'))
  const planMd = readIfExists(path.join(sprintDir, 'plan.md'))
  const out = { sprintDir: chosen.name, progressMd, planMd }
  if (progressMd) {
    const fm = frontmatter(progressMd) || ''
    const boolOf = (key, fallback) => {
      const value = yamlScalar(fm, key)
      return value === '' ? fallback : value === 'true'
    }
    const brMatch = /blast_radius:[\s\S]*?commit_budget:\s*(\d+)/.exec(fm)
    if (brMatch) {
      out.branchRequired = boolOf('branch_required', true)
      out.blockForcePush = boolOf('block_force_push', true)
      out.blockDestructiveSql = boolOf('block_destructive_sql', true)
    }
    const warnMatch = /warn_threshold:\s*(\d+)/.exec(planMd || '')
    if (warnMatch) out.commitWarnThreshold = Number(warnMatch[1])
  }
  return out
}

module.exports = {
  // §B 移植面的**逐个导出**（同源断言的对象面；GUARDS_PORTED* 是同一集合的声明式镜像）
  ...GUARDS_PORTED,
  ...GUARDS_PORTED_LOCAL_HELPERS,
  ...GUARDS_PORTED_CONSTANTS,
  PAYLOAD_MARKER,
  AUTHORITY_FIELD_RE,
  EDIT_TOOLS,
  LOCAL_EDIT_TOOLS,
  BLOCKED_SOURCE_PATTERNS,
  // §B 同源移植声明（tests/hook-engine.test.js 的「同源函数体断言」以此为准）
  GUARDS_PORTED,
  GUARDS_PORTED_LOCAL_HELPERS,
  GUARDS_PORTED_CONSTANTS,
  // §A
  normalizePayload,
  parseJsonText,
  // §C
  canonicalToolName,
  suspiciousExecutionTool,
  terminalCommand,
  pathValues,
  normalizedPath,
  gitCommandParts,
  gitCommandPartsAll,
  gitWriteCommand,
  gitCommitCommand,
  terminalWriteCommand,
  sqlFileReferences,
  authorityLineOverlap,
  // §D
  verdictBlastRadius,
  verdictSourceEdit,
  verdictSourceEditQa,
  verdictDevAuthorityEdit,
  // §E
  runHook,
  main,
  liveContext,
  decisionJson,
}
