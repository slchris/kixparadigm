# Sprint 2 — L4 Hill Climbing（实践学习）

```yaml
sprint: 2
stage: l4
generated_at: 2026-09-22
actor: kixpower-producer (Remy)
l4_actor_note: "Producer 自执行（不调子 agent）；本文件是观测与候选生成，不是规则晋升；晋升只走 harness-backlog 的三态机"
final_head: 42d3c7efdd1dfcdf8aba4ba933713547d83e5247
sprint_baseline_sha: ef6a48550a40bf433555790419fd4c2fd0cf1483
novel_evidence: true
patterns:
  silent_failure: 2          # ① LL-8：installer 占位符契约空洞 + 无条件 ok 播报（D-1）② F-1：结论层与自己那份逐字输出矛盾并被传播 3 处
  goal_drift: 0              # 无未申报的范围变更（C5 的 5 处文档扩张由 F-2 授权，已留痕）；⚠ 与 ungated 27.8% 不是同一件事，见 §4
  l2_failed: 0               # L2 一次通过：13/13 required local_gate exit 0 @ 42d3c7e
  over_budget: 0             # 5 commits / derived 6（见 §3 的结算与依据）
  claim_evidence_failure: 2  # R-1 根因表述「单轴→双轴」；LL-9 覆盖面「9/10 hook 通吃→仅 block-*-edit 三者」（两起均为独立观察修正，核心主张未被推翻）
verification_fidelity: HIGH_RISK   # ungated 22 (27.8%)，窗口 = --prev-sprint 1 ⇒ baseline c3c31eb（覆盖 Sprint 1 + Sprint 2）
fidelity_window_declared: true     # R-5：任何「本 Sprint fidelity」表述都须声明该窗口；本文件与 done.md 均已声明
```

> **生成依据**：`docs/sprint-2/progress.md` 的 Trace Log、`docs/qa/qa-signoff-2.md`（§2/§4/§5/§6/§9/§11）、
> `git log --oneline ef6a485..HEAD`、`drift-check.md` §7–§9。
> 本文件只产出 candidate 资格与**如实计数**，**不晋升规则**；新增/晋升一律落在 `.kixpower/memory/repo/harness-backlog.md`。
>
> **本 Sprint 的一条硬约束（贯穿全篇）**：`>20% 未门禁 → 强制扩展 target_rules` 这条**强制规则被触发但未按规则处置**（§4）。
> 任何「覆盖率良好」的读法都是错的。

---

## 1. Trace 聚合（按 stage）

| # | stage | 阶段合法信号 | 实际产物 | result |
|---|---|---|---|---|
| 1 | `producer_planning` | planning artifact | `plan.md`（1749 行）/ `progress.md` / `runtime-context.md` / `drift-check.md`（`verification_fidelity: unavailable` 降级声明）；`derived_commit_budget` 公式 9 | observed |
| 2 | `dev_layer1` (T1+T5) | 实现 artifact 增长 | `kixpower-contract.cjs` + 2 测试（各 3 副本）、`TEAM_CONVENTIONS.md` 三态 schema ×3、DSH 面 10 个死 hooks 块清理；commit `affc9c7` | observed |
| 3 | `producer_replanning` | plan artifact 修订 | ADR-S2-1（单一 Node 引擎）+ T6–T9 + DAG v2 + sizing v2 + gates v2；**未编辑任何源码**；commit `1479a35` | observed |
| 4 | `dev_layer2` (T2+T3+T6) | 实现 artifact 增长 | validator/fidelity Node 化、`kix-verdict.cjs` + 4 入口、`hook-engine.test.js`；LG15 = 44/44 | observed |
| 5 | `dev_layer3` (T4+T7+T8+T9) | 实现 artifact 增长 | `sync-dsh-preset.cjs`（skip 5→0）、installer fail-closed、`hooks/README.md` ×3、`.ps1` 保留 30 文件；commit `42d3c7e` | observed |
| 6 | `l2` | 全量 required gate | **13/13 exit 0** @ `42d3c7e`；manifest digest `5f4eab16…` **由 canonical 实现产出**（Sprint 1 的临时脚本问题已消除）；附 `independent_finding`（R-1 根因）| observed |
| 7 | `qa` | signoff + gate evidence | `qa-signoff-2.md`：`CONDITIONAL`（唯一理由 `ci_pending`）+ **7 findings（F-1/F-2 = P2，F-3..F-7 = P3，无 P0/P1）** + **6 条残余不确定 R-1..R-6** + 自建注入/控制表（§4 列 12 行，含 4 组控制组证明 `LG16` 非恒真） | observed |
| 8 | `producer_closeout` (C5) | 收尾产物 + 文档修正 | F-1/F-2/F-7 修正、`done.md`、本文件、LL-10..LL-13、HB-8..HB-13、`PROJECT_BRIEF` §8/§11 | observed |
| 9 | `finalize` | 状态迁移 | `progress.status: in_progress → done`；`qa_status: CONDITIONAL`；`over_budget: 0` | observed |

**`silent_failure` 判定口径**：本 Sprint 记 **2**，与 Sprint 1 的 0 不同——两者都是「机制**宣告**了某件事，而被宣告的实质不存在，且**没有任何门禁**察觉」：

| # | 实例 | 为什么是 silent failure（而非显式失败） | 察觉者 |
|---|---|---|---|
| 1 | **D-1 / LL-8**：两个 installer 对 `{{HOOK_LAUNCHER}}`/`{{HOOK_EXT}}` 做替换，而这两个占位符**在任何源文件中都不存在**（只命中 installer 自己的 8 行），替换后**无条件**打印成功；macOS/Linux 上 hooks 因此永不触发 | 安装器**全程报成功**；Windows 因硬编码恰好正确而**不可见** ⇒ 缺陷被「另一平台正常」掩盖 | orchestrator 增量重规划期实测（F11–F14） |
| 2 | **F-1**：`drift-check.md` §8 的**结论行**写 `ungated: 0 (0%) → PASS`，而**同一节自己那份逐字输出**写 `15 (23.4%)` + `HIGH_RISK`（无 `PASS` 行）；同一读数又传播到 `progress.md` 3 处 | 结论层与证据层脱钩后，**没有任何 gate 会失败**（LG11 的 exit 0 仍成立）⇒ 错误读数一路进入 T3 的验收叙述；连「`>20%` 强制规则未被触发」这一**反事实结论**也据此写下 | **QA**（`qa-signoff-2.md` §9 F-1；并经 QA 在冻结 revision 上复跑确证 27.8%） |

> **模式价值**：实例 2 是**本 Sprint 最有价值的机制发现**——它证明「gate 全绿」不覆盖「**结论与证据的一致性**」这一维度。
> 被修正的读数错误方向是**乐观**（0% vs 27.8%），且**顺着它就会漏掉一条强制规则**（§4）。这不是文书瑕疵，是门禁盲区。

---

## 2. 期望 vs 实际 vs 反证

| # | 期望（规划期） | 实际 | 反证 / 修正 |
|---|---|---|---|
| 1 | 本机无 pwsh ⇒ 「忠实移植」无法差分对拍（plan §1.3 核心风险） | 用户**永久否决** pwsh（含一次性 oracle）⇒ E1 **本地永久不可达**，不是「暂时缺工具」 | plan §16.2 v2：证据锚点整体迁移到 **E0（既有 JS 测试网）+ E2（characterization + 负向控制 + mutation probe）**；LG10 移出 required（否则 L2 结构性不可达）；**明令禁止**把 characterization 绿写成「等价」——该禁令全文被遵守（QA §7 逐条检索确认） |
| 2 | 「4 个移植件可在无 pwsh 宿主执行」= 删掉 pwsh 依赖就完事 | T4 完成后 `test:installer` = 32/32/**0 skip**，但 **LG1 的 N=7 不是预填的**（plan 明令不得预填） | 计数由 Dev 实测回填；LG1 的 expect 由 `25` 修订为 `25 + N_copilot_installer`（plan §16.1） |
| 3 | 「hooks 修好 launcher 就能生效」 | 修好「能启动」≠ 修好「跑得对不对」：真实载荷 schema（`toolCalls[]`）与仓库 9/10 个 `.ps1` 读的 `tool_name` 不同 | T6 加 payload 三形态归一化 + **未知形态 fail-closed**；但**真实宿主语义仍未取证**（OQ8/OQ9/R-2） |
| 4 | T3 首次真实运行「`ungated 0%` → PASS」（§7 那次确实是） | 层 2 提交后同一命令 = `15 (23.4%)`；QA @`42d3c7e` = `22 (27.8%)` → **HIGH_RISK** | **F-1**：§8 的结论行误抄了 §7 的读数 ⇒ 见 §4/§5；`>20%` 规则**被触发** |
| 5 | 提交预算：公式 9，环境硬约束 ≤6，预计 5 | 实际 **5**（C1..C5） | `over_budget: 0`；但**归因不纯净**（见 §3） |
| 6 | plan §4-T2 验收行 `record_count: 6` | 实测 **7** | 增量重规划期新增 HB-7（`1479a35`），**非实现缺陷**；已如实登记 |
| 7 | T6 步骤 D：`unavailable` 退出码由 1 改 **2** | `node --test` 把子进程失败**归一化为 exit 1**（深探：`process.exit(2)` 与 `process.exitCode = 2` 两种写法均被抹平） | **D-5**：字面目标不可达；替代通道 = 状态行 + CI step 的 0/1/2 映射（CG4 可机械定档）。**未谎称已达成** |
| 8 | 「安装器 fail-closed 双向可重放」= 仓库用例说了算 | QA 自建注入/控制表（12 行）：**归因控制**（把残留分支唯一 `exit 1` 换成 `:` ⇒ 必须变绿 ✅）、**作用域控制**（`{{` 注入 `skills/` ⇒ 不得触发 ✅）、**分支可达性控制**（放入 1 个 `.sh` ⇒ 必须走 ok 分支 ✅）、**PATH 收窄控制**（白名单 + node stub ⇒ 必须 0 ✅） | LG16 的判据**被外部证明非恒真、可归因、有作用域**；同时 QA 反方指出 F-3（作用域过宽）与 F-6（marker 出现在成功路径横幅 ⇒ 须以 exit code 为主判据） |
| 9 | 探针脚本只在 `/tmp` 里造状态（Sprint 1 的纪律） | QA 的**首版**注入脚本把哨兵写进了 `skills/` **符号链接**指向的仓库目录，产生未跟踪临时文件 `skills/kixpower/QA_RESIDUE_PROBE.md`（内容 `{{QA_OUT_OF_SCOPE}}`） | QA 在签署前自查发现 → `rm -f` + 修正脚本（改用 `skills/` **副本**）→ 复核工作树恢复为 `M progress.md` + 2 个 marker。**已量化影响**：该文件存在期间使 LG11 由 `79/39/22 (27.8%)` 变为 `80/40/22 (27.5%)`，删除后重跑与 L2 记录全一致 ⇒ 结论取自清理后读数。**学习点**：`cp -R` 会**跟随符号链接**写穿到仓库（与 F-5 的 `walk()` 不跟随 symlink 恰成反例）⇒ 探针的「临时目录」必须解析真实路径 |

---

## 3. `over_budget` 结算（记 0，并给出依据与归因说明）

```yaml
derived_commit_budget: 6      # 绑定值 = min(公式 9, 环境硬约束)；公式侧含 closeout_layer: 1（HB-6 scoped trial）
commits_used: 5               # C1 affc9c7 · C2 1479a35 · C3 27fe7f6 · C4 42d3c7e · C5 = 收尾层
over_budget: 0
```

| 项 | 内容 |
|---|---|
| 依据（可复算） | `git rev-list --count ef6a485..HEAD` = **5**；`git log --oneline ef6a485..HEAD` = 5 行（C5 = `done.md` + 本文件 + memory + F-1/F-2/F-7 修正，**docs-only 单 commit**） |
| 与 Sprint 1 的差别 | Sprint 1：derived 7 / 实际 8 ⇒ `over_budget: 1`，over 量**恰等于收尾层**（HB-6 的 origin）。本 Sprint 的公式 v2 **显式计入 `closeout_layer: 1`**，实际未超 |
| **归因不纯净（必须写明）** | 绑定值 6 同时受**环境硬约束**（kix-guards 1 小时窗口 / 10 commit 硬上限，用户 ≤6）约束 ⇒ **反事实不可区分**：即使不计 `closeout_layer`，`min(8, 6)` 仍是 6，结果一样。因此本次 **不能**作为「HB-6 的改进确实有效」的证据 → 该 trial 记 **`pending`（无效试验）**，见 §6 |
| 诚实边界 | 本项记 0 **不是**「预算模型已被验证」，也**不是**「上游公式已修正」；HB-6 的公式问题（`base = δ` 不为收尾层留位）仍留在 backlog（`candidate`） |

---

## 4. 未处置的强制规则：`>20% → 强制扩展 target_rules`（**触发但未依规则处置**，结转 Sprint 3）

> 完整登记见 `docs/sprint-2/drift-check.md` **§9**（含三次读数台账、R-5 窗口口径、影响面边界）。此处为 L4 视角的结论。

| 项 | 内容 |
|---|---|
| 规则 | `kixpower-producer.agent.md` §核心职责 6：verification-fidelity 报 `high_risk`（>20% 未门禁）⇒ **强制扩展**新 plan 的 `target_rules` 覆盖前一 Sprint 漏掉的范围 |
| 判定 | **触发**：§8 逐字块 `15 (23.4%)`；QA/Producer 独立复跑 @`42d3c7e` `22 (27.8%)`（同一工作树两次运行逐字节相同）——两者均 `HIGH_RISK`，均**无 `PASS` 行** |
| 是否处置 | **否**。Sprint 2 的 `target_rules` 是在该指标**本机不可机械判定**时按「**覆盖优先**」设定的（plan §3/§4 显式列入 3 个 `.cjs` 的 3 副本组、4 副本 `consistency-lib.cjs`、12 个 agent 文件、4 处调用点文档、`TEAM_CONVENTIONS.md` 3 副本） |
| 性质 | **事后巧合，不是合规**：方向与该规则一致，但**设定动机不是该规则**（当时量化通道不可用）→ 若把「结果看起来够全」当作「规则已遵守」，就是倒因为果 |
| **不得**写成 | ① 「该强制**未被触发**」（`drift-check.md` §7 原结论，已作废）；② 「已**合规**」；③ 用 §7 的 `0%` 代表本窗口 |
| 结转 | **Sprint 3**：以 `--prev-sprint 2`（baseline `ef6a485`）复核；若仍 >20% ⇒ **真正执行**「扩展 Sprint 3 `target_rules` 覆盖 Sprint 2 漏检面」的机械动作 |
| 附带发现（对 `goal_drift: 0` 的界定） | 27.8% 的 ungated 面**不是**目标漂移：可枚举的 top-20 全部是**已申报**交付物（`consistency-lib.cjs` ×4、hooks `.cjs` ×15、`install.sh`/`install.ps1`/`package.json`）= T4/T6/T7 的声明文件 → 问题是 **`target_rules` 的 glob 表达面没覆盖已申报文件**，属规则表达缺口。**诚实边界**：工具只打印 top 20（“+2 more” 未展开）⇒ 若那 2 个文件属未申报改动，则 `goal_drift` 应上调（falsifier 见 §8-U1） |

---

## 5. 两次「主张被独立观察修正」（本 Sprint 最有价值的学习信号）

> 两起都是 **claim_evidence_failure**，但**性质相同**：主张方给出的**证据链是真的**，**表述的覆盖面/机制不完整**，
> 由**独立观察者**（QA / orchestrator 交叉核验）收窄或补全。**两起均未被推翻，也都不能算「已确证」**。

### 5.1 R-1 根因：从「折叠 YAML 块标量」**单轴** → 「**双轴**偏离」（主张方遗漏第二轴）

| 项 | 内容 |
|---|---|
| 主张（orchestrator，`progress.md` Trace Log `stage: l2` 的 `independent_finding`） | Sprint 1 的冻结凭据 `46121655…` 来自一个**折叠了 YAML 块标量**的临时脚本；canonical 实现（`kixpower-contract.ps1:10-20` 的 `[^\r\n]*` + `.Trim('"')`）只取行首字面量 ⇒ 故 QA 的 80 组复算命中不了（**在复算一个非 canonical 的目标**） |
| 独立核验（QA `qa-signoff-2.md` §6 a–f，自建 `r1-analyze.cjs` / `r1-matrix.cjs`） | (a) **证伪条件 ② 不成立**：`sha256(JSON.stringify(stored.gates))` = `46121655…` = 文件内 digest ⇒ 数组自洽且确为被哈希原文；(b) canonical 读同一 plan → `b533cf26…` ≠ 冻结值；(c) 逐字段 diff：8 条 × 5 字段中**唯一分歧 = `expect`**（6 条 canonical 为字面 `">-"`，Sprint 1 值为 164/166/223 字级正文）；(d) **证伪条件 ① 不成立**：5 组非折叠变体（`b533cf26` / `680072c9`（保留引号）/ `79ae6b1d` / codepoint 排序 / 字段集变体 / 尾随换行 / pretty-print）**全部 miss**；(e) 折叠路径**独立复刻**（不 spawn 临时脚本）→ `46121655…` 且与 `stored.gates` 逐字节相同 |
| **修正点（f）** | **`fold + 剥引号` → `f95a6163…` ≠ 冻结值** ⇒ **折叠是必要但非充分条件**：临时脚本同时**未剥除**行内引号（`LG3`/`LG4` 的 stored 值含字面双引号），而参照实现 `kixpower-contract.ps1:19` 会 `.Trim('"')` |
| 裁决 | 主张**成立、未被证伪**；**表述不完整**——根因必须写成「临时脚本的 `expect` 提取语义**双轴偏离**参照实现：① 折叠块标量 ② 未剥引号」。**推论仍成立**：该凭据不是 canonical 实现的输出，不应作为可复算凭据引用；「8 条门禁全绿」的执行证据（exit code）不受影响 |
| 残余 | 冻结凭据的 provenance 由「内部自洽 + 与现存活脚本逐行同构 + plan 未改动」三重佐证，**非密码学锚定**（R-4） |
| 学到什么 | 「我找到了一个能复现该值的机制」≠「该机制是唯一/完整的原因」。**复现成功只是必要条件**；必须做**逐轴变体矩阵**（保留/剥除、折叠/不折叠、排序、字段集）才能把「必要」与「充分」分开。→ **LL-13** |

### 5.2 LL-9 的覆盖面：从「10 个 hook 里 9 个读旧 schema ⇒ 静默放行」**收窄**到 **block-*-edit 三者**

| 项 | 内容 |
|---|---|
| 原主张（LL-9，Sprint 2 增量重规划期写入） | `grep -l tool_name skills/kixpower/hooks/*.ps1 \| wc -l` = **9/10** ⇒ 这些 hook 取到空值后走「放行」分支 = **仍然静默失效** |
| 独立核验（orchestrator 逐文件核对 + QA `qa-signoff-2.md` §5 的源码级对照表） | **`blast-radius-check.ps1` 已经做过多形态归一化**（v6.1，2026-08-16）：头注 `:17-18` 记录三形态；实现 **形态 1 `toolCalls[]`** `:104-116`（`:106` 判存在、`:114` `ConvertFrom-Json`）→ **形态 2 `toolName`+`toolArgs`** `:121-130`（`:128` 解析）→ **形态 3 `tool_name`+`tool_input`** `:134-141`（`:139` 解析）；空 `toolCalls` ⇒ `:528` `exit 0`（合法的「无工具调用」通道） |
| **真实短板（修正后的表述）** | 在三个 `block-*-edit` hook 的**入口**：`$argsObj = $hookInput.tool_input;` 紧跟 **`if (-not $argsObj) { exit 0 }`** —— 即 `block-source-edit.ps1:39`、`block-source-edit-qa.ps1:35`、`block-dev-authority-edit.ps1:40`。**形态 1/2 载荷没有 `tool_input` 字段** ⇒ 这三者在真实宿主载荷下**静默放行**。QA 的探针以「**`tool_name` 无 `tool_input`**」载荷实测复现该静默放行；同一载荷下 `blast-radius-check.ps1` 走的是**归一化之后**的 `:528`（`if ($calls.Count -eq 0) { exit 0 }`，属合法的「无工具调用」通道），即**已归一化者的行为与未归一化者必须分开评价**（`qa-signoff-2.md` §5 的源码级对照表 + 行 129） |
| 裁决 | LL-9 的**核心结论不变**（「能启动 ≠ 会生效」；契约失真会藏在第二层），但**覆盖面被收窄**：不是「9/10 个 hook 通吃」，而是 **1 个已归一化（blast-radius）+ 3 个入口级静默放行（block-*-edit）+ 6 个未移植（H-set-B，无 pwsh 宿主上根本不触发）** |
| 学到什么 | 用**文件级 greps**（`grep -l tool_name`）推**行为级结论**（「取空值后放行」）是把「同一符号出现」当成「同一控制流」。定位分支必须读**入口路径**（谁在读、读到空之后做什么），而不是统计读取者数量。→ 并入 **LL-13** 的「按轴分解」原则 |

> **为什么这两条是本 Sprint 最有价值的学习**：两次都不是 agent 犯错后自我辩护，而是**独立观察者用异质证据**
> （QA 自建脚本 / 逐文件源码对照）**把主张的边界改对了**。这类修正**不会**出现在任何 gate 的 exit code 里，
> 只能靠「主张 → 独立核验 → 收窄表述」这一循环捕获 ⇒ 已分别转为 HB-9（结论与证据一致性）与 LL-13（按轴分解验证）。

---

## 6. Pending trial 评估（HB-1 … HB-7，v4.1）

| 项 | 本 Sprint trial 结果 | 学习状态 |
|---|---|---|
| **HB-1** 能力探针 skip 判据 | **pass**（LG1 = 32/32/0/**0 skip**：T4 把 5 条 pwsh 依赖用例改成 `node` ⇒ **能力型 skip 结构性归零**；新增 `copilot-installer.test.js` 的 `bash` 用例走**平台前提绑定**的 `SKIP: windows-only — ` 通道，文案机器可识别）。**判据修订**：原 `pass_criteria` 的「无 pwsh = 5 skip」预期项被 T4 消除；probe 对 `node`/`bash` 为空操作（`node` = 测试运行器自身） | **`validated`**（修订已写入条目 `note`；win32 skip 分支本地不可观测 → CI） |
| **HB-2** 链式基线表述与计数纪律 | **not triggered** —— 规划期基线**绿**（`test:installer` exit 0、`test:consistency` exit 0），trigger 不匹配（`unmatched_runs: 1`） | `candidate`（**不得记 pass**） |
| **HB-3** 链式入口每段独立 gate | **pass** —— plan §7.1 为 zh 链每段（LG3/LG4/LG5）与 en 链链尾（LG7）建独立 required gate，`npm test`/`cd en && npm test` 仅作附加判据；L2 逐段给出终态（23/0/1 · 20/20 · 59/0/1 · 35/0/1），QA 独立复跑抽取段计数一致 | **`validated`** |
| **HB-4** hermetic / 环境状态断言 | **pass** —— 新增断言一律**显式构造状态**（LG15 `KIX_HOOK_CORE_PATH` mutation probe ⇒ 改坏 core 必红；LG16 哨兵注入 + 临时 `COPILOT_HOME`）；QA 另加归因/作用域/收窄三组控制证明**非恒真**。判据 (b)（复核 baseline 声称需第二个 checkout）本 Sprint 未出现前置 | **`validated`** |
| **HB-5** manifest digest 平台无关复算 | **pass** —— plan §7.2 写明规范化规则；**QA 在无 pwsh 宿主上用 canonical 实现本地复算 `5f4eab16…` 逐位一致**（Sprint 1 的不可复算项在本 Sprint 闭合） | **`validated`** |
| **HB-6** 收尾层未入预算公式 | **`pending`（无效试验，不验证也不证伪）** —— 改进**确已应用**（`plan.md` §15 显式 `closeout_layer: 1`），结果也满足 `pass_criteria`（5 ≤ 6 且未回改预算）；**但绑定值 6 = min(公式 9, 环境硬约束 6)，反事实不可区分** ⇒ 本次结果**不具判别力** | `candidate`（`evidence += {Sprint 2, trial, pending}`） |
| **HB-7** 安装器批量步骤不许假绿 | **not triggered（origin == Sprint 2，自我确证无效）** —— 本项由本 Sprint 的 D-1 创建，T7 是它的**对策**而非它的 trial；`applies_to_sprints: ">=3"` | `candidate`（**不得记 pass**） |

**晋升汇总**：`by_status` 由 `{candidate: 7}` → **`{candidate: 9, validated: 4, archived: 0}`**（`items_total: 13`）。
晋升的 HB-1/3/4/5 **自 Sprint 3 起作为 repo 级既定实践应用**，并在 Sprint 3 的 L4 监测 `regression_signal`（命中即降回 `candidate`）。
**无 archived**（无证伪、无被取代项）。

---

## 7. 本轮新增 candidate（写入 `harness-backlog.md`）

| ID | 类型 | 一句话 | 来源 |
|---|---|---|---|
| **HB-8** | tooling | **维护调用点不在任何 gate 的检索面内**：MG2 只覆盖 `agents/` 目录 ⇒ 4 个文档的 pwsh-only 维护指令**从来没有门禁**（F-2 能存活到 QA 期的机制成因）；判据 = 非历史文档中 `sync-dsh-preset\.ps1` 的**维护指令**命中 = 0 | F-2 / R-7 |
| **HB-9** | plan-template | **结论层必须与自身证据同源同窗**：诊断指标（fidelity）的**逐字输出块**与其**结论行**必须是同一次运行；跨运行/跨窗口抄写读数视为证据污染；窗口（`--prev-sprint N` ⇒ baseline）必须随行声明 | F-1 / R-5 |
| **HB-10** | dev-workflow | installer 残留扫描的**作用域必须与「本 bundle 写入的文件」对齐**，且失败不得留下半装树（非原子） | F-3 |
| **HB-11** | dev-workflow | **fail-closed 的「未知形态」判据必须按输入契约枚举完整键名**（`arguments`/`parameters`/`function` 缺失 ⇒ 静默放行），且须以**真实载荷采样**作 falsifier | F-4 / R-2 |
| **HB-12** | tooling | **新增的 `.md` 产物也要进三面 identical-set**（`hooks/README.md` 当前无机器守护，MG10 的证据对象自身不受守护） | F-5 |
| **HB-13** | qa-workflow | 门禁判据的**强度必须与自述一致**：`marker 文本出现` ≠ `失败`（marker 可能在成功路径横幅里）；跨平台断言必须声明其**适用侧**（sh-only / ps1-only） | F-6 |

> 六项均 `status: candidate`、`applies_to_sprints: ">=3"`、含完整 `eval{task_kinds,trigger,pass_criteria,regression_signal,check_timing,overlaps_with,supersedes,unmatched_runs,archive_after_unmatched}`。
> 与之配套的新经验条目：**LL-10..LL-13**（见 §8 的映射）。

---

## 8. 残余不确定与 falsifier（U-*）

> **U1–U6 与 QA 的 R-1..R-6 一一对应**（本文件不重复其全文，只给 L4 视角的收敛表述与 falsifier；全文见 `done.md` §5 / `qa-signoff-2.md` §11）。
> **U7 为本层新增**（F-2 的残留面）；**U8 为本层自检发现**（既有 frontmatter 解析问题，非本层引入）。**以下各项均未证实。**

| ID | 残余不确定 | Falsifier（可判定） | 对应 |
|---|---|---|---|
| **U1** | **`goal_drift: 0` 的边界**：27.8% ungated 面中，工具只展开 top-20（“+2 more” 未枚举）；已展开的文件全部是**已申报**交付物 ⇒ 判定为「规则表达缺口」而非目标漂移 | 枚举那 2 个文件：若其中任一**不在** plan/T6–T9 的声明文件清单内 ⇒ `goal_drift > 0`，须重新分类并追溯授权 | §4 |
| **U2** | **CI 通道（CG1/CG2/CG4/CG5）** 本地永久不可达 ⇒ 最强等价通道与 `install.ps1` 唯一可执行验证均 pending | CG4 出现 `parity: PASS`；CG5 windows smoke 双向日志齐备 | R-1 / R-3 / R-6 |
| **U3** | **真实宿主语义**：Copilot 对 hook spawn 失败是 `deny` 还是 `ignore`；真实 `preToolUse` 载荷 schema | 一次真实会话日志；若为 `deny` ⇒ 6 条未移植声明**必须立即**移植或移除；若载荷含 `arguments`/`function` 形态 ⇒ F-4 升级为 P1 | R-2 / HB-11 |
| **U4** | **R-1 的 provenance 强度**：冻结凭据的「来源」证据是 `/tmp` 临时产物，非 commit 绑定（三重佐证，非密码学锚定） | 给出当时另一份被哈希的 `gates` 原文；或在不折叠前提下复算出 `46121655…` | R-4 / §5.1 |
| **U5** | **`>20%` 规则的处置**：本层只登记，未处置 | Sprint 3 以 `--prev-sprint 2` 复核；若仍 >20% 却仍未扩展 `target_rules` ⇒ 规则被二次违反，须升级为流程缺陷 | §4 |
| **U6** | **HB-6 的判别力**：预算被环境硬约束绑定 ⇒ 本次 trial 无判别力 | 出现一个「预算未被环境硬约束绑定」的 Sprint，且其 `over_budget` 仍 == 收尾提交数 ⇒ 改进无效，HB-6 降回/修正 | §3 / §6 |
| **U7**（本层新增） | **F-2 的残留面**：本层只改 5 处；`dsh/README-DSH.md:57-59`、`PLUGINIZATION-ROADMAP.md:172`、`context-budget/README.md:74`、`kix-general-evolution.md:333` 仍指示 pwsh-only 维护路径（`CHANGELOG` 历史条目按红线不改） | Sprint 3 改完后加机械判据（HB-8）；若届时仍有**非历史**文档指示 pwsh-only 维护路径 ⇒ 本项未闭合 | R-7 / HB-8 |
| **U8**（本层新增） | **`progress.md` 的 frontmatter 不是严格合法 YAML**（`\|` 出现在双引号标量内 ⇒ 严格解析器 `ScannerError`）；**`42d3c7e` 即已如此**（本层用 PyYAML 对冻结版本复现），项目自身的正则实现（`Get-KixFrontmatter`）能读 ⇒ **没有 gate 会红**。含义：L2 台账的「可被第三方机械读取」这一隐含前提，只在**实现了同一宽松语义**的解析器上成立 | Sprint 3 若引入严格 YAML 消费方（跨语言工具/迁移），必须先把该标量改为 `>-` 或普通标量；若届时严格解析器仍读不出 ⇒ 本项升级为需修的缺陷 | R-8 |

**LL ↔ 候选映射**：LL-10/LL-11（结论与证据同源同窗 + 多点传播）↔ **HB-9**；LL-12（冻结凭据必须由 canonical 实现产出）↔ HB-5 的 `validated` 判据 + 条目 `note`；LL-13（移植保真按轴分解）↔ §5.1/§5.2 + HB-11 的 `pass_criteria`。

---

## 9. 结论

1. **本 Sprint 的最高价值发现不是「把 pwsh 依赖去掉」**（那是已交付的工程），而是两条**门禁看不见的东西**：
   - **silent failure（2 起）**：安装器「宣告成功而实质不存在」；以及**结论层与自己那份逐字输出矛盾**并传播 3 处——
     后者证明「gate 全绿」**不覆盖**「结论与证据的一致性」。
   - **未处置的强制规则（1 条）**：`>20% → 强制扩展 target_rules` **被触发**（23.4% / 27.8%）却未依规则处置；
     如实登记为「**事后巧合而非合规**」，结转 Sprint 3。
2. **两次「主张被独立观察修正」是本 Sprint 的学习信号**：R-1 根因由单轴补为**双轴**（折叠 + 未剥引号；`fold+剥引号` ≠ 冻结值）；
   LL-9 的覆盖面由「9/10 hook 通吃」收窄为「**blast-radius 已归一化形态 1/2/3**，真实短板在 `block-*-edit` 三者的
   `if (-not $argsObj) { exit 0 }`」。两次**核心结论未被推翻，表述边界被改对**。
3. **证据档次必须说清**：本 Sprint 的等价性主张**封顶在 E0+E2**（「与既有 JS 判定语义一致；与原 `.ps1` 的实际行为未取证」），
   E1（差分对拍）本地**永久 unavailable**、CI（CG4）pending ⇒ 任何「等价」表述都是违规。
4. **晋升与债务**：HB-1/3/4/5 晋升 `validated`（4 项，Sprint 3 起作为既定实践并监测回归）；HB-6 因**无判别力**保持 `candidate`；
   新增 HB-8..HB-13 六项候选 + LL-10..LL-13 四条经验。**无 archived**。
5. **结算诚实性**：`over_budget: 0`（5 ≤ 6）但**归因不纯净**；`status: done` 而 **`release_eligible: false`**、
   `ci_pending: true`；QA 的 `CONDITIONAL` 与其 §12「本 Sprint 不因本报告获得发布许可」在 `done.md` 中**逐字保留**。
