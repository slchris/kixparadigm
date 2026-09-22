---
sprint: 3
theme: "A. 发布解锁（release unlock）"
status: planning
sprint_baseline_sha: 5c4d9aba59a584c64199510245dbc1724f310fb0
prev_sprint: 2
branch: feature/sprint-2-node-first-host-parity
content_language: zh
content_language_source: inferred
producer: Remy
created: 2026-09-22
derived_commit_budget: 6
---

# Sprint 3 Plan — 发布解锁（release unlock：把 `release_eligible: false` 变成有证据支撑的判定）

> **输入**：`docs/sprint-3/{drift-check,runtime-context}.md`、`docs/sprint-2/{plan,done,hill-climbing,drift-check}.md`、
> `docs/qa/qa-signoff-2.md`、`.kixpower/memory/repo/{harness-backlog,lessons-learned}.md`、`PROJECT_BRIEF.md`、
> `.github/workflows/ci.yml`、`install.sh` / `install.ps1` / `scripts/sync-dsh-preset.cjs`、CI run `35729103867` / `35729139524`（规划期只读复核）。
>
> **用户已定的范围（不得扩张）**：在四个选项中选定 **A：先解锁发布 —— installer 非交互健壮性 + CI 取证**，
> 并授权 **push 到 fork + 开 PR**。**明确未选** H-set-B（6 个 hook 移植）与「DSH 插件为主路径」的重定位方案。
> ⇒ **本 Sprint 不含 hook 移植**（Sprint 4 主候选，只在 §11 登记）。

---

## 1. 目标与成功判据

**目标**：把 `release_eligible` 从「默认 false + 无证据」变成**有证据支撑的判定** —— 无论结论是 true 还是 false，
判定都必须能指向**绑定同一 SHA 的机械证据**，并如实写明缺失的是哪一条。

### 1.1 `release_eligible` 判据表（本 Sprint 的验收核心）

| 条件 | 机械判据 | 规划期状态（2026-09-22 规划期只读复核） |
|---|---|---|
| **C1 CI 通道** | workflow `ci` 状态 `active`；存在 `headSha == 最终 HEAD` 的 run | ✅ 已通（`ci` active；run `35729103867` headSha `5c4d9ab`）——Sprint 1 的阻塞点**实证解除** |
| **C2 主矩阵** | 6/6 job `success`（3 OS × 2 node，zh + en `npm test`）；各 job `# skipped 0`（平台型 skip 必须逐条列举） | ❌ **windows × 2 `failure`** @ `5c4d9ab`（失败点见 §3-T4） |
| **C3 pack** | `pack dry-run` job `success`（zh + en 各一次） | ✅ @ `5c4d9ab` |
| **C4 E1 parity** | parity step **实际执行**且状态行 `parity: PASS`（step exit 0） | ⚠️ **ubuntu + macOS PASS**（oracle `7.6.6` / `7.6.5`）；**Windows 未执行**（前序 step 失败 → step 被 skip，**平台盲区**） |
| **C5 installer 无人值守可验证** | 存在 CG5 的 CI 载体，且 `--yes`/`-Yes` 正向 exit 0、无开关 + 重定向 → 机器可识别标记 + exit 3 | ❌ **无载体**（`ci.yml` 当前无任何 `install.ps1` 执行步骤；`install.sh` 仅在测试内被 spawn）→ 本 Sprint T5 建立 |
| **C6 本地 required gates** | 全部 required `local_gate` 在同一最终 revision 上 exit 0（TEAM_CONVENTIONS §L2 信任链） | ⏳ 未跑（本 Sprint 执行期产出） |

**判定规则（写入 `done.md` 与 `progress.md`）**：

```
release_eligible = true   ⇔  C1..C6 全部成立，且全部证据绑定同一个最终 HEAD
否则                      ⇒  release_eligible: false + 逐条写明「缺哪一条 + 缺什么证据」
```

**禁止**：把「CI 能跑」当作「CI 结论可信」（见 §2-P1）；把「本地绿」当作 CG 的替代证据；把旧 SHA 的 success 为新 revision 背书。

### 1.2 CI 证据如何绑定 SHA（本 Sprint 的取证纪律）

每条 CG 记录的**最小证据单元**（缺一即记为 `unbound`、不计入通过）：

```yaml
ci_evidence_record:
  run_id: 35729103867          # gh run view <id> -R slchris/kixparadigm
  event: push | pull_request
  head_sha: 5c4d9aba59a584c64199510245dbc1724f310fb0
  job: "test (macos-latest, node 22.x)"
  step: "Parity vs pwsh reference (E1, three-state)"
  step_conclusion: success
  verbatim_line: "E1 parity: PASS（stdout 逐字节一致 + exit code 一致）"
```

三条机械纪律：

1. **`gh run list` / PR 的 rollup `conclusion` 不得替代逐 job、逐 step 结论** —— 实例：`5c4d9ab` 的 Windows job 里 parity step 因前序失败被 **skip**，只看 job 名会误判「parity 已定档」（§2-P1 的实证）。
2. **只有 `head_sha == 最终 HEAD` 的 run 进入最终判定**；Sprint 2 的 `5c4d9ab` 结论只用于 **Sprint 2 遗留的判定**（`docs/sprint-2/done.md` 的 `ci_pending`），不为 Sprint 3 的 revision 背书。
3. **环境失败与代码失败必须分类**（判据见 §3-T3）：两者都不计为通过；环境失败允许 1 次 `rerun` 并留痕，代码失败不得重跑掩盖。

### 1.3 本 Sprint 的四个交付面

| 面 | 交付 | 为什么它属于「发布解锁」 |
|---|---|---|
| **① installer 健壮性** | `install.sh` / `install.ps1` 的显式非交互开关 + 非 TTY fail-closed（T1/T2） | 无此面则**安装器的无人值守验证不可能存在**（C5 不可达），且当前非交互调用**静默 exit 1 无任何输出**（缺陷一） |
| **② CI 红修复** | `scripts/sync-dsh-preset.cjs` 的大小写不对称（T4） | C2 是硬判据；Windows 红直接使 `release_eligible` 恒 false |
| **③ CI 载体补齐** | `ci.yml` 新增 installer 无人值守验证（T5） | C5 至今**无载体**；同时它给 Windows 侧 parity 提供**首次运行机会**（§8-R2） |
| **④ 取证与判定** | CG1..CG5 的 SHA 绑定登记 + 终局重判（T3/T6） | 把「结论」变成「可复算的证据单元」，是 `release_eligible` 表述合法性的唯一来源 |

---

## 2. 需求三检 / 前提假设

### 2.1 需求三检（XY / 前提 / 路径）

| 项 | 结论 |
|---|---|
| **① XY** | 用户要的是「解锁发布」，**真正需要的是 `release_eligible` 的判定依据**（不是「再修几个 bug」）。故本 Sprint 的三件事都是**判定依据的组成部分**：C5 让安装器**可被机械验证**、C2 让矩阵**具备转绿的可能**、T3/T6 让证据**绑定 SHA 且可复算** |
| **② 前提** | 「CI 已打通 ⇒ 可以取证」成立（workflow `ci` active，run 已产出）；但**「CI 有结论 ⇒ 结论可信」不成立** —— 见 P1，规划期已实测到 skip 假象 |
| **③ 路径** | 不选「先做 H-set-B 再谈发布」（用户已否决：hook 移植不解锁发布）；不选「直接宣布 `release_eligible: true`」（无 SHA 绑定证据 ⇒ 违规）。选**最小可验证路径**：修 installer 契约 → 补 CI 载体 → 修已实测的 CI 红 → 逐 gate 定档 |

### 2.2 未验证前提（**不得当作已定结论**）

| ID | 前提 | 若为假会怎样 | 取证方式 / falsifier |
|---|---|---|---|
| **P1** | **「CI 能跑 ≠ CI 结论可信」**：run 完成、job 名存在，不等于该 gate 的 step **执行过** | 误把「parity 已定档」写进 `done.md` | **已实证**：`5c4d9ab` 的 Windows job 中 parity step `conclusion: skipped`。判据 = 逐 step 的 `conclusion`，不是 job 名 |
| **P2** | **runner pwsh 版本与参照实现的兼容性**：macOS oracle `7.6.5`、ubuntu `7.6.6`（规划期实测，两者均 `parity: PASS`） | 若某 runner 的 pwsh 改变了 JSON 序列化/换行 ⇒ `parity: FAIL` 会被误读成「移植错了」 | Windows 侧 pwsh 版本**未取证**（parity 从未在 Windows 执行）→ CG4 首次在 Windows 执行时逐字记录 oracle 版本号；`FAIL` 与版本变更必须同时判断 |
| **P3** | `[Console]::IsInputRedirected` 在 GHA `windows-latest` 的 step 上下文与本地 `pwsh -File` 下行为一致 | T2 的非 TTY 分支在 CI 上恒真/恒假 ⇒ 判据失效 | 唯一通道 = CG5 的 windows 分支；若不可执行 ⇒ 记 `unavailable`（**不是 pass**），C5 保持不成立 |
| **P4** | `-Yes` 与 `[CmdletBinding()]` 的 switch 绑定无冲突（与 `-DryRun`/`-Uninstall` 同名风格） | `install.ps1 -Yes` 解析失败 ⇒ CG5 红 | CG5 windows 分支；本地无 pwsh ⇒ **本机不可验证** |
| **P5** | 修复 `isInside` 的大小写对称后 Windows job 全绿 | 若仍红且失败点不同 ⇒ 不止一处平台缺陷 | falsifier = 新 run 的 Windows job 结论；仍红则升级 orchestrator 做范围判断 |
| **P6** | 「非交互安装从未被文档承诺」⇒ 契约反转（`printf 'y\n' \| install.sh` 由 exit 0 变 exit 3）属**健壮性缺口**而非契约违约 | 若有用户/CI 依赖管道喂 `y`，则本 Sprint 引入行为回归 | 规划期全仓检索 `yes \|` / `--yes` / `unattended` / `非交互` = **0 命中**（orchestrator 实测）；本 Sprint 在 `INSTALL.md`/`README` **显式写明**该契约 ⇒ 回归降级为「文档化变更」 |
| **P7** | CI 结论只对特定 SHA 有效 | 用旧 run 为新 revision 背书（Sprint 2 的 `42d3c7e` 证据被拿来支持 `5c4d9ab` 之后的 revision） | §1.2 纪律 2；`done.md` 每条 CG 必须给 `head_sha` |

### 2.3 task 可行性前置 Gate（G1 liveness / G2 heat）

> G3/G4（perf 专属）不适用。`languages` 取 `[shell, powershell, javascript, markdown]`，**不固定用 `*.go` 类命令审其他语言**。

| 任务 | G1 liveness（入口 + 消费者） | G2 heat | 决策 |
|---|---|---|---|
| **T1** `install.sh` 非交互 | **live**：入口 = CI 的 installer 验证 step（T5）+ `npm run test:installer`；消费者 = CG5 与用户无人值守安装 | `warm`（每次 CI + 每次安装） | ✅ |
| **T2** `install.ps1` 对称 | **live**：入口 = CG5 的 windows 分支；消费者 = Windows 用户无人值守安装 | `warm` | ✅ |
| **T3** CI 取证登记 | **live**：入口 = 本 plan §6 的 CG 定义；消费者 = `done.md` 的 `release_eligible` 判定 + QA 签署 | `cold`，但**是发布的唯一前置** ⇒ 不因 cold 降级 | ✅ |
| **T4** `sync-dsh-preset.cjs` 大小写对称 | **live**：入口 = `npm run test:installer`（CI 每 push）；消费者 = `scripts/sync-dsh-preset.cjs` 是 `dsh/preset*` 同步的 canonical 实现（`README.md:72`、`dsh/README-DSH.md`） | `warm` | ✅ |
| **T5** CI 载体补齐 | **live**：入口 = `.github/workflows/ci.yml`（每 push 触发）；消费者 = CG5 | `warm` | ✅ |
| **T6** 收尾 + 重判 | **live**：入口 = 本 plan §1.1 判据表；消费者 = `PROJECT_BRIEF.md` §7/§8 + 发布决策 | `warm` | ✅ |

**未通过 gate 的候选（记为不设 task）**：

| 候选 | 未通过项 | 理由 |
|---|---|---|
| H-set-B 6 个 hook 移植 | 用户范围 | 用户**明确未选** B/C/D；仅在 §11 登记为 Sprint 4 主候选 |
| F-3 installer 残留扫描作用域 + 原子性 | G2 优先级 | 方向安全但**不在发布解锁的关键路径**；且会扩大 installer 改动面（与 T1/T2 同文件）⇒ 登记 §11 |
| F-4 `TOOL_LIKE_KEY` 补键 | G1 前置缺失 | 须与**真实载荷采样**同批（R-2 未取证）；单改是「无 falsifier 的猜测性加固」⇒ 登记 §11 |
| `install.sh` 未知参数报错（当前 `*) CUSTOM_TARGET="$arg"` 把未知 flag 当目标路径） | G2 | 真实缺陷但 `cold` 且不在发布判据内 ⇒ 登记 §13-OQ3，不设 task |

---

## 3. 任务分解 T1..T6

> 状态标记：`[ ]` 未开始 / `[~]` 进行中 / `[x]` 完成 / `❌ Blocked`。
> **编号与用户任务要求的映射**：要求中的 T1/T2/T3/T4/T5 分别 = 本表的 **T1 / T2 / T5（载体补齐，新增）/ T4（原「条件任务」，已成必做）/ T6（收尾）**；
> 本表的 **T3 = CI 取证登记**（要求里的 T3，独立成节点以便在层 1 与 T1/T4 并行）。
>
> **⚠ 编号口径待统一（规划期观察）**：规划期查视工作树发现，并行推进的实现工作已在代码注释里以「Sprint 3 **T3**」指代
> `sync-dsh-preset.cjs` 的**大小写对称修复**（= 本表的 **T4**；本表的 T3 是 CI 取证登记）。二者**同物不同号**。
> 处置：`done.md`/`progress.md` 的最终留痕以**本 plan 的编号为准**，或由 orchestrator 统一编号后回填本节；
> 在此之前，引用该修复时必须写作「T4（= 代码注释中的 Sprint 3 T3）」，避免出现「T3 已修」与「T3 未做」并存的记录冲突。

- [ ] **T1** `install.sh` 非交互健壮性（契约表 §3.1 全部条目）
- [ ] **T2** `install.ps1` 对称实现（同契约表；本地无 pwsh）
- [ ] **T3** CI 取证框架 + Sprint 2 run 定档（CG1..CG5 × `5c4d9ab`，provisional）
- [ ] **T4** CI 红修复：`sync-dsh-preset.cjs` 大小写对称 + 同文件单侧归一化审计
- [ ] **T5** CI 载体补齐：installer 无人值守验证 step（CG5 的载体）
- [ ] **T6** 收尾：`done.md` + L4 + memory + `release_eligible` 重判（终局 SHA 取证）

### 3.1 T1/T2 契约表（**两侧必须逐条对称；此表是 MG1 的判据来源**）

| # | 语义 | `install.sh` | `install.ps1` | 判据 |
|---|---|---|---|---|
| 1 | 显式非交互开关 | `--yes` \| `-y` | `-Yes` | MG1 |
| 2 | 非 TTY 判定 | `[ -t 0 ]` 为假 | `[Console]::IsInputRedirected` | MG1 |
| 3 | **非 TTY 且无开关** | **不读 stdin**；`err "KIX-INSTALLER-CONFIRM-REQUIRED: stdin is not a TTY and --yes/-y was not given"`；**exit 3** | 同标记名；`Show-Err "KIX-INSTALLER-CONFIRM-REQUIRED: stdin is redirected and -Yes was not given"`；**exit 3** | LG7 / CG5 |
| 4 | TTY 交互（不变） | `read -r -p "Proceed? [y/N] "`；非 `y` ⇒ `info "Aborted."` + exit 0；EOF/Ctrl-D ⇒ 同 | `Read-Host 'Proceed? [y/N]'`；`-ne 'y'` ⇒ Aborted + exit 0；EOF ⇒ 同 | 静态 + 人工 |
| 5 | 开关给出的正向路径 | 不打印提示、不读 stdin，直接执行 | 同 | LG7 / CG5 |
| 6 | 退出码表（文档化到 `INSTALL.md`） | `0` 成功/用户取消 · `1` fail-closed（`KIX-INSTALLER-NO-NODE` / `KIX-INSTALLER-RESIDUE` / 一般失败）· `3` `KIX-INSTALLER-CONFIRM-REQUIRED`（`2` 保留给将来的 usage error） | 同 | MG1 / MG2 |

**设计取舍（必须写进代码注释，防止后人「顺手改回」）**：

- **为什么 strict（非 TTY + 无开关 ⇒ 不读 stdin 直接失败），而不是「先读一行，读到 `y` 就继续」**：
  1. `read` 在「管道已连接但暂无可读数据」时**无限阻塞** ⇒ CI 挂死。挂死是比明确报错**更坏的失败模式**（无输出、无退出码、无法机械判定）。
  2. 三态（读到 `y` / EOF / 挂起）不可机械判定，与 Sprint 2 建立的「fail-closed + 机器可识别状态行」口径不一致。
  3. 代价已知且可控：`printf 'y\n' | install.sh` 由 exit 0 变为 exit 3；`scripts/copilot-installer.test.js` 的 `runInstaller({ input: 'y\n' })` 必须改为传 `--yes`（属 T1 范围）。
- **`set -euo pipefail` 与 `read` 的交互是本缺陷的根因**（`install.sh:29` + `:193`）：`read` 失败触发 `set -e` 立即中止，
  本该执行的 `:194 info "Aborted."; exit 0` 不可达 ⇒ 表现为**静默 exit 1 无输出**。修复必须**显式处理** `read` 的返回值（`if ! read …; then … fi`），
  不得用 `|| true` 掩盖。
- **失败检查的次序不变**：node 预检（`KIX-INSTALLER-NO-NODE`）在确认提示之前（现行 `:86/:97` → `:193`），保持「先能力、后同意」。

### 3.2 T1 验收（`install.sh`）

- 正向：`install.sh --dry-run --yes <tmp> </dev/null` → exit 0，输出**不含** `KIX-INSTALLER-CONFIRM-REQUIRED`（反向控制）。
- 失败关闭：`install.sh --dry-run <tmp> </dev/null` → **exit 3** + 输出含 `KIX-INSTALLER-CONFIRM-REQUIRED`（当前行为：静默 exit 1 无输出）。
- `--yes` 与既有开关可组合：`--uninstall --dry-run --yes`、`--skip-memories --yes`。
- 头部注释块（`grep '^#' "$0"` 即 `--help` 输出）与 `INSTALL.md` 必须写明 `--yes` 与非交互契约（含管道喂 `y` 已不再被接受）。
- `scripts/copilot-installer.test.js`：既有 `runInstaller` 改传 `--yes`；**新增 ≥3 条**非交互用例（正向 0 / 无开关 exit 3 + 标记 / 标记非恒真反向控制）。
  **不得**用 `windows-only` skip 实现（会把 LG1 的 `# skipped` 顶回非 0，违反 Sprint 2 的 P2 硬判据）。

### 3.3 T2 验收（`install.ps1`）+ 本机无 pwsh 的处置

- 实现契约表全部条目（`-Yes`；`[Console]::IsInputRedirected`；同一标记名；exit 3）。
- **残留不确定性（必须如实登记，不得绕过）**：本机无 pwsh ⇒ **`install.ps1` 的非交互行为在本机不可执行验证**。因此：
  - T2 的完成定义 = **同构实现 + 静态对称判据（MG1）+ CI 载体就绪（CG5）**；
  - **禁止**在 `progress.md` / `done.md` 写「`install.ps1` 非交互已验证」；只能写「静态对称成立；行为验证通道 = CG5（windows runner）」；
  - 若 CG5 的 windows 分支不可执行（P3/P4 为假）⇒ 该分支记 `unavailable`（**不是 pass/skip**），C5 不成立，`release_eligible` 如实保持 `false` 并写明缺口。
- 静态判据（MG1）：两侧标记名逐字相同；两侧各有开关解析与重定向判定；两侧退出码表一致。

### 3.4 T3 取证框架（CG1..CG5 × `5c4d9ab`，provisional）

- 产出：`progress.md` 的 `ci-evidence (sha=5c4d9ab)` 段，逐条给出 §1.2 的证据单元（`run_id`/`event`/`head_sha`/`job`/`step`/`step_conclusion`/逐字状态行）。
- **环境失败 vs 代码失败的机械判据（本 Sprint 的固定口径）**：

```text
环境失败  ⇔  失败 step ∈ {Set up job, actions/checkout, actions/setup-node}
             或 job.status ∈ {cancelled, timed_out}
             或 run.conclusion ∈ {startup_failure, stale}
             处置：允许 1 次 `gh run rerun <id>`，记录 rerun 前置原因；不计为通过，也不计为代码失败
代码失败  ⇔  失败 step ∈ {Test zh package, Test en package, Parity vs pwsh reference, Pack …}
             且日志含 `not ok` / `AssertionError` / `##[error]Process completed with exit code`
             处置：记 P0/P1 并进入 T4（或新任务），禁止以重跑掩盖
```

- **规划期已实得的 provisional 定档（只读复核，2026-09-22）**：

| gate | 结论 @ `5c4d9ab` | 逐字证据 |
|---|---|---|
| CG1 | ✅ | workflow `ci` = `active`；run `35729103867`（event=push）/ `35729139524`（event=pull_request）均 headSha `5c4d9ab` |
| CG2 | ❌ **代码失败** | `test (windows-latest, node 20.16.0)` 与 `(node 22.x)` = `failure`；日志 `not ok 28` / `not ok 32`（`scripts/sync-dsh-preset.test.js`）、`# fail 2`、`##[error]Process completed with exit code 1` |
| CG3 | ✅ | `pack dry-run` = `success`（zh + en） |
| CG4 | ⚠️ **部分 PASS + 平台盲区** | macOS：step `Parity vs pwsh reference (E1, three-state)` = `success`，`# parity: PASS — oracle 7.6.5；7 个移植件…`、`E1 parity: PASS（stdout 逐字节一致 + exit code 一致）`、`# tests 8 / # pass 8 / # fail 0 / # skipped 0`；ubuntu：`# parity: PASS — oracle 7.6.6；7 个移植件…`。Windows：parity step = `skipped`（**未执行**） |
| CG5 | ⬜ **无载体** | `ci.yml` 无任何 `install.ps1` 执行步骤；`install.sh` 仅由 `npm test` 内的测试 spawn 且当前以 `input: 'y\n'` 绕过提示 |

### 3.5 T4 CI 红修复（已实测确认，**不再是条件任务**）

**已定位的根因（orchestrator 行级定位 + 规划期日志复读）**：

- 失败点：`scripts/sync-dsh-preset.test.js:27`（case 28）与 `:129`（case 32），错误行分别为
  `Directory pointer escapes bundle root: dsh\preset\skills`（`1 !== 0`）与
  `The input did not match the regular expression /does not exist/`（实得 `Directory pointer escapes bundle root: src\missing`）。
- 根因：`scripts/sync-dsh-preset.cjs:129-132` 的 `isInside` 在**大小写不敏感分支只归一化 root、未归一化 candidate**
  （`String(candidate).startsWith(rootPrefix.toLowerCase())`），Windows 盘符为大写 `D:\a\…` ⇒ `startsWith` 为假 ⇒ 误判逃逸。
- **参照实现是对称的**：`scripts/sync-dsh-preset.ps1:48,80` 定义 `[StringComparison]::OrdinalIgnoreCase`，`:92,:93,:115,:135` 两侧同用。
  ⇒ 修复方向 = 让 `.cjs` 与参照对称，**不得反向改 `.ps1`**。
- 定性：Sprint 2 的 T4 移植引入的**回归**（`sync-dsh-preset.cjs` 是 `42d3c7e` 全新建的产物），
  **且本地 characterization 全绿却漏掉它** ⇒ 这是 Sprint 2 §16.2「characterization 绿 ≠ 与参照等价」的**实证命中**（§7 引用为教训）。

**验收（三条，缺一即 unmet）**：

1. **回归测试必须能在无 pwsh 的 macOS 本地执行**：把该比较抽成**可注入/可导出的纯函数**（如 `isInside(candidate, root, { caseInsensitive })`），
   对 `caseInsensitive: true` 与 `false` **两支各断言一次**（含大写盘符形态的合成路径）。
2. **禁止**用新增 `windows-only` skip 覆盖该分支（会顶高 LG1 的 `# skipped`）。
3. **同文件审计**（不只修这一处）：列出 `sync-dsh-preset.cjs` 中**所有**「只归一化一侧」的比较（`startsWith` / `includes` / `endsWith` / `replace` 上跑大小写或分隔符归一化的每一处），
   逐条给结论（对称 / 不对称 / 不适用）→ `progress.md` 的 `case-normalization-audit:` 行。

**T4-B（条件分支：`parity: FAIL` 的处置路径 —— 保留，因为 Windows 侧 parity 尚未首次运行）**：

```
触发：CG4 出现 `parity: FAIL`（含 Windows 首次执行）
处置：① 记 P0；② 按 `parity: FAIL — …首个分歧：<detail>` 定位到具体件；③ **回退**该 `.cjs` 到与 `.ps1` 一致的行为（不得改参照）
      ④ 新 revision 上**重跑全部 required local gate**（不得只重跑失败项，TEAM_CONVENTIONS §L2 信任链）
      ⑤ 重取 CG2/CG4；旧 L2/QA 签署整体失效
```

### 3.6 T5 CI 载体补齐（CG5 的载体）

- 在 `.github/workflows/ci.yml` 增加 **installer 无人值守验证**（作为独立 step；失败必须红）。**分工**：
  - `ubuntu-latest` + `macos-latest` job：sh 分支 ——
    `bash install.sh --dry-run --yes "$tmp" </dev/null` ⇒ exit 0（且输出**不含**标记）；
    `bash install.sh --dry-run "$tmp" </dev/null` ⇒ **exit 3** 且输出含 `KIX-INSTALLER-CONFIRM-REQUIRED`。
  - `windows-latest` job：ps1 分支 ——
    `pwsh -NoProfile -File install.ps1 -DryRun -Yes "$tmp" < NUL` ⇒ exit 0；
    `pwsh -NoProfile -File install.ps1 -DryRun "$tmp" < NUL` ⇒ **exit 3** 且输出含 `KIX-INSTALLER-CONFIRM-REQUIRED`。
- **不在 Windows job 上跑 sh 分支**：`copilot-installer.test.js` 现有约定是 win32 上把 bash 类用例以平台型 skip 收口；
  T5 不改变该约定（避免依赖 Git Bash 的路径/权限语义）。
- **依赖 T1/T2**：CI 必须用 `--yes`/`-Yes`，否则会立刻撞上「非 TTY 静默 exit 1」（正是本 Sprint 修掉的缺陷）。
- 该 step 的存在同时给 **Windows 侧 parity 提供首次运行机会**（§8-R2）——但**不得**把「step 存在」写成「已取证」。

### 3.7 T6 收尾

- `docs/sprint-3/done.md`：按 §1.1 判据表逐条给结论 + 每条 CG 的 `head_sha` + **逐字证据行**；`release_eligible` 的重判结论与缺口清单。
- L4：`docs/sprint-3/hill-climbing.md`（实践项晋升/降级，含 HB-6 的 `derived_commit_budget` 对照 = 6）。
- memory：`.kixpower/memory/repo/{lessons-learned,harness-backlog}.md`（新增/更新的 HB 项 + 回归检查）。
- `PROJECT_BRIEF.md` §7/§8 更新（阶段过渡锚点）。
- **终局 SHA 取证**：T5 之后的 push 产生新 run ⇒ 在**最终 HEAD** 上重取 CG1..CG5 并刷新 `progress.md` 的 L2 字段与 `l2_verified_sha`。

---

## 4. task DAG

```yaml
task_dag:
  nodes:
    - id: T1
      desc: "install.sh 非交互健壮性（--yes/-y + 非 TTY fail-closed + exit 3 + 文档与测试）"
      depends_on: []
      coupling: none
      estimated_tokens: medium
      target_rules:
        globs: [install.sh, INSTALL.md, README.md, README.en.md, scripts/copilot-installer.test.js]
        languages: [shell, markdown, javascript]
    - id: T2
      desc: "install.ps1 对称实现（-Yes + 输入重定向检测；本地无 pwsh ⇒ 静态 + CI 通道）"
      depends_on: [T1]
      coupling: strong            # T1 冻结的契约表是 T2 的直接输入
      estimated_tokens: medium
      target_rules:
        globs: [install.ps1, INSTALL.md, scripts/copilot-installer.test.js]
        languages: [powershell, markdown, javascript]
    - id: T3
      desc: "CI 取证框架 + Sprint 2 run（5c4d9ab）逐 gate 定档（provisional）"
      depends_on: []
      coupling: none
      estimated_tokens: low
      target_rules:
        globs: [docs/sprint-3/**, docs/qa/**]
        languages: [markdown]
    - id: T4
      desc: "sync-dsh-preset.cjs 大小写对称修复 + 同文件单侧归一化审计 + 本地可执行回归"
      depends_on: []
      coupling: none
      estimated_tokens: medium
      target_rules:
        globs: [scripts/sync-dsh-preset.cjs, scripts/sync-dsh-preset.test.js]
        languages: [javascript]
    - id: T5
      desc: "ci.yml 新增 installer 无人值守验证（CG5 载体；ubuntu/macos=sh 分支，windows=ps1 分支）"
      depends_on: [T1, T2]
      coupling: strong            # T1/T2 的开关是 T5 step 的直接输入
      estimated_tokens: low
      target_rules:
        globs: [.github/workflows/ci.yml]
        languages: [yaml]
    - id: T6
      desc: "收尾：done.md + L4 + memory + release_eligible 重判 + 终局 SHA 取证"
      depends_on: [T3, T4, T5]
      coupling: critical          # 需要与全部证据语义连贯（判据表逐条结算）
      estimated_tokens: medium
      target_rules:
        globs: [docs/sprint-3/**, .kixpower/memory/**, PROJECT_BRIEF.md]
        languages: [markdown]
  properties:
    max_antichain_width: 3        # ω：层 1 = {T1, T3, T4}
    critical_path_depth: 4        # δ：T1 → T2 → T5 → T6
    coupling_density: 0.40        # γ：强/关键耦合节点 3 / 6（T2=0.7, T5=0.7, T6=1.0）
    recommended_topology: hybrid
    layers:
      - layer: 1
        nodes: [T1, T3, T4]
        note: "三者互不依赖、文件不重叠；受 max_parallelism: 2（PROJECT_BRIEF）约束 ⇒ 分两批执行（T1+T4 先，T3 纯只读可随时）"
      - layer: 2
        nodes: [T2]
        note: "T2 必须镜像 T1 已冻结的契约表 ⇒ 强制串行"
      - layer: 3
        nodes: [T5]
        note: "CI 载体依赖两侧开关已存在"
      - layer: 4
        nodes: [T6]
        note: "收尾必须看到 T3/T4/T5 的全部证据 + 新 SHA 的 run"
    force_sequential:
      - [T1, T2]                  # 同一文件 scripts/copilot-installer.test.js + 契约对称要求
```

**拓扑路由核对**（TEAM_CONVENTIONS §拓扑路由规则，命中即停）：

```
命中强制串行条件？ 是 —— T1/T2 涉及同一文件（scripts/copilot-installer.test.js）且需契约语义连贯 ⇒ force_sequential
⇒ 实际执行拓扑 = sequential（层内并行受 max_parallelism=2 限制，且层 1 的 T1 与层 2 的 T2 之间有冻结契约的先后关系）
```

> **层划分说明**：T3/T4 虽在层 1，但**不阻塞** T1→T2→T5→T6 的关键路径（可交错执行）；δ=4 计的是**关键路径**深度，不是「必须等待 4 次串行」。

---

## 5. task_sizing 与 commit 预算

```yaml
task_sizing:
  inputs:
    task_count: 6                    # T1..T6
    dag_layers: 4                    # δ = critical_path_depth：T1 → T2 → T5 → T6
    dag_width: 3                     # ω = max_antichain_width：层 1 = {T1, T3, T4}
    strong_coupling_count: 3         # coupling ∈ {strong, critical}：T2, T5, T6
    coupling_density: 0.40           # γ
    bug_reserve: 1                   # 冷启动兜底（无跨 Sprint bug 统计；Sprint 2 同值）
  # ── 公式原样复算（不隐藏矛盾）──
  base: 4                            # = δ
  coupling_bonus: 3
  formula_derived_commit_budget: 8   # = 4 + 3 + 1
  # ── 实际绑定值（环境硬约束 + 层合并策略）──
  derived_commit_budget: 6           # 写回 progress.md 的 blast_radius.commit_budget
  binding_constraint:
    kind: environment（比公式更紧）
    evidence: >-
      kix-guards blast radius：本会话 1 小时窗口内 10 个 commit 硬上限（含 amend）；
      实际提交模型 = 4 个层 commit（C1 层 1 + C2 层 2 + C3 层 3 + C4 层 4）+ bug_reserve 1
      + **CI 载体首跑迭代 reserve 1**（CG5 为全新 step，Windows 首次执行 install.ps1，首红属预期失败面）= 6。
    consequence: >-
      公式的 coupling_bonus 被「按层合并 commit」让渡（Sprint 2 同型先例：公式 9 → 操作 6）。
      让渡不是「没看见」：公式值 8 与绑定值 6 并列输出，差额来源 = 回滚边界由「按节点」降级为「按层」。
  merge_policy: >-
    **每 DAG 层合并 1 个 commit**：层内节点同 commit 落盘（层 1 = T1 + T4 + T3 的 docs 登记）。
    禁止把同层节点拆成多个 commit（会同时击穿 ≤6 预算与 10-commit 硬上限）。
  hard_cap: 10
  warn_threshold: 13                 # δ*3 + bug_reserve = 12 + 1 > hard_cap ⇒ 预警通道结构性不可达（同 Sprint 1 OQ9 / Sprint 2 OQ13）
  over_cap: false
```

**操作值 `derived_commit_budget = 6`**，依据（三条，缺一不可）：

1. **层内耦合节点被同一层 commit 合法合并** ⇒ `coupling_bonus` 在「一层一 commit」的提交模型下过度计数。
   实证先例：Sprint 2 公式值 9 → 操作值 6（`docs/sprint-2/plan.md` §15）。
2. **实际提交模型**：C1 = 层 1（T1 + T4 + T3 的 docs 登记）· C2 = 层 2（T2）· C3 = 层 3（T5）· C4 = 层 4（T6）
   ⇒ 4 个层 commit + `bug_reserve` 1 = 5。
3. **新增 CI 载体的首跑迭代 reserve +1**（CG5 是全新 step，且 Windows 上首次执行 `install.ps1`；首次红是**预期内**的失败面）
   ⇒ 5 + 1 = **6**。

**相对「CI 结果入账前」的变化（回答 orchestrator 的预算问题）**：入账前的计划面为 4 个确定任务 + 1 个条件任务（parity FAIL 才做），
δ=3、强耦合 2 ⇒ 公式值 6、操作值 **5**。规划期只读取证把两件事变成必做：(a) 条件任务 T4 实为**已触发的 P0**（Windows 代码失败）；
(b) 新增 CG5 载体 T5 ⇒ δ 3→4、强耦合 2→3 ⇒ 公式值 6→8，操作值 **5→6（+1）**。
**结论：预算上调 1，止于 6**（与 Sprint 2 操作值同级，仍远低于 `hard_cap = 10`）。
用户侧「应显著小于 6」的期望在 CI 结果入账前成立（当时操作值 5）；CI 已实测出两个**新的 P0 级必做项**，故 6 是当前最小可行值。

> `warn_threshold = 13 > hard_cap = 10` ⇒ **预警通道结构性不可达**（跨过 5 即应人工记录预警，不依赖公式）。本 Sprint 显式登记该不可达性。

---

## 6. 门禁设计（verifiable_gates）

> **红线**：`cmd` 只引用 ① `package.json#scripts` 中**真实存在**的命令、② **真实存在**的系统命令（`bash`/`node`/`mktemp`/`grep`/`ls`/`wc`）、③ **真实的 `gh` 只读调用**。
> **不新增任何 npm script**、**不新增第三方依赖**。
> `host_requires` 为真实宿主能力要求，**无要求填 `[]`**；**任何在无 pwsh 本机恒 `unavailable` 的 `local_gate` 一律 `required: false` 且不计入通过面**。
> **`ci_gate` 不适用该条**：其宿主是 **runner**（不是本机），本地不可执行属**设计**；判据是 `head_sha` 绑定与逐 step 定档（沿用 Sprint 2 的 CG4/CG5 口径）。
> `ci_gate` 的宿主能力需求仍如实写进 `host_requires`（`[pwsh]` / `[bash]` / `[gh-workflow-scope]`）。

```yaml
verifiable_gates:
  local_gate:
    - id: LG1
      type: local_gate
      cmd: "npm run test:installer"
      expect: >-
        exit 0。darwin（本机无 pwsh）：`# fail 0`；`# skipped 0`（Sprint 2 的 P2 硬判据不得回退；
        新增用例**不得**以 windows-only skip 实现）。通过用例数由 T1 实测回填，**不得预填常数**；
        新增非交互用例 ≥3 条（正向 0 / 无开关 exit 3 + 标记 / 标记非恒真反向控制）。
        win32 平台型 skip 若出现，必须逐条列举并说明（不得概括）。
      required: true
      host_requires: []
      covers: [T1, T2, T4]
    - id: LG2
      type: local_gate
      cmd: "npm run test:consistency"
      expect: "exit 0；stdout 含 `CONSISTENCY OK`；`sync-dsh-preset.cjs` 仍在其语法/镜像守护面内（T4 未破坏三副本一致性）"
      required: true
      host_requires: []
      covers: [T4]
    - id: LG3
      type: local_gate
      cmd: "npm test"
      expect: "exit 0。端到端判据：证明 `&&` 链 5 段在**同一 revision** 上真实执行（不依赖任何一段的间接推断）"
      required: true
      host_requires: []
      covers: [T1, T2, T4]
    - id: LG4
      type: local_gate
      cmd: "node --test scripts/sync-dsh-preset.test.js"
      expect: >-
        exit 0；`# fail 0`。T4 的三条验收全部可见：
        ① 新增/改造的 `isInside` 用例对 `caseInsensitive: true|false` **两支各断言一次**（含大写盘符形态的合成路径）；
        ② `# skipped` 不高于 Sprint 2 的平台型 skip 数（**不得新增 windows-only skip**）；
        ③ 用例可在无 pwsh 的 darwin 本机执行（不 spawn `pwsh`）。
      required: true
      host_requires: []
      covers: [T4]
    - id: LG5
      type: local_gate
      cmd: "node --test skills/kixpower/tests/ps1-parity.test.js"
      expect: >-
        **差分对拍（E1）三态**：`parity: PASS` / `parity: FAIL` / `parity: unavailable`。
        **本机（darwin，无 pwsh）恒为 `unavailable`** —— 不是 skip、不是 pass、不是「已覆盖」；
        其证据职能由 **CG4** 承载（见 §6 的 ci_gate）。若宿主具备 pwsh，同一 gate 语义不变地产出三态。
      required: false
      host_requires: [pwsh]
      covers: [T4]
    - id: LG6
      type: local_gate
      cmd: "node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 2"
      expect: >-
        exit 0；stdout 含 `[Verification Fidelity]` 段与 `fidelity_v5:` YAML 段，且
        `ungated: 0 (0%)` + `PASS`。**窗口必须随行声明**：`--prev-sprint 2` ⇒ baseline = `ef6a485`（Sprint 2 的 `progress.sprint_baseline_sha`）。
        §7 的 `>20% → 强制扩展 target_rules` 规则按此读数判定（**未触发**）。
        读数与结论行必须**同源同窗**（HB-9）：跨窗口/跨运行抄写读数视为证据污染。
      required: true
      host_requires: []
      covers: []
    - id: LG7
      type: local_gate
      cmd: "d=$(mktemp -d); bash install.sh --dry-run --yes \"$d\" </dev/null; echo yes=$?; bash install.sh --dry-run \"$d\" </dev/null; echo noflag=$?; rm -rf \"$d\""
      expect: >-
        **installer 无人值守（本地 sh 侧）**：
        `yes=0`（开关给出的正向路径，且该分支输出**不得**含 `KIX-INSTALLER-CONFIRM-REQUIRED` —— 标记非恒真的反向控制）；
        `noflag=3` 且输出含 `KIX-INSTALLER-CONFIRM-REQUIRED`（修复前为**静默 exit 1 无输出**）。
        二者缺一 ⇒ unmet（不得只跑正向）。
      required: true
      host_requires: []
      covers: [T1]
  manual_gate:
    - id: MG1
      type: manual_gate
      cmd: "grep -n 'KIX-INSTALLER-CONFIRM-REQUIRED' install.sh install.ps1; grep -nE '\\-\\-yes|\\-y\\)' install.sh; grep -n '\\-Yes' install.ps1; grep -nE '\\-t 0|IsInputRedirected' install.sh install.ps1"
      expect: >-
        契约表（§3.1）逐条对称：① 两侧标记名逐字相同（各 ≥1 命中）；② 两侧各有开关解析（sh：`--yes`/`-y`；ps1：`-Yes`）；
        ③ 两侧各有非 TTY 判定（`[ -t 0 ]` / `[Console]::IsInputRedirected`）；④ 两侧该分支退出码 = 3。
        **只证明声明存在，不证明行为**（ps1 行为验证只能走 CG5）。
      required: true
      covers: [T1, T2]
    - id: MG2
      type: manual_gate
      cmd: "grep -nE '\\-\\-yes|\\-Yes|非交互|unattended' INSTALL.md README.md; grep -c 'yes' install.sh"
      expect: >-
        文档承诺闭环：`INSTALL.md`（+ 必要时 `README.md`）显式写明 `--yes` / `-Yes` 与非交互契约，
        并**明示契约反转**：`printf 'y\\n' | install.sh` 不再被接受（旧行为 exit 0 ⇒ 新行为 exit 3 + 标记）。
        `install.sh` 头部注释（= `--help` 输出）必须含 `--yes`。缺任一 ⇒ unmet。
      required: true
      covers: [T1, T2]
    - id: MG3
      type: manual_gate
      cmd: "grep -nE 'ci-evidence|windows-red|parity-oracle|fidelity-window|release-eligible' docs/sprint-3/progress.md"
      expect: >-
        `progress.md` 存在四条证据行，且**每条都带 `sha` 字段**：
        `ci-evidence (sha=…)`（§1.2 的证据单元）、`windows-red (sha=…)`（代码失败/环境失败分类结论）、
        `parity-oracle (sha=…)`（含 runner oracle 版本号）、`fidelity-window (prev-sprint=2, baseline=ef6a485)`。
        缺任一行或行内无 sha ⇒ unmet。
      required: true
      covers: [T3, T6]
    - id: MG4
      type: manual_gate
      cmd: "grep -nE 'case-normalization-audit:' docs/sprint-3/progress.md"
      expect: >-
        T4 的同文件审计留痕：逐条列出 `sync-dsh-preset.cjs` 中所有「只归一化一侧」的比较（对称/不对称/不适用），
        **不得**只给「已修一处」的结论。缺行 ⇒ unmet。
      required: true
      covers: [T4]
    - id: MG5
      type: manual_gate
      cmd: "grep -nE 'ps1-unverified|installer-unattended' docs/sprint-3/progress.md"
      expect: >-
        诚实声明行：`ps1-unverified`（`install.ps1` 非交互行为**本机不可验证**，唯一通道 = CG5）与
        `installer-unattended`（C5 的成立状态与缺口）。**禁止**出现「install.ps1 非交互已验证」的表述。
      required: true
      covers: [T2, T6]
  ci_gate:
    - id: CG1
      type: ci_gate
      cmd: "gh run view <run-id> -R slchris/kixparadigm --json headSha,event,status,jobs"
      expect: >-
        通道与绑定：workflow `ci` 为 `active`；`headSha == Sprint 3 最终 HEAD`（完整 40 位）；
        逐 job 列出 `name => conclusion`。`gh run list` 或 PR rollup 的总体结论**不得**替代逐 job 结论。
      required: true
      host_requires: [gh-workflow-scope]
      covers: [T3, T6]
    - id: CG2
      type: ci_gate
      cmd: "gh run view <run-id> -R slchris/kixparadigm --json jobs  # 6 个 test job"
      expect: >-
        主矩阵 6/6 `success`（ubuntu/windows/macos × node 20.16.0/22.x，zh + en `npm test`），
        **且 windows × 2 由 `failure` 转 `success`**（这是 `release_eligible` 的硬判据）。
        各 job `# skipped 0`；出现平台型 skip 必须逐条列举并说明。
        任一红 ⇒ 先按 §3.4 分类（代码失败 vs 环境失败），**不得**直接记为「环境问题」。
      required: true
      host_requires: [gh-workflow-scope]
      covers: [T1, T2, T4]
    - id: CG3
      type: ci_gate
      cmd: "gh run view <run-id> -R slchris/kixparadigm --json jobs  # pack dry-run"
      expect: "`pack dry-run` = `success`（zh + en 各一次 `npm pack --dry-run`）；headSha 绑定同上"
      required: true
      host_requires: [gh-workflow-scope]
      covers: []
    - id: CG4
      type: ci_gate
      cmd: "gh run view <run-id> -R slchris/kixparadigm --json jobs  # 含 parity step 的 test job 日志"
      expect: >-
        **E1 的唯一判定载体（三态定档）**，逐 step 读 `Parity vs pwsh reference (E1, three-state)` 的结论与逐字状态行：
        ① `parity: PASS` + step `success`（exit 0）⇒ 唯一可称「**行为等价**（fixture 覆盖范围内）」的档位；
        ② `parity: FAIL`（exit 1）⇒ **已证伪「忠实移植」** ⇒ 记 P0 并走 §3.5 的 **T4-B** 回退路径；
        ③ `parity: unavailable`（exit 2）⇒ 记 **unavailable**（不计入通过）并核对 runner 镜像变更；
        ④ **step `skipped`** ⇒ 记 **未执行**（不是 pass、不是 unavailable）—— 前序 step 失败时会出现（`5c4d9ab` 的 Windows 即此情形）。
        **平台盲区**：Windows 侧 parity 至今**从未执行**；CG2 转绿后其首次运行结果同样按 ①–④ 定档。
        oracle 版本必须随行记录（规划期实测：macOS `7.6.5` / ubuntu `7.6.6`，均 PASS）。
      required: true
      host_requires: [pwsh, gh-workflow-scope]
      covers: [T4]
    - id: CG5
      type: ci_gate
      cmd: "gh run view <run-id> -R slchris/kixparadigm --json jobs  # installer unattended step"
      expect: >-
        **installer 无人值守验证（T5 建立的载体；本 Sprint 前不存在）**：
        ubuntu + macos：`install.sh --dry-run --yes` ⇒ exit 0（且输出不含标记）；`install.sh --dry-run`（stdin 重定向）⇒ **exit 3** + `KIX-INSTALLER-CONFIRM-REQUIRED`；
        windows：`install.ps1 -DryRun -Yes` ⇒ exit 0；`install.ps1 -DryRun`（stdin 重定向）⇒ **exit 3** + 同名标记。
        step 缺失 ⇒ C5 不成立 ⇒ `release_eligible: false`（缺口 = C5）；
        windows 分支因 P3/P4 不可执行 ⇒ 记 `unavailable` 并写明，**不得**记为 pass。
      required: true
      host_requires: [pwsh, bash, gh-workflow-scope]
      covers: [T1, T2, T5]
```

**L2 必需 gate 集合**：`required: true` 的 `local_gate` = **[LG1, LG2, LG3, LG4, LG6, LG7]**（6 条），
按 `id` 排序后规范化 `{id, type, cmd, expect, required, host_requires}` 计算 `l2_gate_manifest_sha256`。
**LG5 不在集合内**（`required: false` + `host_requires: [pwsh]`，本地永久 `unavailable` ⇒ 按 TEAM_CONVENTIONS §verifiable_gates 硬约束 1 不得计入通过）。
`ci_gate` / `manual_gate` 不进 digest，但**计入 QA 签署证据与 §1.1 的判定表**。

```yaml
drift_whitelist_additions:
  - pattern: "docs/sprint-3/**"
  - pattern: ".kixpower/memory/**"
  # 仍**不**白名单化 install.sh / install.ps1 / scripts/sync-dsh-preset.cjs / .github/**：
  # 它们是本 Sprint 的实质交付面，必须被 true_out_of_scope 计算纳入
```

---

## 7. 证据强度阶梯与明令禁止项

**阶梯（不得越级，沿用 Sprint 2 §16.2 口径并按本 Sprint 的实证扩充）**：

```
CG4 PASS（具备 pwsh 的 runner；fixture 覆盖范围内）  → "行为等价"                    —— 唯一可称「等价」的档位
CG2 全绿 + LG1..LG4/LG6/LG7 全绿 @ 同一 SHA          → "在该 revision、该矩阵上可复现为绿"   —— 不等于「跨平台等价」
本地 characterization / 单测绿（无 CI）               → "与固定期望一致"                —— **≠ 与 .ps1 等价**
LG5 = unavailable / CG4 step skipped                 → "未取证"                       —— 不得写作 pass / skip / 已覆盖
文件存在 / 声明存在（MG1 静态命中）                   → "声明已落地"                    —— **≠ 宿主上生效**
```

**明令禁止（写入 QA 拒签条件）**：

1. 把「characterization 绿」写成「与 `.ps1` 等价」。
   **本 Sprint 的实证命中**：Sprint 2 的 `sync-dsh-preset.cjs` 本机 characterization 全绿，Windows 上 2 条红 —— 这条原则**已从「风险」变成「已发生的事实」**（§3.5）。
2. 把 `unavailable` / `skipped` 记为 `pass` / 「已覆盖」/ 「无差异」。
3. 用「文件已存在」「测试绿」替代「在真实宿主上生效」。
4. **单平台绿不得表述为「跨平台等价」**：`5c4d9ab` 上 ubuntu/macOS 的 `parity: PASS` **只能**写「POSIX 侧差分对拍通过；Windows 侧未执行」。
5. **CI 结论必须绑定 `head_sha`**；旧 SHA 的 success **不得**为新 revision 背书；也不得把「CI 能跑」当作「CI 结论可信」（P1）。
6. 把 Windows 红**静默归因**为「环境失败」：分类必须给出失败 step 名 + 失败用例名 + 机器可读错误行（§3.4 判据）。
7. 把「CG5 step 已存在」当作「installer 无人值守已验证」；把「静态对称（MG1）」当作「`install.ps1` 行为已验证」。

---

## 8. 残余风险与前置依赖

| ID | 风险 / 前置依赖 | 影响 | 处置 / falsifier |
|---|---|---|---|
| **R-1** | **PR #1 未合并**：`slchris/kixparadigm#1`（`feature/sprint-2-node-first-host-parity` → 上游），`state: OPEN`、`mergeable: MERGEABLE` | 合并动作**属发布/外部副作用**，本 Sprint 不自动执行；但 push 到该分支即可更新其检查 | 用户已授权 push + 开 PR；合并仍需用户决策。CG 判据不依赖「已合并」，只依赖 run 的 `head_sha` |
| **R-2** | **Windows 侧 parity 平台盲区**：`5c4d9ab` 的 Windows job 中 parity step 被 skip（非 `if: always()`） | 本项目**尚无 Windows 侧差分对拍证据**；Windows 首次执行若 `FAIL` ⇒ 「忠实移植」在 Windows 被证伪 | T4 修好 `npm test` 后 Windows parity 首次运行 ⇒ 按 CG4 ①–④ 定档；`FAIL` 走 T4-B |
| **R-3** | **runner pwsh 版本差异**（macOS `7.6.5` / ubuntu `7.6.6` 实测；Windows 未知） | 版本变更可能导致 JSON 序列化/换行差异 ⇒ 误判 `FAIL` | CG4 记录 oracle 版本；镜像变更时重判（同 Sprint 2 R-6 的 `unavailable` 处置） |
| **R-4** | **CI 结论只对特定 SHA 有效**；Sprint 3 每个 commit 都可能使前一轮 CG 失效 | 收尾时的 CG 必须来自**最终 HEAD** 的 run | §1.2 纪律；T6 明确「终局 SHA 取证」 |
| **R-5** | **环境失败 vs 代码失败的误判**：网络/配额/镜像拉取失败会产生红 | 误记为代码缺陷（浪费预算）或误记为环境问题（掩盖真缺陷） | §3.4 的机械判据 + 1 次 `rerun` 上限；rerun 后仍同类失败 ⇒ 记为代码失败 |
| **R-6** | **1 小时窗口 / 10 commit 硬上限（含 amend）+ CI 等待时间** | CI 一轮 6 job 需数分钟；若 T5 首跑红，迭代会挤压窗口 | 操作预算 6；层 1 的 T3/T4 与 CI 等待并行；CI 等待不计入 commit |
| **R-7** | **契约反转的用户可见性**：`printf 'y\n' \| install.sh` 由 exit 0 → exit 3 | 未文档化的用法被打破 | P6：全仓 0 命中 ⇒ 健壮性缺口；MG2 强制文档化 + `INSTALL.md` 明示 |
| **R-8** | **`>20% → 强制扩展 target_rules` 规则**：Sprint 2 结转的「被触发但未处置」项 | 若 Sprint 3 复跑仍 >20% 则必须机械扩展 | **规划期实测：`--prev-sprint 2`（baseline `ef6a485`）⇒ `ungated: 0 (0%)` / `PASS` ⇒ 未触发**（逐字输出见 `docs/sprint-3/drift-check.md` §5；HB-9 同源同窗）。执行期由 LG6 复跑确认 |
| **R-9** | **`install.ps1` 本机不可执行**（无 pwsh）；P3/P4 未取证 | T2 的完成定义被迫封顶在「静态 + CI 通道」 | §3.3 的处置 + MG5 的诚实声明行；CG5 windows 分支为唯一行为通道 |
| **R-10** | **Sprint 2 的 `release_eligible: false` 的最终答案已由本轮 CI 给出：矩阵红 ⇒ 不满足** | Sprint 2 的 `done` 与发布可用性解耦，其记录不回写 | `docs/sprint-3/drift-check.md` §3 登记为**错误传播**证据（Sprint 2 的 CONDITIONAL 唯一理由 = CI pending，现已定档为「未达成」） |
| **R-11** | **`npm run test:installer` 的计数判据不能预填常数**（新增用例数未知） | 预填会导致「判据看起来过严/过松」 | LG1 显式写「由 T1 实测回填，不得预填」；执行期在 `progress.md` 回填 N |

**前置依赖（硬）**：

1. `gh` 已认证且含 `workflow` scope（规划期实测：`gist, read:org, repo, workflow`）。
2. fork 上 workflow `ci` 为 `active`（规划期实测）。
3. 用户授权 push 到 fork（**已授权**）。
4. 本机 `node` 可用（`v22.14.0`），`bash` 可用；**`pwsh` 缺失**（LG5 因此 `required: false`）。

---

## 9. 本 Sprint 不做什么（explicit non-goals）

| 不做 | 理由 |
|---|---|
| **不做 H-set-B 的 6 个 hook 移植**（`validate-handoff` / `validate-qa-signoff` / `qa-freshness-check` / `cleanup-qa-session` / `auto-update-progress` / `pre-commit-lint-check`） | 用户**明确未选** B/C/D；只在 §11 登记为 Sprint 4 主候选。当前状态如实保留：这 6 条声明在无 pwsh 宿主上**不触发**（= 不是已生效门禁） |
| **不做「以 DSH 插件为主路径」的重定位** | 用户明确未选；本 Sprint 不评估架构方向 |
| **不修 F-3 / F-4 / F-5 / F-6** | 全部属**产品码改动**（installer 作用域与原子性 / `TOOL_LIKE_KEY` / 镜像登记 / 判据强度），会扩大 installer 与 hook 面 ⇒ 登记 §11（F-4 须与真实载荷取证同批） |
| **不处置 HB-8..HB-13 六项 candidate** | 本 Sprint 只做「登记 + 结转」；`applies_to_sprints: ">=3"` 的匹配结论在 §12 逐条给出 |
| **不发布、不合并上游 PR、不打 tag、不 `npm publish`** | 发布动作需用户显式指令；`release_eligible` 的**判定**本 Sprint 完成，**执行**不在范围内 |
| **不改写 Sprint 1 / Sprint 2 的任何已完成文档** | 只读 + 引用；结论一律以「追加 + 标注 Sha」表达（`docs/sprint-3/**` 内） |
| **不改 `skills/` `agents/` `en/` `dsh/` 下的非文档文件** | 与用户红线一致；本 Sprint 的交付面限于 `install.sh` / `install.ps1` / `scripts/sync-dsh-preset.*` / `.github/workflows/ci.yml` / 文档 |
| **不新增 npm script、不新增第三方依赖** | 项目零依赖约束；门禁只引用既有命令 |
| **不把 parity 挂进 `npm test` 链** | 无 pwsh 宿主会使链红；parity 走独立 gate（LG5 / CG4） |
| **不删除任何 `.ps1`** | 它们是 parity 的**参照实现**（`.ps1:48,80,92,93,115,135` 的 `OrdinalIgnoreCase` 即 T4 的判据来源） |

---

## 10. 交付物与责任人

| 交付物 | 责任人 | 判据 |
|---|---|---|
| `install.sh` 非交互契约 + 测试 + 文档 | Dev（T1） | LG1/LG3/LG7 + MG1/MG2 |
| `install.ps1` 对称实现 | Dev（T2） | MG1（静态）+ CG5（行为，windows） |
| `scripts/sync-dsh-preset.cjs` 大小写对称 + 回归 | Dev（T4） | LG4 + MG4 |
| `.github/workflows/ci.yml` 的 installer 无人值守 step | Dev（T5） | CG5 |
| `progress.md` 的 `ci-evidence` / `windows-red` / `parity-oracle` / `fidelity-window` 行 | Orchestrator（T3/T6） | MG3 |
| `docs/sprint-3/done.md` + `hill-climbing.md` + memory + Brief §7/§8 | Producer（T6） | §1.1 判据表逐条结算 |
| QA 签署（`docs/qa/qa-signoff-3.md`） | QA | 合法状态：`PASS \| CONDITIONAL \| REVERIFY_REQUIRED \| FAIL`；`CONDITIONAL` 只能且必须因 `ci_pending: true` |

---

## 11. Sprint 4 候选登记（**只登记，不在本 Sprint 实施**）

| ID | 候选 | 触发条件 / 备注 |
|---|---|---|
| **N12** | **H-set-B：6 个 hook 从 `.ps1` 移植**（`validate-handoff` / `validate-qa-signoff` / `qa-freshness-check` / `cleanup-qa-session` / `auto-update-progress` / `pre-commit-lint-check`，合计 991 行 ps1 × 3 副本） | 用户选择该范围；其中 `validate-qa-signoff` + `qa-freshness-check` + `cleanup-qa-session` **必须同批**。当前在 macOS 的 Copilot 路径**静默不触发** |
| **N13** | F-3：installer 残留扫描作用域收窄到「本 bundle 写入的文件」+ 失败原子性 | HB-10；**不得**与 T1/T2 同批（避免签署失效反复） |
| **N14** | F-4：`TOOL_LIKE_KEY` 补 `arguments`/`parameters`/`function` | HB-11；**须与真实载荷采样同批**（R-2/OQ8/OQ9） |
| **N15** | F-5：`skills/kixpower/hooks/README.md` 纳入机器守护的 identical-set 组 | HB-12 |
| **N16** | F-6：LG16 判据强度（marker 不得复用成功路径横幅；ps1 侧断言改为文案/注释级判别） | HB-13 |
| **N17** | HB-8：非历史文档中 pwsh-only 维护指令（`sync-dsh-preset.ps1`）的**残留 4 处**清零 + 机械判据 | `docs/sprint-2/done.md` §5-R-7 |
| **N18** | OQ8/OQ9：真实 Copilot 宿主语义取证（hook spawn 失败 = deny/ignore；真实 payload schema） | 决定 N12 的定级与 F-4 是否升级为 P1 |
| **N8–N11** | 沿用 `docs/sprint-2/plan.md` §18（hooks `.ps1` 漂移对齐 / H-set-B / CI 侧 E1 常态化 / `install.ps1` 本地可跑） | N9 已被 N12 取代（同对象），其余保持 |

---

## 12. Evals 回归与 scoped trials（v4.1）

| 项 ID | `eval.trigger` | 本 Sprint 是否匹配 | 落实位置 | 本 Sprint 记录 |
|---|---|---|---|---|
| **HB-1** | 新增/修改的测试用例 spawn 外部可执行文件 | ✅ 匹配：T1 的用例 spawn `bash install.sh`；T5 的 step spawn `pwsh -File install.ps1` | LG1/LG7/CG5（能力探针 + 平台型 skip 文案） | `scoped trial`（沿用 Sprint 2 的 trial 判定口径） |
| **HB-3** | gate 引用 `&&` 链或 canonical 入口本身是链 | ✅ 匹配：LG3 = `npm test` 全链；T5 的 step 是**多段链**（正向 + 负向 + 反向控制） | §6 的 LG1/LG3/LG7 拆分 | `scoped trial` |
| **HB-4** | 环境状态断言 | ✅ 匹配：LG7/CG5 的「stdin 重定向 / 非 TTY」是**显式环境构造** | T1 契约表 §3.1 | `scoped trial` |
| **HB-6** | plan.md 生成 `derived_commit_budget` | ✅ 匹配 | §5 的 `6` | `post-sprint` 判定：`git rev-list --count 5c4d9ab..HEAD` ≤ 6 → trial pass |
| **HB-7** | 安装/同步的批量替换、chmod、占位符展开步骤 | ✅ 匹配：T1/T2 直接改 installer 的确认与失败关闭路径 | T1/T2 契约表 + LG7 | **`pass_criteria` 扩展**：新增「非交互契约存在且**被反向控制证明非恒真**」一条 |
| **HB-9** | 结论层必须与自身证据同源同窗（诊断指标逐字输出块与结论行同一次运行；窗口随行声明） | ✅ 匹配：LG6 与 `drift-check.md` §5 的 fidelity 逐字块 | §6-LG6 + MG3 的 `fidelity-window` 行 | **`candidate` → 本 Sprint 按既定实践应用**（不复用 Sprint 2 的跨窗口读数） |
| **HB-10 / HB-11 / HB-12 / HB-13** | installer 作用域 / fail-closed 键名枚举 / 文档类镜像 / 判据强度 | ⬜ `not triggered`（对应修法均在 §11 登记，本 Sprint 不实施） | — | `not triggered`（**不得**写成通过） |
| **HB-2 / HB-5 / HB-8** | 基线绿 / 冻结凭据 canonical 产出 / 维护调用点检索面 | ⬜ `not triggered` | — | `not triggered` |

> **`validated` 项**（Sprint 2 晋升的 HB-1/HB-3/HB-4/HB-5）在本 Sprint 作为既定实践应用并监测回归；
> 其中 HB-5（冻结凭据必须由 canonical 实现产出）在 T6 的 `l2_gate_manifest_sha256` 复算上继续生效。

---

## 13. 开放问题（未取证事项，**不得当作已定结论**）

| ID | 问题 | 影响 | 取证方式 / falsifier |
|---|---|---|---|
| **OQ14** | **Windows 侧 parity 首次运行结果未知**（`5c4d9ab` 时被 skip） | 若 `FAIL` ⇒ 「忠实移植」在 Windows 被证伪，T4-B 生效 | CG4（Windows 首次执行）；falsifier = `parity: FAIL` |
| **OQ15** | **`[Console]::IsInputRedirected` 在 GHA `windows-latest` step 下的语义**（P3） | 决定 T2 的非 TTY 分支能否在 CI 上被判别 | CG5 windows 分支；不可执行 ⇒ `unavailable` |
| **OQ16** | **`install.ps1 -Yes` 的 switch 绑定**（P4） | `-Yes` 若解析失败则 CG5 红 | CG5；本地无 pwsh ⇒ 不可本机验证 |
| **OQ17** | **`5c4d9ab` 的 Windows 红是否**只**由 `isInside` 一处引起**（P5） | 若修后仍红且失败点不同 ⇒ 不止一处平台缺陷 | 新 run 的 Windows job 结论；仍红 ⇒ 升级 orchestrator 做范围判断 |
| **OQ18** | **未知参数被当作目标路径**（`install.sh:50` 的 `*) CUSTOM_TARGET="$arg"`）：`install.sh --yess <dir>` 会静默把 `--yess` 当目标 | 误用会被静默吞掉（与本 Sprint 修的「静默失败」同族） | 本 Sprint **不修**（§2.3 记为不设 task）；falsifier = 出现一次真实误用 |
| **OQ19** | **`release_eligible` 的上游消费者**：谁读这个字段、发布动作由谁执行 | 决定 `done.md` 的表述边界（本 Sprint 只产出判定，不执行发布） | 用户/PRODUCER 决策；本 Sprint 按「只判定不发布」处置 |

---

> **规划期自检（R-8 防重犯）**：本文件 frontmatter 为标准 YAML 块（`---` 包裹），已用 PyYAML `safe_load` 验证；
> `docs/sprint-3/progress.md` 的 frontmatter 同验。规划期**未运行**的读数一律标注为「执行期回填」，不预填、不伪造。
