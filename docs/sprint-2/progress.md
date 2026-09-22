---
sprint: 2
status: in_progress
last_updated: 2026-09-22
completed_tasks: 2
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
  # ── 未提交 WIP（T2/T3/T4，归属见 plan §12.3；WIP 存在 ≠ 任务完成）──
  - skills/kixpower/scripts/validate-memory-backlog.cjs（+2 preset 副本）
  - skills/kixpower/scripts/verification-fidelity-check.cjs（+2 preset 副本）
  - scripts/sync-dsh-preset.cjs（单副本）
  - skills/kixpower/tests/{trust-chain,ps1-parity}.test.js（WIP 扩展 parity 覆盖到 validator/fidelity；各 3 副本）
  - prompts/kixpower-new.prompt.md（+2 preset 副本）、skills/kixpower/USAGE_MANUAL.md（+2 preset 副本）、agents/kixpower-producer.agent.md
observe_fingerprint: affc9c73c51960df2add8f8e8af4ebdd995199dc   # 层 1 提交后的 HEAD（增量重规划期）
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
l2_verification_passed: []              # placeholder — 仅 orchestrator 可写；本 Sprint 规划期尚未发生 L2
l2_verified_sha: null                   # placeholder — 完整 40 位 SHA
l2_gate_manifest_sha256: null           # placeholder — 规范化规则见 plan.md §7.2（HB-5 scoped trial 的交付）；**必需集合 v2 = 13 条（plan §16.5）**
l2_stash_refs: []                       # placeholder — L2 完成时 git stash list --format=%H 快照
qa_started_sha: null                    # placeholder — QA 启动时必须 == l2_verified_sha == HEAD
qa_verified_sha: null                   # placeholder — QA PASS/CONDITIONAL 证据对应的完整 HEAD
qa_gate_manifest_sha256: null           # placeholder — QA 签署时复核的同一 local_gate manifest
qa_test_changes: []
qa_session_marker: docs/.kixpower-qa-session.json
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
| T2 | `validate-memory-backlog.ps1`(89) → `.cjs` + 关闭 U-2 对拍 + `prompts/kixpower-new.prompt.md:80` 调用点改写 | [~] | T1 | 逐字硬要求；**实现已在工作区（WIP 190 行 ×3 副本）但未过 gate**（plan §12.3）；缺 `U2-parity:` 三元组与 LG12 实测 |
| T3 | `verification-fidelity-check.ps1`(320) → `.cjs` + `USAGE_MANUAL.md:365` / producer agent 调用点改写 + 首次真实运行追加 `drift-check.md` | [~] | T1 | 解除 Sprint 1 的 `baseline_degraded`；**WIP 487 行 ×3 副本已存在**，缺首次真实运行与 LG11 实测 |
| T4 | `scripts/sync-dsh-preset.ps1`(197) → `.cjs` + 5 条 pwsh 类 skip 归零（`test:installer` 25/0/5 → 25+N/0/0）+ **全部新增 `.cjs` 镜像登记（含 T6 的 15 个 hooks 文件）** + 修 `checkSyntax` symlink 盲区 | [~] | T1, T6 | WIP 311 行已存在；实测仍 **5 skip**（`sync-dsh-preset.test.js` 仍 spawn pwsh）；成为 `consistency-lib.cjs` 的唯一写入者（plan §14.1）|
| T5 | P1：清 DSH 面向副本的 10 个死 `hooks:` 块（classic 5 + en 5）+ 收敛失效措辞 | [x] | — | **不删 `hooks/*.ps1`**；不动 root 的 Copilot 分发版（`agents/`）|
| **T6** | **H-A 单一 hook 引擎**：`hooks/lib/kix-verdict.cjs`（payload 归一化 + 从 `kix-guards.js __internals` 逐字抽取的判定层）+ 4 个 Node 入口（各 3 副本）+ `hook-engine.test.js`（细粒度 + 负向控制 + mutation probe + 同源函数体断言）+ CI 侧 E1 step 与 parity 退出码修订 | [ ] | T1 | **核心 trade-off 已判定**：不做跨发行面 require（发行面交集为空，F17）→ 「单一 core + 双侧同源断言」；`kix-guards.js` 4 副本**零改动** |
| **T7** | **H-B 接线与失败关闭**：4 个 hook 命令统一 `node "{{COPILOT_HOME}}/.../<name>.cjs"`；两个 installer 删除 `HOOK_LAUNCHER`/`HOOK_EXT` 层 + INV-H1 残留 fail-closed + INV-H3 消除空作用域 `ok` + `copilot-installer.test.js`（正/负双向） | [ ] | T6 | 机械判据见 plan §16.4 第一行；`install.ps1` 本地无 pwsh → 可执行验证只能走 CG5（如实登记） |
| **T8** | **H-C 覆盖裁决留痕**：`hooks/README.md`（3 副本：宿主状态表 + H-set-B promotion 判据 + deprecated 声明）+ 未移植 6 条 hook 的宿主能力条件注记（root agents **只追加**）+ 本文件 `hooks-coverage:` 行 | [ ] | T6 | 裁决已定：**H-set-A = 4 个（本 Sprint）/ H-set-B = 6 个（Sprint 3，判据逐条）**，见 plan §13.0 |
| **T9** | **H-D `hooks/*.ps1` 去留**：**保留全部 30 文件 + 标记 deprecated**（不删除）+ 删除判据与可回滚性落盘 | [ ] | T6 | 理由 5 条见 plan §13.4；**不逐文件改 30 个 `.ps1`**（零编码风险）|

**合计**：**9 任务，2 完成（T1、T5 = 层 1），0 阻塞；3 进行中（T2/T3/T4 = WIP 已在工作区，未过 gate）；4 未开始（T6–T9 = H-A..H-D）**。

**DAG v2 分层与提交映射**（plan §14/§15，**每 DAG 层合并 1 个 commit 是硬要求**）：
`[T1,T5]` → C1 `affc9c7`（**已提交**）；`[T2,T3,T6]` → C3；`[T4,T7,T8,T9]` → C4；C2 = 本轮增量规划文档；C5 = 收尾层。
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

> **预算预警登记位**：`commit_budget_warning`（跨过 5 个 commit 时由 orchestrator 写入；`over_budget` 于收尾写入，**禁止事后回改 plan §15**）。
