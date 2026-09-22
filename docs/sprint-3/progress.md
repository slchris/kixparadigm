---
sprint: 3
status: planning
last_updated: 2026-09-22
completed_tasks: 0
total_tasks: 6
blocked_tasks: 0
open_issues: {P0: 0, P1: 0, P2: 0}
artifacts_changed_since_last_observe: []
observe_fingerprint: 5c4d9aba59a584c64199510245dbc1724f310fb0
sprint_baseline_sha: 5c4d9aba59a584c64199510245dbc1724f310fb0
dev_self_tests_passed: []
l2_verification_passed: []
l2_verified_sha: null
l2_gate_manifest_sha256: null
l2_stash_refs: []
qa_started_sha: null
qa_verified_sha: null
qa_gate_manifest_sha256: null
qa_test_changes: []
ci_pending: true
qa_session_marker: docs/.kixpower-qa-session.json
topology_used: sequential
blast_radius:
  commit_budget: 6
  branch_required: true
  block_force_push: true
  block_destructive_sql: true
---

# Sprint 3 Progress — 发布解锁（release unlock）

> 本文件是 Sprint 3 的唯一进度真相源（`plan.md` §1.1 判据表为验收口径）。
> **规划期（`status: planning`）**：只登记计划、规划期只读取证与环境事实；**不得**出现执行期读数（未运行的 gate 一律写 `not run`）。

---

## 1. 任务状态

| ID | 任务 | 依赖 | 层 | 状态 |
|---|---|---|---|---|
| **T1** | `install.sh` 非交互健壮性（`--yes`/`-y` + 非 TTY fail-closed + exit 3 + 文档/测试） | — | 1 | `pending` |
| **T2** | `install.ps1` 对称实现（`-Yes` + 输入重定向检测） | T1 | 2 | `pending` |
| **T3** | CI 取证框架 + Sprint 2 run（`5c4d9ab`）逐 gate 定档（provisional） | — | 1 | `pending` |
| **T4** | `sync-dsh-preset.cjs` 大小写对称修复 + 单侧归一化审计 + 本地可执行回归 | — | 1 | `pending` |
| **T5** | `ci.yml` 新增 installer 无人值守验证（CG5 载体） | T1, T2 | 3 | `pending` |
| **T6** | 收尾：`done.md` + L4 + memory + `release_eligible` 重判 + 终局 SHA 取证 | T3, T4, T5 | 4 | `pending` |

`completed_tasks: 0 / total_tasks: 6 / blocked_tasks: 0`

---

## 2. Trace Log

### 2026-09-22 · `producer_planning`（Remy）· phase=planning

| 项 | 记录 |
|---|---|
| **触发** | Sprint 2 收尾（`done` + `release_eligible: false` + QA `CONDITIONAL`，唯一理由 = CI gate pending）⇒ 进入 Sprint 3 规划 |
| **用户范围决策（逐字要点）** | 在四个选项中**明确选定 A**：「先解锁发布 —— installer 非交互健壮性 + CI 取证」；并**授权 push 到 fork + 开 PR**。**明确未选** H-set-B（6 个 hook 移植）与「DSH 插件为主路径」的重定位方案 ⇒ 本 Sprint **不含 hook 移植**（§6 只登记） |
| **Sprint 主题** | 发布解锁（release unlock）：把 `release_eligible: false` 变成**有证据支撑的判定** |
| **CI 通道** | **本轮由 orchestrator 打通**：fork `slchris/kixparadigm`（`isFork=true`）的 workflow `ci` 原为 0 注册 / 0 run；push `5c4d9ab` 后 **`ci` 自动注册为 `active`**，run `35729103867`（event=push）入队 → **无需手动启用**；PR **#1** 已开（`state: OPEN`、`mergeable: MERGEABLE`）。Sprint 1 的 CI 阻塞点**实证解除** |
| **规划期只读取证（新增，见 §3）** | 规划期对两个 run 做**只读复核**，发现 Sprint 2 遗留结论的两处修正：① **windows × 2 job `failure`**（`sync-dsh-preset.test.js` case 28/32，代码失败）→ 原「条件任务」变**必做 P0**；② **parity step 在 ubuntu/macOS `success` 且状态行 `parity: PASS`**（oracle `7.6.6`/`7.6.5`）→ Sprint 2 的「LG10 本地永久 unavailable」获得 CI 载体实证 |
| **规划产出** | `docs/sprint-3/plan.md`（T1..T6 / DAG / `task_sizing.derived_commit_budget: 6` / LG1..LG7 · MG1..MG5 · CG1..CG5）+ 本文件 + `runtime-context.md` + `drift-check.md` + `PROJECT_BRIEF.md` Sprint 指针 |
| **预算** | `derived_commit_budget: 6`（公式值 8 并列输出；层合并策略 + 环境硬约束 + CI 首跑迭代 reserve）。相对「CI 结果入账前」的初值 5 **上调 1**，依据见 `plan.md` §5 |
| **未决 / 待 orchestrator** | ① T5（CI 载体）由 Dev 还是 Producer 落 `.github/workflows/ci.yml`（Producer 白名单包含 `.github/**`，但 T5 与安装器契约同批）；② 分支策略（见下方「分支决策留痕」） |
| **纪律留痕** | 本层**未 commit**（工作树改动留待 orchestrator 审阅）；规划期**未运行**任何 required gate；未修改任何 Sprint 1/2 已完成文档 |

> **分支决策留痕（同层追加，不改写上文）**：本计划取值 = **沿用 Sprint 2 分支 `feature/sprint-2-node-first-host-parity`**，
> 理由：PR #1 已开且 `MERGEABLE`，Sprint 3 的修复正是该 PR 检查「红 → 绿」的证据链；新分支需新 PR，多一次外部副作用与 CI 冷启动。
> 备选：改为 `feature/sprint-3-release-unlock` 并另开 PR。**该决策可逆，不影响任何 gate 定义**（gate 只绑定 `head_sha`，不绑定分支名）。

> **规划期观察（工作树，同层追加；不改变 §1 的任务状态）**：规划期查视发现工作树已含**并行推进的未提交改动** ——
> `install.sh`（T1 的 `--yes`/`-y` + 非 TTY fail-closed + `KIX-INSTALLER-CONFIRM-REQUIRED` + exit 3，逐条与 `plan.md` §3.1 契约表一致）、
> `scripts/sync-dsh-preset.cjs` + `scripts/sync-dsh-preset.test.js`（T4 的大小写对称 + 可注入 `caseInsensitive`）。
> **本规划层未修改任何源码文件**（本层只写 `docs/sprint-3/**` 与 `PROJECT_BRIEF.md` 指针）。
> 任务状态仍记 `pending`：未 commit、未跑任何 required gate ⇒ **不得**据工作树改动写成「T1/T4 已完成」。

> **编号口径待统一（同层追加）**：上述并行实现的代码注释以「Sprint 3 **T3**」指代 `sync-dsh-preset.cjs` 的修复，
> 而本计划该修复编号为 **T4**（T3 = CI 取证登记）⇒ 引用时必须写作「T4（= 代码注释中的 Sprint 3 T3）」，见 `plan.md` §3。

### 2026-09-22 · `orchestrator_decision`（kixpower-orchestrator）· phase=planning→execution

| 项 | 记录 |
|---|---|
| **触发** | Producer 规划层落地后，其 §2 列出三个待决点；同时发现 **orchestrator 派单与 `plan.md` 存在一处实质冲突**（退出码）需裁决 |
| **决策① 编号口径** | **以 `plan.md` §3 为准**：`sync-dsh-preset.cjs` 大小写修复 = **T4**；CI 载体补齐 = **T5**；CI 取证登记 = **T3**。已令 Dev 把代码注释/测试名中的「Sprint 3 T3」改为 **T4**，消除「同物不同号」 |
| **决策② T5 归属** | **Dev** 落 `.github/workflows/ci.yml`。理由：该 step 与 installer 契约强耦合（必须用 `--yes`/`-Yes`，负向断言钉 `KIX-INSTALLER-CONFIRM-REQUIRED`），属实现面；Producer 只负责把该 step 登记进证据台账 |
| **决策③ 分支策略（推翻 plan 取值）** | plan §3 取值「沿用 Sprint 2 分支」**被推翻**：orchestrator 已在规划层落地前建 **`feature/sprint-3-release-unlock`（基线 `5c4d9ab`）**，Sprint 3 在此分支推进并**另开 PR**。理由：① gate 绑定 `head_sha`，若把 Sprint 3 的修复混入 PR #1 的 head，则「Sprint 2 的 CI 结论」会指向含 Sprint 3 代码的 revision，证据链错位；② **PR #1 保持红是诚实证据**（Sprint 2 交付物确有 Windows 回归），修好它的是 Sprint 3，叙事不应被抹平。代价：多一次外部副作用 + CI 冷启动（可接受） |
| **决策④ 退出码：采纳 plan 的 `exit 3`，否决派单的 `exit 1`** | 派单时我要求「沿用既有口径 exit 1」；复核 plan §3.1 后**判定 plan 更强并采纳**——`read` 在「管道已连接但暂无可读数据」时会**无限阻塞 → CI 挂死**，而挂死比明确报错更坏（无输出、无退出码、不可机械判定）⇒ 非 TTY 时**不得读 stdin**；码位 `0/1/3`（`2` 保留给将来的 usage error）自洽，且让 CI 能区分「忘传 `--yes`」与「装坏了」。已知代价：`printf 'y\n' \| install.sh` 由 exit 0 → **exit 3** 的**契约反转**，须文档化（plan §3.1 契约表第 6 行） |
| **决策⑤ `INSTALL.md` 归属** | 该文件在**仓库根**、不属 Producer 的 `docs/**` 面 ⇒ 由 **Dev** 随 T1 落（退出码表 + 契约反转说明），使 P6 的「行为回归」降级为「文档化变更」 |
| **独立核验：`>20%` 规则读数（orchestrator 亲跑，非采信转述）** | 与 plan R-8 一致：`--prev-sprint 2`（baseline `ef6a485`）⇒ `total 75 / in_scope 70 / whitelisted 5 / **ungated 0 (0%)** / PASS` ⇒ **未触发**。**附强度限定**：同机 `--prev-sprint 1`（baseline `c3c31eb`）仍报 `total 81 / in_scope 18 / whitelisted 41 / ungated 22 (27.2%)`。两窗差异主因是 **`in_scope` 由 18 跳到 70** —— Sprint 3 的 `target_rules` 已把 Sprint 2 产物**预先登记为覆盖**。故「0% ⇒ 未触发」**仅在本窗内成立**，且是**计划自身吸收**的结果；**不得**据此声称「Sprint 2 的 27.8% 已被否定」或「规则已合规」——Sprint 2 登记的「**触发但未按规则处置**」**仍然成立**，两条结论并存 |
| **纪律留痕** | 本层 orchestrator **未编辑任何源码/测试/fixture**；仅写本文件（orchestrator 面）与建分支；未 commit |

---

## 3. 规划期只读取证（`ci-evidence` · provisional）

> **性质**：**规划期只读复核**（2026-09-22，`gh run view` / `gh api .../logs`，只读，无副作用）。
> **绑定**：`head_sha = 5c4d9aba59a584c64199510245dbc1724f310fb0`（= `sprint_baseline_sha`）。
> **效力**：仅用于 **Sprint 2 遗留判定**（`docs/sprint-2/done.md` 的 `ci_pending`）；**不为 Sprint 3 的任何 revision 背书**（`plan.md` §1.2 纪律 2）。

### 3.1 `ci-evidence (sha=5c4d9ab)`

| gate | run | job / step | step_conclusion | 逐字证据 |
|---|---|---|---|---|
| CG1 | `35729103867`（push）· `35729139524`（pull_request） | workflow `ci` | `active`（`gh workflow list`） | 两 run 的 `headSha` 均为 `5c4d9ab` |
| CG2 | `35729103867` | `test (windows-latest, node 22.x)` | `failure` | `not ok 28 - sync expands repository directory pointers into materialized targets`、`Directory pointer escapes bundle root: dsh\preset\skills`（`1 !== 0`）；`not ok 32 - sync fails closed for missing or out-of-source declared pointers`、实得 `Directory pointer escapes bundle root: src\missing`（期望 `/does not exist/`）；`# fail 2`、`##[error]Process completed with exit code 1` |
| CG2 | `35729103867` | `test (windows-latest, node 20.16.0)` | `failure` | 同型（同一测试文件） |
| CG2 | `35729103867` | `test (macos-latest, node 20.16.0 / 22.x)`、`test (ubuntu-latest, node 22.x)` | `success` | `npm test` 链各段通过 |
| CG3 | `35729103867` | `pack dry-run` | `success` | `Pack zh package` / `Pack en package` 均 success |
| CG4 | `35729103867` | `test (macos-latest, node 22.x)` → `Parity vs pwsh reference (E1, three-state)` | `success` | `# parity: PASS — oracle 7.6.5；7 个移植件在全部 fixture 上 stdout 逐字节一致且 exit code 一致`；`# tests 8 / # pass 8 / # fail 0 / # skipped 0`；step 层 `E1 parity: PASS（stdout 逐字节一致 + exit code 一致）` |
| CG4 | `35729103867` | `test (ubuntu-latest, node 22.x)` → 同上 step | `success` | `# parity: PASS — oracle 7.6.6；7 个移植件…`；`E1 parity: PASS（stdout 逐字节一致 + exit code 一致）` |
| CG4 | `35729103867` | `test (windows-latest, …)` → 同上 step | **`skipped`** | **未执行**（前序 `Test zh package (DSH preset)` 失败 ⇒ 后续步骤被跳过：`Test en package`、`Parity vs pwsh reference` 均 `skipped`） |
| CG5 | — | — | **载体不存在** | `.github/workflows/ci.yml` 无任何 `install.ps1` 执行步骤；`install.sh` 仅由 `npm test` 内的测试 spawn（当前以 `input: 'y\n'` 绕过交互提示） |

### 3.2 `windows-red (sha=5c4d9ab)` · 失败分类

```
分类：**代码失败**（非环境失败）
判据（plan.md §3.4）：失败 step ∈ {Test zh package (DSH preset)} 且日志含 `not ok` + `AssertionError` + `##[error]Process completed with exit code 1`
失败点：scripts/sync-dsh-preset.test.js case 28 / case 32
根因（orchestrator 行级定位 + 本层日志复读互证）：scripts/sync-dsh-preset.cjs:129-132 的 isInside
        在大小写不敏感分支只归一化 root、未归一化 candidate ⇒ Windows 盘符大写（D:\a\…）被判为「逃逸 bundle root」
参照实现对称性：scripts/sync-dsh-preset.ps1:48,80（OrdinalIgnoreCase）+ :92,:93,:115,:135（两侧同用）⇒ 修复方向 = 让 .cjs 与参照对称
```

### 3.3 `parity-oracle (sha=5c4d9ab)`

```
macos-latest  : oracle 7.6.5  → parity: PASS（7 个移植件 + 1 条 harness 自检 = 8/8 pass）
ubuntu-latest : oracle 7.6.6  → parity: PASS
windows-latest: **未执行**（step skipped）⇒ 本项目仍无 Windows 侧差分对拍证据（plan.md §8-R2）
```

> **禁止表述**：不得把 `5c4d9ab` 的 `parity: PASS` 写成「跨平台等价」；只能写「POSIX 侧（macOS/ubuntu）差分对拍通过；Windows 侧未执行」。

---

## 4. 证据行（执行期回填，**规划期不预填读数**）

| 行 | 状态 | 说明 |
|---|---|---|
| `ci-evidence (sha=…)` | 规划期已有 provisional（见 §3.1，sha=`5c4d9ab`）；**执行期需重取终局 SHA** | MG3 |
| `windows-red (sha=…)` | 规划期 provisional（§3.2）；执行期必须给终局结论 | MG3 |
| `parity-oracle (sha=…)` | 规划期 provisional（§3.3）；执行期含 Windows 首次运行结果 | MG3 |
| `fidelity-window (prev-sprint=2, baseline=ef6a485)` | **规划期已实测**（逐字块见 `drift-check.md` §5）；执行期由 LG6 复跑确认 | MG3 / HB-9 |
| `case-normalization-audit:` | `not run`（T4） | MG4 |
| `ps1-unverified` / `installer-unattended` | `not run`（T2 / T5） | MG5 |
| `release-eligible: <true / false> (sha=…)` | `not run`（T6） | `plan.md` §1.1 判据表逐条结算 |

---

## 5. 门禁执行状态（规划期：全部 `not run`）

| gate | 类型 | required | host_requires | 状态 |
|---|---|---|---|---|
| LG1 `npm run test:installer` | local_gate | true | `[]` | `not run` |
| LG2 `npm run test:consistency` | local_gate | true | `[]` | `not run` |
| LG3 `npm test` | local_gate | true | `[]` | `not run` |
| LG4 `node --test scripts/sync-dsh-preset.test.js` | local_gate | true | `[]` | `not run` |
| LG5 `node --test skills/kixpower/tests/ps1-parity.test.js` | local_gate | **false** | `[pwsh]` | 本机**恒 `unavailable`**（不得记为 pass/skip） |
| LG6 fidelity `--prev-sprint 2` | local_gate | true | `[]` | 规划期实测 `PASS`（0%）；执行期复跑 |
| LG7 installer 无人值守（本地 sh 侧） | local_gate | true | `[]` | `not run` |
| MG1..MG5 | manual_gate | true | — | `not run` |
| CG1..CG5 | ci_gate | true | `[pwsh, bash, gh-workflow-scope]` | CG1/CG3 已有 provisional；CG2 **红**；CG4 部分 PASS + Windows 未执行；CG5 **无载体** |

**L2 必需 gate 集合（manifest 口径）**：`[LG1, LG2, LG3, LG4, LG6, LG7]`（6 条），按 `id` 排序后规范化
`{id, type, cmd, expect, required, host_requires}` 计算 `l2_gate_manifest_sha256`；**LG5 不在集合内**。
`l2_verified_sha: null`（L2 未发生 ⇒ 本文件任何 L2 字段均为空值，不得预填）。

---

## 6. Sprint 2 → 3 结转登记（**只登记，不在本 Sprint 实施**）

| 结转项 | 来源 | 本 Sprint 处置 |
|---|---|---|
| **H-set-B：6 个 hook 移植**（991 行 ps1 × 3 副本） | 用户**明确未选** | `plan.md` §11-N12（Sprint 4 主候选）；当前状态如实保留：无 pwsh 宿主上这 6 条声明**不触发** |
| F-3 installer 作用域 + 原子性 | `done.md` F-3 / HB-10 | §11-N13（不与 T1/T2 同批） |
| F-4 `TOOL_LIKE_KEY` 补键 | `done.md` F-4 / HB-11 | §11-N14（须与真实载荷采样同批） |
| F-5 `hooks/README.md` 入镜像组 | `done.md` F-5 / HB-12 | §11-N15 |
| F-6 LG16 判据强度 | `done.md` F-6 / HB-13 | §11-N16 |
| HB-8 维护调用点残留 4 处 | `done.md` §5-R-7 | §11-N17 |
| R-1..R-8（QA 残余不确定） | `qa-signoff-2.md` §9 | R-1（CI 通道）本 Sprint **实测部分解除**（通道已通，CG4 POSIX 侧 PASS）；R-2/R-3/R-4/R-5/R-6 结转，见 `drift-check.md` §6 |
| `>20% → 强制扩展 target_rules` 规则 | `sprint-2/drift-check.md` §9 | **规划期已实测：`--prev-sprint 2`（baseline `ef6a485`）⇒ `ungated: 0 (0%)` / `PASS` ⇒ 未触发**；执行期 LG6 复跑确认（同源同窗，HB-9） |
