# Harness Backlog — kixparadigm（repo memory）

> **canonical root**：`<PROJECT_ROOT>/.kixpower/memory/repo/harness-backlog.md`。
> **用途**：把 harness（kixpower 编排 + 本项目门禁）的改进项从自然语言描述升级为**结构化 eval**，
> 让 Producer 在新 Sprint 启动时可以**回归验证**「这个改进是否真被应用且生效」（v4.1 双边闭环）。
>
> **状态机**：`candidate`（仅 scoped trial）→ `validated`（后续匹配任务 trial 通过且无反证）→ `archived`（`rejected` / `superseded` / `stale`）。
> **硬约束**：**Sprint 1 只允许写 `candidate`**；L4 不得直接写 `validated`；`applied` 不得写入 `- id:` 记录。
> **legacy**：`/memories/repo/` 与仓库顶层 `memories/`（preset 经验库，只读）均非 canonical root，不双写。

```yaml
- id: HB-1
  type: dev-workflow
  status: validated
  problem: >-
    依赖外部可执行文件（pwsh/node/psql 等）的测试用例，其 skip 判据按用例各自为政：
    scripts/sync-dsh-preset.test.js 同文件 5 条 pwsh 依赖用例中，2 条用能力探针
    （probe.error.code === 'ENOENT' → t.skip），3 条只用 process.platform === 'win32' 判断。
    结果是：在「非 Windows 但没有 pwsh」的环境（如本机 macOS），后 3 条直接 fail 而非 skip，
    整条 npm test 链在第一步即中断。
  improvement: >-
    新增/修改任何 spawn 外部可执行文件的测试时，必须使用能力探针（真跑一次版本查询并检查
    ENOENT）作为 skip 判据；同一测试文件内的探针形状必须一致，skip 文案必须可机器识别
    （区分「平台不适用」与「能力缺失」两类语义）。平台判断只在用例前提本身与平台绑定时使用。
  source: "Sprint 1 baseline 取证：scripts/sync-dsh-preset.test.js:22-25,53-56（有能力探针）vs 83-84,111-112（仅平台判断）"
  evidence:
    - task: "Sprint 1"
      kind: origin
      result: observed
    - task: "Sprint 2"
      kind: trial
      result: pass
  archive_reason: null
  eval:
    task_kinds: [sprint, review]
    trigger: "plan.md 目标或 diff 中出现新增/修改的测试用例，且该用例 spawn 外部可执行文件"
    pass_criteria: >-
      diff 中每条 spawn 外部可执行文件的新增/修改用例都带能力探针（探针失败 → t.skip 且文案可识别）；
      不存在「仅依赖 process.platform 就 spawn 外部可执行文件」的新增用例；
      本机 `npm run test:installer` 的 skipped 计数与 pwsh 可用性预期一致（无 pwsh = 5，有 pwsh = 0）。
    regression_signal: >-
      trace / diff 出现新的「process.platform 判定 + 直接 spawn 外部可执行文件」用例，
      或 `npm test` 出现 ENOENT 型 fail；或 skipped 计数与 pwsh 可用性不一致。
    applies_to_sprints: ">=2"
    check_timing: "both"
    overlaps_with: [HB-2]
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: >-
    本项 origin 即 Sprint 1（T1/T4 正是其对策）。同一 Sprint 不能同时充当自己的 trial
    （自我确证），故 applies_to_sprints 从 ">=2" 起，Sprint 1 不计 unmatched。
    **Sprint 2 trial：pass → `validated`（2026-09-22 收尾，Producer）**。证据：`LG1 = 32/32/0/0`
    （skip 5 → **0**：T4 把 5 条 pwsh 依赖用例改为 spawn `node` ⇒ **能力型 skip 结构性归零**）；
    新增 `scripts/copilot-installer.test.js` 的 `bash` 用例走**平台前提绑定**的
    `SKIP: windows-only — ` 通道（文案机器可识别，`qa-signoff-2.md` MG1/MG8 实读）。
    **判据修订（登记）**：原 `pass_criteria` 的「无 pwsh = 5 skip」预期项被 T4 消除（不再有 pwsh 依赖用例）；
    对 `node`（测试运行器自身）`/bash`（平台前提）做能力探针属**空操作**，故判据改为：
    「凡能力型依赖必须有探针；平台型 skip 必须绑平台前提且文案可识别；skip 计数必须能被语义解释」。
    **残余**：win32 的 skip 分支本地不可观测 → 归 CI（`done.md` §5 R-1/R-3）。

- id: HB-2
  type: plan-template
  status: candidate
  problem: >-
    `npm test` 是 `&&` 链（test:installer → check-dsh-consistency → test:pressures →
    vision-bridge → plugins）。首步红会导致后续 4 步完全不执行，但「基线非绿」这一事实
    容易被表述成「大部分通过 / 只有 N 条红」，掩盖了「链首之后本机门禁覆盖 = 0」的真实状态。
    同时 `node --test` 的 skip 不改变 exit code，使 skip 被读成绿。
  improvement: >-
    Producer 在规划期遇到非绿基线时，必须（a）读出验证入口是否链式，若链式则显式给出
    「链首之后覆盖 = 0 / N」的结论；（b）把 skip 计数与 pass 计数分开登记，禁止把 skip 计入通过；
    （c）把这两个数值写成 gate 的 expect（而非「测试全绿」这类不可复算措辞）。
  source: "Sprint 1 规划期：npm test 退出码 1（4 条红全在链首），plan.md LG1/LG5 与 drift-check §4"
  evidence:
    - task: "Sprint 1"
      kind: origin
      result: observed
  archive_reason: null
  eval:
    task_kinds: [sprint]
    trigger: "新 Sprint 规划期基线（任一 canonical 测试命令）非绿"
    pass_criteria: >-
      plan.md 与 drift-check.md 中同时出现：① 链式入口的遮蔽效应说明与实际覆盖范围；
      ② skip 与 pass 分离的计数判据；③ gate expect 为可复算的具体数值。
    regression_signal: >-
      trace / plan 中出现「大部分通过」「仅 N 条红」等无覆盖范围说明的表述，
      或 gate expect 写成「测试全绿」而无计数；或 skip 被计入 pass。
    applies_to_sprints: ">=2"
    check_timing: "both"
    overlaps_with: [HB-1]
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: "同上：origin 即 Sprint 1，不计 unmatched；trigger 在 Sprint 2 起才可能被独立匹配。"

- id: HB-3
  type: plan-template
  status: validated
  problem: >-
    链式 canonical 入口的**覆盖遮蔽**：package.json#scripts.test = "A && B && C && D && E"。
    Sprint 1 基线 A 红 ⇒ B–E 四段从未执行，报告只能看到 4 条失败；A 修好后立刻暴露
    一条**既有**的链尾红（dsh/preset/plugins 的 kix-focus 夹具）。若不把链尾升为独立 gate，
    下一次链首红会把同样的静默再次带入，且「门禁已全绿」的结论无法被复算。
  improvement: >-
    Producer 在 plan.md 的 verifiable_gates 中，必须为链式入口的**每一段**建立独立 required
    local_gate（cmd 逐字取自既有 script，不新增脚本），使每一段的遗漏/回归都可被单独观测与结算；
    端到端链式 gate 保留为附加判据，不作为唯一判据。
  source: "Sprint 1 L2 前：LG5/LG6 在 c43d36e 上红（唯一红为链尾 kix-focus 夹具），催生 LG10/LG11 与 T6"
  evidence:
    - task: "Sprint 1"
      kind: origin
      result: observed
    - task: "Sprint 2"
      kind: trial
      result: pass
  archive_reason: null
  eval:
    task_kinds: [sprint]
    trigger: "plan.md 的 gate 引用了含 && 的链式命令，或项目的 canonical 测试入口本身是 && 链"
    pass_criteria: >-
      plan.md 中链式入口的每一段都出现为独立 required local_gate，且各段 expect 为可复算计数；
      L2 记录能分别给出每段终态，而非只有链条整体退出码。
    regression_signal: >-
      plan / trace 中只存在链式整体 gate（如单条 npm test）而无分段 gate；
      或某段失败在 Sprint 结束后才被发现。
    applies_to_sprints: ">=2"
    check_timing: "pre-sprint"
    overlaps_with: [HB-2]
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: "与 HB-2 的区别：HB-2 管「基线的表述与计数纪律」（人如何写），HB-3 管「gate 的结构」（机器如何观测）。两者可同时命中。**Sprint 2 trial：pass → `validated`（2026-09-22）**：plan §7.1 为 zh 链每段（LG3/LG4/LG5）与 en 链链尾（LG7）建独立 required gate，`npm test` / `cd en && npm test` 仅作附加判据；L2 逐段给出终态（`23/0/1` · `20/20` · `59/0/1` · `35/0/1`），QA 独立复跑抽取段计数一致。Sprint 3 起作为既定实践应用并监测 regression。"

- id: HB-4
  type: qa-workflow
  status: validated
  problem: >-
    测试的非 hermetic 性：install-lib.test.js 的幂等断言以**未入库的工作树 mtime**为输入。
    fresh checkout（仓库外 worktree @ c3c31eb）中落在失败带的文件数为 0 → baseline 在该
    checkout 上为 20 pass / 0 fail，该断言的真实分支**不执行**；只有本机当时的 3 个带内 mtime
    才复现 19/1。后果：CI 与新克隆的绿**不构成**该路径被验证的证据，而报告会把它读成「已验证」。
  improvement: >-
    凡断言依赖未入库的文件系统状态（mtime / 权限 / 目录顺序 / 时钟），必须（a）在 fixture 内
    显式构造该状态（如复制前 utimesSync 到边界值），或（b）在断言输出中标注当前状态值使其可复算。
    复核 baseline 声称时，必须换一个 checkout 重跑一次，而不是只读记录。
  source: "Sprint 1 QA 独立复核：qa-signoff-1.md F-1 + lessons-learned.md LL-7（受控 A/B：in_band_count 0 → 20/0）"
  evidence:
    - task: "Sprint 1"
      kind: origin
      result: observed
    - task: "Sprint 1"
      kind: counterexample
      result: fail
    - task: "Sprint 2"
      kind: trial
      result: pass
  archive_reason: null
  eval:
    task_kinds: [sprint, review]
    trigger: "plan / diff 中出现依赖文件系统状态（mtime/权限/顺序）或环境状态的断言"
    pass_criteria: >-
      该断言在 fresh checkout 上能触发其目标分支（或显式 skip 并说明状态前提）；
      复核 baseline 声称时存在第二个 checkout 的实测记录。
    regression_signal: >-
      出现「本机红但 fresh checkout 绿」或「CI 绿但该路径从未执行」的证据；
      或 QA 以单一 checkout 的记录作为 baseline 结论。
    applies_to_sprints: ">=2"
    check_timing: "both"
    overlaps_with: []
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: >-
    **Sprint 2 trial：pass → `validated`（2026-09-22）**。证据：本 Sprint 新增断言**一律显式构造状态**——
    LG15 的 mutation probe（`KIX_HOOK_CORE_PATH` 指向改坏 core 的副本 ⇒ 子套件 16 个 `not ok`、进程非 0）
    与 LG16 的哨兵注入 + 临时 `COPILOT_HOME`（QA 12 行注入表，含归因/作用域/分支可达性/PATH 收窄 4 组控制组 ⇒
    判据非恒真、可归因、有作用域）；`progress.md` 记录 mutation probe 首版**假绿**（子进程继承父环境 ⇒ 孙进程 0 退出）
    并已修正 —— 该假绿正属本项要防的形态。判据 (b) 的前置（复核 baseline 声称需第二个 checkout）本 Sprint 未出现。

- id: HB-5
  type: tooling
  status: validated
  problem: >-
    L2 信任链的核心凭据 l2_gate_manifest_sha256 在本机**无法复算**：canonical 实现
    （kixpower-contract.ps1 的 Get-KixGateManifestJson）依赖 pwsh，而交付宿主可以没有 pwsh。
    QA 用 80 组候选规范化均未复算出记录值 → 该 digest 只能被"信任"而无法被独立验证，
    这削弱了「L2 → QA 交接」的机械性。
  improvement: >-
    （a）plan.md 必须写明 manifest 的规范化规则（字段集、排序、序列化形式、编码），使任意宿主可独立复算；
    或（b）把 digest 计算提供平台无关实现（Node），并保留 pwsh 版为兼容层；
    或（c）在 digest 不可复算的宿主上，把该凭据降级为 advisory 并在 QA 报告中显式标注。
  source: "Sprint 1 QA 残余不确定 R-1（qa-signoff-1.md §8）；本机无 pwsh"
  evidence:
    - task: "Sprint 1"
      kind: origin
      result: observed
    - task: "Sprint 2"
      kind: trial
      result: pass
  archive_reason: null
  eval:
    task_kinds: [sprint, review]
    trigger: "L2 交接写入 manifest digest，或 QA 需要复核该 digest"
    pass_criteria: >-
      在无 pwsh 的宿主上，第三方可用 plan 记载的规则独立复算出同一 digest；
      或该凭据被显式标注为不可复算并相应降级。
    regression_signal: "QA 报告出现「digest 未能复算」而 plan 仍未记载规范化规则。"
    applies_to_sprints: ">=2"
    check_timing: "post-sprint"
    overlaps_with: []
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: >-
    **Sprint 2 trial：pass → `validated`（2026-09-22）**。证据：`plan.md` §7.2 写明 manifest 规范化规则
    （field_set / 顺序 / compact JSON / `sha256(utf8)`），并由 **canonical 实现**（`kixpower-contract.cjs`）
    产出；**QA 在无 pwsh 宿主上本地复算 `5f4eab16a3664356bed5317dd1de77a2c67487fce132e0f3475256abb15e2976`
    逐位一致**（`qa-signoff-2.md` §1 第 6 行）⇒ Sprint 1 的「不可复算凭据」问题在本 Sprint 闭合。
    关联教训：**LL-12**（凭据必须由 canonical 实现产出；临时脚本会静默偏离参照语义 —— Sprint 1 的 `46121655…` 即临时脚本 `fold + 不剥引号` 的产物，非 canonical 输出）。

- id: HB-6
  type: plan-template
  status: candidate
  problem: >-
    derived_commit_budget 的 `base = dag_layers`（每个 DAG 层 1 commit）**不为收尾产物层留位**：
    L4 报告 / done.md / QA signoff / L2 字段固化必然产生 1 个 commit，但它不对应任何 task 节点。
    Sprint 1 实测：derived 7（δ4 + strong1 + bug_reserve2），实际 8 → `over_budget: 1`，
    且 over 量**恰等于收尾层**（不是提交粒度失控）。若不修正，每个 Sprint 都会稳定超 1。
  improvement: >-
    Producer 派生 commit_budget 时，若该 Sprint 会将收尾产物入库（done.md / hill-climbing.md /
    qa-signoff.md / progress 的 L2 字段），应显式计入一个收尾层（或扩展 bug_reserve 语义覆盖它），
    使预算与「可独立回滚的变更单元」真实数量一致；**预算仍不得在收尾期回头改写**（over 则如实记录）。
  source: "Sprint 1 收尾对账：git rev-list --count c3c31eb..HEAD = 8 vs derived 7；hill-climbing.md §4"
  evidence:
    - task: "Sprint 1"
      kind: origin
      result: observed
    - task: "Sprint 2"
      kind: trial
      result: pending
  archive_reason: null
  eval:
    task_kinds: [sprint]
    trigger: "plan.md 生成 task_sizing.derived_commit_budget，且该 Sprint 计划写入 docs/sprint-N/{done,hill-climbing}.md 或 docs/qa/qa-signoff-N.md"
    pass_criteria: >-
      收官后 `git rev-list --count <baseline>..<final>` <= derived_commit_budget，
      且无需回头改写预算字段即可结算。
    regression_signal: "再次出现 over_budget，且 over 量恰等于收尾提交数（1）"
    applies_to_sprints: ">=2"
    check_timing: "post-sprint"
    overlaps_with: []
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: >-
    **Sprint 2 trial：`pending`（无效试验，不验证也不证伪）→ 保持 `candidate`（2026-09-22）**。
    改进**确已应用**：`plan.md` §15 显式 `closeout_layer: 1`；结果也满足 `pass_criteria`
    （`git rev-list --count ef6a485..HEAD` = 5 ≤ 6，且未回改预算）。**但绑定值 6 = min(公式 9, 环境硬约束 6)**
    ⇒ **反事实不可区分**（即使不计 closeout_layer，`min(8,6)` 仍是 6）⇒ 本次结果不具判别力。
    并列核算：`docs/sprint-2/done.md` §6 记录 `commits_used: 5 / derived_commit_budget: 6 / over_budget: 0`。
    **下次判别条件**：出现预算**未被环境硬约束绑定**的 Sprint；若其 `over_budget` 仍 == 收尾提交数 ⇒ 改进无效，须修正或归档。

- id: HB-7
  type: tooling
  status: candidate
  problem: >-
    安装器 / 同步脚本里的「批量替换」与「批量 chmod」步骤**无条件成功**：install.sh 对已安装的
    agents/*.agent.md 执行 `{{HOOK_LAUNCHER}}`/`{{HOOK_EXT}}` 的 sed 替换，但这两个占位符**在任何源文件中
    都不存在**（全仓 grep 只命中 installer 自己的 8 行：注释行与替换行），替换后仍无条件打印
    `ok "Replaced placeholders in agent.md files"`；同文件对 0 个 `.sh` 执行 `chmod +x` 后也打印
    `ok "chmod +x on .sh hooks/scripts"`。净效果：macOS/Linux 装完 Copilot 后 agent hooks 指向不存在的
    `pwsh` → **hooks 永不触发**，而安装器全程报成功；Windows 因硬编码恰好正确而**看不见**该缺陷。
    这是「声明存在、执行不存在」的静默失效（silent failure），比显式报错更难被发现。
  improvement: >-
    安装器 / 迁移脚本中的每个批量步骤（占位符展开、批量替换、批量 chmod、批量迁移）必须满足三条：
    ① **先计数再操作**：作用域内匹配数为 0 时输出 `skip`（含计数），**禁止**打印 `ok`；
    ② **替换后 fail-closed**：对残留模式（如 `{{...}}`）扫描，命中即打印机器可识别错误行
    （`KIX-INSTALLER-RESIDUE: <file>:<line>`）并**非零退出**，且该分支之后不得再有成功播报；
    ③ **双向可重放测试**：正向（装到临时目标 → 0 残留 + exit 0）+ 负向（向 fixture 注入哨兵占位符 →
    必须 exit ≠ 0）。只有正向的测试无法证明「残留 ⇒ 失败」，只有负向的测试无法证明「正常路径不受影响」。
    附则：跨平台契约（占位符 / launcher / 扩展名）必须在**所有**平台上由同一份源表达；
    「某平台不报错」不构成契约成立的证据（本例中 Windows 恰好正确掩盖了缺陷）。
  source: >-
    Sprint 2 增量重规划期：orchestrator 实测 + Producer 逐行复核（2026-09-22）：
    install.sh:20-21,228-229（占位符的注释与替换行）与 155-156（dry-run 播报）、222-234（无条件 ok）、236-240（空作用域 chmod）；
    install.ps1:19-20,223-224、141-142、217-228；
    `grep -rn "HOOK_LAUNCHER\|HOOK_EXT"`（排除规划文档自身的引用）= 8 行且全在 installer 内；
    `grep -o '{{[A-Z_]*}}' agents/*.agent.md | sort | uniq -c` = 仅 `{{COPILOT_HOME}}` 21 处；
    `ls skills/kixpower/hooks/*.sh` = 不存在（10 个 `.ps1`）。
  evidence:
    - task: "Sprint 2"
      kind: origin
      result: observed
  archive_reason: null
  eval:
    task_kinds: [sprint, review]
    trigger: "plan.md 目标或 diff 中出现『批量替换 / 批量 chmod / 占位符展开 / 迁移脚本 / 安装器步骤』的新增或修改"
    pass_criteria: >-
      ① 每个受影响的批量步骤都有「0 命中 → skip（带计数）」的分支，源码中不存在「无条件 ok/成功播报」；
      ② 存在残留模式的 fail-closed 分支（非零退出 + 机器可识别错误行）；
      ③ 测试同时包含正向与负向用例，且负向用例真的会让进程非零退出
         （评审时可用「注释掉 fail-closed 分支 → 负向用例必须红」验证）；
      ④ 判据跨平台同源：不在某一平台用硬编码绕过占位符/launcher 抽象。
    regression_signal: >-
      diff 中出现「批量操作 + 无条件成功播报」，或「占位符/launcher 只在单一平台成立」；
      或出现「安装/同步报成功但目标功能不存在」的用户可见缺陷（本次 D-1 即此类）。
    applies_to_sprints: ">=3"
    check_timing: "both"
    overlaps_with: [HB-1, HB-2]
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: >-
    本项 origin 即 Sprint 2（T7 正是其对策：INV-H1 残留 fail-closed、INV-H3 空作用域 skip、
    LG16 双向用例、MG8 grep 面），同一 Sprint 不能自证 → applies_to_sprints 从 ">=3" 起，Sprint 2 不计 unmatched。

- id: HB-8
  type: tooling
  status: candidate
  problem: >-
    **维护调用点不在任何 gate 的检索面内**：MG2 只覆盖 `agents/` 目录
    （`grep -rn "^hooks:\|\.ps1" dsh/preset-classic/agents en/preset-classic-en/agents`），
    故 `README.md` / `README.en.md` / `dsh/README-DSH.md` / `dsh/preset-classic/DSH-ADAPTATION.md` 的
    pwsh-only 维护指令**从来不会被任何 gate 命中**。Sprint 2 的 T4 把 `sync-dsh-preset` 移植为 `.cjs`，
    但 5 处文档入口仍指示 `pwsh -File scripts/sync-dsh-preset.ps1 -Force`，且 `sync-dsh-preset.cjs`
    在文档中 **0 命中** ⇒ 在无 pwsh 宿主（本 Sprint 的目标宿主）上，文档给出的维护路径**结构性不可执行**；
    该缺陷由 QA 发现（F-2），而非任何门禁。
  improvement: >-
    （a）凡「移植/替换某个 canonical 入口」的任务，必须把该入口的**全部 live 消费者**（脚本 + 文档 + 配置）
    列入 `target_rules` 与 gate 判据，而不是只改代码调用点；
    （b）新增机械判据：**非历史文档**中旧入口的**维护指令**命中数 = 0
    （历史类文档如 `CHANGELOG.md` 的既成条目按红线不改写，须以「历史/参照」标注排除）；
    （c）MG 类的检索面必须显式声明「覆盖哪些目录/文件类型」，未覆盖面在 plan 中标注为已知缺口。
  source: >-
    Sprint 2 QA F-2（`qa-signoff-2.md` §9）：`dsh/README-DSH.md:31,41`、`README.md:72`、`README.en.md:72`、
    `dsh/preset-classic/DSH-ADAPTATION.md:306`；`grep -rn 'sync-dsh-preset\.cjs' --include='*.md'`（除 docs/sprint-*）= 0 命中。
  evidence:
    - task: "Sprint 2"
      kind: origin
      result: observed
  archive_reason: null
  eval:
    task_kinds: [sprint, review]
    trigger: "diff 中出现「某 canonical 入口被移植/替换/改语言」，或新增/修改文档中的维护命令"
    pass_criteria: >-
      ① 旧入口在**非历史文档**中的维护指令命中数 = 0（历史条目须显式标注为历史）；
      ② 新入口至少在一个「首次安装/日常维护」语义的位置出现（不是只在 CHANGELOG 里）；
      ③ 声称「已收口」的 gate 必须给出其检索面清单（目录 + 文件类型），且检索面覆盖该次移植的全部 live 消费者。
    regression_signal: >-
      出现「代码已迁移但文档仍指向旧入口」或「无 pwsh 宿主上按文档无法完成维护」的用户可见缺口；
      或某 gate 自称覆盖某面而实测检索面为空/不匹配。
    applies_to_sprints: ">=3"
    check_timing: "both"
    overlaps_with: [HB-7]
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: >-
    本项 origin 即 Sprint 2（F-2）；Sprint 2 的 C5 只按授权修了 5 处，**残留 4 个文件**（`dsh/README-DSH.md:57-59`、
    `PLUGINIZATION-ROADMAP.md:172`、`context-budget/README.md:74`、`kix-general-evolution.md:333`）→ 见 `done.md` R-7 / `hill-climbing.md` §8 U7。

- id: HB-9
  type: plan-template
  status: candidate
  problem: >-
    **报告/台账中的「结论行」与「它自己那一次运行的逐字输出」脱钩，且错误读数会多点传播**：
    `drift-check.md` §8 的逐字输出块写 `ungated: 15 (23.4%)` + `HIGH_RISK`（无 `PASS` 行），
    而同节结论行写「本轮读数：`ungated: 0 (0%)` → `PASS`」——那是同文件 §7 **另一次运行**的读数；
    同一「0%/PASS」又传播到 `progress.md` 3 处（`:55`/`:112`/`:266`，其中 `:55` 的 `46/17/29` 与两块均不一致）。
    净效果：**没有任何 gate 失败**（LG11 的 exit 0 仍成立），但结论无证据支撑，且据此写下
    「`>20%` 强制规则未被触发」这一**反事实结论**（实际 23.4% / 27.8% > 20%，规则**被触发**）。
  improvement: >-
    （a）任何指标读数必须与该次运行的**逐字输出块**同处一文件、可机械对拍；跨运行引用必须显式标注
    「引自 <revision/时间> 的运行」并同时给出本次运行读数；
    （b）度量命令的**窗口参数**（如 `--prev-sprint N` ⇒ baseline）必须随读数声明为四元组
    （cmd / window / baseline_sha / revision），窗口跨 Sprint 时禁止表述为「本 Sprint 的 X」；
    （c）阈值型强制规则（如 >20%）的触发判定**只认同一次运行的读数**；
    （d）Producer 收尾前必须对每个度量值做一次「grep 回它的输出块」自查（可机械化的最小检查）。
  source: >-
    Sprint 2 QA F-1（`qa-signoff-2.md` §9）：`sed -n '214p;185p;208p' docs/sprint-2/drift-check.md`；
    `grep -n 'ungated: 0 (0%)' docs/sprint-2/progress.md` = 3 处；QA 在 `42d3c7e` 复跑 = `79 / 18 / 39 / 22 (27.8%)`。
  evidence:
    - task: "Sprint 2"
      kind: origin
      result: observed
  archive_reason: null
  eval:
    task_kinds: [sprint, review]
    trigger: "报告 / 台账 / signoff 中出现任一量化指标读数（覆盖率、计数、比率、digest、退出码）"
    pass_criteria: >-
      ① 每个读数都能 `grep` 回它所属的运行输出块（或显式标注为跨运行引用 + 两次运行标识）；
      ② 度量类读数附窗口四元组；③ 阈值型规则给出「同一次运行读数 → 触发/未触发」的判定句；
      ④ 同一读数的多处出现逐值一致（不一致即视为缺陷）。
    regression_signal: >-
      同一指标在不同文件/不同段落出现不同值；或结论行引用的读数在同节找不到输出块；
      或以某次运行的读数代表另一次运行的窗口。
    applies_to_sprints: ">=3"
    check_timing: "both"
    overlaps_with: [HB-2, HB-13]
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: "本项 origin 即 Sprint 2（F-1）；配套经验 LL-10（结论与自身证据同源）与 LL-11（指标窗口四元组）。"

- id: HB-10
  type: dev-workflow
  status: candidate
  problem: >-
    **installer 残留扫描的作用域与「本 bundle 写入的文件」不对齐 + 失败非原子**：
    `install.sh:290` = `grep -rl '{{' "$COPILOT_HOME/agents"`（**该目录下全部文件**），
    而 `install.ps1:280` = `Get-ChildItem … -Filter '*.agent.md'`（仅 agent 清单）⇒ 两个 installer 作用域不对称；
    实测：目标目录**预先存在**的第三方文件 `other-tool.agent.md` 含 `{{MY_TEMPLATE}}` → 安装器 exit 1 并指名
    一个与本 bundle 无关的文件（误报）；且失败发生在**拷贝之后**（`partial_tree_left=true`）。
  improvement: >-
    残留扫描必须以「本次 installer 实际写入/替换过的文件清单」为作用域（或按 bundle 已知文件名白名单收窄，
    而非按目录全扫）；失败路径必须为**原子或可恢复**：失败时不留下半装树（先写临时目录再整体切换），
    或至少在非零退出时输出**待清理路径清单 + 重跑提示**（幂等已由 LG16 实测）。
  source: "Sprint 2 QA F-3（`qa-signoff-2.md` §9）：探针 `lg16-edges.cjs` C1/C2/C3；`grep -n \"grep -rl '{{'\" install.sh`；`grep -n \"Filter '\\*.agent.md'\" install.ps1`"
  evidence:
    - task: "Sprint 2"
      kind: origin
      result: observed
  archive_reason: null
  eval:
    task_kinds: [sprint, review]
    trigger: "diff 中出现 installer / 迁移脚本的「扫描 / 校验 / 清理」步骤，或其 fail-closed 分支"
    pass_criteria: >-
      ① 扫描作用域 == 本 bundle 写入的文件集合（第三方既有文件不得触发失败）；
      ② 两个平台的 installer 作用域**对称**（同一语义、同一集合定义）；
      ③ 失败路径要么原子（无半装树），要么输出可执行的清理/重跑指引并已在文档中给出。
    regression_signal: >-
      出现「第三方文件导致安装失败」或「失败后目标目录处于半装状态且无指引」的报告；
      或两个 installer 的扫描范围定义再次分叉。
    applies_to_sprints: ">=3"
    check_timing: "both"
    overlaps_with: [HB-7]
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: "本项 origin 即 Sprint 2（F-3）；方向安全（fail-closed、指名文件、可恢复），故 F-3 定级 P3。"

- id: HB-11
  type: dev-workflow
  status: candidate
  problem: >-
    **fail-closed 的「未知形态」判据按输入契约枚举不完整 ⇒ 理论敞口**：
    `kix-verdict.cjs:71` 的 `TOOL_LIKE_KEY = /tool|call|command|input|args|invocation|payload|name/i` 中
    **`arguments` / `parameters` / `function` 均不在表内**（`args` 匹配不到 `arguments`）。
    实测 `{"chat":{"function":"bash","arguments":{"command":"psql -c \"DROP TABLE t\""}}}` → exit 0（**静默放行**）；
    混合形态 `{"toolCalls":[], …形态3 危险调用}` 亦 exit 0（`toolCalls` 存在即短路）。
    反向风险同样存在：`.ps1` 侧 `if ($toolCalls)` 对**空数组**按 PowerShell 真值语义会落入形态 3（需 pwsh/CG4 定档）。
  improvement: >-
    （a）「未知形态」判据必须按**输入契约枚举完整键名**（含 `arguments`/`parameters`/`function`），
    并保留「只有元数据字段 ⇒ 非 unknown」的**反向控制**；
    （b）空 `toolCalls` 不得短路后续形态识别（空数组 ≠ 无危险调用）；
    （c）本项的任何实现改动**必须以真实宿主载荷采样作为 falsifier**（OQ9），否则属无证据加严。
  source: "Sprint 2 QA F-4（`qa-signoff-2.md` §9）：`hook-probe.cjs` B1/B2/B3（4 个入口同源核心）"
  evidence:
    - task: "Sprint 2"
      kind: origin
      result: observed
  archive_reason: null
  eval:
    task_kinds: [sprint, review]
    trigger: "diff 中出现「外部输入载荷归一化 / schema 适配 / fail-closed 判据」的新增或修改"
    pass_criteria: >-
      ① 未知形态判据的键名集合覆盖契约中出现的全部工具调用载体（含 arguments/parameters/function）；
      ② 存在反向控制（纯元数据载荷必须放行）与短路测试（空 toolCalls + 危险形态）；
      ③ 加严有外部证据（真实载荷采样）或显式标注为「无外部证据的防御性加严」。
    regression_signal: >-
      出现「构造的未知形态载荷被静默放行」的探针结果；或加严导致真实载荷被误判为 unknown（假阳性）。
    applies_to_sprints: ">=3"
    check_timing: "both"
    overlaps_with: [HB-7]
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: >-
    本项 origin 即 Sprint 2（F-4）。**Sprint 2 明确不做**其 1 行改进：属产品码改动
    （`skills/kixpower/hooks/lib/kix-verdict.cjs` ×3 副本）→ 会使 QA 签署（绑定 `42d3c7e` + `qa_test_changes: []`）
    **立即失效**，故只登记。配套经验 LL-13（按轴分解验证）。"

- id: HB-12
  type: tooling
  status: candidate
  problem: >-
    **新增的文档类三面产物不在任何机器守护的 identical-set 内**：
    `skills/kixpower/hooks/README.md`（3 副本，MG10 的**证据对象**本身）未登记进 `consistency-lib.cjs` 的镜像组
    （`grep -n 'README.md' dsh/preset-classic/plugins/consistency-lib.cjs` = 0 命中）；
    `checkMarkdownLinks` 只校验链接可达性、不比较三面内容（且 `walk()` 不跟随 `dsh/preset/skills` symlink）。
    当前 3 副本 md5 一致（`ea8ce56f…`）→ **今天一致，将来漂移静默**。
  improvement: >-
    凡新增「多副本分发的文档/配置」产物，必须同时登记进一致性守护组（`SPRINT2_NODE_ARTIFACTS` 或新建
    「文档类三面组」），或在该产物上显式声明「不受守护」并给出替代守护方式；
    MG 类判据若以某文件为证据对象，则该对象自身应在守护面内（防「证据对象漂移导致判据失真」）。
  source: "Sprint 2 QA F-5（`qa-signoff-2.md` §9）：`md5 -q skills/kixpower/hooks/README.md dsh/preset-classic/… en/…`；`grep -n README.md dsh/preset-classic/plugins/consistency-lib.cjs` = 0"
  evidence:
    - task: "Sprint 2"
      kind: origin
      result: observed
  archive_reason: null
  eval:
    task_kinds: [sprint, review]
    trigger: "diff 中出现新的多副本产物（同内容存在于 ≥2 个发行面）"
    pass_criteria: >-
      ① 新多副本产物在同一 Sprint 内被加入某个机器守护组（字节或结构级），或在报告中显式声明不受守护；
      ② 以某文件为证据对象的 gate，其证据对象位于守护面内（或有替代守护）。
    regression_signal: "出现「三面内容不一致但无任何门禁报警」的漂移实例；或证据对象被静默修改而判据未失效。"
    applies_to_sprints: ">=3"
    check_timing: "both"
    overlaps_with: [HB-5]
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: "本项 origin 即 Sprint 2（F-5）。`consistency-lib.cjs` 属产品码 ⇒ Sprint 2 不改（会使 QA 签署失效）。"

- id: HB-13
  type: qa-workflow
  status: candidate
  problem: >-
    **门禁判据的强度弱于其自述**（两处）：① `KIX-INSTALLER-NO-NODE` 出现在 `install.sh`
    **成功路径的横幅**（`Node required: >= 20.16.0 (KIX-INSTALLER-NO-NODE otherwise)`）⇒ QA 的 T7 实测中
    **被接受的版本也被 grep 命中**（`marker=true` 而 exit 0）⇒「输出含 marker」**不构成失败证据**；
    ② `copilot-installer.test.js:208` 的 `assert.match(text, /skip: /)` 对 `install.ps1` 命中的是**占位符替换**
    的 skip 文案（`install.ps1` 无 chmod 步骤：`grep -c chmod install.ps1` = 0）⇒ 该断言对 ps1 侧**不判别**
    其注释所声称的空作用域语义（sh 侧由 `:173` 的精确文案断言覆盖，是真判据）。
  improvement: >-
    （a）**失败判据必须以退出码为主证据**，文本 marker 只能在「该文本不出现在成功路径」时作为辅助
    （否则须改用**只出现在失败分支**的独占文本，并在注释中写明该约束）；
    （b）跨平台断言的注释必须声明其**适用侧**（sh-only / ps1-only），不得让读者以为两侧都被判别；
    （c）每条断言需能回答「它失败时是否真的说明目标语义被破坏」。
  source: "Sprint 2 QA F-6（`qa-signoff-2.md` §9）：`grep -n 'KIX-INSTALLER-NO-NODE' install.sh`；`lg16-inject.cjs` T7 输出；`sed -n '202,215p' scripts/copilot-installer.test.js`"
  evidence:
    - task: "Sprint 2"
      kind: origin
      result: observed
  archive_reason: null
  eval:
    task_kinds: [review, sprint]
    trigger: "新增/修改测试断言，或新增机器可识别错误 marker / 失败文案"
    pass_criteria: >-
      ① 每条新断言都能指出「失败 ⇒ 哪条语义被破坏」，且其证据不被成功路径复用（无 `marker=true 且 exit 0` 的两义态）；
      ② 跨平台断言的适用范围在注释或测试名中显式声明；
      ③ 存在至少一条控制用例证明该断言非恒真（或给出判据自证的机械方式）。
    regression_signal: >-
      「断言通过但目标语义未生效」或「断言失败但实际正常」的实例（假绿/假红）；
      或同一 marker 同时出现在成功与失败路径。
    applies_to_sprints: ">=3"
    check_timing: "both"
    overlaps_with: [HB-9, HB-4]
    supersedes: []
    unmatched_runs: 0
    archive_after_unmatched: null
  note: "本项 origin 即 Sprint 2（F-6）。当前 LG16 **无假绿**（sh 侧为精确文案断言 + exit code 双证），故只登记不改。"
```

## 应用记录

| Sprint | 项 ID | 处置 | 结果 |
|---|---|---|---|
| 1 | — | 本 Sprint 规划期创建 HB-1 / HB-2（均为 candidate），不作为 trial 应用（origin == 潜在 trial，自我确证无效）| not triggered |
| 1 | HB-3 / HB-4 / HB-5 | L4 收尾期新增（均为 candidate）：HB-3 origin = L2 前链尾红暴露；HB-4 origin = QA 受控 A/B 反证；HB-5 origin = QA 残余不确定 R-1 | not triggered（origin == Sprint 1）|
| 1 | HB-6 | 收尾对账期新增（candidate）：origin = blast-radius 结算提醒触发的 over_budget 对账（8 vs 7，over 量 == 收尾层）| not triggered（origin == Sprint 1）|
| 2 | HB-1 / HB-3 / HB-4 / HB-5 / HB-6 | 规划期首次独立匹配（`applies_to_sprints: ">=2"`）→ **5 项 scoped trial**（落实位置见 `docs/sprint-2/plan.md` §11 / §19）| trial 进行中，**待 QA 判定**（`not triggered` ≠ pass；trial pass ≠ 晋升 validated）|
| 2 | HB-2 | 规划期基线为绿（`test:installer` exit 0、`test:consistency` exit 0）→ trigger 不匹配 | not triggered（**不得记为 pass**）|
| 2 | HB-7 | 增量重规划期新增（candidate）：origin = installer 占位符契约空洞 + 无条件成功播报（D-1）| not triggered（origin == Sprint 2，自我确证无效；`applies_to_sprints: ">=3"`）|
| **2** | **HB-1 / HB-3 / HB-4 / HB-5** | **收尾期 trial 判定（Producer @ `42d3c7e`，证据见各项 `note`）** | **`trial pass` → 晋升 `validated`**（4 项；自 Sprint 3 起作为 repo 级既定实践应用，并监测 `regression_signal`，命中即降回 `candidate`）|
| **2** | **HB-6** | **收尾期 trial 判定：改进已应用但结果无判别力**（绑定值 6 = `min(公式 9, 环境硬约束 6)` ⇒ 反事实不可区分）| **`trial: pending`（无效试验）→ 保持 `candidate`**；下次判别条件见该项 `note` |
| **2** | **HB-8 / HB-9 / HB-10 / HB-11 / HB-12 / HB-13** | **L4 收尾期新增（均 candidate）**：origin 分别 = F-2（维护调用点不在检索面）/ F-1（结论与自身证据矛盾并传播）/ F-3（installer 作用域+非原子）/ F-4（未知形态敞口）/ F-5（文档类三面未守护）/ F-6（判据强度弱于自述）| `not triggered`（origin == Sprint 2，自我确证无效；均 `applies_to_sprints: ">=3"`）|

## 统计

```yaml
items_total: 13
by_status: {candidate: 9, validated: 4, archived: 0}
by_type: {dev-workflow: 3, plan-template: 4, qa-workflow: 2, tooling: 4}
```

> **统计口径（Sprint 2 收尾，2026-09-22）**：`candidate: 9` = HB-2（trigger 未匹配）· HB-6（无效试验）·
> HB-7（origin == Sprint 2）· HB-8..HB-13（L4 新增，origin == Sprint 2）。
> `validated: 4` = HB-1 / HB-3 / HB-4 / HB-5（trial pass）。**无 `archived`**（无证伪、无被取代项）。
> 硬约束遵守：L4 **未**直接写 `validated`（4 项均以「独立匹配窗口 + pass_criteria 可观测证据」晋升，
> 且各自 `note` 记录了判据修订 / 残余）；`applied` 未写入任何 `- id:` 记录。
