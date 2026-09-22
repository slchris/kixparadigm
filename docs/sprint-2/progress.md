---
sprint: 2
status: in_progress
last_updated: 2026-09-22
completed_tasks: 2
total_tasks: 5                          # T1..T5（plan.md §4）；HB-6 scoped trial 的收尾层由 task_sizing.closeout_layer 承载，不占 task 位
blocked_tasks: 0
open_issues: {P0: 0, P1: 0, P2: 0}      # 上游仓库 Issues 已禁用（hasIssuesEnabled: false）→ 缺陷只登记在本文件与 plan.md
artifacts_changed_since_last_observe:
  - skills/kixpower/scripts/kixpower-contract.cjs
  - skills/kixpower/tests/trust-chain.test.js
  - skills/kixpower/tests/ps1-parity.test.js
  - dsh/preset-classic/skills/kixpower/{scripts/kixpower-contract.cjs,tests/trust-chain.test.js,tests/ps1-parity.test.js}
  - en/preset-classic-en/skills/kixpower/{scripts/kixpower-contract.cjs,tests/trust-chain.test.js,tests/ps1-parity.test.js}
  - skills/kixpower/TEAM_CONVENTIONS.md（+2 preset 副本：host_requires / unavailable 三态 schema）
  - dsh/preset-classic/agents/*.agent.md（5 个死 hooks 块删除 + 措辞收敛）
  - en/preset-classic-en/agents/*.agent.md（同上 5 个）
observe_fingerprint: ef6a48550a40bf433555790419fd4c2fd0cf1483   # 规划期 HEAD（首次 Dev 分派前更新）
sprint_baseline_sha: ef6a48550a40bf433555790419fd4c2fd0cf1483   # 首次 Dev 前的 HEAD（完整 40 位）；Sprint 1 终态 rev（其 done.md 记 a3cdfb1 + 收尾补正 ef6a485，见 plan.md OQ0）
dev_self_tests_passed:
  - "node --test skills/kixpower/tests/trust-chain.test.js @ T1 — 13 tests / 13 pass / 0 fail / 0 skip（LG9；E2 characterization + E3 冻结凭据复算）"
  - "node --test skills/kixpower/tests/ps1-parity.test.js @ T1 — exit 1，`parity: unavailable — probe ENOENT`（LG10 = unavailable；**非 skip、非 pass**：2 tests / 1 pass（harness 自检）/ 1 fail（三态机的 unavailable 出口）/ 0 skip）"
  - "npm run test:installer @ T1+T5 — 25 tests / 20 pass / 0 fail / 5 skip（baseline 未变；P2/T4 才归零）"
  - "npm run test:consistency @ T1+T5 — CONSISTENCY OK（en 侧 JS 语法面 26 → 29，含新增 3 个 .cjs/.test.js）"
  - "MG5 镜像一致 @ T1 — md5 -q 三副本 kixpower-contract.cjs = fb457d327f0ad81a161bfb1ed7510196（trust-chain/ps1-parity 亦三副本同一 md5）"
  - "MG2 @ T5 — grep -rn \"^hooks:\\|\\.ps1\" dsh/preset-classic/agents en/preset-classic-en/agents | wc -l = 0；核对侧：grep -c \"^hooks:\" agents/*.agent.md = 5（Copilot 面保持）；ls skills/kixpower/hooks/*.ps1 | wc -l = 10（hooks 文件本身未删）"
l2_verification_passed: []              # placeholder — 仅 orchestrator 可写；本 Sprint 规划期尚未发生 L2
l2_verified_sha: null                   # placeholder — 完整 40 位 SHA
l2_gate_manifest_sha256: null           # placeholder — 规范化规则见 plan.md §7.2（HB-5 scoped trial 的交付）
l2_stash_refs: []                       # placeholder — L2 完成时 git stash list --format=%H 快照
qa_started_sha: null                    # placeholder — QA 启动时必须 == l2_verified_sha == HEAD
qa_verified_sha: null                   # placeholder — QA PASS/CONDITIONAL 证据对应的完整 HEAD
qa_gate_manifest_sha256: null           # placeholder — QA 签署时复核的同一 local_gate manifest
qa_test_changes: []
qa_session_marker: docs/.kixpower-qa-session.json
ci_pending: true                        # 规划期 CI 未跑；CONDITIONAL 只能因 CI gate pending（R4 open）
topology_used: sequential               # plan.md §5 properties = sequential（force_sequential: true；无强制时公式给 hybrid，ω=4/γ=0.34）
# === 规划期实测的宿主能力事实（本 Sprint 的核心前提）===
host_capabilities:
  pwsh: absent                          # 实测 command -v pwsh 空；brew formula powershell 7.6.6 (bottled, requires dotnet) 可安装
  node: "v22.14.0"
  npm: available
  brew: "7.0.1-21-gef55185"
pwsh_oracle: declined                    # 本会话未授权安装（调度指令：oracle 决策待用户确认）→ 按 plan.md §7.3 降级路径执行；LG10 = unavailable
blast_radius:
  commit_budget: 6                      # = plan.md task_sizing.derived_commit_budget（base2 + coupling2 + bug_reserve1 + closeout_layer1）；hook 强制读取
  branch_required: true
  block_force_push: true
  block_destructive_sql: true
---

# Sprint 2 Progress — 宿主平价（无 pwsh 宿主一等公民）

> 结构化真相源 = 本 frontmatter。正文任务行必须与 `completed_tasks` / `total_tasks` / `blocked_tasks` 一致。
> 计划见 `plan.md`；环境快照见 `runtime-context.md`；Sprint 1 → 2 漂移见 `drift-check.md`。

## 任务表

| ID | 任务 | 状态 | 依赖 | 说明 |
|---|---|---|---|---|
| T1 | 等价性取证基座：`kixpower-contract.ps1`(517) → `.cjs` + parity/characterization 骨架 + `host_requires`/`unavailable` 语义 + oracle 决策落盘 | [x] | — | 契约模块被 T2/T3 直接消费（`validate-memory-backlog.ps1:11` / `verification-fidelity-check.ps1:17` 均 dot-source）|
| T2 | `validate-memory-backlog.ps1`(89) → `.cjs` + 关闭 U-2 对拍 + `prompts/kixpower-new.prompt.md:80` 调用点改写 | [ ] | T1 | 逐字硬要求；DSH 上当前结构性不可执行 |
| T3 | `verification-fidelity-check.ps1`(320) → `.cjs` + `USAGE_MANUAL.md:365` / producer agent 调用点改写 + 首次真实运行追加 `drift-check.md` | [ ] | T1 | 解除 Sprint 1 的 `baseline_degraded` |
| T4 | `scripts/sync-dsh-preset.ps1`(197) → `.cjs` + 5 条 pwsh 类 skip 归零（`test:installer` 25/0/0）+ 新 `.cjs` 镜像登记 + 修 `checkSyntax` symlink 盲区 | [ ] | T1 | P2 的判据：本机 `25 pass / 0 fail / 0 skip` |
| T5 | P1：清 DSH 面向副本的 10 个死 `hooks:` 块（classic 5 + en 5）+ 收敛失效措辞 | [x] | — | **不删 `hooks/*.ps1`**；不动 root 的 Copilot 分发版（`agents/`）|

**合计**：5 任务，2 完成（T1、T5 = 层 1），0 阻塞。

> **T1 移交 T2/T3 的契约面**（消费者只需这些）：`frontmatter / yamlScalar / yamlList / inlineYamlList / indentedBlocks / planGateRecords / requiredLocalGates / gateManifestConflicts / gateManifestJson / sha256Hex / isSha`（plan.md §4-T1 步骤 A 清单；hooks 侧 helper 显式不移植）。
> **T5 的前向引用说明**：T5 把 DSH 面向 agent 里的两处脚本调用点一并改写为 Node 形态（orchestrator 的 validator、producer 的 fidelity）——这是 MG2（该目录 `.ps1` 计数 = 0）的必然要求；被引用的 `.cjs` 由同 Sprint 的 T2/T3（层 2）交付，故层 1 revision 上该引用是「同 Sprint 内前向指向」。

## 规划期实测事实（供 Dev / QA / L2 直接引用，勿重跑）

| # | 事实 | 证据（实读） |
|---|---|---|
| F1 | 本机**无 pwsh**；`brew info powershell` = formula 7.6.6 (bottled, `Required (1): dotnet`)；`brew info --cask powershell` = **Cask 不存在** | `command -v pwsh` 空；`brew info powershell` / `brew info --cask powershell` |
| F2 | `dsh/preset/{skills,agents}` 是 **symlink** → `../preset-classic/{skills,agents}` | `ls -la dsh/preset/`；`readlink dsh/preset/skills` = `../preset-classic/skills` |
| F3 | **既有未守护漂移**：`kixpower-contract.ps1` 源 **517 行**，`dsh/preset-classic/` 与 `en/preset-classic-en/` 副本各 **507 行**；`npm run test:consistency` 仍 `CONSISTENCY OK` | `wc -l` × 3；`diff -rq skills/kixpower dsh/preset-classic/skills/kixpower` |
| F4 | `checkSyntax` 有 **symlink 盲区**：`walk()` 用 `entry.isDirectory()`，不跟随符号链接 → `checkSyntax({rel:'dsh/preset'})` 走不到 `dsh/preset/skills/**` | `consistency-lib.cjs:26-34`、`:589-601`、`:695-699` |
| F5 | 一致性守护**不覆盖** `skills/kixpower/scripts/**`（检查面只有 plugins / install-lib.js / vision-bridge / persona 预算 / 链接 / 语法） | `consistency-lib.cjs:681-699` |
| F6 | DSH 面向 agent 面：10 个 `hooks:` 块（classic 5 + en 5；`kixpower-reviewer.agent.md` 无）；root `agents/*.agent.md` **无** DSH 适配注记（0/6）→ Copilot 面 | `grep -c "^hooks:"`；`grep -c "DSH 适配注记"` |
| F7 | `pwsh` 在 DSH 上**也是合法终端工具名**（≠ PowerShell 二进制依赖） | `dsh/preset/plugins/kix-guards.js:1117` = `TERMINAL_TOOLS = new Set(['pwsh','bash'])` |
| F8 | Sprint 1 的提交数实测 **9**（`done.md` 记 8）—— 多出 `ef6a485`（message 自述「前次受 commit 硬上限阻塞」） | `git rev-list --count c3c31eb..HEAD` = 9；`git log --oneline` |
| F9 | `verification-fidelity-check.ps1:17` 与 `validate-memory-backlog.ps1:11` 均 **dot-source** `kixpower-contract.ps1` → T2/T3 对 T1 是 **strong** 耦合 | 两个 `.ps1` 实读行号 |
| F10 | `sync-dsh-preset.ps1` **不**依赖契约脚本（`grep -c kixpower-contract` = 0）→ T4 对 T1 为 weak | 同上 |

## 必落盘的追踪行（供 QA / MG1–MG7 复核）

> 每条在对应任务完成时由执行者写入本节，格式固定，**不得留空或写「见上文」**。

| 行标签 | 何时写 | 内容要求 | 对应 gate |
|---|---|---|---|
| `pwsh-oracle:` | T1 步骤 D | `installed(<pwsh --version>)` / `failed(<brew 输出摘要>)` / `declined(用户否决)` | LG10、§7.4 |
| `parity-status:` | LG10 执行后 | `PASS` / `FAIL(<首个分歧 fixture>)` / `unavailable(<探针证据>)` | LG10、§7.3 |
| `R1-digest-recompute:` | LG9 执行后 | `match` / `mismatch(<本实现值>, first_divergence=<点>)` / `undetermined(<缺的证据>)` | MG3 |
| `U2-parity:` | T2 完成后 | `record_count` / `legacy_unstructured_records` / exit code 三元组 × 对照源；不可比写 `not-comparable` | MG4 |
| `ps1-drift:` | 规划期已写（F3） | 517 vs 507 与「守护仍 OK」的对照 | MG6 |
| `T*-evidence:` | 各任务完成时 | 独立于被改文件自身断言的证据（同 Sprint 1 的 MG3/MG6 口径） | QA 逐条 |

`ps1-drift:` `skills/kixpower/scripts/kixpower-contract.ps1` = **517 行**；`dsh/preset-classic/skills/kixpower/scripts/kixpower-contract.ps1` = **507 行**；`en/preset-classic-en/skills/kixpower/scripts/kixpower-contract.ps1` = **507 行**；同 revision 上 `npm run test:consistency` = `CONSISTENCY OK` → `skills/**` 不在守护面内（F3/F5）。**本 Sprint 不修该漂移**（plan.md §2），但新 `.cjs` 必须登记镜像（T4 步骤 B），否则复现同一漂移。

### 实测落盘行（T1 / T5，层 1）

```yaml
- tag: pwsh-oracle
  value: declined（本会话调度指令明确「不要安装 pwsh，oracle 决策待用户确认」→ 未尝试 brew install）
  fallback: plan.md §7.3 降级路径（LG10 记 unavailable；E1 通道不存在）
- tag: parity-status
  value: unavailable（探针证据：`parity: unavailable — probe ENOENT: pwsh not found on PATH`；进程 exit 1 但**不是** FAIL）
  how: node --test skills/kixpower/tests/ps1-parity.test.js → 2 tests / 1 pass（harness 自检，不需 oracle）/ 1 fail（unavailable 出口）/ 0 skip
- tag: R1-digest-recompute
  value: undetermined（LG10 = unavailable 时的最高可达结论）
  observed: mismatch —— 本实现按 plan.md §7.2 规范化（field_set=[id,type,cmd,expect,required]、compact JSON、sha256(utf8)）复算 docs/sprint-1/plan.md（a3cdfb1）的 8 条 required local_gate = b533cf263e04895bc54b776e0542d433a2a222e372ceeb55970810654af08b0d ≠ 冻结凭据 46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb
  first_divergence: expect 字段提取语义（§7.2 的 canonical 语义取 `expect:` 行首字面量 —— 6 条 gate 的 `expect: >-` 折叠块取到 `>-`；YAML 语义读取取折叠正文）
  order_ambiguity_refuted: culture-aware（Intl.Collator/en-US，ICU 与 .NET 5+ 同引擎）与 UTF-16 码位序**给出同一顺序**（LG1,LG10,LG11,LG2,...）→ plan.md §7.2 把 culture 序当作 natural 序的假设被实测否证；**排序不可能是 R-1 的分歧来源**
  extra_probe: 另枚举 720 组规范化组合（6 字段集 × 4 排序 × 2 required 形态 × 5 序列化 × 2 expect 提取 × 2 plan revision）仍无命中 → 记录值的提取口径不可从冻结文本反推
  missing_evidence: 缺「在具备 oracle 的宿主上执行 canonical Get-KixGateManifestJson」这一条证据（LG10 = unavailable）→ 无法裁决「记录值有误」还是「本实现提取口径不同」
  falsifier: 在有 pwsh 的宿主上跑 `node --test skills/kixpower/tests/ps1-parity.test.js`（LG10 转 PASS）后重算；命中 46121655… 即关闭 U-1，否则 R-1 升级为「记录值有误 → L2/QA 需重绑」
- tag: T1-evidence
  value: 契约模块三副本 md5 一致（fb457d327f0ad81a161bfb1ed7510196）；LG9 = 13/13（含负向控制见 T2 追加）；ps1-parity 的 oracle 输入（参照实现 .ps1）存在性由 harness 自检断言；§7.2 可复算性由 fixture 的**逐字 manifest 字符串**断言（非仅「测试绿」）
- tag: T5-evidence
  value: grep -rn "^hooks:\|\.ps1" dsh/preset-classic/agents en/preset-classic-en/agents = 0 行；反向控制：root `agents/*.agent.md` 的 `^hooks:` = 5（Copilot 面未动）；`skills/kixpower/hooks/*.ps1` = 10 个文件仍在（未删文件本身）
```

## Trace Log

```yaml
- at: 2026-09-22
  stage: producer_planning
  stage_signal: planning artifact
  actor: kixpower-producer (Remy)
  artifacts:
    - docs/sprint-2/plan.md
    - docs/sprint-2/progress.md
    - docs/sprint-2/runtime-context.md
    - docs/sprint-2/drift-check.md
    - PROJECT_BRIEF.md §8/§11（追加修改）
  note: >-
    Sprint 2 规划产出。范围 = 客户确认的三块（P0 trust-chain Node 化 / P1 DSH 面死 hooks 清理 / P2 sync-dsh-preset Node 化），
    外加结构性项（host_requires 一等维度）折叠进 T1。derived_commit_budget = 6（≤ 环境级 1 小时 / 10-commit 硬窗口的可用额度）。
    规划期未执行任何 canonical 测试命令（Producer 不替 Dev/QA 跑测试）；基线计数取自 Sprint 1 done.md §2 的终态记录。
  l2_manifest: null
- at: 2026-09-22
  stage: dev_layer1
  stage_signal: T1 + T5 完成（层 1；每 DAG 层 1 个 commit）
  actor: kixpower-dev (Nova/Sage/Milo)
  artifacts:
    - skills/kixpower/scripts/kixpower-contract.cjs（+2 副本）
    - skills/kixpower/tests/trust-chain.test.js（+2 副本）
    - skills/kixpower/tests/ps1-parity.test.js（+2 副本）
    - skills/kixpower/TEAM_CONVENTIONS.md（+2 副本，v5.8 宿主能力维度）
    - dsh/preset-classic/agents/*.agent.md ×5 + en/preset-classic-en/agents/*.agent.md ×5（死 hooks 块清理）
    - docs/sprint-2/progress.md
  note: >-
    T1：契约 helper 的 Node 实现（只移植 trust-chain 消费者所需的 11 个函数，hooks 侧 helper 为 explicit non-goal），
    三态等价性取证基座落地（`parity: PASS|FAIL|unavailable`；unavailable 走显式非 0 而非 skip，使 gate 可机械区分）。
    E1 = unavailable（无 oracle，用户未授权安装）；E2 = characterization 13/13 绿；E3 = 复算值 b533cf26… ≠ 冻结 46121655…，
    结论按 MG3 封顶为 undetermined，但附带否证了 §7.2 的 order_ambiguity 假设（两种排序同序）。
    T5：10 个 DSH 面向 agent 的死 hooks 块删除 + 措辞收敛（含两处 .ps1 调用点改写为 Node 形态，见任务表下的前向引用说明）。
    本层未运行 npm test / cd en && npm test（收尾层执行）；层内已跑 test:installer / test:consistency / LG9 / LG10。
  l2_manifest: null
```

## 阻塞与风险（实时）

| # | 项 | 级别 | 当前处置 |
|---|---|---|---|
| R4（继承 Sprint 1） | fork 无 workflow 注册 + 未授权 push/PR → CG1/CG2/CG3 不可达 | 高（`release_eligible` 唯一开口） | 记 `ci_pending: true`；不得由 agent 自行 push/PR |
| OQ2 | pwsh oracle 安装是否被授权 | 中（决定 LG10 是 PASS 还是 `unavailable`） | T1 步骤 D 尝试；失败/被拒走 plan §7.3 降级路径（预置为合法路径） |
| 环境级硬约束 | `kix-guards` blast radius：**1 小时窗口内 10 个 commit 硬上限（含 amend）**，Sprint 1 已因此被拦一次（`ef6a485`） | 高 | plan §6 `realized_check`：**每 DAG 层合并为 1 个 commit** 为默认要求；窗口耗尽则记 `blocked` 转 `/kixpower-continue` |
