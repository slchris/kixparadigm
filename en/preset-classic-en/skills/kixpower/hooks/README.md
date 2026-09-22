# kixpower hooks — 宿主状态台账（Sprint 2 / 方案 B：单一 Node 引擎）

> **本文件是 hook 面的唯一状态台账**，3 副本字节一致（`skills/` · `dsh/preset-classic/skills/` · `en/preset-classic-en/skills/`）。
> 生成依据：`docs/sprint-2/plan.md` §13.0 的覆盖裁决（机械判据，不投票）+ `DSH-ADAPTATION.md:47-53,64` 的逐 hook 实读
> （该文件位于 `dsh/preset-classic/`，本仓库根目录无副本）。
>
> **证据强度边界（先读这一条）**：本 Sprint 对已移植 hook 的结论只到
> **E0（characterization：输出符合从 `.ps1` 反推的固定期望）+ E2（同源断言：函数体/常量/共享语料与 `kix-guards.js` 逐字一致）**。
> 与 `.ps1` 的**逐字节差分（E1）在无 `pwsh` 宿主上永久 `unavailable`**（本机无 pwsh），只在 CI 通道取证（CG4）。
> 因此**不得**把本表读成「与 `.ps1` 行为等价」——那需要 E1 通过。

## 1. 宿主状态表（全部 10 个 hook）

| hook | 源行数 | root `agents/` 声明数 | 类别 | 本 Sprint | canonical 入口 | DSH 侧等价物（实读行号） |
|---|---|---|---|---|---|---|
| `blast-radius-check` | 556 | 5 | **L1 deny** | **H-set-A（已移植）** | `blast-radius-check.cjs` | ✅ `:48` → `plugins/kix-guards.js`（pre-execute，原生 live） |
| `block-source-edit` | 203 | 2 | **L1 deny** | **H-set-A（已移植）** | `block-source-edit.cjs`（`--role producer\|orchestrator`） | ⚠️ `:51` 未移植（DSH 侧保留为 prompt 硬约束） |
| `block-source-edit-qa` | 193 | 1 | **L1 deny** | **H-set-A（已移植）** | `block-source-edit-qa.cjs` | ⚠️ `:51` 同上 |
| `block-dev-authority-edit` | 186 | 2 | **L1 deny** | **H-set-A（已移植）** | `block-dev-authority-edit.cjs` | ⚠️ `:51` 同上 |
| `validate-handoff` | 365 | 1 | L2 trust | H-set-B（未移植） | —（仍 `pwsh`） | ✅ `:49` 核心 → `plugins/kix-orchestration.js`；深度部分 `:50` 不移植 |
| `validate-qa-signoff` | 201 | 1 | L2 trust | H-set-B（未移植） | —（仍 `pwsh`） | ❌ `:52` 不移植（L2 manifest / QA session 为 Copilot 特有） |
| `qa-freshness-check` | 134 | 1 | L2 trust（marker 写入侧） | H-set-B（未移植） | —（仍 `pwsh`） | ❌ `:52` 同上 |
| `cleanup-qa-session` | 41 | 1 | L3（cleanup） | H-set-B（未移植） | —（仍 `pwsh`） | ❌ `:52` 同上 |
| `auto-update-progress` | 55 | 1 | L3（remind，fail-open） | H-set-B（未移植） | —（仍 `pwsh`） | ❌ `:52` 同上 |
| `pre-commit-lint-check` | 195 | 5 | L3（remind，**fail-open**，`:7` 自述） | H-set-B（未移植） | —（仍 `pwsh`） | ⚠️ `:64` 部分（`kix-discipline` 的编辑记账侧） |

**H-set-A = 4 个（1138 行源）；H-set-B = 6 个（991 行源）**。类别判据（`plan.md` §13.0）：
**L1** = 非 fail-open 的 deny 类，其不存在会直接使「越界写 / 不可逆破坏」无门禁；
**L2** = 校验 L2/QA 信任链产物（handoff / qa-signoff / freshness marker）；
**L3** = remind / cleanup 级，不存在只降低纪律，不产生不安全状态。

## 2. H-set-B（未移植）promotion 判据 —— 全部满足才开工

| H-set-B 项 | promotion 判据 |
|---|---|
| `validate-qa-signoff` + `qa-freshness-check` + `cleanup-qa-session`（**必须同批**） | ① 本 Sprint 的 payload 归一化层通过 LG15；② `docs/.kixpower-qa-session.json` 机制仍在用（Copilot 侧 L2/QA 流程未废弃）。**三者共享 QA session marker 语义**，分批移植会出现「marker 只写不读 / 只读不写」 |
| `validate-handoff` | Copilot 侧的「深度部分」（worktree 登记 / `plan_snapshot_sha` / `l2_gate_manifest_sha256` / stash / reverify marker）仍在 release 判据中 |
| `auto-update-progress` | 出现 **≥2 次**「Dev 完成编辑但 `progress.md` 未同步」的实例（remind 级，fail-open） |
| `pre-commit-lint-check` | Copilot 侧 lint 覆盖成为 `release_eligible` 判据；或出现 **≥1 次**「提交未过 lint 且 CI 未拦」实例 |

## 3. canonical 声明（与 T9 一致）

- 已移植 4 个 hook 的 **`.cjs` 是唯一 canonical 入口**，命令形态统一为
  `node "{{COPILOT_HOME}}/skills/kixpower/hooks/<name>.cjs"`（三平台同一字符串，`{{HOOK_LAUNCHER}}`/`{{HOOK_EXT}}` 占位符层已随 Sprint 2 T7 彻底移除）。
  判定层实现只有一份：`hooks/lib/kix-verdict.cjs`（3 副本），其纯函数与常量对
  `dsh/preset/plugins/kix-guards.js` 的 `__internals` / 源文本做**逐字同源断言**（`tests/hook-engine.test.js`，LG15）。
- 同名 **`.ps1` 为 `deprecated` 参照实现**：保留全部 10 × 3 副本（源 2129 行），**不删除、不改写**。
  它们是 ① E1 差分对拍的 oracle 输入、② H-set-B 的移植参照。
  删除的最早时点（四条判据全部满足）：① H-set-A 的 Node 入口在真实 Copilot 会话中被确认生效（`OQ8` 解）；
  ② Windows 侧 Node 等价验证完成；③ 至少一个 minor 版本的 `deprecated` 窗口；④ `CHANGELOG` 记破坏性变更说明。

## 4. 未移植 hook 在无 `pwsh` 宿主上的行为（**不许静默**）

- 6 个 H-set-B hook 在 root `agents/*.agent.md` 里的命令**仍是** `pwsh -NoProfile -File "…/<name>.ps1"`
  （只在未移植的那 6 条声明处追加了宿主能力条件注记，命令与声明数未改）。
- 在**没有 `pwsh` 的宿主**（macOS / 多数 Linux 默认）上这些命令**不会触发**：`pwsh` 不存在 → spawn 失败，
  而「hook spawn 失败 = deny 还是 ignore」**尚未取证**（登记为 `OQ8`，本 Sprint 不解）。
  → 它们**不是**「已生效的门禁」：无 pwsh 宿主上，L2/QA 信任链（handoff / qa-signoff / freshness）**没有机械保护**，
  只有 prompt 层约束；任何「已覆盖」的说法都属假绿。
- Windows + VS Code Copilot 路径上 `pwsh` 存在 → 这 6 条声明仍按原语义工作；**保留声明 = 不回退**（删除才是功能回退）。
- 本仓库自身的 DSH 面（`dsh/preset*/**`）**不携带 Copilot hooks 块**（Sprint 2 T5 已清空，本 Sprint 不回填）；
  DSH 侧的机械门禁由 `plugins/kix-guards.js` + `plugins/kix-orchestration.js` 承担，与上表「DSH 侧等价物」列一致。
