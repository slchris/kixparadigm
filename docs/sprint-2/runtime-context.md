# Runtime Context Snapshot — Sprint 2（本项目特化：工具链能力快照）

> 生成时间：2026-09-22｜生成者：kixpower-producer (Remy)｜Sprint 2 规划期收集
> 模板：`skills/kixpower/templates/runtime-context-snapshot.md`
>
> **特化说明（沿用 Sprint 1）**：本项目交付物是**配置与规则资产**，不是应用/服务 —— 没有 `.env`、没有数据库、
> 没有 HTTP 服务、没有运行中进程。模板 §1（环境变量）/ §2（DB schema）/ §3（上游 API response）/ §4（health endpoint）
> 四节**不适用**，替换为等价的「工具链能力快照」。
> **Sprint 2 的不变量（本文件的第一结论）**：`pwsh` **仍然缺失**，且**这是本 Sprint 要消除的依赖**，不是要绕过的障碍。
> **硬约束照旧**：不输出任何密钥值。

---

## 1. 本 Sprint 的决定性事实：宿主能力面

| 能力 | 结论 | 证据（本机实测） | 对本 Sprint 的含义 |
|---|---|---|---|
| **`pwsh`** | ❌ **NOT FOUND** | `command -v pwsh` 空 | 三个 trust-chain 脚本 + `sync-dsh-preset.ps1` **全部不可执行**；这是 P0/P2 的存在理由 |
| `brew` | ✅ `Homebrew 7.0.1-21-gef55185` | `brew --version` | §1.1 的 oracle 通道前提 |
| `node` | ✅ `v22.14.0` | 已实测 | 三个 `.cjs` 的运行宿主；`engines.node >= 20.16.0` 满足 |
| `npm` | ✅ 可用 | 已实测 | `npm test` / `npm run test:*` 可跑 |
| `python3` | ✅ 可用（仅只读 stat 用） | Sprint 1 记录 | 本 Sprint 未使用 |
| `gh` | ✅ 已认证（`slchris`），但上游 Issues 禁用、本地 origin 是 fork 且无 workflow 注册 | Sprint 1 §3 记录（沿用） | CG1/CG2/CG3 仍不可达（R4） |

### 1.1 pwsh oracle 通道（**verification-only**，非运行依赖）

```text
brew info powershell        → powershell: stable 7.6.6 (bottled)；Required (1): dotnet；Not installed
brew info --cask powershell → Error: Cask 'powershell' is unavailable: No Cask with this name exists.
brew search powershell      → powershell / powershell@preview
```

> **必须走 formula，不是 cask**（cask 名不存在 —— 这是本项目文档/脚本里最容易写错的一步）。
> 取舍与硬边界见 `plan.md` §7.4；结论 = **采纳**，且边界可由 `plan.md` §7-MG1 机械检查
> （产品 `.cjs` 零 `pwsh` 引用 + parity 测试零 npm 链挂载）。
> 若用户否决或安装失败 → `plan.md` §7.3 的降级路径生效（LG10 = `unavailable`，**不计入通过**），**不构成 Sprint 失败**。

### 1.2 `pwsh` 的双重语义（**本 Sprint 最容易误判的一点**）

| 语义 | 例子 | 是否本 Sprint 的清除对象 | 依据 |
|---|---|---|---|
| **PowerShell 二进制依赖** | `hooks:` 块里的 `pwsh -NoProfile -File "...ps1"` | ✅ **是**（P1 清 DSH 面；P0/P2 提供 Node 替代） | `dsh/preset-classic/agents/*.agent.md` 的 10 个死块；4 处调用点 |
| **DSH 宿主工具名** | `DSH-ADAPTATION.md` 的 `run_in_terminal → pwsh` 映射、restrict 名单里的 `pwsh` | ❌ **不是**（且**不得**用裸 `grep -c pwsh` 当门禁） | `dsh/preset/plugins/kix-guards.js:1117`：`TERMINAL_TOOLS = new Set(['pwsh','bash'])` |

---

## 2. preset 结构面（替代「DB schema」）

| 变体 | id | 事实源 | 随 npm 安装 | 本轮新增注记 |
|---|---|---|---|---|
| 默认档（激励面） | `kixparadigm` | `dsh/preset/` | ✅ | `skills`/`agents` 是 **git symlink** → `../preset-classic/{skills,agents}`（`ls -la` 实读；`readlink dsh/preset/skills` = `../preset-classic/skills`） |
| 经典档 | `kixparadigm-classic` | `dsh/preset-classic/` | ✅ | 6 份角色定义、18 个技能货架；**10 个死 hooks 块中有 5 个在此**（P1 目标） |
| 消融档 | `kixparadigm-null` | `dsh/preset-null/` | ❌ | 不随 npm 安装、不在一致性契约内（D6） |
| 英文经典档 | `kixparadigm-classic-en` | `en/preset-classic-en/` | ✅（独立包） | **另 5 个死 hooks 块在此**（P1 目标） |
| vision bridge | `dsh-vision-bridge` | `dsh/vision-bridge/` | ✅ | 与 `en/bridge/` 镜像（`checkMirrorTree`） |
| **VS Code Copilot 分发版** | —（非 preset） | root `agents/`、`skills/`、`instructions/`、`prompts/` | ✅（`package.json#files` 含 `agents/`、`skills/`） | `install.ps1:76` 装到 `$COPILOT_HOME\agents\`；**无 DSH 适配注记（0/6）**；P1 **不动它** |

---

## 3. 副本与守护面（**Sprint 2 的机械风险面**）

| 副本集 | 成员 | 守护 | 状态 |
|---|---|---|---|
| 语言中立插件（4 根） | `dsh/preset{,-classic,-null}/plugins/<n>.js` + `en/preset-classic-en/plugins/<n>.js` | `checkPluginPair` / `PLUGIN_IDENTITY_GROUPS` | ✅ 有效 |
| 分簇插件 | `kix-budget`（两簇）；`kix-probe`/`kix-settle`/`kix-mem`（仅 incentive 面） | 同上 | ✅ 有效 |
| 安装器 | `scripts/install-lib.js` ↔ `en/scripts/install-lib.js` | `checkIdenticalSet`（`consistency-lib.cjs:691`） | ✅ 有效 |
| vision bridge | `dsh/vision-bridge/` ↔ `en/bridge/` | `checkMirrorTree` | ✅ 有效 |
| 默认档货架指针 | `dsh/preset/{skills,agents}` symlink → `dsh/preset-classic/` | `checkDefaultShelfPointers`（`:649`） | ✅ 有效 |
| **`skills/kixpower/scripts/*.ps1`（3 副本）** | `skills/kixpower/scripts/`、`dsh/preset-classic/skills/kixpower/scripts/`、`en/preset-classic-en/skills/kixpower/scripts/` | **无** | ⚠️ **已实际漂移**：源 517 行 vs 两副本 507 行，`CONSISTENCY OK` 仍为绿（T4 必须为新 `.cjs` 登记镜像） |
| **`dsh/preset-classic/skills/**` 的语法解析** | — | `checkSyntax` 的 `walk()` **不跟随 symlink**（`entry.isDirectory()`） | ⚠️ **盲区**：`checkSyntax({rel:'dsh/preset'})` 走不到 classic 根；T4 需补 `checkSyntax({rel:'dsh/preset-classic'})` |

**检查面清单（实读 `consistency-lib.cjs:681-699`）**：persona 预算 ×3、`checkPluginPair` ×N、`checkVersionPair`、
`checkMirrorTree(vision-bridge)`、`checkIdenticalSet(install-lib.js)`、`checkDefaultShelfPointers`、
`checkMarkdownLinks(dsh/preset, en/preset-classic-en)`、`checkSyntax(dsh/preset, en/preset-classic-en, dsh/vision-bridge, en/bridge, scripts)`。
→ **`skills/**` 不在任何检查面内**。

---

## 4. canonical 命令与链式语义（逐字来自 `package.json#scripts`）

| 包 | 命令 |
|---|---|
| 主包 | `test` / `test:installer` / `test:consistency` / `test:vision` / `test:pressures` / `audit:pressures` / `verify:guards` / `verify:vision` / `postinstall` |
| `en/` | `test` / `test:installer` / `test:consistency` / `test:vision` / `postinstall` |

```text
zh 链（5 段）：test:installer && node scripts/check-dsh-consistency.cjs && test:pressures
               && node --test dsh/vision-bridge/test.js && (cd dsh/preset/plugins && node --test)
en 链（4 段）：test:installer && node scripts/check-consistency.cjs
               && node --test bridge/test.js && (cd preset-classic-en/plugins && node --test)
```

**基线终态（@ Sprint 1 终态 `a3cdfb1` + 补正 `ef6a485`，取自 `docs/sprint-1/done.md` §2；本 Sprint 规划期未重跑）**：

| 命令 | 终态 | 备注 |
|---|---|---|
| `npm test` | **exit 0** | 链尾 60 → 59 pass / 0 fail / 1 skip |
| `cd en && npm test` | **exit 0** | 链尾 36 → 35 pass / 0 fail / 1 skip |
| `npm run test:installer` | exit 0 | **25 → 20 pass / 0 fail / 5 skip**（本机无 pwsh）← **P2 要把这个 5 变 0** |
| `cd dsh/preset/plugins && node --test` | exit 0 | 60 → 59/0/1（1 skip = `KIX_BROWSER_SMOKE=1` 真浏览器 smoke，**非**能力型） |

> **链式语义（关键，HB-2/HB-3 的实证来源）**：任一段红 ⇒ 后续段**不执行**。Sprint 1 的链首红曾遮蔽链尾 4 段
> （`lessons-learned.md` LL-3）。故 Sprint 2 的 `plan.md` §7 把**每一段**列为独立 required gate（HB-3 scoped trial）。
> **基线已全绿 ⇒ HB-2 的 trigger 本 Sprint 不匹配**（`not triggered` ≠ pass）。

---

## 5. git 状态

```text
branch: feature/sprint-2-node-first-host-parity
HEAD:   ef6a48550a40bf433555790419fd4c2fd0cf1483   （Sprint 1 终态 + 收尾补正）
origin: https://github.com/slchris/kixparadigm       （fork of olicesx/kixparadigm；无 workflow 注册）
status: 1 untracked → docs/.kixpower-current-sprint（内容 "2"）
Sprint 1 提交数: git rev-list --count c3c31eb..HEAD = 9   （done.md §6 记 8；多出 ef6a485 —— 见 plan.md OQ0）
recent: ef6a485 docs(sprint-1): 更正 Trace note 的 sha 与冒烟口径（收尾补正，前次受 commit 硬上限阻塞）
        48e62df docs(sprint-1): 收尾 — done.md + L4 实践学习 + QA CONDITIONAL 签署 + Brief §7/§8
        a3cdfb1 docs(sprint-1): T7 CHANGELOG 追加 T6 段 + T6/T7 增量重规划留痕
```

> **与给定的差异（须记录）**：任务上下文称「Sprint 1 的 8 个 commit 已在此祖先链上」，
> 实测 `c3c31eb..HEAD` = **9**（第 9 个是 `ef6a485`，其 message 自述前次受 commit 硬上限阻塞）。
> 该差异**不推翻 Sprint 1 的任何结论**（Sprint 1 的证据 revision 是 `a3cdfb1`），只影响跨 Sprint 统计 →
> 已登记为 `plan.md` OQ0，处理方式 = **追加说明**，不改写 `done.md` / `hill-climbing.md` 任何字段。
> `docs/.kixpower-current-sprint` 仍 untracked（Sprint 1 OQ7 未解）→ 本 Sprint 不处理（避免混入无关 diff）。

---

## 6. 环境级硬约束（Sprint 2 特有，**决定提交粒度**）

| 约束 | 值 | 证据 | 后果 |
|---|---|---|---|
| `kix-guards` blast radius 窗口 | **1 小时窗口内 10 个 commit 硬上限（含 amend）** | `docs/sprint-1/done.md` §6；commit `ef6a485` 的 message | `derived_commit_budget: 6` 是**可用额度**；`plan.md` §6 要求**每 DAG 层合并为 1 个 commit**（默认要求，非可选优化） |
| `blast_radius.commit_budget` | 6 | `progress.md` frontmatter（hook 强制读取） | 超限时 hook 直接拒绝 commit |
| 分支 | `feature/sprint-2-node-first-host-parity`（非 main） | `kix-guards` 硬 deny main 分支 commit | 保持现状 |
| 任务上下文约束 | 不碰源码 / `CHANGELOG.md` / `.kixpower/**`（Producer 面） | 用户指示 | Producer 只写 `docs/sprint-2/**` + `PROJECT_BRIEF.md` |

---

## 7. 文档与事实漂移登记（**沿用 Sprint 1 的 D-1…D-7 并标注状态**）

| # | Sprint 1 声称 / 实测 | Sprint 2 状态 | 本轮新增 |
|---|---|---|---|
| D-1 | `CHANGELOG.md:55`（v1.3.13）「复制保留 mtime 使重复安装幂等」被 macOS 实测反证 | **已处置（Sprint 1 T5）**：追加平台限定 + 勘误；历史数字未改。**Sprint 2 不重开** | — |
| D-2 | `CHANGELOG.md:58`（v1.3.13）「`install-lib` 20/20」vs 本机 19/1 | **已处置（T5）**；根因已由 T2 修复（受控 A/B 19/1 → 20/0），但断言的 hermetic 性缺陷（F-1）**仍开放** | F-1 归入 `plan.md` §10-N3（本 Sprint 不做） |
| D-3 | `CHANGELOG.md:40`（v1.3.15）「`npm test` 59 pass / 0 fail / 1 skip」未标注测量平台 | **已处置（T5/T7）**：Sprint 1 条目写清双平台口径 | — |
| D-4 | `CHANGELOG.md` 未声明「CI 不含 macOS」 | **已处置（T3 加 `macos-latest` + T5 声明）** | CI 侧 success 仍未取证（R4） |
| D-5 | README 徽章指上游；本地 origin 是 fork（无 workflow） | **未变**（事实层） | 仍为 CG1/CG2/CG3 不可达的原因 |
| D-6 | `docs/.kixpower-current-sprint` 未入库 | **仍未解**（内容 `2`） | `plan.md` OQ3；本 Sprint 不处理 |
| D-7 | 任务上下文「工作树干净」vs 实测 1 个 untracked | **仍未解**（同上文件） | 同上 |
| **D-8** | **新增**：`skills/kixpower/scripts/*.ps1` 的 3 副本**无守护且已漂移**（517 vs 507） | **未修**（不在 Sprint 2 范围）→ 但 T4 必须为新 `.cjs` 登记守护，否则复现 | `plan.md` OQ4 / MG6；Sprint+1 候选 N1 |
| **D-9** | **新增**：`walk()` 不跟随 symlink ⇒ `checkSyntax` 覆盖不到 `dsh/preset-classic/skills/**` | **本 Sprint 修**（T4 步骤 B，机械改动） | `plan.md` §4-T4；判据 = LG2 的 `dsh/preset-classic: N JS/CJS/MJS syntax OK` |
| **D-10** | **新增**：Sprint 1 的 commit 计数 8 vs 实测 9 | **追加说明**（不改 Sprint 1 结论） | `plan.md` OQ0 |
| **D-11** | **新增**：4 处文档**逐字要求**执行 `.ps1`（`prompts/kixpower-new.prompt.md:80`、`agents/kixpower-producer.agent.md:30-32`、`USAGE_MANUAL.md:365`），在无 pwsh 宿主上**结构性不可执行** | **本 Sprint 修**（T2/T3 的调用点改写） | 这是 P0 的「硬缺口」证据：不是「脚本可选」，是**指令级要求** |

> **未列入漂移的已核对项**：`README.md:72` 的唯一事实源约定与 `install.ps1` / `install-lib.js` 的实际分发面一致；
> `package.json#files` 覆盖 `agents/`（Copilot 面）但**不含** `dsh/preset-classic/skills/**` 的独立镜像语义（它随 `dsh/` 整体分发）。

---

## 8. 与 plan.md 的接口

- §1.2 的 `pwsh` 双重语义 → `plan.md` §2 non-goal「不清宿主工具名」+ §7-MG2 的结构化谓词
- §3 的两条守护缺口（D-8/D-9）→ `plan.md` T4 步骤 B（镜像登记 + symlink 盲区修复）
- §4 的 `test:installer 20/0/5` → `plan.md` LG1 的 `25/0/0` 期望（P2 判据）
- §5 的 9 commits / untracked marker → `plan.md` OQ0 / OQ3（追加说明，不改 Sprint 1）
- §6 的 1 小时 / 10-commit 窗口 → `plan.md` §6 `realized_check` 的提交粒度要求
- §7 的 D-11（4 处逐字硬要求）→ `plan.md` §1.1 的三笔代价① 与 T2/T3 的调用点改写
- **后续 Dev 发现新的 runtime 漂移 → 追加到本文档 §7 + `.kixpower/memory/repo/lessons-learned.md`**（本 Sprint 只生成一次，不重复生成）
