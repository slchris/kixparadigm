---
sprint: 1
status: in-progress
last_updated: 2026-09-22
completed_tasks: 4
total_tasks: 5
blocked_tasks: 0
open_issues: {P0: 0, P1: 0, P2: 0}      # 上游 Issues 已禁用（hasIssuesEnabled: false），缺陷只登记在本文件与 plan.md
artifacts_changed_since_last_observe: []
observe_fingerprint: c3c31eb3268622358761cb2035ec84810a12ca11   # 规划期 = baseline；每次 Dev 分派前由 orchestrator 刷新
sprint_baseline_sha: c3c31eb3268622358761cb2035ec84810a12ca11   # 首次 Dev 前的 HEAD（完整 40 位）
dev_self_tests_passed:
  - "test:installer @ T1+T4 — 25 tests / 19 pass / 1 fail / 5 skip（本机无 pwsh；剩余 1 fail 为 T2 幂等红，T2 修复后应转 20/0/5）"
  - "test:installer @ T1+T2+T4 — 25 tests / 20 pass / 0 fail / 5 skip（LG1）"
  - "test:consistency @ T2 — CONSISTENCY OK + install-lib.js 2 copies byte-identical（LG2）"
  - "installer E2E 幂等 @ T2 — 临时 DSH_HOME 连跑两次：第 2 次 新增 0 / 更新 0 / 相同 119+112（独立于测试断言的证据）"
l2_verification_passed: []
l2_verified_sha: null                    # placeholder — orchestrator 在 L2 完成后写入完整 40 位 SHA
l2_gate_manifest_sha256: null            # placeholder — plan 中全部 required local_gate 规范化 manifest 的 SHA-256
l2_stash_refs: []                        # placeholder — L2 完成时的 git stash 引用快照
qa_started_sha: null                     # placeholder — QA 启动时必须 == l2_verified_sha == HEAD
qa_verified_sha: null                    # placeholder — QA PASS/CONDITIONAL 证据对应的完整 HEAD
qa_gate_manifest_sha256: null            # placeholder — QA 签署时复核的同一 local_gate manifest
qa_test_changes: []
qa_session_marker: docs/.kixpower-qa-session.json
ci_pending: true                         # 规划期 CI 未跑；CONDITIONAL 只能因 CI gate pending
topology_used: sequential                # 规划期推荐拓扑（plan.md force_sequential: true；无强制时 ω=2,γ=0.26 → hybrid）
blast_radius:
  commit_budget: 5                       # = plan.md task_sizing.derived_commit_budget（δ3 + strong1 + bug_reserve1）
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
| T5 | CHANGELOG 已反证声称追加平台限定/勘误（不改历史数字）| [ ] | T1–T4 | 需要最终门禁数字稳定后写 |

**合计**：5 任务，4 完成，0 阻塞。

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
