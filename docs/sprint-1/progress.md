---
sprint: 1
status: done
last_updated: 2026-09-22
completed_tasks: 7
total_tasks: 7                           # 增量修订（2026-09-22，L2 前）：+T6 夹具缺陷修复 / +T7 CHANGELOG 补 T6 段，见 plan.md §1 修订横幅与 §4.1
blocked_tasks: 0
open_issues: {P0: 0, P1: 0, P2: 0}      # 上游 Issues 已禁用（hasIssuesEnabled: false），缺陷只登记在本文件与 plan.md
artifacts_changed_since_last_observe:
  - dsh/preset/plugins/kix-focus.test.js
  - dsh/preset-classic/plugins/kix-focus.test.js
  - dsh/preset-null/plugins/kix-focus.test.js
  - en/preset-classic-en/plugins/kix-focus.test.js
  - CHANGELOG.md
observe_fingerprint: a3cdfb18b55ee16027bf268e6de7472343a611d2   # L2 完成 revision（Dev 阶段已结束；规划期值 c3c31eb）
sprint_baseline_sha: c3c31eb3268622358761cb2035ec84810a12ca11   # 首次 Dev 前的 HEAD（完整 40 位）
dev_self_tests_passed:
  - "test:installer @ T1+T4 — 25 tests / 19 pass / 1 fail / 5 skip（本机无 pwsh；剩余 1 fail 为 T2 幂等红，T2 修复后应转 20/0/5）"
  - "test:installer @ T1+T2+T4 — 25 tests / 20 pass / 0 fail / 5 skip（LG1）"
  - "test:consistency @ T2 — CONSISTENCY OK + install-lib.js 2 copies byte-identical（LG2）"
  - "installer E2E 幂等 @ T2 — 临时 DSH_HOME 连跑两次：第 2 次 新增 0 / 更新 0 / 相同 119+112（独立于测试断言的证据）"
  - "test:pressures @ T3 — exit 0（LG3）"
  - "test:vision @ T3 — exit 0（LG4）"
  - "npm test @ T5 — **exit 1**：链首 4 步全绿（installer 20/0/5 + CONSISTENCY OK + pressures + vision），链尾 plugins 套件 58 pass / 1 fail / 1 skip；唯一红 = baseline 既有的 kix-focus macOS 夹具缺陷（LG5 未达 exit 0，见「⚠️ 范围外发现」）"
  - "cd en && npm test @ T5 — **exit 1**：12/12 + CONSISTENCY OK + 20/20 + 链尾 34 pass / 1 fail / 1 skip，同一既有红（LG6 未达 exit 0）"
  - "node dsh/preset/plugins/kix-focus.test.js @ T6 — 139 passed / 0 failed（LG10；修前 138 passed / 1 failed）"
  - "node en/preset-classic-en/plugins/kix-focus.test.js @ T6 — 139 passed / 0 failed（LG11；en 侧同一夹具）"
  - "npm test @ T6 — **exit 0**：链首 4 步全绿（installer 20/0/5 + CONSISTENCY OK + pressures + vision）+ 链尾 60 tests → 59 pass / 0 fail / 1 skip（LG5 达标）"
  - "cd en && npm test @ T6 — **exit 0**：12/12 + CONSISTENCY OK + 20/20 + 链尾 36 tests → 35 pass / 0 fail / 1 skip（LG6 达标）"
  - "test:consistency @ T6 — CONSISTENCY OK（LG2；4 副本夹具字节一致 md5 8f87e48f8ab27660decb66e5aab032a5；4 副本产品 kix-focus.js md5 仍为 52346442ca28b753ff9ad9ef7856242c）"
  - "node --check @ T6 — 4 个改动夹具副本 syntax OK（另 LG2 的逐目录 JS 语法扫描 dsh/preset 35 / en/preset-classic-en 26 全 OK）"
  - "反例 control @ T6 — 仓库外 scratch 副本置空 resolveEntryCandidates 的 realpath 回退 → realpath_equal: false（MG6②：断言修后仍有区分力，非恒真式）"
l2_verification_passed: [LG1, LG2, LG3, LG4, LG5, LG6, LG10, LG11]
l2_verified_sha: a3cdfb18b55ee16027bf268e6de7472343a611d2
l2_gate_manifest_sha256: 46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb
l2_stash_refs: []                        # L2 完成时 git stash list --format=%H 为空（orchestrator 实测）
qa_started_sha: null                     # placeholder — QA 启动时必须 == l2_verified_sha == HEAD
qa_verified_sha: null                    # placeholder — QA PASS/CONDITIONAL 证据对应的完整 HEAD
qa_gate_manifest_sha256: null            # placeholder — QA 签署时复核的同一 local_gate manifest
qa_test_changes: []
qa_session_marker: docs/.kixpower-qa-session.json
ci_pending: true                         # 规划期 CI 未跑；CONDITIONAL 只能因 CI gate pending
topology_used: sequential                # 规划期推荐拓扑（plan.md force_sequential: true；增量修订后 ω=4,γ=0.23 → 无强制时应得 parallel，被 force_sequential #1/#3 覆盖，见 plan.md §5.2）
blast_radius:
  commit_budget: 7                       # 增量修订 5→7 = plan.md task_sizing.derived_commit_budget（δ4 + strong1 + bug_reserve2）；不改则 T6/T7 提交会被 hook 拒绝
  branch_required: true
  block_force_push: true
  block_destructive_sql: true
---

# Sprint 1 Progress — 测试基线健康

> 结构化真相源 = 本 frontmatter。正文任务行必须与 `completed_tasks` / `total_tasks` / `blocked_tasks` 一致。
> 计划见 `plan.md`；脑暴见 `../brainstorm/sprint-1-brainstorm.md`；环境快照见 `runtime-context.md`。

## 任务表

| ID | 任务 | 状态 | 依赖 | 说明 |
|---|---|---|---|---|
| T1 | `sync-dsh-preset.test.js` 82/110/140 补统一 pwsh ENOENT 探针（3 条 fail → skip）| [x] | — | 保留负向断言；两类 skip 语义可区分 |
| T2 | `ensureDefaultSkillsShelf` 幂等：**先取证**（added/updated/same/pruned）再修最窄一层；同步 en 字节镜像 | [x] | — | `T2-evidence` 已落盘（MG3）；修复层 = 复制/mtime 保留路径 |
| T3 | CI matrix 增加 `macos-latest` | [x] | T1, T2 | macOS runner 亦预装 pwsh → 防的是 T2 而非 T1 |
| T4 | 5 条 pwsh 依赖用例统一可识别 skip 文案（skipped 计数 ↔ 原因一一对应）| [x] | T1 | 与 T1 同文件，串行 |
| T5 | CHANGELOG 已反证声称追加平台限定/勘误（不改历史数字）| [x] | T1–T4 | 需要最终门禁数字稳定后写 |
| T6 | 修 `kix-focus.test.js:691` macOS `os.tmpdir()` 符号链接**夹具**缺陷（4 副本字节同步；`kix-focus.js` 产品源码禁改）| [x] | — | 增量新增（L2 前新证据）；判据见 plan.md §4.1；证据见本文 §T6-evidence |
| T7 | CHANGELOG Sprint 1 条目补 T6 段（最终门禁口径 `59/0/1`、`35/0/1`；纯追加）| [x] | T5, T6 | 增量新增；不改 T5 已写内容与历史条目（diff 19 added / 0 deleted）|

**合计**：7 任务，7 完成，0 阻塞。（增量修订：原 5 任务 → +T6/+T7，见 plan.md §1 修订横幅）

> **MG1 口径说明（供 QA 复核）**：baseline 的 `sync-dsh-preset.test.js` 已有 4 处 skip 调用点
> （21/52 能力型 pwsh 探针 + 82/110 平台型 win32）。T1 为 82/110 追加能力型守卫后，若两类守卫
> 各自独立成点会变成 7 处，与 MG1「恰 5 处 skip」不符。故统一为每用例一处 `pwshGuard` 调用点：
> 源码 5 处 skip ↔ `node --test` 的 `skipped 5` ↔ QA 逐条登记 5 条用例，三者一一对应；
> 两类语义由 `SKIP_WINDOWS_ONLY` / `SKIP_PWSH_UNAVAILABLE` 两个常量与行尾注解区分。

## 基线证据（规划期，只读复核）

| 项 | 值 | 来源 |
|---|---|---|
| `npm test` | exit 1（红点全在链首 `test:installer`；后续 4 步从未执行）| orchestrator 实测 |
| `npm run test:installer` | 25 用例 → 19 pass / 4 fail / 2 skip | 计数模型：`install-lib.test.js` 20 + `sync-dsh-preset.test.js` 5 |
| 上游 CI @ baseline | `main` push run 34699043255 = **success**（ubuntu + windows）| `gh run list -R olicesx/kixparadigm` |
| `npm run test:consistency` | CONSISTENCY OK（4 副本字节一致守护生效）| brief 已核事实 |
| `install-lib.js` zh/en | md5 一致 `c53b11987c86858efec5c511b725f618` | 本机实测 |
| 本机 `pwsh` | **不存在**（`command -v pwsh` 空）| 本机实测 |
| 本机 HEAD / branch | `c3c31eb3268622358761cb2035ec84810a12ca11` / `main` | `git rev-parse` |
| 工作树 | 1 个 untracked：`docs/.kixpower-current-sprint`（内容 `1`）→ 与「工作树干净」前提不符，见 plan OQ7 | `git status --short` |

## ❌ Blocked

（无）

## ⚠️ 范围外发现：LG5/LG6 仍红，且新增的 macOS CI job 会因同一原因红

**不是本 Sprint 引入的**：在 baseline `c3c31eb` 的独立 worktree（detached，未含本 Sprint 任何改动）上
复跑，失败逐字相同；`git diff --name-only c3c31eb..HEAD -- dsh en/preset-classic-en` 为空（被测文件与
其输入均未改动）。

| 项 | 现象 | 证据 |
|---|---|---|
| LG5 `npm test`（zh）| exit 1，链末 `dsh/preset/plugins` 套件 60 tests → 58 pass / **1 fail** / 1 skip | `/tmp/lg5.log`；`not ok 7 - kix-focus.test.js` |
| LG6 `cd en && npm test` | exit 1，链末 36 tests → 34 pass / **1 fail** / 1 skip，同一条用例 | `/tmp/lg6.log` |
| baseline 复现 | `kix-focus.test.js` 在 `c3c31eb` 上同为 1 fail（60/58/1）| `git worktree add --detach <tmp> c3c31eb` 后单跑 |

**失败用例**：`kix-focus.test.js:691`「symlink 部署（WSL2 实测 bug 场景）: realpath 候选解析成功」。

**根因（只读探针实测，非推断）**：macOS 的 `os.tmpdir()` 是 `/var/folders/…`，而 `/var` 是
`/private/var` 的符号链接（探针：`tmpdir_is_symlinked: true`）。夹具用**字面路径**构造
`realEntry = <tmp>/dsh-install/dsh`，而 `resolveEntryCandidates` 正确返回的是 **realpath** 形态
（`/private/var/…/dsh-install/dsh`）——即产品行为正确（`resolved: true`），失败的是夹具的
字符串包含断言 `c.includes(realEntry)`（`realpath_equivalent_in_candidates: true` 但字面不等）。
Linux/Windows 的 tmp 无符号链接故相等，所以 baseline CI（ubuntu+windows）一直是绿的。

**为什么现在才暴露**：`npm test` 是 `&&` 链，链首 `test:installer` 红 → 后续 4 步从未执行（LL-3）。
T1/T2 修复后链首次跑通到底部，立即暴露出这第二个本机红。

**对 gate 的影响（需 orchestrator 决策）**：

- LG5 / LG6 的 `expect: exit 0` 在**本机**无法满足，除非修改 `dsh/preset/plugins/kix-focus.test.js`。
- **T3 的 macOS job 会红**：该失败在 macOS 上是确定性的（tmpdir 必为 `/var` 符号链接），
  故 CG2「6 个 matrix 组合 success」与 G-B「macOS job 为 success」在当前 revision 上不可达。
  `dsh/**` 在本 Sprint 的 explicit non-goals 内（plan §2）且受 4 副本一致性守护约束，
  Dev 不越界修改 → 记为下方 Sprint+1 候选 N6/N7，交回 Producer/orchestrator 决定是否扩范围。

## T6-evidence（MG6 必须：独立于被修文件自身断言的证据）

> 结论：**红在夹具侧，产品行为正确** → 修夹具而非产品。以下三条相互独立，且都不依赖
> `kix-focus.test.js` 自己的断言；脚本位于仓库外 `/tmp/kix-t6/`。

### ① 独立探针（不经由被修测试文件）

用 realpath 归一化的临时根复现同一 symlink 布局（`tmp/bin-link` → `tmp/dsh-install`），直接调用
`kix-focus.js` 的 `__internals`：

```text
T6-evidence-probe: tmpdir_is_symlinked: true
                   literal_equal: false   # 夹具原比较形态（字面 /var/…）→ macOS 恒假（假红）
                   realpath_equal: true   # 解析器返回的归一化候选（/private/var/…）→ 可用
                   realpath_equivalent_in_candidates: true
                   resolved: true         # defaultResolvePkg 真的解析到包 → 产品行为正确
```

### ② 反例 control（仓库外 scratch 副本，防「靠删断言 / 放宽条件变绿」）

`/tmp/kix-t6/kix-focus-noRealpath.js` = `kix-focus.js` 逐字复制、仅把 `resolveEntryCandidates` 的
realpath 回退置空（生成脚本对片段未逐字命中直接 exit 2，拒绝生成），喂给同一探针：

```text
T6-evidence-control: realpath_equal: false   # 同场景下断言修后仍能捕获该产品缺陷
                     literal_equal: false
```

→ 断言仍有区分力：它通过是因为**候选链真的可用**，不是因为条件被放宽。**仓库内 `kix-focus.js` 全程零 diff**。

### ③ diff 形态与 md5 复核（机械校验，MG5）

```text
T6-evidence-diff:
  git diff --name-only c3c31eb..HEAD -- '**/kix-focus.js'                    → 0 行（产品零改动）
  git diff c3c31eb..HEAD -- '*kix-focus*' 中非 kix-focus.test.js 的文件头    → 0
  被删除的 `await ok(` 行                                                     → 0
  4 副本 diff 内容（去掉路径行后）md5 唯一值个数                               → 1（同构改动）

md5 复核（MG5）：
  产品 4 副本 kix-focus.js       : 52346442ca28b753ff9ad9ef7856242c ×4（= baseline 值，未变）
  夹具 4 副本 kix-focus.test.js  : 8f87e48f8ab27660decb66e5aab032a5 ×4（字节同步）
                                  修前/baseline 值 = 4a11c76e45eb9aebe1534beb5f611c48
```

## Trace Log

```yaml
- at: 2026-09-22
  stage: producer_planning
  stage_signal: planning_artifacts
  actor: Remy (Producer)
  action: "模式 0 导入规划：PROJECT_BRIEF.md（14 章）+ brainstorm + plan + progress + runtime-context + drift-check + .kixpower/memory/repo 初始化"
  artifacts:
    - PROJECT_BRIEF.md
    - docs/brainstorm/sprint-1-brainstorm.md
    - docs/sprint-1/plan.md
    - docs/sprint-1/progress.md
    - docs/sprint-1/runtime-context.md
    - docs/sprint-1/drift-check.md
    - .kixpower/memory/repo/lessons-learned.md
    - .kixpower/memory/repo/harness-backlog.md
  result: observed
  note: "未编辑任何源码（Producer 身份硬约束）；门禁只引用 package.json 中真实存在的 canonical 命令"
- at: 2026-09-22
  stage: observe_pre_dev
  stage_signal: planning_artifacts
  actor: orchestrator
  action: "阶段 5 Observe：git status 验证 8 个 artifact 落盘（1243 行）；读 frontmatter 确认 status planning→in-progress"
  artifacts:
    - PROJECT_BRIEF.md
    - docs/sprint-1/plan.md
    - docs/sprint-1/progress.md
  result: observed
  note: "kix-orchestration 交接校验在 Producer 分派期误报（planning 阶段本就要创建 plan/progress，校验读的是分派 prompt 的 sprint 元数据而非交接结果）；文件确认存在，非阻塞。plan.md 的 force_sequential/sequential 拓扑与 max_parallelism=2 一致。kix-guards:1250 硬 deny main 分支 commit → 已建 feature/sprint-1-test-baseline（HEAD 仍 c3c31eb，baseline 未变）"
- at: 2026-09-22
  stage: dev
  stage_signal: task_status_and_artifacts
  actor: Dev (Nova/Sage/Milo)
  action: "T6 修 macOS tmpdir 符号链接夹具缺陷（4 副本临时根实时归一化，产品零改动）+ T7 CHANGELOG Sprint 1 条目追加 T6 段（纯追加）"
  artifacts:
    - dsh/preset/plugins/kix-focus.test.js
    - dsh/preset-classic/plugins/kix-focus.test.js
    - dsh/preset-null/plugins/kix-focus.test.js
    - en/preset-classic-en/plugins/kix-focus.test.js
    - CHANGELOG.md
    - docs/sprint-1/progress.md
  result: observed
  note: "LG10/LG11 聚焦 138 passed/1 failed → 139 passed/0 failed；LG5 exit 0（链尾 60 tests → 59 pass / 0 fail / 1 skip）、LG6 exit 0（36 → 35/0/1）；LG2 CONSISTENCY OK；MG5/MG6 证据见 §T6-evidence（含反例 control realpath_equal=false）。本回合 2 个 commit：T6 = 58a5ffe（仅 4 个夹具副本，产品 0 文件）、T7 = 本 progress.md 所在 commit（CHANGELOG + plan + progress）。CG1/CG2 仍 pending —— 本机绿不构成 CI 绿。"
- at: 2026-09-22
  stage: l2
  stage_signal: gate_manifest
  actor: orchestrator
  action: "L2 全量 required local gate @ a3cdfb1：LG1/LG2/LG3/LG4/LG5/LG6/LG10/LG11 逐条执行"
  artifacts:
    - docs/sprint-1/progress.md
  result: observed
  note: "8/8 exit 0；计数与 plan 期望逐项相符（LG1 25→20/0/5；LG10 60→59/0/1；LG11 36→35/0/1；LG5/LG6 端到端 exit 0 且链尾口径同 LG10/LG11）。manifest_sha256=46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb（8 gate，按 id 排序规范化）；l2_stash_refs=[]（实测）。"
- at: 2026-09-22
  stage: qa
  stage_signal: qa_signoff
  actor: Ivy (QA)
  action: "QA 独立复核：跑 ci_gate（pending）+ manual_gate MG1–MG6（pass）；独立复现 baseline 138/1；受控 A/B 反证 T2 断言的 hermetic 性"
  artifacts:
    - docs/qa/qa-signoff-1.md
    - .kixpower/memory/repo/lessons-learned.md
  result: observed
  note: "签署 CONDITIONAL（唯一理由 ci_pending）；qa_started_sha == qa_verified_sha == HEAD == a3cdfb1；qa_test_changes=[]。7 findings（F-1 为 P2：幂等断言依赖未入库 mtime，fresh checkout 20/0 不触发真实分支）+ 4 残余不确定（R-1 manifest digest 未能字节级复算）。"
- at: 2026-09-22
  stage: l4
  stage_signal: hill_climbing
  actor: orchestrator
  action: "L4 实践学习：Trace 聚合 + 期望/实际/反证 + pending trial 评估 + 模式计数 + 新增 HB-3/4/5 candidate；canonical memory lifecycle validator 以逐条忠实移植的 Node 版执行（本机无 pwsh）"
  artifacts:
    - docs/sprint-1/hill-climbing.md
    - .kixpower/memory/repo/harness-backlog.md
  result: observed
  note: "patterns: silent_failure 0 / goal_drift 0 / l2_failed 1 / over_budget 1 / claim_evidence_failure 1。移植版 validator 输出 memory_backlog: valid / record_count 2 / legacy 0 / exit 0，并用 4 组负向控制（缺 status / 重复 id / validated 缺 trial-pass / 缺 improvement）确认非恒真；与原版对拍缺口登记为 U-2。"
- at: 2026-09-22
  stage: producer_closeout
  stage_signal: done_report
  actor: Remy (Producer)
  action: "收尾：done.md（含 Evals 回归结果表，HB-1..HB-6 全 not triggered）+ PROJECT_BRIEF §7/§8 更新 + §6 CI matrix 更正（含 macos-latest）+ status: in-progress → done"
  artifacts:
    - docs/sprint-1/done.md
    - PROJECT_BRIEF.md
  result: observed
  note: "release_eligible: false（CI 未取证）。QA §9『CI 全绿前不得进入 done』与最终裁决的分歧已在 done.md §8.1 原文保留 + 附 falsifier。blast-radius 结算提醒触发 over_budget 对账 → 如实记录 8/7 并生成 HB-6 candidate（收尾层未入公式），未回写预算。"
- at: 2026-09-22
  stage: finalize
  stage_signal: closeout_commit
  actor: orchestrator
  action: "收尾提交（第 8 个 commit，docs-only）+ QA session marker 清理"
  artifacts:
    - docs/sprint-1/done.md
    - docs/sprint-1/hill-climbing.md
    - docs/qa/qa-signoff-1.md
  result: observed
  note: "收尾 commit 的变更面经 `git diff --name-only a3cdfb1..HEAD` 机械核对：仅 docs/**、PROJECT_BRIEF.md、.kixpower/memory/repo/**（纯文档），无 code/test/fixture/构建配置/gate 命令改动 → L2 与 QA 证据的绑定 revision 仍为 a3cdfb1，不触发 freshness 失效；并在收尾 HEAD 上复跑 LG1（25→20/0/5, exit 0）与 LG2（CONSISTENCY OK, exit 0）作为收尾冒烟。最终 HEAD 以 `git rev-parse HEAD` 为准（收尾 commit 经一次 amend 以并入 HB-6 与本次对账记录）。"
```

## T2 取证区（T2 步骤 A 必须在此落盘，供 MG3 校验）

```text
T2-evidence: added=0 updated=3 same=60 pruned=0        # 第二次调用（warm）；本机 macOS / APFS，dest=临时目录
T2-evidence-cold:  added=63 updated=0 same=0 pruned=0  # 首次调用（冷目标，dest 不存在）
T2-evidence-third: added=0 updated=3 same=60 pruned=0  # 第三次调用仍为 3 → 永久不收敛，非一次性抖动
```

| 相对路径 | src.size | dst.size | src.mtimeMs | dst.mtimeMs |
|---|---|---|---|---|
| improve-codebase-architecture/INTERFACE-DESIGN.md | 2725 | 2725 | 1790060295499.546 | 1790060295500 |
| improve-codebase-architecture/LANGUAGE.md | 3804 | 3804 | 1790060295499.7085 | 1790060295500 |
| improve-codebase-architecture/SKILL.md | 6518 | 6518 | 1790060295499.8994 | 1790060295500 |

**判读**：3 条失配全部 `size` 相同、只有 mtime 不同，且源值都落在同一秒的 `.4995`–`.4999` 区间——
即紧贴 `Math.round(mtimeMs/1000)` 秒桶的 0.5s 判定边界之下。63 个货架文件中只有这 3 个越界。

**根因（写路径量化，不是比较口径）**：`copyFileKeepingMtime` 把 `st.mtime`（`Date`）传给 `utimesSync`，
而 `Date` 的毫秒值是**四舍五入**的——实测 `src.mtimeMs = 1790060295499.8994` → `st.mtime.getTime() = 1790060295500`。
目标因此写成 `…500.000`；比较侧 `Math.round(mtimeMs/1000)` 得到源桶 `…295`、目标桶 `…296` → 永久失配。

同一源文件的微探针（证明是哪一层丢精度）：

```text
fs.utimesSync(d, st.atime, st.mtime)                  → dst.mtimeMs = 1790060295499.999→5500.000（向上越界）
fs.utimesSync(d, st.atimeMs/1000, st.mtimeMs/1000)    → dst.mtimeMs = 1790060295499.899（保留亚毫秒）
```

即代码注释里「utimes 只有秒级精度」的前提**已被实测反证**：utimes 有微秒精度，真正的损失是 `Date` 的毫秒四舍五入。

**修复层 = 复制/mtime 保留路径**（`copyFileKeepingMtime` 改传数值秒），**不动比较口径**：
量化只要不向上取整，秒桶比较结构性成立（截断只会让 `src<.5` 更小、`src≥.5` 保持 `≥.5`，两端桶不变）。
反之只放宽容差会保留写侧「声称保留源 mtime、实则四舍五入」的缺陷本身。

**修复后复测（独立于测试断言的证据）**：

```text
探针重跑：r2 (warm) added=0 updated=0 same=63 pruned=0；r3 同
真实安装器 E2E（临时 DSH_HOME，node scripts/install-lib.js install --preset-only ×2）：
  第 1 次：kixparadigm 新增 119 / 更新 0 / 相同 0；classic 新增 112 / 更新 0 / 相同 0
  第 2 次：kixparadigm 新增 0 / 更新 0 / 相同 119；classic 新增 0 / 更新 0 / 相同 112
`npm run test:installer`：25 tests / 20 pass / 0 fail / 5 skip
`npm run test:consistency`：CONSISTENCY OK（install-lib.js 两副本字节一致）
md5(scripts/install-lib.js) == md5(en/scripts/install-lib.js) == a72674afb96399cf530f7e0ef7fde4da
```

## Sprint+1 候选

见 `plan.md` §10（N1 Node 重写 pwsh 依赖测试 / N2 fidelity-check 的 Node 等价实现 / N3 PowerShell 5.1 覆盖 / N4 hooks 机械承载缺口 / N5 baseline 对齐例行检查）。

本 Sprint 执行中新发现（范围外，未修改）：

| ID | 候选 | 证据 / 触发条件 |
|---|---|---|
| N6 | `kix-focus.test.js:691` 夹具改用 realpath 归一化比较（`fs.realpathSync(realEntry)`），修掉 macOS `os.tmpdir()` 的 `/var → /private/var` 符号链接导致的确定性失败 | 本文「⚠️ 范围外发现」；baseline `c3c31eb` 同失败。**阻塞 G-B/CG2**：T3 新增的 macOS job 会因此红 |
| N7 | 把「本机 macOS 链尾红」纳入例行本地门禁判读：`npm test` 的 `&&` 链首一旦解除，链尾还有第二个既有红（本次才发现）| LL-3 的推论——链式门禁的「首步红遮蔽整链」会掩盖**多于一个**既有缺陷 |

> **归位（2026-09-22，Producer 增量重规划）**：上表 N6/N7 已**收回本 Sprint**，不再是 Sprint+1 候选——
> N6 → **T6**（4 副本夹具修复，`kix-focus.js` 仍禁改）；N7 → 由新增的 **LG10/LG11**（链尾两套件升为独立 required local_gate）承载。
> 详见 `plan.md` §4.1（T6/T7 与判据）与 §10（归位表 + 新增候选 N8/N9）。原文字保留不改，仅追加本注。
