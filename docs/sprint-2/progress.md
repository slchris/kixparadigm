---
sprint: 2
status: done
last_updated: 2026-09-22
completed_tasks: 9
total_tasks: 9                          # T1..T5（plan.md §4）+ T6..T9 = H-A..H-D（§13，2026-09-22 增量重规划追加）；HB-6 scoped trial 的收尾层由 task_sizing_v2.closeout_layer 承载，不占 task 位
blocked_tasks: 0
open_issues: {P0: 0, P1: 0, P2: 0}      # 上游仓库 Issues 已禁用（hasIssuesEnabled: false）→ 缺陷只登记在本文件与 plan.md
artifacts_changed_since_last_observe:
  # ── 已提交（affc9c7 = 层 1：T1 + T5）──
  - skills/kixpower/scripts/kixpower-contract.cjs
  - skills/kixpower/tests/trust-chain.test.js
  - skills/kixpower/tests/ps1-parity.test.js
  - dsh/preset-classic/skills/kixpower/{scripts/kixpower-contract.cjs,tests/trust-chain.test.js,tests/ps1-parity.test.js}
  - en/preset-classic-en/skills/kixpower/{scripts/kixpower-contract.cjs,tests/trust-chain.test.js,tests/ps1-parity.test.js}
  - skills/kixpower/TEAM_CONVENTIONS.md（+2 preset 副本：host_requires / unavailable 三态 schema）
  - dsh/preset-classic/agents/*.agent.md（5 个死 hooks 块删除 + 措辞收敛）
  - en/preset-classic-en/agents/*.agent.md（同上 5 个）
  # ── 层 2 已提交（C3 = 27fe7f6：T2 + T3 + T6）—— 原标题「未提交 WIP」不属实，C5/F-7 修订 ──
  - skills/kixpower/scripts/validate-memory-backlog.cjs（+2 preset 副本）
  - skills/kixpower/scripts/verification-fidelity-check.cjs（+2 preset 副本）
  - skills/kixpower/tests/{trust-chain,ps1-parity}.test.js（WIP 收口；各 3 副本）
  - prompts/kixpower-new.prompt.md（+2 preset 副本）、skills/kixpower/USAGE_MANUAL.md（+2 preset 副本）、agents/kixpower-producer.agent.md
  # ── 层 2 已提交（T2 + T3 + T6，见下 Trace Log `dev_layer2`）──
  - skills/kixpower/hooks/lib/kix-verdict.cjs（+2 preset 副本；payload 归一化 + 逐字移植自 kix-guards 的判定层）
  - skills/kixpower/hooks/{blast-radius-check,block-source-edit,block-source-edit-qa,block-dev-authority-edit}.cjs（+2 preset 副本）
  - skills/kixpower/tests/hook-engine.test.js（+2 preset 副本；LG15）
  - .github/workflows/ci.yml（T6 步骤 D：E1 三态独立 step）
  - docs/sprint-2/drift-check.md（T3 首次真实运行输出追加）
  # ── 层 3 已提交（T4 + T7 + T8 + T9，见下 Trace Log `dev_layer3`）──
  - scripts/sync-dsh-preset.cjs（单副本，T4 收口）、scripts/sync-dsh-preset.test.js（Node 化，5 skip → 0）
  - scripts/copilot-installer.test.js（**新增**，LG16 双向证据网）
  - dsh/preset/plugins/consistency-lib.cjs（+3 副本：11 组三面镜像登记 + `dsh/preset-classic` 语法盲区修复）
  - install.sh / install.ps1（占位符层删除 + KIX-INSTALLER-NO-NODE / KIX-INSTALLER-RESIDUE + 空作用域 skip）
  - package.json（仅 `test:installer` 参数 += copilot-installer.test.js）
  - agents/*.agent.md ×5（10 处 H-set-A 命令 → node；6 条 H-set-B 追加宿主能力条件注记）
  - skills/kixpower/hooks/README.md（+2 副本；宿主状态台账 / promotion 判据 / deprecated 声明）
observe_fingerprint: 27fe7f6   # 本层开工时的 HEAD（层 2 提交；层 3 commit sha 见下 Trace Log）
sprint_baseline_sha: ef6a48550a40bf433555790419fd4c2fd0cf1483   # 首次 Dev 前的 HEAD（完整 40 位）；Sprint 1 终态 rev（其 done.md 记 a3cdfb1 + 收尾补正 ef6a485，见 plan.md OQ0）
dev_self_tests_passed:
  - "node --test skills/kixpower/tests/trust-chain.test.js @ T1 — 13 tests / 13 pass / 0 fail / 0 skip（LG9；E2 characterization + E3 冻结凭据复算）"
  - "node --test skills/kixpower/tests/ps1-parity.test.js @ T1 — exit 1，`parity: unavailable — probe ENOENT`（LG10 = unavailable；**非 skip、非 pass**：2 tests / 1 pass（harness 自检）/ 1 fail（三态机的 unavailable 出口）/ 0 skip）"
  - "npm run test:installer @ T1+T5 — 25 tests / 20 pass / 0 fail / 5 skip（baseline 未变；P2/T4 才归零）"
  - "npm run test:consistency @ T1+T5 — CONSISTENCY OK（en 侧 JS 语法面 26 → 29，含新增 3 个 .cjs/.test.js）"
  - "MG5 镜像一致 @ T1 — md5 -q 三副本 kixpower-contract.cjs = fb457d327f0ad81a161bfb1ed7510196（trust-chain/ps1-parity 亦三副本同一 md5）"
  - "MG2 @ T5 — grep -rn \"^hooks:\\|\\.ps1\" dsh/preset-classic/agents en/preset-classic-en/agents | wc -l = 0；核对侧：grep -c \"^hooks:\" agents/*.agent.md = 5（Copilot 面保持）；ls skills/kixpower/hooks/*.ps1 | wc -l = 10（hooks 文件本身未删）"
  # ── 增量重规划期实测（2026-09-22，Producer 只读/只跑既有命令，不替 Dev/QA 做验收）──
  - "增量重规划期 @ WIP 工作树（HEAD=affc9c7）— npm run test:installer exit 0 = 25 tests / 20 pass / 0 fail / **5 skip**（T4 未完成：sync-dsh-preset.test.js 仍 spawn pwsh）；node --test scripts/install-lib.test.js = 20/0/0；npm run test:consistency exit 0"
  - "增量重规划期能力探针 — `node` v22.14.0（/usr/local/bin/node）；`pwsh` absent（command -v 空）；`node --test dsh/preset/plugins/kix-guards.test.js` = pass 1 / fail 0（159 断言折叠为 1 个 node:test 单元，见 F14）"
  # ── 层 2 实测（T2/T3/T6；命令与计数均为本机实跑）──
  - "node --test skills/kixpower/tests/hook-engine.test.js @ T6 — **44 tests / 44 pass / 0 fail / 0 skip**（LG15；含 §6 mutation probe：改坏 core 的临时副本 ⇒ 子套件 16 个 not ok、进程非 0）"
  - "node --test skills/kixpower/tests/trust-chain.test.js @ T2+T3 — **23 tests / 23 pass / 0 fail / 0 skip**（LG9；E3 冻结凭据复算 + T2/T3 characterization；原 1 红「12 required gate」已按 §16.5 v2 口径修订为 13 + LG10 非 required 断言）"
  - "node skills/kixpower/scripts/validate-memory-backlog.cjs --project-root . @ T2 — exit 0；`record_count: 7` / `legacy_unstructured_records: 0`（LG12 判据：**7 而非 plan §4-T2 验收写的 6** —— 增量重规划期 Producer 追加 HB-7 记录，见 `U2-parity:` 行）"
  - "node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 1 @ T3 — exit 0；输出读数（**C5/F-1 修订，原文误记为 `46/17/29` + `ungated: 0 (0%)` → `PASS`**）= `total changed: 64` / `in_scope (rules): 17` / `whitelisted: 32` / **`ungated: 15 (23.4%)`** / `HIGH_RISK`（**无 `PASS` 行**）；窗口 = `--prev-sprint 1` ⇒ baseline `c3c31eb`，覆盖 **Sprint 1 + Sprint 2**（R-5）；QA 在冻结 revision `42d3c7e` 的权威复跑 = `79 / 18 / 39 / 22 (27.8%)`（LG11 的 exit 0 字面判据成立，**但不得据此声称覆盖率 PASS** —— 见 `drift-check.md` §9）"
  - "npm run test:installer @ 层 2 — **25 tests / 20 pass / 0 fail / 5 skip**（T4 未完成，与规划期基线一致，无新增假绿）"
  - "npm run test:consistency @ 层 2 — exit 0（新增 hooks 面 3 副本字节一致组由 T4 登记；当前守护面不覆盖 skills/**，F5）"
  - "MG8 预核 @ T6 — `ls skills/kixpower/hooks/*.ps1 | wc -l` = 10（H-D 保留，T9 复核）；4 个 Node 入口 ×3 副本 md5 各 1 个取值"
  # ── 层 3 实测（T4/T7/T8/T9）──
  - "npm run test:installer @ 层 3 — **32 tests / 32 pass / 0 fail / 0 skip**（LG1：25 + N，N=7 实测回填；skip 由 5 归零）"
  - "node --test scripts/copilot-installer.test.js @ T7 — **7 tests / 7 pass / 0 fail / 0 skip**（LG16 双向：正向 / residue / 空作用域 chmod / 低版本 node / 无 node / 两 installer 静态对称 / MG8 ②③）"
  - "npm run test:consistency @ 层 3 — exit 0；新增 11 组「三面字节一致」登记（LG15 证据网与 4 个 hook 入口在内），并**修复语法盲区**：`dsh/preset-classic: 37 JS/CJS/MJS syntax OK`（此前只查 `dsh/preset`，symlink 不跟随 → classic 面无人守护）"
  - "MG8 静态判据 @ T7 — `grep -c 'HOOK_LAUNCHER\|HOOK_EXT' install.sh install.ps1` = **0 / 0**（原 4 / 4）；`grep -c 'node \"{{COPILOT_HOME}}/skills/kixpower/hooks/' agents/*.agent.md` = **8 行 / 10 个声明 / 4 个 distinct hook**（producer 的 4 命令单行数组按 1 行计）"
  - "MG10 静态判据 @ T8+T9 — 3 副本 `hooks/README.md` md5 一致（1 个取值）；`ls skills/kixpower/hooks/*.ps1 | wc -l` = **10**（未删除任何 `.ps1`；三面 30 文件零改动）"
  - "install.sh 端到端 @ T7 — 真装进临时 `COPILOT_HOME`：exit 0、`grep -r '{{' <tmp>/agents` = 0 行、`skip: chmod +x (0 .sh files)`（无 ok 级 chmod 播报）；负向：注入 `{{KIX_RESIDUE_PROBE}}` → exit 1 + `KIX-INSTALLER-RESIDUE`；PATH 无 node / node v18.4.0 stub → exit 1 + `KIX-INSTALLER-NO-NODE`"
l2_verification_passed: [LG1, LG2, LG3, LG4, LG5, LG6, LG7, LG8, LG9, LG11, LG12, LG15, LG16]
                                        # orchestrator 独立复跑（非采信 Dev 自报）：13/13 required local_gate exit 0
                                        # 计数：LG1 32/32/0/**0 skip**（25→32，skip 5→0）· LG3 23/0/1 · LG4 20/20 ·
                                        # LG5 60→59/0/1 · LG6 npm test exit 0 · LG7 35/0/1 · LG8 en npm test exit 0 ·
                                        # LG9 23/23/0/0 · LG15 44/44/0/0 · LG16 7/7/0/0 · LG11 fidelity exit 0
                                        # （首度量 ungated_ratio_pct 27.8，Sprint 1 为 baseline_degraded）·
                                        # LG12 memory valid / record_count 7。LG10 = required:false（本机永久 unavailable，不入本清单）
l2_verified_sha: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
l2_gate_manifest_sha256: 5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976
                                        # **由 canonical 实现产出**（skills/kixpower/scripts/kixpower-contract.cjs，
                                        # 非 Sprint 1 的临时脚本）；field_set = {id,type,cmd,expect,required,host_requires}
                                        # 三方一致：plan required(13) == L2 verified(13) == manifest(13)；
                                        # gateManifestConflicts = []；stash = []；工作树 dirty = 0
l2_stash_refs: []                       # L2 完成时 git stash list --format=%H 快照（空）
qa_started_sha: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
qa_verified_sha: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247   # = QA 签署证据对应 revision（C5 前最后一层）；QA 报告 frontmatter 同值
qa_gate_manifest_sha256: 5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976   # QA 用 canonical 实现本地复算，逐位一致
qa_status: CONDITIONAL                   # 唯一理由 = ci_pending；无 P0/P1、无 gate 失败（qa-signoff-2.md §12）
qa_test_changes: []
qa_session_marker: docs/.kixpower-qa-session.json
final_head: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
                                        # **签署冻结的 evidence revision**（L2 13/13 + QA 复跑 + 签署均绑此值）。
                                        # C5 收尾层自身的 sha **无法自含**于本文件（commit 不能包含自身 hash，且 amend 被硬禁）
                                        # → C5 的 sha 以 `git rev-parse HEAD`（本文件所在提交）为准，见 Trace Log `producer_closeout`。
ci_pending: true                        # 规划期 CI 未跑；CONDITIONAL 只能因 CI gate pending（R4 open）→ CG4/CG5 亦 pending
topology_used: sequential               # plan.md §14 properties = sequential（force_sequential: true；公式给 hybrid，ω=7/γ=0.41）
# === 规划期实测的宿主能力事实（本 Sprint 的核心前提）===
host_capabilities:
  pwsh: absent                          # 实测 command -v pwsh 空；**用户已永久否决安装**（含一次性 oracle）→ LG10 本地永久 unavailable
  node: "v22.14.0"                      # 既有硬依赖：package.json#engines.node = ">=20.16.0"
  npm: available
  brew: "7.0.1-21-gef55185"
pwsh_oracle: declined                    # 用户决策：既否决运行依赖，也否决一次性 oracle → 按 plan.md §16.2（v2）执行：E1 移交 CG4，本地 LG10 = unavailable
blast_radius:
  commit_budget: 6                      # = plan.md task_sizing_v2.derived_commit_budget（**绑定值 6 = min(公式 9, 环境硬约束 6)**）；hook 强制读取
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
| T2 | `validate-memory-backlog.ps1`(89) → `.cjs` + 关闭 U-2 对拍 + `prompts/kixpower-new.prompt.md:80` 调用点改写 | [x] | T1 | 层 2 完成：LG12 实测 exit 0（`record_count: 7`）；`U2-parity:` 三方对照 = 与 Sprint 1 即兴移植**逐字节一致**（3 fixture）|
| T3 | `verification-fidelity-check.ps1`(320) → `.cjs` + `USAGE_MANUAL.md:365` / producer agent 调用点改写 + 首次真实运行追加 `drift-check.md` | [x] | T1 | 层 2 完成：LG11 实测 exit 0；读数 = **`ungated: 15 (23.4%)` / `HIGH_RISK`（无 `PASS` 行；窗口 = Sprint 1 + Sprint 2）**，`baseline_degraded` 解除（指标可量化，但**非 PASS**）；**C5/F-1 修订**：原文「`ungated: 0 (0%)` → PASS」与 `drift-check.md` §8 自身逐字块矛盾，已按实际读数改正；输出已追加到 `drift-check.md` §8 |
| T4 | `scripts/sync-dsh-preset.ps1`(197) → `.cjs` + 5 条 pwsh 类 skip 归零（`test:installer` 25/0/5 → 25+N/0/0）+ **全部新增 `.cjs` 镜像登记（含 T6 的 15 个 hooks 文件）** + 修 `checkSyntax` symlink 盲区 | [x] | T1, T6 | 层 3 完成：`test:installer` = **32 / 32 pass / 0 fail / 0 skip**（N=7 实测）；11 组三面镜像登记 + `dsh/preset-classic` 语法守护（37 文件）；`consistency-lib.cjs` 仍单写入者 |
| T5 | P1：清 DSH 面向副本的 10 个死 `hooks:` 块（classic 5 + en 5）+ 收敛失效措辞 | [x] | — | **不删 `hooks/*.ps1`**；不动 root 的 Copilot 分发版（`agents/`）|
| **T6** | **H-A 单一 hook 引擎**：`hooks/lib/kix-verdict.cjs`（payload 归一化 + 从 `kix-guards.js __internals` 逐字抽取的判定层）+ 4 个 Node 入口（各 3 副本）+ `hook-engine.test.js`（细粒度 + 负向控制 + mutation probe + 同源函数体断言）+ CI 侧 E1 step 与 parity 退出码修订 | [x] | T1 | 层 2 完成：LG15 = **44 tests / 44 pass / 0 fail / 0 skip**（含 mutation probe 自证红）；4 个 hook 入口 ×3 副本 md5 一致；`kix-guards.js` 4 副本**零改动** |
| **T7** | **H-B 接线与失败关闭**：4 个 hook 命令统一 `node "{{COPILOT_HOME}}/.../<name>.cjs"`；两个 installer 删除 `HOOK_LAUNCHER`/`HOOK_EXT` 层 + INV-H1 残留 fail-closed + INV-H3 消除空作用域 `ok` + `copilot-installer.test.js`（正/负双向） | [x] | T6 | 层 3 完成：MG8 = 0/0 + 10 声明（4 distinct）；LG16 = 7/7（含 orchestrator 核验补充的 node 前置双向判据）；**`install.ps1` 本地无 pwsh → 仅静态判据，可执行验证走 CG5**（如实登记） |
| **T8** | **H-C 覆盖裁决留痕**：`hooks/README.md`（3 副本：宿主状态表 + H-set-B promotion 判据 + deprecated 声明）+ 未移植 6 条 hook 的宿主能力条件注记（root agents **只追加**）+ 本文件 `hooks-coverage:` 行 | [x] | T6 | 层 3 完成：README 3 副本 md5 一致；10 处注记（**只追加**，声明数 10/10 与 frontmatter 解析未变）；`hooks-coverage:` = 10 行表（MG9） |
| **T9** | **H-D `hooks/*.ps1` 去留**：**保留全部 30 文件 + 标记 deprecated**（不删除）+ 删除判据与可回滚性落盘 | [x] | T6 | 层 3 完成：`ls skills/kixpower/hooks/*.ps1 \| wc -l` = **10**（反向控制）；30 文件零改动；deprecated 声明落在 README §3 三层留痕之一 |

**合计**：**9 任务，9 完成（T1/T5 = 层 1；T2/T3/T6 = 层 2；T4/T7/T8/T9 = 层 3），0 阻塞，0 未开始**。
遗留项（非任务缺口，已逐条登记）：`install.ps1` 可执行验证归 CG5（本地无 pwsh）、`parity: unavailable` 退出码 2 的机制冲突（D-5）、真实 Copilot 载荷 schema 未取证（OQ9/OQ8）。

**DAG v2 分层与提交映射**（plan §14/§15，**每 DAG 层合并 1 个 commit 是硬要求**）：
`[T1,T5]` → C1 `affc9c7`（**已提交**）；`[T2,T3,T6]` → C3 `27fe7f6`（**已提交**）；`[T4,T7,T8,T9]` → C4 **`42d3c7efdd1dfcdf8aba4ba933713547d83e5247`**（**已提交**，C5 回填；= L2/QA 签署冻结的 evidence revision）；C2 = `1479a35` 增量规划文档；C5 = 收尾层（`done.md` + `hill-climbing.md` + L4/memory + F-1/F-2/F-7 修正；**C5 自身 sha 以 `git rev-parse HEAD` 为准**）。
**commit_budget 消耗**：6 中的 **5**（C1/C2/C3/C4/C5）→ **`over_budget: 0`**（余量 1 未用；详见 `done.md` §6）。
**总预算 6（绑定值）= min(公式 9, 环境硬约束 1h/10-commit 与用户 ≤6 指令)；预计 5，余量 1。**

> **T1 移交 T2/T3 的契约面**（消费者只需这些）：`frontmatter / yamlScalar / yamlList / inlineYamlList / indentedBlocks / planGateRecords / requiredLocalGates / gateManifestConflicts / gateManifestJson / sha256Hex / isSha`（plan.md §4-T1 步骤 A 清单；hooks 侧 helper 显式不移植）。
> **T5 的前向引用说明**：T5 把 DSH 面向 agent 里的两处脚本调用点一并改写为 Node 形态（orchestrator 的 validator、producer 的 fidelity）——这是 MG2（该目录 `.ps1` 计数 = 0）的必然要求；被引用的 `.cjs` 由同 Sprint 的 T2/T3（层 2）交付，故层 1 revision 上该引用是「同 Sprint 内前向指向」。
> **C1 的凭据**：层 1 = `affc9c73c51960df2add8f8e8af4ebdd995199dc`（`feat(sprint-2): T1 等价性取证基座 + T5 DSH 面死 hooks 清理（层 1/3）`）。

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

### 增量重规划期新增事实（2026-09-22；`F1–F10` 逐字保持不动）

> **编号空间**：本台账编号为 `F11–F19`（canonical，逐条带证据）；`plan.md` §12.4 的同一批观测记为 `RF-1–RF-7`
> （决策视角的精简版，**不共享编号空间**）。两处的数字必须一致，任一变化需同步另一处。

| # | 事实 | 证据（实读/实跑） |
|---|---|---|
| **F11** | **缺陷本体（silent failure）**：`install.sh:222-233` 对已安装 agent 做 `{{HOOK_LAUNCHER}}→bash` / `{{HOOK_EXT}}→sh` 的 `sed`，随后 `:234` **无条件** `ok "Replaced placeholders in agent.md files"`；`install.ps1:217-227` 同构（→ `pwsh -NoProfile -File` / `ps1`），`:228` 无条件 `Show-OK` | 实读两个 installer |
| **F12** | **占位符契约是空的**：`{{HOOK_LAUNCHER}}`/`{{HOOK_EXT}}` 在任何源文件中都不存在 —— 全仓 `grep`（排除本轮规划文档自身的引用）只命中两个 installer 的**注释行与替换行**共 **8 行**（`install.sh:20-21,228-229`；`install.ps1:19-20,223-224`）；**另有 4 行**不含 token 的 dry-run 播报（`install.sh:155-156`、`install.ps1:141-142`）宣告同一层替换。`agents/*.agent.md` 的 20 处 hook 命令**硬编码** `pwsh -NoProfile -File "…ps1"`，文件里唯一真实占位符是 `{{COPILOT_HOME}}`（21 处） | `grep -rn "HOOK_LAUNCHER\|HOOK_EXT"`（排除 docs/memory）；`grep -n "Hook launcher\|Hook extension" install.sh install.ps1`；`grep -o '{{[A-Z_]*}}' agents/*.agent.md \| sort \| uniq -c` |
| **F13** | **空转步骤 + 假绿**：`install.sh:236-240` 的 `find … -name '*.sh' -exec chmod +x` 在 **0 个 `.sh`** 上执行后仍打印 `ok "chmod +x on .sh hooks/scripts"`（hooks 面全为 `.ps1`） | `install.sh:236-240`；`ls skills/kixpower/hooks/` |
| **F14** | **净效果**：macOS/Linux 装完 Copilot 后 agent hooks 指向不存在的 `pwsh` → **永不触发**，安装器**全程报成功**；Windows 因硬编码恰好正确而不可见。**第二层**：`DSH-ADAPTATION.md:56` 记录真实 Copilot 运行时（`copilot-agent 1.0.70+`）载荷为 `toolCalls:[{id,name,args}]` / `toolName+toolArgs`，而 10 个 hook 中 **9 个**读 `tool_name`（旧 schema）→ 「能启动」也不等于「会生效」 | F11–F13 合成；`grep -l tool_name skills/kixpower/hooks/*.ps1 \| wc -l` = 9；`DSH-ADAPTATION.md:56`（**文档级证据，未本机实测** → OQ9） |
| **F15** | **hooks 面第二处未守护漂移**：`blast-radius-check.ps1` 源 **556 行** vs `dsh/preset-classic/` 与 `en/preset-classic-en/` 副本各 **444 行**；其余 9 个 hook 三副本 md5 一致 | `wc -l` ×3；逐文件 `md5 -q` 比对 |
| **F16** | **hook 声明面**：root（Copilot 面）`agents/*.agent.md` 共 **20 处** hook 命令 —— blast-radius 5 / pre-commit-lint 5 / block-dev-authority-edit 2 / block-source-edit 2 / block-source-edit-qa 1 / validate-handoff 1 / validate-qa-signoff 1 / qa-freshness 1 / auto-update-progress 1 / cleanup-qa-session 1；`kixpower-reviewer.agent.md` 无；**DSH 面 = 0**（T5 已清） | 逐文件 frontmatter 实读 |
| **F17** | **发行面交集为空（H-A 的判定依据）**：Copilot 安装只复制 `skills/**` + `agents/**`（**不装 `dsh/**`**）；而 `dsh/preset-null/` **没有 `skills/`** 兄弟目录 → 任何方向的跨面 `require` 都会在某一面上死掉 | `install.sh:163-172`（skills 复制段）；`ls dsh/preset-null/` |
| **F18** | 既有 JS 证据网规模：`kix-guards.js` 4 副本 × 1476 行、`__internals` 34 个纯函数；`kix-guards.test.js` 696 行 / **159 断言**，但**折叠为 1 个 `node:test` 单元**（`pass 1`）→ 新证据网必须细粒度 | `grep -c assert`；`node --test dsh/preset/plugins/kix-guards.test.js` |
| **F19** | 本会话实测计数：`npm run test:installer` = 25 tests / 20 pass / 0 fail / **5 skip**；`node --test scripts/install-lib.test.js` = 20/0/0；`npm run test:consistency` exit 0；`node` = v22.14.0；`pwsh` absent | 实跑（只读/无副作用命令） |

### 缺陷登记（本文件即缺陷台账；上游 Issues 已禁用）

| ID | 缺陷 | 级别 | 证据 | 处置 |
|---|---|---|---|---|
| **D-1** | **installer 占位符契约空洞 + 失败不报错**：macOS/Linux 装完 Copilot 后 hooks 永不触发，安装器全程报成功 | **高**（安全边界静默失效：越界写/破坏性操作在无 pwsh 宿主上无门禁） | F11–F14 | 本 Sprint 修复面 = **T7**（INV-H1/INV-H3 + LG16/CG5/MG8）；经验项 `LL-8`；eval `HB-7`（candidate） |
| **D-2** | hook 输入契约失真（旧 `tool_name` schema vs 真实 `toolCalls[]`） | **中高**（修复 D-1 后仍可能静默放行） | F14；`DSH-ADAPTATION.md:56` | 修复面 = **T6**（payload 归一化层 + LG15 的双 schema 用例）；取证 `OQ9` |
| **D-3** | hooks 面未守护漂移（`blast-radius-check.ps1` 556 vs 444） | 中（canonical 归属不明 → 移植参照可能取错） | F15 | 本 Sprint 只登记（`OQ10`/`N8`）；取值 = **源的 556 行为 canonical** |
| **D-4** | **`block-source-edit-qa.ps1` 的 git 写/提交分支在 `.ps1` 上失效**：该 hook `:53-54` 调用 `Test-KixGitCommitCommand` / `Test-KixGitWriteCommand`，二者在 `kixpower-contract.ps1` 中**嵌套定义于其他函数体内**（`:358/:368/:397`）→ hook 顶层作用域取不到 → 抛 `CommandNotFoundException` 后继续（默认 `ErrorActionPreference = Continue`）→ **QA 的 git 提交/写操作实际未被拦截**（`terminalWriteCommand` 因整条 `if` 条件语句异常也未生效） | 中（安全边界静默失效，与 D-1/D-2 同族） | `skills/kixpower/hooks/block-source-edit-qa.ps1:53-54` × `skills/kixpower/scripts/kixpower-contract.ps1:348/358/387`（嵌套）；`:407` 的 `Get-KixCommandSegments` 同样嵌套 | T6 的 Node 版**按意图生效**（QA 的 git 写/提交被 deny，LG15 有用例）；`.ps1` 侧**不改**（属 plan §2「不改 `.ps1`」边界）→ 差异写入 `hook-engine-evidence:` 的 `divergence` 与 core 文件头 |
| **R-3** | **`install.ps1` 本机不可执行验证**：本地无 pwsh → 本层只能给静态判据（标记齐备 / 0 旧占位符 / 2 处 node 判定且晚于拷贝）；语义正确性（PS 版本解析、`-DryRun` 残留扫描、路径分隔符替换）**未在本机取证** | 中（改动面含 fail-closed 路径，若静态判据漏掉真实缺陷则等于没修） | LG16 ⑤ 静态用例 + 逐行实读 patch 区域（`:55-78/:248-289`） | 可执行验证 = **CG5**（CI windows-latest smoke：正常 0 + 注入哨兵非零）；本层**不**声称 ps1 侧等价，登记为残留不确定性 |
| **D-5** | **`parity: unavailable` 的 `exit 2` 目标不可达**：plan §13.1 T6 步骤 D 要求三态退出码 0/1/2，但 `node --test <file>`（Node v22.14.0 实测）把测试子进程的任何失败归一化为 exit 1，`process.exit(2)` / `process.exitCode = 2` 两种写法均被抹平 | 低（不停工；三态语义已由状态行 + CI step 映射承载） | 见 `parity_exit_code:` 行的实测 | 已落地 CI step 内的 0/1/2 映射（CG4 可机械定档）；**字面达成需改 LG10 的 cmd（plan 侧决策）** → 待 orchestrator 裁决，Dev 不改 plan |

### WIP 归属（未提交工作 → 任务节点；**WIP 存在 ≠ 任务完成**）

完整对照表见 `plan.md` §12.3。一句话口径：**`validate-memory-backlog.cjs` → T2；`verification-fidelity-check.cjs` → T3；
`sync-dsh-preset.cjs` → T4；被改动的 6 个测试文件与 4 处调用点文档 → T2/T3；`PROJECT_BRIEF.md` 规划期追加段 → Producer。**
工作树实测 **14 M + 11 ??**（`git status --porcelain`，HEAD = `affc9c7`）。

## 必落盘的追踪行（供 QA / MG1–MG7 复核）

> 每条在对应任务完成时由执行者写入本节，格式固定，**不得留空或写「见上文」**。

| 行标签 | 何时写 | 内容要求 | 对应 gate |
|---|---|---|---|
| `pwsh-oracle:` | T1 步骤 D（已写） | `installed(<pwsh --version>)` / `failed(<brew 输出摘要>)` / `declined(用户否决)` | LG10、§7.4；**v2 起本地永久 `declined`**（§16.1/§16.2） |
| `parity-status:` | LG10 执行后（已写） | `PASS` / `FAIL(<首个分歧 fixture>)` / `unavailable(<探针证据>)` | LG10、§7.3；**v2 起本职移交 CG4** |
| `R1-digest-recompute:` | LG9 执行后（已写） | `match` / `mismatch(<本实现值>, first_divergence=<点>)` / `undetermined(<缺的证据>)` | MG3 |
| `U2-parity:` | T2 完成后 | `record_count` / `legacy_unstructured_records` / exit code 三元组 × 对照源；不可比写 `not-comparable` | MG4 |
| `ps1-drift:` | 规划期已写（F3） | 517 vs 507 与「守护仍 OK」的对照 | MG6 |
| **`hooks-coverage:`** | **T8 完成后** | **10 行表：hook → 类别（L1/L2/L3）→ 本 Sprint 取值（H-set-A / R3 候选）→ promotion 判据；缺任一 hook 行 = unmet** | **MG9** |
| **`installer-failclosed:`** | **T7 完成后** | **双向实测：正向（0 残留 + exit 0）/ 负向（注入 `{{KIX_RESIDUE_PROBE}}` ⇒ exit ≠ 0 且含 `KIX-INSTALLER-RESIDUE`）；空作用域 chmod 的输出文案** | **LG16、MG8** |
| **`hook-engine-evidence:`** | **T6 完成后** | **LG15 的用例数 + 负向控制数 + mutation probe 结果（改坏 core ⇒ 必须红）+ 同源函数体断言结论；**禁止**写「与原 ps1 等价」** | **LG15、§16.2** |
| `T*-evidence:` | 各任务完成时 | 独立于被改文件自身断言的证据（同 Sprint 1 的 MG3/MG6 口径） | QA 逐条 |
| **`parity_exit_code:`** | **T6 完成后（本次新增标签）** | **三态退出码可达性事实 + 承载通道（新增行，属 T6 步骤 D 的机制约束登记，非新 gate）** | **LG10、CG4** |

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
- tag: U2-parity
  value: >-
    U-2 关闭：**逐字节一致**。对照源 = Sprint 1 即兴移植 `/tmp/kix-validate-memory-backlog.cjs`（本机存在，**2988B**
    —— C5/F-7 修订：原文记 3612B 有误，`wc -c` 实测 2988；**实质结论不变**，QA 已独立重放三 fixture 证实 stdout 逐字节相同，
    CLI 为位置参数 `<root>`；本实现为 `--project-root <root>` —— 调用面差异已对齐后比对）。
    三元组实测（同 fixture、同 stdout 逐字节 + exit code）：
    ① repo backlog（`.kixpower/memory/repo/harness-backlog.md`）→ 两者 exit 0、`record_count: 7` / `legacy_unstructured_records: 0`；
    ② 合法 fixture（HB-1 六字段 + status: observed）→ 两者 exit 2 且 stdout 逐字节相同；
    ③ 非法 fixture（HB-1 缺字段 + `status: bogus`）→ 两者 exit 2 且 stdout 逐字节相同。
    证据强度：对照源本身是**移植件**（非 `.ps1` oracle）→ 只支持「两次独立移植互证」，**不支持**「与原 `.ps1` 等价」；
    与 `.ps1` 的逐字节差分仍走 LG10/CG4（本地 unavailable）。
  fixture: mktemp 目录 × 3（不写仓库工作树）；`diff <(old) <(new)` = 空
  note: plan §4-T2 验收行写的 `record_count: 6` 与实测 **7** 不一致 —— 差异来源 = 增量重规划期新增 HB-7（`1479a35`），非实现缺陷；已在此如实登记并同步任务表。
- tag: hook-engine-evidence
  value: >-
    T6 交付：4 个 hook 移植（H-set-A = blast-radius-check / block-source-edit / block-source-edit-qa / block-dev-authority-edit，
    各 1 个 `.cjs` 入口 ×3 副本 + 共用 `hooks/lib/kix-verdict.cjs` ×3 副本；H-set-B 未做，按 plan 登记 Sprint 3）。
    LG15 实测：**44 tests / 44 pass / 0 fail / 0 skip**；细粒度 `test()`（44 个，未折叠）；
    负向控制：4 个 hook **各 ≥2**（只读终端命令 / 合法文档编辑 / 测试文件 / 任务状态更新 / cargo fmt 例外）；
    两套 payload schema 固定用例：legacy `tool_name+tool_input` / `toolName+toolArgs` / `toolCalls[{name,args}]` 三形态
    **对同一 fixture 输出逐字节一致**的断言 + 别名用例；
    **第三态（orchestrator 核验补充）**：形态无法识别 / `tool_name` 在而 `tool_input` 缺 / `args` 声明为字符串但非 JSON
    → 一律 `deny` + `KIX-HOOK-UNKNOWN-PAYLOAD`（**不得静默 exit 0**），并有「只有元数据字段 ⇒ 非 unknown」的反向控制；
    mutation probe：`KIX_HOOK_CORE_PATH=<改坏 core 的临时副本>` ⇒ 子套件 16 个 `not ok`、进程非 0（**断言非恒真**已自证；
    子进程用最小环境，否则父测试进程注入的环境会让孙进程 `node --test` 直接 0 退出 = 假绿）；
    同源函数体断言：`GUARDS_PORTED` 20 个函数对 `kix-guards.js __internals` 同名函数**规范化后逐字相等**（0 漂移）；
    `GUARDS_PORTED_LOCAL_HELPERS` 6 个（含 plan 点名但 `__internals` 未导出的 `isInstallControlPlanePath`/`isSourceRepoPresetPath`）
    对 `kix-guards.js` **源文本按名抽取**后逐字相等；`GUARDS_PORTED_CONSTANTS` 9 个常量同法比对；
    共享语料 17 条命令的 7 类 verdict 与 `__internals` 一致。
  not_claimed: **不**声称与 `.ps1` 等价（§16.2 明令禁止）；**未取证**：真实 VS Code / copilot-agent 载荷 schema —— 唯一来源是
    `dsh/preset-classic/DSH-ADAPTATION.md:56`（2026-08-16，文档级），本机无真实会话采样（OQ9）；
    本层只声明「容忍三形态 + 未知形态 fail-closed」，不声明「已确认线上 schema」。
  divergence: `block-source-edit-qa.ps1:53-54` 调用的 `Test-KixGitCommitCommand`/`Test-KixGitWriteCommand` 在 `kixpower-contract.ps1` 中
    嵌套于其他函数体内（`:358/:368/:397`），hook 顶层作用域不可见 ⇒ 该分支在 `.ps1` 上失效；Node 版**按意图生效**（QA 的 git 写/提交被 deny），
    差异已写入 core 文件头与 D-4。
- tag: parity_exit_code
  value: >-
    **机制限制（如实登记，未完成项）**：plan §13.1 T6 步骤 D 要求 `unavailable` 的进程退出码由 1 改为 **2**
    （0=PASS / 1=FAIL / 2=unavailable）。实测（Node v22.14.0）：`node --test <file>` 会把测试子进程的任何失败
    **归一化为 exit 1**（本文件内 `process.exit(2)` 与 `process.exitCode = 2` 均被外层 runner 抹平，实测两种写法均得 1）
    ⇒ **LG10 的 cmd（`node --test …`）在本机无法表达 2**。
    已落地的替代：① 状态行 `parity: PASS|FAIL|unavailable` 仍是唯一三态机器可读通道（T1 设计不变）；
    ② CI 侧新增独立 step `Parity vs pwsh reference (E1, three-state)`（`.github/workflows/ci.yml`）按状态行映射为 0/1/2 → CG4 可机械定档。
    退出码 1 = FAIL 与 unavailable 的**语义区分**由状态行承载；`unavailable ≠ skip/pass/已等价` 不变。
  needs: orchestrator 裁决（plan §13.1 步骤 D 的字面要求 vs `node --test` 的机制上限）；如需严格 exit 2，须改 gate cmd（Dev 无权改 plan）。
- tag: T2-evidence
  value: LG12 = exit 0（三行恒定输出 `memory_backlog: valid` / `record_count: 7` / `legacy_unstructured_records: 0`）；调用点改写实测：`prompts/kixpower-new.prompt.md` 与 DSH/en 副本改为 `node skills/kixpower/scripts/validate-memory-backlog.cjs --project-root <ROOT>`；三副本 md5 一致
- tag: T3-evidence
  value: LG11 = exit 0（**C5/F-1 修订后读数**：`ungated: 15 (23.4%)` → `HIGH_RISK`，**无 `PASS` 行**；原文「`ungated: 0 (0%)` → PASS」与 `drift-check.md` §8 自身逐字块矛盾，已改正）；**首次真实运行**输出（`[Scope Rules]` + `[Verification Fidelity]` + `fidelity_v5:` YAML）已**追加**到 `docs/sprint-2/drift-check.md` §8（Sprint 1 手工 baseline 报告未改写）；调用点改写 3 处（USAGE_MANUAL + root/DSH producer agent）；三副本 md5 一致
- tag: T6-evidence
  value: 入口 CLI 端到端实测：三形态载荷下 `blast-radius-check.cjs` 均 exit 2 + deny JSON；`block-source-edit.cjs --role orchestrator` 与 `--role producer` 判定不同（exit 2 vs 0）；未知形态载荷 → exit 2 + `KIX-HOOK-UNKNOWN-PAYLOAD`（stdout + stderr 双通道）；`kix-guards.js` 4 副本**零改动**（LG15 的同源断言即其守护）
- tag: hooks-coverage
  value: >-
    **10 行表（MG9）：hook → 类别 → 本 Sprint 取值 → promotion 判据。** 台账全文 = `skills/kixpower/hooks/README.md`（3 副本 md5 一致）。
    类别判据（plan §13.0，机械可复核）：L1 = 非 fail-open 的 deny 类且其缺失使「越界写/不可逆破坏」无门禁；L2 = 校验 L2/QA 信任链产物；L3 = remind/cleanup 级。
    | hook | 类别 | 本 Sprint | promotion 判据（H-set-B，全部满足才开工） |
    |---|---|---|---|
    | `blast-radius-check` | L1 deny | **H-set-A（已移植）**：`blast-radius-check.cjs` | —（本 Sprint 完成） |
    | `block-source-edit` | L1 deny | **H-set-A（已移植）**：`block-source-edit.cjs --role producer\|orchestrator` | — |
    | `block-source-edit-qa` | L1 deny | **H-set-A（已移植）**：`block-source-edit-qa.cjs` | — |
    | `block-dev-authority-edit` | L1 deny | **H-set-A（已移植）**：`block-dev-authority-edit.cjs` | — |
    | `validate-handoff` | L2 trust | H-set-B（**未移植**，仍 `pwsh`） | Copilot 侧深度部分（worktree 登记 / `plan_snapshot_sha` / `l2_gate_manifest_sha256` / stash / reverify marker）仍在 release 判据中 |
    | `validate-qa-signoff` | L2 trust | H-set-B（**未移植**，仍 `pwsh`） | 与 `qa-freshness-check` + `cleanup-qa-session` **同批**：① payload 归一化层通过 LG15；② `docs/.kixpower-qa-session.json` 机制仍在用（三者共享 marker 语义，分批 = 只写不读/只读不写） |
    | `qa-freshness-check` | L2 trust（marker 写入侧） | H-set-B（**未移植**，仍 `pwsh`） | 同上（必须同批） |
    | `cleanup-qa-session` | L3 cleanup | H-set-B（**未移植**，仍 `pwsh`） | 同上（必须同批） |
    | `auto-update-progress` | L3 remind（fail-open） | H-set-B（**未移植**，仍 `pwsh`） | 出现 **≥2 次**「Dev 完成编辑但 `progress.md` 未同步」实例 |
    | `pre-commit-lint-check` | L3 remind（fail-open，`:7` 自述） | H-set-B（**未移植**，仍 `pwsh`） | Copilot 侧 lint 覆盖成为 `release_eligible` 判据；或出现 **≥1 次**「提交未过 lint 且 CI 未拦」实例 |
  counts: H-set-A = 4（1138 行源）/ H-set-B = 6（991 行源）= 10
  not_claimed: 未移植的 6 条在**无 pwsh 宿主上不触发**（spawn 失败；`hook spawn 失败 = deny 还是 ignore` 未取证 → OQ8）⇒ **不是**已生效门禁，不得据此声称 L2/QA 信任链受保护
- tag: installer-failclosed
  value: >-
    **双向实测（LG16 / MG8）**。① 正向：`install.sh` 真装进临时 `COPILOT_HOME`（`VSCODE_*` 全部重定向进临时目录，不碰用户真实 VS Code 面）→ exit 0、
    `grep -r '{{' <tmp>/agents` = **0 行**、10 条 node 形式 hook 命令各自指向**安装目录内真实存在**的 `.cjs`、launcher `node` 可解析。
    ② 负向-残留：把 `{{KIX_RESIDUE_PROBE}}` 注入 fixture 的一个 agent 文件 → exit **1** + `KIX-INSTALLER-RESIDUE` + 指出文件（且 dry-run 不落盘）。
    ③ 空作用域：本 bundle 0 个 `.sh` → 输出 **`skip: chmod +x (0 .sh files)`**，且无任何 `ok` 级 chmod 播报（原实现无条件 `ok`）。
    ④ 负向-node（orchestrator 核验补充 #2）：PATH 无 node → exit 1 + `KIX-INSTALLER-NO-NODE`；node v18.4.0 stub → 同；`--dry-run` 同样判定。
    **MG8**：`grep -c 'HOOK_LAUNCHER\|HOOK_EXT' install.sh install.ps1` = **0 / 0**（原 4 / 4，含注释行同批清理）；
    `grep -c 'node "{{COPILOT_HOME}}/skills/kixpower/hooks/' agents/*.agent.md` = **8 行**（producer 的 4 命令单行数组按 1 行计）= **10 个声明**（blast-radius ×5、block-dev-authority-edit ×2、block-source-edit ×2、block-source-edit-qa ×1）= **4 个 distinct hook**；每个 `<name>.cjs` 在 `skills/kixpower/hooks/` 下存在（LG16 用例内断言）。
  limitation: **`install.ps1` 本地无 pwsh → 只做静态判据**（标记齐备 + 0 旧占位符 + 2 处 node 判定调用点且晚于拷贝）；可执行验证归 **CG5**（CI windows smoke + 注入哨兵）→ 残留不确定性如实登记，不记 pass。
- tag: LG16-ext
  value: >-
    **对 plan §16 LG16 的口径扩展（Dev 主动登记，未擅自改 plan）**：plan 的 LG16 只写了 ①②③；
    本层按 orchestrator 核验补充 #2 追加两条判据并写进 `scripts/copilot-installer.test.js`（因此 LG16 用例数 = 7 而非 3）：
    **④ 宿主 node 缺失 / 版本 < 20.16 ⇒ exit ≠ 0 且含 `KIX-INSTALLER-NO-NODE`**（方案 B 把 `node` 变成 Copilot 侧 hook 与 trust-chain 的新硬前置，旧 installer 对 node 零探测 = LL-8 换了个二进制重演；判定在 pre-flight 与拷贝后各一次，`--dry-run` 同样生效）；
    **⑤ 两个 installer 静态对称**（同一组失败关闭标记 + 旧占位符 token 0 命中 + 两次 node 判定调用点位置）——这是 `install.ps1` 在本机的**唯一**可验证通道。
  needs: QA/L2 在 LG16 判定时按 5 条判据（非 plan 的 3 条）复核；若认为 ④⑤ 超出 T7 范围，按 §16 变更流程回退，不计入 Dev 自证。
- tag: T4-evidence
  value: `npm run test:installer` = **32 tests / 32 pass / 0 fail / 0 skip**（LG1 = 25 + N，N=7 实测）；`scripts/sync-dsh-preset.test.js` 5 条用例由「无 pwsh ⇒ SKIP」改为真跑（win32 2 条平台型 skip 保留）；`npm run test:consistency` exit 0 且新增 11 组三面镜像 + `dsh/preset-classic` 语法守护；ps1-parity 新增 2 条 sync fixture（dry-run in-sync / add-one），Node 半边已本机手工复核（空行 + 汇总行 + 单条 Added，exit 0）
- tag: T7-evidence
  value: 见 `installer-failclosed:`（LG16 双向 + MG8 两问）；调用面：root agents 10 处命令 → `node "<COPILOT_HOME>/skills/kixpower/hooks/<name>.cjs"`（orchestrator 保留 `--role orchestrator`）
- tag: T8-evidence
  value: `skills/kixpower/hooks/README.md` 3 副本 md5 = 1 个取值；含宿主状态表（10 行，逐行带 DSH 等价物行号）、H-set-B promotion 判据、`deprecated`（canonical `.cjs` / `.ps1` 参照实现）与「未移植 hook 在无 pwsh 宿主上不触发」的显式说明；root agents 追加 **10 处**宿主能力条件注记（只追加：命令、声明数 10/10、frontmatter 的 `---` 与 contract 解析器读出的 command 行数均未变）
- tag: T9-evidence
  value: 反向控制 `ls skills/kixpower/hooks/*.ps1 | wc -l` = **10**（三面 30 文件零改动，md5 与 HEAD 一致）；删除判据四条与可回滚性论证落在 README §3 与 plan §13.4
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
- at: 2026-09-22
  stage: producer_replanning
  stage_signal: 用户架构决策（方案 B：单一引擎，hooks 与 trust-chain 统一用 Node）+ 新发现缺陷（installer silent failure）
  actor: kixpower-producer (Remy)
  artifacts:
    - docs/sprint-2/plan.md（§12 ADR-S2-1 / §13 T6–T9 / §14 DAG v2 / §15 sizing v2 / §16 gates v2 / §17–§19）
    - docs/sprint-2/progress.md（本文件）
    - PROJECT_BRIEF.md §8 / §11（追加）
    - .kixpower/memory/repo/lessons-learned.md（LL-8 / LL-9 追加）
    - .kixpower/memory/repo/harness-backlog.md（HB-7 追加，status: candidate）
  note: >-
    **未编辑任何源码**（Producer 只写文档；WIP 由 Dev 继续）。
    ① ADR-S2-1：方案 B 采纳；方案 A（双份 shell 实现）与 C（继续依赖 pwsh）逐条否证；缺陷 D-1 的 6 条证据（F11–F14）逐行复核。
    ② 新增 4 个任务 T6–T9（= H-A..H-D）；覆盖裁决 **H-set-A = 4 个 deny 类 hook（blast-radius-check / block-source-edit /
    block-source-edit-qa / block-dev-authority-edit）**，**H-set-B = 6 个登记 Sprint 3（判据逐条）**；`hooks/*.ps1` **保留 + 标记 deprecated**（不删）。
    ③ DAG v2：δ 2→3、ω 4→7、γ 0.34→0.41；新增边 `T4 ← T6`；分层 `[T1,T5] / [T2,T3,T6] / [T4,T7,T8,T9]`。
    ④ commit 预算：**公式值 9 与绑定值 6 并列输出**（min(公式, 环境硬约束 1h/10-commit 与用户 ≤6)）；
    预计 5（C1 已用 + C2 规划 + C3/C4 两层 + C5 收尾），余量 1；**每 DAG 层合并 1 commit 为硬要求**。
    ⑤ 等价性取证 v2：E1 移交 CG4（CI），本地永久 unavailable → LG10 移出 required（否则 L2 结构性不可达）；
    新锚点 = 既有 JS 测试网（E0）+ characterization（E2）+ mutation probe；**禁止**把 characterization 绿写成「与原 ps1 等价」。
    ⑥ 新增开放问题 OQ8–OQ13；新增候选 N8–N11；Evals 追加 HB-7（candidate，applies_to_sprints ">=3"）。
  l2_manifest: null
```

- at: 2026-09-22
  stage: dev_layer2
  stage_signal: T2 + T3 + T6 完成（层 2 = DAG v2 第 2 层；每层 1 个 commit）
  actor: kixpower-dev (Nova/Sage/Milo)
  artifacts:
    - skills/kixpower/scripts/validate-memory-backlog.cjs（+2 副本；WIP 收口）
    - skills/kixpower/scripts/verification-fidelity-check.cjs（+2 副本；WIP 收口）
    - skills/kixpower/hooks/lib/kix-verdict.cjs（+2 副本；新增单一 hook 引擎 core）
    - skills/kixpower/hooks/{blast-radius-check,block-source-edit,block-source-edit-qa,block-dev-authority-edit}.cjs（+2 副本；新增薄 CLI 入口）
    - skills/kixpower/tests/hook-engine.test.js（+2 副本；LG15 证据网）
    - skills/kixpower/tests/{trust-chain,ps1-parity}.test.js（WIP 收口 + E3 断言按 §16.5 v2 修订）
    - prompts/kixpower-new.prompt.md（+2 副本）、skills/kixpower/USAGE_MANUAL.md（+2 副本）、agents/kixpower-producer.agent.md
    - .github/workflows/ci.yml（E1 三态独立 step）
    - docs/sprint-2/drift-check.md（T3 首次真实运行输出追加）
  gates:
    - "LG9 = 23/23 pass（exit 0）"
    - "LG11 = exit 0（ungated 0%）"
    - "LG12 = exit 0（record_count: 7）"
    - "LG15 = 44/44 pass / 0 fail / 0 skip（含 mutation probe 自证红）"
    - "LG10 = unavailable（无 pwsh；E1 移交 CG4）"
    - "npm run test:installer = 25/20 pass/0 fail/5 skip（T4 未完成，skip 归零待层 3）"
    - "npm run test:consistency = exit 0"
  commit: >-
    层 2 单 commit（sha 由下一个 commit 的 Trace Log 回填 —— 本层 commit 无法包含自身 sha，
    且 amend 被硬规则禁止）。commit_budget 消耗：C2=1479a35（规划文档）+ 本层 1 个。
  note: >-
    T6 采用既定 ③ 案（单一 core + 同源断言，不做跨发行面 require）；`kix-guards.js` 4 副本零改动。
    载荷三态（可识别-放行 / 可识别-命中 / **形态无法识别 → fail-closed + `KIX-HOOK-UNKNOWN-PAYLOAD`**）按 orchestrator 核验补充实现，
    并含「只有元数据字段 ⇒ 非 unknown」的反向控制。真实 VS Code 载荷 schema **未取证**（OQ9，文档级证据）。
  l2_manifest: null
- at: 2026-09-22
  stage: dev_layer2_selfcheck
  stage_signal: 层 2 提交前自检
  actor: kixpower-dev (Nova/Sage/Milo)
  findings:
    - "同源抽取器首版缺陷（常量初始化无括号时未收口 → 吞掉后续函数体）：已在生成脚本内修正并加断言，产物经 `node --check` + 逐字比对复核；**未进入任何 commit**"
    - "mutation probe 首版假绿：子进程继承父测试进程环境 → 孙进程 `node --test` 直接 0 退出；改最小环境后子套件 16 个 not ok"
  l2_manifest: null
- at: 2026-09-22
  stage: dev_layer3
  stage_signal: T4 + T7 + T8 + T9 完成（层 3 = DAG v2 第 3 层；每层 1 个 commit）
  actor: kixpower-dev (Nova/Sage/Milo)
  artifacts:
    - scripts/sync-dsh-preset.cjs（T4 收口）+ scripts/sync-dsh-preset.test.js（Node 化：5 skip → 0）
    - scripts/copilot-installer.test.js（新增；LG16 双向证据网）
    - dsh/preset/plugins/consistency-lib.cjs（+3 副本：SPRINT2_NODE_ARTIFACTS 11 组三面镜像 + `dsh/preset-classic` 语法守护）
    - install.sh、install.ps1（占位符层删除 + node 前置 + 残留 fail-closed + 空作用域 skip）
    - package.json（仅 `test:installer` 参数）
    - agents/*.agent.md ×5（H-set-A 10 处 → node；H-set-B 6 条 10 处宿主能力条件注记）
    - skills/kixpower/hooks/README.md（+2 副本）
    - skills/kixpower/tests/ps1-parity.test.js（+2 副本；T4 的 sync dry-run fixtures）
    - docs/sprint-2/progress.md（本文件：任务表 + 追踪行 + 缺陷/风险）
  gates:
    - "LG1 = 32 tests / 32 pass / 0 fail / 0 skip（25 + N，N=7 实测）"
    - "LG16 = 7 tests / 7 pass / 0 fail / 0 skip（双向 5 条判据，见 `LG16-ext:`）"
    - "LG2 = exit 0（新增 11 组镜像登记 + 修复 classic 面语法盲区：37 文件）"
    - "LG9 / LG11 / LG12 / LG15 复跑 = 全绿（层 2 不变）"
    - "LG10 = unavailable（无 pwsh；E1 移交 CG4；三态退出码映射在 CI step）"
  commit: >-
    层 3 单 commit（sha 由 C5 收尾层回填；本层 commit 无法包含自身 sha，amend 被硬规则禁止）。
    commit_budget：C1 affc9c7 + C2 1479a35 + C3 27fe7f6 + 本层 = 5/6，C5 预留 1。
  note: >-
    T8 的 6 条未移植声明**只追加注记**（未改命令、未删声明、未动 DSH 面副本）；T9 的 30 个 `.ps1` 零改动。
    T7 的两个 installer 改动面**仅限**失败关闭与占位符层（未动资产策略/拷贝语义/卸载路径）。
    `install.ps1` 的可执行验证归 CG5（本地无 pwsh）——本地只有静态判据，属**残留不确定性**，不记 pass。
  l2_manifest: null
- at: 2026-09-22
  stage: l2
  stage_signal: L2 全量 required local_gate 复跑（**orchestrator 独立执行，非采信 Dev 自报计数**）
  actor: kixpower-orchestrator
  artifacts:
    - /tmp/kix-l2-s2.sh（13 gate runner + 计数抽取，前台复跑）
    - /tmp/kix-l2-s2-manifest.cjs（**canonical 实现**产出 manifest 凭据，非 Sprint 1 临时脚本）
  gates:
    - "13/13 required local_gate exit 0 @ 42d3c7efdd1dfcdf8aba4ba933713547d83e5247"
    - "LG1 32/32/0/**0 skip**（25→32，N_copilot_installer=7；skip 5→0 = P2 硬判据达成）"
    - "LG3 24→23/0/1 · LG4 20/20 · LG5 60→59/0/1 · LG6 `npm test` exit 0 · LG7 36→35/0/1 · LG8 `en npm test` exit 0"
    - "LG9 23/23/0/0 · LG15 44/44/0/0 · LG16 7/7/0/0 · LG11 exit 0 · LG12 exit 0"
    - "LG10 = required:false（本机永久 unavailable）→ **未计入 l2_verification_passed**，符合「unavailable 不计入通过」"
  l2_manifest:
    revision: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
    digest: 5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976
    field_set: [id, type, cmd, expect, required, host_requires]
    generator: skills/kixpower/scripts/kixpower-contract.cjs
    consistency: "plan required(13) == L2 verified(13) == manifest(13)；gateManifestConflicts=[]；stash=[]；dirty=0"
  independent_finding: >-
    **[已机械证明 · 仍留 QA 证伪通道] Sprint 1 `R-1`/`U-1`/`F-3`/`HB-5` 根因定位**：Sprint 1 的冻结凭据
    `l2_gate_manifest_sha256 = 46121655…` 与 canonical 实现对同一输入（`docs/sprint-1/plan.md` +
    `l2_verification_passed` 8 条）产出的 `b533cf26…` **不一致**。定位与证明：
    (a) 参照实现 `kixpower-contract.ps1:10-20` 的 `Get-KixYamlScalar` 正则
    `^[ \t]*{key}:[ \t]*(?<value>[^\r\n]*)` **只取行首字面量**，故 `expect: >-` → `">-"`；
    移植版 `trust-chain.test.js:125`（`assert.equal(lg2.expect, '>-')`）与此**一致**；
    (b) **机械证明**：对 Sprint 1 实际写入的 manifest 原文（`/tmp/kixbase/l2-manifest.json` 的 `gates` 数组）
    重算 `sha256(JSON.stringify(gates))` = `46121655…`，**与记录值逐位一致** → 该凭据的 provenance
    确定为一个**折叠了 YAML 块标量**的临时实现（`/tmp/kix-l2.cjs`，Sprint 1 期无 pwsh 时 orchestrator 手写）；
    其 manifest 8/8 条 `expect` 均为折叠正文（164 字级），而 canonical 为字面 `">-"`（2 字）；
    (c) 故 QA 当时 80 组候选规范化复算不出，是**在复算一个非 canonical 的目标**（目标本身即偏离参照实现）。
    **推论**：Sprint 1 的该凭据**不是 canonical 实现的输出**，不应作为可复算凭据引用；
    「8 条门禁全绿」的**执行证据不受影响**（那是 exit code 证据，与 digest 无关）。
    **证伪条件（留给 QA）**：若能在**不折叠**块标量的前提下用 canonical 实现复算出 `46121655…`，
    或能证明 `/tmp/kixbase/l2-manifest.json` 的 `gates` 数组并非当时被哈希的原文，则本定位错误。
  l2_manifest_note: >-
    本 Sprint 的 manifest **canonical 可复算**（HB-5 scoped trial 交付），但须记两条**继承自参照实现的
    语义弱点**（非本次移植引入）：① 13 条 required gate 中 9 条 `expect` 为字面 `">-"` →
    manifest 的 `expect` 维度对折叠块**不承载期望正文**；② 所有 required gate 的 `host_requires` 均为 `[]`
    → 该维度在本 Sprint 凭据中**不承载信息**（唯一有真实宿主要求的 LG10 已移出 required）。
- at: 2026-09-22
  stage: l2_sha_backfill
  stage_signal: C4（层 3）commit sha 回填（层内无法自含，amend 被硬禁）
  actor: kixpower-producer (Remy)
  artifacts:
    - docs/sprint-2/progress.md（本文件；DAG 映射行 + 本条目）
  backfill:
    - "C4 = 42d3c7efdd1dfcdf8aba4ba933713547d83e5247（`feat(sprint-2): T4 sync-dsh-preset + T7 installer fail-closed + T8/T9 hook 台账（层 3/3）`）= `l2_verified_sha` = `qa_started_sha` = `qa_verified_sha` = 签署冻结 revision"
    - "C5（收尾层）自身 sha 不在本文件内 —— 以 `git rev-parse HEAD`（= 本文件所在提交）为准"
  l2_manifest: null
- at: 2026-09-22
  stage: qa
  stage_signal: QA 签署（CONDITIONAL）— 13/13 required gate 独立复跑 + MG1–MG10 + 15 项负向注入
  actor: kixpower-qa (Ivy)
  artifacts:
    - docs/qa/qa-signoff-2.md（**未改动正文**；Producer 只读）
    - docs/.kixpower-qa-session.json（本地 marker，**未入库**）
  gates:
    - "status: CONDITIONAL（唯一理由 `ci_pending: true`）；`qa_started_sha == qa_verified_sha == l2_verified_sha == HEAD == 42d3c7e`"
    - "13/13 required local_gate exit 0（QA 独立复跑，非采信自报）；LG10 = required:false 且未计入通过面"
    - "qa_gate_manifest_sha256 == l2_gate_manifest_sha256 == 5f4eab16…（QA 用 canonical 实现本地复算，逐位一致）"
    - "MG1–MG10 全绿；LG16 由 QA 自建 15 项注入/控制组证明非恒真；`qa_test_changes: []`（QA 未改任何测试/fixture/源码）"
    - "ci_gate CG1/CG2/CG3/CG4/CG5 = pending（fork 无 workflow 注册、无本 SHA 的 run、未授权 push/PR）→ **不得记 pass**"
  findings: "F-1/F-2 = P2；F-3..F-7 = P3；**无 P0/P1、无 gate 失败**"
  note: >-
    QA §12 逐字结论：**「否。本 Sprint 不因本报告获得发布许可（`release_eligible` 未建立）。」**
    F-1（结论行与自身逐字输出矛盾 + 3 处传播）为 `done.md` 之前置；F-2（5 处 pwsh-only 维护调用点）交 C5 收口。
  l2_manifest: null
- at: 2026-09-22
  stage: l4
  stage_signal: L4 实践学习报告（模式计数 + 两次「主张被独立观察修正」+ 未处置强制规则）
  actor: kixpower-producer (Remy)
  artifacts:
    - docs/sprint-2/hill-climbing.md（新增）
    - .kixpower/memory/repo/lessons-learned.md（LL-10..LL-13 追加）
    - .kixpower/memory/repo/harness-backlog.md（HB-8..HB-11 追加 + 统计更新）
  patterns: "silent_failure: 2 · goal_drift: 0 · l2_failed: 0 · over_budget: 0 · claim_evidence_failure: 2"
  note: >-
    两条 claim_evidence 修正**均非推翻**而是**表述不完整/覆盖面过宽被核验收窄**：
    ① R-1 根因由「折叠 YAML 块标量」单轴细化为主张方遗漏的**双轴**（+「未剥引号」；`fold+剥引号` ≠ 冻结值）；
    ② LL-9 的覆盖面被核验收窄（`blast-radius-check.ps1` 已归一化形态 1/2/3，真实短板在 `block-*-edit` 三者的
    `if (-not $argsObj) { exit 0 }`）。**未处置的强制规则**：`>20% → 强制扩展 target_rules` 被触发（23.4%/27.8%）而未依规则处置 → 结转 Sprint 3。
  l2_manifest: null
- at: 2026-09-22
  stage: producer_closeout
  stage_signal: C5 收尾层 —— F-1/F-2/F-7 修正 + done.md + L4/memory + Brief 更新（**单 commit，docs-only**）
  actor: kixpower-producer (Remy)
  artifacts:
    - docs/sprint-2/drift-check.md（§7/§8 结论层改正 + 新增 §9 登记「>20% 规则触发未处置」+ R-5 窗口口径；**逐字工具输出块未改一字**）
    - docs/sprint-2/progress.md（F-1 三处传播改正 / F-7 两处记账 / C4 回填 / frontmatter finalize / 本 Trace Log）
    - docs/sprint-2/done.md（新增，Schema 对齐 docs/sprint-1/done.md）
    - docs/sprint-2/hill-climbing.md（新增）
    - .kixpower/memory/repo/{lessons-learned,harness-backlog}.md
    - PROJECT_BRIEF.md（§8 / §11）
    - README.md、README.en.md、dsh/README-DSH.md、dsh/preset-classic/DSH-ADAPTATION.md（**F-2 五处调用点**）
  scope_expansion: >-
    **C5 范围扩张（由 orchestrator 依据 QA F-2 授权）**：上述 4 个文档的 **5 处** pwsh-only 维护调用点
    （`dsh/README-DSH.md:31`/`:41`、`README.md:72`、`README.en.md:72`、`dsh/preset-classic/DSH-ADAPTATION.md:306`）
    **不在 plan 原申报的 C5 范围内**（plan §C5 = done/hill-climbing/qa-signoff/L2 字段）。**docs-only，不影响 `42d3c7e` 的 L2/QA 签署绑定**。
  mg2_gap: >-
    **MG2 检索面收窄问题（F-2 附带）**：MG2 只覆盖 `agents/` 目录（`grep -rn "^hooks:\|\.ps1" dsh/preset-classic/agents en/preset-classic-en/agents`），
    故 `README*.md` / `dsh/README-DSH.md` / `DSH-ADAPTATION.md` 的 pwsh-only 指令**从来不在任何 gate 的检索面内** —— 这正是 F-2 能存活到 QA 期的机制原因。
    修复方向（登记 Sprint 3，见 HB-8）：把「维护调用点」纳入机械检索面（如 `sync-dsh-preset\.ps1` 的 docs 全局 0 命中判据）。
    本层只改 5 处；**残留**：`dsh/README-DSH.md:57-59`（日常同步三例）、`dsh/preset-classic/PLUGINIZATION-ROADMAP.md:172`、
    `scripts/context-budget/README.md:74`、`docs/kix-general-evolution.md:333`、`CHANGELOG.md` 历史条目（**历史条目按红线不改写**）→ 见 `done.md` §5 R-7。
  docs_only_proof: >-
    **C5 变更面经机械核对为 docs-only**：`git diff --name-only 42d3c7e..HEAD` + `git status --porcelain` 中
    不含 `skills/`、`scripts/`、`agents/`、`en/`、`install.*`、`package.json`、`.github/`；
    `dsh/` 面仅 `dsh/README-DSH.md` 与 `dsh/preset-classic/DSH-ADAPTATION.md` 两个 `.md`。
    ⇒ `42d3c7e` 的 L2 记录（manifest 5f4eab16…）与 QA 签署（`qa_verified_sha` / `qa_gate_manifest_sha256`）**不失效**。
    提交后 `npm run test:consistency` 与 `npm run test:installer` 复跑仍绿（见 `finalize`）。
  l2_manifest: null
- at: 2026-09-22
  stage: finalize
  stage_signal: Sprint 2 结算（状态机 `in_progress → done`；`release_eligible: false`）
  actor: kixpower-producer (Remy)
  gates:
    - "`status: done`；`completed_tasks: 9` / `total_tasks: 9` / `blocked_tasks: 0`"
    - "`final_head: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247`（签署冻结 evidence revision）；`qa_status: CONDITIONAL`"
    - "`commits_used: 5`（C1 affc9c7 / C2 1479a35 / C3 27fe7f6 / C4 42d3c7e / C5 = 本层）；`derived_commit_budget: 6` → **`over_budget: 0`**"
    - "`ci_pending: true`；CG1/CG2/CG3/CG4/CG5 全 pending（R4 open，未授权 push/PR）"
  note: >-
    **档位**：`done` + `release_eligible: false` + `ci_pending: true`（沿用 Sprint 1 的裁决口径，见 `done.md` §8）。
    QA 的 `CONDITIONAL` 判定与 §12「本 Sprint 不因本报告获得发布许可」在 `done.md` 中**逐字保留**。
    Sprint 3 入口：F-3/F-4/F-5/F-6 登记项 + H-set-B 6 个 hook（N9）+ `>20%` 规则的**可判定窗口复核**（drift-check §9）+ HB-8..HB-11。
  l2_manifest: null
## 阻塞与风险（实时）

| # | 项 | 级别 | 当前处置 |
|---|---|---|---|
| R4（继承 Sprint 1） | fork 无 workflow 注册 + 未授权 push/PR → CG1/CG2/CG3 不可达 | 高（`release_eligible` 唯一开口） | 记 `ci_pending: true`；不得由 agent 自行 push/PR。**v2 追加**：CG4（E1 差分）与 CG5（`install.ps1` smoke）同样受此约束 → 等价性最强通道与 installer 唯一可执行验证通道**在时间上不可达**（OQ12） |
| OQ2（已闭合） | pwsh oracle 安装是否被授权 | — | **已闭合：用户永久否决**（含一次性 oracle）→ 按 plan §16.2 v2 执行；本地 LG10 永久 `unavailable`，E1 移交 CG4 |
| 环境级硬约束 | `kix-guards` blast radius：**1 小时窗口内 10 个 commit 硬上限（含 amend）**，Sprint 1 已因此被拦一次（`ef6a485`） | 高 | plan §15 `realized_check`：**每 DAG 层合并为 1 个 commit** 为硬要求（同层节点禁止拆 commit）；**绑定预算 6**、预计 5、余量 1；窗口耗尽则记 `blocked` 转 `/kixpower-continue` |
| **D-1（本次新增）** | installer 占位符契约空洞 + 失败不报错（macOS/Linux hooks 永不触发而报成功） | **高**（安全边界静默失效） | 修复面 = T7（INV-H1/INV-H3、LG16、CG5、MG8）；经验项 LL-8；eval HB-7（candidate） |
| **D-2（本次新增）** | hook 输入契约失真（旧 `tool_name` schema vs 真实 `toolCalls[]`） | 中高 | 修复面 = T6（payload 归一化 + LG15 双 schema 用例）；取证 = OQ9 |
| **OQ8（本次新增）** | Copilot 对 hook **spawn 失败**是 `deny` 还是 `ignore`（未取证） | 中高（若为 deny → 无 pwsh 宿主上未移植的 6 条 `pwsh` 声明会阻塞全部工具调用） | 需真实 Copilot 会话取证；**falsifier 已预置**：若 deny → 立即移植或移除未移植声明（plan §13.0 末段） |
| **OQ13（本次新增）** | `warn_threshold = δ*3 + bug_reserve = 10 == hard_cap` → 预警通道结构性不可达（与 Sprint 1 OQ9 同型） | 中（失去早期预警） | 本 Sprint 以「≤6 环境硬约束」代替预警：跨过 5 个 commit 即人工记预警；公式修订留 N6 |
| **F-1（P2，C5 已修）** | `drift-check.md` §8 结论行与自身逐字输出矛盾 + `progress.md` 3 处传播「`ungated: 0 (0%)` → PASS」 | 中（结论无证据支撑；**不阻塞 gate**：LG11 exit 0 已复现） | **C5 已改实际读数**（§8 块 `15 (23.4%)`；QA @`42d3c7e` = `22 (27.8%)`）+ 新增 `drift-check.md` §9 登记「>20% 规则**触发且未处置**」+ R-5 窗口口径；逐字块未改 |
| **F-2（P2，C5 已修 5/8）** | 4 个文档 5 处 pwsh-only 维护调用点（无 pwsh 宿主上维护路径结构性不可执行） | 中（与 plan 论证 T2/T3 必要性的缺陷同类） | **C5 已改 5 处**（授权范围）；**残留**：`dsh/README-DSH.md:57-59` + 3 处历史/约定文档 + `CHANGELOG.md` 历史条目（红线不改）→ 见 `done.md` R-7 / HB-8 |
| **`>20%` 强制规则（未处置）** | verification-fidelity 报 `HIGH_RISK`（23.4% / 27.8% > 20%）⇒ 按 `kixpower-producer.agent.md` §核心职责 6 应**强制扩展** `target_rules` | 中高（规则被触发而无处置 = 门禁缺口） | 如实登记为「**触发且未按规则处置**」；Sprint 2 的目标集是「覆盖优先」的事后巧合，**不是合规**；**结转 Sprint 3**（以 `--prev-sprint 2` 可判定窗口复核）→ `drift-check.md` §9 / `hill-climbing.md` §4 |

> **预算预警登记位**：`commit_budget_warning`（跨过 5 个 commit 时由 orchestrator 写入；`over_budget` 于收尾写入，**禁止事后回改 plan §15**）。
