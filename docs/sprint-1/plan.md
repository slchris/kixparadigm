# Sprint 1 Plan — 测试基线健康（模式 0：已有代码项目导入）

```yaml
sprint: 1
theme: "A. 测试基线健康"
baseline_sha: c3c31eb3268622358761cb2035ec84810a12ca11
branch: main
content_language: zh
producer: Remy
created: 2026-09-22
```

> 输入：`docs/brainstorm/sprint-1-brainstorm.md`（C1–C9 结论）、`docs/sprint-1/drift-check.md`（baseline）、
> `docs/sprint-1/runtime-context.md`（工具链能力快照）、`PROJECT_BRIEF.md`。

---

## 1. Sprint 范围

**目标**：把本项目「可复现分发」的门禁从**平台特异不可见**恢复为**可信、可复算、跨平台可见**。

| # | 交付 | 判据 |
|---|---|---|
| G-A | 4 条红转绿 | `npm run test:installer` exit 0，计数与预期逐项相符（本机 `20/0/5`，有 pwsh 环境 `25/0/0`）|
| G-B | CI 增 macOS runner | `ci.yml` matrix 含 `macos-latest`，且该 job 真实执行 `npm test` 且为 success |
| G-C | 被 skip 的 pwsh 用例显式门禁化 | skip 在 gate 中可区分、可计数、必须在 QA signoff 逐条登记；CI 中 `skipped = 0` |
| G-D | 文档声称与实测可对照 | CHANGELOG 中门禁数字能看出测量平台；已被实测反证的声称有勘误 |

**为什么先做这件事**：`npm test` 是 `&&` 链，第一步 `test:installer` 红 → 本机后续 4 步（一致性守护 / 选择压 / vision / plugins 套件）**从未执行**。当前本机门禁覆盖率不是「部分红」，而是链首之后为 0。

---

## 2. 本 Sprint 不做什么（explicit non-goals）

| 不做 | 原因 |
|---|---|
| **不重写 `sync-dsh-preset.ps1`**，不把 pwsh 用例改写成 Node 实现 | 脑暴分歧 A 裁决：被测对象就是那 197 行 PowerShell；Node 重写会让脚本回归覆盖归零（违反 G1）。方案保留在 Sprint+1 候选 |
| **不改 `dsh/**` 任何 preset / 插件源码** | 本 Sprint 聚焦门禁健康；改 `dsh/**` 会触发 4 副本同步与 persona 预算守护，属另一主题 |
| **不动 `dsh/preset-null`**（消融档） | 消融面设计上最小，且不在一致性契约内 |
| **不改写 CHANGELOG 历史条目的原始数字** | 脑暴分歧 D 裁决：历史不可篡改，只追加勘误与平台限定 |
| **不新增 npm script / 不新增测试框架 / 不引入第三方依赖** | 项目零依赖约束（D7）；门禁只能引用既有 canonical 命令 |
| **不跑 `verification-fidelity-check.ps1`** | 本机无 pwsh；drift-check 降级为手工 baseline 报告（`verification_fidelity: baseline`）|
| **不提 GitHub Issue** | 上游仓库 Issues 已禁用（`hasIssuesEnabled: false`）；缺陷登记走 `progress.md` |
| **不发布 / 不合并上游 PR** | 需要用户明确指示；本 Sprint 只产出可验证的本地 revision |
| **不做性能 / 内存优化** | 无 bench 面；非 perf Sprint |
| **不修复上游 `v1.3.17` 的 CI 失败** | 与本地 baseline 不同 revision；仅登记为 R3 风险 |

---

## 3. task 可行性前置 gate（G1 liveness / G2 heat）复核

> 每条种子先过普适 gate，再决定采纳/否决。G3/G4（perf 专属）本 Sprint 不适用（无 bench 驱动）。

| 种子 | G1 liveness（可达入口 + 消费者） | G2 heat | 决策 |
|---|---|---|---|
| **T1** 补 pwsh 探针 | live：入口 `npm test` → `test:installer`（CI 每 push 跑）；被测 `scripts/sync-dsh-preset.ps1` 有真实消费者（`dsh/README-DSH.md:41,57-59` 维护流程、`scripts/context-budget/README.md:74`）| `warm`（每次本地/CI 测试）| ✅ 采纳 |
| **T2** 修幂等 | live：`ensureDefaultShelf('skills', …)` 由 `installPreset` 调用（`install-lib.js:315-318`），经 `postinstall` 在**每次 `npm i -g kixparadigm`** 执行；`ensureDefaultSkillsShelf` 是同一路径的别名包装 | `warm`（每次安装）——且「安装幂等」正是项目唯一卖点（可复现分发），heat 视为关键路径 | ✅ 采纳（**先取证**）|
| **T3** CI 加 macOS | live：`.github/workflows/ci.yml` 由 push/PR 触发 | `warm`（每次 CI）| ✅ 采纳（依赖 T1/T2，见 force_sequential）|
| **T4** skip 显式门禁化 | live：消费者 = L2 gate 判读 / QA signoff / CI（`skipped` 计数）| `warm` | ✅ 采纳（独立成单，见 §4 说明）|
| **T5** 文档漂移 | live：消费者 = 包用户与维护者（`CHANGELOG.md` 随 npm 包分发）| `cold`，🟡 low-ROI | ✅ 采纳但降优先级：成本 ≈ 1 文件，且其声称**正是 T2 的待验证假设**（若不修，T2 的结论无处落地）|

**未通过 gate 的候选（记为不设 task）**：

| 候选 | 未通过项 | 理由 |
|---|---|---|
| 「把 5 条 pwsh 用例全部 Node 重写」 | G1 | 会使 `sync-dsh-preset.ps1` 生产路径零回归覆盖；剧本已论证（分歧 A）|
| 「为 macOS 单独拆分 CI job 并跳过 pwsh 用例」 | G2 | 用配置掩盖环境差异，不产生新信息；CI 上 pwsh 存在，跳过等于主动降低覆盖 |
| 「升级 CI node 版本 / 增加 node 24」 | G1 | 与客户确认的 Sprint 目标无关（net-new 范围，无入口证据）|
| 「给所有平台判断加统一 helper 并全仓替换」 | G2 | 只影响 1 个测试文件的 5 处；全仓重构属 `cold` + 高回归风险 |

---

## 4. 任务列表

> 状态标记：`[ ]` 未开始 / `[~]` 进行中 / `[x]` 完成 / `❌ Blocked`。与 `progress.md` 数值保持一致。

- [ ] **T1 — `sync-dsh-preset.test.js` 三条 pwsh 用例补统一可用性守卫**
  - 做法：用同文件 21/52 已有的 `runPowerShell(['-Command','$PSVersionTable.PSVersion.ToString()'])` + `probe.error.code === 'ENOENT'` 探针，为 82/110/140 增加「能力缺失型 skip」；保留既有的 `process.platform === 'win32'` 平台型 skip 语义，两类 skip 文案必须可区分。
  - **不做什么**：不删除任何断言；不改负向断言（`outside the bundle` / `outside the selected source` / `does not exist`）；不把整脚本覆盖跳掉。
  - 验收：本机 `npm run test:installer` 中 82/110/140 由 fail → skip（共 5 skip）；有 pwsh 环境仍真跑。
  - 文件：`scripts/sync-dsh-preset.test.js`

- [ ] **T2 — `ensureDefaultSkillsShelf` 幂等在 macOS 失效：先取证，再修最窄一层**
  - **步骤 A（取证，必须先完成并落盘）**：一次调用打印 `{added, updated, same, pruned}` 四元组，并对失配文件输出 `(相对路径, src.size, dst.size, src.mtimeMs, dst.mtimeMs)` 对照；在 `progress.md` 写入形如 `T2-evidence: added=N updated=N same=N pruned=N` 的行。
  - **步骤 B（修复）**：根因确定后，只改与根因对应的那一层（比较口径 **或** 复制/mtime 保留路径）；**禁止**放宽断言或改测试期望来「对上数字」。
  - **已按证据门禁降级的假设**（不得作为已定结论）：`install-lib.js:229` 的 `Math.round(mtimeMs/1000)` 容差口径 —— 见 §7 OQ1（两个主流模型都不预测观测值 3）。
  - 验收：`npm run test:installer` 中 `install-lib.test.js` 20/20；且「同一源安装两次目标副本无变化」有独立证据（非仅测试绿）。
  - 文件：`scripts/install-lib.js` + **必须同步** `en/scripts/install-lib.js`（字节镜像，`consistency-lib.cjs:691` 守护）
  - 回归注意：`copyTree` 是安装器核心；改动不得破坏 `memories/` 不裁剪语义（D3）与 git 指针物化（`resolveLinkedDir`）。

- [ ] **T3 — CI 矩阵增 macOS runner**
  - 做法：`.github/workflows/ci.yml` 的 `matrix.os` 增加 `macos-latest`（保持 `node: ['20.16.0','22.x']` 与 `fail-fast: false`；zh 包与 `en/` 两侧 `npm test` 均保留）。
  - **必须记录的事实**：macOS runner 也预装 pwsh（证据见 §6），因此 T3 复现与防护的是 **T2 的幂等红**，与 T1 无关；不得因「加了 macOS 还是绿」而误判 T3 无价值。
  - 依赖：T1、T2 已合并（避免共享分支长红）。
  - 验收：`ci.yml` diff 含 `macos-latest`；CI 的 matrix job 中出现 macOS 且其 `npm test` 输出 `skipped 0`。
  - 文件：`.github/workflows/ci.yml`

- [ ] **T4 — 被 skip 的 pwsh 用例：显式门禁语义**
  - 做法：
    1. 5 条 pwsh 依赖用例（21/52 + T1 新增的 82/110/140）采用**统一且机器可识别**的 skip 文案（如 `SKIP: pwsh unavailable` / `SKIP: windows-only`），使 `node --test` 汇总的 `skipped` 计数可与原因一一对应；
    2. 保证 `npm run test:installer` 的输出保留 `pass / fail / skipped` 三项计数（不得被脚本吞掉）。
  - **本 Sprint 不引入新 npm script**（门禁只能引用既有 canonical 命令）；「skip ≠ 通过」的判定由 `plan.md` 的 LG1 期望值与 `manual_gate MG1` 承载。
  - 验收：本机 `skipped = 5` 且 5 条原因可枚举；CI 中 `skipped = 0`。
  - 文件：`scripts/sync-dsh-preset.test.js`（与 T1 同文件 → 由 depends_on 串行）

- [ ] **T5 — CHANGELOG 文档漂移修正（不改历史数字）**
  - 范围（仅限已被实测反证的声称）：
    - v1.3.13「复制保留 mtime 使重复安装幂等」/「install-lib 20/20」→ 追加平台限定与勘误（措辞取决于 T2 结论）；
    - v1.3.15「`npm test` 59 pass / 0 fail / 1 skip」→ 追加测量平台限定；
    - Sprint 1 新条目写清双口径：本机 macOS `20 / 0 / 5`，CI（ubuntu/windows/macos，均预装 pwsh）`25 / 0 / 0`。
  - **保留**历史条目原始数字（只追加，不覆写）。
  - 验收：每个门禁数字都能看出测量平台；无条目被改写。
  - 文件：`CHANGELOG.md`

**为什么 T4 不并入 T1**：客户三项目标（红转绿 / macOS / skip 门禁化）需要**可分别验收与独立回滚**的证据单元；T1 的证据维度是「测试红绿」，T4 的证据维度是「gate 语义可区分」，二者不同。合并会让「3 条转绿」信号被 skip 语义重构淹没。

---

## 5. task DAG

```yaml
task_dag:
  nodes:
    - id: T1
      desc: "sync-dsh-preset.test.js 82/110/140 补统一 pwsh ENOENT 探针（3 条 fail → skip）"
      depends_on: []
      coupling: none
      estimated_tokens: low
      target_rules:
        globs: ["scripts/sync-dsh-preset.test.js"]
        modules: [scripts]
        languages: [javascript]
        mechanical_links:
          - type: callees            # 该测试文件 spawn 的被测对象（CodeGraphy/grep 正向）
            of: ["scripts/sync-dsh-preset.ps1"]
    - id: T2
      desc: "ensureDefaultSkillsShelf/copyTree 幂等根因取证（added/updated/same/pruned 四元组）后修最窄一层；同步 en 字节镜像"
      depends_on: []
      coupling: none
      estimated_tokens: medium
      target_rules:
        globs:
          - "scripts/install-lib.js"
          - "scripts/install-lib.test.js"
          - "en/scripts/install-lib.js"     # 字节镜像副本（守护强制，必须同步）
        modules: [scripts]
        languages: [javascript]
        mechanical_links:
          - type: callers            # 谁调用 copyTree / ensureDefaultShelf
            of: ["scripts/install-lib.js"]
          - type: identical_mirror   # 仓库本地扩展类型：字节镜像副本组
            of: ["en/scripts/install-lib.js"]
            guard: "consistency-lib.cjs:691 checkIdenticalSet → npm run test:consistency"
    - id: T3
      desc: "CI matrix 增加 macos-latest（依赖 T1/T2 已合并，避免共享分支长红）"
      depends_on: [T1, T2]
      coupling: weak               # 配置改动本身独立，仅合并顺序依赖前两者；不消费其产物
      estimated_tokens: low
      target_rules:
        globs: [".github/workflows/ci.yml"]
        modules: [github-workflows]
        languages: [yaml]
        mechanical_links: []
    - id: T4
      desc: "5 条 pwsh 依赖用例统一可识别 skip 文案，使 skipped 计数与原因可一一对应（与 T1 同文件，串行）"
      depends_on: [T1]
      coupling: strong             # T1 的探针形状是 T4 的直接输入；同文件，必须建立在其之上
      estimated_tokens: low
      target_rules:
        globs: ["scripts/sync-dsh-preset.test.js"]
        modules: [scripts]
        languages: [javascript]
        mechanical_links:
          - type: callees
            of: ["scripts/sync-dsh-preset.ps1"]
    - id: T5
      desc: "CHANGELOG 已被实测反证的声称追加平台限定与勘误（不改历史数字）"
      depends_on: [T1, T2, T3, T4]  # 需要最终门禁数字与 skip 口径稳定后再写
      coupling: weak               # 消费结论而非产物
      estimated_tokens: low
      target_rules:
        globs: ["CHANGELOG.md"]
        modules: []
        languages: [markdown]
        mechanical_links: []
  properties:
    max_antichain_width: 2        # ω：L0={T1,T2}、L1={T3,T4}，最大同层可并行数 = 2
    critical_path_depth: 3        # δ：T1→T3→T5 或 T1→T4→T5
    coupling_density: 0.26        # γ：(0+0+0.3+0.7+0.3)/5
    recommended_topology: sequential   # 命中强制串行条件（见 §5.2）；无强制时按 ω=2,γ=0.26 应得 hybrid
    layers:
      - [T1, T2]
      - [T3, T4]
      - [T5]
```

### 5.1 `identical_mirror` 类型说明

TEAM_CONVENTIONS 的 `mechanical_links.type` 闭集为 `callers|callees|same_trait|same_struct`（CodeGraphy 语义），没有「副本镜像」类型。本仓库存在一类机械可验证的镜像关系（`scripts/install-lib.js` ↔ `en/scripts/install-lib.js`，由 `consistency-lib.cjs:691` 守护），故**显式扩展一个仓库本地类型** `identical_mirror`，其 `guard` 字段指向真实守护与门禁命令（LG2）。这不是新增机制，而是把已存在的机械守护登记进 `target_rules`，避免 Dev 只改单侧。

### 5.2 `force_sequential` 判定理由

```yaml
force_sequential: true
```

| # | 触发条件（TEAM_CONVENTIONS §何时强制 sequential）| 本 Sprint 命中情况 |
|---|---|---|
| 1 | **涉及同一文件的多个任务** | T1 与 T4 同为 `scripts/sync-dsh-preset.test.js`；已由 `T4.depends_on: [T1]` 串行化，禁止并行 worktree 分别编辑该文件（避免 merge 冲突）|
| 2 | 加密/认证敏感改动 | 不命中 |
| 3 | plan 明确标注 force_sequential | 命中 |

**额外理由（本 Sprint 特有，非规则要求）**：

- **共享唯一验证入口**：T1 与 T2 虽改不同文件，但**唯一 canonical 入口是 `npm run test:installer`**，该命令同时包含 3 条 pwsh 红与 1 条幂等红。任一未修时该命令必红 → 分区并行的两个 Dev **都无法各自产出绿灯结算**；而 L2 要求「同一 revision 上全部 required local gate 通过」，分区自证不成立。
- **扇出固定开销不回本**：全 Sprint 总改动 ≈ 4 文件 + CI 配置，5 个任务、δ=3；worktree/partition/synthesis 的固定成本高于串行收益。

> 结论：`recommended_topology: sequential`。DAG 仍输出 `layers` 与 ω/δ/γ，供 orchestrator 在修复过程中若改变范围时重新路由。

---

## 6. task_sizing（derived_commit_budget）

```yaml
task_sizing:
  inputs:
    task_count: 5                      # k（仅参考，不进公式）
    dag_layers: 3                      # δ = critical_path_depth
    dag_width: 2                       # ω = max_antichain_width
    strong_coupling_count: 1           # coupling ∈ {strong, critical} 的节点数（T4）
    bug_reserve: 1                     # 冷启动兜底；harness-backlog 无历史 bug 统计
    bug_reserve_source: "cold-start default（.kixpower/memory/repo/harness-backlog.md 尚无跨 Sprint bug 统计）"
  derived_commit_budget: 5             # base(3) + coupling_bonus(1) + bug_reserve(1)
  hard_cap: 10
  warn_threshold: 10                   # dag_layers*3 + bug_reserve = 9 + 1
  over_cap: false
```

同步到 `progress.md` 的 `blast_radius.commit_budget: 5`。

---

## 7. verifiable_gates

> **红线**：以下 `cmd` **只能引用 `package.json#scripts` 中真实存在的 canonical 命令**、真实存在的系统命令（本机已实测），或真实的 `gh` 只读调用。本 Sprint **不新增**任何 npm script。
> `required: true` 的 local_gate 集合是 L2 manifest 的唯一来源（`required_local_gate_ids`）。

```yaml
verifiable_gates:
  local_gate:
    - id: LG1
      type: local_gate
      cmd: "npm run test:installer"
      expect: >-
        exit 0；本机（无 pwsh）node --test 汇总为 pass 20 / fail 0 / skipped 5；
        若环境存在 pwsh 则必须为 pass 25 / fail 0 / skipped 0。
        skipped 不计为通过：本机 pass 数必须恰为 20，出现 pass 25 而无 pwsh 即为异常。
      required: true
      covers: [T1, T2, T4]
    - id: LG2
      type: local_gate
      cmd: "npm run test:consistency"
      expect: >-
        exit 0；stdout 含 "CONSISTENCY OK" 且含 install-lib.js 的 2 copies byte-identical 记录
        （证明 en/scripts/install-lib.js 已同步）。
      required: true
      covers: [T2]
    - id: LG3
      type: local_gate
      cmd: "npm run test:pressures"
      expect: "exit 0（选择压 registry --check + 两个审计脚本单测）"
      required: true
      covers: [T2]
    - id: LG4
      type: local_gate
      cmd: "npm run test:vision"
      expect: "exit 0"
      required: true
      covers: [T2]
    - id: LG5
      type: local_gate
      cmd: "npm test"
      expect: >-
        exit 0。此项是端到端判据：npm test 为 && 链，LG1 红则后续 4 步不会执行；
        通过即证明链首红已解除、一致性守护/选择压/vision/plugins 套件真实执行。
      required: true
      covers: [T1, T2, T4]
    - id: LG6
      type: local_gate
      cmd: "cd en && npm test"
      expect: "exit 0（英文包独立门禁；en 不含 sync-dsh-preset 测试）"
      required: true
      covers: [T2]
    - id: LG7
      type: local_gate
      cmd: "npm run verify:guards"
      expect: "exit 0（只读比对已安装副本与仓库 canonical 的 guards 判定函数）"
      required: false          # 依赖 $DSH_HOME 安装副本状态，环境相关，不作为本 Sprint 判据
      covers: []
    - id: LG8
      type: local_gate
      cmd: "npm run verify:vision"
      expect: "exit 0"
      required: false          # 依赖 vision-bridge 安装状态
      covers: []
    - id: LG9
      type: local_gate
      cmd: "npm run audit:pressures"
      expect: "exit 0（只读审计报告；--check 版本已由 LG3 覆盖）"
      required: false
      covers: []
  ci_gate:
    - id: CG1
      type: ci_gate
      cmd: "gh pr checks <sprint-PR> -R olicesx/kixparadigm"
      expect: >-
        全部 check 为 success，且对应当前 Sprint HEAD（40 位 SHA）。
        注意：本地 origin 是 fork slchris/kixparadigm，该 fork 无 workflow 注册、无 run 历史，
        CI 只能在「fork → 上游 PR」路径上观测；无 PR 时本 gate 记 pending，不得记为 pass。
      required: true
      covers: [T1, T2, T3, T4]
    - id: CG2
      type: ci_gate
      cmd: "gh run view <run-id> -R olicesx/kixparadigm --json conclusion,jobs"
      expect: >-
        conclusion == success；jobs 覆盖 6 个 matrix 组合
        （ubuntu-latest / windows-latest / macos-latest × node 20.16.0 / 22.x）；
        且 macOS job 的执行输出含 npm test 的真实运行记录与 "# skipped 0"
        （证明 macOS runner 真的跑了，而非仅一个绿勾）。
      required: true
      covers: [T3, T4]
    - id: CG3
      type: ci_gate
      cmd: "gh run list -R olicesx/kixparadigm --workflow=ci.yml --limit 1 --json headSha,status,conclusion"
      expect: "headSha == Sprint 最终 HEAD 且 conclusion == success（CG1 的无 PR 降级通道）"
      required: false
      covers: [T1, T2, T3]
  manual_gate:
    - id: MG1
      type: manual_gate
      cmd: "grep -n \"t.skip\" scripts/sync-dsh-preset.test.js"
      expect: >-
        恰 5 处 skip，且两类语义可区分（平台型 windows-only / 能力型 pwsh unavailable）；
        qa-signoff-1.md 必须逐条列出这 5 条用例名与原因，并显式写明「本机 pass 20 ≠ 总数 25，
        skip 不计为通过」。
      required: true
      covers: [T4]
    - id: MG2
      type: manual_gate
      cmd: "git diff -- CHANGELOG.md"
      expect: >-
        diff 仅为追加（无历史条目数字被覆写）；每个门禁数字可看出测量平台；
        已实测反证的声称有勘误或限定语。
      required: true
      covers: [T5]
    - id: MG3
      type: manual_gate
      cmd: "grep -n \"T2-evidence\" docs/sprint-1/progress.md"
      expect: >-
        存在 T2-evidence 行（added/updated/same/pruned 四元组）与失配文件的
        (相对路径, size, mtimeMs) 对照；修复层与根因一致。
        仅「测试转绿」不满足本 gate —— 违反则 QA 拒签。
      required: true
      covers: [T2]
    - id: MG4
      type: manual_gate
      cmd: "md5 -q scripts/install-lib.js en/scripts/install-lib.js"
      expect: "两行 hash 完全相同（字节镜像已同步）"
      required: true
      covers: [T2]

drift_whitelist:
  - pattern: "docs/**"
  - pattern: ".kixpower/**"
  - pattern: "**/*.md"
  - pattern: ".github/**"
  - pattern: "kix-discipline/**"
  - pattern: "**/*.test.js"
```

**L2 必需 gate 集合**（供 orchestrator 计算 `l2_gate_manifest_sha256`）：
`required: true` 的 local_gate = `[LG1, LG2, LG3, LG4, LG5, LG6]`（按 id 排序后规范化 `{id,type,cmd,expect,required}`）。
ci_gate / manual_gate 不计入 manifest digest，但计入 QA 签署证据。

---

## 8. 交付物与责任人

| 产物 | 责任 | 说明 |
|---|---|---|
| 源码修复（T1–T5 的 4 个文件）| Dev | `scripts/sync-dsh-preset.test.js`、`scripts/install-lib.js`(+`en/` 镜像)、`.github/workflows/ci.yml`、`CHANGELOG.md` |
| `docs/sprint-1/progress.md` 执行状态 / Trace Log | orchestrator（+ Dev 串行模式写任务行）| frontmatter 数值为结构化真相源 |
| `docs/qa/qa-signoff-1.md` | QA（Ivy）| 必含 MG1–MG4 结论与 skip 明细 |
| L2 证据（`l2_verification_passed` / `l2_verified_sha` / manifest digest）| orchestrator | 只有 orchestrator 可写 |
| `docs/sprint-1/done.md`、`PROJECT_BRIEF.md` §7/§8 | Producer | Sprint 收尾 |

---

## 9. 开放问题（未取证事项，不得当作已定结论）

| ID | 问题 | 影响 | 取证方式 |
|---|---|---|---|
| OQ1 | **T2 根因未确证**：观测为「第二次调用 `added+updated = 3`」，但 `Math.round(mtimeMs/1000)` 容差模型（两值截断误差 < 1ms 时数学上不可能跨 0.5s 边界）预测 0，秒级精度模型预测 ~50（`skills` 中 mtime 小数 ≥ 0.5 的文件数）。**两个模型都不预测 3** | 决定修哪一层；改错层会静默掩盖安装非幂等 | T2 步骤 A 的 `{added,updated,same,pruned}` 四元组分解 |
| OQ2 | `en/` 包基线未实测（orchestrator 只跑了主包 `npm test`）| 若 en 也红，属本 Sprint 范围内的新发现（en 有 `install-lib.js` 镜像但无 `ensureDefaultShelf` 测试）| 执行 LG6 |
| OQ3 | fork 无 workflow 注册：CI 是否仅在「fork → 上游 PR」路径触发？上游是否接受本 Sprint 的 PR | CG1/CG2 能否执行 | 用户决定 PR 路径后由 `gh pr checks` 验证 |
| OQ4 | 上游 `main` 已存在 `v1.3.17` 的 CI 失败 run（2026-09-13），本地 HEAD 停在 `v1.3.16` 的 `c3c31eb` | Sprint 的对照口径 | 合并前 rebase 并复跑全量 gate；若用户要求以上游最新为 baseline 需重估 |
| OQ5 | `macos-latest` 当前指向的镜像版本未取证（已取证的证据来自 `macos-15-Readme.md:152`）；若指向别的版本，「预装 pwsh」结论需重新取证 | 影响 T3 的预期（是否会复现 T1 的 3 条红）| 读取 `actions/runner-images` 的镜像标签映射 |
| OQ6 | 本机无 pwsh → `verification-fidelity-check.ps1` 不可运行，drift-check 为手工 baseline 报告（`legacy/degraded`）| 无法量化上一 Sprint 门禁覆盖率 | Sprint 2 起评估 Node 等价实现 |
| OQ7 | `docs/.kixpower-current-sprint`（内容 `1`，untracked）与「工作树干净」的前提不符 | planning snapshot 的干净性判据 | 确认该 marker 是否应入库或加入 `.gitignore` |

---

## 10. Sprint+1 候选（本 Sprint 不做）

| ID | 候选 | 触发条件 |
|---|---|---|
| N1 | 用 Node 重写 pwsh 依赖测试（Milo 方案）| 若本机 `sync-dsh-preset.ps1` 零覆盖在 Sprint 2 产生实际漏检 |
| N2 | `verification-fidelity-check.ps1` 的 Node 等价实现 | OQ6 未解决且 Sprint 2 需要量化门禁覆盖率 |
| N3 | Windows PowerShell 5.1 路径覆盖（`sync-dsh-preset.ps1` 声称 5.1/7 通用）| macOS 已入 CI 后，评估 5.1 分支是否只有 windows runner 覆盖 |
| N4 | kixpower hooks 在 DSH 下的机械承载缺口（`block-source-edit` 等 hook 不自动触发，仅靠 prompt 约束）| 出现越权编辑事故时 |
| N5 | baseline 对齐例行检查（本地 HEAD vs 上游 `main`）| OQ4 反复出现 |
