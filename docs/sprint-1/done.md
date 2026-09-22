---
sprint: 1
sprint_name: 测试基线健康（门禁双口径 + 安装器幂等根因修复）
status: done
release_eligible: false
ci_pending: true
final_head: a3cdfb18b55ee16027bf268e6de7472343a611d2
sprint_baseline_sha: c3c31eb3268622358761cb2035ec84810a12ca11
branch: feature/sprint-1-test-baseline
qa_status: CONDITIONAL
qa_signoff: docs/qa/qa-signoff-1.md
l2_verified_sha: a3cdfb18b55ee16027bf268e6de7472343a611d2
l2_gate_manifest_sha256: 46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb
commits_used: 8
derived_commit_budget: 7
over_budget: 1
content_language: zh
generated_by: Remy (Producer)
generated_at: 2026-09-22
---

# Sprint 1 完成报告 — 测试基线健康

> **两条红线（贯穿全文，不得被任何段落读作已满足）**
> 1. **CI 未验证**：`ci_gate` CG1/CG2/CG3 全部 **pending**（fork 无 workflow 注册、无 PR 授权）。本报告
>    所有「已完成」仅指**本机可执行范围**，证据 revision = `a3cdfb18b55ee16027bf268e6de7472343a611d2`。
> 2. **不可发布**：`release_eligible: false`。本 Sprint 成果**不构成发布证据**，不得用于 tag / `npm publish` /
>    合并上游 PR 的许可依据。
>
> 报告结构：交付清单（§1）→ 门禁终态（§2）→ 与规划的差异（§3）→ QA findings 处置（§4）→
> 残余不确定（§5）→ `over_budget` 结算（§6）→ Evals 回归（§7）→ 判定分歧与裁决（§8）→ 移交（§9）。

---

## 1. 交付清单（T1–T7）

> 证据来源标注：`L2` = orchestrator 全量 gate 记录（`progress.md` frontmatter，@ `a3cdfb1`）；
> `QA` = `docs/qa/qa-signoff-1.md` 的独立复算。**本报告未重跑任何测试**（Producer 不替 Dev/QA 执行）。

| ID | 做了什么 | 关键证据（命令 + 计数 + revision） | 终态 |
|---|---|---|---|
| **T1** | `scripts/sync-dsh-preset.test.js` 的 82/110/140 三条 pwsh 依赖用例补 ENOENT 能力探针（3 条 fail → skip）；负向断言原样保留 | `node --test scripts/sync-dsh-preset.test.js` → 5 tests / 0 pass / **0 fail / 5 skip**（QA 实测 @ `a3cdfb1`）；`npm run test:installer` 25 → **20 / 0 / 5**（L2 LG1）；commit `039811d` | done |
| **T2** | 安装器幂等根因**先取证后修**：`copyFileKeepingMtime` 改写侧为数值秒（`utimesSync(d, atimeMs/1000, mtimeMs/1000)`），比较口径未动；`en/scripts/install-lib.js` 字节镜像同步 | `T2-evidence` 三元组：冷目标 `added=63` → 第二/三次调用均 `added=0 updated=3 same=60`（**永久不收敛、非一次性抖动**）；修复后探针 `updated=0 same=63`；受控 A/B：同 mtime 带内 baseline **19 pass / 1 fail** → HEAD **20 / 0**（QA §3 MG3）；`md5 -q` 两副本同为 `a72674afb96399cf530f7e0ef7fde4da`（L2 MG4）；commit `1c9d479` | done（残余 F-1：断言非 hermetic） |
| **T3** | `.github/workflows/ci.yml` 的 `matrix.os` 增加 `macos-latest`（6 组合，`fail-fast: false` 保留） | `.github/workflows/ci.yml:20` = `os: [ubuntu-latest, windows-latest, macos-latest]` × `node: ['20.16.0','22.x']`（HEAD 实读）；commit `8696b02` | **配置面 done；CI 侧 success 未取证**（CG2 pending） |
| **T4** | 5 条 pwsh 依赖用例统一机器可识别 skip 文案，两类语义可区分 | `grep -n "t.skip" scripts/sync-dsh-preset.test.js` → **恰 5 处**（`:45/73/100/127/156`，每用例一处）；常量 `SKIP_WINDOWS_ONLY` / `SKIP_PWSH_UNAVAILABLE`（`:18-19`）；QA 逐条登记 5 条用例名（§3 MG1）；commit `039811d`（与 T1 同 commit） | done（**CI 侧 `skipped 0` 未取证**，见 R-2） |
| **T5** | `CHANGELOG.md` 已被实测反证的声称追加平台限定/勘误（历史条目数字不覆写） | `git diff --numstat c3c31eb..HEAD -- CHANGELOG.md` = `58  0` → 纯追加、0 删除行（QA §3 MG2）；commit `c43d36e` | done |
| **T6** | 修 `kix-focus.test.js` 的 macOS `os.tmpdir()` 符号链接**夹具**缺陷（4 副本临时根实时 realpath 归一化）；产品 `kix-focus.js` 零改动 | LG10 `cd dsh/preset/plugins && node --test` → 60 tests → **59 / 0 / 1**；LG11 en 侧 36 → **35 / 0 / 1**；聚焦 `node kix-focus.test.js` → **139 passed / 0 failed**（修前 138/1）；产品 4 副本 md5 = `52346442ca28b753ff9ad9ef7856242c` ×4（= baseline 值，`git diff --name-only c3c31eb..HEAD -- '**/kix-focus.js'` 空）；夹具 4 副本 md5 = `8f87e48f8ab27660decb66e5aab032a5` ×4；反例 control `realpath_equal: false`（断言仍有区分力）；commit `58a5ffe` | done（证据见 L2 LG2/LG10/LG11 + MG5/MG6） |
| **T7** | `CHANGELOG.md` 的 Sprint 1 条目追加 T6 段（夹具缺陷定位、非本 Sprint 引入、最终门禁口径），纯追加 | commit `a3cdfb1`；追加后总 numstat 仍为 `58 0`（含 T5+T7，QA §3 MG2 复核 @ `a3cdfb1`） | done |

**合计**：7 任务 / 7 done / 0 blocked（与 `progress.md` frontmatter `completed_tasks: 7`、`blocked_tasks: 0` 一致）。

**验收目标（plan §1）达成度**：

| 判据 | 终态 | 依据 |
|---|---|---|
| G-A 4 条红转绿 | ✅ 达成 | LG1 `20/0/5`（本机）+ LG5/LG6 `exit 0` |
| G-B CI 增 macOS runner 且 job **success** | 🟡 **配置达成，success 未取证** | `ci.yml:20` 含 `macos-latest`；CG2 pending |
| G-C skip 显式门禁化 + CI `skipped = 0` | 🟡 **本机达成，CI 侧未取证** | MG1 pass（5 处可枚举）；R-2 |
| G-D 文档声称与实测可对照 | ✅ 达成（本机口径） | MG2 pass（58 追加 / 0 删除；双平台口径并列） |

---

## 2. 门禁终态

### 2.1 `local_gate`：required 8/8 exit 0

```text
revision: a3cdfb18b55ee16027bf268e6de7472343a611d2
l2_verification_passed: [LG1, LG2, LG3, LG4, LG5, LG6, LG10, LG11]      # 8/8
l2_gate_manifest_sha256: 46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb
```

| gate | cmd | 终态计数（@ `a3cdfb1`） | 证据 |
|---|---|---|---|
| LG1 | `npm run test:installer` | exit 0；25 tests → **20 pass / 0 fail / 5 skip** | L2；QA 复算一致 |
| LG2 | `npm run test:consistency` | exit 0；`CONSISTENCY OK` + `install-lib.js` 2 copies byte-identical | L2；QA 复跑 exit 0 |
| LG3 | `npm run test:pressures` | exit 0 | L2（QA 未重跑） |
| LG4 | `npm run test:vision` | exit 0 | L2（QA 未重跑） |
| LG5 | `npm test` | exit 0；链尾 60 tests → **59 pass / 0 fail / 1 skip** | L2；QA 仅复核链尾子集（R-4） |
| LG6 | `cd en && npm test` | exit 0；链尾 36 tests → **35 pass / 0 fail / 1 skip** | L2（QA 未重跑） |
| LG10 | `cd dsh/preset/plugins && node --test` | exit 0；60 → **59 / 0 / 1** | L2；QA 子集 `kix-focus.test.js` 139/0 |
| LG11 | `cd en/preset-classic-en/plugins && node --test` | exit 0；36 → **35 / 0 / 1** | L2（QA 未重跑） |

> **skip 语义（不得读作通过）**：LG1 的 5 skip = 宿主无 `pwsh` 的**能力型 skip**（`SKIP: pwsh unavailable — …`），
> 本机对 `sync-dsh-preset.ps1` 的覆盖 = **0 条断言执行**；LG5/LG10 的 1 skip = `kix-browser.test.js:473` 的
> `KIX_BROWSER_SMOKE=1` opt-in 真浏览器 smoke，**非**能力型，两者不可混算。

### 2.2 `ci_gate`：全部 pending（**不得记 pass**）

| gate | 终态 | 依据（QA 实测，`qa-signoff-1.md` §2） |
|---|---|---|
| CG1 `gh pr checks` | **pending** | `gh workflow list -R slchris/kixparadigm` 空、`gh run list -R slchris/kixparadigm` 空（fork 无 workflow 注册）；无 PR 路径 |
| CG2 `gh run view <run-id>`（6 组合 success + macOS 真跑） | **pending** | 上游 `olicesx/kixparadigm` 最近 3 条 run 的 `headSha` = `5376d6c…`(failure) / `df3e590…`(failure) / `c3c31eb…`(success, baseline) —— **均非本 Sprint HEAD** |
| CG3（`required: false`，CG1 降级通道） | **pending** | 同上 |

> **口径声明**：本地 LG5/LG6 绿**不构成** CI 绿的替代证据。CG2 必须核对 6 个 matrix 组合与
> macOS job 日志中的 `# skipped 0`（证明 pwsh 用例真跑）。

### 2.3 `manual_gate`：MG1–MG6 全部 pass（QA 执行）

| gate | 结论 | 核心证据 |
|---|---|---|
| MG1（5 条 skip 逐条登记） | ✅ | 源码 5 处调用点 ↔ `skipped 5` ↔ QA 逐条 5 条用例名，三者一一对应；两类语义可区分 |
| MG2（CHANGELOG 纯追加） | ✅ | `58 0`；`^-` 行 grep 无输出；门禁数字均标注测量平台；显式写「CI 仍 pending」 |
| MG3（T2 取证独立于断言） | ✅ | 四元组 + 3 条失配文件 `(path,size,mtimeMs)` 对照；**受控 A/B**：baseline 19/1 → HEAD 20/0 |
| MG4（`install-lib.js` 字节镜像） | ✅ | 两副本 md5 同为 `a72674afb96399cf530f7e0ef7fde4da` |
| MG5（产品零改动 + 夹具 4 副本同步） | ✅ | 产品 md5 = baseline 值 ×4；夹具 md5 同值 ×4；`git diff --name-only c3c31eb..HEAD -- '**/kix-focus.js'` 空 |
| MG6（T6 三重独立证据） | ✅ | QA 自建探针 `literal_equal:false / realpath_equal:true / resolved:true` + 反例 control `realpath_equal:false` + diff 形态（删除行仅 4 行路径构造） |

---

## 3. 与规划的差异（含 L2 前增量重规划）

| # | 规划期 | 实际 | 性质 / 留痕 |
|---|---|---|---|
| 1 | 5 个任务（T1–T5） | **7 个任务**（+T6 夹具修复 / +T7 CHANGELOG 补 T6 段） | **增量重规划**（plan.md §1 修订横幅、§4.1）：L2 前实测发现 LG5/LG6 仍 exit 1，唯一红 = `kix-focus.test.js:691` 的 macOS `os.tmpdir()` 符号链接夹具缺陷；baseline `c3c31eb` 独立 worktree 逐字复现（138 passed / 1 failed，夹具 md5 与 HEAD 修前同为 `4a11c76e…`）→ **非本 Sprint 引入**，且**阻断 G-B / CG2**（macOS runner 确定性红）。原结论一律保留不覆写 |
| 2 | §2 non-goal：**不改 `dsh/**` 任何 preset / 插件源码** | 修订为：产品源码仍禁改，**仅允许修改 `**/plugins/kix-focus.test.js`（4 副本）** | 边界硬约束：`kix-focus.js`（产品）4 副本 md5 全程 = `52346442ca28b753ff9ad9ef7856242c`，diff 为空 |
| 3 | §2 non-goal：**不动 `dsh/preset-null`**（消融档） | 修订为：**必须一并修改**该档夹具 | 机械强制：`kix-focus.js` 不在 `PLUGIN_IDENTITY_GROUPS` → 走 `consistency-lib.cjs:358-359` 默认全根身份组，只改单侧会直接使 LG2 红 |
| 4 | gates：required local = `[LG1…LG6]` | 增 **LG10/LG11 为 required**；增 **MG5/MG6 为 required**；LG5/LG6 的 `expect` 改为 T6 前/后双口径（`id`/`cmd`/`required` 未变） | 动机是**实证过的遮蔽失效**（LL-3）：链尾套件被 `&&` 链首红遮蔽。LG10/LG11 的 cmd 逐字取自既有 npm script 段落，**未新增任何 npm script**。L2 当时尚未发生（`l2_verification_passed: []`），manifest 变更无失效代价 |
| 5 | `derived_commit_budget: 5` | **7**（δ 3→4、bug_reserve 1→2，均证据化）；实际 **8** → `over_budget: 1` | 见 §6；**未回头改写预算**（红线） |
| 6 | `branch: main` | `feature/sprint-1-test-baseline` | `kix-guards:1250` 硬 deny main 分支 commit（`progress.md` Trace Log `observe_pre_dev`） |
| 7 | L0 假设「层内并行 task 合并为 1 commit」 | L0 实测 2 个 commit（`039811d` = T1+T4，`1c9d479` = T2） | 已由 plan §6 `bug_reserve_source` 注记 + `bug_reserve` 差额承载 |
| 8 | OQ1：T2 根因两候选模型（秒桶容差 / 秒级精度）**都不预测观测值 3** | 根因查明为**第三条路径**：`copyFileKeepingMtime` 把 `st.mtime`（`Date`，毫秒四舍五入）传给 `utimesSync` → 写侧向上越界 | 微探针实测（`utimesSync(..., st.mtime)` → `…5500.000`；`utimesSync(..., mtimeMs/1000)` → `…499.899`）；代码注释「utimes 只有秒级精度」被实测反证 |
| 9 | 规划期预期「链首绿即整体绿」 | 链首绿后**立即暴露**第二条既有红 | L4 `l2_failed: 1` → 触发**增量重规划**（而非重试）。该遮蔽效应是结构性的，已转化为 HB-3 candidate + LG10/LG11 |

**未发生的差异**：无范围外源码改动（`true_out_of_scope = 0`）；`git diff --name-only c3c31eb..HEAD` 共 18 个文件，全部命中 `target_rules` 或 `drift_whitelist`（QA §6 逐一映射）。

---

## 4. QA findings 处置（F-1 … F-7）

> 来源：`docs/qa/qa-signoff-1.md` §7。**无 P0 / P1**。

| ID | 级别 | 内容（摘要） | 本 Sprint 处置 | 终态 / 去向 |
|---|---|---|---|---|
| **F-1** | **P2** | T2 幂等用例**非 hermetic**：红/绿取决于**未入库的工作树 mtime**。fresh checkout 落带文件数 = 0 → baseline 在该 checkout 为 20/0，真实分支不执行；CI 的绿**不构成**该路径被验证的证据 | **未在本 Sprint 修复**（超范围：需改测试夹具的确定性输入构造）。HEAD 代码已消除该缺陷类（受控 A/B 成立），但断言的 hermetic 性缺陷仍在 | **已登记，移交 Sprint 2**（§9-1）。载体：`qa-signoff-1.md` F-1、`lessons-learned.md` LL-7、`harness-backlog.md` HB-4、`hill-climbing.md` U-5 |
| F-2 | P3 | `kix-focus.test.js:703-709` symlink 创建失败降级分支的近恒真弱断言（`return I.resolveEntryCandidates('/x').length >= 2`）| baseline 既有、本 Sprint 未触碰、本机未触发（`symlink_created: true`）→ 只登记，不改（**无证据改动 = 风险**） | 已登记观察项，移交 Sprint 2（§9-2） |
| F-3 | P3 | `l2_gate_manifest_sha256` 未能在本机**字节级复算**（canonical 实现依赖 pwsh）| 不改 digest、不伪造复算：以「required 集合三方一致（plan §7 / `l2_verification_passed` / session marker）+ 内容独立核对」作为替代证据，并把该方法学缺口升级为经验项 | 已登记为 **R-1**（§5）/ L4 U-1 / HB-5；本 Sprint 记为 advisory |
| F-4 | P3 | `.git/worktrees` 残留 `/private/tmp/kix-baseline-wt`（detached @ `c3c31eb`）| 收尾只读复核：`git worktree list` 现**仅**主工作树 `…/kixparadigm a3cdfb1 [feature/sprint-1-test-baseline]` → 残留已不存在 | ✅ **已解决**（Producer 未执行任何 worktree 变更操作） |
| F-5 | P3 | `PROJECT_BRIEF.md` §6 的 CI matrix 描述落后于 HEAD（缺 `macos-latest`）| **本收尾已修**：§2 与 §6 的 CI 描述同步为 6 组合（含 `macos-latest`），判据 = `.github/workflows/ci.yml:20` 实读 | ✅ **本报告同批落盘** |
| F-6 | P3 | L2 证据（`l2_verified_sha` / digest / `l2_stash_refs`）以**未提交**的工作树修改形式存在 | 属 orchestrator 的 L2 写入约定；收尾提交将其固化（**Producer 不执行 git 操作**） | 🟡 待收尾提交固化（构成 `commits_used: 8` 的组成部分，见 §6） |
| F-7 | P3 | 上游存在**非本 revision** 的 CI failure run（`5376d6c` / `df3e590`）| 与本 Sprint 无关（`headSha` 不同）→ 登记备查，不纳入本 Sprint 判定 | 已登记，无动作 |

---

## 5. 残余不确定与 falsifier（R-1 … R-4）

> 来源：`qa-signoff-1.md` §8（QA 独立提出）。**以下四项均未证实，不得作为已结论使用。**

| ID | 残余不确定 | 当前证据状态 | Falsifier（可判定） |
|---|---|---|---|
| **R-1** | `l2_gate_manifest_sha256 = 46121655…` 的**字节级**正确性 | **未证实**：QA 在 80 组主候选规范化族（另含 CRLF 变体）下均未复算出该值；canonical 实现 `Get-KixGateManifestJson`（`kixpower-contract.ps1:173-185`）依赖 pwsh，本机无 → 无法区分「提取差异」与「digest 记录有误」 | 在具备 `pwsh` 的宿主上按 canonical 实现复算：**应等于** `46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb`；**不等即 digest 记录有误 → L2/QA 信任链需重绑** |
| **R-2** | CI 侧「5 条 pwsh 用例真跑、`skipped 0`」 | **未证实**（CG2 pending）：依据 runner 镜像预装 pwsh 的仓库内证据（`runtime-context.md:39-40`、`lessons-learned.md:11` 引 `actions/runner-images` 行号）；QA **未独立取证**（web 取回 raw README 失败） | CG2：macOS/ubuntu job 的 `npm test` 日志出现真实运行记录与 `# skipped 0`；**若某 runner 无 pwsh → 5 条会静默 skip → 该 gate 必须在 CI 侧改为显式断言 `skip == 0`** |
| **R-3** | win32「平台型 skip」语义在本机**不可观测** | 仅源码分支可读（`sync-dsh-preset.test.js:35-37`）；本机 `process.platform = darwin` → 0 次触发 | windows-latest runner 日志（CG2 的 6 组合含 windows）或 Windows 宿主实跑；**若平台型分支永不触发，则两类 skip 语义的可区分性只有一半被验证** |
| **R-4** | 本机 `npm test` **全链**退出码未由 QA 重跑 | LG5 采信 L2 记录（60 → 59/0/1，exit 0）；QA 仅复核链尾单文件子集（139/0）与 installer 子集（20/0/5） | 在 `a3cdfb1` 上执行 `npm test` / `cd en && npm test`：**应 exit 0** 且链尾计数为 60 → 59/0/1 与 36 → 35/0/1；任一不符即 LG5/LG6 终态需重估 |

**与 L4 未决项的对应**（`hill-climbing.md` §8）：U-1 ≡ R-1；U-3 ≡ R-2（CI 侧证据全缺）；U-5 ≡ F-1；
U-2（移植版 backlog validator 与原 `.ps1` **未对拍**）、U-4（`preset-classic` / `preset-null` 两副本不被任何 npm script 执行，≡ plan OQ8）为本报告之外的追加残余项，一并移交 §9。

---

## 6. `over_budget` 结算（诚实记录，不改写预算）

```yaml
derived_commit_budget: 7      # base(δ=4) + coupling_bonus(1) + bug_reserve(2)
commits_used: 8               # git rev-list --count c3c31eb..HEAD = 7（已落盘）+ 1 收尾提交
over_budget: 1
```

| 项 | 内容 |
|---|---|
| 超支量 | **1** |
| 原因 | 收尾产物（L4 报告 / QA signoff / done.md / progress L2 字段固化）在 `task_sizing` 公式中**未被计为一个 DAG 层** → 属**预算模型的已知盲点**，不是提交粒度失控（7 个任务 commit 全部带任务前缀，`fix:` 仅 2 个 = T2/T6） |
| 处置 | 按 TEAM_CONVENTIONS 红线：**不回头改写 `commit_budget` 以宣称 `over_budget: 0`**；如实记 `over_budget: 1` 并作为 candidate 输入（`hill-climbing.md` §4；结构性成因已转为 HB-6 candidate） |
| 复算口径 | `git log --oneline c3c31eb..HEAD` = 7 行（`428e41f` 规划 → `a3cdfb1` T7）；第 8 个 = 含本报告的收尾提交。**截至本报告生成，收尾产物仍在工作树未提交**（`git status --short`：`M PROJECT_BRIEF.md`、`M docs/sprint-1/progress.md`、`M .kixpower/memory/repo/{harness-backlog,lessons-learned}.md`、`?? docs/sprint-1/{done,hill-climbing}.md`、`?? docs/qa/qa-signoff-1.md`、`?? docs/.kixpower-qa-session.json`）→ 由 orchestrator 落为第 8 个 commit |

---

## 7. Evals 回归结果（v4.1）

> 消费对象：`.kixpower/memory/repo/harness-backlog.md`（`items_total: 6`，`by_status: {candidate: 6}`）。
> **红线：`not triggered` ≠ pass**。`not triggered` 在本 Sprint 的成因是**结构性的**——
> `origin == Sprint 1`，同一 Sprint 同时充当自己的 trial 构成**自我确证**（无效试验不能验证经验），
> 故 6 项的 `eval.applies_to_sprints` 均为 `">=2"`，**Sprint 2 起才可能被独立匹配**。
> 本表**没有任何一项构成 `validated` 或 `trial pass`**。

| 项 ID | type | eval.trigger | 本 Sprint trial 结果 | 学习状态 |
|---|---|---|---|---|
| HB-1 | dev-workflow | 「plan.md 目标或 diff 中出现新增/修改的测试用例，且该用例 spawn 外部可执行文件」 | **not triggered**（origin == Sprint 1；自我确证无效；`applies_to_sprints: ">=2"`）| `candidate` |
| HB-2 | plan-template | 「新 Sprint 规划期基线（任一 canonical 测试命令）非绿」 | **not triggered**（同上；Sprint 1 自身即其 origin）| `candidate` |
| HB-3 | plan-template | 「plan.md 的 gate 引用了含 `&&` 的链式命令，或项目的 canonical 测试入口本身是 `&&` 链」 | **not triggered**（origin = 本 Sprint L2 前的链尾红暴露）| `candidate` |
| HB-4 | qa-workflow | 「plan / diff 中出现依赖文件系统状态（mtime/权限/顺序）或环境状态的断言」 | **not triggered**（origin = 本 Sprint QA 受控 A/B 反证 F-1；该项 evidence 另含 `kind: counterexample, result: fail`，属**反例来源**而非 trial 通过）| `candidate` |
| HB-5 | tooling | 「L2 交接写入 manifest digest，或 QA 需要复核该 digest」 | **not triggered**（origin = 本 Sprint 残余不确定 R-1）| `candidate` |
| HB-6 | plan-template | 「plan.md 生成 `task_sizing.derived_commit_budget`，且该 Sprint 计划写入 `docs/sprint-N/{done,hill-climbing}.md` 或 `docs/qa/qa-signoff-N.md`」 | **not triggered**（origin = 本 Sprint 收尾期 blast-radius 结算对账：实际 8 vs derived 7，over 量 == 收尾层）| `candidate` |

**回归检查（v4.1 要求）**：本 Sprint **无已应用的 `validated` 项**（backlog 中 `validated: 0`），故不存在
「已应用项命中 `regression_signal` → 降回 candidate」的情形；`by_status` 维持
`{candidate: 6, validated: 0, archived: 0}`。四项新增（HB-3/4/5/6）全部由 L4 / 收尾对账以 `candidate` 写入，
**未晋升为规则**。

---

## 8. 判定分歧与最终裁决（**显式记录，不掩盖**）

### 8.1 两侧主张

| 侧 | 主张 | 理由（原文要点） | 出处 |
|---|---|---|---|
| **QA（Ivy）** | 「本 Sprint **不因本报告获得发布许可，CI 全绿前不得进入 done**」 | `ci_gate` CG1/CG2/CG3 全 pending → 唯一合法状态是 `CONDITIONAL`；本地绿**不构成** CI 绿的替代证据 | `qa-signoff-1.md` §9 |
| **Orchestrator** | 本 Sprint 的**可本地执行范围**已收尾 → `progress.status: done`；但 **`release_eligible: false`** | 7/7 任务、0 阻塞、required local gate **8/8 exit 0** @ `a3cdfb1`、MG1–MG6 全绿；CI 通道在本机**结构上不可达**（fork 无 workflow 注册 + 无 PR 授权） | orchestrator 判定（`hill-climbing.md` §1 stage 7/8） |

### 8.2 分歧的实质

分歧**不在事实层**（双方对「CI 未取证」的认定完全一致，无任何一方宣称 CI 已验证），而在
**「`done` 这一状态承载什么语义」**：

- QA 把 `done` 与**发布可用性**绑定：CI 未绿 ⇒ 不得 done。
- Orchestrator 把二者**解耦**：`done` = 本 Sprint 在**当前可执行边界内**已结算完毕（无未完成项、
  无阻塞、本地门禁全绿）；`release_eligible` = **发布证据完整性**的独立字段。

### 8.3 最终裁决（本报告采用）

```text
status: done
release_eligible: false
ci_pending: true
```

**裁决理由（三条）**：

1. **QA 的实质关切已被机械承载，未被绕过**：`release_eligible: false` + `ci_pending: true` 是本报告的
   frontmatter 字段，且 §2.2 / §5-R-2 / CHANGELOG / `PROJECT_BRIEF` §7/§8/§9 均**显式声明 CI 未取证**。
   「CI 全绿前不得发布」这一约束**逐字成立**——分歧只在于它是否同时冻结 `done` 状态。
2. **若把 `done` 与 CI 绿绑定，本 Sprint 将在无 PR 授权期间无法结算**：L4 / done / QA signoff 等收尾产物与
   `progress.status` 会永久悬挂，且该悬挂**不产生任何新的质量信息**（缺的是外部通道授权，不是本地证据）。
3. **反对意见完整保留在案**（本节即其载体）：CI 通道一旦可用，`CG1 → CG2 → CG3` **必须**依次补证；
   本裁决**不豁免**该义务。

**本裁决的 falsifier（判定失效条件）**：若 CG2 出现任一 matrix 组合 failure，或 macOS job 日志中**未出现**
`# skipped 0`（即 pwsh 用例未真跑）→ 则本 `done` 判定与 LG5/LG6/LG10/LG11 的终态**同时失效**，
须走 `REVERIFY_REQUIRED` 重绑，且 F-1/R-2 的严重性上调。

---

## 9. 移交 Sprint 2（本 Sprint 未修 / 未取证项）

| # | 项 | 来源 | 建议动作 | 阻塞级别 |
|---|---|---|---|---|
| 1 | T2 幂等用例的 mtime 依赖（F-1）| QA F-1 / HB-4 / L4 U-5 | 把 mtime 边界**构造进 fixture**（复制前 `utimesSync` 源到带内值），使断言在任意 checkout 上都有区分力 | 中（削弱 CI 侧证据强度） |
| 2 | `kix-focus.test.js:703-709` 弱断言降级分支（F-2）| QA F-2 | 改为显式 `t.skip` 语义（当前形态是「受限环境退化」却记为通过） | 低 |
| 3 | `preset-classic` / `preset-null` 两副本**不被任何 npm script 执行** | plan OQ8 / N8 / L4 U-4 | 增加遍历式 gate 或纳入执行面；字节一致 ≠ 可运行 | 中 |
| 4 | `task_sizing` 的 `warn_threshold`（δ≥3 时结构性不可达：14 > `hard_cap` 10）| plan OQ9 / N9 | 框架层公式复核（TEAM_CONVENTIONS v5.0） | 低（跨 Sprint） |
| 5 | CI 侧证据全缺（CG1/CG2/CG3）| R-2 / L4 U-3 / OQ3 | 用户授权 PR 路径后按 CG1→CG2→CG3 取证；CG2 必核 6 组合 + `# skipped 0` | **高**（`release_eligible` 的唯一解锁条件） |
| 6 | manifest digest 不可平台无关复算 | R-1 / F-3 / HB-5 | 在 plan 写明规范化规则，或提供 Node 实现；否则该凭据降级 advisory | 中 |
| 7 | 移植版 backlog validator 与 `.ps1` 原版**未对拍** | L4 U-2 | 在具备 pwsh 的宿主上跑原版，比对 `record_count` / `legacy_unstructured_records` / 退出码 | 低 |
| 8 | `macos-latest` 指向的镜像版本未取证 | plan OQ5 | 读 `actions/runner-images` 标签映射（影响「T1 的 3 条是否在 macOS 真跑」）| 低 |
| 9 | `docs/.kixpower-current-sprint`（untracked）与「工作树干净」前提不符 | plan OQ7 | 确认入库或加入 `.gitignore`（**截至收尾仍未解**）| 低 |
| 10 | 上游 `main` 领先本地（`v1.3.17` CI failure run）| plan OQ4 / N5 / R3 | 合入前 rebase 并复跑全量 gate | 中 |
| 11 | pwsh 依赖工具链（fidelity check / hooks）在本机不可执行 | plan OQ6 / N2 / R5 | Node 等价实现（Sprint 2 起评估）| 中 |

> 以上为**登记**，不构成本 Sprint 的未完成项：本 Sprint 的 `total_tasks: 7` 已全部 done，
> `blocked_tasks: 0`。第 5 项是唯一影响**发布**的开口，其余为质量/证据强度改进。

---

## 10. 复算入口（第三方复核用）

| 目的 | 命令 | 预期 |
|---|---|---|
| HEAD 与提交数 | `git rev-parse HEAD` / `git rev-list --count c3c31eb..HEAD` | `a3cdfb1…` / `7`（+1 收尾 = 8）|
| required gate 集合 | `sed -n '/^  local_gate:/,/^  ci_gate:/p' docs/sprint-1/plan.md \| grep -c "required: true"`；等价核对 = id 集合 `{LG1,LG2,LG3,LG4,LG5,LG6,LG10,LG11}` | **8**（LG7–LG9 为 `required: false`，不计入 L2 manifest；勿用全块 grep，会把 2 个 ci_gate + 6 个 manual_gate 一并计入 16）|
| 产品零改动 | `git diff --name-only c3c31eb..HEAD -- '**/kix-focus.js'` | 空 |
| 夹具字节同步 | `md5 -q dsh/preset/plugins/kix-focus.test.js dsh/preset-classic/plugins/kix-focus.test.js dsh/preset-null/plugins/kix-focus.test.js en/preset-classic-en/plugins/kix-focus.test.js` | 4 行同值 `8f87e48f8ab27660decb66e5aab032a5` |
| CHANGELOG 纯追加 | `git diff --numstat c3c31eb..HEAD -- CHANGELOG.md` | `58  0` |
| CI matrix | `grep -n -A5 'matrix:' .github/workflows/ci.yml` | `os: [ubuntu-latest, windows-latest, macos-latest]` |
| CI 通道（当前） | `gh run list -R olicesx/kixparadigm --limit 3 --json headSha,conclusion` | 无 `a3cdfb1` 的 run → CG1/CG2 **pending** |
