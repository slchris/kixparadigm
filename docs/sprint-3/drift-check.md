# Drift Check — Sprint 2 → Sprint 3（规划期骨架）

> 生成时间：2026-09-22｜生成者：kixpower-producer (Remy)｜**规划期骨架**
> 输入：`docs/sprint-2/{plan,done,hill-climbing,drift-check}.md`、`docs/qa/qa-signoff-2.md`、
> `.kixpower/memory/repo/{harness-backlog,lessons-learned}.md`、`PROJECT_BRIEF.md`、`docs/sprint-3/runtime-context.md`、CI run `35729103867` / `35729139524`。
>
> **性质声明**：本文件是 **Sprint 3 规划期**的漂移检查。**已实测的读数逐字给出并标注命令与窗口**；
> **未运行**的项一律标 `not run` / `未取证`，**不预填、不转录他处读数**（HB-9：结论行必须与自身证据同源同窗）。

---

## 1. 方法（沿用 Producer 核心职责 #5 的 4 项检查）

| # | 检查 | 本 Sprint 的落点 |
|---|---|---|
| 1 | **context drift** | §3：Sprint 2 计划期的事实假设 vs Sprint 3 规划期的实测事实 |
| 2 | **error propagation** | §4：Sprint 2 的缺陷如何跨 Sprint 传播（含「本地全绿 ⇒ 平台盲区」这一机制） |
| 3 | **tech debt** | §6：F-3..F-6 / HB-8..HB-13 / R-1..R-8 的处置与结转 |
| 4 | **verification fidelity（量化）** | §5：`verification-fidelity-check.cjs` 逐字输出 + `>20%` 规则的判定 |

---

## 2. provenance（本文件的读数来源）

| 读数 | 命令 | revision / 窗口 | 性质 |
|---|---|---|---|
| fidelity | `node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 2` | baseline `ef6a48550a40bf433555790419fd4c2fd0cf1483`（Sprint 2 的 `progress.sprint_baseline_sha`），HEAD `5c4d9ab` | **规划期实测**（逐字块见 §5） |
| CI 结论 | `gh run view 35729103867 / 35729139524 --json …`、`gh api …/jobs/<id>/logs` | `head_sha = 5c4d9aba59a584c64199510245dbc1724f310fb0` | **规划期只读复核**（逐字证据见 `progress.md` §3） |
| Sprint 2 终态 | `docs/sprint-2/{done,hill-climbing}.md`、`docs/qa/qa-signoff-2.md` | 证据 revision `42d3c7e` | 引用（不改写） |

---

## 3. context drift（Sprint 2 计划期 → Sprint 3 规划期）

| # | Sprint 2 计划期/收尾期的事实假设 | Sprint 3 规划期实测 | 漂移性质 |
|---|---|---|---|
| D-1 | 「CG4/CG5 在本 Sprint **大概率仍 pending**（fork 无 workflow 注册、未授权 push/PR）」（`sprint-2/plan.md` OQ12 / `PROJECT_BRIEF.md` R4） | ✅ **已推翻（正向）**：用户授权 push + 开 PR ⇒ workflow `ci` 注册为 `active`，两个 run 已产出；**CG4 在 ubuntu/macOS 实测 `parity: PASS`** | 阻塞解除（Sprint 1 起的 CI 阻塞点终结） |
| D-2 | 「`install.ps1` 的唯一可执行验证通道 = CG5（windows smoke）」（`sprint-2/plan.md` §13.2、`qa-signoff-2.md` R-3） | ❌ **CG5 至今不存在载体**：`.github/workflows/ci.yml` 无任何 `install.ps1` 执行步骤 ⇒ 该通道从未建立 | 计划承诺未落地（本 Sprint T5 建立） |
| D-3 | 「`sync-dsh-preset.cjs` 移植由 characterization（本机 32/32）覆盖」 | ❌ **被 CI 证伪**：windows × 2 job 红，失败点即该文件（case 28/32） | **实证命中** Sprint 2 §16.2 的「characterization 绿 ≠ 与参照等价」 |
| D-4 | 「本地无 pwsh ⇒ 最强证据通道（E1）本地恒 `unavailable`，只能等 CI」 | ✅ 部分兑现：CI 通道已通且 POSIX 侧 PASS；**但 Windows 侧 parity step 被 skip（未执行）** | 局部兑现 + **新增平台盲区** |
| D-5 | 「Sprint 2 的 `done` + `release_eligible: false` + QA `CONDITIONAL`（唯一理由 = CI pending）」 | CI 已定档：**主矩阵红**（Windows）⇒ `release_eligible: false` 的理由从「pending」变为「**实测不满足**」 | 结论强化（**Sprint 2 的记录不回写**，只在此登记） |

---

## 4. error propagation（错误如何跨 Sprint 传播）

| # | 传播链 | 机制成因（**必须记住的不是结论，是机制**） | 阻断点（本 Sprint） |
|---|---|---|---|
| E-1 | Sprint 2 T4 的 `sync-dsh-preset.cjs` 移植引入 `isInside` 的**单侧归一化**（只小写 root、不处理 candidate）→ Windows 上把 bundle 内路径误判为「逃逸」→ `npm test` 红 → CI 主矩阵红 → `release_eligible` 恒 false | **本地平台是 CI 平台集合的真子集**：本机只覆盖 darwin（POSIX），win32 分支**结构性无本地证据** ⇒ 「本机全绿」永远不能排除 win32 分支的缺陷 | T4 的验收强制：回归用例必须**可在无 pwsh 的 macOS 本地执行**（可注入纯函数 + 大小写不敏感分支的双向断言），**禁止** windows-only skip |
| E-2 | 「本地绿 ⇒ 可发布」的推断被平台差异击穿 | Sprint 2 的 gate 设计已允许**平台型 skip**（LG1 在 win32 有平台型 skip）⇒ 「绿」的平台范围必须与其声明一致 | `plan.md` §7 禁止项 4：单平台绿不得表述为「跨平台等价」 |
| E-3 | 「job 存在 ⇒ 该 gate 已定档」的推断被 step 跳过击穿 | GitHub Actions 默认**前序 step 失败 ⇒ 后续 step 不执行**（非 `if: always()`）⇒ 红 job 里可能有**从未运行**的 gate | `plan.md` §1.2 纪律 1 + §3.4 的逐 step 定档（`skipped` 记为**未执行**，不是 pass/unavailable） |
| E-4 | Sprint 2 的 `CONDITIONAL`（唯一理由 CI pending）在「CI 已定档为红」后失去待决状态 | `CONDITIONAL` 只能因 `ci_pending: true`；pending 结算为「不满足」时结论必须是 `release_eligible: false` + 缺口清单 | `plan.md` §1.1 判据表（Sprint 3 的判定必须逐条给缺口，不用「pending」含糊） |

---

## 5. verification fidelity（量化）— **规划期实测，逐字块**

**命令**（窗口声明随行，HB-9）：

```bash
node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 2
```

**逐字输出（2026-09-22 规划期，HEAD = `5c4d9ab`）**：

```text
=== Verification Fidelity Check v5.7 ===
Sprint: 2 | Since: 2026-09-22 | Rules: False
Baseline: ef6a48550a40bf433555790419fd4c2fd0cf1483 (progress.sprint_baseline_sha)

[Scope Rules]
  globs: 85
  modules: 38 -> 2028 expanded
  unresolved_modules: 1
    - installer
  mechanical_links: 49 -> unresolved_offline: 49
  legacy target_files: 0
  total scope globs: 183

[Verification Fidelity]
  total changed: 75
  in_scope (rules): 70
  whitelisted: 5
  ungated: 0 (0%)
  PASS

[Fidelity v5.7 累积度量]
fidelity_v5:
  sprint: 2
  baseline_sha: ef6a48550a40bf433555790419fd4c2fd0cf1483
  baseline_source: progress.sprint_baseline_sha
  ungated_ratio_pct: 0
  ungated_ratio_delta_vs_prev: 0  # stable
  liveness_marked_tasks: 0
  dead_path_tasks: 0
  gated_off_tasks: 0
```

**结论（与上方读数同源同窗）**：

1. `ungated: 0 (0%)` + `PASS` ⇒ **`>20% → 强制扩展 target_rules` 规则未被触发**。
   本 Sprint 的 `target_rules` 按**覆盖优先**设定（`plan.md` §4），不因无法量化而收缩，也不因本读数为 0% 而放宽。
2. **窗口口径（关键，防 HB-9 型污染）**：本读数的窗口 = `--prev-sprint 2` ⇒ baseline `ef6a485`，覆盖 **Sprint 2 的改动集**。
   Sprint 2 收尾时被引用的 `23.4% (15/64)` / `27.8% (22/79)` 是 **`--prev-sprint 1`**（baseline `c3c31eb`）窗口的读数
   （`sprint-2/drift-check.md` §8/§9），**覆盖 Sprint 1 + Sprint 2** ⇒ **两者窗口不同，禁止互相引用或拼接**。
   Sprint 2 结转的「该规则被触发且未按规则处置」由**本窗口的读数**给出处置：**本窗口未触发**（0%）。
3. 执行期必须由 **LG6** 在同一窗口复跑确认（`plan.md` §6-LG6）；若届时读数 >20% ⇒ 按规则**机械扩展** `target_rules` 并在 plan 追加（不得只在 `done.md` 记一句）。
4. **未取证项（不得过度解读）**：首行 `Rules: False` 的语义**未取证**（可能是 CLI 选项回显）；
   本结论只依赖 `[Verification Fidelity]` 段的 `ungated: 0 (0%)` / `PASS` 与 `fidelity_v5.ungated_ratio_pct: 0`。
   同时 `mechanical_links: 49 -> unresolved_offline: 49` 表示**全部机械关联未解析**（离线），
   即 in_scope 的 70 个文件**全部来自 glob/module 规则**，不含 CodeGraphy 扩张 ⇒ 该读数的覆盖强度以规则面为上限。

---

## 6. tech debt（登记与结转，**本 Sprint 只做登记，不实施**）

| 项 | 来源 | 结转位置 | 本 Sprint 是否实施 |
|---|---|---|---|
| F-3 installer 残留扫描作用域 + 非原子 | `sprint-2/done.md` F-3 / HB-10 | `plan.md` §11-N13 | ❌（不与 T1/T2 同批） |
| F-4 `TOOL_LIKE_KEY` 未知形态敞口 | F-4 / HB-11 / R-2 | `plan.md` §11-N14 | ❌（须与真实载荷采样同批） |
| F-5 `hooks/README.md` 未入镜像守护 | F-5 / HB-12 | `plan.md` §11-N15 | ❌ |
| F-6 LG16 判据强度弱于自述 | F-6 / HB-13 | `plan.md` §11-N16 | ❌ |
| HB-8 非历史文档 pwsh-only 维护指令残留 4 处 | `done.md` §5-R-7 / LL | `plan.md` §11-N17 | ❌ |
| H-set-B 6 个 hook 移植（991 行 × 3 副本） | 用户未选 B/C/D | `plan.md` §11-N12（**Sprint 4 主候选**） | ❌ |
| OQ8/OQ9 真实宿主语义（spawn 失败 = deny/ignore；真实载荷 schema） | `qa-signoff-2.md` R-2 | `plan.md` §11-N18 | ❌（决定 N12 与 F-4 的定级） |
| `install.sh` 未知参数被当作目标路径（`*) CUSTOM_TARGET="$arg"`） | 本层新发现 | `plan.md` §13-OQ18 | ❌（不设 task，`cold` 且不在发布判据内） |
| `warn_threshold` 结构性不可达（13 > `hard_cap` 10） | Sprint 1 OQ9 / Sprint 2 OQ13 同型 | `plan.md` §5 | 登记；跨过 5 即人工记预警 |

---

## 7. 规划期未取证清单（**不得当作结论**）

| # | 未取证项 | 影响 | falsifier / 取证通道 |
|---|---|---|---|
| U-1 | Windows 侧 parity（差分对拍）**从未执行** | 「忠实移植」在 Windows 无证据 | CG4（Windows 首次执行）；`parity: FAIL` ⇒ T4-B |
| U-2 | `[Console]::IsInputRedirected` 在 GHA windows step 下的语义；`install.ps1 -Yes` 的 switch 绑定 | T2 的行为验证能否成立 | CG5 windows 分支；不可执行 ⇒ `unavailable` |
| U-3 | `isInside` 之外的**其它**单侧归一化比较 | Windows 是否仍有第二处平台缺陷 | T4 的同文件审计（MG4）+ 新 run 的 Windows 结论 |
| U-4 | Windows runner 的 pwsh 版本 | 版本差异可能污染 `parity` 定档 | CG4 记录 oracle 版本号 |
| U-5 | `Rules: False` 首行语义 | 只影响读数解释的措辞，不影响 `0%` 结论 | 读工具源码（Sprint 3 不实施） |

---

## 8. 执行期复核点（T6 必须逐条结算）

1. **LG6 复跑**：同窗口（`--prev-sprint 2`）⇒ 逐字输出与 §5 对比；>20% 则机械扩展 `target_rules`。
2. **CG1..CG5 在最终 HEAD 重取**（`5c4d9ab` 的结论不为新 revision 背书）。
3. **§3 的 D-1..D-5 逐条更新**：哪些漂移被关闭、哪些仍开放。
4. **§6 的结转项**：本 Sprint 实施/未实施的状态必须与 `plan.md` §11 一致（**不得**把「登记」写成「已修」）。
5. **falsifier（本文件的判定何时失效）**：若执行期在**同一窗口**复跑得到 >20%，则 §5 的「未触发」结论作废，
   必须按规则机械扩展 `target_rules` 并重取 LG6；若 Windows parity 首次运行报 `FAIL`，则 §3-D-4 的「POSIX 侧 PASS」不足以支撑任何「等价」表述。
