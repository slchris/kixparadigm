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
```

## 应用记录

| Sprint | 项 ID | 处置 | 结果 |
|---|---|---|---|
| 1 | — | 本 Sprint 规划期创建 HB-1 / HB-2（均为 candidate），不作为 trial 应用（origin == 潜在 trial，自我确证无效）| not triggered |

## 统计

```yaml
items_total: 2
by_status: {candidate: 2, validated: 0, archived: 0}
by_type: {dev-workflow: 1, plan-template: 1}
```
