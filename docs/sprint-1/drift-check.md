# Sprint 1 Drift Check — baseline 报告

```yaml
sprint: 1
sprint_type: baseline        # Sprint 1 特例：无前序 Sprint
prev_sprint: null
verification_fidelity: baseline
fidelity_tool: skills/kixpower/scripts/verification-fidelity-check.ps1
fidelity_tool_status: unavailable   # 本机无 pwsh → 未运行（降级，不伪造输出）
fidelity_tool_degradation: legacy
baseline_sha: c3c31eb3268622358761cb2035ec84810a12ca11
generated_by: kixpower-producer (Remy)
generated_at: 2026-09-22
```

> **Sprint 1 特例（依 `kixpower-producer.agent.md` §核心职责 5）**：`N == 1` 时没有前序 Sprint，
> **不传 `-PrevSprint 0`**，生成 baseline drift 报告并标记 `verification_fidelity: baseline`。从 Sprint 2 起才与 `N-1` 比较。

---

## 0. 为什么没有跑量化脚本（降级声明，必须留档）

| 项 | 事实 |
|---|---|
| 应执行命令 | `pwsh -NoProfile -File "../skills/kixpower/scripts/verification-fidelity-check.ps1" -ProjectRoot <ROOT> -PrevSprint <N-1>` |
| 本机实际 | **`pwsh` 不存在**（`command -v pwsh` 空）→ 命令不可执行 |
| 处理 | **不运行、不伪造 YAML 输出**；`verification_fidelity: baseline` + `fidelity_tool_status: unavailable` 显式登记 |
| 影响 | 无法量化「上一 Sprint 门禁覆盖率」；Sprint 1 本无前序，量化对象本就不存在 → 对 Sprint 1 判定无实质损失 |
| 后续 | Sprint 2 起若仍需量化，需先解决 OQ6（Node 等价实现，Sprint+1 候选 N2）。**不得把本报告当作量化 fidelity 证据** |

---

## 1. Context Drift（上下文漂移）

| 检查 | 结论 |
|---|---|
| `PROJECT_BRIEF.md` 是否存在 | 本 Sprint 首次生成（14 章，Sprint 1 规划期由 Producer 创建）|
| `.kixpower/memory/repo/` 是否初始化 | 本 Sprint 初始化（`lessons-learned.md` + `harness-backlog.md`）；此前不存在 |
| 是否存在 legacy memory（`/memories/repo/` 或仓库 `memories/`）| 仓库顶层 `memories/` 存在，但它是 **preset 分发资产（kix-mem 经验库）**，性质不同 → 按合约**只读**，**不与 `.kixpower/memory/repo/` 双写**；已登记为 `legacy_ref: memories/`（无冲突，非迁移对象）|
| 上一 Sprint 的 runtime-context / lessons / progress | 不存在（Sprint 1 无前序）|
| 任务上下文与实测的一致性 | **1 处偏差**：上下文称「工作树干净」，实测有 1 个 untracked `docs/.kixpower-current-sprint` → 已登记（runtime-context §5、plan OQ7）|

**结论**：context drift 无（无前序可比），但存在 1 处**前提事实偏差**已修正留痕。

## 2. Error Propagation（错误传播）

| 检查 | 结论 |
|---|---|
| 是否存在「上一 Sprint 已知但未修的缺陷」被带入 | 无前序 Sprint；但**仓库自带历史缺陷**进入本 Sprint：`install-lib.test.js:207` 幂等红（自 v1.3.13 引入）|
| 该缺陷是否已在文档中被「声称解决」| ✅ 是 —— `CHANGELOG.md:55`（v1.3.13）声称「复制保留 mtime 使重复安装幂等」，而该声称在本平台不成立 → **文档层错误传播**（比代码缺陷更危险：读者据文档认为已解决）|
| CI 是否可能传播该错误 | ✅ 是 —— CI 无 macOS，该红在 CI 永不可见（R1）；且 `npm test` 的 `&&` 链使 4 条红**遮蔽整条门禁链**（链首之后本机覆盖 = 0）|
| skip 是否传播「假绿」| ✅ 是 —— `node --test` 的 skip 不改变 exit code；本机 25 用例中 5 条将 skip → 若不显式登记，会被读成「25 条全绿」（R2）|
| 处置 | T1/T2（红转绿）、T3（macOS 可见性）、T4（skip 门禁化）、T5（文档勘误）—— 本 Sprint 的 5 个任务**全部**是 error propagation 的直接对策 |

**结论**：error propagation = **高**。本 Sprint 范围与此检查高度吻合，无范围外遗漏项被识别。

## 3. Tech Debt（技术债）

| 项 | 描述 | 本 Sprint 处置 |
|---|---|---|
| TD1 | 同一文件内 5 条 pwsh 依赖用例存在**两套 skip 判据**（3 条只有平台判断、2 条有 ENOENT 探针）| T1 + T4 统一 |
| TD2 | 幂等判据 `Math.round(mtimeMs/1000)` 的**边界稳定性未证明**（OQ1）；比较口径与注释（「utimes 只有秒级精度」）**自相矛盾** | T2 取证裁定 |
| TD3 | `ensureDefaultSkillsShelf` 是 `ensureDefaultShelf('skills')` 的**别名包装**，生产路径不经过它，仅测试使用 → 存在「测试覆盖的是别名而非生产调用形状」的隐患 | 本 Sprint 不重构（范围外）；登记为 Sprint+1 观察项 |
| TD4 | `verification-fidelity-check.ps1` 等 kixpower 工具链**强依赖 pwsh**，在 macOS 原生环境不可运行 | OQ6 / N2 |
| TD5 | CI 无 macOS（D8）| T3 |
| TD6 | 本机无 pwsh → `.ps1` 类资产的本地可执行面为 0；hooks 在 DSH 下不自动触发，仅靠 prompt 约束 | N4（Sprint+1）|

**结论**：tech debt 中 TD1/TD2/TD5 进入本 Sprint；TD3/TD4/TD6 明确**移出**（范围外，已登记）。

## 4. Verification Fidelity（门禁覆盖率量化）

> **本项降级**：`verification_fidelity: baseline`（Sprint 1 特例）+ `fidelity_tool_status: unavailable`（无 pwsh）。
> 下面为**手工 baseline 快照**，仅描述当前状态，**不是**覆盖率量化输出。

| 门禁 | baseline 状态 |
|---|---|
| `npm run test:installer` | ❌ 红（25 用例：19 pass / 4 fail / 2 skip）|
| `npm run test:consistency` | ✅ 绿（CONSISTENCY OK；brief 已核）|
| `npm run test:pressures` | ⚪ 本机未执行（被 `npm test` 链首红遮蔽）|
| `npm run test:vision` | ⚪ 本机未执行（同上）|
| `dsh/preset/plugins` 套件（16 个 `*.test.js`）| ⚪ 本机未执行（同上）|
| `cd en && npm test` | ⚪ 未实测（OQ2）|
| CI（ubuntu + windows）| ✅ success @ baseline（run 34699043255）|
| CI（macOS）| ❌ 不存在该 job |

**本机有效门禁覆盖**：`&&` 链首之后 = **0**（4 条红遮蔽全部后续步骤）。
**CI 覆盖缺口**：macOS 平台 0 覆盖；`skipped` 无门禁语义（skip 计入绿）。

**影响判定**：本项按 `high_risk` 处理（覆盖率远低于可用阈值）→ 依 `kixpower-producer.agent.md` §核心职责 6，
「verification-fidelity 报 high_risk（>20% 未门禁）时，强制扩展新 plan.md 的 `target_rules` 覆盖前一 Sprint 漏掉的范围」。
Sprint 1 无前序 Sprint，故该强制扩展的**作用对象是当前的漏门禁面本身**：

| 漏门禁面 | 本 Sprint plan 的覆盖 |
|---|---|
| macOS 平台（pwsh 存在性差异）| T1 `target_rules.globs: scripts/sync-dsh-preset.test.js` |
| macOS 平台（mtime/文件系统语义）| T2 `globs: scripts/install-lib.js, scripts/install-lib.test.js, en/scripts/install-lib.js` |
| CI 平台矩阵 | T3 `globs: .github/workflows/ci.yml` |
| `skipped` 计数语义（假绿）| T4 + `manual_gate MG1` + `ci_gate CG2` |
| 文档声称（错误传播载体）| T5 `globs: CHANGELOG.md` |

## 5. 对 plan.md 的输入（drift-check 结论）

| # | 结论 | 已落入 |
|---|---|---|
| DC1 | 本 Sprint 第一优先级是**解除链首红**（否则后续门禁全不可测）| plan LG5 说明 + §1 G-A |
| DC2 | 错误传播的两个载体（CI 平台缺口、文档声称）必须与代码修复**同 Sprint** 处理 | T3、T5 |
| DC3 | skip 必须有门禁语义，否则 T1 会把「3 条 fail」变成「3 条假绿」| T4 + MG1 |
| DC4 | T2 的根因未确证 → 必须先取证 | T2 步骤 A + MG3 + OQ1 |
| DC5 | TD3/TD4/TD6 移出本 Sprint，登记为 Sprint+1 候选 | plan §10 N1/N2/N4 |

## 6. harness-backlog 消费检查（Sprint 启动回归）

```yaml
backlog_path: .kixpower/memory/repo/harness-backlog.md
items_total: 2
items_archived: 0
consumed_this_sprint: 0
created_this_sprint: [HB-1, HB-2]
unmatched_runs_incremented: []
note: >-
  HB-1 / HB-2 均为本 Sprint 规划期**新建**的 candidate（origin = Sprint 1），
  eval.applies_to_sprints = ">=2"。二者不计入 unmatched_runs：本 Sprint 是它们的 origin，
  且 origin == 潜在 trial 会构成自我确证（无效试验不能验证经验）。
  Sprint 2 起若 trigger 匹配，才按 scoped trial 应用并追加 pending evidence。
no_legacy_duplication: true
legacy_ref: memories/            # preset 经验库（只读，非 canonical root，不做双写）
```
