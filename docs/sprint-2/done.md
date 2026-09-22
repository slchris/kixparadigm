---
sprint: 2
sprint_name: 宿主平价（host parity：hooks 与 trust-chain 单一 Node 引擎）
status: done
release_eligible: false
ci_pending: true
final_head: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
sprint_baseline_sha: ef6a48550a40bf433555790419fd4c2fd0cf1483
branch: feature/sprint-2-node-first-host-parity
qa_status: CONDITIONAL
qa_signoff: docs/qa/qa-signoff-2.md
l2_verified_sha: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
l2_gate_manifest_sha256: 5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976
qa_gate_manifest_sha256: 5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976
commits_used: 5
derived_commit_budget: 6
over_budget: 0
topology_used: sequential
content_language: zh
generated_by: Remy (Producer)
generated_at: 2026-09-22
---

# Sprint 2 完成报告 — 宿主平价（无 pwsh 宿主一等公民）

> **两条红线（贯穿全文，不得被任何段落读作已满足）**
> 1. **CI 未验证**：`ci_gate` CG1/CG2/CG3/CG4/CG5 **全部 pending**（fork 无 workflow 注册、无本 SHA 的 run、
>    未授权 push/PR；用户未授权，且 agent 不得自行 push/开 PR）。本报告所有「已完成」仅指**本机可执行范围**，
>    证据 revision = `42d3c7efdd1dfcdf8aba4ba933713547d83e5247`。
> 2. **不可发布**：`release_eligible: false`。QA 档位 = `CONDITIONAL`，其 §12 逐字结论
>    **「否。本 Sprint 不因本报告获得发布许可（`release_eligible` 未建立）。」** 见 §8（**逐字保留，未改写、未淡化**）。
>
> 报告结构：交付清单（§1）→ 门禁终态（§2）→ 与规划的差异（§3）→ QA findings 处置（§4）→
> 残余不确定与 falsifier（§5）→ `over_budget` 结算（§6）→ Evals 回归（§7）→ 档位裁决（§8）→ 移交 Sprint 3（§9）→ 复算入口（§10）。

---

## 1. 交付清单（T1–T9）

> 证据来源标注：`L2` = orchestrator 全量 gate 记录（`progress.md` frontmatter，@ `42d3c7e`）；
> `QA` = `docs/qa/qa-signoff-2.md` 的**独立复跑**（13/13 required gate 重跑，非采信自报）。
> **本报告未重跑任何测试**（Producer 不替 Dev/QA 执行）；唯一由 Producer 实跑的诊断命令见 §10「复算入口」。

| ID | 做了什么 | 关键证据（命令 + 计数 + revision） | 终态 |
|---|---|---|---|
| **T1** | 等价性取证基座：`kixpower-contract.ps1`(517) → `.cjs`（11 个 trust-chain 消费函数）+ `parity: PASS\|FAIL\|unavailable` 三态 + `host_requires` 升为 gate 一等维度（`TEAM_CONVENTIONS.md` ×3）+ oracle 决策落盘 | `LG9 = 23/23/0/0`（QA 同值）；`LG10 = unavailable`（8 tests → 1 pass / 7 fail / **0 skip**，exit 1，状态行 `parity: unavailable — probe ENOENT`，**非 skip 非 pass**）；三副本 md5 `fb457d327f0ad81a161bfb1ed7510196`；`pwsh-oracle: declined`（用户永久否决）；commit `affc9c7` | done（等价性最强通道 E1 移交 CG4，本地**永久** unavailable） |
| **T2** | `validate-memory-backlog.ps1`(89) → `.cjs` + 关闭 U-2 对拍 + 调用点改写（`prompts/kixpower-new.prompt.md` + 2 副本） | `LG12 = exit 0`；三行恒定输出 `memory_backlog: valid` / `record_count: 7` / `legacy_unstructured_records: 0`；`U2-parity:` = 三 fixture **stdout 逐字节相同 + exit 相同（0/2/2）**（对照源 `/tmp/kix-validate-memory-backlog.cjs`，**2988B**，C5/F-7 修订）；QA MG4 **独立重放**证实；commit `27fe7f6`（C3） | done（证据强度：**两次独立移植互证**；与 `.ps1` 逐字节差分仍走 LG10/CG4） |
| **T3** | `verification-fidelity-check.ps1`(320) → `.cjs` + 3 处调用点改写 + 首次真实运行追加 `drift-check.md` | `LG11 = exit 0`（两段存在、非 `baseline_degraded`）；**实际读数 = `total changed 64 / in_scope 17 / whitelisted 32 / ungated 15 (23.4%) / HIGH_RISK`（无 `PASS` 行）**；QA @`42d3c7e` 权威复跑 = `79 / 18 / 39 / 22 (27.8%)`，两次逐字节相同；**窗口 = `--prev-sprint 1` ⇒ baseline `c3c31eb`，覆盖 Sprint 1 + Sprint 2**（R-5）；**F-1 已在 C5 修正**（`drift-check.md` §7/§8 结论层 + 新增 §9；逐字输出块未改）；commit `27fe7f6`（C3） | done（gate 字面判据成立；**不得**读作「覆盖率 PASS」——`>20%` 规则触发未处置，见 §4-F-1） |
| **T4** | `sync-dsh-preset.ps1`(197) → `.cjs` + 5 条 pwsh 类 skip 归零 + **11 组三面镜像登记** + 修 `checkSyntax` symlink 盲区 | `LG1 = 32/32/0/**0 skip**`（25→32，N=7；skip 5→0）；`LG2 = CONSISTENCY OK`（`dsh/preset 35` · `dsh/preset-classic 37` · `en 37` · `scripts 18`；11 组 md5 各 1 取值）；`consistency-lib.cjs` 4 副本 `a85788de…`；**F-2 的 5 处调用点已在 C5 修正**（docs-only）；commit `42d3c7e`（C4） | done（`.ps1` 保留为兼容入口 + E1 参照） |
| **T5** | 清 DSH 面向副本 10 个死 `hooks:` 块（classic 5 + en 5）+ 措辞收敛 + 2 处 `.ps1` 调用点改写为 Node | `MG2`：`grep -rn "^hooks:\|\.ps1" dsh/preset-classic/agents en/preset-classic-en/agents \| wc -l` = **0**；反向控制 `grep -c "^hooks:" agents/*.agent.md` = **5**（Copilot 面保持）；`ls skills/kixpower/hooks/*.ps1 \| wc -l` = **10**（文件未删）；commit `affc9c7`（C1） | done |
| **T6** | 单一 hook 引擎：`hooks/lib/kix-verdict.cjs`（payload 三形态归一化 + 从 `kix-guards.js __internals` 逐字抽取的判定层）+ 4 个 Node 入口（各 3 副本）+ `hook-engine.test.js` + CI 侧 E1 step | `LG15 = 44/44/0/0`；细粒度 `test()`（44 个，未折叠）；**mutation probe**：`KIX_HOOK_CORE_PATH=<改坏 core 副本>` ⇒ 子套件 16 个 `not ok`、进程非 0（**断言非恒真**已自证）；同源函数体断言 20 函数 + 6 局部 helper + 9 常量**规范化后逐字相等（0 漂移）**；未知形态 ⇒ `deny` + `KIX-HOOK-UNKNOWN-PAYLOAD`（fail-closed，stdout+stderr）；`kix-guards.js` 4 副本**零改动**；commit `27fe7f6`（C3） | done（**不声称与 `.ps1` 等价**；`parity_exit_code: exit 2` 本地机制不可达 → D-5 登记） |
| **T7** | 4 个 hook 声明统一为 `node "{{COPILOT_HOME}}/skills/kixpower/hooks/<name>.cjs"`（10 声明 / 4 distinct）；两个 installer 删除 `HOOK_LAUNCHER`/`HOOK_EXT` 层 + INV-H1 残留 fail-closed + INV-H3 消除空作用域 `ok` + node 前置 `KIX-INSTALLER-NO-NODE` | `LG16 = 7/7/0/0` + **QA 自建注入/控制组（12 行表，含 4 组控制：归因 / 作用域 / 分支可达性 / PATH 收窄）**（把残留分支唯一 `exit 1` 换成 `:` ⇒ 必须变绿 ✅；`{{` 注入 `skills/` ⇒ 不得触发 ✅；PATH 收窄 + node stub ⇒ 必须 0 ✅）；`MG8`：`grep -c 'HOOK_LAUNCHER\|HOOK_EXT' install.sh install.ps1` = **0 / 0**（原 4 / 4）；正向真装 exit 0 + 残留 `{{` **0 行**；`skip: chmod +x (0 .sh files)`；`package.json` 改动 = 仅 `test:installer` 追加 1 个文件参数；commit `42d3c7e`（C4） | done（**`install.ps1` 本地只有静态判据** → 可执行验证归 CG5，见 §5 R-3） |
| **T8** | 覆盖裁决留痕：`hooks/README.md`（3 副本：宿主状态表 10 行 + H-set-B promotion 判据 + `deprecated` 声明）+ 未移植 6 条 hook 的宿主能力条件注记（root agents **只追加**）+ `hooks-coverage:` 行 | `MG9`：`hooks-coverage:` = **10 行表**（4 已移植 / 6 未移植，逐行含类别 + 取值 + promotion 判据）；`MG10`：3 副本 md5 = `ea8ce56f5565e2a8344d1e746a58e54d`（1 取值）；「只追加」机械核对 = 10 条注记 + 声明数 10/10 未变 + `^hooks:` 计数未变；commit `42d3c7e`（C4） | done |
| **T9** | H-D：`hooks/*.ps1` **保留全部 30 文件 + 标记 deprecated**（不删除）+ 删除判据与可回滚性落盘 | 反向控制 `ls skills/kixpower/hooks/*.ps1 \| wc -l` = **10**（三面 30 文件零改动，md5 与 HEAD 一致）；删除判据四条 + 可回滚性论证落在 README §3 与 `plan.md` §13.4；commit `42d3c7e`（C4） | done |

**合计**：**9 任务 / 9 done / 0 blocked**（与 `progress.md` 的 `completed_tasks: 9`、`blocked_tasks: 0` 一致）。
**层与提交映射**：`[T1,T5]` → C1 `affc9c7`；C2 `1479a35`（增量规划文档）；`[T2,T3,T6]` → C3 `27fe7f6`；`[T4,T7,T8,T9]` → C4 `42d3c7e`；C5 = 本收尾层。

**验收目标（plan §1 三块 + §13）达成度**：

| 判据 | 终态 | 依据 |
|---|---|---|
| P0 trust-chain Node 化（3 个 `.cjs` 在无 pwsh 宿主可执行） | ✅ 本机达成 | LG9/LG11/LG12 exit 0 @`42d3c7e`；`MG1` 产品 `.cjs` 零 `pwsh` 引用 |
| 「有 pwsh 时与 `.ps1` 差分逐字节一致」 | 🟡 **不可达（本机永久）** | LG10 = `unavailable`；E1 移交 CG4（pending）→ §5 R-1 |
| P1 DSH 面死 hooks 清零 | ✅ 达成 | `MG2` = 0 命中（反向控制齐备） |
| P2 `test:installer` skip 归零 | ✅ 达成（超出预期方向） | LG1 = 32/32/0/**0 skip**（`25 pass / 0 skip` 的预期被 T7 扩为 32） |
| H-A：单一 hook 引擎 + JS 证据网 | ✅ 达成（E0/E2 档） | LG15 = 44/44/0/0 + mutation probe；**不等于**与 `.ps1` 等价（§16.2 禁令） |
| **H-B**：installer fail-closed 双向可重放 | ✅ 达成（`install.sh` 可执行面） | LG16 = 7/7/0/0 + QA 自建 12 行注入表（含 4 组控制组证明非恒真）；`install.ps1` 侧 = CG5 |
| H-C/H-D：覆盖裁决 + `.ps1` 去留 | ✅ 达成 | MG9/MG10 |

---

## 2. 门禁终态

### 2.1 `local_gate`：required **13/13 exit 0**（QA 独立复跑 @ `42d3c7e`）

```text
revision: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
l2_verification_passed: [LG1, LG2, LG3, LG4, LG5, LG6, LG7, LG8, LG9, LG11, LG12, LG15, LG16]   # 13/13
l2_gate_manifest_sha256 = qa_gate_manifest_sha256 = 5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976
field_set = {id, type, cmd, expect, required, host_requires}       # 由 canonical 实现（kixpower-contract.cjs）产出
三方一致：plan required(13) == l2_verification_passed(13) == manifest(13)；gateManifestConflicts = []；stash = []
```

| gate | cmd（逐字） | 终态计数 | 证据 |
|---|---|---|---|
| LG1 | `npm run test:installer` | **32 tests → 32 pass / 0 fail / 0 skip** | L2 + QA 同值（skip 5→0 = P2 硬判据） |
| LG2 | `npm run test:consistency` | `CONSISTENCY OK`；`dsh/preset 35` · `preset-classic 37` · `en 37` · `scripts 18` JS/CJS/MJS syntax OK；11 组三面字节一致 | L2 + QA |
| LG3 | `npm run test:pressures` | 24 → **23 / 0 / 1** | L2 + QA（链路内段，计数单独抽出） |
| LG4 | `npm run test:vision` | **20 / 20 / 0 / 0** | L2 + QA |
| LG5 | `cd dsh/preset/plugins && node --test` | 60 → **59 / 0 / 1** | L2 + QA |
| LG6 | `npm test` | **exit 0**（全链 `32/32` → `CONSISTENCY OK` → `24→23/0/1` → `20/20` → `60→59/0/1`） | L2 + QA |
| LG7 | `cd en/preset-classic-en/plugins && node --test` | 36 → **35 / 0 / 1** | L2 + QA |
| LG8 | `cd en && npm test` | **exit 0**（`12/12` → `CONSISTENCY OK` → `20/20` → `36→35/0/1`） | L2 + QA |
| LG9 | `node --test skills/kixpower/tests/trust-chain.test.js` | **23 / 23 / 0 / 0** | L2 + QA |
| LG11 | `node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 1` | **exit 0**；`ungated 22 (27.8%)`、**无 `PASS` 行**（窗口 = Sprint 1 + Sprint 2） | L2（27.8）+ QA 复跑（逐字节相同） |
| LG12 | `node skills/kixpower/scripts/validate-memory-backlog.cjs --project-root .` | `memory_backlog: valid` / `record_count: 7` / `legacy_unstructured_records: 0` | L2 + QA |
| LG15 | `node --test skills/kixpower/tests/hook-engine.test.js` | **44 / 44 / 0 / 0** | L2 + QA |
| LG16 | `node --test scripts/copilot-installer.test.js` | **7 / 7 / 0 / 0** + QA 自建注入/控制组（QA 自述 15 项；`qa-signoff-2.md` §4 表列 12 行，差异未核，故本报告只引用「有 4 组控制组证明非恒真」这一可逐行核对的结论） | L2 + QA |

**`required: false`（不入通过面，逐条留痕）**

| gate | 终态 | 说明 |
|---|---|---|
| **LG10** `node --test skills/kixpower/tests/ps1-parity.test.js` | 8 tests → **1 pass / 7 fail / 0 skip**，exit **1**，`parity: unavailable — probe ENOENT` | **既非 skip、亦非 pass**；**未计入** `l2_verification_passed`（§16.2 禁令 ② 的机械判据）；E1 唯一通道 = CG4 |
| LG13 `npm run verify:guards` | exit 0 | 环境相关，不作本 Sprint 判据 |
| LG14 `node --test scripts/install-lib.test.js` | 20 / 20 / 0 / 0，exit 0 | QA 实跑 |

> **skip 语义（不得读作通过）**：本 Sprint 的 required 面**已无能力型 skip**（LG1 = 0 skip）；剩余 1 skip 出现在
> LG3/LG5/LG7 = `kix-browser.test.js` 的 `KIX_BROWSER_SMOKE=1` **opt-in** 真浏览器 smoke（非能力型），
> **不**由 `pwsh` 缺失产生。win32 上 LG1 预期为 24/0/1（1 条平台型 skip，文案 `SKIP: windows-only — `）→ 待 CI 取证。

### 2.2 `ci_gate`：全部 pending（**不得记 pass**）

| gate | 终态 | 依据（QA 实测，`qa-signoff-2.md` §2 末段） |
|---|---|---|
| CG1 `gh pr checks` | **pending** | `gh workflow list -R slchris/kixparadigm` **空**（fork 无 workflow 注册）；`gh pr list` 空；13 commit 未 push |
| CG2 `gh run view <run-id>`（6 组合 success） | **pending** | `gh run list -R olicesx/kixparadigm --limit 5` 的 `headSha` = `5376d6c…`(f)/`df3e590…`(f)/`c3c31eb…`(s)/`fc52b2f…`(s) —— **无 `42d3c7e` 的 run**（`grep -c` = 0） |
| CG3 CG1 降级通道（`required: false`） | **pending** | 同上 |
| **CG4**（E1 差分对拍，本 Sprint 新增的**唯一等价性通道**） | **pending** | 同上（R4 open） |
| **CG5**（`install.ps1` windows smoke：正常 0 + 注入哨兵非零） | **pending** | 同上 |

> **口径声明**：本地 13/13 绿**不构成** CI 绿的替代证据，也**不构成**「与原 `.ps1` 等价」的证据（§16.2 阶梯）。
> CG4 必须核对三态状态行与 `exit` 映射（`unavailable` 在 job 层会以**红**呈现 → 不得把红读成「已证伪」，见 R-6）。

### 2.3 `manual_gate`：MG1–MG10 全部 ✅（QA 机械执行）

| gate | 结论 | 核心证据 |
|---|---|---|
| MG1 产品零 `pwsh` 引用 | ✅ | `grep -rn pwsh skills/kixpower/scripts/*.cjs scripts/sync-dsh-preset.cjs \| wc -l` = **0**；`package.json` 无 `ps1-parity` |
| MG2 DSH 面死 hooks/`.ps1` = 0 且文件未删 | ✅ | 0 命中；`^hooks:`（root）= 5；`hooks/*.ps1` = 10 |
| MG3 `R1-digest-recompute:` 行 | ✅ | 取值 `undetermined` + `missing_evidence` 已登记（未伪称已复算） |
| MG4 `U2-parity` 三足 | ✅ | QA **独立重放**三 fixture：stdout 逐字节相同 + exit 0/2/2 |
| MG5 3 副本 `.cjs` md5 同值 | ✅ | `kixpower-contract.cjs` ×3 = `fb457d32…`；11 组各 1 取值 |
| MG6 `ps1-drift:` 行 | ✅ | 命中 2 处（517 vs 507，登记不修） |
| MG7 `host_requires`/`unavailable` 措辞 3 副本一致 | ✅ | 3 份各 4 处命中 + 关键句各 1 处 |
| MG8 占位符 0 命中 + 10 条 node 声明 | ✅ | `0 / 0`；10 声明 / 4 distinct / 4 入口文件均存在 |
| MG9 `hooks-coverage:` 10 行表 | ✅ | 逐行读出 10 条 hook，含类别/取值/promotion 判据 |
| MG10 README 3 副本 + `deprecated` + `.ps1` 未删 | ✅ | md5 `ea8ce56f…`（1 取值）；`ls *.ps1 \| wc -l` = 10 |

> **MG2 的检索面缺口（F-2 的机制成因，本层登记）**：MG2 只覆盖 `agents/` 目录 → `README*.md` /
> `dsh/README-DSH.md` / `DSH-ADAPTATION.md` 的 pwsh-only 维护指令**从来不在任何 gate 的检索面内**。
> 本层只按授权改 5 处，缺口本身登记为 HB-8 / §5 R-7。

### 2.4 未取证的三个「最强通道」（不得读作已达成）

| 通道 | 能证明什么 | 现状 |
|---|---|---|
| **CG4**（E1 差分对拍） | 「同一 fixture 下 `.cjs` 与 `.ps1` stdout 逐字节 + exit 一致」（fixture 覆盖范围内） | pending ⇒ 本 Sprint 的 claim 封顶在「JS 锚点一致，差分通道 unavailable」 |
| **CG5**（`install.ps1` smoke） | Windows 侧 installer 语义正确性 | pending ⇒ `install.ps1` 只有静态判据 |
| **真实宿主语义**（OQ8/OQ9） | hook 在真实 Copilot 上「生效」 | 未取证（文档级）⇒ 不得用「文件已存在 / 测试绿」替代 |

---

## 3. 与规划的差异（含 C5 的范围扩张）

| # | 规划期 | 实际 | 性质 / 留痕 |
|---|---|---|---|
| 1 | 5 个任务（T1–T5），`derived_commit_budget` 公式值 9 | **9 个任务**（+T6–T9，plan §13 增量重规划）；**绑定预算 6** = min(公式 9, 环境硬约束 1h/10-commit 与用户 ≤6) | 增量重规划有独立 commit `1479a35`（C2）；预算口径 v1/v2 并列输出，**未回头改写** |
| 2 | 预计 5 个 commit | **实际 5**（C1–C5） | `over_budget: 0`（§6）；每 DAG 层合并 1 commit 的硬要求全程成立 |
| 3 | C5 申报范围 = `done.md` / `hill-climbing.md` / QA signoff / L2 字段固化 | **追加**：F-2 的 5 处调用点文档（`README.md`、`README.en.md`、`dsh/README-DSH.md` ×2、`dsh/preset-classic/DSH-ADAPTATION.md`）+ F-1/F-7 修正 | **C5 范围扩张，由 orchestrator 依据 QA F-2 授权**；**docs-only**（§10 自证），不影响 `42d3c7e` 的 L2/QA 绑定 |
| 4 | T3 的「首次真实运行」预期 `ungated 0% → PASS`（§7 的那次运行确实是 0%） | 层 2 提交后的运行 = `15 (23.4%) / HIGH_RISK`；QA @`42d3c7e` = `22 (27.8%)` | **F-1**：结论层被误抄成 §7 的读数并传播 3 处 → C5 就地改正 + `drift-check.md` §9 登记「`>20%` 规则**触发且未处置**」 |
| 5 | `qa_verified_sha` / `qa_gate_manifest_sha256` 为 `null` placeholder | C5 回填 = `42d3c7e` / `5f4eab16…`（与 QA 报告 frontmatter 同值） | 纯记账；QA 未改任何测试（`qa_test_changes: []`） |
| 6 | T2 验收行写 `record_count: 6` | 实测 **7** | 增量重规划期新增 HB-7（`1479a35`）所致，**非实现缺陷**；已在 `progress.md` 登记 |
| 7 | T6 步骤 D 要求 `unavailable` 退出码 = 2 | `node --test` 把子进程失败**归一化为 exit 1** → 字面不可达 | **D-5**（机制冲突，非实现缺陷）：三态语义由状态行 + CI step 的 0/1/2 映射承载；字面达成需改 LG10 的 cmd（plan 侧决策） |
| 8 | `install.ps1` 与 `install.sh` 同构改动 | 本地无 pwsh → **只有静态判据** | 可执行验证归 CG5；§5 R-3，**不记 pass** |
| 9 | 规划期认为 `pwsh` 可作一次性 dev-time oracle（plan §7.4） | 用户**永久否决**（含一次性 oracle） | plan §16.2 v2 生效：E1 移交 CG4、LG10 移出 required；`pwsh-oracle: declined` |

**未发生的差异（红线守持）**：C5 变更面 = **docs-only**（§10）；`42d3c7e` 之后**无任何**源码 / 测试 / fixture / installer /
`package.json` / `.github/` 改动 ⇒ **QA 签署不失效**（其 §12 的失效条件未被触发）。

---

## 4. QA findings 处置（F-1 … F-7）

> 来源：`docs/qa/qa-signoff-2.md` §9。**无 P0 / 无 P1 / 无 gate 失败**。
> 「本层修」= C5（docs-only）；「登记 Sprint 3」= 已写入 `harness-backlog.md`（candidate）。

| ID | 级别 | 内容（摘要） | 处置 | 终态 / 去向 |
|---|---|---|---|---|
| **F-1** | **P2** | LG11 的**结论行与自身逐字输出矛盾**：§8 块 = `64/17/32/ungated 15 (23.4%)/HIGH_RISK`，结论行却写 `ungated: 0 (0%) → PASS`（那是 §7 那次运行的读数），并向 `progress.md` **3 处**传播（`:55`/`:112`/`:266`，其中 `:55` 的 `46/17/29` 与两块**均不一致**）；QA @`42d3c7e` = `79/18/39/22 (27.8%)`，无 `PASS` 行，两次运行逐字节相同 | **✅ 本层修**（`drift-check.md` §7/§8 结论层 + `progress.md` 3 处 → 改为实际读数并标注修订；**逐字工具输出块未改一字**）；新增 `drift-check.md` **§9** 登记窗口口径（R-5）与 `>20% → 强制扩展 target_rules` **被触发且未按规则处置**；`done.md` 全文**不宣称覆盖率 PASS** | 已闭合（C5）。**该规则的处置结转 Sprint 3**（须以 `--prev-sprint 2` 可判定窗口复核） |
| **F-2** | **P2** | T4 的维护调用点仍 pwsh-only，新 `.cjs` 在文档中 **0 命中** ⇒ 无 pwsh 宿主上维护路径**结构性不可执行** | **✅ 本层修 5 处**（`dsh/README-DSH.md:31`/`:41`、`README.md:72`、`README.en.md:72`、`dsh/preset-classic/DSH-ADAPTATION.md:306` → `node scripts/sync-dsh-preset.cjs`；`:39-42` 的代码围栏由 `powershell` 改 `console`）；**范围扩张已登记**（§3-#3、`progress.md` Trace Log `producer_closeout.scope_expansion`） | 已闭合 5/8 处。**残留 3 类**（`dsh/README-DSH.md:57-59` 日常同步三例、`PLUGINIZATION-ROADMAP.md:172`、`scripts/context-budget/README.md:74`、`docs/kix-general-evolution.md:333`；`CHANGELOG.md` 历史条目**按红线不改写**）→ §5 **R-7** + HB-8 |
| **F-3** | P3 | 两个 installer 的**残留扫描作用域不对称**（sh 扫 `agents/` 全部文件 vs ps1 仅 `*.agent.md`）+ 共享 `COPILOT_HOME` 第三方文件**误报** + 失败非原子（`partial_tree_left=true`：失败发生在拷贝之后） | **登记 Sprint 3**（方向安全：fail-closed、指名文件、幂等已实测；本 Sprint 不改产品码 —— 任何 installer 改动都会使 QA 签署立即失效） | 已登记 → **HB-10**（candidate，`applies_to_sprints: ">=3"`） |
| **F-4** | P3 | 载荷归一化的「形态无法识别」判据存在**理论敞口**：`TOOL_LIKE_KEY` 不含 `arguments`/`parameters`/`function` ⇒ `{"chat":{"function":"bash","arguments":{…DROP TABLE…}}}` 实测 exit 0（静默放行）；`toolCalls: []` 存在即短路 | **登记 Sprint 3**。**明确不做**：该「1 行改进」属**产品码改动**（`skills/kixpower/hooks/lib/kix-verdict.cjs` ×3 副本）→ 会使 QA 签署（`qa_test_changes: []` + `42d3c7e` 绑定）**立即失效**，故本 Sprint 不做，仅在 `hill-climbing.md` / HB-11 登记 | 已登记 → **HB-11**（candidate，`applies_to_sprints: ">=3"`）；falsifier = 真实载荷采样 |
| **F-5** | P3 | `skills/kixpower/hooks/README.md`（3 副本，MG10 的证据对象）**未登记进任何机器守护的 identical-set 组** ⇒ 今天一致，将来漂移静默 | **登记 Sprint 3**（`consistency-lib.cjs` 属产品码，改动同样使签署失效） | 已登记 → **HB-12**（candidate） |
| **F-6** | P3 | LG16 两处判据**强度弱于自述**：① `KIX-INSTALLER-NO-NODE` 出现在**成功路径横幅** ⇒「输出含 marker」不构成失败证据（须以 exit code 为主判据）；② `copilot-installer.test.js:208` 对 `install.ps1` 命中的是**占位符替换**的 skip 文案（`install.ps1` 无 chmod 步骤）⇒ 该断言对 ps1 侧不判别其注释声称的语义 | **登记 Sprint 3**（不影响 LG16 实际覆盖：sh 侧由精确文案断言覆盖，是真判据；当前无假绿） | 已登记 → **HB-13**（candidate） |
| **F-7** | P3 | 两处记账不一致：① `U2-parity` 称对照源 **3612B**，实际 **2988B**；② `artifacts_changed_since_last_observe` 把层 2/层 3 **已提交**文件列在「**未提交 WIP**」标题下 | **✅ 本层修**：① 改为 `2988B` 并标注修订（**实质结论不变**，QA 已独立重放证实三 fixture 逐字节一致）；② 标题改为「层 2 已提交（C3 = `27fe7f6`）」并删除重复条目 | 已闭合（C5，纯记账） |

> **F-3/F-4/F-5/F-6 的共同处置逻辑（必须写明，防止被读成「已修」）**：四者的**正确修法都落在产品码**
> （`install.sh`/`install.ps1`、`kix-verdict.cjs`、`consistency-lib.cjs`、`copilot-installer.test.js`）。
> 在 `qa_verified_sha = 42d3c7e` 的签署绑定下，任何此类改动都会**立即**触发 `REVERIFY_REQUIRED`（QA §12 第 4 条）。
> 「不改」是**签署纪律的结果**，**不是**「问题不存在」或「已修复」。

---

## 5. 残余不确定与 falsifier（R-1 … R-8）

> **R-1 … R-6 逐字继承 `qa-signoff-2.md` §11（QA 独立提出）**，此处**原文转录**（仅补 `done.md` 所需的交叉引用）；
> **R-7 / R-8 为本层新增**（F-2 修正的残留面 / C5 自检发现的既有 frontmatter 解析问题）。**以下各项均未证实，不得作为已结论使用。**

| ID | 残余不确定 | 当前证据状态 | Falsifier（可判定） |
|---|---|---|---|
| **R-1** | **CI 通道（CG1/CG2/CG4/CG5）**：E1 差分对拍（最强等价通道）与 `install.ps1` 的唯一可执行验证**本地永久不可达** | QA 实测：fork 无 workflow 注册、无本 SHA 的 run、无 PR、13 commit 未 push → 记 pending（**不得记 pass**）；LG10 本地 `unavailable`（1 pass/7 fail/0 skip，exit 1） | CG4：CI 上 `node --test ps1-parity.test.js` 出现 `parity: PASS`（stdout 逐字节 + exit code 一致）；CG5：windows-latest 上 `install.ps1` 正常安装 exit 0 + 注入哨兵非零 |
| **R-2** | **真实宿主语义（OQ8/OQ9）**：Copilot 对 hook spawn 失败是 `deny` 还是 `ignore`；真实 `preToolUse` 载荷 schema | 未取证（文档级）；影响 F-4 的定级与 6 条未移植声明在无 pwsh 宿主上的行为 | 真实 Copilot 会话日志（spawn 失败时的工具调用结果 + 实际 stdin 载荷）；若为 `deny` → 未移植声明需立即移植或移除 |
| **R-3** | **`install.ps1` 的语义正确性**（Windows 侧残留作用域、版本解析、`-DryRun` 行为） | 仅静态判据（QA 实读 `:61-78`（`Assert-NodeRuntime`：无 node → exit 1；`TryParse` 失败默认 0 → 拒绝）/ `:272-289`（dry-run 扫源、real 扫 `$CopilotHome/agents/*.agent.md`）且第 2 处 `Assert-NodeRuntime 'post-copy'` @`:246` 晚于拷贝；`skip:`/两 marker 齐备；卸载分支 `:95-123` 在 pre-flight `:135` 之前）；**无 pwsh → 本机不可执行** | CG5（windows-latest smoke：正常 0 + 注入哨兵非零）；本报告**不声称** ps1 侧语义等价 |
| **R-4** | **R-1 的 provenance 强度**：冻结凭据的"来源"证据是 `/tmp` 临时产物（`l2-manifest.json` / `kix-l2.cjs`），非 commit 绑定 | 三重佐证（内部自洽 + 与存活脚本逐行同构 + plan 未改动）；QA 结论为「主张成立、机制需细化为双轴」，见 §6 | 若能给出当时另一份被哈希的 `gates` 原文（任何形式的字节快照），或在不折叠前提下复算出 `46121655…` → 本裁决推翻 |
| **R-5** | **LG11 的度量窗口语义**：`--prev-sprint 1` 的窗口 = Sprint 1 的 baseline（`c3c31eb`）→ 覆盖 **Sprint 1 + Sprint 2** 的改动集，因此任何「本 Sprint fidelity」表述都必须显式声明窗口 | 工具输出自证：`Sprint: 1 … Baseline: c3c31eb… (progress.sprint_baseline_sha)`、`fidelity_v5.sprint: 1` | 若采用 Sprint 2 baseline（`ef6a485`）重跑，读数将不同；Producer 需明确「>20% 规则」按哪个窗口判定并登记处置（与 F-1 同源）→ **本层已在 `drift-check.md` §9 逐条登记** |
| **R-6** | **CI parity step 的三态在 job 层的表现**：`unavailable` 被映射为 `exit 2` → **job 变红**（与 FAIL 的 `exit 1` 仅日志文案可辨） | `sed -n '36,56p' .github/workflows/ci.yml` | 若 runner 镜像丢失 pwsh，CI 会以「红」呈现 unavailable ⇒ 不得把红读成「已证伪忠实移植」；需 CG4 取证时区分日志文案 |
| **R-7**（本层新增） | **F-2 的残留面**：本层只按授权改 5 处；同类 pwsh-only 维护指令仍在 `dsh/README-DSH.md:57-59`（日常同步三例）、`dsh/preset-classic/PLUGINIZATION-ROADMAP.md:172`、`scripts/context-budget/README.md:74`、`docs/kix-general-evolution.md:333`；`CHANGELOG.md:151,161,203` 的历史条目**按红线不改写** | `grep -rn "sync-dsh-preset\.ps1" --include='*.md'`（排除 `docs/sprint-*`）逐条人工阅读（本层实跑） | Sprint 3 把这 4 个文件的 `.ps1` 指令改为 `.cjs`（或明确标注「历史/参照」），并加机械判据：非历史文档中 `sync-dsh-preset\.ps1` 的**维护指令**命中 = 0（HB-8）；若届时仍有文档指示 pwsh-only 维护路径 ⇒ 本项未闭合 |
| **R-8**（本层新增） | **`progress.md` 的 frontmatter 不是严格合法 YAML**（**既有**，`42d3c7e` 即存在，非本层引入）：`dev_self_tests_passed` 的一条双层引号标量内含 `\|`（`grep -c 'HOOK_LAUNCHER\\|HOOK_EXT'`），而 YAML 双引号标量中 `\|` 是**非法转义** ⇒ PyYAML 等严格解析器 `ScannerError`；项目自身的 `Get-KixFrontmatter`（正则实现）可正常读，故**任何 gate 都不会红** | `python3 -c "import yaml;yaml.safe_load(open('docs/sprint-2/progress.md').read().split('---')[1])"` → `ScannerError: found unknown escape character '\|'`；`git show 42d3c7e:docs/sprint-2/progress.md \| sed -n '61p'` 同值（**既有**） | 若后续出现「用严格 YAML 解析器读取 progress.md/L2 台账」的工具或迁移，须先把该标量改为块标量（`>-`）或单引号/普通标量；**本层不改**（超出 F-1/F-2/F-7 授权，且 `progress.md` 的 L2 字段为 orchestrator 的绑定写入面）。若 Sprint 3 引入严格解析器后仍能读取 ⇒ 本项不成立 |

---

## 6. `over_budget` 结算（诚实记录，不改写预算）

```yaml
derived_commit_budget: 6      # 绑定值 = min(公式 9, 环境硬约束)；公式含 closeout_layer: 1（HB-6 scoped trial）
commits_used: 5               # git rev-list --count ef6a485..HEAD = 5（C1..C5，含本收尾提交）
over_budget: 0
```

| 项 | 内容 |
|---|---|
| 实际提交序列 | C1 `affc9c7`（层 1：T1+T5）· C2 `1479a35`（增量规划 ADR-S2-1）· C3 `27fe7f6`（层 2：T2+T3+T6）· C4 `42d3c7e`（层 3：T4+T7+T8+T9）· **C5 = 本层**（docs-only） |
| 复算口径 | `git rev-list --count ef6a485..HEAD` = **5**（`ef6a485` = Sprint 1 终态 rev = 本 Sprint baseline）；`git log --oneline ef6a485..HEAD` = 5 行 |
| C5 自身 sha | **不在本文件内**（commit 不能包含自身 hash，amend 被硬禁）→ 以 `git rev-parse HEAD`（= 本文件所在提交）为准 |
| 余量 | 1（未使用）。环境硬约束 = kix-guards 1 小时窗口 / **10 commit 硬上限（含 amend）**；Sprint 1 曾因此被拦一次（`ef6a485`） |
| 与 Sprint 1 的对比 | Sprint 1：derived 7 / 实际 8 → `over_budget: 1`（收尾层未入公式）。本 Sprint 的公式 v2 显式计入 `closeout_layer: 1`（HB-6 scoped trial），实际 5 ≤ 6 ⇒ **pass_criteria 达成**；但**归因不纯净**（绑定值 6 同时受环境硬约束约束，见 §7 的 HB-6 行）|

---

## 7. Evals 回归结果（v4.1）

> 消费对象：`.kixpower/memory/repo/harness-backlog.md`（规划期 `items_total: 7`，收尾后 **13**）。
> **三条红线**：① `not triggered` ≠ pass；② `origin == 本 Sprint` 者**不得自我确证**（HB-7）；
> ③ `trial pass` 才可晋升 `validated`，且**不得**把「结果看起来对」当证据（HB-6 的判别力问题）。
> 判定时点按 `plan.md` §11/§19：HB-1/3/4 于 L2 前，HB-5/HB-6 于 post-sprint。

| 项 ID | type | eval.trigger | 本 Sprint trial 结果 | 学习状态 |
|---|---|---|---|---|
| HB-1 | dev-workflow | 「新增/修改的测试用例 spawn 外部可执行文件」 | **trial pass**（LG1 = 32/32/0/**0 skip**：T4 把 5 条 pwsh 依赖用例改为 `node` ⇒ 能力型 skip 结构性归零；新增 `copilot-installer.test.js` spawn `bash` 走**平台前提绑定**的 `SKIP: windows-only — ` 通道，文案机器可识别）。**判据修订**：原 `pass_criteria` 的「无 pwsh = 5 skip」预期项被 T4 消除；probe 对 `node`/`bash` 为空操作 | **`validated`**（修订已登记于条目 `note`；win32 skip 分支本地不可观测 → CI） |
| HB-2 | plan-template | 「新 Sprint 规划期基线（任一 canonical 测试命令）非绿」 | **not triggered** —— 本 Sprint 规划期基线为**绿**（`test:installer` exit 0、`test:consistency` exit 0），trigger 不匹配 | `candidate`（**不得记 pass**；`unmatched_runs: 1`） |
| HB-3 | plan-template | 「plan.md 的 gate 引用含 `&&` 的链式命令，或 canonical 入口本身是 `&&` 链」 | **trial pass**：`plan.md` §7.1 为 zh 链每段（LG3/LG4/LG5）与 en 链链尾（LG7）建独立 required gate，`npm test`/`cd en && npm test` 仅作附加判据；L2 记录**逐段**给出终态（23/0/1 · 20/20 · 59/0/1 · 35/0/1），QA 独立复跑抽取段计数一致 | **`validated`** |
| HB-4 | qa-workflow | 「plan / diff 中出现依赖文件系统状态（mtime/权限/顺序）或环境状态的断言」 | **trial pass**：本 Sprint 新增断言一律**显式构造状态**（LG15 `KIX_HOOK_CORE_PATH` mutation probe ⇒ 改坏 core 必红；LG16 哨兵注入 + 临时 `COPILOT_HOME`）；QA 另加**归因/作用域/收窄三组控制**证明判据非恒真。判据 (b) 的前置（复核 baseline 声称）本 Sprint 未出现 | **`validated`** |
| HB-5 | tooling | 「L2 交接写入 manifest digest，或 QA 需要复核该 digest」 | **trial pass**：`plan.md` §7.2 写明规范化规则（field_set / 顺序 / compact JSON / sha256(utf8)）；**QA 在无 pwsh 宿主上用 canonical 实现本地复算** `5f4eab16…` **逐位一致**（Sprint 1 的不可复算项在本 Sprint 闭合） | **`validated`** |
| HB-6 | plan-template | 「plan.md 生成 `derived_commit_budget`，且该 Sprint 计划写入 `docs/sprint-N/{done,hill-climbing}.md` 或 `docs/qa/qa-signoff-N.md`」 | **trial `pending`（无效试验，不验证也不证伪）**：改进**确已应用**（`plan.md` §15 显式 `closeout_layer: 1`），结果也满足 `pass_criteria`（`git rev-list --count ef6a485..HEAD` = 5 ≤ 6，且未回改预算）；**但绑定值 6 = min(公式 9, 环境硬约束 6)，反事实不可区分** ⇒ 本次结果**不具判别力** | `candidate`（`evidence` 追加 `kind: trial, result: pending`） |
| HB-7 | tooling | 「plan / diff 出现『批量替换 / 批量 chmod / 占位符展开 / 迁移脚本 / 安装器步骤』的新增或修改」 | **not triggered（origin == Sprint 2，自我确证无效）** —— 本项由本 Sprint 的 D-1 缺陷创建，`applies_to_sprints: ">=3"`；T7 是它的**对策**而非它的 trial | `candidate`（**不得记 pass**） |

**新增候选（本层 L4，全部 `candidate` / `applies_to_sprints: ">=3"`）**：HB-8（F-2 类：维护调用点不在任何 gate 检索面内）·
HB-9（F-1 类：结论行与自身证据矛盾并多点传播 / 指标工具输出必须与结论同源同窗）· HB-10（F-3）· HB-11（F-4）· HB-12（F-5）· HB-13（F-6）—— 详见 §4 与 `hill-climbing.md` §7。

**回归检查（v4.1 要求）**：本 Sprint 之前 `by_status.validated = 0` ⇒ 不存在「已应用 validated 项命中 `regression_signal` → 降回 candidate」的情形；
本层晋升 4 项（HB-1/3/4/5）后 `by_status = {candidate: 9, validated: 4, archived: 0}`（`items_total: 13`）。
**晋升的 4 项自 Sprint 3 起作为 repo 级既定实践应用**，并在 Sprint 3 的 L4 监测 `regression_signal`（命中即降回 `candidate`）。

---

## 8. 判定分歧与最终裁决（**显式记录，不掩盖**）

### 8.1 QA 的档位判定（**逐字保留，未改写、未淡化**）

```text
status: CONDITIONAL          # 状态机合法值（PASS | CONDITIONAL | REVERIFY_REQUIRED | FAIL）
qa_status: CONDITIONAL
ci_pending: true             # CONDITIONAL 的合法理由（唯一 release 阻塞）
qa_started_sha == qa_verified_sha == l2_verified_sha == HEAD == 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
qa_gate_manifest_sha256 == l2_gate_manifest_sha256 == 5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976   # canonical 本地复算复现
qa_test_changes: []          # 未新增/修改任何测试、fixture、测试脚本或测试配置
local_gate:  pass (QA 独立复跑 @ 42d3c7e, 13/13 required exit 0；LG10 unavailable 未计入)
manual_gate: pass (MG1..MG10 all green, QA-executed)
ci_gate:     pending (CG1/CG2/CG3/CG4/CG5) -> 不得记 pass; 不得由 QA push/开 PR 解锁
```

**「本 Sprint 是否因本报告获得发布许可」的明确表述（`qa-signoff-2.md` §12 逐字）**：

> **否。本 Sprint 不因本报告获得发布许可（`release_eligible` 未建立）。**
> 理由与解锁条件（全部满足方可进入 `done`）：
>
> 1. **CI 取证（release 的唯一开口）**：CG1→CG2→CG5 依次取证（CG4 必须核对三态状态行与 `exit` 映射；CG5 必须给出 windows-latest 上 `install.ps1` 的「正常 0 + 注入哨兵非零」双向日志）。当前 fork 无 workflow 注册、无本 SHA 的 run、未授权 push/PR ⇒ 结构性 pending（R4）。
> 2. **F-1 必须先修正**（`drift-check.md` §8 结论行 `:214` + `progress.md` **3 处**「`ungated: 0 (0%)` → PASS」（`:55`/`:112`/`:266`）改为实际读数 `22 (27.8%)`，并登记 >20% 规则的处置）——否则 `done.md` 的覆盖率结论建立在与自身证据矛盾的读数上。**注**：F-1 是 `done` 的前置，**不是**本条签署档位的阻塞（档位唯一阻塞 = CI）；QA 的档位判定不因此改为 FAIL。
> 3. F-2（T4 调用点 pwsh-only）在 C5 或 Sprint+1 收口；F-3/F-4/F-5/F-6/F-7 按上表处置（登记 + 小修）。
> 4. 若 Orchestrator 判定 F-1 属于签署前置而非收尾修正，则正确档位是 **`REVERIFY_REQUIRED`**（文档修正后 QA 复核读数），**绝不是 `PASS`**。
>
> （以上四条的**逐字**引用范围为 `qa-signoff-2.md` §12 的结论句与第 1–4 条原文。）

> **QA 第 4 条的条件已按事实判定**：本层把 F-1 作为**收尾修正**处理（而非签署前置），理由 = ① F-1 不改变任何 gate 的 exit code；
> ② 其修正落在**文档结论层**且**不改任何测试/源码**；③ 修正后 QA 的**读数本身未被反驳**（27.8% 与本层独立复跑一致）。
> 因此档位**停留在 `CONDITIONAL`**，**未**升级为 `REVERIFY_REQUIRED`，**也绝未**记为 `PASS`。
> 若用户/后续复核者不同意该判定，正确的纠正路径是：把本层对 `drift-check.md` / `progress.md` 的文档修正交由 QA 复核读数 → 走 `REVERIFY_REQUIRED`。

### 8.2 两侧主张

| 侧 | 主张 | 理由（原文要点） | 出处 |
|---|---|---|---|
| **QA（Ivy）** | 「**本 Sprint 不因本报告获得发布许可（`release_eligible` 未建立）**」；档位 `CONDITIONAL`（唯一理由 = CI pending） | `ci_gate` CG1/CG2/CG3/CG4/CG5 全 pending → 唯一合法状态是 `CONDITIONAL`；本地绿**不构成** CI 绿或「与原 `.ps1` 等价」的替代证据 | `qa-signoff-2.md` §2 末段 / §12 |
| **Orchestrator** | 本 Sprint 的**可本地执行范围**已收尾 → `progress.status: done`；但 **`release_eligible: false`**、`ci_pending: true` | 9/9 任务、0 阻塞、required local gate **13/13 exit 0** @ `42d3c7e`、MG1–MG10 全绿、L2 manifest canonical 可复算；CI 通道在本机**结构上不可达**（fork 无 workflow 注册 + 无 PR 授权） | orchestrator 判定（`progress.md` Trace Log `stage: l2` / `qa`） |

### 8.3 分歧的实质

分歧**不在事实层**（双方对「CI 未取证」「E1 不可达」的认定完全一致，无任何一方宣称等价性或 CI 已证），
而在 **「`done` 这一状态承载什么语义」**：QA 把 `done` 与**发布可用性**绑定；Orchestrator 把二者**解耦**
（`done` = 当前可执行边界内已结算；`release_eligible` = 发布证据完整性的独立字段）。

### 8.4 最终裁决（本报告采用）与理由

```text
status: done
release_eligible: false
ci_pending: true
qa_status: CONDITIONAL
```

1. **QA 的实质关切已被机械承载，未被绕过**：`release_eligible: false` + `ci_pending: true` 是本报告 frontmatter 字段；
   §2.2 / §2.4 / §4 / §5-R-1/R-3/R-6 与 `PROJECT_BRIEF` §8/§9 均**显式声明 CI 未取证**；**逐字保留** QA §12 的「不因本报告获得发布许可」。
2. **若把 `done` 与 CI 绿绑定，本 Sprint 将在无 PR 授权期间无法结算**：收尾产物与 `progress.status` 会永久悬挂，且该悬挂**不产生新的质量信息**（缺的是外部通道授权，不是本地证据）。
3. **反对意见完整保留在案**（§8.1 逐字 + §8.5 falsifier）：CI 通道一旦可用，`CG1 → CG2 → CG4/CG5 → CG3` **必须**依次补证；本裁决**不豁免**该义务。

### 8.5 本裁决的 falsifier（判定失效条件）

若 ① CG2 出现任一 matrix 组合 failure；或 ② CG4 出现 `parity: FAIL`（**已证伪忠实移植**）；或 ③ CG5 的 windows smoke 未通过
（`install.ps1` 正常路径非 0 或注入哨兵未非零）——则本 `done` 判定与 T1–T9 的相应终态**同时失效**，须走 `REVERIFY_REQUIRED`
重绑并上调 F-1/F-2 的严重性。另：**本 Sprint 的正确性主张上限**为「JS 锚点一致（E0+E2），差分通道 unavailable」——
任何「与 `.ps1` 等价」的表述都是违规（§16.2 禁令 ①）。

---

## 9. 移交 Sprint 3（本 Sprint 未修 / 未取证项）

| # | 项 | 来源 | 建议动作 | 阻塞级别 |
|---|---|---|---|---|
| 1 | **`>20% → 强制扩展 target_rules` 被触发但未按规则处置** | F-1 / `drift-check.md` §9 | 以 `--prev-sprint 2`（baseline `ef6a485`）复核是否仍 >20%；若是 → 真正执行「扩展 Sprint 3 `target_rules` 覆盖 Sprint 2 漏检面」的机械动作 | **高**（唯一「已触发未处置」的强制规则） |
| 2 | **CI 取证（CG1→CG2→CG4/CG5→CG3）** | R-1 / R4 / OQ12 | 用户授权 PR 路径后依次取证；CG4 必核三态状态行 + exit 映射；CG5 必核 windows 双向日志 | **高**（`release_eligible` 唯一开口） |
| 3 | **H-set-B 6 个 hook Node 化**（`validate-handoff` / `validate-qa-signoff` / `qa-freshness-check` / `cleanup-qa-session` / `auto-update-progress` / `pre-commit-lint-check`） | plan §13.0 / N9 | 按 per-hook promotion 判据逐条决定；**validate-qa-signoff + qa-freshness + cleanup 必须同批** | 中高（无 pwsh 宿主上这 6 条**不触发** = 不是已生效门禁） |
| 4 | **真实宿主语义取证**（OQ8 spawn 失败 = deny/ignore；OQ9 真实载荷 schema） | R-2 / F-4 | 采一次真实 Copilot 会话日志；若 spawn 失败为 `deny` → 未移植声明立即移植或移除 | 高（决定 F-4 定级与 6 条声明的行为） |
| 5 | **F-4 的 1 行 `TOOL_LIKE_KEY` 改进** | F-4 / HB-11 | 把 `arguments`/`parameters`/`function` 纳入 ⇒ fail-closed 方向；**须与真实载荷取证同批**，并重跑 LG15 + 重签 | 中（方向安全，但属产品码 → 需新 revision + 重签） |
| 6 | **F-3 installer 残留扫描作用域收窄 + 原子性** | F-3 / HB-10 | 只扫「本 bundle 写入的文件」；失败时提示清理/重跑（幂等已实测） | 中 |
| 7 | **F-5 文档类三面镜像登记** | F-5 / HB-12 | 把 `hooks/README.md` 加入 `SPRINT2_NODE_ARTIFACTS` 或新建文档类三面组 | 低 |
| 8 | **F-6 判据强度** | F-6 / HB-13 | ps1 侧断言改为注释/文案级判别，或显式声明该判据为 sh-only；`KIX-INSTALLER-NO-NODE` 以 exit code 为主判据 | 低 |
| 9 | **F-2 残留 4 处 + 历史 3 条** | F-2 / R-7 / HB-8 | 改 `dsh/README-DSH.md:57-59`、`PLUGINIZATION-ROADMAP.md:172`、`context-budget/README.md:74`、`kix-general-evolution.md:333`；`CHANGELOG` 历史条目按红线不改 | 低 |
| 10 | **D-5 `parity: exit 2` 字面不可达** | plan §13.1 步骤 D / `parity_exit_code:` 行 | plan 侧决策：改 LG10 的 cmd 或在 CI step 内定档（后者已落地） | 低 |
| 11 | **`warn_threshold = 10 == hard_cap`** 预警通道不可达（OQ13） | plan §17 / N6 | 框架层公式复核（TEAM_CONVENTIONS v5.0） | 低（跨 Sprint） |
| 12 | **hooks 面 `.ps1` 漂移**（`blast-radius-check.ps1` 556 vs 444）+ `skills/**` 不在守护面 | OQ10 / N1 / N8 | 逐段 diff 判定 canonical；决定是否把 `skills/kixpower/hooks/**` 纳入一致性守护 | 中 |
| 13 | LG13/LG14 等 `required:false` gate 的常态化 | 本层观察 | 是否升为 required（先评估噪声） | 低 |

> 以上为**登记**，不构成本 Sprint 的未完成项：`total_tasks: 9` 已全部 done，`blocked_tasks: 0`。
> 其中第 1、2、4 项是**必须优先处理**的开口（分别对应「强制规则未处置」「发布解锁」「真实语义未取证」）。

---

## 10. 复算入口（第三方复核用）

| 目的 | 命令 | 预期 |
|---|---|---|
| HEAD / final_head | `git rev-parse HEAD` / `git log --oneline -1 42d3c7efdd1dfcdf8aba4ba933713547d83e5247` | `42d3c7e` 是**签署冻结 revision**；C5（本文件所在提交）的 sha 以 `HEAD` 为准 |
| 提交数（over_budget） | `git rev-list --count ef6a485..HEAD` | **5**（C1..C5）；derived 6 ⇒ `over_budget: 0` |
| required gate 集合 | `sed -n '/^  local_gate:/,/^  ci_gate:/p' docs/sprint-2/plan.md \| grep -c "required: true"`；等价核对 = id 集合 `{LG1..LG9, LG11, LG12, LG15, LG16}` | **13**（LG10 为 `required: false`；LG13/LG14 亦非 required） |
| **C5 变更面（docs-only 自证）** | `git diff --name-only 42d3c7e..HEAD` 与 `git status --porcelain` | 不含 `skills/`、`scripts/`、`agents/`、`en/`、`install.*`、`package.json`、`.github/`；`dsh/` 面仅 `README-DSH.md` 与 `preset-classic/DSH-ADAPTATION.md` 两个 `.md` |
| F-1 的三次读数 | `node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 1` | `ungated: 22 (27.8%)`（C5 编辑前工作树）；**无 `PASS` 行**；`fidelity_v5.sprint: 1`、`baseline_sha: c3c31eb…` ⇒ 窗口 = Sprint 1 + Sprint 2 |
| F-1 的登记 | `sed -n '/## 9. C5 修订登记/,$p' docs/sprint-2/drift-check.md` | 含「**触发且未处置**」+ R-5 窗口口径 + Sprint 3 结转 |
| F-2 的 5 处 | `grep -rn "sync-dsh-preset" README.md README.en.md dsh/README-DSH.md dsh/preset-classic/DSH-ADAPTATION.md` | 均指向 `node scripts/sync-dsh-preset.cjs`（`:57-59` 为已登记的 R-7 残留） |
| F-7 的字节数 | `wc -c /tmp/kix-validate-memory-backlog.cjs` | `2988`（原文 3612 有误） |
| manifest 复算 | `node -e "const c=require('./skills/kixpower/scripts/kixpower-contract.cjs');…"`（按 `plan.md` §7.2 规则） | `5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976`（QA 已复现） |
| `install.ps1` 可执行验证 | CG5（CI windows-latest） | 本地**不可执行**（无 pwsh）→ 只有静态判据（R-3） |
| 等价性（唯一可称「等价」的档位） | CG4（CI，runner 预装 pwsh） | 本地 LG10 恒 `unavailable`；**不得**把 LG15/LG9 的绿表述为「与原 `.ps1` 等价」 |
