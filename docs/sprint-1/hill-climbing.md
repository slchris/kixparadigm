# Sprint 1 — L4 Hill Climbing（实践学习）

```yaml
sprint: 1
stage: l4
generated_at: 2026-09-22
actor: orchestrator
l4_actor_note: "orchestrator 自执行（不调子 agent）；本文件是观测与候选生成，不是规则晋升"
final_head: a3cdfb18b55ee16027bf268e6de7472343a611d2
sprint_baseline_sha: c3c31eb3268622358761cb2035ec84810a12ca11
novel_evidence: true
patterns:
  silent_failure: 0
  goal_drift: 0          # true_out_of_scope = 0（变更全部落在 target_rules 或 drift_whitelist）
  l2_failed: 1           # 首次 L2 判读发现 LG5/LG6 红（@ c43d36e）→ 触发重规划而非重试
  over_budget: 1         # 8 commits / derived 7（含本收尾提交；见 §4）
  claim_evidence_failure: 1   # baseline 缺陷特征化被反证（见 §5）
verification_fidelity: baseline_degraded   # canonical fidelity 脚本依赖 pwsh，本机不可执行
```

> **生成依据**：`docs/sprint-1/progress.md` 的 Trace Log、`docs/qa/qa-signoff-1.md`、`git log c3c31eb..HEAD`。
> 本文件只产出 candidate 资格，**不晋升规则**；新经验写入 `.kixpower/memory/repo/harness-backlog.md`（`status: candidate`）。

---

## 1. Trace 聚合（按 stage）

| # | stage | 阶段合法信号 | 实际产物 | result |
|---|---|---|---|---|
| 1 | `producer_planning` | planning artifact | PROJECT_BRIEF 14 章 / brainstorm（6 角色 4 次分歧）/ plan / progress / runtime-context / drift-check / memory 初始化（1243 行）| observed |
| 2 | `observe_pre_dev` | planning artifact + 状态迁移 | `status: planning → in-progress`；发现 `kix-guards:1250` 硬 deny main 分支 commit → 建 feature 分支 | observed |
| 3 | `dev` (T1–T5) | 实现 artifact 增长 | 4 文件变更 + 4 commit；`test:installer` 由 19/4/2 → 20/0/5 | observed |
| 4 | `l2_precheck` | gate 状态 | LG1–LG4 绿；**LG5/LG6 红**（唯一红 = `kix-focus.test.js` macOS 夹具）| l2_failed |
| 5 | `producer_replan` | plan artifact 修订 | 新增 T6/T7、LG10/LG11、MG5/MG6；`derived_commit_budget` 5→7（bug_reserve 证据化）| observed |
| 6 | `dev` (T6–T7) | 实现 artifact 增长 | 4 副本夹具归一化 + CHANGELOG 追加；2 commit | observed |
| 7 | `l2` | 全量 required gate | **8/8 exit 0** @ `a3cdfb1`；manifest digest 已记录 | observed |
| 8 | `qa` | signoff + gate evidence | `qa-signoff-1.md`：CONDITIONAL（ci_pending）+ 7 findings + 4 残余不确定 | observed |
| 9 | `l4` | hill-climbing 报告 | 本文件 | observed |

**无 `silent_failure`**：每个 stage 都产出了该阶段矩阵要求的合法信号（含 `l2_failed` 这一负向但合法的信号）。

---

## 2. 期望 vs 实际 vs 反证

| 期望（规划期） | 实际 | 反证 / 修正 |
|---|---|---|
| 4 条红 = 4 个独立缺陷，逐个转绿 | 3 条是「缺 pwsh 探针」的同一根因；第 4 条（kix-focus）是**修好链首后才暴露**的第 5 条红 | 基线口径被推翻：真实红数在链路可执行后才可数（见 §5） |
| `npm test` 链首绿即整体绿 | 链首绿后链尾立即暴露 1 条既有红 | `&&` 链的遮蔽效应是**结构性**的，不是一次性事故 |
| T2 是「安装器幂等真缺陷」，基线可复现 | HEAD 代码确实修掉了该缺陷（受控 A/B：同 mtime 下 baseline 19/1 → HEAD 20/0） | 但 baseline 的「19/1」**不可在 fresh checkout 复现**（依赖未入库 mtime）→ 见 §5 |

---

## 3. Pending trial 评估

| 项 | 本 Sprint trial 结果 | 学习状态 |
|---|---|---|
| HB-1（能力探针 skip 判据）| `not triggered` —— 其 origin 即本 Sprint，同一 Sprint 不能充当自己的 trial（自我确证无效）| 保持 `candidate` |
| HB-2（链式门禁基线的表述与计数纪律）| `not triggered`（同上）| 保持 `candidate` |

> `not triggered` **不等于** pass。两项的 `applies_to_sprints: ">=2"`，Sprint 2 起才可能被独立匹配。

---

## 4. `over_budget` 记录（诚实结算，不改写预算）

| 项 | 值 |
|---|---|
| `derived_commit_budget` | 7（δ4 + strong1 + bug_reserve2，L2 前由 Producer 证据化重算）|
| 实际 commits | **8**（含本收尾提交；`git rev-list --count c3c31eb..HEAD` = 7，+1 收尾）|
| over 量 | 1 |
| 原因 | 收尾产物（L4 报告 / done.md / QA signoff / progress L2 字段固化）在公式中未被计为一个 DAG 层；这是**预算模型的已知盲点**，不是提交粒度失控 |
| 处置 | 按 TEAM_CONVENTIONS 红线：**不回头改写 `commit_budget` 来宣称 zero over_budget**；记录 overage（8/7）并作为 candidate 输入 → **HB-6**（收尾产物层未入公式）|

---

## 5. `claim_evidence_failure` 记录（本轮唯一一条）

| 项 | 内容 |
|---|---|
| 被推翻的 claim | 「本机基线 `test:installer` = 19 pass / 1 fail，其中 1 fail 是安装器幂等的**可复现**真缺陷」 |
| 推翻者 | QA（`qa-signoff-1.md` F-1 / `lessons-learned.md` LL-7），受控 A/B 实测 |
| 反证 | `install-lib.test.js` 的幂等断言以**未入库的工作树 mtime**为输入。fresh checkout（仓库外 worktree @ `c3c31eb`）中落在失败带的文件数 = **0** → 该 checkout 上 baseline 为 **20 pass / 0 fail**；只有把 3 个文件 mtime 置回记录带内值才复现 19/1 |
| 仍然成立的部分 | HEAD 代码在同 mtime 条件下由 19/1 → 20/0，**修复本身成立**（这是受控 A/B，不是测试自证） |
| 教训（已入 lessons-learned LL-7）| 凡断言依赖「未入库的文件系统状态」，其红/绿必须标注该状态值或把状态构造进 fixture；复核 baseline 声称必须换 checkout 重跑 |
| 对流程的含义 | 本 Sprint 的「4 条红」叙述从一开始就**过于确定**：其中 1 条依赖机器状态。基线特征化需要「可复现性」这一维度，不只是「存在失败」 |

---

## 6. 门禁保真度（verification_fidelity）

| 项 | 状态 |
|---|---|
| canonical 度量脚本 | `skills/kixpower/scripts/verification-fidelity-check.ps1` —— **本机无 pwsh，不可执行** |
| 本 Sprint 口径 | `baseline_degraded`：`drift-check.md` 为手工 baseline 报告（无上一 Sprint 可比较）|
| 已量化的替代指标 | required local gate 8/8 exit 0 @ `a3cdfb1`；变更文件 9 个全部落在 `target_rules` 或 `drift_whitelist`（`true_out_of_scope = 0`）|
| 残余风险 | 「上一 Sprint 未门禁范围 >20% → 强制扩展 target_rules」这条规则在本机**无法机械判定**（依赖不可执行的脚本）|

**canonical memory lifecycle validator**：`.ps1` 不可执行 → 用**逐条忠实移植**的 Node 实现替代
（`/tmp/kix-validate-memory-backlog.cjs`，来源 `validate-memory-backlog.ps1` + `kixpower-contract.ps1:187-196` 的 SHA-256 语义）。
结果：`memory_backlog: valid` / `record_count: 2` / `legacy_unstructured_records: 0` / exit 0；
并跑 4 组负向控制（缺 status、重复 id、validated 缺 trial/pass、archived 缺 archive_reason 语义）确认**非恒真**。
**移植等价性未在具备 pwsh 的宿主上对拍** → 登记为残余不确定（见 §8）。

---

## 7. 本轮新增 candidate（写入 harness-backlog.md）

| ID | 类型 | 一句话 |
|---|---|---|
| HB-3 | plan-template | 链式 canonical 入口（`&&`）的**每一段**都必须成为 plan 里的独立 required gate；否则链首红会静默把链尾覆盖降为 0 |
| HB-4 | qa-workflow | 测试的 hermetic 性：断言不得依赖未入库的工作树状态（mtime/权限/顺序）；依赖则必须显式构造进 fixture |
| HB-5 | tooling | L2 manifest digest 的复算不得依赖单一平台（pwsh）；plan 必须写明规范化规则，使第三方可独立复算 |
| HB-6 | plan-template | `derived_commit_budget` 的 `base = dag_layers` 不为收尾产物层（done/hill-climbing/QA signoff/L2 字段固化）留位 → 每 Sprint 稳定超 1 |

> 四项均为 `status: candidate`，`applies_to_sprints: ">=2"`，不得在 Sprint 1 内自我确证。
> 其中 HB-6 由**收尾期 blast-radius 结算提醒**触发（实际 8 vs derived 7），是本 Sprint 唯一由机制提醒
> 而非由 QA/Dev 发现驱动的 candidate。

---

## 8. 未解决 / 残余不确定（交人或交 Sprint 2）

| ID | 内容 | 可判定 falsifier |
|---|---|---|
| U-1 | `l2_gate_manifest_sha256 = 46121655…` 未能在本机字节级复算（QA 80 组候选规范化均不匹配；canonical 实现依赖 pwsh）| 在具备 pwsh 的宿主上按 `kixpower-contract.ps1:173-185` 复算，应等于该值；不等即 digest 记录有误 → L2/QA 需重绑 |
| U-2 | 移植版 backlog validator 与 `.ps1` 原版**未对拍** | 在具备 pwsh 的宿主上跑原版，应输出相同的 `record_count` / `legacy_unstructured_records` / 退出码 |
| U-3 | CI 侧证据全缺（CG1/CG2/CG3 pending）：fork 无 workflow 注册、无 PR 授权 | 用户授权 push/PR 后跑 CG1→CG2，macOS job 的 `npm test` 应出现真实运行记录与 `# skipped 0` |
| U-4 | `preset-classic` / `preset-null` 两个插件副本**不被任何 npm script 执行**，仅由 LG2 保证字节一致 | Sprint 2 评估把两副本纳入执行（OQ8 / N8）|
| U-5 | T2 幂等用例的 mtime 依赖未修复（F-1）| Sprint 2 把 mtime 边界构造进 fixture 后，该断言应在任意 checkout 上都有区分力 |

---

## 9. 结论

- 本 Sprint 的**最高价值发现**不是「修了 4 条红」，而是**门禁的结构性不可见**：`&&` 链遮蔽链尾（暴露 1 条既有红）+ CI 矩阵缺 macOS（本机真实红对 CI 永不可见）+ 安装器幂等断言依赖未入库状态（fresh checkout 不触发该分支）。
- 三项全部转化为 HB-3/HB-4/HB-5 candidate，**未晋升为规则**。
- 门禁保真度受「本机无 pwsh」限制，两处 canonical 工具（fidelity check / memory validator）以**移植 + 负向控制 + 对拍缺口登记**的方式降级使用。
