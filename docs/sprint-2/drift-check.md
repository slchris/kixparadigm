# Sprint 2 Drift Check — Sprint 1 → Sprint 2

```yaml
sprint: 2
sprint_type: incremental
prev_sprint: 1
verification_fidelity: unavailable   # 降级：canonical 脚本仍是 .ps1，本机无 pwsh（P0 正是要修这一点）
fidelity_tool: skills/kixpower/scripts/verification-fidelity-check.ps1
fidelity_tool_status: unavailable
fidelity_tool_degradation: legacy
baseline_sha: ef6a48550a40bf433555790419fd4c2fd0cf1483
prev_sprint_final_sha: a3cdfb18b55ee16027bf268e6de7472343a611d2
generated_by: kixpower-producer (Remy)
generated_at: 2026-09-22
```

> **输入**：`docs/sprint-1/{done,hill-climbing,progress}.md`、`.kixpower/memory/repo/{harness-backlog,lessons-learned}.md`、
> `PROJECT_BRIEF.md`、`docs/sprint-2/runtime-context.md`。
> 本报告是 `docs/sprint-2/plan.md` 的输入之一（`kixpower-producer.agent.md` §核心职责 5）。

---

## 0. 为什么仍没跑量化脚本（降级声明，必须留档）

| 项 | 事实 |
|---|---|
| 应执行命令 | `pwsh -NoProfile -File "../skills/kixpower/scripts/verification-fidelity-check.ps1" -ProjectRoot <ROOT> -PrevSprint 1` |
| 本机实际 | **`pwsh` 不存在**（`command -v pwsh` 空）→ 命令不可执行 |
| 处理 | **不运行、不伪造 YAML 输出**；`verification_fidelity: unavailable` + `fidelity_tool_status: unavailable` 显式登记 |
| 与 Sprint 1 的差别 | Sprint 1 是 `baseline`（**量化对象不存在**，无实质损失）；Sprint 2 是 **`unavailable`（量化对象存在但工具不可执行 → 有实质损失）**。这正是 P0 第三条交付要消除的降级 |
| 解除条件 | `plan.md` T3 交付 `verification-fidelity-check.cjs` 后，**在 Sprint 2 内**对 Sprint 1 跑一次并把输出**追加**到本文件（Sprint 1 的手工 baseline 报告在 `docs/sprint-1/drift-check.md`，只读不改）→ 对应 `plan.md` LG11 |

---

## 1. Context Drift（上下文漂移）

| 检查 | 结论 |
|---|---|
| `PROJECT_BRIEF.md` | 存在，14 章；§7/§8/§9 已由 Sprint 1 收尾更新至 `a3cdfb1` 口径 |
| `.kixpower/memory/repo/` | 存在（`lessons-learned.md` 7 条 LL-1..LL-7；`harness-backlog.md` 6 项 HB-1..HB-6，全部 `candidate`）|
| legacy memory | 仓库顶层 `memories/`（preset 分发资产）→ 按合约**只读**，不与 `.kixpower/memory/repo/` 双写（无冲突） |
| 上一 Sprint 的 runtime-context / lessons / progress | 均存在且可读（Sprint 1 三份文档齐备）|
| **`.` marker 与状态** | `docs/.kixpower-current-sprint` = `2`（untracked）；`docs/sprint-1/progress.md` = `status: done`（非 stalled）|
| 任务上下文与实测的偏差 | **2 处**：① 「Sprint 1 的 8 个 commit」实测 **9**（`git rev-list --count c3c31eb..HEAD`；多出 `ef6a485`，message 自述前次受 commit 硬上限阻塞）；② 「工作树干净」实测有 1 个 untracked marker（Sprint 1 OQ7 未解）。两处均**只追加登记，不改写 Sprint 1 文档**（`plan.md` OQ0 / OQ3）|

**结论**：context drift 无结构性缺失；2 处**前提事实偏差**已留痕。**memory 状态机健康**：`{candidate: 6, validated: 0, archived: 0}`，
Sprint 2 是这 6 项 `applies_to_sprints: ">=2"` 的**首次独立匹配窗口**（Sprint 1 因 origin == 自身全部 `not triggered`）。

## 2. Error Propagation（错误传播）

| 传播链（Sprint 1 → Sprint 2） | 状态 | 处置 |
|---|---|---|
| **文档声称**「复制保留 mtime 使重复安装幂等」（`CHANGELOG.md:55`）→ 已被 macOS 实测反证 | Sprint 1 T5 已追加勘误 + 平台限定（纯追加 `58 0`）；**代码缺陷已修**（受控 A/B 19/1 → 20/0） | 不再传播。但**断言的 hermetic 性缺陷（F-1）仍开放** → `plan.md` §10-N3（本 Sprint 不做） |
| **门禁数字未标平台**（`CHANGELOG.md:40`）→ 读者误以为 59/0/1 是普适值 | Sprint 1 T5/T7 已写双口径 | 关闭 |
| **`skip` 被读成通过**（`node --test` 的 skip 不改 exit code） | Sprint 1 T4 用**文案 + 计数**约束（`pass 20 ≠ 25`），但仍是**文本层**约束 | **本 Sprint 升级为机械维度**：`host_requires` + `unavailable` 不计入通过（`plan.md` T1 步骤 C / §1.2）→ 直接对治 HB-2/HB-4 的根因 |
| **`&&` 链首红遮蔽链尾**（LL-3；Sprint 1 因此晚发现 kix-focus 夹具红） | Sprint 1 加了 LG10/LG11 | **本 Sprint 落实为完整纪律**：zh 链 5 段 + en 链链尾段各自独立 required gate（HB-3 scoped trial，`plan.md` §7.1） |
| **`pwsh` 依赖的指令级硬要求**（4 处文档**逐字要求**执行 `.ps1`） | Sprint 1 只把测试 skip 化，**指令本身仍不可执行** | **本 Sprint 的主交付**：P0 提供 Node 替代 + 改写 4 处调用点（`plan.md` §1.1 代价表、T2/T3） |
| **L2 信任凭据不可复算**（`l2_gate_manifest_sha256`，R-1/U-1/HB-5） | Sprint 1 记为 advisory（F-3），未解决 | **本 Sprint 必须给出规范化规则 + 复算结论**（HB-5 scoped trial，`plan.md` §7.2 / LG9 / MG3） |
| **移植实现未对拍**（U-2：`/tmp/kix-validate-memory-backlog.cjs` vs 原版 `.ps1`） | Sprint 1 登记为残余不确定 | **本 Sprint 关闭**：T2 的 `U2-parity:` 行（`plan.md` MG4） |
| **skills/ 副本无守护且已漂移**（新发现：517 vs 507，守护仍 OK） | **Sprint 1 未发现** | 本 Sprint **只阻断新 `.cjs` 的同类风险**（T4 镜像登记）；已存在的 `.ps1` 漂移登记为 `ps1-drift:` 并留 Sprint+1（N1） |

## 3. Tech Debt（技术债）

| 债项 | 量 | 处置 |
|---|---|---|
| `.ps1` 总量 | **53 文件 / 12,964 行 / 4 副本**（`skills/kixpower` = 源、`dsh/preset-classic`、`en/preset-classic-en`、`dsh/preset` 走 symlink） | 本 Sprint 只 Node 化 **4 个文件**（3 trust-chain + `sync-dsh-preset`，共 1,123 行；其中 `kixpower-contract` 517 / `verification-fidelity-check` 320 / `sync-dsh-preset` 197 / `validate-memory-backlog` 89）。其余 **49 文件 / ~11,841 行**明确列为 non-goal（`plan.md` §2）→ 候选 N2 |
| 分层明细 | hooks 10 个（~2,129 行，**DSH 上为死引用**）/ 编排 scripts 5 个 + `tests/run-contract-regression.ps1` 864 / dev 工具 `sync-dsh-preset` 197 + `ensure-vision-bridge` 98 + `install-kix-stalled` 62 / `install.ps1` 238 | 同上 |
| 死 frontmatter | DSH 面向 agent 面 **10 个 `hooks:` 块**（classic 5 + en 5） | **本 Sprint 清**（P1 / T5）。`hooks/*.ps1` **文件保留**（Copilot 路径仍活） |
| 未守护镜像面 | `skills/kixpower/scripts/*`（3 副本，已漂移）+ `dsh/preset-classic/skills/**` 的语法解析盲区 | 前者登记不修；后者**本 Sprint 修**（T4 步骤 B，机械改动） |
| 结构性债（跨 Sprint） | `warn_threshold = δ*3 + reserve` 在 δ≥3 时接近 `hard_cap`；`base = δ` 不为收尾层留位（HB-6） | HB-6 本 Sprint 以 **scoped trial** 显式计入 `closeout_layer: 1`（`plan.md` §6）；公式本身不动（N6） |

## 4. Verification Fidelity（量化，降级）

| 项 | 状态 |
|---|---|
| canonical 度量脚本 | `.ps1` → **不可执行**（本机无 pwsh） |
| 本 Sprint 口径 | `unavailable`：**量化对象存在**（Sprint 1 有完整 gate 记录）但工具不可执行 → 这是**实质性**降级（不同于 Sprint 1 的 baseline） |
| 已量化的替代指标 | Sprint 1 终态 required local gate **8/8 exit 0** @ `a3cdfb1`；`npm test` / `cd en && npm test` 双 exit 0；变更 18 文件全部落在 `target_rules` 或 `drift_whitelist`（`true_out_of_scope = 0`） |
| **>20% 未门禁 → 强制扩展 `target_rules`** 这条规则 | 本机**仍无法机械判定** → Sprint 2 的 `target_rules` **按覆盖优先设定**（不因无法量化而收缩）：三个 `.cjs` 的 3 副本组、4 副本 `consistency-lib.cjs`、12 个 agent 文件、4 处调用点文档、`TEAM_CONVENTIONS.md` 3 副本全部显式列入 |
| 解除条件 | `plan.md` LG11（T3 交付后对 Sprint 1 实跑并追加输出到本文件） |

---

## 5. 本 Sprint 的输入结论（drift-check → plan.md）

1. **最高优先级**：`pwsh` 缺失造成的三项**已支付代价**（`baseline_degraded` / 即兴移植未对拍 / digest 不可复算）→ `plan.md` §1.1。
2. **次高**：「skip ≠ 通过」目前只由文案承载 → 升级为 `host_requires` + `unavailable` 机械维度（`plan.md` §1.2）。
3. **必须正面处理**：无 pwsh ⇒ 差分对拍通道缺失 ⇒ 「忠实移植」的证据强度受限 → `plan.md` §7.3 的三腿方案 + §7.4 的 oracle 取舍。
4. **机械风险面**：新 `.cjs` 若无镜像登记会复现 517 vs 507 的漂移 → `plan.md` T4 步骤 B。
5. **HB-6 scoped trial**：`base = δ` 不为收尾层留位 → 本 Sprint 显式计入 `closeout_layer: 1`，使 derived 与「可独立回滚的变更单元」数量一致。

## 6. Sprint 1 → Sprint 2 的 Evals 交接（v4.1）

| 项 | Sprint 1 结果 | Sprint 2 匹配 | 去向 |
|---|---|---|---|
| HB-1 能力探针 skip 判据 | `not triggered` | ✅ | `plan.md` §11（scoped trial）|
| HB-2 链式基线表述与计数纪律 | `not triggered` | ❌（基线全绿） | 保持 `candidate`，记 `not triggered`（**不得记 pass**）|
| HB-3 链式入口每段独立 gate | `not triggered` | ✅ | `plan.md` §7.1 |
| HB-4 hermetic / 环境状态断言 | `not triggered` | ✅ | `plan.md` §11（`host_requires` 把隐含环境依赖显式化）|
| HB-5 manifest digest 平台无关复算 | `not triggered` | ✅ | `plan.md` §7.2 + LG9 + MG3 |
| HB-6 收尾层未入预算公式 | `not triggered` | ✅ | `plan.md` §6 `closeout_layer: 1` |

> **红线**：Sprint 2 的 trial 结果在**收尾期**才可判定；`plan.md` §11 已写清各项的判定时点（HB-1/3/4 于 L2 前，HB-5/HB-6 于 post-sprint），防事后追认。

---

## 7. T3 实测追加：verification fidelity 首次真实运行（2026-09-22，追加不改写 §4）

> §4 的「本机**仍无法机械判定**」结论在 T3 交付后**被本机实测取代**：`verification-fidelity-check.cjs`
> 在无 pwsh 宿主上跑通 Sprint 1 → 2 的量化。**追加式修正**（不改 §4 原文），解除条件即 §4 表格最后一行。

命令（可复算）：

```bash
node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 1
```

实测输出（T3 交付 revision，工作树含 T2/T3 未提交改动）：

```
[Scope Rules]
  globs: 17
  modules: 8 -> 108 expanded
  unresolved_modules: 1
    - github-workflows
  mechanical_links: 12 -> unresolved_offline: 12
  legacy target_files: 0
  total scope globs: 28

[Verification Fidelity]
  total changed: 45
  in_scope (rules): 16
  whitelisted: 29
  ungated: 0 (0%)
  PASS

[Fidelity v5.7 累积度量]
fidelity_v5:
  sprint: 1
  baseline_sha: c3c31eb3268622358761cb2035ec84810a12ca11
  baseline_source: progress.sprint_baseline_sha
  ungated_ratio_pct: 0
  liveness_marked_tasks: 0
  dead_path_tasks: 0
  gated_off_tasks: 0
```

结论与口径：

| 项 | 结果 | 口径说明 |
|---|---|---|
| `verification_fidelity` | 本 §7 单次运行读数 = `0%` ungated（`PASS`）。**该读数只属本 §7 的运行窗口**，已被同文件 §8 的后续运行取代（见下两行与 §9） | 解除 Sprint 1 的 `baseline_degraded`：该指标不再是「不可量化」 |
| Sprint 1 的 `>20% → 强制扩展 target_rules` 规则 | **修订（C5 / F-1）：原结论「实测 0% → 该强制未被触发」作废。** 同一命令、同一窗口（`--prev-sprint 1` ⇒ baseline `c3c31eb`，覆盖 **Sprint 1 + Sprint 2** 改动集）的后续运行 = §8 逐字块 `ungated: 15 (23.4%)`；QA 在冻结 revision `42d3c7e` 的权威复跑 = `22 (27.8%)`。**两次均 > 20% 且均无 `PASS` 行 ⇒ 该强制被触发，且未按规则处置**（登记见 §9） | §4 的「覆盖优先」在**方向上**与该规则一致，但**不是因该规则而设定**（当时本机不可机械判定）→ 属**事后巧合，不构成合规**；该规则的正确处置**结转 Sprint 3** |
| `unresolved_modules: github-workflows` | Sprint 1 计划里的模块名在仓库中不存在 | **计划侧遗留**，不是本工具缺陷；登记为 Sprint+1 候选（见 `progress.md`） |
| `mechanical_links: 12 -> unresolved_offline: 12` | 12 条 `mechanical_links` 全部标 offline | 参照实现未实现在线解析（`unresolved_offline` 恒等于输入数）→ 移植**保持同语义**，不在此处「顺手改进」 |
| 证据强度 | **E2（characterization）+ 真实运行**；**非 E1** | 与 `.ps1` 的逐字节差分仍待 LG10（`host_requires: [pwsh]` → 本机 `unavailable`） |


## 8. Sprint 2 首次真实运行：`verification-fidelity-check.cjs`（T3 步骤「首次真实运行」）

> **性质**：由 Node 移植件（`skills/kixpower/scripts/verification-fidelity-check.cjs`）对
> **Sprint 1 → Sprint 2** 的真实工作树跑出的输出，**追加**在 Sprint 1 手工 baseline 报告之后（上文不改写）。
> **证据强度**：E2（characterization：输出符合从 `.ps1` 反推的固定期望）+ 真实运行；
> **非 E1**（与 `.ps1` 的逐字节差分需 pwsh，`host_requires: [pwsh]` → 本机 `unavailable`）。
> **命令**：`node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 1` → exit 0。

```text
=== Verification Fidelity Check v5.7 ===
Sprint: 1 | Since: 2026-09-22 | Rules: False
Baseline: c3c31eb3268622358761cb2035ec84810a12ca11 (progress.sprint_baseline_sha)

[Scope Rules]
  globs: 17
  modules: 8 -> 108 expanded
  unresolved_modules: 1
    - github-workflows
  mechanical_links: 12 -> unresolved_offline: 12
  legacy target_files: 0
  total scope globs: 28

[Verification Fidelity]
  total changed: 64
  in_scope (rules): 17
  whitelisted: 32
  ungated: 15 (23.4%)
  HIGH_RISK (top 20 ungated):
    - dsh/preset-classic/skills/kixpower/hooks/blast-radius-check.cjs
    - dsh/preset-classic/skills/kixpower/hooks/block-dev-authority-edit.cjs
    - dsh/preset-classic/skills/kixpower/hooks/block-source-edit-qa.cjs
    - dsh/preset-classic/skills/kixpower/hooks/block-source-edit.cjs
    - dsh/preset-classic/skills/kixpower/hooks/lib/
    - en/preset-classic-en/skills/kixpower/hooks/blast-radius-check.cjs
    - en/preset-classic-en/skills/kixpower/hooks/block-dev-authority-edit.cjs
    - en/preset-classic-en/skills/kixpower/hooks/block-source-edit-qa.cjs
    - en/preset-classic-en/skills/kixpower/hooks/block-source-edit.cjs
    - en/preset-classic-en/skills/kixpower/hooks/lib/
    - skills/kixpower/hooks/blast-radius-check.cjs
    - skills/kixpower/hooks/block-dev-authority-edit.cjs
    - skills/kixpower/hooks/block-source-edit-qa.cjs
    - skills/kixpower/hooks/block-source-edit.cjs
    - skills/kixpower/hooks/lib/

[Fidelity v5.7 累积度量]
fidelity_v5:
  sprint: 1
  baseline_sha: c3c31eb3268622358761cb2035ec84810a12ca11
  baseline_source: progress.sprint_baseline_sha
  ungated_ratio_pct: 23.4
  liveness_marked_tasks: 0
  dead_path_tasks: 0
  gated_off_tasks: 0
```

**本轮读数与状态行（C5 / F-1 修订层；上文逐字输出块未改一字）**：本 §8 自己那份输出的实际读数 =
`total changed: 64` / `in_scope (rules): 17` / `whitelisted: 32` / **`ungated: 15 (23.4%)`** / `HIGH_RISK`，
且 `fidelity_v5.ungated_ratio_pct = 23.4` —— **输出中不存在 `PASS` 行**。
原文此处曾写「本轮读数：`ungated: 0 (0%)` → `PASS`」，与本 §8 自身逐字输出**直接矛盾**：那是 **§7 的运行读数**
（`45 / 16 / 29 / 0 (0%)`，见 §7 逐字块），被误抄进 §8 的结论层，并进一步传播到 `progress.md` 三处
（`:55` / `:112` / `:266`，其中 `:55` 的第三组读数 `46 / 17 / 29` 与 §7、§8 两块的逐字输出**均不一致**）。
`unresolved_modules: 1`（`github-workflows`，计划侧遗留）、`mechanical_links: 12 -> unresolved_offline: 12`（与参照实现同语义）两项结论**不变**。

**权威读数（QA 独立复跑 @ 冻结 revision `42d3c7e`）**：`79 / 18 / 39 / 22 (27.8%)`，**无 `PASS` 行**，两次运行逐字节相同（确定性）；
与 QA 签署（`qa-signoff-2.md` §2 的 LG11 行、§9 F-1）一致。

---

## 9. C5 修订登记：`>20% → 强制扩展 target_rules` 规则**被触发且未按规则处置**（F-1；追加不改写 §4/§7/§8 的逐字输出块）

> **本节性质**：对 §7 / §8 结论层的**追加式修订**（原文不删、逐字工具输出块不动）。触发者 = `qa-signoff-2.md` F-1（P2）。
> 修订前的两处矛盾读数（§8 结论行 `:214` 与 `progress.md` 三处传播）已在上文与 `progress.md` 就地改为实际读数并标注。

### 9.1 三次读数的完整台账（同一命令、同一窗口）

```text
命令（逐字）：node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 1

读数 #1  §7 逐字块        total changed 45 / in_scope 16 / whitelisted 29 / ungated  0 (0%)   → PASS        （T3 交付时的工作树）
读数 #2  §8 逐字块        total changed 64 / in_scope 17 / whitelisted 32 / ungated 15 (23.4%) → HIGH_RISK   （层 2 提交后）
读数 #3  QA @ 42d3c7e     total changed 79 / in_scope 18 / whitelisted 39 / ungated 22 (27.8%) → HIGH_RISK   （冻结 revision；两次运行逐字节相同）
读数 #4  Producer C5 复核  total changed 79 / in_scope 18 / whitelisted 39 / ungated 22 (27.8%) → HIGH_RISK   （C5 编辑前工作树；独立复现 #3）
```

> 读数 #4 = 本层在不采信 QA 计数前提下**独立跑同一命令**复现 #3 ⇒「27.8%」不是单点观测。
> 读数 #1 与本层不矛盾（它是另一次运行），矛盾**只在结论层**：§8 的结论行抄了 #1 的数字。

### 9.2 口径声明（R-5，**强制**）

本工具 `--prev-sprint 1` 的窗口 = **Sprint 1 的 baseline `c3c31eb3268622358761cb2035ec84810a12ca11`**（取自 `progress.sprint_baseline_sha`），
即：`total changed` 统计的是 **`c3c31eb` → 当前 HEAD 的全部改动**，**同时覆盖 Sprint 1 与 Sprint 2**（工具输出自证：`Sprint: 1`、`fidelity_v5.sprint: 1`、`baseline: c3c31eb…`）。
因此：

- **禁止**把本工具的任一读数表述为「**本 Sprint**（Sprint 2）的 fidelity」；
- 若要判定「Sprint 2 自身」的未门禁比例，必须换用 Sprint 2 的 baseline（`ef6a485`）重跑 —— **本 Sprint 未做**（工具语义与 plan §7 的 `--prev-sprint 1` 判据均未定义该窗口）；
- 任何引用本指标的结论（含 `done.md`）必须随行声明该窗口。

### 9.3 规则处置（如实登记：**触发且未处置**）

| 项 | 内容 |
|---|---|
| 规则原文 | `kixpower-producer.agent.md` §核心职责 6：若 verification-fidelity 报 high_risk（>20% 未门禁），**强制扩展**新 plan.md 的 `target_rules` 覆盖前一 Sprint 漏掉的范围 |
| 判定 | **触发**：读数 #2 `23.4%`、#3/#4 `27.8%`，两者均 `HIGH_RISK`，均无 `PASS` 行（阈值 20%） |
| 是否按规则处置 | **否 —— 未按规则处置**。Sprint 2 的 `target_rules` 是在**本机不可机械判定**该指标时、按 §4 的「**覆盖优先**」策略设定的（`plan.md` §3 / §4 显式列入：3 个 `.cjs` 的 3 副本组、4 副本 `consistency-lib.cjs`、12 个 agent 文件、4 处调用点文档、`TEAM_CONVENTIONS.md` 3 副本） |
| 正确性质 | **事后巧合，不是合规**：目标集在**方向上**与该规则一致（覆盖了当时可识别的漏检面），但设定动机是「无法量化 → 保守取全覆盖」，**不是**「指标报 high_risk → 按规则扩展」这一因果链。把「结果看起来够全」当作「规则已被遵守」是**倒因为果** |
| **不得**这样写 | ① 不得写「该强制**未被触发**」（§7 原结论，已作废）；② 不得写「已**合规**」；③ 不得用读数 #1 的 `0%` 代表本窗口 |
| 结转 | **Sprint 3**：以**可判定窗口**（`--prev-sprint 2`，即 `ef6a485` → Sprint 2 终态）复核 —— 若仍 >20%，则**真正执行**「扩展 `target_rules` 覆盖 Sprint 2 漏检面」的机械动作，并把扩展结果写进 Sprint 3 的 plan；本层只登记，不代 Sprint 3 决策 |
| 对 `done.md` 的约束 | `done.md` **不得**宣称「覆盖率 PASS」；只能记「LG11 exit 0（gate 字面判据成立）+ `ungated 27.8%`（窗口 = Sprint 1 + Sprint 2）→ 遗留规则待 Sprint 3 处置」 |

### 9.4 影响面（F-1 的边界，与 QA 一致）

- LG11 的**字面判据仍成立**：exit 0 + `[Verification Fidelity]`/`fidelity_v5:` 两段存在 + 非 `baseline_degraded` ⇒ **不构成 gate 失败**（13/13 required exit 0 的结论不受影响）。
- 受影响的是**结论层**：任何据此声称「未门禁比例 0%」「覆盖率 PASS」的表述无证据支撑，已在本层就地修正。
- 逐字工具输出块（§7 / §8 的 ```text 块）**未改一字**（工具输出不可改写）；修正只落在结论与解释层。
