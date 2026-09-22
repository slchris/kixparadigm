---
sprint: 2
sprint_name: 宿主平价（host parity：无 pwsh 宿主一等公民）
qa_agent: Ivy (kixpower-qa)
signed_at: 2026-09-22
branch: feature/sprint-2-node-first-host-parity
qa_started_sha: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
qa_verified_sha: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
l2_verified_sha: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
l2_gate_manifest_sha256: 5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976
qa_gate_manifest_sha256: 5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976
qa_gate_manifest_recompute: reproduced   # canonical 实现（kixpower-contract.cjs）本地复算，逐位一致
qa_test_changes: []                      # QA 未新增/修改任何测试、fixture、测试脚本或测试配置（见 §1 第 8 行 + §10 纪律披露）
ci_pending: true
status: CONDITIONAL
qa_status: CONDITIONAL                    # 与 status 同值（供只读 qa_status 的解析器）
l2_stash_refs_expected: []
l2_gate_manifest_source: docs/sprint-2/plan.md §7 + §16（@ 42d3c7e；field_set = {id,type,cmd,expect,required,host_requires}）
---

# QA Sign-off — Sprint 2（宿主平价：hooks 与 trust-chain 单一 Node 引擎）

> **状态：`CONDITIONAL`**（唯一理由 = `ci_gate` pending；`ci_pending: true`）。
> 依据：**13/13 required local_gate 由 QA 在冻结 revision 上独立复跑，全部 exit 0 且计数与 L2 记录逐项一致** + MG1–MG10 全部 ✅（QA 机械执行）
> + LG16 双向判据由 QA 自建 **15 项负向注入/控制组**确证**非恒真** + hooks 三态语义与 `.ps1` 形态 1/2/3 归一化语义经 QA 独立探针核对
> + `l2_gate_manifest_sha256` **本地 canonical 可复算**（Sprint 1 的不可复算项在本 Sprint 闭合）。
> **本报告不含 PASS 档位**：CI（CG1/CG2/CG4/CG5）未取证前不构成发布证据。**本 Sprint 不因本报告获得发布许可**（见 §11）。

---

## 1. Revision 与信任链绑定（QA 实测）

| # | 检查 | 期望 | 实测 | 结论 |
|---|---|---|---|---|
| 1 | `qa_started_sha == HEAD` | 同一 40 位 SHA | `git rev-parse HEAD` = `42d3c7efdd1dfcdf8aba4ba933713547d83e5247` | ✅ |
| 2 | `l2_verified_sha == HEAD` | 同一 revision | session marker + `progress.md:73` 均为 `42d3c7e…` == HEAD | ✅ |
| 3 | session marker 快照 | 记录同一 SHA / 同一 manifest | `docs/.kixpower-qa-session.json`：`l2_verified_sha`/`qa_started_sha` = `42d3c7e…`、`l2_stash_refs: []`、`l2_verified_gates` 13 条（**无 LG10**）（QA 未编辑该文件）| ✅ |
| 4 | `l2_stash_refs == 当前 stash 集合` | 相等 | `git stash list` 空（0 行）；marker `[]` | ✅ |
| 5 | required local_gate 集合 | plan == L2 == manifest 三方一致 | QA 用 canonical 实现解析 plan §7+§16 → 13 条 `[LG1,LG2,LG3,LG4,LG5,LG6,LG7,LG8,LG9,LG11,LG12,LG15,LG16]` == `l2_verification_passed`（`progress.md:66`）== marker；`gateManifestConflicts = []` | ✅ |
| 6 | manifest 字节级复算 | == `5f4eab16…` | `requiredLocalGates(plan)` + `gateManifestJson(…,{fields:MANIFEST_FIELDS_WITH_HOST})` + `sha256Hex` → `5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976`（**逐位一致**）| ✅ |
| 7 | LG10 不在通过面 | `required:false` 且不入 `l2_verification_passed` | plan 侧 `required: false` + `host_requires: [pwsh]`；`l2_verification_passed` 不含 LG10 | ✅ |
| 8 | L2 后无可验证 artifact 变更 | 工作树唯一未提交项 = `docs/sprint-2/progress.md` | `git status --porcelain --untracked-files=all` → `M docs/sprint-2/progress.md` + `?? docs/.kixpower-current-sprint` + `?? docs/.kixpower-qa-session.json`；`git diff --name-only HEAD` = 仅 progress.md；**无任何 `*.test.js`/源码/fixture/installer 改动** | ✅ |

> **声明**：`progress.md` 的 L2 字段与 Trace Log `stage: l2` 是**未提交的工作树修改**（Orchestrator 依 §L2 写入），并在 QA 会话期间被 Orchestrator **追加**过（R-1 的机械证明段）。
> QA 逐行读取核对：追加内容只落在 Trace Log 与 `l2_manifest_note`，**`l2_verification_passed` / `l2_verified_sha` / `l2_gate_manifest_sha256` 三个绑定值未变**。
> 该文件不是任何被 L2 验证的 artifact，且 QA **未提交、未修改、未 stash** 它（硬约束遵守）。登记为观察项 F-7。

## 2. 客观门禁结果

> **执行边界**：与 Sprint 1 不同，本轮 QA **重跑了全部 13 条 required local_gate**（不是采信自报计数），外加全部 `required:false` gate。
> 唯一例外：LG3/LG4/LG5/LG7 作为链路内段由 `npm test` / `cd en && npm test` 覆盖（其段计数单独抽取核对），LG13/LG14 一并实跑。
> 全部命令的命令行与 L2/plan 的 `cmd` **逐字相同**，无自创判据。

| gate | cmd（逐字）| QA 实测计数 | exit | 与 L2 记录 |
|---|---|---|---|---|
| **LG1** | `npm run test:installer` | **32 tests → 32 pass / 0 fail / 0 skip** | 0 | ✅ 一致（25→32，N=7；skip 5→**0**，P2 硬判据达成）|
| **LG2** | `npm run test:consistency` | `CONSISTENCY OK`；`dsh/preset: 35` · `dsh/preset-classic: 37` · `en/preset-classic-en: 37` · `scripts: 18` JS/CJS/MJS syntax OK；11 组三面字节一致 | 0 | ✅ |
| **LG3** | `npm run test:pressures` | 24 tests → 23 pass / 0 fail / **1 skip** | 0（链路内）| ✅ |
| **LG4** | `npm run test:vision` | 20 / 20 / 0 / 0 | 0（链路内）| ✅ |
| **LG5** | `cd dsh/preset/plugins && node --test` | 60 tests → 59 pass / 0 fail / **1 skip** | 0（链路内）| ✅ |
| **LG6** | `npm test` | 全链 exit 0（32/32 → CONSISTENCY OK → 24→23/0/1 → 20/20 → 60→59/0/1）| 0 | ✅ |
| **LG7** | `cd en/preset-classic-en/plugins && node --test` | 36 tests → 35 pass / 0 fail / **1 skip** | 0（链路内）| ✅ |
| **LG8** | `cd en && npm test` | 12/12 → CONSISTENCY OK → 20/20 → 36→35/0/1 | 0 | ✅ |
| **LG9** | `node --test skills/kixpower/tests/trust-chain.test.js` | **23 / 23 / 0 / 0** | 0 | ✅ |
| **LG11** | `node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 1` | exit 0；含 `[Verification Fidelity]` + `fidelity_v5:` 段；`ungated: 22 (27.8%)`、`PASS` **不出现**（>0 ⇒ 无 PASS 行，语义正确）| 0 | ✅ 读数一致（27.8）；但**记录结论行有误** → F-1 |
| **LG12** | `node skills/kixpower/scripts/validate-memory-backlog.cjs --project-root .` | `memory_backlog: valid` / `record_count: 7` / `legacy_unstructured_records: 0` | 0 | ✅（7 而非规划期 6，与 HB-7 追加一致）|
| **LG15** | `node --test skills/kixpower/tests/hook-engine.test.js` | **44 / 44 / 0 / 0** | 0 | ✅ |
| **LG16** | `node --test scripts/copilot-installer.test.js` | **7 / 7 / 0 / 0** + QA 自建 15 项注入/控制组（§4）| 0 | ✅ |

**`required:false`（不入通过面，逐条留痕）**

| gate | 实测 | 结论 |
|---|---|---|
| **LG10** `node --test skills/kixpower/tests/ps1-parity.test.js` | 8 tests → **1 pass / 7 fail / 0 skip**，exit **1**，状态行 `parity: unavailable — probe ENOENT: pwsh not found on PATH` | ✅ **记 `unavailable`**：既非 skip、亦非 pass，且**未**计入 `l2_verification_passed`（§16.2 禁令 ② 的机械判据）|
| LG13 `npm run verify:guards` | exit 0 | ✅（环境相关，不作本 Sprint 判据）|
| LG14 `node --test scripts/install-lib.test.js` | 20 / 20 / 0 / 0，exit 0 | ✅ |

**CI gate（QA 自证，非转述）**：`gh workflow list -R slchris/kixparadigm` → **空**（fork 无 workflow 注册）；`gh run list -R slchris/kixparadigm` → **空**；
`gh run list -R olicesx/kixparadigm --limit 5 --json headSha,status,conclusion,workflowName` → `5376d6c…(failure)`、`df3e590…(failure)`、`c3c31eb…(success, baseline)`、`fc52b2f…(success)` —— **无 `42d3c7e` 的 run**（`grep -c` = 0）；
`gh pr list`（fork）空、无上游 tracking 分支、13 个 commit 未 push ⇒ **CG1/CG2/CG3/CG4/CG5 全部结构性 pending**（R4 开放，用户未授权 push/PR）。**不得记 pass**。

## 3. manual_gate 明细（MG1–MG10，QA 机械执行）

| MG | 判据（plan 原义）| QA 实测 | 结论 |
|---|---|---|---|
| MG1 | 产品代码零 `pwsh` 引用 | `grep -rn pwsh skills/kixpower/scripts/*.cjs scripts/sync-dsh-preset.cjs \| wc -l` = **0**；并列：`grep -c ps1-parity package.json` = **0**；`.cjs` 中的 `pwsh` spawn = **0**（`verification-fidelity-check.cjs` 只 spawn `git`）| ✅ |
| MG2 | DSH 面向 agent 面死 hooks/`.ps1` = 0，且文件未删 | `grep -rn "^hooks:\|\.ps1" dsh/preset-classic/agents en/preset-classic-en/agents \| wc -l` = **0**；核对侧：`grep -c "^hooks:" agents/*.agent.md` = 5（kixparadigm/dev/orchestrator/producer/qa；reviewer=0）、`ls skills/kixpower/hooks/*.ps1 \| wc -l` = **10** | ✅ |
| MG3 | `R1-digest-recompute` 行存在 | `progress.md` 命中 2 处；取值 `undetermined` + `missing_evidence` 已登记（未伪称已复算）| ✅ |
| MG4 | `U2-parity` 三足 | 命中 4 处；QA **独立重放**三 fixture（仓库 backlog / HB-1 六字段+`status: observed` / 缺字段+`status: bogus`）→ 新实现（`--project-root`）与 Sprint 1 即兴移植（位置参数）**stdout 逐字节相同 + exit 相同（0/2/2）** | ✅（字节数记录有误 → F-7）|
| MG5 | 3 副本 `.cjs` md5 同值 | `kixpower-contract.cjs` ×3 = `fb457d327f0ad81a161bfb1ed7510196`；11 组 SPRINT2 镜像组 ×3 副本各 1 个取值（QA 逐组 md5）| ✅ |
| MG6 | `ps1-drift` 行存在 | 命中 2 处 | ✅ |
| MG7 | `host_requires` / `unavailable` 语义 3 副本措辞一致 | 3 份 `TEAM_CONVENTIONS.md` 各 4 处命中；「required gate 为 `unavailable` 时不得计入 `l2_verification_passed`」句 3 份各 1 处 | ✅ |
| MG8 | 占位符层 0 命中 + 10 条 node 声明 | `grep -c 'HOOK_LAUNCHER\|HOOK_EXT' install.sh install.ps1` = **0 / 0**；`grep -o 'node "{{COPILOT_HOME}}/skills/kixpower/hooks/*.cjs"' agents/*.agent.md \| wc -l` = **10**（8 行 / 4 distinct hook / 4 个入口文件均存在）| ✅ |
| MG9 | `hooks-coverage:` = 10 行表 | 逐行读出 10 条 hook（4 已移植 + 6 未移植），每条含类别 / 本 Sprint 取值 / promotion 判据 | ✅ |
| MG10 | README 3 副本 + `deprecated` + 未移植不触发 + `.ps1` 未删 | `md5 -q` 三副本 = `ea8ce56f5565e2a8344d1e746a58e54d`（1 个取值）；README `:10` 明写「**不得**把本表读成与 `.ps1` 行为等价」、`:47` `deprecated`、§4 未移植 hook 在无 pwsh 宿主不触发；`.ps1` 计数 10；三面 30 文件零改动 | ✅ |

**T8「只追加」机械核对**：`git diff ef6a485..HEAD -- agents/` 中新增的 `宿主能力条件` 注记 = **10 条**（声明级）+ 1 条 producer 正文句（非 hook 注记）→ 与 T8 自述「10 处注记」一致；
10 条 `pwsh -NoProfile -File` 声明**数量未变**（`grep -o … | wc -l` = 10），`^hooks:` 计数未变（5）→ 「只追加、声明数 10/10」成立 ✅。

## 4. LG16 双向判据：QA 自建负向注入（**判据非恒真**的证明）

> QA **未改动仓库测试文件**；全部 fixture / 注入 / 控制组在 `/tmp/qa-ivy-s2/` 内构造（脚本 `lg16-inject.cjs`、`lg16-edges.cjs`）。

| # | 注入 / 控制 | 期望 | 实测 |
|---|---|---|---|
| T1 | 真装（非 dry-run）进临时 `COPILOT_HOME` | exit 0 + 装完 `agents/` 残留 `{{` = 0 + 4 个 hook `.cjs` 入口落盘 | ✅ exit 0 / residue 0 / entries true |
| T1b | 同 bundle 第二次真装（幂等）| exit 0，仍 0 残留 | ✅ |
| T2 | 注入 `{{QA_IVY_RESIDUE}}` 到 `agents/kixpower-qa.agent.md` → **真装路径**（既有测试只覆盖 dry-run）| exit ≠ 0 + `KIX-INSTALLER-RESIDUE` | ✅ exit 1 + marker |
| **T3** | **归因控制**：把残留分支唯一一处 `exit 1` 替换为 `:`（**仅 `/tmp` 副本**），同一注入 fixture 重跑 | 必须变绿 | ✅ exit 0 ⇒ T2 的非零退出**可归因于该检测器**，而非其他先存失败 |
| **T4** | **作用域控制**：`{{` 注入 `skills/`（agent 面之外）| 不得触发 | ✅ exit 0 ⇒ 判据有作用域，非「任何 `{{` 即失败」|
| T5 | PATH 白名单**无 node**（14 个工具符号链接，`missing_tools=none`）| exit ≠ 0 + `KIX-INSTALLER-NO-NODE` | ✅ exit 1 + marker |
| **T6** | **PATH 收窄控制**：同一白名单 + `node v22.14.0` stub | 必须 exit 0 | ✅ exit 0 ⇒ T5 归因于**缺 node**，而非 PATH 收窄破坏了脚本 |
| T7 | 边界扫描（QA 补测，既有测试仅 v18.4.0）| `20.15.0` 拒 / `20.16.0` 收 / `v20.16.0` 收 | ✅ exit 1 / 0 / 0（与 `engines: >=20.16.0` 精确一致）|
| T8 | 作用域 0 个 `.sh` | 输出 `skip: chmod +x (0 .sh files)` 且**无** ok 级 chmod | ✅（唯一 chmod 行 = warn 级 skip）|
| **T8b** | **分支可达性控制**：bundle 的 `skills/` 副本内放入 1 个 `.sh` | 必须走 ok 分支 | ✅ `[v] chmod +x on 1 .sh hooks/scripts` ⇒ skip 分支非唯一出路 |
| T9 | 卸载面：PATH 无 node 时执行 `--uninstall` | 不触发 NO-NODE 且清空 agents | ✅ install 6 → uninstall 0，exit 0（新前置**未污染卸载路径**；源码顺序 `install.sh:117-146` 在 pre-flight `:157` 之前）|
| T10 | 卸载后重装 | exit 0 + 残留 0 | ✅ |

**结论**：`LG16` 的四向判据（正向残留 0 / 残留注入非零 / 无 node 非零 / 0 `.sh` 为 skip）**全部由 QA 独立复现**，并有 4 组控制组证明**非恒真、可归因、有作用域**。反方视角的诚实补充见 F-3（作用域过宽）与 F-6（marker/断言强度）。

## 5. hooks 三态载荷语义与 `.ps1` 归一化保真（QA 独立探针）

**三态实测（4 个入口 × 真实 CLI 子进程 + stdin；脚本 `hook-probe.cjs`）**

| 判据 | 期望 | 实测 |
|---|---|---|
| 可识别-放行 | exit 0，stdout 空 | ✅ `{"hookEventName":"PreToolUse","cwd":"/tmp","sessionId":"s1"}`（只含元数据）→ 4/4 exit 0（**反向控制**：证明 marker 判据非恒真）|
| 可识别-命中 deny | exit 2 + `permissionDecision: deny` | ✅ 危险 SQL：blast-radius exit 2；写用户级控制平面 exit 2；QA 的 `git commit` 在 `block-source-edit-qa` exit 2（**D-4 的 `.ps1` 失效分支在 Node 侧按意图生效**）|
| **形态无法识别 → fail-closed** | exit 2 + `KIX-HOOK-UNKNOWN-PAYLOAD`（stdout **与** stderr）| ✅ 三种形态各 4/4：① `tool_name` 无 `tool_input`（旧行为 = `blast-radius-check.ps1:528` 归一化后 `$calls.Count -eq 0 → exit 0` **静默放行**，`block-source-edit.ps1:39` / `-qa.ps1:35` / `block-dev-authority-edit.ps1:40` 则 `if (-not $argsObj) { exit 0 }`）；② `toolCalls[].args` 声明为字符串但不可解析；③ 未识别工具字段（`toolInvocation`）|
| 非法 JSON | exit 2（不输出 deny JSON）| ✅ stderr `hook input 不是有效 JSON，拒绝执行`（无 marker，语义可辨）|
| 跨 schema 一致 | 形态 1/2/3 对同一 fixture ⇒ 同 exit + **逐字节同 stdout** | ✅ `2/2/2` + 逐字节相同 |
| `--role orchestrator` 变体 | 未知形态同样 fail-closed | ✅ exit 2 + marker |

**`blast-radius-check.ps1` 形态 1/2/3 归一化语义保真（逐条对照源码）**

| 语义点 | `.ps1` 证据 | `.cjs` 对应 | 判定 |
|---|---|---|---|
| 形态检测**顺序** toolCalls → toolName → tool_name | 形态 1 `:104-116`（`if ($toolCalls)` @`:106`）→ 形态 2 `:121-130`（@`:122`）→ 形态 3 `:134-141`（@`:135`）| `normalizePayload`（`kix-verdict.cjs:95-159`）| ✅ 同序 |
| 形态 1/2 的 `args` 为 **JSON 字符串** → 解析后作为 tool input | `:104-116` / `:121-130` | 同 | ✅ |
| 形态 3 `tool_input` 为对象或字符串 | `:134-141` | 同 | ✅ |
| deny 优先于 ask，`exit 2` / `exit 0` 聚合 | `:480-556` | `runHook` | ✅ |
| 空 stdin / `toolCalls: []` → allow | `:528`（`if ($calls.Count -eq 0) { exit 0 }`）| `no-tool-call` → exit 0 | ✅ |
| 崩溃 → deny（fail-closed）| `:24` 注释 | `runHook` 兜底 | ✅ |
| **`args` 解析失败** | `.ps1` 置 `$null` → 调用方 `exit 0`（**静默放行**）| 改判 `unknown` → deny + marker | ✅ **本 Sprint 的显式修正**（core 文件头 `:25-26` 登记为「已知分歧 3」）|
| commit 计数口径 | `.ps1` 用 `git reflog --format=%H`（全部条目）| `.cjs` 用 `countReflogCommits`（`%gs` 口径，`commits`/`churn` 双计）| ⚠️ 已登记分歧（core 文件头 `:17-19`「已知分歧 1」，依据 ADR-S2-1），**非静默**；属 D-3/OQ10 家族 |
| QA 侧 git 写分支 | `.ps1:53-54` 调用的 `Test-KixGitCommitCommand`/`Test-KixGitWriteCommand` 在契约文件中**嵌套于其他函数体内**（`kixpower-contract.ps1:368`/`:397`）→ 顶层作用域取不到 → CommandNotFoundException 后继续（**分支失效**）| 按意图生效（QA 的 `git commit` 被 deny，QA 探针实测 exit 2）| ✅ 已登记分歧（core 文件头 `:20-24`「已知分歧 2」）；`.ps1` 侧不改（§2「不改 `.ps1`」边界）|

> **诚实边界**：以上为**源码级语义对照 + Node 侧可执行证据**。真正的**逐字节差分对拍（E1）本地不可达**（无 pwsh）→ 按 §16.2 只能记「JS 锚点一致，差分通道 unavailable」，**不得**写作「与原 `.ps1` 等价」。

## 6. R-1 根因主张：QA 独立裁决（证伪优先）

**被裁决主张**（`progress.md` Trace Log `stage: l2` 的 `independent_finding`）：Sprint 1 的 `46121655…` 来自一个**折叠了 YAML 块标量**的临时脚本，参照/canonical 实现取行首字面量，故 canonical 复算不出。**证伪条件（主张方给出）**：① 在不折叠块标量的前提下用 canonical 复算出 `46121655…`；或 ② 证明 `/tmp/kixbase/l2-manifest.json` 的 `gates` 数组不是当时被哈希的原文。

**QA 判定：主张成立、未被证伪；但机制表述须细化为「两轴偏离」（下面的 (d)）。**

| 步 | 动作（QA 自建脚本 `/tmp/qa-ivy-s2/r1-analyze.cjs`、`r1-matrix.cjs`）| 结果 |
|---|---|---|
| a | 复算 `sha256(JSON.stringify(stored.gates))` | `46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb` = 文件内 `digest` = Sprint 1 冻结凭据 → **证伪条件 ② 不成立**（数组自洽且确为被哈希原文）|
| b | canonical 实现读同一 plan（`docs/sprint-1/plan.md`，自 `a3cdfb1` 起未改动，`git diff` 空）| 8 条 required，id/顺序一致，digest = `b533cf26…` ≠ 冻结值 |
| c | 逐字段 diff（8 条 × 5 字段）| **唯一分歧字段 = `expect`**；`id/type/cmd/required` 全等（`other-diffs=none`）；6 条 canonical 为字面 `">-"`（参照实现 `kixpower-contract.ps1:10-19` 的 `[^\r\n]*` + `.Trim('"')`，`trust-chain.test.js:125` 断言一致），Sprint 1 值为 164/166/223 字级协议正文 |
| d | **证伪尝试矩阵**（无折叠前提）| 5 组变体**全部 miss**：`b533cf26`（canonical 字面）/ `680072c9`（字面但保留引号）/ `79ae6b1d`（仅取行首）/ codepoint 排序 / 字段集变体 / 尾随换行 / pretty-print。**无任何非折叠变体命中** → **证伪条件 ① 不成立** |
| e | 折叠路径独立复刻（自写，不 spawn 临时脚本）| `fold + 不剥引号` → **`46121655…`，且与 `stored.gates` **逐字节相同**；`/tmp/kix-l2.cjs:16`（`fold = s => s.replace(/\s*\n\s*/g,' ')…`）、`:25`（expect 正则）、`:30`（`expect: fold(em[2])`）、`:36,77`（`sha256(JSON.stringify(gates))` + 落盘）与产物形状一致 |
| f | **机制细化**：`fold + 剥引号` 变体 | `f95a6163…` ≠ 冻结值 ⇒ **折叠是必要但不充分条件**：临时脚本同时**未剥除**行内引号（`LG3`/`LG4` 的 stored 值含字面双引号），而参照实现 `kixpower-contract.ps1:19` 会 `.Trim('"')` |

**裁决**：冻结凭据 `46121655…` **不是 canonical 实现的输出**（不可作为可复算凭据引用），「Sprint 1 的 8 条门禁执行证据不受影响」的推论亦成立（exit code 证据与 digest 无关）。
**对其表述的修正**：根因应写为「临时脚本的 `expect` 提取语义**双轴偏离**参照实现：① 折叠块标量 ② 未剥引号」——仅写「折叠块标量」不足以解释全部差异（f 步骤）。
**残余**：`/tmp/kixbase/l2-manifest.json` 与 `/tmp/kix-l2.cjs` 是**未入库的临时产物**，其 provenance 由「内部自洽 + 与现存活脚本逐行同构 + plan 未改动」三重佐证，非密码学锚定（见 R-4）。

## 7. §16.2 明令禁止项核查（全仓检索 Sprint 2 产物面）

| # | 禁令 | 检索方式 | 结果 |
|---|---|---|---|
| ① | 把「characterization 绿」表述为「与原 `.ps1` 等价」| `grep -rn 等价`（`docs/sprint-2/`、3 份 `hooks/README.md`、`ci.yml`、`agents/`）逐条读上下文 | ✅ **无违规**。命中项全部是「禁止/否定」语境（`hooks/README.md:10`「**不得**把本表读成与 `.ps1` 行为等价」、`progress.md:172`「本层**不**声称 ps1 侧等价」、`ci.yml:36`「禁止写成 skip/pass/已等价」）或任务名/列名（「等价性取证基座」「DSH 侧等价物」）。`kix-verdict.cjs:13-14` 显式写「E1 本地永久 unavailable → 禁止把本文件的绿表述为等价」|
| ② | 把 `unavailable` 记为 skip / pass / 「已覆盖」| `grep -rn unavailable`（progress / drift-check / ci.yml / README）逐条读上下文 | ✅ **无违规**。全部为如实登记：LG10「本机永久 unavailable，不入本清单」、三态语义说明；实测 LG10 = 1 pass/7 fail/**0 skip**、exit 1（状态行 `parity: unavailable`）|
| ③ | 用「文件已存在 / 测试绿」替代「hook 在真实宿主上生效」| `grep -rn 真实宿主\|已生效`；读 `hooks/README.md` §4、`progress.md` hook-engine-evidence | ✅ **无违规**。反向声明齐备：README §4「它们**不是**已生效的门禁」、`progress.md:286` `not_claimed`（OQ8 未取证）、`plan.md:1602` 为禁令原文 |
| ④ | LG10 = `required:false` 且不入 `l2_verification_passed` | canonical 解析 + `progress.md:66` | ✅ 满足（§1 第 7 行）|

## 8. QA 自选风险面（超出指令清单的三项独立审视）

**(A) 卸载 / 资产策略 / 幂等（`install.sh` 改动面）** — 结论：**新前置未污染卸载，幂等成立；资产策略为「目录约定式」，新产物自动随行**。
`install.sh:117-146` 的 `--uninstall` 分支在 Pre-flight（`:149-157`，`require_node_runtime "pre-flight"` 在 `:157`）**之前** `exit 0`，故无 node 亦可卸载（T9 实测：agents 6→0，无 NO-NODE）；T1b/T10 实测重装幂等、卸载后重装成功；
SKILLS 发现为 `skills/*/SKILL.md` 约定式（`:104-112`）+ 整目录 `cp -R`，故 T6 新增的 `hooks/lib/kix-verdict.cjs` 与 4 个入口**自动进入安装树**（T1 实测落盘，静态对称见 `install.ps1` `Assert-NodeRuntime` 两处调用点 `:135`/`:246`）。

**(B) `npm files` 分发面 vs 实际新增文件** — 结论：**无遗漏**。
`npm pack --dry-run --json`（root 322 文件 / en 135 文件）：`skills/kixpower/hooks/{lib/kix-verdict,blast-radius-check,block-source-edit,block-source-edit-qa,block-dev-authority-edit}.cjs`、3 个新 `.cjs` 脚本、3 个新测试文件、`hooks/README.md`、`scripts/{copilot-installer.test.js,sync-dsh-preset.cjs}`、`install.sh`/`install.ps1` **全部 SHIPPED**；`.ps1` 10 个仍随包（未删）✅。

**(C) 副本 identity 组覆盖** — 结论：**11 组三面镜像 + consistency-lib 四副本全部一致；发现 1 处未登记产物**（F-5）。
11 组 SPRINT2 产物 ×3 副本各自 1 个 md5 取值；`consistency-lib.cjs` 4 副本（preset / preset-classic / preset-null / en）= `a85788de9c1402c02221aa6a1159593a` 同值；
`dsh/preset: 35` vs `dsh/preset-classic: 37` 的差值经 QA 定位为 `skills`/`agents` symlink 不被 `walk()` 跟随（`find -L` 实测 46 vs 37，扣除 symlink 面恰为 35）→ T4 的 symlink 盲区修复**有效**（同一物理文件经 classic 面被语法解析）。
`package.json` 改动 = **仅 `test:installer` 追加一个测试文件参数**（`git diff ef6a485..HEAD -- package.json` 1 行），未新增 script、未新增依赖 ✅。

## 9. Findings（QA 独立发现，按证据门禁定级）

| ID | 级别 | 内容 | 证据 / 可复现命令 | 处置 |
|---|---|---|---|---|
| **F-1** | **P2**（证据自洽性）| **LG11 的证据记录与自身逐字输出矛盾，且「`ungated: 0 (0%)` → `PASS`」在冻结 revision 上不可复现**。`docs/sprint-2/drift-check.md` §8 的逐字输出块 = `total changed: 64 / in_scope 17 / whitelisted 32 / ungated: 15 (23.4%)`（`:185`）+ `ungated_ratio_pct: 23.4`（`:208`）+ `HIGH_RISK`（**无 PASS 行**），但§8 自己的结论行（`:214`）写「**本轮读数**：`ungated: 0 (0%)` → `PASS`」；同一口径又被写进 `progress.md:112`（T3 行「实测 `ungated: 0 (0%)` → PASS」）、`progress.md:55`（`dev_self_tests_passed`：「46 / 17 / 29 / `0 (0%)` → PASS」）与 `progress.md:266`（Trace Log `verification_fidelity.value`）——**共 3 处传播，且第 3 个读数（46/17/29）与 §8 自身的逐字块（64/17/32）亦不一致**。QA 在冻结 revision 上实跑 = `79 / 18 / 39 / 22 (27.8%)`，**无 PASS 行**，与 L2 记录 `27.8` 一致；同一工作树两次运行输出逐字节相同（确定性）。**影响**：① LG11 的**字面判据仍成立**（exit 0 + 两段存在 + 非 `baseline_degraded`）→ 不构成 gate 失败；② 但「0% → PASS」与 §7 的「>20% 强制未被触发」结论**无证据支撑**——无论按 §8 自身的 23.4% 还是 QA 的 27.8%，Sprint 1 的「>20% 未门禁 → 强制扩展 `target_rules`」规则都**被触发**，该规则的处置必须在 drift-check 里如实登记，而不能声明「未触发」 | `node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 1` → `ungated: 22 (27.8%)`；`sed -n '214p;185p;208p' docs/sprint-2/drift-check.md`（结论行 vs 逐字块）；`grep -n 'ungated: 0 (0%)' docs/sprint-2/progress.md`（3 处）；`git log --oneline ef6a485..HEAD -- docs/sprint-2/drift-check.md` → §8 由 `27fe7f6`（层 2 / T3）追加 59 行，此后未再改动 | **不阻塞本 Sprint 的 gate 结论**（LG11 exit 0 已由 QA 复现），但**必须在 C5 收尾层修正**：把 §8 结论行改为实际读数、把 3 处「0%/PASS」改为真实值并登记 >20% 规则的处置；修正前 `done.md`/`hill-climbing.md` 不得据此宣称「覆盖率 PASS」。若 Orchestrator 认为该修正属于签署前置，则本报告档位应升级为 `REVERIFY_REQUIRED`（而非 PASS）|
| **F-2** | **P2**（宿主平价未收口）| **T4 的维护调用点仍是 pwsh-only，新 `.cjs` 无任何文档入口**。`dsh/README-DSH.md:31` 与 `:41`、`README.md:72`（中）与 `README.en.md:72`（英）、以及 `dsh/preset-classic/DSH-ADAPTATION.md:306` 仍指示 `pwsh -File scripts/sync-dsh-preset.ps1 -Force`；而 `grep -rn 'sync-dsh-preset\.cjs' --include='*.md'`（除 `docs/sprint-*`）= **0 命中**。plan §3（`:113`）自己把 `dsh/README-DSH.md:41` / `README.md:72` 列为 T4 的**live 消费者入口**；C5 的申报范围（`plan.md:1539`：done/hill-climbing/qa-signoff-2/L2 字段）**不含**这些文档。**影响**：在无 pwsh 宿主（本 Sprint 的目标宿主）上，文档给出的维护路径**结构性不可执行**——与 plan 用来论证 T2/T3 必要性的同一缺陷类（`plan.md:111`「DSH 上该指令结构性不可执行」）。**非代码缺陷、非门禁失败** | `sed -n '28,45p' dsh/README-DSH.md`；`grep -n 'sync-dsh-preset' README.md README.en.md`（两处 `:72`）；`sed -n '304,308p' dsh/preset-classic/DSH-ADAPTATION.md`；`command -v pwsh` → 空 | 提交 Orchestrator：C5 或 Sprint+1 就地把 5 处调用点改为 `node scripts/sync-dsh-preset.cjs -Force`（成本 ~5 行）；建议同时纳入 MG2 的检索面（当前 MG2 只覆盖 `agents/` 目录）|
| **F-3** | P3（fail-closed 方向的边界）| **两个 installer 的残留扫描作用域不对称 + 共享 `COPILOT_HOME` 误报 + 非原子**。`install.sh:290` = `grep -rl '{{' "$COPILOT_HOME/agents"`（**全部文件**）；`install.ps1:280` = `Get-ChildItem … -Filter '*.agent.md'`（仅 agent 清单）。QA 实测：目标目录**预先存在**的第三方文件 `other-tool.agent.md` 含 `{{MY_TEMPLATE}}` → 安装器 exit 1 并指名该**与本 bundle 无关**的文件；T2 实测失败发生在拷贝之后（`partial_tree_left=true`：skills/agents 已落盘）| 探针 `lg16-edges.cjs` C1/C2/C3；`grep -n "grep -rl '{{'" install.sh`；`grep -n "Filter '\*.agent.md'" install.ps1` | 方向安全（fail-closed、指名文件、可恢复），**不阻塞**；Sprint+1 建议收窄为「只扫本 bundle 写入的文件」并在失败时提示清理/重跑（幂等已实测）|
| **F-4** | P3（需真实载荷取证）| **载荷归一化的「形态无法识别」判据存在理论敞口**。`TOOL_LIKE_KEY = /tool\|call\|command\|input\|args\|invocation\|payload\|name/i`（`kix-verdict.cjs:71`）：**`arguments` / `parameters` / `function` 均不在表内**（`args` 匹配不到 `arguments`）。实测 `{"chat":{"function":"bash","arguments":{"command":"psql -c \"DROP TABLE t\""}}}` → `blast-radius-check` **exit 0（静默放行）**；混合形态 `{"toolCalls":[], …形态3 危险调用}` 亦 exit 0（`toolCalls` 存在即短路）。`.ps1` 侧 `if ($toolCalls)` 对空数组按 PowerShell 真值语义会落入形态 3（**需 pwsh/CG4 定档**，QA 未取证）| `hook-probe.cjs` B1/B2/B3（4 个入口同源核心）| **不定级为高**：无任何证据显示真实宿主发出此类形状（OQ9 未取证 → 按「需确认」处理）。建议：① 把 `arguments`/`parameters`/`function` 加入 `TOOL_LIKE_KEY`（成本 1 行，方向 fail-closed）；② 以真实 Copilot 载荷采样作为 falsifier；③ 保持「只有元数据 ⇒ 非 unknown」的反向控制不变 |
| **F-5** | P3（镜像守护缺口）| **`skills/kixpower/hooks/README.md`（3 副本，新增产物，MG10 的证据对象）未登记进任何机器守护的 identical-set 组**：`grep -n 'README.md' dsh/preset-classic/plugins/consistency-lib.cjs` = **0 命中**；`checkMarkdownLinks` 只校验链接可达性（且 `walk()` 不跟随 `dsh/preset/skills` symlink），不比较三面内容。当前 3 副本 md5 一致（`ea8ce56f…`，QA 实测）→ **今天一致，将来漂移静默** | `md5 -q skills/kixpower/hooks/README.md dsh/preset-classic/… en/…`；`grep -n README.md dsh/preset-classic/plugins/consistency-lib.cjs` | 登记 Sprint+1（与 F5/N8 同族）：把该 `.md` 加入 `SPRINT2_NODE_ARTIFACTS` 或新建文档类三面组 |
| **F-6** | P3（证据强度）| **LG16 两处判据强度弱于其自述**：① `KIX-INSTALLER-NO-NODE` 出现在 `install.sh` **成功路径的横幅**（`Node required: >= 20.16.0 (KIX-INSTALLER-NO-NODE otherwise)`）→ QA 的 T7 实测中**被接受的版本也被 grep 命中**（`marker=true` 而 exit 0）⇒「输出含 marker」**不构成失败证据**，必须以 exit code 为主判据（既有测试同时断言两者，故当前无假绿）；② `copilot-installer.test.js:208` 的 `assert.match(text, /skip: /, '缺空作用域 skip 播报')` 对 `install.ps1` 命中的是**占位符替换**的 skip 文案（`install.ps1` 无 chmod 步骤：`grep -c chmod install.ps1` = **0**），即该断言对 ps1 侧**不判别**其注释所声称的空作用域语义（sh 侧由 `:173` 的精确文案断言覆盖，是真判据）| `grep -n 'KIX-INSTALLER-NO-NODE' install.sh`；`lg16-inject.cjs` T7 输出；`sed -n '202,215p' scripts/copilot-installer.test.js` | 登记观察项（不影响 LG16 实际覆盖）；Sprint+1 可把 ps1 侧断言改为注释/文案级判别或显式声明该判据为 sh-only |
| **F-7** | P3（文档记账）| 两处低价值记账不一致：① `U2-parity` 行称对照源「本机存在，**3612B**」，而 `/tmp/kix-validate-memory-backlog.cjs` 实际 **2988B**（mtime `15:55`，Sprint 1 期；MG4 的**实质结论已由 QA 独立重放证实**：3 fixture stdout 逐字节一致）；② `progress.md` 的 `artifacts_changed_since_last_observe` 仍把层 2/层 3 **已提交**文件列在「**未提交 WIP**」标题下（`git status` 显示它们均已提交）| `wc -c /tmp/kix-validate-memory-backlog.cjs`；`sed -n '19,38p' docs/sprint-2/progress.md`；`git status --porcelain` | 交 Orchestrator 在 C5 顺带修正（纯文档）|

> **无 P0、无 P1、无 gate 失败。** 未发现「修复不成立 / 断言被放宽 / 产品被误改 / 范围外源码改动 / 规避 §16.2 禁令」类问题。
> 两条 P2 均为**证据与文档面**（F-1 记录结论、F-2 调用点收口），**不影响 13/13 required gate 的 exit code 结论**，但 F-1 必须在 `done.md` 之前修正（否则 L4 结论建立在错误读数上）。

## 10. QA 自身操作纪律披露（必须留痕）

- **`qa_test_changes: []` 成立**：QA 未新增/修改任何测试、fixture、测试脚本、测试配置或业务源码；工作树中 `docs/sprint-2/progress.md` 的修改**不是 QA 所为**（Orchestrator 的 L2 trace 写入），QA 未提交、未修改、未 stash 它。
- **一次 QA 自身的过程违规（已发现、已完全回滚、已复核）**：首版注入脚本在 T4 控制组用例中把哨兵写到了 `skills/` **符号链接**指向的仓库目录，产生了一个临时文件 `skills/kixpower/QA_RESIDUE_PROBE.md`（内容 `{{QA_OUT_OF_SCOPE}}`，未提交、未跟踪）。QA 在签署前的状态复核中发现后立即 `rm -f` 删除，并修正脚本（该用例改为使用 `skills/` **副本**）。
  复核：`git status --porcelain --untracked-files=all` 恢复为 `M docs/sprint-2/progress.md` + 两个既有 marker 文件；`git diff --name-only HEAD` = 仅 progress.md。
  **影响评估（量化）**：该文件在存在期间使 LG11 的读数由 `79/39/22 (27.8%)` 变为 `80/40/22 (27.5%)`（工具会计入未跟踪文件）。QA 删除后**按同一命令重跑**：`LG2` exit 0 / `CONSISTENCY OK`、`LG11` `79/39/22 (27.8%)`、`LG12` `7/0`、`LG6` 全链 exit 0（32/32 · 23/0/1 · 20/20 · 59/0/1）、`LG8` 全链 exit 0（12/12 · 20/20 · 35/0/1）、LG16 注入 15/15 —— **全部与清理前/L2 记录一致**，故本报告所有 gate 结论均取自**清理后**的干净读数。
- QA 全部探针、注入脚本与日志位于仓库外 `/tmp/qa-ivy-s2/`（与 Sprint 1 的 `/tmp/qa-ivy-t6/` 同纪律）；未创建临时 worktree，未触碰 `git stash`。

## 11. 残余不确定与 falsifier（不得当作已结论）

| ID | 残余不确定 | 当前证据状态 | Falsifier（可判定）|
|---|---|---|---|
| **R-1** | **CI 通道（CG1/CG2/CG4/CG5）**：E1 差分对拍（最强等价通道）与 `install.ps1` 的唯一可执行验证**本地永久不可达** | QA 实测：fork 无 workflow 注册、无本 SHA 的 run、无 PR、13 commit 未 push → 记 pending（**不得记 pass**）；LG10 本地 `unavailable`（1 pass/7 fail/0 skip，exit 1）| CG4：CI 上 `node --test ps1-parity.test.js` 出现 `parity: PASS`（stdout 逐字节 + exit code 一致）；CG5：windows-latest 上 `install.ps1` 正常安装 exit 0 + 注入哨兵非零 |
| **R-2** | **真实宿主语义（OQ8/OQ9）**：Copilot 对 hook spawn 失败是 `deny` 还是 `ignore`；真实 `preToolUse` 载荷 schema | 未取证（文档级）；影响 F-4 的定级与 6 条未移植声明在无 pwsh 宿主上的行为 | 真实 Copilot 会话日志（spawn 失败时的工具调用结果 + 实际 stdin 载荷）；若为 `deny` → 未移植声明需立即移植或移除 |
| **R-3** | **`install.ps1` 的语义正确性**（Windows 侧残留作用域、版本解析、`-DryRun` 行为）| 仅静态判据（QA 实读 `:61-78`（`Assert-NodeRuntime`：无 node → exit 1；`TryParse` 失败默认 0 → 拒绝）/ `:272-289`（dry-run 扫源、real 扫 `$CopilotHome/agents/*.agent.md`）且第 2 处 `Assert-NodeRuntime 'post-copy'` @`:246` 晚于拷贝；`skip:`/两 marker 齐备；卸载分支 `:95-123` 在 pre-flight `:135` 之前）；**无 pwsh → 本机不可执行** | CG5（windows-latest smoke：正常 0 + 注入哨兵非零）；本报告**不声称** ps1 侧语义等价 |
| **R-4** | **R-1 的 provenance 强度**：冻结凭据的"来源"证据是 `/tmp` 临时产物（`l2-manifest.json` / `kix-l2.cjs`），非 commit 绑定 | 三重佐证（内部自洽 + 与存活脚本逐行同构 + plan 未改动）；QA 结论为「主张成立、机制需细化为双轴」，见 §6 | 若能给出当时另一份被哈希的 `gates` 原文（任何形式的字节快照），或在不折叠前提下复算出 `46121655…` → 本裁决推翻 |
| **R-5** | **LG11 的度量窗口语义**：`--prev-sprint 1` 的窗口 = Sprint 1 的 baseline（`c3c31eb`）→ 覆盖 **Sprint 1 + Sprint 2** 的改动集，因此任何「本 Sprint fidelity」表述都必须显式声明窗口 | 工具输出自证：`Sprint: 1 … Baseline: c3c31eb… (progress.sprint_baseline_sha)`、`fidelity_v5.sprint: 1` | 若采用 Sprint 2 baseline（`ef6a485`）重跑，读数将不同；Producer 需明确「>20% 规则」按哪个窗口判定并登记处置（与 F-1 同源）|
| **R-6** | **CI parity step 的三态在 job 层的表现**：`unavailable` 被映射为 `exit 2` → **job 变红**（与 FAIL 的 `exit 1` 仅日志文案可辨）| `sed -n '36,56p' .github/workflows/ci.yml` | 若 runner 镜像丢失 pwsh，CI 会以「红」呈现 unavailable ⇒ 不得把红读成「已证伪忠实移植」；需 CG4 取证时区分日志文案 |

## 12. 签署结论

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

**「本 Sprint 是否因本报告获得发布许可」的明确表述**：
**否。本 Sprint 不因本报告获得发布许可（`release_eligible` 未建立）。**
理由与解锁条件（全部满足方可进入 `done`）：

1. **CI 取证（release 的唯一开口）**：CG1→CG2→CG5 依次取证（CG4 必须核对三态状态行与 `exit` 映射；CG5 必须给出 windows-latest 上 `install.ps1` 的「正常 0 + 注入哨兵非零」双向日志）。当前 fork 无 workflow 注册、无本 SHA 的 run、未授权 push/PR ⇒ 结构性 pending（R4）。
2. **F-1 必须先修正**（`drift-check.md` §8 结论行 `:214` + `progress.md` **3 处**「`ungated: 0 (0%)` → PASS」（`:55`/`:112`/`:266`）改为实际读数 `22 (27.8%)`，并登记 >20% 规则的处置）——否则 `done.md` 的覆盖率结论建立在与自身证据矛盾的读数上。**注**：F-1 是 `done` 的前置，**不是**本条签署档位的阻塞（档位唯一阻塞 = CI）；QA 的档位判定不因此改为 FAIL。
3. F-2（T4 调用点 pwsh-only）在 C5 或 Sprint+1 收口；F-3/F-4/F-5/F-6/F-7 按上表处置（登记 + 小修）。
4. 若 Orchestrator 判定 F-1 属于签署前置而非收尾修正，则正确档位是 **`REVERIFY_REQUIRED`**（文档修正后 QA 复核读数），**绝不是 `PASS`**。

**给 Orchestrator 的后续动作**：① 修正 F-1 的 3 处记录（`:55`/`:112`/`:266`）与 §8 结论行 `:214`，回填真实读数并登记 >20% 规则处置；② 收口 F-2 的 5 处 pwsh 调用点（`dsh/README-DSH.md:31,41`、`README.md:72`、`README.en.md:72`、`DSH-ADAPTATION.md:306`）；③ 解阻 CI 后按 CG1→CG5 取证；④ 本报告的 `qa_verified_sha` 绑定 `42d3c7e`：**若此后任何测试 / fixture / installer / 源码被改动，本签署立即失效（`REVERIFY_REQUIRED`）**，需重新执行 §2 的 13 条 gate 与 §4 的注入网。
