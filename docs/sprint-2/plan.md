# Sprint 2 Plan — 宿主平价（host parity：无 pwsh 宿主一等公民）

```yaml
sprint: 2
theme: "B. 宿主平价（host parity）"
baseline_sha: ef6a48550a40bf433555790419fd4c2fd0cf1483
branch: feature/sprint-2-node-first-host-parity
content_language: zh
content_language_source: inferred
producer: Remy
created: 2026-09-22
```

> 输入：`docs/sprint-2/drift-check.md`（Sprint 1 → 2 漂移 + verification_fidelity 降级说明）、
> `docs/sprint-2/runtime-context.md`（工具链能力快照：**pwsh 缺失**为本 Sprint 的核心事实）、
> `docs/sprint-1/{plan,done,hill-climbing}.md`、`.kixpower/memory/repo/{harness-backlog,lessons-learned}.md`、
> `PROJECT_BRIEF.md`。

> ### ⚠ 增量重规划（2026-09-22，T1/T5 提交 `affc9c7` 之后）— 执行以本节索引为准
>
> 触发：① **用户决策「方案 B：单一引擎 —— hooks 与 trust-chain 统一用 Node」**；② **新发现缺陷**：两个 installer 的
> 占位符契约**为空且失败不报错**（macOS/Linux 装完 Copilot，hooks 指向不存在的 `pwsh` → 永不触发；安装器全程报成功）。
>
> | 本文件的位置 | 内容 | 与旧章节的关系 |
> |---|---|---|
> | **§12** | 架构决策记录 `ADR-S2-1`（provenance / 被否方案 A·C / silent failure 逐条证据 / **WIP 归属表**） | 追加；§2 的相关条目在 §12.1.3 有**修订范围界定** |
> | **§13** | hooks 工作流任务 `T6..T9`（= H-A/H-B/H-C/H-D）+ **覆盖范围裁决表** | 追加；不动 §4 的 T1–T5 |
> | **§14** | **task DAG v2**（9 节点，含 T6–T9） | **取代 §5 的 DAG 作为执行依据**；§5 保留为 T1/T5 提交时的快照 |
> | **§15** | **task_sizing v2**：`derived_commit_budget = 6`（公式值 9 被环境硬约束否决，并列输出） | **取代 §6 的 sizing 作为执行依据** |
> | **§16** | **verifiable_gates v2**：LG10 移出 required（本地永久 `unavailable`）、LG1 计数修订、新增 LG15/LG16/CG4/CG5/MG8–MG10 | 追加；§7 的 gate 定义**除标注的四处修订外**全部继续有效 |
> | **§17–§19** | 开放问题 `OQ8–OQ13` / Sprint+1 候选 `N8–N11` / Evals 追加 `HB-7` | 追加 |
>
> **不变量**：§1–§11 中关于 **T1 与 T5 的结论、数字与证据一律不动**（T1 的 `13/13`、`parity: unavailable`、
> `R1-digest-recompute: undetermined`；T5 的 `grep = 0` 与「hooks 文件未删」）。新增结论只以追加/标注修订表达。

---

## 1. Sprint 范围

**目标**：把 kixpower 的**信任链与维护链从 `pwsh` 依赖中解放**，使「本机没有 `pwsh`」不再是能力降级 ——
即无 pwsh 宿主成为**一等公民**，而不是「有能力型 skip 的特殊环境」。

### 1.1 三块交付（客户已确认，全部要做）

| 块 | 交付 | 判据（可观测） |
|---|---|---|
| **P0** | trust-chain 三个脚本 Node 化：`kixpower-contract`（源 517 行）/ `validate-memory-backlog`（89）/ `verification-fidelity-check`（320） | 三个 `.cjs` 在无 pwsh 宿主上可执行；characterization 门禁绿；**具备 pwsh 时**与 `.ps1` 原文逐字节差分一致（§7.3-E1） |
| **P1** | 清掉 **DSH 面向**副本 `agents/*.agent.md` 的 pwsh hooks 死引用（10 个死 `hooks:` 块） | DSH 面向 agent 面 `^hooks:` 计数 = 0、`.ps1` 调用计数 = 0；**`hooks/*.ps1` 文件本身保留**（Copilot 路径仍在用） |
| **P2** | `scripts/sync-dsh-preset.ps1`（197 行）Node 化 | `npm run test:installer`：本机 **25 → 25 pass / 0 fail / 0 skip**（现为 `20/0/5`）；5 条 pwsh 类 skip 彻底消失 |

**为什么是这三块（而不是「顺手把所有 `.ps1` 都 Node 化」）**：今天已**实际支付**三笔代价，全部源于同一个根因（信任链可执行性绑定在宿主是否装了 pwsh 上）：

| # | 已支付的代价 | 证据 |
|---|---|---|
| ① | `verification_fidelity` 被迫记 `baseline_degraded`（Sprint 1 的 L4 无法量化门禁覆盖率） | `docs/sprint-1/hill-climbing.md:18,94`；`plan.md` Sprint 1 §2 non-goal「不跑 fidelity-check」 |
| ② | `validate-memory-backlog` 由 orchestrator **即兴手写移植**（`/tmp/kix-validate-memory-backlog.cjs`），且**未与原版对拍** | `docs/sprint-1/hill-climbing.md:99-103`；登记为残余不确定 U-2（`done.md` §9-7） |
| ③ | L2 信任凭据 `l2_gate_manifest_sha256` **QA 用 80 组候选规范化均无法复算** | `docs/qa/qa-signoff-1.md:204`（R-1）；`done.md` §5-R-1；HB-5 |

三笔代价的共同形状是：**当 canonical 实现只存在于 `.ps1` 时，无 pwsh 宿主只能「降级 / 即兴 / 无法复算」三选一。**

### 1.2 结构性项（orchestrator 建议，**评估结论：入本 Sprint，折叠进 T1**）

把「宿主能力」升为 gate 的一等维度：`host_requires` + 能力缺失时 gate 输出 **`unavailable`** 且**不计入通过**，
以修正「`skip ≠ 通过`」目前只靠**文案约束**（Sprint 1 的 MG1 / HB-2 文本判据）的现状。

**采纳理由**：本 Sprint 的等价性取证**天然是能力条件性的**（差分对拍需要 pwsh，characterization 不需要）。
若不引入 `host_requires`，门禁只能二选一：要么在无 pwsh 宿主上静默 skip（= 假绿），要么整条路径 fail（= 把无 pwsh 变成阻塞）。
`unavailable` 是第三种、也是唯一诚实的取值。

**不采纳「单独成节点」**：它与 T1 是同一件事（**如何在一个可能没有 pwsh 的宿主上取得等价性证据**），
拆开会引入一条纯顺序边而不产生任何新的并行空间 → 折叠进 T1，但 T1 的验收里**单列**该产出（§4-T1 步骤 C）。

### 1.3 本 Sprint 的**核心风险**（不得绕过，正面处理）

> 本机无 pwsh ⇒ **JS 移植无法与原版 `kixpower-contract.ps1` 差分对拍**，「忠实移植」这一 claim 的证据强度**天然受限**。

这不是「可以靠更努力测试绕过」的问题，而是**证据通道缺失**。故本 Sprint 把「等价性取证方案」本身当作**一等交付物**：
- 方案的三条腿（E1 差分对拍 / E2 characterization / E3 冻结凭据复算）见 **§7.3**；
- 「一次性 `brew install powershell` 仅作 dev-time oracle」的取舍见 **§7.4**（**结论：采纳，verification-only**）；
- 证据强度的**阶梯与不可越级声明**见 §7.3 末表——本 Sprint **不得**把「characterization 绿」表述为「等价性已证」。

---

## 2. 本 Sprint 不做什么（explicit non-goals）

| 不做 | 原因 |
|---|---|
| **不把 `pwsh` 作为产品/运行时依赖**，任何交付物不得在运行时要求 pwsh 存在 | 客户已明确否决；本 Sprint 的**目标就是去掉**该依赖。§7.4 的 oracle 仅限 dev-time 验证工具 |
| **不删除 `hooks/*.ps1` 文件本身**（`skills/kixpower/hooks/` 10 个 + 2 个 preset 副本各 10 个 = 30 文件） | VS Code Copilot 路径（`install.ps1` → `$COPILOT_HOME`）仍在用；P1 只清 **DSH 面向副本**里的死引用 |
| **不清 root 的 Copilot 分发版**（`agents/`、`skills/`、`instructions/`、`prompts/`）里的 `hooks:` 块 | `PROJECT_BRIEF.md` §13-D9 + `README.md:72`：「根目录 `skills/` 等是 Copilot 分发版，与 DSH 版刻意不同」；`install.ps1:76` 把 `agents/*.agent.md` 装到 Copilot 目录 → 那里的 hooks **不是死引用** |
| **不把 DSH 面向副本里的 `pwsh`（作为**宿主工具名**）一律清除** | `dsh/preset/plugins/kix-guards.js:1117` = `const TERMINAL_TOOLS = new Set(['pwsh', 'bash'])` → `pwsh` 在 DSH 上是**合法终端工具名**，与「PowerShell 二进制依赖」是两件事。P1 的判据是**结构化谓词**（§7-MG2），不是裸 `grep -c pwsh` |
| **不做本 Sprint 三块之外的 `.ps1` Node 化** | 明确排除清单：`hooks/*.ps1` 10 个（~2,129 行，DSH 上为死引用、Copilot 上仍活）、`skills/kixpower/tests/run-contract-regression.ps1`（864）、`install.ps1`（238）、`scripts/ensure-vision-bridge.ps1`（98）、`scripts/install-kix-stalled.ps1`（62）、`skills/kixpower/scripts/{init-project,new-sprint,install-kix-p1}.ps1`（62/198/76）。留作 §10 候选 |
| **不修 F-1（T2 幂等断言的 mtime 非 hermetic 性）** | Sprint 1 移交项 #1（阻塞级别中），但**不在 host parity 的关键路径上**；本 Sprint commit 预算 6（§6）不允许再开一条独立证据链。留作 §10-N3 |
| **不修 OQ8 / U-4**（`preset-classic` / `preset-null` 两副本不被任何 npm script 执行） | 同上；但本 Sprint **部分缓解**：P2 的镜像登记会补上 `checkSyntax` 的 symlink 盲区（§4-T4 步骤 B），使新 `.cjs` 至少被语法解析覆盖 |
| **不改写 Sprint 1 的任何结论、数字与证据** | 变更一律以**追加 + 标注修订**表达（§9-OQ0 是唯一一处对 Sprint 1 数字的补充说明，形式为追加，非覆写） |
| **不新增任何 npm script** | 门禁只能引用 `package.json#scripts` 中真实存在的命令、真实存在的系统命令（`node`/`md5`/`grep`/`ls`/`wc`），或真实存在的 `gh` 只读调用（Sprint 1 §7 红线沿用） |
| **不新增第三方依赖** | 项目零依赖约束（`PROJECT_BRIEF.md` §13-D7）：三个 `.cjs` 只用 `node:*` |
| **不把 parity / characterization 测试挂进 `npm test` 链** | parity 需要 pwsh → 挂进链会把「无 pwsh 宿主」重新变成链红。二者走**独立 required gate**（LG9/LG10），并显式声明该边界（§7-MG1） |
| **不提 GitHub Issue / 不 push / 不开 PR** | 上游 Issues 已禁用（`hasIssuesEnabled: false`）；push/PR 需用户明确授权（R4 open）。本 Sprint 只产出可本地验证的 revision |
| **不发布 / 不合并上游 PR** | 同上；`release_eligible` 由 CI 取证决定，不由本 Sprint 决定 |

---

## 3. task 可行性前置 Gate（G1 liveness / G2 heat）复核

> G3/G4（perf 专属）本 Sprint 不适用（无 bench 驱动）。`languages` 维度按 `javascript`/`markdown` 取值，**不固定用 `*.go` 类命令审其他语言**。

| 种子 | G1 liveness（可达入口 + 消费者） | G2 heat | 决策 |
|---|---|---|---|
| **T1** 等价性基座（`kixpower-contract.cjs` + parity/characterization 骨架 + `host_requires` 语义） | **live**：`kixpower-contract` 有 **2 个即时生产消费者**——`validate-memory-backlog.ps1:11` 与 `verification-fidelity-check.ps1:17` 均 dot-source 它（实读行号）；Node 化后被 T2/T3 直接 import。入口 = §7 的 LG9/LG10 两条独立 gate | `warm`（每个 Sprint 的 L2 交接 / QA 复核 / 每个 Sprint 结束的 drift-check） | ✅ 采纳 |
| **T2** `validate-memory-backlog` 移植 + 调用点改写 | **live**：入口 `prompts/kixpower-new.prompt.md:80`「先运行 `scripts/validate-memory-backlog.ps1`；失败不得收尾」——**逐字硬要求**，DSH 上该指令当前**结构性不可执行**；消费者 = L4 收尾门禁 | `warm`（每个 Sprint 收尾 1 次） | ✅ 采纳 |
| **T3** `verification-fidelity-check` 移植 + 调用点改写 | **live**：入口 `skills/kixpower/USAGE_MANUAL.md:365` 与 `agents/kixpower-producer.agent.md:30-32`（Producer 核心职责 #5 的**强制步骤**）；消费者 = drift-check + 「>20% 未门禁 → 强制扩展 target_rules」这条规则 | `warm`（每个 Sprint 启动 1 次，且是规则触发器） | ✅ 采纳 |
| **T4** `sync-dsh-preset` 移植 + 5 skip 清零 + 镜像/语法覆盖登记 | **live**：入口 `npm run test:installer`（CI 每 push）；消费者 = `dsh/README-DSH.md:41,57-59` 维护流程、`README.md:72`「维护 = 改 preset 后跑 `scripts/sync-dsh-preset.ps1 -Force`」 | `warm`（每次本地/CI 测试 + 每次维护） | ✅ 采纳 |
| **T5** P1 DSH 面向死 hooks 清理 | **live**：入口 = DSH preset 安装副本 `~/.dsh/.agent-presets/kixparadigm/agents/*.agent.md`（已实测与 `dsh/preset/agents/*` md5 相同：`44dcfb51a3889f4dec8d17be0375346c`）；消费者 = DSH 会话加载 agent 定义 | `cold`，🟡 low-ROI | ✅ 采纳但**成本极低**（10 个死块删除）且是「无 pwsh 一等公民」claim 的**可机械判定前提**（否则 grep 面永远非零）；否则该 claim 无法取证 |

**未通过 gate 的候选（记为不设 task）**：

| 候选 | 未通过项 | 理由 |
|---|---|---|
| 「把 `hooks/*.ps1` 10 个也 Node 化」 | G1 | DSH 上 hooks **本就不触发**（`dsh/preset/agents/*.agent.md` 的 DSH 适配注记明写；机械门禁由 `kix-guards.js` 承载）→ Node 化后**无消费者**，是纯死代码增长 |
| 「把 `install.ps1` Node 化」 | G1 | 它是 **VS Code Copilot** 的安装入口（`install.ps1:76` 装到 `$COPILOT_HOME`）；Copilot 宿主有 PowerShell，无平价缺口 |
| 「Node 化后**删除** `sync-dsh-preset.ps1` / 三个 `.ps1`」 | G1 | 差分对拍的**参照实现**就是这些 `.ps1`（§7.3-E1 的 oracle 之一）；删除 = 自毁证据通道 |
| 「给全仓补 `host_requires` 并重算所有历史 gate」 | G2 | 历史 Sprint 的 gate 证据不可回写（TEAM_CONVENTIONS §L2：历史报告保持 legacy/unbound）；本 Sprint 只为**新 gate** 引入该维度 |

---

## 4. 任务列表

> 状态标记：`[ ]` 未开始 / `[~]` 进行中 / `[x]` 完成 / `❌ Blocked`。与 `progress.md` 数值保持一致。

- [ ] **T1 — 等价性取证基座：`kixpower-contract.cjs` + 三态宿主能力语义**
  - **步骤 A（契约模块移植）**：`skills/kixpower/scripts/kixpower-contract.ps1`（517 行）→ `kixpower-contract.cjs`。
    必须逐字对齐的函数（消费者只用这些）：`Get-KixFrontmatter` / `Get-KixYamlScalar` / `Get-KixYamlList` /
    `Get-KixIndentedBlocks` / `Get-KixPlanGateRecords` / `Get-KixRequiredLocalGates` /
    `Get-KixGateManifestConflicts` / **`Get-KixGateManifestJson`** / **`Get-KixSha256`**。
    `Get-KixSha256` = UTF-8 字节的 SHA-256，小写十六进制（`kixpower-contract.ps1:187-196` 语义）——**逐字节可复算**。
  - **步骤 B（parity + characterization 测试骨架）**：
    - `skills/kixpower/tests/trust-chain.test.js` —— **不需要 pwsh**，用从 `.ps1` 语义反推的**固定用例**（characterization）。
      必须含**负向控制**（仿 Sprint 1 的 4 组：缺 `status` / 重复 id / `validated` 缺 trial+pass / `archived` 缺 `archive_reason`），
      证明断言**非恒真**。
    - `skills/kixpower/tests/ps1-parity.test.js` —— **差分对拍**：同一 fixture 分别喂 `.ps1`（经 `pwsh`）与 `.cjs`，
      比对 **stdout 逐字节 + exit code**。判据是能力条件性的三态：`parity: PASS` / `parity: FAIL` / **`parity: unavailable`**（宿主无 pwsh）。
      `unavailable` **不是** skip、**不是** pass（§1.2）。探针形状按 HB-1（`probe.error.code === 'ENOENT'` + 机器可识别文案）。
  - **步骤 C（`host_requires` 升为 gate 一等维度）**：`skills/kixpower/TEAM_CONVENTIONS.md` 的 `verifiable_gates` schema 增
    `host_requires: [<cmd>]` 字段 + `unavailable` 三态定义 + 「required gate 非 `pass`（含 `unavailable`）不得计入 `l2_verification_passed`」。
    **同步 3 个副本**（`skills/kixpower/` = 源、`dsh/preset-classic/skills/kixpower/`、`en/preset-classic-en/skills/kixpower/`）。
  - **步骤 D（oracle 决策落盘）**：按 §7.4 执行 `brew install powershell`（**verification-only**），把 `pwsh --version` 与
    安装结果写入 `progress.md` 的 `pwsh-oracle:` 行。安装失败**不阻塞** T1，但必须显式记录（§7.3 阶梯随之降级）。
  - **交付**：`kixpower-contract.cjs`（3 副本字节一致）、2 个测试文件、`TEAM_CONVENTIONS.md` 的 schema 增补（3 副本）。
  - **不做什么**：不改 `kixpower-contract.ps1` 一个字（它是 E1 的参照实现）；不删任何 `.ps1`；不改 `kix-guards.js`（不把新语义做进 hook —— 那会把 blast radius 扩到 4 副本插件面）。
  - 文件：`skills/kixpower/scripts/kixpower-contract.cjs`、`skills/kixpower/tests/{trust-chain,ps1-parity}.test.js`、`skills/kixpower/TEAM_CONVENTIONS.md` + 2 组 preset 镜像副本

- [ ] **T2 — `validate-memory-backlog` Node 化 + 调用点改写（关闭 U-2）**
  - 做法：`validate-memory-backlog.ps1`（89 行）→ `validate-memory-backlog.cjs`，复用 T1 的契约模块。
    stdout 行与退出码**逐字对齐**（`memory_backlog: valid` / `record_count: N` / `legacy_unstructured_records: N` /
    `errors:` 列表 / `exit 0|2`；`missing` 与 `missing contract helper` 两个 2 号退出分支同样对齐）。
  - **必须完成的对拍（U-2 的关闭条件）**：① 与 `.ps1` 原版在 pwsh oracle 下差分（§7.3-E1）；
    ② 与 Sprint 1 即兴移植 `/tmp/kix-validate-memory-backlog.cjs`（如仍存在）比对 **`record_count` / `legacy_unstructured_records` / 退出码**三元组——
    并在 `progress.md` 落 `U2-parity:` 行（值 + 出处）。若 `/tmp` 副本已不存在，**如实记录「不可比」**，不得记为已对拍。
  - 调用点改写（**逐字硬要求**）：`prompts/kixpower-new.prompt.md:80` 的 `scripts/validate-memory-backlog.ps1` → `.cjs`（含调用方式：`node …`）。
    同源副本 `dsh/preset-classic/prompts/`（如有）与 `en/preset-classic-en/` 侧同步。
  - **不做什么**：不放宽任何校验规则；不改 HB schema；`exit 2` 语义不变。
  - 验收：`node skills/kixpower/scripts/validate-memory-backlog.cjs --project-root .` exit 0 且三行统计与 Sprint 1 记录一致（`record_count: 6`）。
  - 文件：`skills/kixpower/scripts/validate-memory-backlog.cjs`（3 副本）、`prompts/kixpower-new.prompt.md`

- [ ] **T3 — `verification-fidelity-check` Node 化 + 调用点改写（解除 `baseline_degraded`）**
  - 做法：`verification-fidelity-check.ps1`（320 行）→ `verification-fidelity-check.cjs`，复用 T1 契约模块。
    必须保真的输出面（供 drift-check 直接追加）：`=== Verification Fidelity Check v5.7 ===` 头、`[Scope Rules]` 段、
    `[Verification Fidelity]` 段（`total changed` / `in_scope (rules)` / `whitelisted` / `ungated (ratio%)` /
    `PASS|LOW_RISK|HIGH_RISK`）、`[Fidelity v5.7 累积度量]` 与 `fidelity_v5:` YAML 段、`N == 1` 时的
    `verification_fidelity: baseline` + `baseline_source: no_previous_sprint` 分支。
  - **参数面**：`--project-root` / `--prev-sprint` / `--since` / `--rules` 与 ps1 的 `-ProjectRoot`/`-PrevSprint` 等价；
    glob 语义（`**`/`*`/`{a,b}`/`[a-z]`/`?`）按 TEAM_CONVENTIONS §target_rules 匹配优先级实现，`unresolved_modules` 与
    `mechanical_links … unresolved_offline` 计数保留。
  - 调用点改写：`skills/kixpower/USAGE_MANUAL.md:365`、`agents/kixpower-producer.agent.md:30-32`（+ DSH 副本
    `dsh/preset-classic/agents/kixpower-producer.agent.md:35`，经 `dsh/preset/agents` symlink 共享）→ `.cjs` 调用。
  - **首次真实运行**：对 Sprint 1 → Sprint 2 跑一次，把 YAML 段**追加**到 `docs/sprint-2/drift-check.md`（Sprint 1 的手工 baseline 报告**保留不改**）。
  - **不做什么**：不改 `>20%` 阈值；不把手工 baseline 报告改写成脚本输出（只追加）。
  - 验收：`node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 1` exit 0 且输出含 `fidelity_v5:` 段。
  - 文件：`skills/kixpower/scripts/verification-fidelity-check.cjs`（3 副本）、`skills/kixpower/USAGE_MANUAL.md`、`agents/kixpower-producer.agent.md` + DSH 副本、`docs/sprint-2/drift-check.md`

- [ ] **T4 — `sync-dsh-preset` Node 化：5 条 pwsh 类 skip 彻底消失 + 镜像/语法覆盖登记**
  - 做法：`scripts/sync-dsh-preset.ps1`（197 行）→ `scripts/sync-dsh-preset.cjs`，CLI 参数对齐
    `-BundleRoot/-PresetId/-SourceDir/-PresetRoot/-DryRun/-Force/-DirectoryPointers`，
    行为契约不变：**只增改、绝不删除目标侧独有文件**（源侧是事实源；`-DryRun` 只报告）。
  - `scripts/sync-dsh-preset.test.js`：5 条用例的 spawn 目标由 `pwsh -File …ps1` 改为 `node …cjs`；
    **保留 `SKIP_WINDOWS_ONLY` 语义**（`:125` 那条 POSIX-only 用例在 win32 上仍应平台型 skip），
    **删除 `SKIP_PWSH_UNAVAILABLE` 常量与其能力探针**（理由：该文件不再 spawn `pwsh`）。
  - **差分对拍的归属（关键，决定 LG1 的 `0 skip` 能否成立）**：`.ps1` ↔ `.cjs` 的 parity 断言**一律**放在
    `skills/kixpower/tests/ps1-parity.test.js`（`host_requires: [pwsh]`），**不得**留在 `sync-dsh-preset.test.js` 里 ——
    否则该文件仍会 spawn `pwsh`，其用例在本机仍 skip ⇒ `test:installer` 恒为 `25/0/1`，**LG1 的 `0 skip` 不可达**。
    故 `ps1-parity.test.js` 的覆盖对象是**全部 4 个移植件**（含 `scripts/sync-dsh-preset.ps1`）。
  - **步骤 B（镜像 + 语法覆盖登记）**：新 `.cjs` 有 3 个副本（`skills/kixpower/scripts/` = 源、`dsh/preset-classic/skills/kixpower/scripts/`、
    `en/preset-classic-en/skills/kixpower/scripts/`），但**当前一致性守护不覆盖 `skills/**`**（实读：`consistency-lib.cjs:681-699`
    的检查面只有 plugins / install-lib.js / vision-bridge / agents 预算 / 链接 / 语法），故必须**显式登记**：
    1. 在 `consistency-lib.cjs` 增 `checkIdenticalSet`（新 `.cjs` 三副本字节一致组），**4 副本同步**；
    2. 修 `checkSyntax` 的 **symlink 盲区**：`walk()`（`consistency-lib.cjs:26-34`）用 `entry.isDirectory()`，
       **不跟随符号链接** → `checkSyntax({rel:'dsh/preset'})` **永远走不到** `dsh/preset/skills/**`（`dsh/preset/skills` 是 symlink →
       `../preset-classic/skills`）。必须补 `checkSyntax({root, rel: 'dsh/preset-classic'})`，否则新 `.cjs` 在 classic 根下**只被字节守护、不被语法解析**（= OQ8 的同类缺口）。
  - **必须记录的事实（P2 的代价与反转）**：Sprint 1 §2 曾以「Node 重写会让 `sync-dsh-preset.ps1` 生产路径零回归覆盖（违反 G1）」**否决**本方案；
    Sprint 2 的目标使该否决前提反转 —— `.ps1` 在无 pwsh 宿主上的覆盖**恒为 0**（本机实测 5/5 skip = 0 条断言执行），
    而 `.cjs` 在**所有**宿主上可执行。**覆盖不回退的前提**是本 Sprint §7-LG10 的差分对拍在具备 pwsh 的宿主上仍逐字比对 `.ps1`。
  - **不做什么**：不删除 `sync-dsh-preset.ps1`（兼容入口 + E1 参照）；不改变同步语义（不裁剪目标侧独有文件）；不新增 npm script（`test:installer` 的文件清单不变，只换被测目标）。
  - 验收：`npm run test:installer` → 本机（darwin）**25 tests / 25 pass / 0 fail / 0 skip**；win32 上为 24/0/1（保留 1 条平台型 skip）。
  - 文件：`scripts/sync-dsh-preset.cjs`、`scripts/sync-dsh-preset.test.js`、
    `skills/kixpower/tests/ps1-parity.test.js`（**追加 sync 的 parity 用例**，与 T1 共享该文件 —— 两节点串行，非并行冲突）、
    `consistency-lib.cjs` **4 副本**（`dsh/preset/`、`dsh/preset-classic/`、`dsh/preset-null/`、`en/preset-classic-en/plugins/`）

- [ ] **T5 — P1：DSH 面向副本的死 `hooks:` 块清理（只清 DSH 面）**
  - **边界判定（依据 preset.yml name/description + DSH-ADAPTATION.md + package.json#files，已逐项取证）**：

    | 副本 | 面向 | 判据 | 本 Sprint 是否动 |
    |---|---|---|---|
    | `agents/*.agent.md`（root，6 份） | **VS Code Copilot** | 无 DSH 适配注记（`grep -c "DSH 适配注记"` = 0/6）；`install.ps1:76` 装到 `$COPILOT_HOME\agents\`；`package.json#files` 含 `agents/` | **不动** |
    | `dsh/preset-classic/agents/*.agent.md`（6 份，其中 5 份含 `hooks:`） | **DSH** | `preset.yml` name `kixparadigm-classic`；6/6 含 DSH 适配注记；`DSH-ADAPTATION.md` 在档内 | **清死 hooks 块** |
    | `dsh/preset/agents` | **DSH**（**同一物理文件**） | `dsh/preset/agents` 是 **symlink** → `../preset-classic/agents`（`ls -la` 实读） | 随上一行生效（无需单独改） |
    | `en/preset-classic-en/agents/*.agent.md`（6 份，其中 5 份含 `hooks:`） | **DSH**（英文包） | `preset.yml` name `kixparadigm-classic-en`；`DSH-ADAPTATION.md` 在档内 | **清死 hooks 块** |
    | `skills/kixpower/hooks/*.ps1`（10 个 + 2 组 preset 副本） | **Copilot + 兼容** | Copilot hooks 路径仍活 | **保留文件，一个都不删** |
  - 做法：删除上述 **10 个** `hooks:` frontmatter 块（`dsh/preset-classic/agents/` 5 个 + `en/preset-classic-en/agents/` 5 个；`kixpower-reviewer.agent.md` 本就无 hooks）。
    同时把 DSH 适配注记里的 `run_in_terminal→pwsh` 映射标注为**宿主能力条件**（`pwsh` 或 `bash`，见 `kix-guards.js:1117` 的 `TERMINAL_TOOLS`），
    并删去「本文件移植了 Copilot hooks」这类**已不成立**的暗示。**只做删减与措辞收敛，不重写角色职责、硬约束、可编辑范围。**
  - **不得做的事**：不删除任何 ps1 文件；不改 root `agents/`；不改 `dsh/preset-classic/DSH-ADAPTATION.md` 的 `pwsh` 工具名引用（那是宿主工具名，非二进制依赖，见 §2）；不动 persona 预算相关文件。
  - 验收：`grep -rn "^hooks:" dsh/preset-classic/agents en/preset-classic-en/agents` → 0 命中；
    `grep -rn "\.ps1" dsh/preset-classic/agents en/preset-classic-en/agents` → 0 命中；
    `ls skills/kixpower/hooks/*.ps1 | wc -l` → **10**（文件未删）。
  - 文件：`dsh/preset-classic/agents/*.agent.md`（5）、`en/preset-classic-en/agents/*.agent.md`（5）

---

## 5. task DAG

```yaml
task_dag:
  nodes:
    - id: T1
      desc: "等价性取证基座：kixpower-contract.ps1(517) → .cjs（Get-KixSha256 / Get-KixGateManifestJson 字节可复算）+ parity(差分) 与 characterization 测试骨架 + host_requires/unavailable 三态语义 + pwsh oracle 决策落盘"
      depends_on: []
      coupling: none
      estimated_tokens: high
      target_rules:
        globs:
          - "skills/kixpower/scripts/kixpower-contract.cjs"
          - "skills/kixpower/tests/trust-chain.test.js"
          - "skills/kixpower/tests/ps1-parity.test.js"
          - "skills/kixpower/TEAM_CONVENTIONS.md"
          - "dsh/preset-classic/skills/kixpower/scripts/kixpower-contract.cjs"
          - "dsh/preset-classic/skills/kixpower/tests/trust-chain.test.js"
          - "dsh/preset-classic/skills/kixpower/tests/ps1-parity.test.js"
          - "dsh/preset-classic/skills/kixpower/TEAM_CONVENTIONS.md"
          - "en/preset-classic-en/skills/kixpower/scripts/kixpower-contract.cjs"
          - "en/preset-classic-en/skills/kixpower/tests/trust-chain.test.js"
          - "en/preset-classic-en/skills/kixpower/tests/ps1-parity.test.js"
          - "en/preset-classic-en/skills/kixpower/TEAM_CONVENTIONS.md"
        modules: [skills/kixpower]
        languages: [javascript, markdown]
        mechanical_links:
          - type: callees
            of: ["skills/kixpower/scripts/kixpower-contract.ps1"]   # 参照实现（oracle 之一），禁改
          - type: callers
            of: ["skills/kixpower/scripts/validate-memory-backlog.ps1", "skills/kixpower/scripts/verification-fidelity-check.ps1"]
          - type: identical_mirror                                   # 仓库本地扩展类型（§5.1）
            of:
              - "dsh/preset-classic/skills/kixpower/scripts/kixpower-contract.cjs"
              - "en/preset-classic-en/skills/kixpower/scripts/kixpower-contract.cjs"
            guard: "consistency-lib.cjs checkIdenticalSet（T4 登记）→ npm run test:consistency (LG2)"
    - id: T2
      desc: "validate-memory-backlog.ps1(89) → .cjs（stdout 行/退出码逐字对齐）+ 关闭 U-2 对拍 + prompts/kixpower-new.prompt.md:80 调用点改写"
      depends_on: [T1]
      coupling: strong          # T1 的 kixpower-contract.cjs 是 T2 的直接输入（ps1:11 dot-source 契约）
      estimated_tokens: medium
      target_rules:
        globs:
          - "skills/kixpower/scripts/validate-memory-backlog.cjs"
          - "dsh/preset-classic/skills/kixpower/scripts/validate-memory-backlog.cjs"
          - "en/preset-classic-en/skills/kixpower/scripts/validate-memory-backlog.cjs"
          - "prompts/kixpower-new.prompt.md"
        modules: [skills/kixpower, prompts]
        languages: [javascript, markdown]
        mechanical_links:
          - type: callees
            of: ["skills/kixpower/scripts/validate-memory-backlog.ps1"]      # 参照实现，禁改
          - type: identical_mirror
            of:
              - "dsh/preset-classic/skills/kixpower/scripts/validate-memory-backlog.cjs"
              - "en/preset-classic-en/skills/kixpower/scripts/validate-memory-backlog.cjs"
            guard: "consistency-lib.cjs checkIdenticalSet（T4 登记）→ LG2"
    - id: T3
      desc: "verification-fidelity-check.ps1(320) → .cjs（输出段/glob 语义/exit 码保真）+ USAGE_MANUAL.md:365 与 producer agent 调用点改写 + 首次真实运行追加 drift-check"
      depends_on: [T1]
      coupling: strong          # 同上：ps1:17 dot-source 契约；T1 输出是其直接输入
      estimated_tokens: high
      target_rules:
        globs:
          - "skills/kixpower/scripts/verification-fidelity-check.cjs"
          - "dsh/preset-classic/skills/kixpower/scripts/verification-fidelity-check.cjs"
          - "en/preset-classic-en/skills/kixpower/scripts/verification-fidelity-check.cjs"
          - "skills/kixpower/USAGE_MANUAL.md"
          - "dsh/preset-classic/skills/kixpower/USAGE_MANUAL.md"
          - "en/preset-classic-en/skills/kixpower/USAGE_MANUAL.md"
          - "agents/kixpower-producer.agent.md"
          - "dsh/preset-classic/agents/kixpower-producer.agent.md"
          - "en/preset-classic-en/agents/kixpower-producer.agent.md"
          - "docs/sprint-2/drift-check.md"
        modules: [skills/kixpower, agents]
        languages: [javascript, markdown]
        mechanical_links:
          - type: callees
            of: ["skills/kixpower/scripts/verification-fidelity-check.ps1"]  # 参照实现，禁改
          - type: identical_mirror
            of:
              - "dsh/preset-classic/skills/kixpower/scripts/verification-fidelity-check.cjs"
              - "en/preset-classic-en/skills/kixpower/scripts/verification-fidelity-check.cjs"
            guard: "consistency-lib.cjs checkIdenticalSet（T4 登记）→ LG2"
    - id: T4
      desc: "sync-dsh-preset.ps1(197) → .cjs + 5 条 pwsh 类 skip 清零（test:installer 25/0/0）+ 新 .cjs 三副本镜像登记 + 修 checkSyntax symlink 盲区"
      depends_on: [T1]
      coupling: weak            # 复用 T1 的 parity/characterization 形状与 oracle，但不消费其产物（sync 不 dot-source 契约）
      estimated_tokens: high
      target_rules:
        globs:
          - "scripts/sync-dsh-preset.cjs"
          - "scripts/sync-dsh-preset.test.js"
          - "skills/kixpower/tests/ps1-parity.test.js"      # 与 T1 共享（串行，见 §5.2 #1）
          - "dsh/preset/plugins/consistency-lib.cjs"
          - "dsh/preset-classic/plugins/consistency-lib.cjs"
          - "dsh/preset-null/plugins/consistency-lib.cjs"
          - "en/preset-classic-en/plugins/consistency-lib.cjs"
        modules: [scripts]
        languages: [javascript]
        mechanical_links:
          - type: callees
            of: ["scripts/sync-dsh-preset.ps1"]        # 参照实现（E1 对拍对象），禁改
          - type: identical_mirror
            of:
              - "dsh/preset-classic/skills/kixpower/scripts/kixpower-contract.cjs"
              - "dsh/preset-classic/skills/kixpower/scripts/validate-memory-backlog.cjs"
              - "dsh/preset-classic/skills/kixpower/scripts/verification-fidelity-check.cjs"
              - "en/preset-classic-en/skills/kixpower/scripts/kixpower-contract.cjs"
              - "en/preset-classic-en/skills/kixpower/scripts/validate-memory-backlog.cjs"
              - "en/preset-classic-en/skills/kixpower/scripts/verification-fidelity-check.cjs"
            guard: "consistency-lib.cjs checkIdenticalSet + PLUGIN_IDENTITY_GROUPS 的 4 副本字节一致约束 → LG2"
    - id: T5
      desc: "P1：清 DSH 面向副本的 10 个死 hooks: 块（dsh/preset-classic 5 + en 5）+ 适配注记的 pwsh 工具名映射收敛；hooks/*.ps1 文件保留"
      depends_on: []            # 不消费任何其他节点产物：改的是 frontmatter 死块，与 .cjs 命令名无关
      coupling: none
      estimated_tokens: low
      target_rules:
        globs:
          - "dsh/preset-classic/agents/*.agent.md"
          - "en/preset-classic-en/agents/*.agent.md"
        modules: [agents]
        languages: [markdown]
        mechanical_links:
          - type: callees            # 注记引用的宿主工具名来源（只读，禁改）
            of: ["dsh/preset/plugins/kix-guards.js"]
          - type: identical_mirror   # dsh/preset/agents 是 symlink → preset-classic/agents（同物理文件，非副本组）
            of: ["dsh/preset/agents"]
            guard: "checkDefaultShelfPointers（consistency-lib.cjs:649）→ LG2"
  properties:
    max_antichain_width: 4      # ω：{T5, T2, T3, T4} —— T5 与其余全部不可比，T2/T3/T4 互相不可比（同层并行）
    critical_path_depth: 2      # δ：T1 → {T2|T3|T4}（最长路径长度 2；T5 为孤立点）
    coupling_density: 0.34      # γ：(0 + 0 + 0.7 + 0.7 + 0.3) / 5 = 1.7 / 5 = 0.34（见 §5.3 复算）
    recommended_topology: sequential   # 命中强制串行条件（§5.2）；无强制时按 ω=4,γ=0.34 应得 hybrid
    layers:
      - [T1, T5]
      - [T2, T3, T4]
```

### 5.1 `identical_mirror` 类型说明

沿用 Sprint 1 §5.1 的仓库本地扩展类型（TEAM_CONVENTIONS 的 `mechanical_links.type` 闭集为
`callers|callees|same_trait|same_struct`，不含「副本镜像」）。本 Sprint 的镜像组**新增一类**：
`skills/kixpower/scripts/*.cjs` 的 3 副本 —— 它与既有 `.ps1` 副本的关键区别是**既有 `.ps1` 副本无人守护**
（实测：源 `kixpower-contract.ps1` = 517 行，两个 preset 副本 = 507 行，且 `npm run test:consistency` 仍 `CONSISTENCY OK`）。
故 T4 必须把新 `.cjs` **显式登记**进 `consistency-lib.cjs`，否则会复现同一漂移。

### 5.2 `force_sequential` 判定理由

```yaml
force_sequential: true
```

| # | 触发条件（TEAM_CONVENTIONS §何时强制 sequential） | 本 Sprint 命中情况 |
|---|---|---|
| 1 | **涉及同一文件的多个任务** | ① T2/T3/T4 **都**要在 `consistency-lib.cjs`（**4 副本**）登记自己的镜像组 → 同一文件；② T3 与 T5 **都**触碰 `agents/kixpower-producer.agent.md`（T3 改正文调用行、T5 删 frontmatter 死块）；③ T2/T3 的 `.cjs` 与 T4 的 `kixpower-contract.cjs` 落在**同一目录树**（`skills/kixpower/scripts/` 3 副本）| 
| 2 | 加密/认证敏感改动 | 不命中 |
| 3 | plan 明确标注 force_sequential | 命中 |

**额外理由（本 Sprint 特有）**：

- **唯一 canonical 入口是 `npm test`（`&&` 链）**：T4 要让 `test:installer` 从 `20/0/5` 变 `25/0/0`，T1 的 schema 增补与 T2/T3 的 `.cjs` 会同时改变 `check-dsh-consistency` 的检查面。
  任一未完成时该链都必红 → 分区并行的 Dev **都无法各自产出绿灯结算**，而 L2 要求「同一 revision 上全部 required local gate 通过」，分区自证不成立。
- **`kix-guards` 的 blast radius 窗口是环境级硬约束**：本会话有 **1 小时窗口 / 10 个 commit 硬上限（含 amend）**，Sprint 1 已因此被拦一次
  （`ef6a485` 的 commit message 明写「前次受 commit 硬上限阻塞」）。该上限使「多 worktree 并行 + synthesis 合并」的 commit 成本无法承担。
- **扇出固定开销不回本**：总改动 ≈ 3 个新 `.cjs` × 3 副本 + 2 个测试文件 × 3 副本 + 4 副本 `consistency-lib.cjs` + 12 个 agent 文件 + 4 处调用点文档；
  δ=2、k=5，worktree/partition/synthesis 的固定成本高于串行收益（与 Sprint 1 §5.2 同口径）。

### 5.3 DAG 属性复算（防人工估计）

| 量 | 值 | 复算依据 |
|---|---|---|
| ω `max_antichain_width` | **4** | `{T5, T2, T3, T4}`：T5 无入边出边、与其余 4 点全部不可比；T2/T3/T4 同层互相不可比。T1 与 T2/T3/T4 可比（T1 是它们的前驱）→ 不能入更大反链。Dilworth：n − 最大匹配 = 5 − 1 = 4 |
| δ `critical_path_depth` | **2** | 最长有向路径 = `T1 → T2`（或 `T1 → T3` / `T1 → T4`），含 **2 个节点 = 2 层**；T5 为孤立点（单独 1 层）。<br>**口径声明**：δ 按 TEAM_CONVENTIONS §Task Sizing「`dag_layers = critical_path_depth`（DAG 层数 = 关键路径深度）」取**节点数/层数**（= §5 的 `layers` 长度），**不是**边数（边数为 1）。Sprint 1 同口径（其 `layers` 4 层 ⇒ δ=4） |
| γ `coupling_density` | **0.34** | 节点耦合值 `{T1:none=0.0, T5:none=0.0, T2:strong=0.7, T3:strong=0.7, T4:weak=0.3}` → (0+0+0.7+0.7+0.3)/5 = 1.7/5 = **0.34** |
| `layers` | `[[T1,T5],[T2,T3,T4]]` | Kahn 分层：in-degree=0 → {T1,T5}；移除其出边后 in-degree=0 → {T2,T3,T4} |
| 公式拓扑（无强制时） | `hybrid` | ω=4 ≥ 3 但 γ=0.34 ≥ 0.3 → 不命中 `parallel`；ω ≥ 2 且 γ < 0.6 → 命中 `hybrid`。**被 `force_sequential`（§5.2 #1/#3）覆盖** |
| 强制串行 | `sequential` | 按 TEAM_CONVENTIONS §拓扑路由规则「按顺序命中即停」，`force_sequential` 优先 |

> 公式值与强制值**并列输出、不隐藏矛盾**（同 Sprint 1 §5.2 口径）。ω/δ/γ 由按 `depends_on` 暴力枚举反链 + 最长路径独立复算得出（§7-MG6 的旁证口径）。

---

## 6. task_sizing（derived_commit_budget）

```yaml
task_sizing:
  inputs:
    task_count: 5                      # k（仅参考，不进公式）
    dag_layers: 2                      # δ = critical_path_depth
    dag_width: 4                       # ω = max_antichain_width
    strong_coupling_count: 2           # coupling ∈ {strong, critical} 的节点数（T2、T3）
    bug_reserve: 1                     # = 本项目实测的 unplanned defect / sprint 率（依据见 bug_reserve_source）
    closeout_layer: 1                  # HB-6 scoped trial 的显式输入（见 §11-HB-6）；非 TEAM_CONVENTIONS 公式项
    bug_reserve_source: >-
      ① **实测率 = 1**：Sprint 1 规划期未预见的缺陷实数 = 1（kix-focus 夹具红），观测率 = 1 / sprint
      （证据：docs/sprint-1/done.md §3-1、hill-climbing.md §1 stage 4 的 l2_failed: 1）；
      ② Sprint 1 取 2 的**附加理由**（「`&&` 链首红遮蔽链尾 → 剩余未知 ≥1」）在 Sprint 2 规划期
      **不成立**：基线 `npm test` **exit 0**、链尾 60 → 59/0/1 已跑到（Sprint 1 终态已取证），
      遮蔽机制当前处于**未激活**状态 → 不叠加该 +1；
      ③ 反过来说，若 Sprint 2 的改动**重新激活**遮蔽（例如新 gate 未按 HB-3 分段），reserve 会被击穿 →
      falsifier 见下。
    closeout_layer_source: >-
      HB-6 candidate 的 eval.trigger 在本 Sprint **独立匹配**（「plan.md 生成 derived_commit_budget，且该 Sprint
      计划写入 docs/sprint-N/{done,hill-climbing}.md 或 docs/qa/qa-signoff-N.md」→ 本 Sprint 三份都写）。
      按 TEAM_CONVENTIONS §harness-backlog eval schema 的「candidate + trigger 匹配 → 本 Sprint 作 scoped trial」，
      显式计入 1 个收尾层。**这是 scoped trial，不是公式修订**：TEAM_CONVENTIONS 的公式保持权威不动。
  derived_commit_budget: 6             # base(2) + coupling_bonus(2) + bug_reserve(1) + closeout_layer(1)
  hard_cap: 10                         # 环境级**更紧**的硬约束见下
  warn_threshold: 7                    # dag_layers*3 + bug_reserve = 6 + 1
  over_cap: false
  warn_channel_note: >-
    Sprint 1 的 OQ9 指出 `warn_threshold = δ*3 + bug_reserve` 在 δ=4/reserve=2 时得 14 > hard_cap=10，
    预警通道**结构性不可达**。本 Sprint δ=2/reserve=1 → warn=7 < hard_cap=10，**预警通道首次可用**：
    derived(6) 与 warn(7) 之间只有 1 个 commit 的余量，跨过 7 即应在 progress.md 记预警（不必等到 10）。
  environment_hard_constraint:
    source: "kix-guards blast radius（本会话）：1 小时窗口内 10 个 commit 硬上限（含 amend）"
    evidence: "docs/sprint-1/done.md §6；commit ef6a485 的 message「前次受 commit 硬上限阻塞」"
    consequence: >-
      本 Sprint 的**真实**紧约束不是 hard_cap=10 而是「≤6」+「1 小时窗口」。
      提交粒度必须相应收敛：**每个 DAG 层合并为 1 个 commit 是默认要求**，而不是可选优化。
  # 期望 commit 单元（防「事后合理化」，先给可复算映射再看公式是否覆盖）
  realized_check:
    expected_units:
      planning_docs: 1                 # 本次规划（plan/progress/runtime-context/drift-check + Brief §8/§11）
      layer_1: 1                       # T1 + T5 合并（同层）
      layer_2: "1..3"                  # T2/T3/T4 同层；合并为 1 为默认，最多拆 3（每个移植件独占）
      closeout: 1                      # done.md / hill-climbing.md / qa-signoff-2.md / L2 字段固化
    expected_total_min: 4
    expected_total_max: 6
    consistent: true                   # derived(6) ≥ min(4) 且 == max(6) 且 ≤ hard_cap(10)
    falsifier: >-
      若 layer_2 的三个移植件**各自独占 commit**、且 planning 与 closeout 也不合并 → 实际 7 > derived 6
      → 必须如实记 over_budget: 1，**禁止回头改写本字段**（TEAM_CONVENTIONS §Task Sizing 红线）。
      第二个 falsifier：若 1 小时窗口在 layer_2 中途耗尽 → 剩余节点无法提交 → 按 `blocked` 记录并转 `/kixpower-continue`，
      不得为了「凑完」而放弃 HB-3 的分段 gate 纪律。
```

同步到 `progress.md` 的 `blast_radius.commit_budget: 6`（**hook 的强制读取字段，不改则该 Sprint 的 commit 会被拒绝**）。

> **与 Sprint 1 的差异说明（追加，不覆写）**：Sprint 1 `derived_commit_budget: 7`、实际 9（见 §9-OQ0）。
> 本 Sprint 的 6 **不是**「把常数调小以求好看」，而是 δ 由 4 → 2（`T6/T7` 那种「L2 前增量扩范围」的链在本 Sprint 被 HB-3 的分段 gate 前置消解）、
> `strong_coupling_count` 由 1 → 2（新增一条真实依赖边）、`bug_reserve` 由 2 → 1（遮蔽机制未激活）三项**证据化差异**的合成。

---

## 7. verifiable_gates

> **红线（含本 Sprint 的唯一声明式修订）**：`cmd` 只引用 **① `package.json#scripts` 中真实存在的命令**、
> **② 真实存在的系统命令**（`node`/`md5`/`grep`/`ls`/`wc`，本机已实测）、**③ 真实的 `gh` 只读调用**。
> 本 Sprint **不新增任何 npm script**。LG9/LG10/LG11 的 `cmd` 属 ②，其操作对象是本 Sprint 交付的文件；
> **文件不存在时该 gate 记 `unmet`（不得记 pass）** —— 这是 Sprint 1 §7 红线的**显式修订条目**（原文只允许引用既有 canonical 命令，
> 而新证据通道**在既有命令里不存在**，故必须显式声明而非假装它已存在）。

```yaml
verifiable_gates:
  local_gate:
    # ── 既有 canonical 链的每一段作为独立 required gate（HB-3 scoped trial 的直接落实）──
    - id: LG1
      type: local_gate
      cmd: "npm run test:installer"
      expect: >-
        exit 0。本机（darwin，无 pwsh）：25 tests → **25 pass / 0 fail / 0 skip**
        （P2 的直接判据：`SKIP_PWSH_UNAVAILABLE` 类 skip 必须归零，5 条用例全部真跑）。
        win32 平台：24 pass / 0 fail / **1 skip**（`:125` 的 POSIX-only 用例是**平台型** skip，语义保留）。
        若本机仍出现任何 `SKIP: pwsh unavailable` 行 → 本 gate 记 unmet（不是 pass）。
      required: true
      covers: [T4]
    - id: LG2
      type: local_gate
      cmd: "npm run test:consistency"
      expect: >-
        exit 0；stdout 含 `CONSISTENCY OK`；
        且新增的 `.cjs` 三副本字节一致组已出现在 notes 中（`kixpower-contract.cjs` / `validate-memory-backlog.cjs` /
        `verification-fidelity-check.cjs` / `sync-dsh-preset.cjs` 各自的副本组），
        并含 `dsh/preset-classic: N JS/CJS/MJS syntax OK` 这一行（证明 T4 补齐了 `checkSyntax` 的 symlink 盲区）。
      required: true
      covers: [T1, T2, T3, T4]
    - id: LG3
      type: local_gate
      cmd: "npm run test:pressures"
      expect: "exit 0（链段 3：选择压 registry --check + 两个审计脚本单测）"
      required: true
      covers: []
    - id: LG4
      type: local_gate
      cmd: "npm run test:vision"
      expect: "exit 0（链段 4）"
      required: true
      covers: []
    - id: LG5
      type: local_gate
      cmd: "cd dsh/preset/plugins && node --test"
      expect: >-
        exit 0。链段 5（`&&` 链尾）：60 → **59 pass / 0 fail / 1 skip**（该 1 skip = `kix-browser.test.js` 的
        `KIX_BROWSER_SMOKE=1` opt-in 真浏览器 smoke，**非能力型**，不得与 LG1 的 skip 混算）。
        本 Sprint 不预期该计数变化；若变化必须逐条说明原因。
      required: true
      covers: []
    - id: LG6
      type: local_gate
      cmd: "npm test"
      expect: >-
        exit 0。端到端判据：证明 5 段链在**同一 revision** 上全部真实执行（不依赖任何一段的间接推断）。
      required: true
      covers: [T1, T2, T3, T4]
    - id: LG7
      type: local_gate
      cmd: "cd en/preset-classic-en/plugins && node --test"
      expect: >-
        exit 0。**en 链的链尾段**：36 → **35 pass / 0 fail / 1 skip**。
        HB-3 trial 的落点之一：该段此前**没有独立 gate**（只有 `cd en && npm test` 的整体 gate）。
      required: true
      covers: []
    - id: LG8
      type: local_gate
      cmd: "cd en && npm test"
      expect: "exit 0（en 包端到端：`test:installer` + `check-consistency` + `bridge/test.js` + 链尾 LG7）"
      required: true
      covers: [T2, T3]
    # ── 本 Sprint 新增的证据通道（cmd 属「真实系统命令 + 本 Sprint 交付文件」）──
    - id: LG9
      type: local_gate
      cmd: "node --test skills/kixpower/tests/trust-chain.test.js"
      expect: >-
        exit 0。**host-independent** 的证据通道（不需要 pwsh）：
        ① characterization 固定用例全部 pass（从 `.ps1` 语义反推，含 4 组负向控制）；
        ② **E3 冻结凭据复算**：该套件必须断言「对 `docs/sprint-1/plan.md`（冻结 revision `a3cdfb1`）的
        required local_gate 集合，按 §7.2 规范化规则算出的 digest **等于或明确不等于**
        `46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb`」，
        并把结果落 `progress.md` 的 `R1-digest-recompute:` 行。
        **不确定即 unmet**：禁止写成「已复算」而不给该行。
      required: true
      covers: [T1]
    - id: LG10
      type: local_gate
      cmd: "node --test skills/kixpower/tests/ps1-parity.test.js"
      expect: >-
        **差分对拍**（E1），三态输出：
        ① `parity: PASS` —— pwsh 可用，4 个移植件（contract / validator / fidelity / sync）在全部 fixture 上
           stdout **逐字节一致**且 exit code 一致；
        ② `parity: FAIL` —— 任一 fixture 不一致（含 pwsh 版本差异导致的 JSON 序列化差异）；
        ③ `parity: unavailable` —— 宿主无 pwsh（探针 `ENOENT`）。
        **只有 ① 计入通过**。② 直接 unmet 并触发 §7.3 的降级路径；③ **不计入通过** ——
        此时 LG10 记 `unavailable`，§7.3 的等价性 claim 必须显式降级并写入 `progress.md` + `qa-signoff-2.md`。
        **禁止**把 ③ 写成 skip、pass 或「已等价」。
      # ⚠ v2 修订（2026-09-22 增量重规划，见 §16.1）：用户永久否决 pwsh（含一次性 oracle）⇒ 本 gate 在本地
      # **永久** unavailable。若仍列 required，则按 TEAM_CONVENTIONS §verifiable_gates 硬约束 1，本 Sprint 的 L2
      # 在本地**结构性不可达**（不是「没做」而是「不可能」）→ required 改 false，证据职能移交 CG4（CI 通道）；
      # 三态语义与「unavailable ≠ pass」**不变**。T1 的既有证据（parity-status: unavailable 等）保持不动。
      required: false
      host_requires: [pwsh]        # 本 Sprint 引入的一等维度（T1 步骤 C）
      covers: [T1, T2, T3, T4]
    - id: LG11
      type: local_gate
      cmd: "node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 1"
      expect: >-
        exit 0；stdout 含 `[Verification Fidelity]` 段与 `fidelity_v5:` YAML 段，
        且 `verification_fidelity` **不再是 `baseline_degraded`**（P0 的第三个交付要解除的正是这一降级）。
        该输出（追加形式）落在 `docs/sprint-2/drift-check.md`，Sprint 1 的手工 baseline 报告保留不改。
      required: true
      covers: [T3]
    - id: LG12
      type: local_gate
      cmd: "node skills/kixpower/scripts/validate-memory-backlog.cjs --project-root ."
      expect: >-
        exit 0；stdout 含 `memory_backlog: valid` 且 `record_count` 等于 `.kixpower/memory/repo/harness-backlog.md`
        的实际 `- id:` 记录数（Sprint 2 规划期为 6；实现期若新增 candidate 则同步增长，**不得写死常数**）。
      required: true
      covers: [T2]
    # ── required: false（环境相关，不作为本 Sprint 判据）──
    - id: LG13
      type: local_gate
      cmd: "npm run verify:guards"
      expect: "exit 0（只读比对已安装副本与仓库 canonical 的 guards 判定函数）"
      required: false
      covers: []
    - id: LG14
      type: local_gate
      cmd: "node --test scripts/install-lib.test.js"
      expect: "exit 0；20 pass / 0 fail（安装器套件单跑，用于隔离 P2 改动的回归面）"
      required: false
      covers: [T4]
    # ── v2 追加（2026-09-22 增量重规划，T6/T7；可读副本见 §16.3，以本节为机器解析面 canonical）──
    - id: LG15
      type: local_gate
      cmd: "node --test skills/kixpower/tests/hook-engine.test.js"
      expect: >-
        exit 0；**E0+E2 的 host-independent hook 证据网**（本 gate 是全套 hook 证据的锚点，不是「覆盖率」）：
        ① 两套 payload schema 的固定用例（legacy `tool_name/tool_input` 与 copilot-agent 1.0.70+ `toolCalls[{name,args}]` /
        `toolName+toolArgs`，含 `args` 为 JSON 字符串）；② 4 个已移植 hook 各 **≥1 负向控制**（合法操作必须 allow）；
        ③ **mutation probe**：`KIX_HOOK_CORE_PATH=<被故意改坏语义的临时副本>` 时该套件**必须红**（否则记 unmet）；
        ④ **同源函数体断言**：core 的每个纯函数体与 `kix-guards.js` 的 `__internals` 同名函数规范化后逐字相等；
        ⑤ 细粒度 `test()`（不得折叠为单点）。**禁止**把本 gate 的绿表述为「与原 `.ps1` 等价」（§16.2 证据阶梯）。
      required: true
      covers: [T6]
    - id: LG16
      type: local_gate
      cmd: "node --test scripts/copilot-installer.test.js"
      expect: >-
        exit 0，且用例**双向**（缺任一向 → 记 unmet）：
        ① 正向：安装器装入临时 `COPILOT_HOME` → exit 0、`grep -r '{{' <tmp>/agents` = **0 行**、已移植 hook 命令的 launcher（`node`）可解析；
        ② 负向：fixture 注入 `{{KIX_RESIDUE_PROBE}}` → 安装器**必须 exit ≠ 0** 且输出含 `KIX-INSTALLER-RESIDUE`；
        ③ 空作用域不许假绿：0 个 `.sh` 时输出 `skip: chmod +x (0 .sh files)`（**不得**出现 `ok … chmod`）。
        win32 上以平台型 skip 收口（文案可机器识别）。
      required: true
      covers: [T7]
  ci_gate:
    - id: CG1
      type: ci_gate
      cmd: "gh pr checks <sprint-PR> -R olicesx/kixparadigm"
      expect: >-
        全部 check 为 success 且对应当前 Sprint HEAD（40 位 SHA）。
        本地 `origin` 是 fork `slchris/kixparadigm`（无 workflow 注册）→ 只能在「fork → 上游 PR」路径观测；
        无 PR 时记 **pending**，不得记 pass（R4 open）。
      required: true
      covers: [T1, T2, T3, T4, T5]
    - id: CG2
      type: ci_gate
      cmd: "gh run view <run-id> -R olicesx/kixparadigm --json conclusion,jobs"
      expect: >-
        conclusion == success；jobs 覆盖 **6 个 matrix 组合**（ubuntu/windows/macos × node 20.16.0/22.x）；
        ubuntu 与 macOS 的 `npm test` 日志中 installer 段必须出现 **`# skipped 0`**
        （P2 后 5 条 pwsh 用例已改为真跑；若某 runner 无 pwsh 而仍绿 → 说明有 skip 被漏数，本 gate unmet）。
      required: true
      covers: [T4, T5]
    - id: CG3
      type: ci_gate
      cmd: "gh run list -R olicesx/kixparadigm --workflow=ci.yml --limit 1 --json headSha,status,conclusion"
      expect: "headSha == Sprint 最终 HEAD 且 conclusion == success（CG1 的无 PR 降级通道）"
      required: false
      covers: []
    # ── v2 追加（2026-09-22 增量重规划；可读副本见 §16.3）──
    - id: CG4
      type: ci_gate
      cmd: "gh run view <run-id> -R olicesx/kixparadigm --json conclusion,jobs   # 需含 parity step"
      expect: >-
        **E1（差分对拍）的唯一载体**：CI runner 预装 pwsh（Sprint 1 LL-2 的镜像证据）→ 执行
        `node --test skills/kixpower/tests/ps1-parity.test.js`，三个 matrix 组合均须 `parity: PASS`
        （退出码 0=PASS / 1=FAIL / 2=unavailable）；`parity: FAIL` ⇒ **已证伪「忠实移植」**，升级 P0 并回退对应 `.cjs`；
        `parity: unavailable` ⇒ 检查 runner 镜像变更并记 unavailable（不计入通过）；无 PR/无 run ⇒ 记 **pending**（R4 open）。
      required: true
      covers: [T2, T3, T6]
    - id: CG5
      type: ci_gate
      cmd: "gh run view <run-id> -R olicesx/kixparadigm --json conclusion,jobs   # windows job"
      expect: >-
        windows runner 上 `install.ps1` 的 smoke：正向（装入临时 `$COPILOT_HOME` → 0 残留、exit 0）+
        负向（注入 `{{KIX_RESIDUE_PROBE}}` ⇒ exit ≠ 0）。本机无 pwsh ⇒ **本地只能给静态判据（MG8）**，此 gate 是
        `install.ps1` 改动的唯一可执行验证通道；pending 时该项在 `done.md` 记为残余不确定。
      required: true
      covers: [T7]
  manual_gate:
    - id: MG1
      type: manual_gate
      cmd: "grep -rn \"pwsh\" skills/kixpower/scripts/*.cjs scripts/sync-dsh-preset.cjs | wc -l"
      expect: >-
        **0**。证明 §7.4 的 oracle 边界成立：**产品代码（非测试）零 `pwsh` 引用**。
        并列判据：`grep -c \"ps1-parity\" package.json` → 0（parity 未挂进 canonical 链）；
        `grep -rn \"require('node:child_process')\" skills/kixpower/scripts/*.cjs` 允许命中，但其中的
        `spawn('pwsh')` 必须为 0。
      required: true
      covers: [T1, T2, T3, T4]
    - id: MG2
      type: manual_gate
      cmd: "grep -rn \"^hooks:\\|\\.ps1\" dsh/preset-classic/agents en/preset-classic-en/agents | wc -l"
      expect: >-
        **0**（DSH 面向 agent 面的死 hooks 块与 `.ps1` 调用均已清除）。
        并列判据（证明「没删文件」）：`ls skills/kixpower/hooks/*.ps1 | wc -l` → **10**；
        `grep -c \"^hooks:\" agents/*.agent.md` → **5**（Copilot 面**保留**，不得为 0）。
        **本 gate 是结构化谓词，不是裸 `grep -c pwsh`**：DSH 面向面上的 `pwsh` **宿主工具名**引用允许存在
        （`kix-guards.js:1117` `TERMINAL_TOOLS = {'pwsh','bash'}`），只有 `.ps1` 调用与死 frontmatter 块必须归零。
      required: true
      covers: [T5]
    - id: MG3
      type: manual_gate
      cmd: "grep -n \"R1-digest-recompute\" docs/sprint-2/progress.md"
      expect: >-
        存在 `R1-digest-recompute:` 行，且给出**三种取值之一的明确结论**：
        ① `match`（Node 实现复算出 `46121655…`）→ R-1 的最强可得结论（recorded-artifact 一致）；
        ② `mismatch`（给出本实现算出的值）→ 必须同时给出**首个分歧点**（字段排序 / JSON 转义 / `expect` 提取）；
        ③ `undetermined`（无法在不具备 pwsh 的情况下判定）→ 必须写明缺哪条证据。
        **仅「测试绿」不满足本 gate**；LG10 为 `unavailable` 时本 gate 的最高可达结论是 ③。
      required: true
      covers: [T1]
    - id: MG4
      type: manual_gate
      cmd: "grep -n \"U2-parity\" docs/sprint-2/progress.md"
      expect: >-
        存在 `U2-parity:` 行，登记 `record_count` / `legacy_unstructured_records` / 退出码三元组与出处
        （`.ps1` 原版 与 Sprint 1 即兴移植 `/tmp/kix-validate-memory-backlog.cjs`）。
        `/tmp` 副本已不存在时必须写 `not-comparable`，**不得**记为已对拍。
      required: true
      covers: [T2]
    - id: MG5
      type: manual_gate
      cmd: "md5 -q skills/kixpower/scripts/kixpower-contract.cjs dsh/preset-classic/skills/kixpower/scripts/kixpower-contract.cjs en/preset-classic-en/skills/kixpower/scripts/kixpower-contract.cjs"
      expect: "3 行 hash **同值**（新 `.cjs` 三副本字节一致）；对另外三个 `.cjs` 同法复核"
      required: true
      covers: [T1, T2, T3, T4]
    - id: MG6
      type: manual_gate
      cmd: "grep -n \"ps1-drift\" docs/sprint-2/progress.md"
      expect: >-
        存在 `ps1-drift:` 行，登记本规划期实测的**既有未守护漂移**：
        `skills/kixpower/scripts/kixpower-contract.ps1` = **517 行**，两个 preset 副本 = **507 行**，而
        `npm run test:consistency` 仍 `CONSISTENCY OK` → 证明 `skills/**` 不在一致性守护面内。
        该漂移**本 Sprint 不修**（不在范围内），但新 `.cjs` **必须**登记镜像（T4），否则复现同一漂移。
      required: true
      covers: [T1, T4]
    - id: MG7
      type: manual_gate
      cmd: "grep -rn \"host_requires\" skills/kixpower/TEAM_CONVENTIONS.md dsh/preset-classic/skills/kixpower/TEAM_CONVENTIONS.md en/preset-classic-en/skills/kixpower/TEAM_CONVENTIONS.md"
      expect: >-
        3 个副本均出现 `host_requires` 与 `unavailable` 语义定义，措辞一致；
        且含「required gate 为 `unavailable` 时不得计入 `l2_verification_passed`」这一句。
      required: true
      covers: [T1]
    # ── v2 追加（2026-09-22 增量重规划；可读副本见 §16.3）──
    - id: MG8
      type: manual_gate
      cmd: "grep -c 'HOOK_LAUNCHER\\|HOOK_EXT' install.sh install.ps1; grep -c 'node \"{{COPILOT_HOME}}/skills/kixpower/hooks/' agents/*.agent.md"
      expect: >-
        ① `install.sh` / `install.ps1` 的 `HOOK_LAUNCHER|HOOK_EXT` 命中数 = **0**（占位符层已彻底移除）；
        ② root `agents/*.agent.md` 中 `node "{{COPILOT_HOME}}/skills/kixpower/hooks/` 的命中数 == T6 实际交付的
        声明数（预期 4，Dev 实测回填）；③ 每个 `<name>.cjs` 在 `skills/kixpower/hooks/` 下**存在**（`ls` 判据）。
      required: true
      covers: [T6, T7]
    - id: MG9
      type: manual_gate
      cmd: "grep -n 'hooks-coverage' docs/sprint-2/progress.md"
      expect: >-
        存在 `hooks-coverage:` 行，**10 行表覆盖全部 10 个 hook**，每行给出：类别（L1/L2/L3）、本 Sprint 取值
        （H-set-A / R3 候选）、promotion 判据（H-set-B）。缺任一 hook 行 ⇒ 记 unmet（**不得**以「见 plan §13.0」代替）。
      required: true
      covers: [T8]
    - id: MG10
      type: manual_gate
      cmd: "ls skills/kixpower/hooks/README.md dsh/preset-classic/skills/kixpower/hooks/README.md en/preset-classic-en/skills/kixpower/hooks/README.md; ls skills/kixpower/hooks/*.ps1 | wc -l"
      expect: >-
        ① 3 副本 README 均存在且 md5 一致；② 内含 `deprecated` 声明与「未移植 hook 在无 pwsh 宿主上不触发」的
        显式说明；③ **反向控制**：`ls skills/kixpower/hooks/*.ps1 | wc -l` = **10**（证明 H-D 未删除任何 `.ps1`）。
      required: true
      covers: [T8, T9]

drift_whitelist:
  - pattern: "docs/**"
  - pattern: ".kixpower/**"
  - pattern: "**/*.md"
  - pattern: ".github/**"
  - pattern: "kix-discipline/**"
  - pattern: "**/*.test.js"
  # 注：**不**白名单化 `**/*.cjs` —— 本 Sprint 的 `.cjs` 是**产品代码**（三个移植件 + sync 工具），
  # 白名单化会把主要交付物从 goal-drift 计算中豁免掉（与 Sprint 1 只白名单 `**/*.test.js` 的口径一致）。
```

> **`drift_whitelist` 说明**：`**/*.test.js` 覆盖 T1 新增的两个测试文件；4 处调用点文档（`.md`）与
> `TEAM_CONVENTIONS.md`（`.md`）命中 `**/*.md`；`consistency-lib.cjs` 与四个新 `.cjs` **刻意不在白名单内** ——
> 它们是本 Sprint 的**实质交付面**，必须被 `true_out_of_scope` 计算纳入。

**L2 必需 gate 集合**（供 orchestrator 计算 `l2_gate_manifest_sha256`）：
`required: true` 的 `local_gate` = **`[LG1, LG2, LG3, LG4, LG5, LG6, LG7, LG8, LG9, LG10, LG11, LG12]`**（12 条，按 id 排序后规范化 `{id,type,cmd,expect,required,host_requires}`）。
`ci_gate` / `manual_gate` 不进 digest，但计入 QA 签署证据。

### 7.1 HB-3（scoped trial）：链式入口的每一段都必须独立可观测

HB-3 的 `eval.trigger`（「plan.md 的 gate 引用了含 `&&` 的链式命令，或项目的 canonical 测试入口本身是 `&&` 链」）
在本 Sprint **独立匹配**（`package.json#scripts.test` 是 5 段 `&&` 链，`en/package.json#scripts.test` 是 4 段）。
落实：`LG1..LG5` 覆盖 zh 链的 5 段，`LG7` 补上 **en 链的链尾段**（此前无独立 gate），`LG6`/`LG8` 保留端到端为附加判据。
`pass_criteria`（每段独立 required gate + 各段 expect 为可复算计数）在本 plan 内可逐项核对。

### 7.2 HB-5（scoped trial）：manifest 规范化规则必须写进 plan（使任意宿主可独立复算）

> 这是 Sprint 1 R-1 / F-3 / U-1 的直接对策。以下规则**逐条对应 canonical 实现**（`kixpower-contract.ps1:173-196`）。

```text
manifest_spec:
  source: "docs/sprint-N/plan.md 的 verifiable_gates.local_gate 中 required == true 的记录"
  field_set: [id, type, cmd, expect, required]          # 顺序固定（PowerShell [ordered] 语义，kixpower-contract.ps1:176-182）
  sort: "by id"                                          # ⚠ 见下 order_ambiguity
  serialization: "compact JSON，无缩进、无 BOM、无尾随换行（PS ConvertTo-Json -Compress -Depth 4 语义）"
  encoding: "UTF-8 字节（Get-KixSha256 = UTF8.GetBytes → SHA-256 → 小写 hex；:187-196）"
  digest: "sha256(utf8(manifest_json))  小写十六进制，64 字符"
  order_ambiguity: >-
    PowerShell `Sort-Object id` 走 .NET **culture-aware** 字符串比较，而 JS 默认 `Array#sort()` 是 **UTF-16 码位序**。
    对 Sprint 1 的 8 个 gate（LG1,LG2,LG3,LG4,LG5,LG6,LG10,LG11）：
      culture-aware → LG1,LG2,LG3,LG4,LG5,LG6,LG10,LG11
      码位序        → LG1,LG10,LG11,LG2,LG3,LG4,LG5,LG6
    **两者不同** → 这是 R-1（QA 80 组候选均不匹配）的**首要候选解释**（假设，非结论）。
  escape_ambiguity: >-
    PowerShell `ConvertTo-Json` 对非 ASCII（本 plan 的 `expect` 大量含中文）与 HTML 敏感字符（< > & '）
    的转义随 PS 版本而异（5.1 全量 `\uXXXX`；7.x 行为不同）。**TS 侧必须先取证再固化**，不得凭印象选一种。
  first_probe: >-
    LG9 必须**同时**断言两种排序下的 digest，并报告哪一个（若命中）等于 `46121655…`；
    LG10（有 pwsh 时）以 oracle 输出直接裁决该二选一。
```

### 7.3 等价性取证方案（**本 Sprint 的核心交付**）

三条腿，证据强度**逐级不同**，禁止越级引用：

| 腿 | 名称 | 需要 pwsh | 能证明什么 | 不能证明什么 |
|---|---|---|---|---|
| **E1** | **差分对拍**（`ps1-parity.test.js`，LG10） | **是** | 「同一 fixture 下 `.cjs` 与 `.ps1` 的 stdout 逐字节 + exit code 一致」→ **行为等价**（在 fixture 覆盖范围内） | 未覆盖 fixture 的等价；fixture 之外的边界 |
| **E2** | **characterization**（`trust-chain.test.js`，LG9） | 否 | 「`.cjs` 的输出符合**从 `.ps1` 语义人工反推**的固定期望」+ 负向控制证明断言非恒真 | 与 `.ps1` 的**实际**行为一致（期望本身可能反推错） |
| **E3** | **冻结凭据复算**（LG9 内的一条断言） | 否 | 「Node 实现对**已记录的 pwsh 纪元产物**（`46121655…`）是否复算一致」 | 若该记录值本身有误，E3 会给出**误导性的 match**（记录值来源不明：Sprint 1 的 orchestrator 亦无 pwsh，故它也是移植实现 → E3 只能证明「两个移植实现一致」） |

**证据强度阶梯（不得越级）**：

```
E1 PASS                      → "行为等价（fixture 覆盖范围内）"         —— 本 Sprint 可达的最强结论
E2 PASS + E3 match           → "两个独立移植实现与记录值一致；与 .ps1 的实际行为未验证"
E2 PASS + E3 mismatch/undet. → "实现自洽；等价性未取证"（必须写进 done.md 的残余不确定）
E2 PASS + E1 unavailable     → **不得**表述为「等价性已证」；只能写「characterization 通过，差分通道 unavailable」
```

**降级路径（LG10 为 `unavailable` 时，必须在同一 revision 内完成）**：
1. `progress.md` 写 `parity-status: unavailable`，并记 `pwsh --version` 与 `brew install powershell` 的**实际失败输出**（不得只写「装不上」）；
2. `qa-signoff-2.md` 必须把「忠实移植」这一 claim 明确降级为 **characterization-only**；
3. `done.md` 的残余不确定必须包含「`.ps1` 与 `.cjs` 的实际行为差异未取证」，并给出可判定 falsifier
   （在任一具备 pwsh 的宿主上跑 LG10，应得 `parity: PASS`）；
4. 该降级**不影响** P1/P2 的交付判定（它们不依赖 E1），但**影响 P0 的完成度表述**。

### 7.4 「一次性 `brew install pwsh` 仅作 dev-time oracle」的取舍（**结论：采纳，verification-only**）

**选项与实测事实**：

| 项 | 实测结果 |
|---|---|
| 客户是否否决 | 否决的是「**以 pwsh 为运行依赖**」；**未**否决「把 pwsh 当验证工具」 |
| 可安装性（本机实测） | `brew info powershell` → **formula 7.6.6 (bottled)**，`Required (1): dotnet`；`brew info --cask powershell` → **`Cask 'powershell' is unavailable: No Cask with this name exists.`**（→ 必须走 formula，**不是** cask；这是容易写错的一步） |
| 成本 | 一次性下载 `powershell` + `dotnet` 依赖；不进仓库、不进发行面、CI 本就预装（`actions/runner-images` `Ubuntu2404-Readme.md:218` / `macos-15-Readme.md:152`） |
| 不装的机会成本 | LG10 永为 `unavailable` → 本 Sprint 的**中心 claim（忠实移植）在本机不可证伪**；E1 通道等于不存在；R-1 只能停在 `undetermined` |

**采纳理由（三条，均可判定）**：
1. **它把不可证伪的 claim 变成可证伪的 claim**：E1 是唯一能证伪「行为等价」的通道。没有它，「忠实移植」是一句无 falsifier 的话。
2. **边界可机械检查**（不是靠自律）：§7-MG1 直接断言产品 `.cjs` 零 `pwsh` 引用、parity 测试零 npm 链挂载。即
   「verification-only」在 diff 层面**可被 grep 判定**，而不只是文档承诺。
3. **失败模式是安全的**：oracle 装不上 → LG10 = `unavailable` → **不计入通过** + 走 §7.3 的降级路径。
   这条路径下 Sprint 仍能交付 P0（三个可执行 `.cjs`）、P1、P2，只是等价性 claim 降级并**显式登记**。

**硬边界（写入交付物，违反即 QA 拒签）**：
- oracle **只**能被 `skills/kixpower/tests/ps1-parity.test.js` 使用；产品代码（`*.cjs`，非测试）**零** `pwsh` 引用（MG1）；
- 不得新增任何 npm script 依赖 pwsh；`npm test` 在无 pwsh 宿主上必须保持 exit 0（LG6 是本机无 pwsh 的强判据）；
- 不得把 `pwsh` 写进 `package.json` 的 `engines` / `dependencies` / `files`；
- 不把 `.ps1` 文件删除或改写（它们是 E1 的参照实现；删除 = 自毁通道）。

**若用户后续否决安装**：plan 不重写，改由 orchestrator 在 `progress.md` 记 `pwsh-oracle: declined`，LG10 记 `unavailable`，
按 §7.3 降级路径执行 —— **这是预置的合法路径，不是失败**。

---

## 8. 交付物与责任人

| 产物 | 责任 | 说明 |
|---|---|---|
| `kixpower-contract.cjs` / `validate-memory-backlog.cjs` / `verification-fidelity-check.cjs`（各 3 副本） | Dev | 零第三方依赖，只用 `node:*`；stdout/exit 码与 `.ps1` 逐字对齐 |
| `skills/kixpower/tests/{trust-chain,ps1-parity}.test.js`（各 3 副本） | Dev | characterization（host-independent）+ 差分（`host_requires: [pwsh]`） |
| `scripts/sync-dsh-preset.cjs` + `scripts/sync-dsh-preset.test.js` | Dev | 5 条 pwsh 类 skip 归零；保留 1 条平台型 skip 语义 |
| `dsh/preset/plugins/consistency-lib.cjs`（4 副本同步） | Dev | 新 `.cjs` 镜像登记 + `checkSyntax({rel:'dsh/preset-classic'})` 补 symlink 盲区 |
| `dsh/preset-classic/agents/*.agent.md`（5）+ `en/preset-classic-en/agents/*.agent.md`（5） | Dev | P1：只删死 `hooks:` 块与收敛失效措辞 |
| 4 处调用点文档（`prompts/kixpower-new.prompt.md:80`、`skills/kixpower/USAGE_MANUAL.md:365`、`agents/kixpower-producer.agent.md:30-32` + DSH 副本） | Dev | 逐字改为 `node …cjs` 调用形式 |
| `skills/kixpower/TEAM_CONVENTIONS.md`（3 副本）的 `host_requires` / `unavailable` 增补 | Dev | T1 步骤 C；**单源 + 字节镜像** |
| `docs/sprint-2/drift-check.md` 的脚本输出追加段 | Dev（追加）+ Producer（保留手工 baseline 段不改） | Sprint 1 内容只读 |
| `docs/sprint-2/progress.md`（执行状态 / Trace Log / `pwsh-oracle:` / `R1-digest-recompute:` / `U2-parity:` / `ps1-drift:`） | orchestrator（+ Dev 串行模式写任务行） | frontmatter 数值为结构化真相源 |
| `docs/qa/qa-signoff-2.md` | QA（Ivy） | 必含 LG1–LG12 结论 + LG10 的三态取值 + MG1–MG7 结论 + §7.3 阶梯的**实际所处档位** |
| L2 证据（`l2_verification_passed` / `l2_verified_sha` / manifest digest） | orchestrator | 只有 orchestrator 可写；manifest 按 `[LG1..LG12]`（含 `host_requires`）规范化 |
| `docs/sprint-2/{plan,progress,runtime-context,drift-check}.md`、`PROJECT_BRIEF.md` §8/§11 | Producer | 本批产物 |

---

## 9. 开放问题（未取证事项，不得当作已定结论）

| ID | 问题 | 影响 | 取证方式 |
|---|---|---|---|
| **OQ0** | **Sprint 1 的 commit 计数存在追加性偏差**：`done.md` §6 记 `commits_used: 8` / `over_budget: 1`，但 `git rev-list --count c3c31eb..HEAD` 实测 = **9**（多出 `ef6a485`，其 message 自述「前次受 commit 硬上限阻塞」）。Sprint 1 的结论在其证据 revision（`a3cdfb1`）上**依然成立**，本项**不构成对 Sprint 1 的推翻**，只是把后续那 1 个 commit 补记进跨 Sprint 统计 | 跨 Sprint 的 bug/commit 率统计（本 Sprint `bug_reserve` 的输入之一） | 只读复核：`git log --oneline c3c31eb..HEAD`（9 行）。**处理 = 追加说明，不改写 `done.md` / `hill-climbing.md` 的任何字段** |
| **OQ1** | **PS `ConvertTo-Json -Compress` 的精确转义规则未取证**（非 ASCII / HTML 敏感字符随版本而异）；`Sort-Object id` 的 culture-aware 序 vs JS 码位序（§7.2） | 直接决定 `l2_gate_manifest_sha256` 能否被任意宿主复算（HB-5 / R-1） | LG10（有 pwsh 时）以 oracle 输出裁决；无 pwsh 时只能由 LG9 报 `undetermined` |
| **OQ2** | **oracle 安装是否被授权**：本 plan 采纳 `brew install powershell`（verification-only）。若用户否决 | LG10 恒 `unavailable` → 等价性 claim 降级（§7.3 降级路径） | 用户指示；失败输出记入 `progress.md` 的 `pwsh-oracle:` 行 |
| **OQ3** | **`docs/.kixpower-current-sprint` 仍为 untracked**（内容 `2`）；Sprint 1 的 OQ7 未解 | 「planning snapshot 前工作树必须干净」的判据仍不成立 | 确认入库或加 `.gitignore`。**Sprint 2 不处理**（避免把无关改动混进 host parity 的 diff） |
| **OQ4** | **既有未守护漂移**：`kixpower-contract.ps1` 源 517 行 vs 两个 preset 副本 507 行，`test:consistency` 仍 OK | 若新 `.cjs` 不登记镜像，会复现同一漂移（本 Sprint 已用 T4 步骤 B 阻断） | MG6 只记录不修；修与不修的裁决留 Sprint+1（§10-N1） |
| **OQ5** | **DSH 面向面上的 `pwsh` 宿主工具名引用是否应改为 `bash`**：`kix-guards.js:1117` 认 `{pwsh, bash}` 两者；但**本会话**（DSH 0.1.5-rc.2）实际暴露的终端工具是 `bash` | 影响 `DSH-ADAPTATION.md` 的映射表准确性与「双版本兼容（0.1.2-rc.1 / 0.1.5-rc.1）」claim | 需在 DSH 0.1.2-rc.1 与 0.1.5-rc.2 两侧各取一次 `tools` 列表实据。**本 Sprint 不裁决**，只把失效暗示（「hooks 已移植」）收敛掉 |
| **OQ6** | **`en/` 侧 `agents/*.agent.md` 的注记粒度**：en 副本的 DSH 适配注记措辞与 zh 侧不同（`grep -c "DSH"` = 1 或 2 不等） | P1 的 en 侧改动措辞需逐文件判定，不能机械套用 zh 文本 | T5 逐文件实读后改；QA 逐文件复核（MG2 的结构化谓词已把判据限定为「无 `^hooks:` 且无 `.ps1`」） |
| **OQ7** | **`verification-fidelity-check.cjs` 首次运行的 `baseline_source` 取值**：Sprint 1 的 done.md 用 `baseline_commit`，progress 用 `sprint_baseline_sha`（ps1 三个来源都试，见 `verification-fidelity-check.ps1:133-146`） | 决定 `fidelity_v5.baseline_sha` 与 `baseline_source` 的实际输出 | T3 首次运行后写入 `drift-check.md`；差异即为发现，不得静默对齐 |

---

## 10. Sprint+1 候选（本 Sprint 不做）

| ID | 候选 | 触发条件 |
|---|---|---|
| N1 | 修 `skills/kixpower/**` 的未守护漂移（517 vs 507），并把 `skills/**` 纳入一致性守护或显式声明「非镜像面」 | OQ4 的漂移在 Sprint 2 造成实际误导，或 Sprint 3 需改这些文件 |
| N2 | 其余 `.ps1` 的 Node 化（`hooks/*.ps1` 10 个 / `run-contract-regression.ps1` 864 / `install.ps1` 238 / 两个维护工具 160） | 若 Copilot 路径也被要求「无 pwsh 一等公民」；或 hooks 在 DSH 上被真正启用（OQ5 解后） |
| N3 | F-1：把 mtime 边界构造进 `install-lib.test.js` 的 fixture（HB-4 的完整落实） | Sprint 3 需要 CI 侧的幂等证据强度（当前 CI 绿不证明该路径被执行） |
| N4 | OQ8 / U-4：把 `preset-classic` / `preset-null` 两插件副本纳入执行面（当前仅字节守护） | 出现「4 副本字节一致但其中 1 副本不可运行」的实例 |
| N5 | baseline 对齐（本地 HEAD vs 上游 `main`，含 `v1.3.17` 的 CI failure run） | OQ4/R3 反复出现；或用户要求以上游最新为 baseline |
| N6 | `warn_threshold` 公式复核（δ≥3 且 reserve≥1 时接近 `hard_cap`，预警通道易失效） | Sprint 3 的 δ 再次 ≥ 4 |
| N7 | `host_requires` 推广到 `kix-guards.js`（把「能力型 gate 不计入通过」做成 hook 级强制，而非 schema + 文本） | 出现「gate 报 `unavailable` 却仍被计入 `l2_verification_passed`」的实例 |

---

## 11. Evals 回归与 scoped trials（v4.1）

> 消费对象：`.kixpower/memory/repo/harness-backlog.md`（`items_total: 6`，`by_status: {candidate: 6}`）。
> **Sprint 2 是这 6 项 `applies_to_sprints: ">=2"` 的首次独立匹配窗口**（Sprint 1 因 origin == 自身而全部 `not triggered`，见 `done.md` §7）。
> **红线：`not triggered` ≠ pass；`trial pass` 也**不等于**晋升 `validated`（晋升需后续 Sprint 再匹配且无反证）。

| 项 ID | eval.trigger | Sprint 2 是否匹配 | 落实位置 | 本 Sprint 记录 |
|---|---|---|---|---|
| **HB-1** | 「plan.md 目标或 diff 中出现新增/修改的测试用例，且该用例 spawn 外部可执行文件」 | ✅ **匹配**（新增 `ps1-parity.test.js` spawn `pwsh`；改写的 `sync-dsh-preset.test.js` spawn `node`） | T1 步骤 B（ENOENT 探针 + 机器可识别三态文案）、T4 | scoped trial，**待 QA 判定** |
| **HB-2** | 「新 Sprint 规划期基线（任一 canonical 测试命令）非绿」 | ❌ **不匹配**（规划期基线 `npm test` = exit 0、链尾 59/0/1；`cd en && npm test` = exit 0、35/0/1） | — | `not triggered`（**不得记为 pass**） |
| **HB-3** | 「plan.md 的 gate 引用了含 `&&` 的链式命令，或项目的 canonical 测试入口本身是 `&&` 链」 | ✅ **匹配** | §7.1：LG1–LG5 覆盖 zh 链 5 段、LG7 补 en 链链尾段、LG6/LG8 为端到端附加判据 | scoped trial，**待 QA 判定** |
| **HB-4** | 「plan / diff 中出现依赖文件系统状态（mtime/权限/顺序）或**环境状态**的断言」 | ✅ **匹配**（LG10 依赖宿主 `pwsh` 存在性这一环境状态；`host_requires` 的引入正是把该隐含依赖**显式化**） | T1 步骤 C（`host_requires`）、§7.3 的三态与降级路径 | scoped trial，**待 QA 判定** |
| **HB-5** | 「L2 交接写入 manifest digest，或 QA 需要复核该 digest」 | ✅ **匹配**（本 Sprint 必写 `l2_gate_manifest_sha256`，且 QA 必复核） | §7.2 的 `manifest_spec`（含 `order_ambiguity` / `escape_ambiguity` 两个待裁决项）+ LG9/LG10/MG3 | scoped trial，**待 QA 判定** |
| **HB-6** | 「plan.md 生成 `task_sizing.derived_commit_budget`，且该 Sprint 计划写入 `docs/sprint-N/{done,hill-climbing}.md` 或 `docs/qa/qa-signoff-N.md`」 | ✅ **匹配**（三份都会写） | §6 的 `closeout_layer: 1` 显式输入（**scoped trial，非公式修订**） | scoped trial，**待 QA 判定** |

**本 Sprint 无 `validated` 项可回归**（`by_status.validated = 0`）→ 不存在「已应用项命中 `regression_signal` → 降回 candidate」的情形。

**trial 的判定时点**（写清，防事后追认）：
- HB-1 / HB-3 / HB-4：plan 期即可比对（`check_timing: both`）→ **L2 前**由 orchestrator 首判，QA 复核；
- HB-5：`post-sprint` → 在 QA 复核 digest 时判定；
- HB-6：`post-sprint` → 在收尾 `git rev-list --count ef6a485..HEAD` 后判定（≤6 则 trial pass，7 则 trial fail 并如实记 `over_budget: 1`）。

---

## 12. 增量重规划（2026-09-22，T1/T5 提交后）：架构决策记录 `ADR-S2-1`

### 12.0 本节性质与不变量

| 项 | 内容 |
|---|---|
| 输入 ① | **用户决策（最高优先级）**：方案 B —— hooks 与 trust-chain **统一用 Node**（单一引擎） |
| 输入 ② | **新发现缺陷**（orchestrator 实测 → 本会话逐行复核）：两个 installer 的占位符契约**为空**，且失败**不报错** |
| 输入 ③ | 工作区**未提交 WIP**：`validate-memory-backlog.cjs`(190) / `verification-fidelity-check.cjs`(487) / `sync-dsh-preset.cjs`(311) + 测试与调用点改写（归属见 §12.3） |
| 不变量 | §1–§11 的 T1/T5 结论与证据**逐字不动**；`affc9c7` 的成果按**已完成**处理 |
| 本轮产出 | 本文件 §12–§19 + `progress.md` 同步 + `PROJECT_BRIEF.md` §8/§11 追加 + memory 追加（LL-8/LL-9、HB-7） |

### 12.1 决策陈述

```yaml
adr: ADR-S2-1
title: "单一 hook 引擎 = Node（.cjs）；hooks 与 trust-chain 共用同一宿主能力面（node）"
status: accepted
decided_by: 用户（经 orchestrator 转达；最高优先级，不再逐次确认）
decided_at: 2026-09-22
scope:
  - "4 个 load-bearing hook 的 Node 入口（§13.0 的 H-set-A）"
  - "两个 installer 的接线与 fail-closed 语义"
  - "等价性取证锚点由 .ps1 差分改为既有 JS 测试网（§14 之外的 §16 修订 + §12.2）"
non_goals:
  - "不改 dsh/preset*/plugins/kix-guards.js（4 副本零改动）"
  - "不删除任何 .ps1（含 hooks/*.ps1 30 个文件）"
  - "不新增第三方依赖 / 不新增 npm script / 不把 pwsh 写进 engines|dependencies|files"
```

**决策一句话**：**hook 的可执行性锚点从「宿主是否装了 `pwsh`」改为「宿主是否有 `node`」**，而 `node` 是本项目**已有的硬依赖**
（`package.json#engines: {node: ">=20.16.0"}`，实读）——因此这不是新增依赖，而是**把既有依赖用满**。

#### 12.1.1 Provenance（决策来源与它的证据）

| # | 来源 | 性质 | 实读证据 |
|---|---|---|---|
| P1 | 用户明确决策「方案 B：单一引擎 —— hooks 与 trust-chain 统一用 Node」 | **指令级**（最高优先级） | 本次调度指令 `[用户决策（已确认，最高优先级）]` |
| P2 | `dsh/preset/plugins/kix-guards.js`（1476 行 ×4 副本）已是 blast-radius / block-source-edit 语义的 **JS 忠实移植**，且带 `kix-guards.test.js`（696 行 / **159 断言**）测试网 | 工程事实 | `wc -l`；`module.exports.__internals` 34 个纯函数（`kix-guards.js:1439-1476`） |
| P3 | 本机无 `pwsh`，且用户**否决安装**（含一次性 oracle 用法） | 环境事实 + 指令 | `command -v pwsh` 空；`progress.md` 的 `pwsh-oracle: declined` |
| P4 | `node` 已是既有硬依赖 | 工程事实 | `package.json#engines.node = ">=20.16.0"`；本机 `node v22.14.0`（`/usr/local/bin/node`） |
| P5 | 占位符契约空洞 + 无条件成功 = **silent failure** | 缺陷事实（见 §12.1.3） | `install.sh:222-234,236-240`；`install.ps1:217-228`；`grep -rn "HOOK_LAUNCHER\|HOOK_EXT"` 仅命中 installer 自身 8 行 |

#### 12.1.2 两条被否方案（逐条给否证理由，不投票）

**方案 A（双份 shell 实现：bash/sh hooks + `{{HOOK_LAUNCHER}}`/`{{HOOK_EXT}}` 分支）— 否**

| # | 否证理由 | 证据 |
|---|---|---|
| A1 | 三平台需要**两种不同语言**的实现：`{{HOOK_LAUNCHER}}`/`{{HOOK_EXT}}` 只有两个槽位（`bash`/`sh` 与 `pwsh`/`ps1`），而 Windows 无原生 `bash`（Git Bash 不是 VS Code Copilot hooks 的一等宿主）→ 实际仍要**第三份** | `install.sh:228-229`、`install.ps1:223-224`（各只有一个二元替换） |
| A2 | 新增的 sh 实现**没有既有测试网**：JS 侧有 696 行 / 159 断言（`kix-guards.test.js`）；sh 侧为 0 → 等价性证据成本最高的一条路 | `wc -l dsh/preset/plugins/kix-guards.test.js`；`ls skills/kixpower/hooks/`（无 `.sh`） |
| A3 | 该分支的**载体本身**就是本次 silent failure 的现场：替换不生效**不报错**、0 文件 chmod 也报 `ok` → 保留它 = 保留「契约空洞且不可见」的结构 | §12.1.3 |
| A4 | 混合语言后，**输入契约归一化**（§12.2）要在两种 shell 各实现一遍 → 与 P2 的既有 JS 资产**完全不复用** | §12.2 |

**方案 C（继续依赖 `pwsh`：Windows 用 `pwsh`，macOS/Linux 由用户自行安装）— 否**

| # | 否证理由 | 证据 |
|---|---|---|
| C1 | 用户**明确否决**（既否决运行依赖，也否决一次性 oracle 用法） | 用户决策 + `progress.md: pwsh-oracle: declined` |
| C2 | `pwsh` 在 macOS/Linux **不是默认预装**：本机 `command -v pwsh` 空；`brew info --cask powershell` = Cask 不存在（必须走 formula 7.6.6，`Required (1): dotnet`） | `progress.md` F1 |
| C3 | 它把「无 pwsh 宿主」继续钉在能力降级上——与本 Sprint 的 Sprint 目标（§1）**直接矛盾** | §1 目标陈述 |
| C4 | `node` 已是硬依赖（P4），而 `pwsh` 不是 → 选 `pwsh` 等于**新增**一个宿主前提，选 `node` 等于**零新增** | `package.json#engines` |

#### 12.1.3 缺陷证据：占位符契约为空 + 失败不报错（silent failure）

> **本节是对 §2 相关条目的范围修订**（不是推翻）：§2 说「P1 只清 DSH 面向副本里的死引用」「Copilot 面 hooks 不是死引用」——
> 该判断在**语法层面**成立（root agents 的 `hooks:` 块确实被 Copilot 读取），但**在运行时层面不成立**：
> 命令里硬编码的 `pwsh` 在无 pwsh 宿主上不存在 → **声明存在、执行不存在**。这正是本轮补 P1′（hooks 面）的原因。

| # | 事实 | 实读证据 |
|---|---|---|
| D1 | `install.sh` 对已安装的 `agents/*.agent.md` 执行 `sed -e "s\|{{HOOK_LAUNCHER}}\|bash\|g" -e "s\|{{HOOK_EXT}}\|sh\|g"`，随后**无条件**打印 `ok "Replaced placeholders in agent.md files"` | `install.sh:222-233`（循环）/ `:234`（`ok`） |
| D2 | `install.ps1` 同构：`-replace` 为 `pwsh -NoProfile -File` / `ps1`，随后 `Show-OK` 无条件 | `install.ps1:217-227` / `:228` |
| D3 | **`{{HOOK_LAUNCHER}}` / `{{HOOK_EXT}}` 在任何源文件中都不存在**：`grep -rn`（排除本轮规划文档自身的引用）只命中两个 installer 的**注释行与替换行**，共 8 行（`install.sh:20-21,228-229`；`install.ps1:19-20,223-224`）。**另有 4 行**是不含占位符 token 的 dry-run 播报（`install.sh:155-156`、`install.ps1:141-142`，写着 `Hook launcher: bash` / `Hook launcher: pwsh -NoProfile -File`）——它们**宣告**这层替换，同属该契约的载体，T7 一并删除 | `grep -rn "HOOK_LAUNCHER\|HOOK_EXT"`（全仓，排除 `docs/**` 与 memory）；`grep -n "Hook launcher\|Hook extension" install.sh install.ps1` |
| D4 | `agents/*.agent.md` 的 20 处 hook 命令**硬编码** `pwsh -NoProfile -File "…ps1"`；文件里唯一真实占位符是 `{{COPILOT_HOME}}`（21 处） | `grep -o '{{[A-Z_]*}}' agents/*.agent.md \| sort \| uniq -c` |
| D5 | `install.sh:236-240` 的 `find "$COPILOT_HOME/skills" -name '*.sh' -exec chmod +x` 在 **0 个 `.sh`** 上执行后仍打印 `ok "chmod +x on .sh hooks/scripts"`（hooks 面根本没有 `.sh`） | `install.sh:236-240`；`ls skills/kixpower/hooks/` = 10 × `.ps1` |
| D6 | **净效果**：macOS/Linux 装完 Copilot 后 agent hooks 指向不存在的 `pwsh` → **hooks 永不触发**，而安装器**全程报成功**；Windows 因硬编码恰好正确而**不可见** | D1–D5 合成 |

**缺陷分类**：`silent failure`（契约空洞 + 无条件成功播报）。**已登记**：`lessons-learned.md` 的 `LL-8`、
`harness-backlog.md` 的 `HB-7`（完整 `eval{}`）、`progress.md` 的「阻塞与风险」表。

#### 12.1.4 本决策能被什么否证（falsifier，防事后追认）

| # | 若观测到 | 则 |
|---|---|---|
| F-a | 在真实 VS Code Copilot 会话里，`node "…\.cjs"` 形式的 hook 命令**不被执行**（例如 Copilot 只接受 `hooks:` 的某种固定 shell 形态） | `ADR-S2-1` 的「接线面」失败 → 回到 A（双份实现）或改为 `npx`/`node` 全路径变体，**不得**把「文件已存在」当作已生效 |
| F-b | Copilot 对 hook **spawn 失败**按 `deny` 处理 | 无 pwsh 宿主上未移植的 6 个 hook 会**阻塞全部工具调用** → 必须立即移植或移除这些声明（见 `OQ8`；本 plan 预先声明该分支） |
| F-c | 任一已移植 hook 在负向控制用例下**未 deny**（例如合法编辑被拦、或危险命令被放行） | H-set-A 的判定移植失败 → 该 hook 回退为 `.ps1` 声明并在 `done.md` 记残余缺陷 |
| F-d | `kix-guards.test.js` 的 159 断言在新 revision 上出现红 | P2 的「既有 JS 测试网」证据锚点失效 → §16 的 LG15 结论降级，`ADR-S2-1` 需重估 |

### 12.2 第二层缺陷：hook 输入契约失真（决定 H-A 的接口面）

**repo 内已有审计结论（文档级证据，本机未实测）**：`dsh/preset-classic/DSH-ADAPTATION.md:56` 记录 ——
VS Code Copilot 真实运行时（`copilot-agent 1.0.70+`）的 hook 载荷与 `.ps1` 假设**不同**：

| 事件 | 真实载荷（文档记录） | `.ps1` 实际读取 | 后果 |
|---|---|---|---|
| preToolUse | `toolCalls:[{id,name,args}]`（`args` 为 **JSON 字符串**） | `$hookInput.tool_name` + `$hookInput.tool_input`（`block-source-edit.ps1:29-31` 等；**10 个 hook 里 9 个**读 `tool_name`） | 取到 `$null` → 多数分支直接 `exit 0`（放行） |
| postToolUse | `toolName` / `toolArgs` | 同上（`qa-freshness-check.ps1:12-13`） | 同上 |
| 工具名 | `powershell`/`bash`/`edit`/`create`/`view`/`grep`/`glob`/`ask_user`/`task`/`web_fetch`；GitHub MCP = `GitHub-*` | `apply_patch`/`replace_string_in_file`/`run_in_terminal` 等旧名（`qa-freshness-check.ps1:14`） | 工具名不匹配 → 分支不进 |

**结论（写入 H-A 的交付面）**：即使修好 launcher，**判定输入仍是旧 schema** → 「能启动」≠「会生效」。
故 `T6` 的 core 必须含 **payload 归一化层**（同时接受 legacy `tool_name/tool_input` 与 `toolCalls[]` / `toolName+toolArgs`，
并做工具名别名归一），且该层**必须有自己的固定用例**——否则只是把静默失效从 launcher 层搬到契约层。

> **证据强度声明**：本节依据的是**仓库内审计文档**（`DSH-ADAPTATION.md:56`，2026-08-16），**不是**本机实测。
> 真实载荷形状取证登记为 `OQ9`；本 plan **不**据此宣称「已确证」，只据此**要求 core 容忍两套 schema**（容忍的成本极低，漏判的成本是静默放行）。

### 12.3 WIP 归属表（未提交工作如何进入任务节点）

> 工作树实测（`git status --porcelain`）：**14 M + 11 ??**。**WIP 的存在不构成任务完成**——它没有 gate 证据，
> 且 `affc9c7` 之后未再提交。归属如下（**一个 WIP 路径只归一个节点**）：

| WIP 路径（含副本） | 归属节点 | 已在工作区的实质 | **未完成**（阻塞结算的部分） | 不得声称 |
|---|---|---|---|---|
| `skills/kixpower/scripts/validate-memory-backlog.cjs`（190 行，3 副本） | **T2** | 移植实现已存在 | `U2-parity:` 三元组对拍；LG12 在新 revision 实测；镜像登记（T4） | 「T2 已完成」 |
| `skills/kixpower/scripts/verification-fidelity-check.cjs`（487 行，3 副本） | **T3** | 移植实现已存在 | 首次真实运行 + 输出 YAML 追加 `drift-check.md`；LG11 实测 | 「已解除 `baseline_degraded`」 |
| `scripts/sync-dsh-preset.cjs`（311 行，**单副本**） | **T4** | 移植实现已存在 | `scripts/sync-dsh-preset.test.js` **仍 spawn `pwsh`**（本会话实测 `test:installer` = 25/20/0/**5**，5 条 skip 未归零）；镜像/语法覆盖登记（T4 步骤 B） | 「P2 已完成」 |
| `skills/kixpower/tests/{trust-chain,ps1-parity}.test.js`（+196 / +153，各 3 副本） | **T2/T3** | parity 与 characterization 用例已扩到 validator/fidelity | 在层 2 的新 revision 上重跑 LG9/LG10；`unavailable` 的退出码修订（§16.2，T6） | 「等价性已证」 |
| `prompts/kixpower-new.prompt.md`、`skills/kixpower/USAGE_MANUAL.md`（各 3 副本）、`agents/kixpower-producer.agent.md` | **T2/T3** | 调用点已改写为 `node …cjs` | 随 T2/T3 的 gate 一并结算 | 同上 |
| `PROJECT_BRIEF.md`（规划期追加段） | **Producer** | §8/§9/§11/§12 的规划期追加 | 本轮再追加 §8/§11（见 §12.4 之后） | — |

**纪律**：Dev 继续这些 WIP 时**不得**把它们拆成独立 commit（每 DAG 层 1 个 commit，见 §15）；
QA/L2 **不得**把「文件存在」当作「任务完成」；`progress.md` 的 T2/T3/T4 状态 = `[~]`（进行中）。

### 12.4 规划期事实复核（本会话实测，新增 `RF-1–RF-7`；`F1–F10` 保持不动）

> **编号空间声明**：本表用 **`RF-*`（Replanning Facts）**，与 `progress.md` 的事实台账 **`F11–F19` 不共享编号空间**。
> `progress.md` 的台账是本轮事实的 canonical 记录（逐条带证据，含 D-1/D-2/D-3 缺陷登记）；本表是**决策视角**的精简复核。
> 两处描述同一批观测 → **任一处的数字变化必须在另一处同步**（QA 的交叉核对点）。

| # | 事实 | 证据（实读/实跑） |
|---|---|---|
| **RF-1** | `ADR-S2-1` 的缺陷证据 D1–D6 全部逐行复核成立（占位符不存在、`ok` 无条件、chmod 段空转） | §12.1.3；`install.sh:222-240`、`install.ps1:217-228` |
| **RF-2** | hooks 面**第二处未守护漂移**：`blast-radius-check.ps1` 源 **556 行** vs 两个 preset 副本各 **444 行**（其余 9 个 hook 三副本 md5 一致） | `wc -l` ×3；`md5 -q` 逐文件比对（10 行表） |
| **RF-3** | root（Copilot 面）`agents/*.agent.md` 共 **20 处** hook 命令声明：blast-radius 5 / pre-commit-lint 5 / block-dev-authority-edit 2 / block-source-edit 2 / block-source-edit-qa 1 / validate-handoff 1 / validate-qa-signoff 1 / qa-freshness 1 / auto-update-progress 1 / cleanup-qa-session 1；**DSH 面 = 0**（T5 已清） | `awk`/`grep` 逐文件实读；`kixpower-reviewer.agent.md` 无 hooks |
| **RF-4** | `kix-guards.js` = 4 副本 × 1476 行；`__internals` 导出 **34 个**纯函数；`kix-guards.test.js` = 696 行 / **159 断言 / 1 个 `node:test` 单元**（单点失败折叠为 `1 fail`）→ 新证据网必须用**细粒度 `test()`** | `grep -c assert`；`node --test …` = `pass 1 / fail 0` |
| **RF-5** | 本会话实测：`npm run test:installer` = **25 tests / 20 pass / 0 fail / 5 skip**（5 条 `SKIP: pwsh unavailable`）；`node --test scripts/install-lib.test.js` = **20/0/0**；`node` = `v22.14.0`；`pwsh` = absent | 实跑输出；`command -v` |
| **RF-6** | `install.sh` / `install.ps1` 均为**单副本**（`en/` 无 installer；`en/package.json#scripts.test:installer` 只跑 `install-lib.test.js`）→ H-B 的改动面是 **2 个单文件**，无镜像要求 | `ls en/install.sh` = 不存在；`en/package.json#scripts` |
| **RF-7** | 发行面**交集为空**：Copilot 安装只复制 `skills/**`+`agents/**`（不装 `dsh/**`）；`dsh/preset-null/` **没有 `skills/`** 兄弟目录 → 任何方向的跨面 `require` 都会在某一面上死掉 | `install.sh:163-172`（skills 复制段）；`ls dsh/preset-null/` = `agent.cordis.yml / plugins / preset.yml / prompts` |

---

## 13. hooks 工作流任务（**H-A..H-D = T6..T9**，编号续接 §4 的 T1–T5）

### 13.0 覆盖范围裁决（H-C 的规划期结论；先核实，再决定）

**核实维度**：① 被哪些 `agents/*.agent.md` 声明（RF-3）；② 能否在 **DSH** 上触发（`DSH-ADAPTATION.md:47-53` 逐 hook 实读）；
③ 类别（不存在的后果）；④ 本 Sprint 是否移植。

| hook（源行数） | 声明者（root `agents/`） | 声明数 | DSH 侧现状（实读 `DSH-ADAPTATION.md`） | 类别 | 本 Sprint |
|---|---|---|---|---|---|
| `blast-radius-check.ps1`（556） | kixparadigm, dev, orchestrator, producer, qa | 5 | ✅ `:48` → `kix-guards.js`（原生，live） | **L1 deny** | **H-set-A** |
| `block-source-edit.ps1`（203） | orchestrator, producer | 2 | ⚠️ `:51` 未移植（保留为 prompt 硬约束） | **L1 deny** | **H-set-A** |
| `block-source-edit-qa.ps1`（193） | qa | 1 | ⚠️ `:51` 同上 | **L1 deny** | **H-set-A** |
| `block-dev-authority-edit.ps1`（186） | dev, producer | 2 | ⚠️ `:51` 同上 | **L1 deny** | **H-set-A** |
| `validate-handoff.ps1`（365） | orchestrator | 1 | ✅ `:49` 核心 → `kix-orchestration.js`（深度部分 `:50` 不移植） | L2 trust | H-set-B |
| `validate-qa-signoff.ps1`（201） | orchestrator | 1 | ❌ `:52` 不移植（L2 manifest/QA session 为 Copilot 特有） | L2 trust | H-set-B |
| `qa-freshness-check.ps1`（134） | qa | 1 | ❌ `:52` 同上 | L2 trust（marker 写入侧） | H-set-B |
| `cleanup-qa-session.ps1`（41） | orchestrator | 1 | ❌ `:52` 同上 | L3（cleanup） | H-set-B |
| `auto-update-progress.ps1`（55） | dev | 1 | ❌ `:52` 同上 | L3（remind，fail-open） | H-set-B |
| `pre-commit-lint-check.ps1`（195） | kixparadigm, dev, orchestrator, producer, qa | 5 | ⚠️ `:64` 部分（`kix-discipline` 记账） | L3（remind，**fail-open**，`:7` 自述） | H-set-B |

**裁决判据（机械、可复核，不投票）**：

| 判据 | 定义 | 命中的 hook |
|---|---|---|
| **L1（本 Sprint 做）** | ① 非 fail-open 的 **deny** 类；② 其不存在会直接使「越界写 / 不可逆破坏」**无门禁**；③ 判定语义**在既有 JS 资产中有对应实现或可复用同一 core** | blast-radius-check（`__internals` 直接对应）、block-source-edit / -qa / block-dev-authority-edit（同 core 的「编辑工具 + 路径/角色边界」判定） |
| **L2（Sprint 3，最高优先）** | 校验 L2/QA 信任链**产物**（handoff / qa-signoff / freshness marker） | validate-handoff、validate-qa-signoff、qa-freshness-check |
| **L3（Sprint 3）** | remind / cleanup 级：不存在只降低纪律，不产生不安全状态 | auto-update-progress、pre-commit-lint-check、cleanup-qa-session |

**H-set-A = 4 个（1138 行源）**；**H-set-B = 6 个（991 行源）→ Sprint 3 候选（§18-N9）**，其 **promotion 判据**逐条写明：

| H-set-B 项 | promotion 判据（全部满足才开工） |
|---|---|
| `validate-qa-signoff.cjs` + `qa-freshness-check.cjs` + `cleanup-qa-session.cjs`（**必须同批**） | ① `T6` 的 payload 归一化层通过 LG15；② `docs/.kixpower-qa-session.json` 机制仍在用（Copilot 侧 L2/QA 流程未废弃）——**三者共享 QA session marker 语义**，分批移植会出现「marker 只写不读 / 只读不写」 |
| `validate-handoff.cjs` | Copilot 侧的「深度部分」（worktree 登记 / `plan_snapshot_sha` / `l2_gate_manifest_sha256` / stash / reverify marker）仍在 release 判据中 |
| `auto-update-progress.cjs` | 出现 **≥2 次**「Dev 完成编辑但 `progress.md` 未同步」的实例（remind 级，fail-open） |
| `pre-commit-lint-check.cjs` | Copilot 侧 lint 覆盖成为 `release_eligible` 判据；或出现 **≥1 次**「提交未过 lint 且 CI 未拦」实例 |

**未移植的 6 个 hook 的声明策略（不得静默）**：**保留** root agents 里的 `pwsh` 声明（删除 = Windows 功能回退），
但在其 `hooks:` 块**追加宿主能力条件注记**（T8 交付），并把「hook spawn 失败 = deny 还是 ignore」登记为 `OQ8`。
**若 `OQ8` 取证为 `deny`**：无 pwsh 宿主上这 6 条声明会阻塞全部工具调用 → 唯一合法处置是「立即移植或移除声明」，
本 plan 预先声明该分支（与 §7.4「预置的合法路径」同构）。

### 13.1 T6（H-A）— 单一 hook 引擎：core + 4 个 Node 入口 + JS 证据网

- **H-A 的核心取舍（已判定，附爆炸半径评估）**：
  **不做跨发行面 `require`；做「单一 core（skills 面）+ 双侧同源断言」。**

  | 方案 | 可行性 | 判定 |
  |---|---|---|
  | ① `kix-guards.js` 与 hook 入口共享同一 core 模块（core 放 plugins 面，hooks require 它） | **不可行**：Copilot 安装只复制 `skills/**`+`agents/**`，**不装 `dsh/**`**（RF-7）→ 入口在 Copilot 宿主上 `MODULE_NOT_FOUND` | ❌ |
  | ② core 放 skills 面，`kix-guards.js` require 它 | **不可行**：`dsh/preset-null/plugins/` 无 `skills/` 兄弟目录（RF-7）→ preset-null 插件装载失败；且插件面受装载/`restrict` 约束（`kix-guards.js:14-17` 头注） | ❌ |
  | ③ **core 放 skills 面（3 副本），`kix-guards.js`（4 副本）本 Sprint 零改动，两侧由机械断言绑定** | 可行：`skills/kixpower/hooks/lib/kix-verdict.cjs` 在**两个发行面都存在**（Copilot 面 ✓；preset 面 ✓ 经 `dsh/preset/skills` symlink） | ✅ **选定** |

  **③ 的绑定断言（把「两份实现」变成「一份源 + 一处可检测的同源声明」）**：
  (a) **同源函数体断言** —— core 导出的每个纯函数，其**规范化函数体**（去注释/空白）必须在 `kix-guards.js` 的
  `__internals` 同名函数上**逐字相等**；任一漂移 → LG15 红。
  (b) **共享语料断言** —— 同一 fixture 语料同时喂 core 与 `__internals`，要求 verdict 一致；
  并要求 core 路径可注入（`KIX_HOOK_CORE_PATH`）以支持 mutation probe。

  **取舍理由（净收益）**：跨面 require 的收益 = 消除重复实现；成本 = 在一个发行面上**必然失效**（RF-7）+ 与插件装载贴合
  + 把 4↔3 副本组跨树耦合（`sync-dsh-preset` 的语义是 preset 内同步，「只装 skills」的场景会变半可用）。
  **爆炸半径**：方案 ③ 触碰 `skills/kixpower/hooks/**`（3 副本）+ 1 个测试文件（3 副本）+ `consistency-lib.cjs` 的镜像登记（4 副本，T4 负责）；
  **`kix-guards.js` 4 副本与 DSH 装载面零改动**。

- **步骤 A（core）**：`skills/kixpower/hooks/lib/kix-verdict.cjs`（3 副本）：
  1. **payload 归一化**（§12.2）：legacy `tool_name`+`tool_input` 与 `copilot-agent 1.0.70+` `toolCalls[{name,args}]`、`toolName`+`toolArgs` 双支持；
     `args` 为 JSON 字符串时解析并把解析失败视为 **deny**（与 `.ps1` 的 `ConvertFrom-Json` catch → deny 同语义，实读 `block-source-edit.ps1:26-28`）。
  2. **判定层**：从 `kix-guards.js` 的 `__internals`（34 个纯函数）**逐字抽取**：`stripSqlNoise`/`isDestructiveSql`/`isTerminalDestructiveSql`/
     `splitShellSegments`/`shellTokens`/`leadingCommand`/`gitInvocations`/`isForcePush`/`pushTargetsProtectedRef`/`resolveCommitBudget`/
     `countReflogCommits`/`targetsControlPlane`/`isInstallControlPlanePath` 等；**新增**（既有 JS 侧没有的）只有：编辑工具名集合、
     路径/角色边界（`block-source-edit*` / `block-dev-authority-edit` 的规则集合，从对应 `.ps1` 反推）。
  3. **输出协议**：与 `.ps1` 同构 —— stdout 单行 JSON `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":…}}`
     + `exit 2` = deny；`exit 0` = allow（实读 `block-dev-authority-edit.ps1:24-33`）。
  4. **契约模块复用**：读 `progress.md` 的 `blast_radius.commit_budget` → 复用 `../scripts/kixpower-contract.cjs` 的 `frontmatter/yamlScalar`
     （同树 require，两个发行面都存在）→ 这是 **T6 ← T1 的 strong 耦合**来源。
- **步骤 B（4 个入口，各 3 副本 = 12 文件）**：`blast-radius-check.cjs`、`block-source-edit.cjs`（`--role producer|orchestrator`）、
  `block-source-edit-qa.cjs`、`block-dev-authority-edit.cjs`；每个入口 = **薄 CLI**（stdin → core → 输出 + exit code），不含判定逻辑。
- **步骤 C（证据网）**：`skills/kixpower/tests/hook-engine.test.js`（3 副本）：
  - **细粒度 `test()`**（吸取 RF-4 的教训：696 行/159 断言折叠成 1 个单元，失败不可定位）；
  - 两套 payload schema 各 ≥3 组固定用例 + 工具名别名用例；
  - **每个已移植 hook ≥1 负向控制**（反例必须 **allow**：合法编辑、非 git 命令、非破坏性 SQL）；
  - **mutation probe**：`KIX_HOOK_CORE_PATH=<被故意改坏语义的临时副本>` → 套件**必须红**（证明断言非恒真）；
  - **同源函数体断言**（上文 (a)）。
- **步骤 D（CI 侧的 E1 通道）**：把 `node --test skills/kixpower/tests/ps1-parity.test.js` 加为 CI 的**独立 step**（`.github/workflows/ci.yml`），
  并把 `unavailable` 的进程退出码由 `1` 改为 **`2`**（`0`=PASS / `1`=FAIL / `2`=unavailable）。
  **这是对 T1 行为的显式修订**（T1 记录「exit 1 且非 FAIL」保持不动；`unavailable ≠ pass` 语义不变）——
  理由：CI 上必须能机械区分「**已证伪**（FAIL）」与「**能力缺失**（unavailable）」，否则 CG4 无法定档。
- **交付**：`hooks/lib/kix-verdict.cjs` + 4 入口（各 3 副本）、`tests/hook-engine.test.js`（3 副本）、CI step、`ps1-parity.test.js` 的退出码修订。
- **不做什么**：**不改 `kix-guards.js`**；不改 `hooks/*.ps1`（一个字节都不改，它们是参照实现）；不改 npm scripts；不新增依赖；
  不把「characterization 绿」写成「与原 `.ps1` 等价」（§16.2）。
- 文件：`skills/kixpower/hooks/lib/kix-verdict.cjs`、`skills/kixpower/hooks/{blast-radius-check,block-source-edit,block-source-edit-qa,block-dev-authority-edit}.cjs`、
  `skills/kixpower/tests/hook-engine.test.js`、`skills/kixpower/tests/ps1-parity.test.js`、`.github/workflows/ci.yml`（+ 2 组 preset 副本）

### 13.2 T7（H-B）— 接线与失败关闭（fail-closed）：三平台单一 launcher + installer 不许假绿

- **命令面统一（4 个已移植 hook）**：root `agents/*.agent.md` 的对应命令改为
  `node "{{COPILOT_HOME}}/skills/kixpower/hooks/<name>.cjs"`（`block-source-edit` 追加 `--role orchestrator` / `--role producer`）。
  统一形态使 `{{HOOK_LAUNCHER}}`/`{{HOOK_EXT}}` **这层替换彻底不需要**（三平台同一字符串，`node` 已在 `engines` 中）。
- **占位符面（删除）**：`install.sh:20-21,228-229` 与 `install.ps1:19-20,223-224` 的 `HOOK_LAUNCHER`/`HOOK_EXT`
  注释与替换行**整段删除**；同时删除不含 token 的 dry-run 播报行（`install.sh:155-156`、`install.ps1:141-142`
  的 `Hook launcher` / `Hook extension`——它们宣告同一层被删掉的替换）；保留 `{{COPILOT_HOME}}`（唯一真实占位符，21 处）。
- **INV-H1（fail-closed）**：替换完成后**扫描已安装**的 `$COPILOT_HOME/agents/*.agent.md`，若残留**任一** `{{...}}`
  → 打印机器可识别错误行 `KIX-INSTALLER-RESIDUE: <file>:<line>` 并 **exit 1**（`install.ps1` 同构）；
  **禁止**在该分支之后再打印 `ok` / `Show-OK`。
- **INV-H3（不许假绿）**：`install.sh:236-240` 的 chmod 段改为「先计数再处理」：`0` 个 `.sh` → 打印 `skip: chmod +x (0 .sh files)`；
  `n>0` → 执行并打印 `ok: chmod +x (n .sh files)`。**任何在作用域为空的批量操作上打印 `ok` 的分支都必须消除。**
- **步骤 C（机械判据，双向）**：`scripts/copilot-installer.test.js`
  - **正向**：最小 fixture bundle（`install.sh` + `agents/*.agent.md` + 一个含 `SKILL.md` 的 skill 骨架）→ 装到临时 `COPILOT_HOME`
    → `exit 0` 且 `grep -r '{{' <tmp>/agents` = **0 行**；并断言每个已移植 hook 命令的 launcher 可解析（`node` 存在）。
  - **负向**：向 fixture 的某个 agent 文件注入 `{{KIX_RESIDUE_PROBE}}` → 安装器**必须 exit ≠ 0** 且输出含 `KIX-INSTALLER-RESIDUE`。
  - **双向并跑才构成判据**（否则 exit-code 断言可能恒真/恒假）；win32 上以**平台型 skip**（语义保留），文案可机器识别（HB-1）。
  - 落点：新文件加入**既有** `test:installer` 命令行（`package.json#scripts.test:installer` 追加文件参数，**不新增 script 名**）。
    **这是对 §4-T4「不做什么」中「`test:installer` 的文件清单不变」一句的显式修订**——理由：fail-closed 必须有**可重放**的机械判据，
    grep 型判据无法证明「残留 ⇒ 非零退出」。LG1 期望计数随之变为 `25 + N`（N 由 Dev 实测回填，**不得预填**）。
- **`install.ps1` 的可验证性边界（如实登记）**：本机无 `pwsh` → `install.ps1` 的同构改动**只能给静态判据**（MG8 的 grep + 结构检查），
  可执行验证走 **CG5**（CI windows job smoke + 注入哨兵负向用例）。此边界写入 `done.md` 的残余不确定。
- **不做什么**：不改 `scripts/install-lib.js`（npm/DSH 安装路径，无占位符逻辑；本会话实测 20/20）；不改 `en/**`（无 installer，RF-6）；
  不删任何 `.ps1`；不新增依赖。
- 文件：`install.sh`、`install.ps1`、`agents/{kixparadigm,kixpower-dev,kixpower-orchestrator,kixpower-producer,kixpower-qa}.agent.md`、
  `scripts/copilot-installer.test.js`、`package.json`（仅 `test:installer` 参数）

### 13.3 T8（H-C）— 覆盖裁决留痕 + 未移植声明的「不许静默」

- 交付 ①：`skills/kixpower/hooks/README.md`（**3 副本**，新增）：
  1. 10 个 hook 的**宿主状态表**（L1/L2/L3 + 已移植/未移植 + `DSH-ADAPTATION.md` 的等价物引用行号）；
  2. **H-set-B 的 promotion 判据**（逐条复制 §13.0 表）；
  3. 「已移植 hook 的 `.cjs` 是唯一 canonical；对应 `.ps1` 为 deprecated 参照实现」的声明（与 T9 一致）；
  4. **未移植 hook 在无 pwsh 宿主上不触发**的显式说明（禁止暗示「已完成」）。
- 交付 ②：root `agents/*.agent.md`（5 个）—— 在未移植的 6 条 hook 命令处追加**宿主能力条件注记**（YAML 注释形式，
  不得破坏 frontmatter 解析）。**只追加注记**：不改命令、不删声明、不动 DSH 面向副本（T5 已清空，本任务**不回填**）。
- 交付 ③：`progress.md` 落 `hooks-coverage:` 行（10 行表：hook → 类别 → 本 Sprint/R3 → promotion 判据）。
- 不做什么：不移植 H-set-B；不改 `hooks/*.ps1`；不改 `kix-guards.js` / `kix-orchestration.js`。
- 文件：`skills/kixpower/hooks/README.md`（3 副本）、root `agents/*.agent.md`（5）、`docs/sprint-2/progress.md`

### 13.4 T9（H-D）— `hooks/*.ps1` 的去留：**保留 + 标记 deprecated**（不删除）

**决策：保留全部 30 个文件（10 × 3 副本，源 2129 行），仅在文档与调用面标记 `deprecated`。**

| # | 理由 | 证据/依据 |
|---|---|---|
| R1 | **本仓库是已发布 npm 包**（`package.json#files` 含 `skills/`、`dsh/`、`install.sh/ps1`）→ 删除 = 对已安装用户与引用 `.ps1` 的自定义接线构成**破坏性变更**（需 major 版本）；保留的可回滚性 = 100%（任何时候都能删），删除的可回滚性 = 依赖消费者是否已升级 | `package.json#files` 实读 |
| R2 | **它们是 H-set-B（6 个未移植 hook）唯一的参照实现** → 删除 = 自毁 Sprint 3 的移植与对拍通道（与 §3 拒绝删 `sync-dsh-preset.ps1` 的判据同源） | §13.0 表；`skills/kixpower/hooks/*.ps1` 实存 |
| R3 | **Windows + VS Code Copilot 路径仍能工作**（硬编码 `pwsh` 在 Windows 恰好正确，D6）→ 删除会**造成实际功能回退**，而本 Sprint 的判据是「不回退、只补齐」 | §12.1.3 D6 |
| R4 | 删除的收益（仓库瘦身 ~2129 行/副本组）**远小于**上述三项风险；「规则/资产是负债」的修剪应发生在**等价性证据链建立之后** | §16.2 证据阶梯 |
| R5 | 漂移事实不改变结论：`blast-radius-check.ps1` 源 556 vs 副本 444（RF-2）→ **canonical = 源**（Copilot 安装路径实际安装的那份，`install.sh:163-172`）；副本差异是否含真实语义改进留 `OQ10`/`N8` | RF-2 |

**删除的最早时点（Sprint 3+，判据全部满足）**：① H-set-A 的 Node 入口在真实 Copilot 会话中被确认生效（`OQ8` 解）；
② Windows 侧的 Node 等价验证完成；③ 至少一个 minor 版本的 `deprecated` 窗口；④ `CHANGELOG` 记破坏性变更说明。

**标记方式（最小成本、零编码风险）**：**不逐文件改 30 个 `.ps1`**（避免 BOM/编码与 30 文件大 diff 风险），
只在 ① `hooks/README.md`（T8 交付）② `agents/*.agent.md` 的注记 ③ 本 plan/`progress.md` 声明三层留痕。
- 不做什么：不删除、不改写任何 `.ps1` 内容（它们是参照实现）。
- 文件：`skills/kixpower/hooks/README.md`（3 副本，与 T8 同一文件 → 同层合并）、`docs/sprint-2/{plan,progress}.md`

### 13.5 任务清单（`- [ ]` 格式，与 §4 同构；供 orchestrator 分派与 `checkPlanContract` 的任务清单存在性校验）

- [ ] **T6（H-A）单一 hook 引擎**：`hooks/lib/kix-verdict.cjs`（payload 归一化 + 逐字抽取的判定层 + 与 `.ps1` 同构的输出协议）
      + 4 个入口 `.cjs`（各 3 副本）+ `tests/hook-engine.test.js`（细粒度 + 负向控制 + mutation probe + 同源函数体断言）
      + CI 侧 parity step 与 `unavailable` 退出码 2 修订
      - 不做什么：不改 `kix-guards.js`、不改任何 `.ps1`、不新增依赖/npm script
      - gate：LG15（+ CG4 的 CI 通道）；证据行：`hook-engine-evidence:`
- [ ] **T7（H-B）接线与失败关闭**：root `agents/*.agent.md` 的 4 个 hook 命令统一为
      `node "{{COPILOT_HOME}}/skills/kixpower/hooks/<name>.cjs"`；两个 installer 删除 `HOOK_LAUNCHER`/`HOOK_EXT` 层、
      加 INV-H1 残留 fail-closed、修 INV-H3 空作用域假绿；新增 `scripts/copilot-installer.test.js`（正/负双向）并加入既有 `test:installer`
      - 不做什么：不改 `scripts/install-lib.js`、不改 `en/**`、不删 `.ps1`
      - gate：LG16、MG8（+ CG5 的 windows smoke）；证据行：`installer-failclosed:`
- [ ] **T8（H-C）覆盖裁决留痕**：`hooks/README.md`（3 副本）+ 未移植 6 条 hook 的宿主能力条件注记（root agents 只追加）
      + `hooks-coverage:` 行（10 行表 + promotion 判据）
      - 不做什么：不移植 H-set-B、不回填 DSH 面向副本
      - gate：MG9、MG10；证据行：`hooks-coverage:`
- [ ] **T9（H-D）`hooks/*.ps1` 保留 + deprecated 标记**：README 的 deprecated 段 + 删除判据与可回滚性落盘
      - 不做什么：不删除任何 `.ps1`、不逐文件改 30 个 `.ps1`
      - gate：MG10（反向控制：`ls skills/kixpower/hooks/*.ps1 | wc -l` = 10）

---

## 14. task DAG v2（**取代 §5 作为执行依据**；§5 保留为 T1/T5 提交时的快照）

```yaml
task_dag_v2:
  nodes:
    - id: T1
      status: done                # affc9c7（层 1）—— 本 DAG 只保号，不复述其 desc（见 §4-T1）
      desc: "等价性取证基座（已提交 affc9c7）"
      depends_on: []
      coupling: none
      estimated_tokens: high
    - id: T5
      status: done                # affc9c7（层 1）
      desc: "DSH 面向死 hooks 清理（已提交 affc9c7）"
      depends_on: []
      coupling: none
      estimated_tokens: low
    - id: T2
      desc: "validate-memory-backlog.ps1(89) → .cjs（stdout 行/退出码逐字对齐）+ 关闭 U-2 对拍 + prompts 调用点改写（WIP 已在工作区，见 §12.3）"
      depends_on: [T1]
      coupling: strong            # T1 的 kixpower-contract.cjs 是直接输入（.ps1:11 dot-source 契约）
      estimated_tokens: medium
      target_rules:
        globs:
          - "skills/kixpower/scripts/validate-memory-backlog.cjs"
          - "dsh/preset-classic/skills/kixpower/scripts/validate-memory-backlog.cjs"
          - "en/preset-classic-en/skills/kixpower/scripts/validate-memory-backlog.cjs"
          - "prompts/kixpower-new.prompt.md"
          - "dsh/preset-classic/prompts/kixpower-new.prompt.md"
          - "en/preset-classic-en/prompts/kixpower-new.prompt.md"
        modules: [skills/kixpower, prompts]
        languages: [javascript, markdown]
        mechanical_links:
          - type: callees
            of: ["skills/kixpower/scripts/validate-memory-backlog.ps1"]   # 参照实现，禁改
          - type: identical_mirror
            of:
              - "dsh/preset-classic/skills/kixpower/scripts/validate-memory-backlog.cjs"
              - "en/preset-classic-en/skills/kixpower/scripts/validate-memory-backlog.cjs"
            guard: "consistency-lib.cjs checkIdenticalSet（T4 登记）→ LG2"
    - id: T3
      desc: "verification-fidelity-check.ps1(320) → .cjs + USAGE_MANUAL/producer agent 调用点改写 + 首次真实运行追加 drift-check（WIP 已在工作区）"
      depends_on: [T1]
      coupling: strong            # .ps1:17 dot-source 契约；T1 输出是其直接输入
      estimated_tokens: high
      target_rules:
        globs:
          - "skills/kixpower/scripts/verification-fidelity-check.cjs"
          - "dsh/preset-classic/skills/kixpower/scripts/verification-fidelity-check.cjs"
          - "en/preset-classic-en/skills/kixpower/scripts/verification-fidelity-check.cjs"
          - "skills/kixpower/USAGE_MANUAL.md"
          - "dsh/preset-classic/skills/kixpower/USAGE_MANUAL.md"
          - "en/preset-classic-en/skills/kixpower/USAGE_MANUAL.md"
          - "agents/kixpower-producer.agent.md"
          - "dsh/preset-classic/agents/kixpower-producer.agent.md"
          - "en/preset-classic-en/agents/kixpower-producer.agent.md"
          - "docs/sprint-2/drift-check.md"
        modules: [skills/kixpower, agents]
        languages: [javascript, markdown]
        mechanical_links:
          - type: callees
            of: ["skills/kixpower/scripts/verification-fidelity-check.ps1"]  # 参照实现，禁改
          - type: identical_mirror
            of:
              - "dsh/preset-classic/skills/kixpower/scripts/verification-fidelity-check.cjs"
              - "en/preset-classic-en/skills/kixpower/scripts/verification-fidelity-check.cjs"
            guard: "consistency-lib.cjs checkIdenticalSet（T4 登记）→ LG2"
    - id: T4
      desc: "sync-dsh-preset.ps1(197) → .cjs + 5 条 pwsh 类 skip 归零（test:installer 25→25+N/0/0）+ **全部新增 .cjs 的镜像登记（含 T6 的 15 个 hooks 文件）** + 修 checkSyntax symlink 盲区"
      depends_on: [T1, T6]        # ← 新增边：T4 是 consistency-lib.cjs 的唯一写入者，必须知道 T6 的最终文件清单
      coupling: weak              # 共享登记文件但不消费语义（sync 不 dot-source 契约）
      estimated_tokens: high
      target_rules:
        globs:
          - "scripts/sync-dsh-preset.cjs"
          - "scripts/sync-dsh-preset.test.js"
          - "skills/kixpower/tests/ps1-parity.test.js"      # 与 T6 共享（同层串行）
          - "dsh/preset/plugins/consistency-lib.cjs"
          - "dsh/preset-classic/plugins/consistency-lib.cjs"
          - "dsh/preset-null/plugins/consistency-lib.cjs"
          - "en/preset-classic-en/plugins/consistency-lib.cjs"
        modules: [scripts]
        languages: [javascript]
        mechanical_links:
          - type: callees
            of: ["scripts/sync-dsh-preset.ps1"]        # 参照实现（CI 对拍对象），禁改
          - type: identical_mirror
            of: ["skills/kixpower/scripts/kixpower-contract.cjs", "skills/kixpower/scripts/validate-memory-backlog.cjs",
                 "skills/kixpower/scripts/verification-fidelity-check.cjs", "skills/kixpower/hooks/lib/kix-verdict.cjs",
                 "skills/kixpower/hooks/blast-radius-check.cjs", "skills/kixpower/hooks/block-source-edit.cjs",
                 "skills/kixpower/hooks/block-source-edit-qa.cjs", "skills/kixpower/hooks/block-dev-authority-edit.cjs",
                 "skills/kixpower/hooks/README.md", "skills/kixpower/tests/hook-engine.test.js"]
            guard: "consistency-lib.cjs checkIdenticalSet + 修 checkSyntax symlink 盲区 → LG2"
    - id: T6
      desc: "H-A：单一 hook 引擎 —— hooks/lib/kix-verdict.cjs（payload 归一化 + 从 kix-guards __internals 逐字抽取的判定层）+ 4 个 Node 入口（各 3 副本）+ hook-engine.test.js（细粒度 + 负向控制 + mutation probe + 同源函数体断言）+ CI 侧 E1 step 与 parity 退出码修订"
      depends_on: [T1]
      coupling: strong            # 复用 T1 的 kixpower-contract.cjs（progress.md frontmatter 读取）
      estimated_tokens: high
      target_rules:
        globs:
          - "skills/kixpower/hooks/lib/kix-verdict.cjs"
          - "skills/kixpower/hooks/blast-radius-check.cjs"
          - "skills/kixpower/hooks/block-source-edit.cjs"
          - "skills/kixpower/hooks/block-source-edit-qa.cjs"
          - "skills/kixpower/hooks/block-dev-authority-edit.cjs"
          - "skills/kixpower/tests/hook-engine.test.js"
          - "skills/kixpower/tests/ps1-parity.test.js"
          - "dsh/preset-classic/skills/kixpower/hooks/**"
          - "en/preset-classic-en/skills/kixpower/hooks/**"
          - ".github/workflows/ci.yml"
        modules: [skills/kixpower, hooks]
        languages: [javascript, yaml]
        mechanical_links:
          - type: callees              # 语义来源（只读，禁改）
            of: ["dsh/preset/plugins/kix-guards.js", "skills/kixpower/scripts/kixpower-contract.cjs"]
          - type: callees              # 被 Entry 复刻的参照实现（只读，禁改）
            of: ["skills/kixpower/hooks/blast-radius-check.ps1", "skills/kixpower/hooks/block-source-edit.ps1",
                 "skills/kixpower/hooks/block-source-edit-qa.ps1", "skills/kixpower/hooks/block-dev-authority-edit.ps1"]
          - type: identical_mirror
            of: ["dsh/preset-classic/skills/kixpower/hooks/lib/kix-verdict.cjs",
                 "en/preset-classic-en/skills/kixpower/hooks/lib/kix-verdict.cjs"]
            guard: "consistency-lib.cjs checkIdenticalSet（T4 登记）→ LG2"
    - id: T7
      desc: "H-B：接线（4 个 hook 命令统一为 node \"{{COPILOT_HOME}}/.../<name>.cjs\"）+ 两个 installer 删除 HOOK_LAUNCHER/HOOK_EXT 替换层 + INV-H1 残留 fail-closed + INV-H3 消除空作用域 ok + copilot-installer.test.js（正/负双向）"
      depends_on: [T6]
      coupling: strong            # T7 引用 T6 交付的入口文件名（直接输入）
      estimated_tokens: high
      target_rules:
        globs:
          - "agents/kixparadigm.agent.md"
          - "agents/kixpower-dev.agent.md"
          - "agents/kixpower-orchestrator.agent.md"
          - "agents/kixpower-producer.agent.md"
          - "agents/kixpower-qa.agent.md"
          - "install.sh"
          - "install.ps1"
          - "scripts/copilot-installer.test.js"
          - "package.json"
        modules: [installer, agents]
        languages: [markdown, bash, powershell, javascript]
        mechanical_links:
          - type: callers             # hook 命令的被执行者（T6 交付）
            of: ["skills/kixpower/hooks/blast-radius-check.cjs", "skills/kixpower/hooks/block-source-edit.cjs",
                 "skills/kixpower/hooks/block-source-edit-qa.cjs", "skills/kixpower/hooks/block-dev-authority-edit.cjs"]
    - id: T8
      desc: "H-C：覆盖裁决留痕 —— hooks/README.md（3 副本：宿主状态表 + H-set-B promotion 判据 + deprecated 声明）+ 未移植 6 条 hook 的宿主能力条件注记（root agents 只追加）+ progress.md 的 hooks-coverage 行"
      depends_on: [T6]            # 需 T6 的最终入口命名与清单
      coupling: weak
      estimated_tokens: medium
      target_rules:
        globs:
          - "skills/kixpower/hooks/README.md"
          - "dsh/preset-classic/skills/kixpower/hooks/README.md"
          - "en/preset-classic-en/skills/kixpower/hooks/README.md"
          - "agents/*.agent.md"
          - "docs/sprint-2/progress.md"
        modules: [skills/kixpower, agents]
        languages: [markdown]
        mechanical_links:
          - type: identical_mirror
            of: ["dsh/preset-classic/skills/kixpower/hooks/README.md",
                 "en/preset-classic-en/skills/kixpower/hooks/README.md"]
            guard: "consistency-lib.cjs checkIdenticalSet（T4 登记）→ LG2"
    - id: T9
      desc: "H-D：hooks/*.ps1 保留 + deprecated 标记（不删 30 文件）+ 删除判据与可回滚性落盘（README 与 README 的 deprecated 段合并交付，plan/progress 留痕）"
      depends_on: [T6]
      coupling: weak
      estimated_tokens: low
      target_rules:
        globs:
          - "skills/kixpower/hooks/README.md"
          - "docs/sprint-2/plan.md"
          - "docs/sprint-2/progress.md"
        modules: [skills/kixpower]
        languages: [markdown]
        mechanical_links:
          - type: callees            # 被标记 deprecated 的对象（只读，禁改）
            of: ["skills/kixpower/hooks/*.ps1"]
  properties:
    max_antichain_width: 7      # ω：{T2,T3,T4,T5,T7,T8,T9} —— 见 §14.2 复算
    critical_path_depth: 3      # δ：T1 → T6 → {T4|T7}（3 个节点 = 3 层）
    coupling_density: 0.41      # γ：(0+0.7+0.7+0.3+0+0.7+0.7+0.3+0.3)/9 = 3.7/9
    strong_coupling_count: 4    # T2, T3, T6, T7
    recommended_topology: sequential   # force_sequential 命中（见 §14.3）；无强制时公式给 hierarchical（γ=0.41<0.6 且 ω=7 → 回退 hybrid）
    layers:
      - [T1, T5]
      - [T2, T3, T6]
      - [T4, T7, T8, T9]
```

### 14.1 v1 → v2 的差异（逐条，防静默改写）

| 差异 | v1（§5） | v2 | 原因 |
|---|---|---|---|
| 节点数 k | 5 | **9**（+T6..T9） | 新增 hooks 工作流（H-A..H-D） |
| 新增边 | — | `T4 ← T6`（weak）、`T6 ← T1`（strong）、`T7 ← T6`（strong）、`T8 ← T6`（weak）、`T9 ← T6`（weak） | T4 变成 `consistency-lib.cjs` 的**唯一写入者**（含 T6 的 15 个新文件）→ 必须知道 T6 的最终清单；其余为真实输入依赖 |
| δ | 2 | **3** | `T1 → T6 → {T4,T7}` 形成 3 层链——hook 引擎无法与接线同层（接线引用不存在的文件 = 层内提交即坏） |
| ω | 4 | **7** | 新增孤立/并行节点（T7/T8/T9 与 T2/T3/T4/T5 互不可比） |
| γ | 0.34 | **0.41** | 强耦合由 2 → 4（T6、T7）；弱耦合新增 T8、T9 |
| `force_sequential` | true | **true（沿用，理由扩充）** | 见 §14.3 |

### 14.2 DAG 属性复算（防人工估计）

| 量 | 值 | 复算依据 |
|---|---|---|
| ω | **7** | 候选反链 `{T2,T3,T4,T5,T7,T8,T9}`：T7/T8/T9 只依赖 T6、T2/T3/T4 只依赖 T1（且 T4 只额外依赖 T6）→ 与彼此及其余四点**互不可比**；T1、T6 已被各自的后继「压住」，不能进更大反链。7 > v1 的 4（v1 无 T6 的 3 个后继） |
| δ | **3** | 最长有向路径 = `T1 → T6 → T7`（或 `T1 → T6 → T4`），**3 个节点 = 3 层**（口径与 v1 §5.3 一致：按 `layers` 长度取，不按边数） |
| γ | **0.41** | 节点耦合值 `{T1:0, T2:0.7, T3:0.7, T4:0.3, T5:0, T6:0.7, T7:0.7, T8:0.3, T9:0.3}` → 3.7/9 = **0.4111** |
| `layers` | `[[T1,T5],[T2,T3,T6],[T4,T7,T8,T9]]` | Kahn：in-degree=0 → `{T1,T5}`；移除出边后 → `{T2,T3,T6}`；再移除后 → `{T4,T7,T8,T9}`（T4 在 T6 出边清除后才 in-degree=0） |
| 公式拓扑（无强制时） | `hierarchical` 不命中（γ=0.41 < 0.6）→ `parallel` 不命中（γ ≥ 0.3）→ **`hybrid`** | γ=0.41、ω=7 ≥ 2 → 命中 `hybrid`；**被 `force_sequential` 覆盖** |
| 强制串行 | **`sequential`** | 见 §14.3 |

### 14.3 `force_sequential` v2（沿用 v1 §5.2，理由扩充）

```yaml
force_sequential: true
```

| # | 触发条件（TEAM_CONVENTIONS §何时强制 sequential） | v2 命中情况 |
|---|---|---|
| 1 | **涉及同一文件的多个任务** | ① **T4 与 T6** 都要写 `consistency-lib.cjs`（**4 副本**）——T6 产出新文件、T4 登记镜像 → T4 ← T6；② **T7 与 T8** 都触碰 root `agents/*.agent.md`（T7 改命令、T8 加注记）；③ T3 与 T7 都触碰 `agents/kixpower-producer.agent.md`；④ T2/T3/T6 的 `.cjs` 与 T4 的登记落在同一目录树 |
| 2 | 加密/认证敏感改动 | 不命中（但 hook 是**安全边界**：H-B 的 fail-closed 与 H-A 的判定层按敏感改动对待） |
| 3 | plan 明确标注 | 命中 |

**v1 的两条额外理由仍然成立（不重复展开）**：① 唯一 canonical 入口是 `npm test`（`&&` 链）——分层不完成则链必红，
分区并行无法各自产出绿灯结算；② `kix-guards` blast radius 的 1 小时 / 10 commit 硬窗口使「多 worktree 并行 + synthesis」
的 commit 成本不可承担。

---

## 15. task_sizing v2（**取代 §6 作为执行依据**）：commit 预算的现实性

```yaml
task_sizing_v2:
  inputs:
    task_count: 9
    dag_layers: 3                      # δ = critical_path_depth（§14.2）
    dag_width: 7                       # ω = max_antichain_width
    strong_coupling_count: 4           # T2, T3, T6, T7
    bug_reserve: 1                     # 沿用 §6 的 bug_reserve_source（实测率 1），**本次不重取**
    closeout_layer: 1                  # 沿用 §6 的 HB-6 scoped trial 输入
  # ── 公式原样复算（不隐藏矛盾）──
  formula_derived_commit_budget: 9     # base(3) + coupling_bonus(4) + bug_reserve(1) + closeout_layer(1)
  # ── 实际绑定值：环境硬约束更紧 ──
  derived_commit_budget: 6             # = min(公式 9, 环境硬约束 6)；写回 progress.md 的 blast_radius.commit_budget
  binding_constraint:
    kind: environment + 用户指令（**比公式更紧**）
    evidence: >-
      kix-guards blast radius：本会话 **1 小时窗口内 10 个 commit 硬上限（含 amend）**（§6 同源；Sprint 1 已因此被拦一次
      `ef6a485`）；用户本次指令明确「把总预算控制在 **≤6**」。
    consequence: >-
      公式的 `coupling_bonus = 4`（强耦合各自独占 commit）在本 Sprint **不可支付** → 显式让渡。
      让渡不是「没看见」：公式值 9 与绑定值 6 **并列输出**，差额 3 的来源是「按节点回滚边界」被降级为「按层回滚边界」，风险由 §15.2 的 falsifier 兜住。
  merge_policy: >-
    **每 DAG 层合并 1 个 commit（硬要求）**：层内节点在**同一 commit** 落盘；回滚边界 = 层，不是节点。
    禁止把同层节点拆成多个 commit（会同时击穿 ≤6 预算与 10-commit 硬上限）。
  hard_cap: 10
  warn_threshold: 10                   # δ*3 + bug_reserve = 9 + 1 = **10 == hard_cap** → 预警通道结构性不可达（追加为 OQ13）
  over_cap: false
  # ── 期望 commit 单元（先给可复算映射，再看公式是否覆盖）──
  realized_check:
    expected_units:
      layer_1_used: 1                  # C1 = affc9c7（T1+T5，**已提交并计入总预算**）
      planning_docs_v2: 1              # C2 = 本轮增量规划（plan/progress/PROJECT_BRIEF §8+§11/memory 追加；含尚未提交的首轮规划文档）
      layer_2: 1                       # C3 = T2 + T3 + T6（同层合并）
      layer_3: 1                       # C4 = T4 + T7 + T8 + T9（同层合并）
      closeout: 1                      # C5 = done.md / hill-climbing.md / qa-signoff-2.md / L2 字段固化
    expected_total: 5
    headroom: 1                        # 6 − 5：留给 bug_reserve 的真实发生（未预见缺陷修复）
    consistent: true                   # 5 ≤ derived(6) ≤ hard_cap(10)
    falsifier_1: >-
      若 layer_2 / layer_3 因故必须拆分（例如 T6 的 mutation probe 暴露语义分歧、需要单独回滚某个 hook）→
      立即在 `progress.md` 记 `commit_budget_warning` 并在收尾记 `over_budget: 1`；**禁止事后回改本字段**。
    falsifier_2: >-
      若 1 小时窗口在 layer_2 中途耗尽 → 剩余节点无法提交 → 按 `blocked` 记录并转 `/kixpower-continue`，
      不得为「凑完」而放弃 HB-3 的分段 gate 纪律（沿用 §6 口径）。
```

### 15.1 与 v1（§6）的差异（追加说明，不覆写）

| 量 | v1 | v2 | 差异来源 |
|---|---|---|---|
| δ | 2 | 3 | 新增 `T1 → T6 → {T4,T7}` 链（§14.1） |
| strong_coupling_count | 2 | 4 | T6（复用契约模块）、T7（引用 T6 的入口） |
| 公式值（含 closeout） | 6 | **9** | 上述两项 +3 |
| **绑定值** | 6 | **6** | **刻意不变**：环境硬约束（1h/10-commit）与用户 ≤6 指令未变 → 差额以「层合并」吸收 |
| 实际预计 | 4..6 | **5** | C1 已用 + 规划 + 层2 + 层3 + 收尾 |

> **为什么不把 δ=3 的公式值当预算**：`derived_commit_budget` 是**派生值**，但其上界受环境硬约束约束（TEAM_CONVENTIONS §Task Sizing
> 「真正的硬约束是上下文窗口和爆炸半径」）。本 Sprint 的真实爆炸半径窗口 = **1 小时 / 10 commit**，且已用 1 个
> → 6 是**可支付上限**。公式 9 会诱使「按节点拆 commit」，直接撞硬上限（Sprint 1 的 `ef6a485` 即此类）。

---

## 16. verifiable_gates v2（**追加 + 四处标注修订**；§7 其余 gate 定义继续有效）

### 16.1 对 §7 既有 gate 的修订注记（**原文不动**，此处为生效口径）

| gate | 修订 | 理由（决定性） |
|---|---|---|
| **LG1** | 期望计数由 `25 tests` 修订为 **`25 + N_copilot_installer`**（N 由 T7 实测回填，**不得预填**）；「5 条 `SKIP: pwsh unavailable` 归零」仍是硬判据 | T7 把新测试文件加入**既有** `test:installer` 命令行（不新增 script 名）→ 总数上升；归零判据不变 |
| **LG10** | **移出 required local_gate**：改 `required: false` + `host_requires: [pwsh]`；其证据职能移交 **CG4**（CI runner 预装 pwsh 的通道）。**三态语义与「`unavailable` ≠ pass」不变** | TEAM_CONVENTIONS §verifiable_gates 硬约束 1：required gate 为 `unavailable` 时不得计入 `l2_verification_passed`。用户已**永久否决** pwsh（含一次性 oracle）→ 若继续列为 required，本 Sprint 的 L2 在本地**结构性不可达**（不是「没做」，是「不可能」） |
| **LG9 / LG11 / LG12** | 判据不变；**证据 revision 变化**：必须在层 2 的新 revision 上重跑（T1 期的 `13/13` 不自动为新 revision 背书） | §12.3 的 WIP 已改动测试与调用点 |
| **L2 manifest 口径** | `field_set = {id, type, cmd, expect, required, host_requires}`（与 §7 同口径，**Sprint 内保持一致**） | TEAM_CONVENTIONS §verifiable_gates 硬约束 4 允许 Sprint 内自定义该维度，但要求口径一致 |

### 16.2 等价性取证方案 v2（**取代 §7.3 的三条腿定义；§7.4 的 oracle 决策按用户否决重述**）

**触发**：用户**永久否决** pwsh —— 既否决运行依赖，也**否决把它当一次性 oracle** → **E1 的差分对拍在本地永久 `unavailable`**。
因此证据锚点整体迁移（不是「降级」）：

| 腿 | v1（§7.3） | **v2** | 需要 pwsh | 能证明什么 | **不能证明什么** |
|---|---|---|---|---|---|
| **E1** | 本地差分对拍（LG10，required） | **CI 侧差分对拍（CG4）**；本地恒为 `unavailable`（LG10 保留为 `required: false` 的潜伏通道） | 是 | 「同一 fixture 下 `.cjs` 与 `.ps1` 的 stdout 逐字节 + exit code 一致」→ 行为等价（fixture 覆盖范围内） | 未覆盖 fixture 的等价；**本 Sprint 在本地与时间上大概率不可达**（R4：fork 无 workflow 注册、未授权 PR → CG4 = pending） |
| **E0（新）** | — | **既有 JS 测试网即锚点**：`kix-guards.test.js`（696 行 / 159 断言 / 4 副本）+ **同源函数体断言** + **共享语料 verdict 一致**（§13.1 的 (a)(b)） | 否 | 「hook 判定层与**有测试覆盖的 JS 实现**在语料上一致；判定语义未偏离该 JS 实现」 | 与原 `.ps1` 的实际行为一致；`kix-guards.js` 自身与其 `.ps1` 祖先的等价性（那需要 E1） |
| **E2** | characterization（LG9） | **仍是 characterization，但升级为主通道**（LG9 + LG15）：固定用例 + **每 hook ≥1 负向控制** + **mutation probe**（改坏 core ⇒ 套件必红） | 否 | 「实现的输出符合从 `.ps1` 语义人工反推的固定期望」+ 断言**非恒真** | 期望本身可能反推错 → 仍不等于与原 `.ps1` 等价 |
| **E3** | 冻结凭据复算（LG9 内一条） | 不变（`R1-digest-recompute: undetermined` 封顶） | 否 | 与已记录产物的一致性 | 同上（记录值来源亦为无 pwsh 的移植实现） |

**证据强度阶梯 v2（不得越级）**：

```
CG4 PASS                                  → "行为等价（fixture 覆盖范围内）"        —— 唯一可称「等价」的档位（本 Sprint 大概率 pending）
E0 + E2 PASS（含 mutation probe）          → "与既有 JS 判定语义一致，固定用例覆盖范围内自洽；与原 .ps1 的实际行为未取证"
E0/E2 任一红                               → 实现缺陷（走 bug_reserve），不得降级表述
E1 unavailable + E0/E2 PASS               → **禁止**写作「与原 ps1 等价」或「已验证等价」；只能写「JS 锚点一致，差分通道 unavailable」
```

**明令禁止（写入 QA 拒签条件）**：
1. 把「characterization 绿」表述为「与原 `.ps1` 等价」（本 Sprint **不得**出现此表述）；
2. 把 `unavailable` 记为 `skip` / `pass` / 「已覆盖」；
3. 用「文件已存在」「测试绿」替代「hook 在真实宿主上生效」（`OQ8` 未解前，生效性无本机证据）。

### 16.3 新增 gate（H-* 与 installer fail-closed）

```yaml
verifiable_gates_v2_additions:
  local_gate:
    - id: LG15
      type: local_gate
      cmd: "node --test skills/kixpower/tests/hook-engine.test.js"
      expect: >-
        exit 0。**host-independent 的 hook 证据网（E0+E2）**，必须含：
        ① 两套 payload schema 的固定用例（legacy `tool_name/tool_input` 与 copilot-agent 1.0.70+ `toolCalls[]`/`toolName+toolArgs`，含 `args` 为 JSON 字符串）；
        ② 4 个已移植 hook 各 **≥1 负向控制**（合法操作必须 allow，证明 deny 断言非恒真）；
        ③ **mutation probe**：`KIX_HOOK_CORE_PATH=<被故意改坏语义的临时副本>` 时该套件**必须红**（否则记 unmet）；
        ④ **同源函数体断言**：core 的每个纯函数体与 `kix-guards.js` 的 `__internals` 同名函数规范化后逐字相等；
        ⑤ 细粒度 `test()`（不得折叠为单点，RF-4 的反面教材）。
        **禁止**把本 gate 的绿表述为「与原 `.ps1` 等价」（§16.2 阶梯）。
      required: true
      covers: [T6]
    - id: LG16
      type: local_gate
      cmd: "node --test scripts/copilot-installer.test.js"
      expect: >-
        exit 0，且用例**双向**：
        ① 正向：安装器装入临时 `COPILOT_HOME` → exit 0、`grep -r '{{' <tmp>/agents` = 0 行、已移植 hook 命令的 launcher（`node`）可解析；
        ② 负向：fixture 注入 `{{KIX_RESIDUE_PROBE}}` → 安装器**必须 exit ≠ 0** 且输出含 `KIX-INSTALLER-RESIDUE`；
        ③ 空作用域不许假绿：0 个 `.sh` 时输出 `skip: chmod +x (0 .sh files)`（**不得**出现 `ok … chmod`）。
        win32 上以平台型 skip 收口（文案可机器识别）。
      required: true
      covers: [T7]
  ci_gate:
    - id: CG4
      type: ci_gate
      cmd: "gh run view <run-id> -R olicesx/kixparadigm --json conclusion,jobs  # 需含 parity step"
      expect: >-
        **E1 的唯一载体**：CI（runner 预装 pwsh，见 Sprint 1 LL-2 的镜像证据）上执行
        `node --test skills/kixpower/tests/ps1-parity.test.js`，三个 matrix 组合均须得 `parity: PASS`；
        `parity: FAIL` → **已证伪「忠实移植」**，升级为 P0 缺陷并回退对应 `.cjs`；
        `parity: unavailable`（runner 无 pwsh）→ 记 `unavailable`（不计入通过）并检查镜像变更。
        无 PR/无 run 时记 **pending**（R4 open）。
      required: true
      covers: [T2, T3, T6]
    - id: CG5
      type: ci_gate
      cmd: "gh run view <run-id> -R olicesx/kixparadigm --json conclusion,jobs  # windows job"
      expect: >-
        windows runner 上执行 `install.ps1` 的 smoke：正向（装入临时 `$COPILOT_HOME` → 0 残留、exit 0）+
        负向（注入 `{{KIX_RESIDUE_PROBE}}` → exit ≠ 0）。本机无 pwsh → **本地不可执行，只能走此通道**；
        pending 时 `install.ps1` 的改动只有静态判据（MG8）。
      required: true
      covers: [T7]
  manual_gate:
    - id: MG8
      type: manual_gate
      cmd: "grep -c 'HOOK_LAUNCHER\\|HOOK_EXT' install.sh install.ps1; grep -c 'node \"{{COPILOT_HOME}}/skills/kixpower/hooks/' agents/*.agent.md"
      expect: >-
        ① `install.sh` / `install.ps1` 的 `HOOK_LAUNCHER|HOOK_EXT` 命中数 = **0**（占位符层已彻底移除）；
        ② root `agents/*.agent.md` 中 `node "{{COPILOT_HOME}}/skills/kixpower/hooks/` 的命中数 = **T6 交付的已移植 hook 声明数**
        （预期 4：blast-radius ×5 声明 + block-dev-authority-edit ×2 + block-source-edit ×2 + block-source-edit-qa ×1 → 以 Dev 实测值回填）；
        ③ `node "{{COPILOT_HOME}}/skills/kixpower/hooks/<name>.cjs"` 中每个 `<name>` 对应文件在 `skills/kixpower/hooks/` 存在（`ls` 判据）。
      required: true
      covers: [T6, T7]
    - id: MG9
      type: manual_gate
      cmd: "grep -n 'hooks-coverage' docs/sprint-2/progress.md"
      expect: >-
        存在 `hooks-coverage:` 行，10 行表覆盖全部 10 个 hook，每行给出：类别（L1/L2/L3）、本 Sprint 取值（H-set-A / R3 候选）、
        promotion 判据（H-set-B）。缺任一 hook 行 → 记 unmet（**不得**以「见 plan §13.0」代替）。
      required: true
      covers: [T8]
    - id: MG10
      type: manual_gate
      cmd: "ls skills/kixpower/hooks/README.md dsh/preset-classic/skills/kixpower/hooks/README.md en/preset-classic-en/skills/kixpower/hooks/README.md; ls skills/kixpower/hooks/*.ps1 | wc -l"
      expect: >-
        ① 3 副本 README 均存在且 md5 一致；② 内含 `deprecated` 声明与「未移植 hook 在无 pwsh 宿主不触发」的显式说明；
        ③ **反向控制**：`ls skills/kixpower/hooks/*.ps1 | wc -l` = **10**（证明 H-D 未删除任何 `.ps1`）。
      required: true
      covers: [T8, T9]
```

### 16.4 机械判据速查（供 orchestrator / QA 一行核对）

| 判据 | 一句话 |
|---|---|
| **installer fail-closed** | **装完的 `agents/*.agent.md` 里不许再残留任何 `{{`，残留就非零退出（`KIX-INSTALLER-RESIDUE`）；而这条判据本身由「注入哨兵 ⇒ 必须非零」的反例证明非恒真。** |
| hook 引擎 | `KIX_HOOK_CORE_PATH` 指向被改坏的 core 时套件必须红 ⇒ 断言非恒真；两套 payload schema 都要有固定用例。 |
| 覆盖裁决 | `hooks-coverage:` 行必须逐 hook 给出类别与去向，缺行即 unmet。 |
| 去留 | `ls skills/kixpower/hooks/*.ps1 \| wc -l` = 10（保留）；README 三副本标记 `deprecated`。 |
| 等价性 | 只有 **CG4 PASS** 可称「等价」；`unavailable` 不得记为 skip/pass。 |

### 16.5 L2 必需 gate 集合 v2（manifest 口径，供 orchestrator 计算 digest）

**`required: true` 的 `local_gate`（v2）= `[LG1, LG2, LG3, LG4, LG5, LG6, LG7, LG8, LG9, LG11, LG12, LG15, LG16]`（13 条）**，
按 id 排序后规范化 `{id, type, cmd, expect, required, host_requires}`。
**LG10 不在集合内**（移出为 `required: false` + `host_requires: [pwsh]`，见 §16.1）；LG13 / LG14 原本即 `required: false`。
`ci_gate` / `manual_gate`（含新增 CG4/CG5、MG8–MG10）不进 digest，但计入 QA 签署证据。

> **口径稳定性声明**：L2 尚未发生（`l2_verification_passed: []`），故本次 manifest 集合变更**不影响任何已取证的 L2 记录**；
> 变更必须在 `progress.md` 的 L2 字段写入时按本集合执行 —— QA 复核同一集合（`qa_gate_manifest_sha256`）。

`drift_whitelist` 追加两条（沿用 §7 的白名单，新增交付面不得被豁免）：

```yaml
drift_whitelist_additions:
  - pattern: "docs/sprint-2/**"        # §7 的 "docs/**" 已覆盖；此处显式化本轮产物
  - pattern: ".kixpower/memory/**"     # §7 的 ".kixpower/**" 已覆盖；此处显式化 memory 追加
  # 仍**不**白名单化 `**/*.cjs`：hooks 的 core/入口是本 Sprint 的实质交付面，必须被 true_out_of_scope 计算纳入
```

---

## 17. 开放问题（追加；`OQ0–OQ7` 保持不动）

| ID | 问题 | 影响 | 取证方式 / falsifier |
|---|---|---|---|
| **OQ8** | **hook 在真实 Copilot 宿主上的运行语义未取证**：① `hooks:` 命令 spawn 失败是 `deny` 还是 `ignore`？② `copilot-agent ≥1.0.70` 的 `hooks:` frontmatter 字段名与 `command` 是否仍被读取（`DSH-ADAPTATION.md:56` 只记录了**载荷**差异）？ | ① 决定未移植的 6 条 `pwsh` 声明是否会在 macOS 上**阻塞全部工具调用**；② 决定 T7 的接线形态是否真能生效（`F-a`） | 一次真实 VS Code Copilot 会话（人工触发 + 观察）；**间接证据（不足以定论）**：若 spawn 失败即 deny，则 macOS 用户今天已完全不可用 —— 与「hooks 永不触发」的缺陷描述相容但未排除。**falsifier**：若取证为 `deny` → 立即移植或移除未移植声明（§13.0 末段） |
| **OQ9** | **payload 实际形状未本机实测**（`toolCalls[{name,args}]` 的 `args` JSON 字符串嵌套/转义、`postToolUse` 的 `toolArgs` 类型） | 决定 `kix-verdict.cjs` 归一化层的边界（过窄 → 静默放行；过宽 → 误 deny） | 采集一次真实 payload（hook 侧写盘调试或 host 日志）；**本 Sprint 的处置**：core 同时容忍两套 schema（容忍成本极低、漏判代价高），并在 LG15 用**两种形状的 fixture** 覆盖 |
| **OQ10** | **hooks 面 `.ps1` 漂移的 canonical 归属**：`blast-radius-check.ps1` 源 **556 行** vs 两 preset 副本 **444 行**（RF-2）；两份差异含 `TERMINAL_TOOLS`/SQL 噪音剥离等规则差异 | 若 444 版含真实语义改进 → 「源 = canonical」的判定会把改进留在副本里；反之源为准 | 逐段 diff + 判定差异是否属于语义规则（非仅注释/工具名映射）。**本 plan 取值：canonical = 源（Copilot 安装路径实际安装的那份，`install.sh:163-172`）**；对齐工作留 `N8` |
| **OQ11** | **H-set-A 的等价性天花板**：无 pwsh ⇒ 与原 `.ps1` 的行为等价**在本地永不可证** | `done.md` / `qa-signoff-2.md` 的 claim 必须封顶在 §16.2 的第二档 | 唯一通道 = CG4（CI，pwsh 预装）。**falsifier**：CG4 一旦可达且 FAIL → 「忠实移植」被证伪，需回退 |
| **OQ12** | **CG4/CG5 在本 Sprint 大概率仍 `pending`**（R4：fork 无 workflow 注册、未授权 push/PR） | 等价性最强的通道与 `install.ps1` 的唯一可执行验证通道**在时间上不可达** → 本 Sprint 的 `release_eligible` 与「等价性已证」都不可达 | 用户授权 PR 路径后按 CG1 → CG4/CG5 顺序执行；未授权时按 pending 记，不得以「本地通过」替代 |
| **OQ13** | **`warn_threshold` 再次结构性不可达**：v2 的 δ=3、`bug_reserve`=1 → `warn = 3*3+1 = 10 == hard_cap 10`（与 Sprint 1 的 OQ9 同型） | 预警通道不可用 → 本 Sprint 以「**≤6 环境硬约束**」代替预警；跨过 5 即应人工记预警 | 公式修订留 `N6`（Sprint+1）；本 Sprint 在 `progress.md` 显式登记该不可达性 |

---

## 18. Sprint+1 候选（追加；`N1–N7` 保持不动）

| ID | 候选 | 触发条件（判据） |
|---|---|---|
| **N8** | hooks 面 `.ps1` 漂移对齐（`blast-radius-check` 556/444，OQ10）+ 决定 `skills/kixpower/hooks/**` 是否纳入一致性守护面（与 N1 同类，对象是 hooks 目录） | `OQ10` 判定「444 版含真实语义改进」；或 Sprint 3 移植 H-set-B 时需以任一副本为参照 |
| **N9** | **H-set-B 的 6 个 hook Node 化**（`validate-handoff` / `validate-qa-signoff` / `qa-freshness-check` / `cleanup-qa-session` / `auto-update-progress` / `pre-commit-lint-check`） | §13.0 的 per-hook promotion 判据命中（其中 **validate-qa-signoff + qa-freshness + cleanup 必须同批**） |
| **N10** | **CI 侧 E1 常态化**（CG4）+ pwsh 从 runner 镜像移除时的替代方案（容器化 oracle 或固定版本 action） | CG4 变为可执行后仍出现 `unavailable`；或 runner 镜像文档移除 PowerShell |
| **N11** | `install.ps1` 的**可执行**验证从「CI smoke」升级为「本地可跑」（例如用 Node 复刻 installer 语义并做双侧一致性断言） | `install.ps1` 出现第二次「静态判据漏掉的行为缺陷」（第一次 = 本次 silent failure） |

---

## 19. Evals 回归追加（`HB-1..HB-6` 的匹配结论不动；本节追加 `HB-7` 与本轮的补充匹配）

| 项 ID | eval.trigger | 本 Sprint（增量后）是否匹配 | 落实位置 | 本 Sprint 记录 |
|---|---|---|---|---|
| **HB-7（新增）** | 「plan / diff 中出现『批量替换 / 批量 chmod / 占位符展开 / 迁移脚本』的安装或同步步骤」 | ✅ **匹配**（本次缺陷本体：`install.sh:222-240`、`install.ps1:217-228` 的替换与 chmod 步骤） | §13.2 的 INV-H1 / INV-H3、LG16、MG8 | **`status: candidate`；本 Sprint = origin，故 `not triggered`**（同 HB-1 的口径：同一 Sprint 不能自证），`applies_to_sprints: ">=3"` |
| **HB-1（补充）** | 原有 trigger =「新增/修改的测试用例 spawn 外部可执行文件」 | ✅ **扩容匹配**：T7 的 `scripts/copilot-installer.test.js` 也 spawn `bash`（install.sh） | §13.2 步骤 C（能力探针 + 平台型 skip + 可机器识别文案） | 仍为 scoped trial；`pass_criteria` 需覆盖「探针存在且文案可识别」 |
| **HB-3（补充）** | 原有 trigger =「gate 引用 `&&` 链或 canonical 入口本身是链」 | 沿用匹配 | §13.2 把 installer 从「单一入口」变成「有独立观测点的链路」（残留面 + 退出码 + 空作用域文案） | 沿用 scoped trial |
| **HB-4（补充）** | 原有 trigger 含「环境状态断言」 | ✅ **扩容匹配**：LG15/LG16 的 mutation probe 与哨兵注入是**显式环境构造**（把「未入库状态」变成 fixture），正是 HB-4 要求的形态 | §13.1 步骤 C、§13.2 步骤 C | 沿用 scoped trial |
| **HB-6（口径修订）** | 「plan.md 生成 `derived_commit_budget`」 | 沿用匹配 | §15 的 `derived_commit_budget: 6` | `post-sprint` 判定改为对照 **6**：`git rev-list --count ef6a485..HEAD` ≤ 6 → trial pass |

**未匹配项不变**：HB-2 = `not triggered`（基线绿，本会话实测 `test:installer` exit 0 / `test:consistency` exit 0）。
**本 Sprint 仍无 `validated` 项可回归**（`by_status.validated = 0`）。
