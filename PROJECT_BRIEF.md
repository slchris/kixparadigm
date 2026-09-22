---
content_language: zh
content_language_source: inferred
model_context_window: 1000000
model_context_window_source: default
max_parallelism: 2
max_parallelism_source: inferred
updated: 2026-09-22
---

# PROJECT_BRIEF — kixparadigm

> 本文档是团队共享真相源，14 章固定结构。第 7/8/9 章是固定锚点（已完成 / 下一步 / 风险登记），
> 每次阶段过渡由 Producer 更新。易变数字不双源维护：版本史看 `CHANGELOG.md`，机制映射看
> `dsh/preset-classic/DSH-ADAPTATION.md`。
>
> **本 Sprint 起点**：Sprint 1（模式 0：已有代码项目导入），baseline = `c3c31eb3268622358761cb2035ec84810a12ca11`。

---

## 1. 项目身份与目标

**一句话目标**：kix 范式的**可复现分发资产** —— 把 preset、多智能体编曲（kixpower）与机械门禁打包成
`npm` 一键导入的包，并在 `zh` / `en` 多副本之间保持一致。

| 项 | 值 |
|---|---|
| 仓库 | `kixparadigm`（npm 包名 `kixparadigm` / `kixparadigm-en`） |
| 当前版本 | 1.3.16（`package.json`） |
| 起源 | 原为 VS Code Copilot 定制包，后适配 DeepSeek Harness（DSH）成为可公开安装的 preset |
| 分发形态 | ① 主包（`dsh/preset` 默认激励面 + `dsh/preset-classic` 经典档 + `dsh/preset-null` 消融档 + vision-bridge）② 英文包 `en/`（`preset-classic-en`）|
| 非目标 | 不是应用/服务项目：没有运行时服务、没有数据库、没有环境变量面；交付物是**配置与规则资产** |
| 成功判据 | 目标机器上一条 `npm i -g kixparadigm` 后，DSH 会话可按预期挂载 preset 并运行门禁（可复现 = 安装幂等 + 多副本一致 + 门禁可机械验证）|

**为什么「安装幂等」是产品级目标而非工程洁癖**：分发资产的价值 = 任意机器重复导入得到同一结果。
安装器在 macOS 上不幂等（Sprint 1 的 T2）直接削弱「可复现」这一唯一卖点。

---

## 2. 技术栈与架构总览

| 层 | 技术 | 说明 |
|---|---|---|
| 运行时宿主 | DeepSeek Harness（DSH）0.1.2 / 0.1.5-rc.1 | preset 通过 `agent.cordis.yml` 挂载；插件走 `tools/pre-execute` 等宿主扩展点 |
| 安装器 | Node.js ≥ 20.16.0（`engines`），零第三方依赖 | `scripts/install-lib.js`（`postinstall` + `bin/kixparadigm.js`）|
| 插件层 | 纯 JS（Cordis 插件，`.js` + 同目录 `*.test.js`） | `dsh/preset/plugins/`，34 个文件（32 个 `*.js`，含 16 个 `*.test.js`）|
| 门禁层 | `kix-guards.js` / `kix-discipline.js` / `kix-settle.js` / `kix-consistency.js` | 机械门禁（`tools/pre-execute` 硬拦 + 写后 advisory）|
| 编排层 | kixpower v5.7（Markdown 角色定义 + 约定文档） | `agents/*.agent.md`、`skills/kixpower/**`、`prompts/*.prompt.md` |
| 一致性守护 | `scripts/check-dsh-consistency.cjs` + `dsh/preset/plugins/consistency-lib.cjs` | 单一事实源：CI 与运行时插件共用同一检查库 |
| 测试 | `node --test`（Node 内置 test runner），无测试框架依赖 | 单元/集成测试全部在仓库内 |
| CI | GitHub Actions（`.github/workflows/ci.yml`） | `ubuntu-latest` + `windows-latest` + `macos-latest`（Sprint 1 T3 追加）× node `20.16.0`/`22.x` = **6 组合** + `npm pack --dry-run`；**CI 侧 success 未取证**（CG2 pending，见第 7 章 / R4）|

**架构主轴（三层资产 + 一道守护）**：

```
仓库事实源                     安装副本                       消费者
dsh/preset/           ──sync──▶ ~/.dsh/.agent-presets/kixparadigm/    DSH 会话
dsh/preset-classic/   ──npm───▶ （同一次 npm i -g 一并安装）
dsh/preset-null/      （消融档，不随 npm 安装）
en/preset-classic-en/ ──npm───▶ kixparadigm-classic-en
        ▲
        └── scripts/check-dsh-consistency.cjs 守护「多副本字节一致 / 预算 / 链接 / 版本」
```

---

## 3. 目录结构与关键模块

| 路径 | 角色 | 关键文件 |
|---|---|---|
| `dsh/preset/` | **默认档事实源**（激励面） | `agent.cordis.yml`、`plugins/`、`prompts/`、`patches/`、`memories/`；`skills`/`agents` 是指向 classic 的 git symlink 指针 |
| `dsh/preset-classic/` | 经典档事实源（全文编曲） | `agent.cordis.yml`、`agents/`（6 份角色定义）、`skills/`（18 个技能货架，63 文件）、`instructions/` |
| `dsh/preset-null/` | 消融对照档（不随 npm 安装） | `agent.cordis.yml`、`plugins/` |
| `dsh/vision-bridge/` | 识图补足桥 | `test.js`、`client.js` |
| `en/` | 英文独立包 | `preset-classic-en/`、`scripts/install-lib.js`（与 zh 字节镜像）、`bridge/` |
| `scripts/install-lib.js` | **安装器核心**（609 行） | `copyTree` / `copyFileKeepingMtime` / `ensureDefaultShelf` / `installPreset` / `uninstall` / `doctor` |
| `scripts/sync-dsh-preset.ps1` | 仓库 → `DSH_HOME` 单向同步（维护路径，非安装路径） | 197 行，纯 ASCII，PowerShell 5.1/7 通用 |
| `scripts/check-dsh-consistency.cjs` | 一致性守护 CLI（29 行，只做组装） | 检查逻辑在 `dsh/preset/plugins/consistency-lib.cjs`（754 行）|
| `agents/`、`prompts/`、`skills/`、`instructions/` | VS Code Copilot 分发版（**与 DSH 版刻意不同**） | 不参与 DSH 一致性契约 |
| `memories/` | kix-mem 经验库（preset 资产，随包分发） | **只读**，勿与 `.kixpower/memory/repo/` 双写 |
| `.kixpower/memory/repo/` | kixpower 本项目的 memory canonical root | `lessons-learned.md`、`harness-backlog.md` |
| `docs/` | 过程文档（本 Sprint 起纳入 kixpower 结构化文档） | `docs/sprint-1/**`、`docs/brainstorm/**`、`docs/qa/**` |

---

## 4. canonical 命令（构建 / 测试 / 发布）

> **真相源**：`package.json` `scripts`。以下为**逐字实测存在**的命令；本表不新增任何命令。

| 命令 | 作用 | 备注 |
|---|---|---|
| `npm test` | 全量门禁链 | `&&` 链：`test:installer` → `check-dsh-consistency` → `test:pressures` → `vision-bridge/test.js` → `plugins/` 套件 |
| `npm run test:installer` | 安装器 + 同步脚本测试 | `node --test scripts/install-lib.test.js scripts/sync-dsh-preset.test.js` = **25 用例** |
| `npm run test:consistency` | 多副本一致性守护 | 失败输出 `CONSISTENCY FAIL (N)`，通过 `CONSISTENCY OK` |
| `npm run test:vision` | vision-bridge 单测 | `node --test dsh/vision-bridge/test.js` |
| `npm run test:pressures` | 选择压 registry `--check` + 会话审计单测 | 两个 cjs 审计脚本的测试 |
| `npm run verify:guards` | 比对**已安装副本**与仓库 canonical 的 guards 判定函数 | 依赖 `$DSH_HOME/.agent-presets/kixparadigm` 存在 → 环境相关 |
| `npm run verify:vision` | vision-bridge 解析验证 | 环境相关 |
| `npm run audit:pressures` | 选择压历史审计报告（只读，无 `--check`） | 信息性 |
| `cd en && npm test` / `test:installer` / `test:consistency` / `test:vision` | 英文包独立门禁 | `en/` 是独立 npm 包，有独立 `scripts` |

**发布**：无 `npm run publish` 脚本；发布 = 改版本号 + `CHANGELOG.md` 条目 + `npm pack --dry-run`（CI 的 `pack` job 用）→ 人工 `npm publish`。

---

## 5. 编码约定与内容语言

**内容语言**：`zh`（来源 `inferred` —— 仓库 `README.md` / `CHANGELOG.md` / commit 中文主导，`en/` 为英文分发包）。
按 TEAM_CONVENTIONS §内容语言约定：叙述区中文，**结构化区永远英文**（`status` / gate 名 / schema 字段名 / 枚举值）。
`en/` 包内文档与注释按英文（包自身语言），`en/` 与 zh 的**代码**镜像保持字节一致。

**代码约定（从既有代码反推）**：

- 零第三方依赖（安装器与守护脚本只用 `node:*`）；`engines.node >= 20.16.0`
- 插件文件必须**逐字节镜像**（语言中立插件 4 副本；`install-lib.js` zh/en 2 副本）——改一处必须改全部，守护会拦
- 测试用 Node 内置 `node --test` + `node:assert/strict`，文件名 `*.test.js` 与源码同目录
- 临时目录测试一律 `fs.mkdtempSync(path.join(os.tmpdir(), ...))` + `t.after()` 清理
- 平台相关用例必须**显式 skip 并说明原因**（`t.skip('...')`），不允许静默不跑；`process.platform` 判定与能力探针（ENOENT）是两种不同 skip 语义（见第 10 章）
- 提交前缀：`feat:` / `fix:` / `docs:` / `test:` / `chore:` / `release:`（前缀英文，正文中文）

---

## 6. 外部依赖与宿主契约（DSH 宿主版本、npm 双包、CI）

| 契约 | 内容 | 证据 |
|---|---|---|
| **DSH 宿主版本** | 双版本兼容：0.1.2-rc.1 与 0.1.5-rc.1（`dsh-persona` 配置名 `text` vs `prefix`+`suffix`，用 YAML 锚点同源给出） | `CHANGELOG.md` v1.3.16；`dsh/preset/agent.cordis.yml` |
| 宿主插件契约 | 插件按名缓存快照：**磁盘改完必须重启 dsh-web** 才加载 | `CHANGELOG.md` v1.3.6 / v1.3.16 |
| 宿主工具契约 | `restrict({deny:[...]})` 的 own-layer 名不在 `restrictableNames` → 抛错；四份 preset 全部 32 处 deny 名单已移除 `subagent` | `CHANGELOG.md` v1.3.16 |
| **npm 双包** | 主包 `kixparadigm`（zh）/ `kixparadigm-en`（en）版本号同步（守护 `checkVersionPair`） | `package.json`、`en/package.json` |
| npm `files` 白名单 | presets 资产的发行面（`bin/ scripts/ dsh/ skills/ agents/ instructions/ prompts/ memories/` 等） | `package.json#files` |
| **CI** | `.github/workflows/ci.yml`：`test` job = `[ubuntu-latest, windows-latest, macos-latest] × [20.16.0, 22.x]`（**6 组合**；`macos-latest` 由 Sprint 1 T3 追加，`fail-fast: false` 保留），每格跑 `npm test`（zh）+ `en/ npm test`；`pack` job = 两包 `npm pack --dry-run` | `.github/workflows/ci.yml:16-21`（HEAD `a3cdfb1` 实读）|
| **CI 可观测通道** | 本地 `origin` = fork `slchris/kixparadigm`（**无 workflow 注册、无 run 历史**）；权威 CI 在上游 `olicesx/kixparadigm` | `gh repo view`（fork）、`gh workflow list -R slchris/kixparadigm`（空）、`gh run list -R olicesx/kixparadigm`（有历史）|
| GitHub Issues | **上游仓库 Issues 已禁用**（`hasIssuesEnabled: false`）→ 缺陷登记只能走 `progress.md` / 文档，不能提 Issue | `gh repo view --json hasIssuesEnabled` |
| 宿主 runner 预装 | 上游 runner 镜像 README 列出 PowerShell 7.6.5（Ubuntu 24.04）/ 7.6.4（macOS 15） | `actions/runner-images` `images/ubuntu/Ubuntu2404-Readme.md:218`、`images/macos/macos-15-Readme.md:152` |

> **推论（Sprint 1 核心洞察）**：CI 的 Ubuntu / Windows runner **都预装 `pwsh`**，而本机（macOS）**没有** →
> 依赖 `pwsh` 的 3 条用例在 CI 会真跑、在本机会失败，**这条红在 Sprint 1 之前的 CI 上永远不可见**（当时矩阵无 macOS）。
> Sprint 1 T3 已把 `macos-latest` 加入矩阵（`ci.yml:20`），使该平台差异**具备可见通道**；但该通道是否产出绿
> **尚未取证**（CG2 pending）——通道存在 ≠ 可见性已建立。

---

## 7. 已完成（固定锚点）

- **Sprint 0（导入准备，非 kixpower Sprint）**：仓库已存在且自带完整发布史（v1.3.4 → v1.3.16）；
  基线 `npm run test:consistency` = **CONSISTENCY OK**（4 副本字节一致守护生效）。
- **文档反推（Sprint 1 规划期，Producer）**：`PROJECT_BRIEF.md`（本文，14 章）、`docs/brainstorm/sprint-1-brainstorm.md`、
  `docs/sprint-1/{plan,progress,runtime-context,drift-check}.md`、`.kixpower/memory/repo/{lessons-learned,harness-backlog}.md` 初始化。
- **基线取证（orchestrator + Producer 只读复核）**：
  - `npm test` = exit 1；红点全部在第一步 `test:installer`（25 用例 → 19 pass / 4 fail / 2 skip）
  - 上游 CI 在 baseline `c3c31eb` 的 `main` push（run 34699043255）**success** → 本机红为平台特异
  - `install-lib.js` zh/en md5 一致（`c53b11987c86858efec5c511b725f618`）

### Sprint 1 交付（2026-09-22，终态 = `a3cdfb18b55ee16027bf268e6de7472343a611d2`）

> 完整报告：`docs/sprint-1/done.md`。**`status: done` + `release_eligible: false`**（CI 未取证）。

- **7/7 任务完成、0 阻塞**；required local gate **8/8 exit 0** @ `a3cdfb1`
  （LG1–LG6 + LG10/LG11；`l2_gate_manifest_sha256 = 46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb`）。
- **交付**：T1/T4 pwsh 能力探针 + 5 条 skip 语义统一（本机 `20 pass / 0 fail / 5 skip`）；
  T2 安装器幂等根因修复（`copyFileKeepingMtime` 写侧数值秒；受控 A/B baseline 19/1 → HEAD 20/0）；
  T3 CI 矩阵增 `macos-latest`；T5/T7 CHANGELOG 平台限定 + 勘误（纯追加 `58 0`）；
  **T6（增量）** 修 macOS `os.tmpdir()` 符号链接夹具缺陷（4 副本 realpath 归一化，产品 `kix-focus.js` 零改动）。
- **端到端**：`npm test` exit 0（链尾 60 → 59/0/1）、`cd en && npm test` exit 0（36 → 35/0/1）——链首红解除后
  首次跑到链尾，并**立即暴露**了第二条既有红（T6 的由来，L4 记 `l2_failed: 1`）。
- **QA 签署**：`docs/qa/qa-signoff-1.md` = **`CONDITIONAL`**（唯一理由 `ci_pending: true`）；MG1–MG6 全绿；
  7 findings（唯一 P2 = F-1，T2 幂等断言非 hermetic）+ 4 残余不确定（R-1..R-4）。
- **未取证（不得当作已完成）**：CG1/CG2/CG3 全部 pending；本 Sprint **不构成发布证据**。
- **`over_budget: 1`**（实际 8 commits / derived 7，收尾产物未计为 DAG 层）——按红线如实记录，**未改写预算**。

## 8. 下一步（固定锚点）

**Sprint 1 = A. 测试基线健康 → `status: done`（`release_eligible: false`，2026-09-22 收尾）**。
原 5 项范围（pwsh 探针 / 安装器幂等 / CI 加 macOS / skip 门禁化 / CHANGELOG 勘误）**全部完成**，
并按 L2 前的新证据增量扩为 7 项（+T6 夹具修复 / +T7 CHANGELOG 补段）。终态见第 7 章与 `docs/sprint-1/done.md`。

**下一步（按优先级）**：

1. **CI 取证（唯一解锁 `release_eligible` 的动作）**：用户授权 PR 路径后，按 CG1 → CG2 → CG3 依次执行；
   CG2 必须核对 **6 个 matrix 组合** 与 macOS job 日志中的 `# skipped 0`。若任一组合 failure
   → 本 Sprint 的 `done` 判定失效（falsifier 见 `done.md` §8.3），走 `REVERIFY_REQUIRED`。
2. **Sprint 2 候选输入**（本 Sprint 已登记、未修）：
   - F-1 / HB-4：T2 幂等断言的 **hermetic 性**（把 mtime 边界构造进 fixture）——削弱 CI 侧证据强度；
   - OQ8 / N8：`preset-classic` / `preset-null` 两副本**不被任何 npm script 执行**（字节一致 ≠ 可运行）；
   - R-1 / HB-5：manifest digest 的平台无关复算（现依赖 pwsh，QA 未能字节级复核）；
   - F-2：`kix-focus.test.js:703-709` 近恒真弱断言改为显式 `skip` 语义；
   - OQ4 / N5：baseline 对齐（上游 `main` 已领先本地，含 `v1.3.17` 的 CI failure run）；
   - OQ6 / N2：pwsh 依赖工具链的 Node 等价实现（fidelity check / hooks）。
3. **Sprint 2 规划期必读**：`docs/sprint-1/plan.md` §10（N1–N9 候选）、`docs/sprint-1/done.md` §9（11 项移交）、
   `docs/sprint-1/hill-climbing.md`（L4：HB-3/4/5 candidate + U-1..U-5）。

## 9. 风险登记（固定锚点）

| ID | 风险 | 影响 | 现有缓解 | 状态 |
|---|---|---|---|---|
| R1 | **平台特异红不可见**：macOS 专属红（Sprint 1 前 CI 矩阵无 macOS runner，4 条红全部只在 macOS 出现）| 分发资产在 macOS 上的真缺陷（幂等）长期隐形 | Sprint 1 T3 已将 `macos-latest` 加入矩阵（`ci.yml:20`，6 组合）+ 本机 macOS 红已转绿（LG5/LG6 exit 0）；**CI 侧 success 未取证（CG2 pending）→ 可见性通道已建、尚未实际产出** | mitigated |
| R2 | **skip 被误读为通过**：`node --test` 的 skip 不改变 exit code；本机 25 → 只有 20 真跑 | 门禁覆盖率虚高，回归静默 | Sprint 1 T4 显式门禁语义（`pass 20 ≠ 25`）+ QA MG1 逐条登记 5 条用例（源码 5 处调用点 ↔ `skipped 5`）；**CI 侧 `skipped == 0` 未取证（R-2）** | mitigated |
| R3 | **上游 main 已领先本地**：上游存在 `v1.3.17` tag 的 CI 失败运行（2026-09-13），本地 HEAD 停在 `v1.3.16` 的 `c3c31eb` | 本 Sprint 的「红转绿」口径可能被上游新红覆盖 | 以本地 baseline `c3c31eb` 为唯一对照口径；合入前 rebase 并复跑全量 gate | open |
| R4 | **CI 只能在 fork→上游 PR 上观测**：fork 无 workflow 注册，且**用户未授权 push/PR** | `ci_gate` 在 PR 创建前无法执行；Sprint 1 收尾时 CG1/CG2/CG3 **全部 pending**，本地绿不构成 CI 绿的替代证据 | ci_gate 记 pending，PR 创建后由 `gh pr checks` 判定；无 PR 则降级 manual_gate。**不得**为解锁而由 agent 自行 push/开 PR | open |
| R5 | **本机无 `pwsh`**：`.ps1` 全部不可执行（含 `sync-dsh-preset.ps1`、kixpower hooks、`verification-fidelity-check.ps1`）| 5 条用例只能 skip（本机对 `sync-dsh-preset.ps1` 覆盖 = 0 条断言）；drift-check 无法跑官方脚本 | 显式登记 skip 语义（T1/T4 + MG1）；drift-check 手工 baseline 报告；R-1/R-2 已登记 falsifier | open |
| R6 | **文档声称与实测不符**（CHANGELOG v1.3.13「重复安装幂等」、v1.3.15「59 pass / 0 fail」）| 用户按文档预期行为，实际不符 | Sprint 1 T5/T7 已追加勘误 + 平台限定（`CHANGELOG.md` diff = `58 0` 纯追加，QA MG2 pass）| mitigated |
| R7 | `scripts/install-lib.js` 与 `en/scripts/install-lib.js` 字节镜像：只改一侧必致 `test:consistency` 红 | 单侧修复会引入新的红 | 守护机械拦截（`consistency-lib.cjs:691`）+ plan `target_rules` 显式列副本 | mitigated |
| R8 | **CI 门禁未取证 = 发布解锁的唯一开口**：Sprint 1 的 `done` 建立在本地可执行范围内，`release_eligible: false` | 任何 tag / `npm publish` / 合并上游 PR 都缺少 CI 证据；且若 CG2 出现 failure，Sprint 1 的 `done` 判定即失效 | frontmatter 硬标注 `release_eligible: false` + `ci_pending: true`（`docs/sprint-1/done.md`）；falsifier 见 `done.md` §8.3（CG2 6 组合 success + macOS job `# skipped 0` 为解锁判据）| open |

---

## 10. 测试与门禁基线

> **Sprint 1 终态（@ `a3cdfb1`）**：本章为**规划期基线快照**（保留不改，供对照）。终态见
> `docs/sprint-1/done.md` §2：`npm run test:installer` = 25 → **20 / 0 / 5**、`npm test` **exit 0**（链尾 60 → 59/0/1）、
> `cd en && npm test` **exit 0**（36 → 35/0/1）、required local gate **8/8 exit 0**；**CI 侧仍未取证**（CG1/CG2/CG3 pending）。

**基线（2026-09-22，本机 macOS，`npm test` exit 1）**：

| 用例 | 位置 | 现象 | 定位 |
|---|---|---|---|
| `ensureDefaultSkillsShelf materializes classic shelf when dest has none` | `scripts/install-lib.test.js:207` | 第二次调用 `added+updated = 3`（期望 0）| 幂等性真缺陷；根因**未确证**（见 plan.md T2）|
| `sync expands an explicitly declared native directory symlink` | `scripts/sync-dsh-preset.test.js:82` | `sync.status === null`（期望 0）| 调用不存在的 `pwsh` → spawn ENOENT |
| `sync rejects a case-variant sibling as outside the bundle on POSIX` | `scripts/sync-dsh-preset.test.js:110` | `sync.stderr` undefined → `assert.match` 抛错 | 同上 |
| `sync fails closed for missing or out-of-source declared pointers` | `scripts/sync-dsh-preset.test.js:140` | 同上 | 同上 |

**计数模型（可复算）**：`test:installer` = `install-lib.test.js` 20 + `sync-dsh-preset.test.js` 5 = **25**。
- 现状：`install-lib` 19 pass + 1 fail；`sync` 0 pass + **2 skip**（21/52 有 ENOENT 探针）+ 3 fail → **19 / 4 fail / 2 skip**
- 修 T1+T2 后（本机无 pwsh）：`install-lib` 20 pass；`sync` 5 skip → **20 pass / 0 fail / 5 skip**
- 同一 revision 在 CI（预装 pwsh）：**25 pass / 0 fail / 0 skip**

**`npm test` 的 `&&` 链语义**：第一步 `test:installer` 红 → 后续 `check-dsh-consistency` / `test:pressures` / `test:vision` / `plugins/` **从未执行**。
即：当前 4 条红**遮蔽了整条门禁链**，本机实际门禁覆盖 = 0（除第一步的部分用例）。这是 Sprint 1 的第一优先级理由。

**skip 语义（T4 的判据来源）**：本仓库有两类 skip，语义不同、不可混同：
| 类型 | 触发 | 语义 | 例 |
|---|---|---|---|
| 平台不适用 | `process.platform === 'win32'` | 该平台**本就不该跑**（用例前提不成立）| 110（Windows 路径大小写不敏感）、82（原生 symlink fixture 需非 Windows 权限）|
| 能力缺失 | 探针 `probe.error.code === 'ENOENT'` | 该环境**缺工具**，用例本应执行但无法执行 | 21 / 52（本机无 pwsh）|

> **红线**：能力缺失型 skip **不等于通过**。本地 `npm run test:installer` 的 `pass` 数（20）必须与「有 pwsh 环境应为 25」明确区分并逐条登记。

## 11. 多副本一致性模型

| 副本集 | 成员 | 守护检查 | 后果 |
|---|---|---|---|
| 语言中立插件（4 根） | `dsh/preset{,-classic,-null}/plugins/<name>.js` + `en/preset-classic-en/plugins/<name>.js` | `checkPluginPair` / `PLUGIN_IDENTITY_GROUPS` | 任一副本漂移 → `test:consistency` 红 |
| 分簇插件 | `kix-budget`（incentive / classic 两簇）；`kix-probe`/`kix-settle`/`kix-mem`（仅 incentive 面）| 同上（簇内比对，不跨簇） | 同上 |
| 安装器 | `scripts/install-lib.js` ↔ `en/scripts/install-lib.js`（md5 一致）| `checkIdenticalSet`（`consistency-lib.cjs:691`）| 单侧改 → 红 |
| vision bridge | `dsh/vision-bridge/` ↔ `en/bridge/` | `checkMirrorTree` | 同上 |
| 版本 | 两包 `version` 同步 | `checkVersionPair` | 同上 |
| 默认档货架指针 | `dsh/preset/{skills,agents}` symlink → `dsh/preset-classic/` | `checkDefaultShelfPointers` | 指针丢失 → 红 |
| 预算 | persona 常驻字符/token 预算（zh 4500/2600；en 等值）| `checkPersonaBudget` | 超预算 → 红 |
| Markdown 链接 | `dsh/preset`、`en/preset-classic-en` 内相对链接可达 | `checkMarkdownLinks` | 断链 → 红 |
| 语法 | 全部 JS/CJS/MJS 可解析 | `checkSyntax` | 同上 |

**改动纪律**：任何 `dsh/**` 或 `en/**` 源码改动**必须**同步其副本组；`scripts/install-lib.js` 必须同步 `en/scripts/install-lib.js`。
**Sprint 1 实际改动面**（`git diff --name-only c3c31eb..HEAD` 共 18 文件）：`scripts/**`、`en/scripts/install-lib.js`（镜像）、
`.github/workflows/ci.yml`、`CHANGELOG.md`、4 个 `**/plugins/kix-focus.test.js`（**测试夹具**，经 plan §2 修订授权）与规划/收尾文档；
**产品源码零改动**（4 个 `kix-focus.js` 副本 md5 均为 `52346442ca28b753ff9ad9ef7856242c` = baseline 值，`git diff --name-only c3c31eb..HEAD -- '**/kix-focus.js'` 为空）。

## 12. 运行时与工具链限制

| 事实 | 影响 |
|---|---|
| macOS；node v22.14.0；npm 可用 | 本地可按 `package.json` 跑全部 node 命令 |
| **本机无 `pwsh`**（实测 `command -v pwsh` 空）| 所有 `.ps1` 不可执行：`scripts/sync-dsh-preset.ps1`、`install.ps1`、kixpower hooks（`block-*-edit.ps1` / `blast-radius-check.ps1` / `pre-commit-lint-check.ps1`）、`scripts/install-kix-stalled.ps1`、`ensure-vision-bridge.ps1`、`verification-fidelity-check.ps1` |
| kixpower hooks **不自动触发**（DSH 适配注记）| 机械门禁由 `dsh/preset/plugins/kix-guards.js`（`tools/pre-execute`）原生承载；角色 body 的 hooks 块为 VS Code 遗留 |
| `gh` 已认证（账号 `slchris`），但**上游 Issues 禁用** | 只能读 CI run/PR；不能提 Issue |
| fork `slchris/kixparadigm` 无 workflow 注册、无 run 历史 | 本地 push 不触发 CI；CI 只在上游 PR/push 触发 |
| 无 env / DB / 服务 / 端口 | 模板的「环境变量 / DB schema / health endpoint」三节对本项目**不适用**，已在本 Sprint 的 `runtime-context.md` 改为「工具链能力快照」|

## 13. 决策记录（已有但未文档化的决策）

> 从代码、CHANGELOG 与配置反推的既有决策；Sprint 1 只**记录**，不重新辩论。

| ID | 决策 | 理由（仓内证据）| 反推来源 |
|---|---|---|---|
| D1 | `dsh/` 与 `en/` 的插件必须字节一致，检查逻辑**单源**（CI 与运行时插件共用 `consistency-lib.cjs`）| 防「CI 一套、运行时一套」双源漂移 | `scripts/check-dsh-consistency.cjs` 头注释 |
| D2 | 默认档 `skills`/`agents` 用 **git symlink 指针**共享 classic，不在包内复制 | 单源；`npm pack` 丢 symlink 时由安装器物化到 `DSH_HOME`（绝不改打包源树）| `install-lib.js:280-302` `DEFAULT_SHELF_DIRS` |
| D3 | 货架物化走 `mirror: true`（源侧删除在货架同样生效），但**普通目录绝不裁剪** | 安装副本 `memories/` 是 kix-mem 经验库根，误删 = 数据丢失 | `install-lib.js:216、268-270、280-284`、CHANGELOG v1.3.13 |
| D4 | 复制文件保留源 mtime，幂等判据 = `size + 秒级 mtime` | 否则 `copyFileSync` 刷新目标 mtime，每次安装全量重写 | `install-lib.js:186-192、226-230` |
| D5 | 平台相关测试用 `t.skip()` 而非条件断言 | 保持用例名与计数稳定；skip 语义在汇总行可见 | `sync-dsh-preset.test.js:22-25` |
| D6 | `kixparadigm-null`（消融档）**不随 npm 安装**，也不在 CI 一致性契约内（仅作对照）| 消融面设计如此 | README、`install-lib.js` `PRESET_VARIANTS` |
| D7 | 零第三方运行依赖 | 安装器在 `postinstall` 阶段执行，不能依赖尚未安装的依赖 | `package.json`（无 `dependencies`）|
| D8 | CI 不设 macOS runner（**本次要改**）| 历史选择，无书面理由；后果见 R1 | `.github/workflows/ci.yml` |
| D9 | 根目录 `skills/`、`instructions/`、`prompts/`、`agents/` 是 Copilot 分发版，与 DSH 版**刻意不同**，不互相覆盖 | 两套消费者机制不同 | README「唯一事实源约定」|

## 14. 术语表

| 术语 | 含义 |
|---|---|
| **preset** | DSH 的 agent 预设（`agent.cordis.yml` + `preset.yml`），描述 persona、插件、工具可见面 |
| **默认档 / 经典档 / 消融档** | `dsh/preset`（激励面，最小常驻）/ `dsh/preset-classic`（全文编曲）/ `dsh/preset-null`（对照消融）|
| **货架（shelf）** | preset 根下的 `skills/` 与 `agents/` 目录；默认档经指针共享 classic，安装时物化（`ensureDefaultShelf`）|
| **物化（materialize）** | 把 git symlink / 文本指针展开为真实目录树（`copyTree` 的 `resolveLinkedDir` 分支）|
| **指针条目（pointer entry）** | symlink 目录或「内容为相对路径的 ≤256B 单行文本文件」（Windows `core.symlinks=false` 检出形态）|
| **镜像（mirror）** | `copyTree(..., {mirror:true})`：源侧删除的条目在目标侧被裁剪（`pruneMirror`）|
| **一致性守护** | `scripts/check-dsh-consistency.cjs` + `consistency-lib.cjs`；CI 与运行时 `kix-consistency.js` 共用 |
| **capacity skip / platform skip** | 见第 10 章两种 skip 语义 |
| **canonical 命令** | `package.json#scripts` 中真实存在的命令（本 Brief 第 4 章为唯一清单）|
| **trace / Trace Log** | `progress.md` 中 orchestrator 按阶段信号记录的执行轨迹 |
| **L2 / QA / L4** | kixpower 阶段：机械门禁验证 / 独立质量签署 / Hill Climbing 收尾 |
