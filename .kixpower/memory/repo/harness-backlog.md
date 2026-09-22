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
  status: candidate
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
  status: candidate
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
  note: "与 HB-2 的区别：HB-2 管「基线的表述与计数纪律」（人如何写），HB-3 管「gate 的结构」（机器如何观测）。两者可同时命中。"

- id: HB-4
  type: qa-workflow
  status: candidate
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

- id: HB-5
  type: tooling
  status: candidate
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

## 统计

```yaml
items_total: 7
by_status: {candidate: 7, validated: 0, archived: 0}
by_type: {dev-workflow: 1, plan-template: 3, qa-workflow: 1, tooling: 2}
```
