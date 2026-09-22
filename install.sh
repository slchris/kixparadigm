#!/usr/bin/env bash
# Kix Bundle — Installer (macOS / Linux)
#
# Usage:
#   ./install.sh                       # install to ~/.copilot (default)
#   ./install.sh /opt/copilot          # install to custom copilot home
#   ./install.sh --uninstall           # remove kix bundle
#   ./install.sh --dry-run             # preview without writing
#   ./install.sh --skip-memories       # skip user memory import
#   ./install.sh --yes                 # unattended: skip the proceed confirmation (-y)
#
# Unattended contract (scripts / CI): `--yes` (or `-y`) is the ONLY accepted consent
# for a non-TTY caller. Without it a non-TTY stdin fails closed with the machine-readable
# marker KIX-INSTALLER-CONFIRM-REQUIRED and exit 3 -- stdin is not read at all, because a
# connected-but-silent pipe would block forever (a hang is worse than a loud refusal).
# Contract change: `printf 'y\n' | ./install.sh` is no longer accepted (was exit 0).
# 无人值守契约：非 TTY 调用必须显式传 --yes/-y；否则不读 stdin、打印
# KIX-INSTALLER-CONFIRM-REQUIRED 并以 exit 3 失败关闭。
# Exit codes: 0 ok / aborted by user · 1 fail-closed (KIX-INSTALLER-NO-NODE,
#   KIX-INSTALLER-RESIDUE, general failure) · 3 KIX-INSTALLER-CONFIRM-REQUIRED
#   (2 reserved for future usage errors).
#
# What it does:
#   1. Detects COPILOT_HOME (default ~/.copilot)
#   2. Detects VS Code prompts folder
#   3. Detects VS Code memory folder
#   4. Copies every bundle skill containing SKILL.md -> $COPILOT_HOME/skills/
#   5. Copies the curated agent/instruction/prompt manifests
#   6. Copies curated user memories -> $VSCODE_MEMORY_DIR/ (unless --skip-memories)
#   7. Replaces the only real placeholder in *.agent.md:
#        {{COPILOT_HOME}}  -> $COPILOT_HOME
#      Hook commands are literal cross-platform launchers (`node ".../<hook>.cjs"`) that need
#      no per-platform substitution -> the old hook-launcher / hook-extension placeholder layer
#      is gone entirely (its tokens no longer appear anywhere in this installer).
#   8. Fails closed on: missing/too-old node (KIX-INSTALLER-NO-NODE), any unresolved
#      `{{` left in the installed agents (KIX-INSTALLER-RESIDUE), and a non-TTY call
#      without `--yes` (KIX-INSTALLER-CONFIRM-REQUIRED, exit 3).
#   9. chmod +x all .sh hooks/scripts under skills/ (reports `skip:` when the scope is empty)
#
# Idempotent: rerunning overwrites existing files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE_ROOT="${SCRIPT_DIR}"

ACTION="install"
DRY_RUN=0
SKIP_MEMORIES=0
ASSUME_YES=0
CUSTOM_TARGET=""

for arg in "$@"; do
  case "$arg" in
    --uninstall)     ACTION="uninstall" ;;
    --dry-run)       DRY_RUN=1 ;;
    --skip-memories) SKIP_MEMORIES=1 ;;
    -y|--yes)        ASSUME_YES=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) CUSTOM_TARGET="$arg" ;;
  esac
done

# --- Defaults ---
if [ -n "$CUSTOM_TARGET" ]; then
  COPILOT_HOME="$CUSTOM_TARGET"
else
  COPILOT_HOME="${COPILOT_HOME:-$HOME/.copilot}"
fi

# VS Code User folders vary by platform
GSUFFIX="Code/User"
case "$(uname -s)" in
  Darwin) VSCODE_BASE="$HOME/Library/Application Support/$GSUFFIX" ;;
  *)      VSCODE_BASE="${XDG_CONFIG_HOME:-$HOME/.config}/$GSUFFIX" ;;
esac

VSCODE_PROMPTS_DEFAULT="${VSCODE_PROMPTS_DIR:-$VSCODE_BASE/prompts}"
VSCODE_MEMORY_DEFAULT="${VSCODE_MEMORY_DIR:-$VSCODE_BASE/globalStorage/github.copilot-chat/memory-tool/memories}"

# --- Output helpers ---
info() { printf '\033[36m[i]\033[0m %s\n' "$1"; }
ok()   { printf '\033[32m[v]\033[0m %s\n' "$1"; }
warn() { printf '\033[33m[!]\033[0m %s\n' "$1"; }
err()  { printf '\033[31m[x]\033[0m %s\n' "$1"; }

run() { if [ "$DRY_RUN" -eq 1 ]; then echo "    (dry-run) $*"; else "$@"; fi; }

# --- Runtime prerequisite (方案 B：hooks 与 trust-chain 均为 Node 单一引擎) ---
# `node` 从「npm 包的 engines 约束」升为**宿主硬前置**：Copilot 侧 4 个 hook 入口与
# trust-chain 校验都靠它。装完不报错却在运行时静默失效，正是本 Sprint 要消灭的
# silent failure（LL-8）→ 缺 node 或版本 < 20.16 一律非零退出，且 --dry-run 同样判定。
NODE_MIN_MAJOR=20
NODE_MIN_MINOR=16
require_node_runtime() {
  local phase="$1" found version major minor rest
  found="$(command -v node 2>/dev/null || true)"
  if [ -z "$found" ]; then
    err "KIX-INSTALLER-NO-NODE: node not found on PATH (phase: $phase)"
    err "  Copilot hooks + trust-chain are Node engines; install node >= ${NODE_MIN_MAJOR}.${NODE_MIN_MINOR} and re-run."
    exit 1
  fi
  version="$("$found" --version 2>/dev/null | sed 's/^v//' || true)"
  major="${version%%.*}"
  rest="${version#*.}"
  minor="${rest%%.*}"
  case "$major" in ''|*[!0-9]*) major=0 ;; esac
  case "$minor" in ''|*[!0-9]*) minor=0 ;; esac
  if [ "$major" -lt "$NODE_MIN_MAJOR" ] || { [ "$major" -eq "$NODE_MIN_MAJOR" ] && [ "$minor" -lt "$NODE_MIN_MINOR" ]; }; then
    err "KIX-INSTALLER-NO-NODE: node $version < ${NODE_MIN_MAJOR}.${NODE_MIN_MINOR} (phase: $phase)"
    exit 1
  fi
  info "node $version OK (>= ${NODE_MIN_MAJOR}.${NODE_MIN_MINOR}) [phase: $phase]"
}

# --- Asset policy ---
# Skills are convention-based: every directory containing SKILL.md is public.
SKILLS=()
for skill_file in "$BUNDLE_ROOT"/skills/*/SKILL.md; do
  [ -f "$skill_file" ] || continue
  SKILLS+=("$(basename "$(dirname "$skill_file")")")
done
if [ "${#SKILLS[@]}" -eq 0 ]; then err "No installable skills found under bundle skills/"; exit 1; fi
AGENTS=(kixparadigm kixpower-dev kixpower-orchestrator kixpower-producer kixpower-qa kixpower-reviewer)
INSTRUCTIONS=(kixparadigm-core)
PROMPTS=(kixpower kixpower-continue kixpower-import kixpower-new kixpower-review)
# Memories are deliberately curated: DSH capability data and legacy notes are not user-memory defaults.
MEMORIES=(ai-agent-practices vscode-copilot-customization ai-test-pruning)

# --- Uninstall ---
if [ "$ACTION" = "uninstall" ]; then
  info "Removing kix bundle from $COPILOT_HOME ..."
  for s in "${SKILLS[@]}"; do
    p="$COPILOT_HOME/skills/$s"
    [ -d "$p" ] && { run rm -rf "$p"; ok "Removed $p"; }
  done
  for a in "${AGENTS[@]}"; do
    p="$COPILOT_HOME/agents/$a.agent.md"
    [ -f "$p" ] && { run rm -f "$p"; ok "Removed $p"; }
  done
  for i in "${INSTRUCTIONS[@]}"; do
    p="$COPILOT_HOME/instructions/$i.instructions.md"
    [ -f "$p" ] && { run rm -f "$p"; ok "Removed $p"; }
  done
  if [ -d "$VSCODE_PROMPTS_DEFAULT" ]; then
    for p in "${PROMPTS[@]}"; do
      fp="$VSCODE_PROMPTS_DEFAULT/$p.prompt.md"
      [ -f "$fp" ] && { run rm -f "$fp"; ok "Removed $fp"; }
    done
  fi
  if [ "$SKIP_MEMORIES" -eq 0 ] && [ -d "$VSCODE_MEMORY_DEFAULT" ]; then
    for m in "${MEMORIES[@]}"; do
      fp="$VSCODE_MEMORY_DEFAULT/$m.md"
      [ -f "$fp" ] && { run rm -f "$fp"; ok "Removed $fp"; }
    done
  fi
  echo ""
  info "Uninstall complete."
  exit 0
fi

# --- Pre-flight ---
if [ ! -d "$BUNDLE_ROOT/skills/kixpower" ]; then
  err "Bundle root not found: $BUNDLE_ROOT/skills/kixpower"
  err "Run this script from inside the extracted kix-bundle directory."
  exit 1
fi

# node 前置在写入前就判定：宁可什么都不装，也不要「装完即失效」（fail-closed）。
require_node_runtime "pre-flight"


VSCODE_PROMPTS=""
if [ -d "$VSCODE_PROMPTS_DEFAULT" ]; then
  VSCODE_PROMPTS="$VSCODE_PROMPTS_DEFAULT"
else
  warn "VS Code prompts folder not found: $VSCODE_PROMPTS_DEFAULT"
fi

VSCODE_MEMORY=""
if [ "$SKIP_MEMORIES" -eq 0 ]; then
  VSCODE_MEMORY="$VSCODE_MEMORY_DEFAULT"
  [ -d "$VSCODE_MEMORY_DEFAULT" ] || warn "VS Code memory folder will be created: $VSCODE_MEMORY"
fi

if ! command -v git >/dev/null 2>&1; then
  warn "git not found (needed by kixpower blast-radius-check / fidelity-check)."
fi

# --- Confirm plan ---
echo ""
info "=== Install plan ==="
info "  Bundle source:    $BUNDLE_ROOT"
info "  Copilot home:     $COPILOT_HOME"
[ -n "$VSCODE_PROMPTS" ] && info "  VS Code prompts:  $VSCODE_PROMPTS" || info "  VS Code prompts:  SKIP (folder missing)"
[ -n "$VSCODE_MEMORY" ]  && info "  VS Code memory:   $VSCODE_MEMORY"  || info "  VS Code memory:   SKIP"
info "  Skills (${#SKILLS[@]}):       ${SKILLS[*]}"
info "  Agents (${#AGENTS[@]}):        ${AGENTS[*]}"
info "  Instructions (${#INSTRUCTIONS[@]}):  ${INSTRUCTIONS[*]}"
info "  Prompts (${#PROMPTS[@]}):       ${PROMPTS[*]}"
info "  Memories (${#MEMORIES[@]}):      ${MEMORIES[*]}"
info "  Hook launcher:    node (cross-platform, .cjs entries)"
info "  Node required:    >= ${NODE_MIN_MAJOR}.${NODE_MIN_MINOR} (KIX-INSTALLER-NO-NODE otherwise)"
[ "$DRY_RUN" -eq 1 ] && info "  Mode:             DRY-RUN (no writes)"
echo ""

# --- Consent gate (Sprint 3 T1) ---
# 原缺陷：`set -euo pipefail`（:29）+ 裸 `read` ⇒ stdin EOF 时 read 返回非零，set -e 立即中止，
# 本该执行的 `info "Aborted."; exit 0` 不可达 ⇒ 表现为「静默 exit 1 且无任何输出」。
# 三态设计（plan.md §3.1 契约表）：
#   ① --yes/-y     → 不提示、不读 stdin，直接执行（无人值守唯一接受的同意形式）
#   ② 非 TTY 且无开关 → **不读 stdin**、打标记、exit 3。为何不「先读一行」：管道已连接但暂无
#      数据时 read 会无限阻塞 ⇒ 挂死比明确报错更坏（无输出、无退出码、不可机械判定）。
#   ③ TTY          → 照常提示；非 y / EOF / Ctrl-D ⇒ Aborted + exit 0（read 返回值必须显式接管）
if [ "$ASSUME_YES" -eq 1 ]; then
  info "Unattended mode (--yes): skipping the proceed confirmation."
elif [ ! -t 0 ]; then
  err "KIX-INSTALLER-CONFIRM-REQUIRED: stdin is not a TTY and --yes/-y was not given"
  err "  Non-interactive installs must opt in explicitly: ./install.sh --yes [target]"
  exit 3
else
  confirm=""
  if ! read -r -p "Proceed? [y/N] " confirm; then
    # EOF / Ctrl-D：显式接管 read 的非零返回，否则 set -e 会中止（正是本缺陷的根因）
    confirm=""
  fi
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then info "Aborted."; exit 0; fi
fi

# --- Execute ---
mkdir -p "$COPILOT_HOME/skills" "$COPILOT_HOME/agents" "$COPILOT_HOME/instructions"
[ -n "$VSCODE_PROMPTS" ] && mkdir -p "$VSCODE_PROMPTS"
[ -n "$VSCODE_MEMORY" ]  && mkdir -p "$VSCODE_MEMORY"

# 1. Skills
for s in "${SKILLS[@]}"; do
  src="$BUNDLE_ROOT/skills/$s"
  dst="$COPILOT_HOME/skills/$s"
  [ -d "$src" ] || { warn "skill source missing: $src"; continue; }
  run rm -rf "$dst"
  run cp -R "$src" "$dst"
  ok "skill -> $dst"
done

# 2. Agents
for a in "${AGENTS[@]}"; do
  src="$BUNDLE_ROOT/agents/$a.agent.md"
  dst="$COPILOT_HOME/agents/$a.agent.md"
  [ -f "$src" ] || { warn "agent source missing: $src"; continue; }
  run cp -f "$src" "$dst"
  ok "agent -> $dst"
done

# 3. Instructions
for i in "${INSTRUCTIONS[@]}"; do
  src="$BUNDLE_ROOT/instructions/$i.instructions.md"
  dst="$COPILOT_HOME/instructions/$i.instructions.md"
  [ -f "$src" ] || { warn "instruction source missing: $src"; continue; }
  run cp -f "$src" "$dst"
  ok "instruction -> $dst"
done

# 4. Prompts
if [ -n "$VSCODE_PROMPTS" ]; then
  for p in "${PROMPTS[@]}"; do
    src="$BUNDLE_ROOT/prompts/$p.prompt.md"
    dst="$VSCODE_PROMPTS/$p.prompt.md"
    [ -f "$src" ] || { warn "prompt source missing: $src"; continue; }
    run cp -f "$src" "$dst"
    ok "prompt -> $dst"
  done
else
  warn "Prompts skipped (VS Code prompts folder missing)."
fi

# 5. Memories
if [ -n "$VSCODE_MEMORY" ]; then
  for m in "${MEMORIES[@]}"; do
    src="$BUNDLE_ROOT/memories/$m.md"
    dst="$VSCODE_MEMORY/$m.md"
    [ -f "$src" ] || { warn "memory source missing: $src"; continue; }
    run cp -f "$src" "$dst"
    ok "memory -> $dst"
  done
else
  warn "Memories skipped."
fi

# 拷贝完成后再判一次（装配面已就位 → 此刻缺 node 属「装完即失效」，必须挡住 ok 与收尾横幅）
require_node_runtime "post-copy"

# 6. Replace the only real placeholder in agent.md
# 作用域命中数为 0 时不许假绿（原实现无条件 ok）：如实报 skip。
PLACEHOLDER_HITS=0
for a in "${AGENTS[@]}"; do
  # dry-run 未落盘 → 作用域退回源文件，skip/ok 播报才不是「0 个」的假象
  ap="$COPILOT_HOME/agents/$a.agent.md"
  [ "$DRY_RUN" -eq 1 ] && ap="$BUNDLE_ROOT/agents/$a.agent.md"
  [ -f "$ap" ] || continue
  if grep -q '{{COPILOT_HOME}}' "$ap" 2>/dev/null; then
    PLACEHOLDER_HITS=$((PLACEHOLDER_HITS + 1))
    if [ "$DRY_RUN" -eq 0 ]; then
      sed -i.bak -e "s|{{COPILOT_HOME}}|$COPILOT_HOME|g" "$ap"
      rm -f "$ap.bak"
    fi
  fi
done
if [ "$PLACEHOLDER_HITS" -eq 0 ]; then
  warn "skip: placeholder replace (0 agent files containing {{COPILOT_HOME}})"
else
  ok "Replaced {{COPILOT_HOME}} in $PLACEHOLDER_HITS agent.md file(s)"
fi

# 7. INV-H1：装完残留 '{{' ⇒ 非零退出（hook 命令会指向不存在的文件 → 静默失效）
if [ "$DRY_RUN" -eq 1 ]; then
  # dry-run 不落盘：对源文件扫描，先把已知占位符剔除，剩余的 '{{' 视为残留
  RESIDUE=""
  for a in "${AGENTS[@]}"; do
    src="$BUNDLE_ROOT/agents/$a.agent.md"
    [ -f "$src" ] || continue
    if sed 's|{{COPILOT_HOME}}||g' "$src" | grep -q '{{'; then RESIDUE="$RESIDUE $src"; fi
  done
else
  RESIDUE="$(grep -rl '{{' "$COPILOT_HOME/agents" 2>/dev/null || true)"
fi
if [ -n "$(printf '%s' "$RESIDUE" | tr -d '[:space:]')" ]; then
  err "KIX-INSTALLER-RESIDUE: unresolved '{{' left in agent manifests (hook commands would point at missing files):"
  for f in $RESIDUE; do err "    $f"; done
  exit 1
fi
ok "residue check: 0 unresolved '{{' in agent manifests"

# 8. chmod +x hooks/scripts（本 bundle 的 hook 已 Node 化：作用域 0 个 .sh ⇒ skip，不许假绿）
SH_SCOPE="$COPILOT_HOME/skills"
[ "$DRY_RUN" -eq 1 ] && SH_SCOPE="$BUNDLE_ROOT/skills"
SH_COUNT="$(find "$SH_SCOPE" -type f -name '*.sh' 2>/dev/null | grep -c . || true)"
if [ "$SH_COUNT" -eq 0 ]; then
  warn "skip: chmod +x (0 .sh files)"
elif [ "$DRY_RUN" -eq 1 ]; then
  warn "skip: chmod +x (dry-run; $SH_COUNT .sh files would be marked executable)"
else
  find "$SH_SCOPE" -type f -name '*.sh' -exec chmod +x {} \; 2>/dev/null || true
  ok "chmod +x on $SH_COUNT .sh hooks/scripts"
fi

echo ""
info "=== Install complete ==="
echo "Next steps:"
echo "  1. Reload VS Code window (Command Palette -> 'Developer: Reload Window')"
echo "  2. kixparadigm: auto-active every session (core instructions)."
echo "  3. kixpower: in Copilot Chat type /kixpower-new or /kixpower-import"
echo "  4. Memories load on next Copilot Chat session"
echo ""
echo "To uninstall: ./install.sh --uninstall"
