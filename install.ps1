# Kix Bundle — Installer (Windows / PowerShell)
#
# Usage:
#   ./install.ps1                    # install to $HOME\.copilot (default)
#   ./install.ps1 -Target C:\opt\copilot
#   ./install.ps1 -Uninstall
#   ./install.ps1 -DryRun
#   ./install.ps1 -SkipMemories      # skip user memory import
#   ./install.ps1 -Yes               # unattended: skip the proceed confirmation
#
# Unattended contract (scripts / CI): `-Yes` is the ONLY accepted consent for a caller whose
# stdin is redirected. Without it a redirected stdin fails closed with the machine-readable
# marker KIX-INSTALLER-CONFIRM-REQUIRED and exit 3 -- stdin is not read at all, because a
# connected-but-silent pipe would block forever (a hang is worse than a loud refusal).
# Contract change: piping `y` into the installer is no longer accepted (was exit 0).
# 无人值守契约：stdin 被重定向时必须显式传 -Yes；否则不读 stdin、打印
# KIX-INSTALLER-CONFIRM-REQUIRED 并以 exit 3 失败关闭。
# Exit codes: 0 ok / aborted by user · 1 fail-closed (KIX-INSTALLER-NO-NODE,
#   KIX-INSTALLER-RESIDUE, general failure) · 3 KIX-INSTALLER-CONFIRM-REQUIRED
#   (2 reserved for future usage errors).
#
# What it does:
#   1. Detects COPILOT_HOME (default $HOME\.copilot)
#   2. Detects VS Code prompts folder ($env:APPDATA\Code\User\prompts)
#   3. Detects VS Code memory folder ($env:APPDATA\Code\User\globalStorage\github.copilot-chat\memory-tool\memories)
#   4. Copies every bundle skill containing SKILL.md -> $COPILOT_HOME\skills\
#   5. Copies the curated agent/instruction/prompt manifests
#   6. Copies curated user memories -> $VSCODE_MEMORY_DIR\ (unless -SkipMemories)
#   7. Replaces the only real placeholder in *.agent.md:
#        {{COPILOT_HOME}}  -> $COPILOT_HOME (forward slashes)
#      Hook commands are literal cross-platform launchers (`node ".../<hook>.cjs"`) -> the old
#      per-platform hook-launcher / hook-extension placeholder layer is gone entirely.
#   8. Fails closed on: missing/too-old node (KIX-INSTALLER-NO-NODE), any unresolved `{{`
#      left in the installed agents (KIX-INSTALLER-RESIDUE), and a redirected stdin without
#      -Yes (KIX-INSTALLER-CONFIRM-REQUIRED, exit 3).
#
# Idempotent: rerunning overwrites existing files.

[CmdletBinding()]
param(
    [string]$Target,
    [switch]$Uninstall,
    [switch]$DryRun,
    [switch]$SkipMemories,
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'

# --- Resolve bundle root (parent of this script) ---
$BundleRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- Defaults ---
if ($Target) {
    $CopilotHome = $Target
} else {
    $CopilotHome = if ($env:COPILOT_HOME) { $env:COPILOT_HOME } else { Join-Path $HOME '.copilot' }
}

$VscodePromptsDefault  = Join-Path $env:APPDATA 'Code\User\prompts'
$VscodeMemoryDefault   = Join-Path $env:APPDATA 'Code\User\globalStorage\github.copilot-chat\memory-tool\memories'

# --- Output helpers ---
function Show-Info([string]$msg) { Write-Host "[i] $msg" -ForegroundColor Cyan }
function Show-OK([string]$msg)   { Write-Host "[v] $msg" -ForegroundColor Green }
function Show-Warn([string]$msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Show-Err([string]$msg)  { Write-Host "[x] $msg" -ForegroundColor Red }

# --- Runtime prerequisite (方案 B：hooks 与 trust-chain 均为 Node 单一引擎) ---
# `node` 从「npm 包的 engines 约束」升为**宿主硬前置**：Copilot 侧 4 个 hook 入口与
# trust-chain 校验都靠它。装完不报错却在运行时静默失效，正是本 Sprint 要消灭的
# silent failure（LL-8）→ 缺 node 或版本 < 20.16 一律非零退出，且 -DryRun 同样判定。
$NodeMinMajor = 20
$NodeMinMinor = 16
function Assert-NodeRuntime([string]$Phase) {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Show-Err "KIX-INSTALLER-NO-NODE: node not found on PATH (phase: $Phase)"
        Show-Err "  Copilot hooks + trust-chain are Node engines; install node >= $NodeMinMajor.$NodeMinMinor and re-run."
        exit 1
    }
    $version = ("$(& node --version 2>$null)" -replace '^v', '').Trim()
    $parts = $version.Split('.')
    $major = 0
    $minor = 0
    if ($parts.Count -ge 1) { [void][int]::TryParse($parts[0], [ref]$major) }
    if ($parts.Count -ge 2) { [void][int]::TryParse($parts[1], [ref]$minor) }
    if ($major -lt $NodeMinMajor -or ($major -eq $NodeMinMajor -and $minor -lt $NodeMinMinor)) {
        Show-Err "KIX-INSTALLER-NO-NODE: node $version < $NodeMinMajor.$NodeMinMinor (phase: $Phase)"
        exit 1
    }
    Show-Info "node $version OK (>= $NodeMinMajor.$NodeMinMinor) [phase: $Phase]"
}

# --- Asset policy (for install, uninstall, and plan display) ---
# Skills are convention-based: every directory containing SKILL.md is public.
$Skills = @(
    Get-ChildItem -Path (Join-Path $BundleRoot 'skills') -Directory |
        Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') } |
        Sort-Object Name |
        ForEach-Object { $_.Name }
)
if ($Skills.Count -eq 0) { throw 'No installable skills found under bundle skills/' }
$Agents = @('kixparadigm', 'kixpower-dev', 'kixpower-orchestrator', 'kixpower-producer', 'kixpower-qa', 'kixpower-reviewer')
$Instructions = @('kixparadigm-core')
$Prompts = @('kixpower', 'kixpower-continue', 'kixpower-import', 'kixpower-new', 'kixpower-review')
# Memories are deliberately curated: DSH capability data and legacy notes are not user-memory defaults.
$Memories = @('ai-agent-practices', 'vscode-copilot-customization', 'ai-test-pruning')

# --- Uninstall ---
if ($Uninstall) {
    Show-Info "Removing kix bundle from $CopilotHome ..."
    foreach ($s in $Skills) {
        $p = Join-Path $CopilotHome "skills\$s"
        if (Test-Path $p) { if (-not $DryRun) { Remove-Item -Recurse -Force $p }; Show-OK "Removed $p" }
    }
    foreach ($a in $Agents) {
        $p = Join-Path $CopilotHome "agents\$a.agent.md"
        if (Test-Path $p) { if (-not $DryRun) { Remove-Item -Force $p }; Show-OK "Removed $p" }
    }
    foreach ($i in $Instructions) {
        $p = Join-Path $CopilotHome "instructions\$i.instructions.md"
        if (Test-Path $p) { if (-not $DryRun) { Remove-Item -Force $p }; Show-OK "Removed $p" }
    }
    if (Test-Path $VscodePromptsDefault) {
        foreach ($p in $Prompts) {
            $fp = Join-Path $VscodePromptsDefault "$p.prompt.md"
            if (Test-Path $fp) { if (-not $DryRun) { Remove-Item -Force $fp }; Show-OK "Removed $fp" }
        }
    }
    if (-not $SkipMemories -and (Test-Path $VscodeMemoryDefault)) {
        foreach ($m in $Memories) {
            $fp = Join-Path $VscodeMemoryDefault "$m.md"
            if (Test-Path $fp) { if (-not $DryRun) { Remove-Item -Force $fp }; Show-OK "Removed $fp" }
        }
    }
    Write-Host ''
    Show-Info 'Uninstall complete.'
    exit 0
}

# --- Pre-flight ---
if (-not (Test-Path (Join-Path $BundleRoot 'skills\kixpower'))) {
    Show-Err "Bundle root not found: $BundleRoot\skills\kixpower"
    Show-Err 'Run this script from inside the extracted kix-bundle directory.'
    exit 1
}

# node 前置在写入前就判定：宁可什么都不装，也不要「装完即失效」（fail-closed）。
Assert-NodeRuntime 'pre-flight'

$VscodePrompts = ''
if (Test-Path $VscodePromptsDefault) {
    $VscodePrompts = $VscodePromptsDefault
} else {
    Show-Warn "VS Code prompts folder not found: $VscodePromptsDefault"
}

$VscodeMemory = ''
if (-not $SkipMemories) {
    if (Test-Path $VscodeMemoryDefault) {
        $VscodeMemory = $VscodeMemoryDefault
    } else {
        # memory 目录在用户首次使用 Copilot memory 功能后才存在；尝试创建（递归）
        $VscodeMemory = $VscodeMemoryDefault
        Show-Warn "VS Code memory folder not found; will create: $VscodeMemory"
    }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Show-Warn 'git not found (needed by kixpower blast-radius-check / fidelity-check).'
}

# --- Confirm plan ---
Write-Host ''
Show-Info '=== Install plan ==='
Show-Info "  Bundle source:    $BundleRoot"
Show-Info "  Copilot home:     $CopilotHome"
if ($VscodePrompts) { Show-Info "  VS Code prompts:  $VscodePrompts" } else { Show-Info '  VS Code prompts:  SKIP (folder missing)' }
if ($VscodeMemory)  { Show-Info "  VS Code memory:   $VscodeMemory"  } else { Show-Info '  VS Code memory:   SKIP' }
Show-Info "  Skills ($($Skills.Count)):       $($Skills -join ', ')"
Show-Info "  Agents ($($Agents.Count)):        $($Agents -join ', ')"
Show-Info "  Instructions ($($Instructions.Count)):  $($Instructions -join ', ')"
Show-Info "  Prompts ($($Prompts.Count)):       $($Prompts -join ', ')"
Show-Info "  Memories ($($Memories.Count)):      $($Memories -join ', ')"
Show-Info '  Hook launcher:    node (cross-platform, .cjs entries)'
Show-Info "  Node required:    >= $NodeMinMajor.$NodeMinMinor (KIX-INSTALLER-NO-NODE otherwise)"
if ($DryRun) { Show-Info '  Mode:             DRY-RUN (no writes)' }
Write-Host ''

# --- Consent gate (Sprint 3 T2; 与 install.sh 的契约表逐条对称) ---
# 原缺陷：`$ErrorActionPreference = 'Stop'`（:34）+ 裸 `Read-Host` ⇒ EOF 时抛错即中止，
# 本该执行的 Aborted 路径不可达（与 install.sh 的 `set -e` + 裸 `read` 同族）。
# 三态：① -Yes → 不提示、不读 stdin，直接执行；② stdin 被重定向且无 -Yes → 打标记、exit 3，
#       **不读 stdin**（连接但静默的管道会无限阻塞，挂死比明确报错更坏）；③ 真 TTY → 原交互路径。
if ($Yes) {
    Show-Info 'Unattended mode (-Yes): skipping the proceed confirmation.'
} elseif ([Console]::IsInputRedirected) {
    Show-Err 'KIX-INSTALLER-CONFIRM-REQUIRED: stdin is redirected and -Yes was not given'
    Show-Err '  Non-interactive installs must opt in explicitly: .\install.ps1 -Yes [target]'
    exit 3
} else {
    $confirm = ''
    try { $confirm = Read-Host 'Proceed? [y/N]' } catch { $confirm = '' }
    if ($confirm -ne 'y') { Show-Info 'Aborted.'; exit 0 }
}

# --- Execute ---
function New-DirIfMissing($path) {
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

New-DirIfMissing (Join-Path $CopilotHome 'skills')
New-DirIfMissing (Join-Path $CopilotHome 'agents')
New-DirIfMissing (Join-Path $CopilotHome 'instructions')
if ($VscodePrompts) { New-DirIfMissing $VscodePrompts }
if ($VscodeMemory)  { New-DirIfMissing $VscodeMemory }

# 1. Skills
foreach ($s in $Skills) {
    $src = Join-Path $BundleRoot "skills\$s"
    $dst = Join-Path $CopilotHome "skills\$s"
    if (-not (Test-Path $src)) { Show-Warn "skill source missing: $src"; continue }
    if (-not $DryRun) {
        if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
        Copy-Item -Recurse $src $dst
    }
    Show-OK "skill -> $dst"
}

# 2. Agents
foreach ($a in $Agents) {
    $src = Join-Path $BundleRoot "agents\$a.agent.md"
    $dst = Join-Path $CopilotHome "agents\$a.agent.md"
    if (-not (Test-Path $src)) { Show-Warn "agent source missing: $src"; continue }
    if (-not $DryRun) { Copy-Item $src $dst -Force }
    Show-OK "agent -> $dst"
}

# 3. Instructions
foreach ($i in $Instructions) {
    $src = Join-Path $BundleRoot "instructions\$i.instructions.md"
    $dst = Join-Path $CopilotHome "instructions\$i.instructions.md"
    if (-not (Test-Path $src)) { Show-Warn "instruction source missing: $src"; continue }
    if (-not $DryRun) { Copy-Item $src $dst -Force }
    Show-OK "instruction -> $dst"
}

# 4. Prompts
if ($VscodePrompts) {
    foreach ($p in $Prompts) {
        $src = Join-Path $BundleRoot "prompts\$p.prompt.md"
        $dst = Join-Path $VscodePrompts "$p.prompt.md"
        if (-not (Test-Path $src)) { Show-Warn "prompt source missing: $src"; continue }
        if (-not $DryRun) { Copy-Item $src $dst -Force }
        Show-OK "prompt -> $dst"
    }
} else {
    Show-Warn 'Prompts skipped (VS Code prompts folder missing).'
}

# 5. Memories
if ($VscodeMemory) {
    foreach ($m in $Memories) {
        $src = Join-Path $BundleRoot "memories\$m.md"
        $dst = Join-Path $VscodeMemory "$m.md"
        if (-not (Test-Path $src)) { Show-Warn "memory source missing: $src"; continue }
        if (-not $DryRun) { Copy-Item $src $dst -Force }
        Show-OK "memory -> $dst"
    }
} else {
    Show-Warn 'Memories skipped.'
}

# 拷贝完成后再判一次（装配面已就位 → 此刻缺 node 属「装完即失效」，必须挡住 ok 与收尾横幅）
Assert-NodeRuntime 'post-copy'

# 6. Replace the only real placeholder in agent.md (hook commands need forward-slash paths)
# 作用域命中数为 0 时不许假绿（原实现无条件 Show-OK）：如实报 skip。
$CopilotHomeFwd = $CopilotHome -replace '\\', '/'
$placeholderHits = 0
foreach ($a in $Agents) {
    # -DryRun 未落盘 → 作用域退回源文件，skip/ok 播报才不是「0 个」的假象
    $ap = if ($DryRun) { Join-Path $BundleRoot "agents\$a.agent.md" } else { Join-Path $CopilotHome "agents\$a.agent.md" }
    if (-not (Test-Path $ap)) { continue }
    if ((Get-Content -Raw $ap) -notmatch '\{\{COPILOT_HOME\}\}') { continue }
    $placeholderHits++
    if (-not $DryRun) {
        $content = Get-Content $ap -Raw
        $content = $content -replace '\{\{COPILOT_HOME\}\}', $CopilotHomeFwd
        Set-Content -Path $ap -Value $content -NoNewline
    }
}
if ($placeholderHits -eq 0) {
    Show-Warn 'skip: placeholder replace (0 agent files containing {{COPILOT_HOME}})'
} else {
    Show-OK "Replaced {{COPILOT_HOME}} in $placeholderHits agent.md file(s)"
}

# 7. INV-H1：装完残留 '{{' ⇒ 非零退出（hook 命令会指向不存在的文件 → 静默失效）
if ($DryRun) {
    $residue = @()
    foreach ($a in $Agents) {
        $src = Join-Path $BundleRoot "agents\$a.agent.md"
        if (-not (Test-Path $src)) { continue }
        $body = (Get-Content -Raw $src) -replace '\{\{COPILOT_HOME\}\}', ''
        if ($body -match '\{\{') { $residue += $src }
    }
} else {
    $residue = @(Get-ChildItem -Path (Join-Path $CopilotHome 'agents') -Filter '*.agent.md' -ErrorAction SilentlyContinue |
        Where-Object { (Get-Content -Raw $_.FullName) -match '\{\{' } |
        ForEach-Object { $_.FullName })
}
if ($residue.Count -gt 0) {
    Show-Err "KIX-INSTALLER-RESIDUE: unresolved '{{' left in agent manifests (hook commands would point at missing files):"
    foreach ($f in $residue) { Show-Err "    $f" }
    exit 1
}
Show-OK "residue check: 0 unresolved '{{' in agent manifests"

Write-Host ''
Show-Info '=== Install complete ==='
Write-Host 'Next steps:'
Write-Host '  1. Reload VS Code window (Command Palette -> "Developer: Reload Window")'
Write-Host '  2. kixparadigm: auto-active every session (core instructions). Say "/kixparadigm" for mode.'
Write-Host '  3. kixpower: in Copilot Chat type /kixpower-new (new project) or /kixpower-import (existing code)'
Write-Host '  4. Memories load on next Copilot Chat session (first ~200 lines auto-loaded)'
Write-Host ''
Write-Host 'To uninstall: ./install.ps1 -Uninstall'
