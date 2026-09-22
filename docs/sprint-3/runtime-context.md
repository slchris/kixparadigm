# Runtime Context Snapshot — Sprint 3（本项目特化：工具链能力快照 + CI 面）

> 生成时间：2026-09-22｜生成者：kixpower-producer (Remy)｜Sprint 3 规划期收集
> 模板：`skills/kixpower/templates/runtime-context-snapshot.md`
>
> **特化说明（沿用 Sprint 1/2）**：本项目交付物是**配置与规则资产**，不是应用/服务 —— 没有 `.env`、没有数据库、
> 没有 HTTP 服务、没有运行中进程。模板 §1（环境变量）/ §2（DB schema）/ §3（上游 API response）/ §4（health endpoint）
> 四节**不适用**，替换为等价的「工具链能力快照 + CI 面」。
> **Sprint 3 的不变量（本文件的第一结论）**：本机**仍然没有 `pwsh`**（⇒ 一切 `.ps1` 不可执行）；但 **CI 面已从「不可达」变为「可达且已产出结论」**。
> **硬约束照旧**：不输出任何密钥值。

---

## 1. 宿主能力面（本机，macOS）

| 能力 | 结论 | 证据 | 对 Sprint 3 的含义 |
|---|---|---|---|
| **`pwsh`** | ❌ **NOT FOUND** | Sprint 1/2 实测沿用（`command -v pwsh` 空） | `install.ps1` **不可执行验证**（T2 的完成定义封顶在「静态 + CI 通道」）；LG5（parity）本机**恒 `unavailable`** ⇒ `required: false` |
| `node` | ✅ `v22.14.0` | 本层实测 | 三个 `.cjs` 与全部 `node --test` 门禁的运行宿主（`engines.node >= 20.16.0`） |
| `npm` | ✅ 可用 | 本层实测（`npm test` 链） | LG1/LG2/LG3 的载体 |
| `bash` | ✅ 可用 | 本层实测（`install.sh` 由测试 spawn） | T1/T5 的 sh 分支载体 |
| `python3` | ✅ 可用 | Sprint 1/2 记录 | 本层仅用于 **YAML 严格性校验**（frontmatter） |
| `gh` | ✅ 已认证，**含 `workflow` scope** | `gh auth status`：`Token scopes: 'gist', 'read:org', 'repo', 'workflow'` | **Sprint 3 的关键跃迁**：workflow 注册/触发/读取 run 均可行（Sprint 2 时期为 0 注册、0 run） |

---

## 2. CI 面（Sprint 3 的新增一等事实）

### 2.1 仓库与 workflow 注册

| 项 | 实测值 | 证据 |
|---|---|---|
| fork | `slchris/kixparadigm`，`isFork=true`，默认分支 `main` | `gh repo view slchris/kixparadigm --json isFork,defaultBranchRef` |
| 上游 Issues | `hasIssuesEnabled=false` | 同上（⇒ 不能用 Issue 跟踪，登记一律落 repo 文件） |
| workflow 注册 | `ci` → **`active`**（id `364227514`） | `gh workflow list -R slchris/kixparadigm` |
| 注册方式 | **push 后自动注册**，无需手动启用 | orchestrator 实测：push `5c4d9ab` 后注册数 0 → 1；run `35729103867` 入队 |
| PR | **#1** `state: OPEN`、`mergeable: MERGEABLE`、head `feature/sprint-2-node-first-host-parity` @ `5c4d9ab` | `gh pr view 1 -R slchris/kixparadigm --json state,mergeable,headRefOid` |

> `gh repo view --json parent` 返回 `null`（该字段未暴露 fork 关系）；上游为 `olicesx/kixparadigm`（由 `.git` remote 与 PR #1 的 base 侧确认）。

### 2.2 run / 矩阵

| 项 | 实测值 |
|---|---|
| run | `35729103867`（event=`push`）、`35729139524`（event=`pull_request`）——两者 `headSha` 均为 `5c4d9aba59a584c64199510245dbc1724f310fb0` |
| 矩阵 | `os: [ubuntu-latest, windows-latest, macos-latest]` × `node: ['20.16.0','22.x']`；steps = zh `npm test` + en `npm test`；另有 `pack` job（ubuntu, `npm pack --dry-run` ×2）；`test` job 内第 6 步 = `Parity vs pwsh reference (E1, three-state)` |
| runner 预装 pwsh | ✅ **实测到版本号**：macOS oracle `7.6.5`、ubuntu oracle `7.6.6`（parity 状态行逐字）；**Windows 侧未取证**（parity step 从未执行） |
| 结论摘要（@ `5c4d9ab`） | `pack` ✅；macOS ×2 ✅；ubuntu(node 22.x) ✅；**windows ×2 ❌ `failure`**；ubuntu(node 20.16.0) 收尾时 `in_progress` |

### 2.3 本地工作树状态（规划期）

| 项 | 值 |
|---|---|
| 分支 / HEAD | `feature/sprint-2-node-first-host-parity` @ `5c4d9aba59a584c64199510245dbc1724f310fb0` |
| `docs/.kixpower-current-sprint` | `3`（本地状态文件，**不入库**；`.gitignore` 外，`git status` 显示为 untracked） |
| 本层工作树改动 | 新增 `docs/sprint-3/{plan,progress,runtime-context,drift-check}.md` + `PROJECT_BRIEF.md` Sprint 指针（**未 commit**） |
| Sprint 2 终态 | `docs/sprint-2/done.md` + `docs/qa/qa-signoff-2.md`（`CONDITIONAL`，唯一理由 = CI pending）；证据 revision `42d3c7e` |

---

## 3. 环境硬约束（沿用，未变）

| 约束 | 值 | 来源 |
|---|---|---|
| commit 硬上限 | **10 / 1 小时窗口（含 amend）** | `kix-guards` blast radius（Sprint 1 已实测拦截一次） |
| 本 Sprint `derived_commit_budget` | **6** | `plan.md` §5（公式值 8 并列输出） |
| 每层 1 commit | 硬要求（层内节点合并） | `plan.md` §5 `merge_policy` |
| 分支要求 | 必须在 feature branch；禁 force push | `progress.md` `blast_radius` |

---

## 4. 能力缺失面（**不得绕过，只能如实登记**）

| 缺失 | 影响的 gate | 处置（写入 `plan.md` / `progress.md`） |
|---|---|---|
| 本机无 `pwsh` | **LG5**（parity 三态）、T2 的行为验证 | LG5 `required: false` + `host_requires: [pwsh]`；本机恒 `unavailable`（**不得**记 pass/skip/已覆盖）；T2 行为验证唯一通道 = **CG5**（windows runner） |
| 本机无 Windows | T4 的 Windows 大小写语义、CG2 的 Windows 结论 | T4 的回归测试必须**可在无 pwsh 的 macOS 本地执行**（合成路径 + 可注入纯函数，`plan.md` §3.5）；Windows 结论只能由 CI 给出 |
| Windows 侧 parity 从未执行 | CG4 的平台盲区 | 登记为 `plan.md` §8-R2 / `OQ14`；CG2 转绿后首次运行按三态定档 |

---

## 5. 规划期取证命令留痕（只读）

```text
gh auth status                                                   # scopes 含 workflow
gh repo view slchris/kixparadigm --json isFork,hasIssuesEnabled,defaultBranchRef
gh workflow list -R slchris/kixparadigm                          # ci  active  364227514
gh pr view 1 -R slchris/kixparadigm --json state,mergeable,headRefOid,statusCheckRollup
gh run view 35729103867 -R slchris/kixparadigm --json status,conclusion,jobs
gh run view 35729139524 -R slchris/kixparadigm --json status,conclusion,event,headSha
gh api repos/slchris/kixparadigm/actions/jobs/<job-id>/logs --allow-escape-sequences   # 逐 step 逐字证据
node skills/kixpower/scripts/verification-fidelity-check.cjs --project-root . --prev-sprint 2
```

> 全部为**只读**调用；未 push、未 commit、未修改任何 Sprint 1/2 文档。
