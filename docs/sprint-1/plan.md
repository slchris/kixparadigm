# Sprint 1 Plan — 测试基线健康（模式 0：已有代码项目导入）

```yaml
sprint: 1
theme: "A. 测试基线健康"
baseline_sha: c3c31eb3268622358761cb2035ec84810a12ca11
branch: feature/sprint-1-test-baseline   # 增量修订：原写 main；实际执行分支（kix-guards 硬 deny main 分支 commit，见 progress.md Trace Log）
content_language: zh
producer: Remy
created: 2026-09-22
revised: 2026-09-22                     # 增量重规划（非新 Sprint）：L2 前新证据 → §2 限定修订 + 新增 T6/T7
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

> **增量修订（2026-09-22，L2 前；原结论一律保留不覆写）**
> T1–T5 已全部完成并提交（5 commits：`428e41f` 规划 / `039811d` T1+T4 / `1c9d479` T2 / `8696b02` T3 / `c43d36e` T5），LG1–LG4 已绿。
> 但 L2 前发现**一条会阻断既有目标的新事实**：`npm test`（LG5）与 `cd en && npm test`（LG6）**仍 exit 1**，唯一红是
> `dsh/preset/plugins/kix-focus.test.js` 的 macOS `os.tmpdir()` 符号链接夹具缺陷（138 passed / 1 failed），且**非本 Sprint 引入**
> （baseline `c3c31eb` 独立 worktree 复现同一计数；该文件 baseline 与 HEAD 的 md5 相同）。
> 该红**阻断 G-B**（T3 新增的 macOS job 在 macOS 上确定性红）与 CG2。
> 故本 Sprint **增量扩范围至 T6**（只修夹具；产品源码仍禁改，见 §2 修订行）并追加 **T7**（T5 的 Sprint 条目补 T6 段）。
> LG1–LG4、T1–T5 的完成结论与其证据不受本次修订影响。

---

## 2. 本 Sprint 不做什么（explicit non-goals）

| 不做 | 原因 |
|---|---|
| **不重写 `sync-dsh-preset.ps1`**，不把 pwsh 用例改写成 Node 实现 | 脑暴分歧 A 裁决：被测对象就是那 197 行 PowerShell；Node 重写会让脚本回归覆盖归零（违反 G1）。方案保留在 Sprint+1 候选 |
| ~~**不改 `dsh/**` 任何 preset / 插件源码**~~<br>→ **修订（2026-09-22，L2 前）：产品源码仍禁改；仅允许修改 `**/plugins/kix-focus.test.js` 这一个测试夹具文件（4 副本）** | **原决策（保留痕迹，不静默抹掉）**：本 Sprint 聚焦门禁健康；改 `dsh/**` 会触发 4 副本同步与 persona 预算守护，属另一主题。<br>**修订理由（L2 前新证据，非推测）**：① LG5/LG6 链尾唯一红 = `kix-focus.test.js:691`「symlink 部署（WSL2 实测 bug 场景）: realpath 候选解析成功」，`138 passed / 1 failed`；② 该红在 baseline `c3c31eb` 的独立 worktree 上逐字复现（138/1），且该文件 baseline 与 HEAD 的 md5 相同 `4a11c76e45eb9aebe1534beb5f611c48` → **非本 Sprint 引入**，是链首红解除后才暴露的既存缺陷（LL-3）；③ 根因在**夹具**而非产品：`fsSync.mkdtempSync(path.join(osMod.tmpdir(), 'kix-focus-res-'))` 在 macOS 返回 `/var/folders/…`，而 `/var` 是 `/private/var` 的符号链接 → 解析器返回的 realpath 候选与未归一化的 `pkgRoot` 字面不等 → `viaRealpath === false`（产品行为正确：`resolved === true`）；④ 该红**阻断 G-B**（macOS runner 确定性复现）与 CG2。<br>**修订的边界（硬）**：`kix-focus.js`（产品源码）**仍禁改**——4 副本 md5 在 baseline 与 HEAD 均为 `52346442ca28b753ff9ad9ef7856242c`；`kix-focus.test.js` 属 `drift_whitelist` 的 `**/*.test.js`，不触及 persona 预算与产品语义面 |
| **不动 `dsh/preset-null`**（消融档）<br>→ **修订：T6 必须一并修改 `dsh/preset-null/plugins/kix-focus.test.js`** | **原决策（保留痕迹）**：消融面设计上最小，且不在一致性契约内。<br>**修订理由**：一致性守护对**未列入** `PLUGIN_IDENTITY_GROUPS` 的插件走**默认全根身份组**（`consistency-lib.cjs:358-359`；`kix-focus.js` 不在该白名单 312-324 内，白名单只收窄分组、不放宽）→ 4 副本**必须字节一致**，只改 zh 侧会让 **LG2 直接红**。本机只读 introspection 实测 `pluginIdentityGroups('kix-focus.js', roots)` = 单一组 `[[dsh/preset, dsh/preset-classic, dsh/preset-null, en/preset-classic-en]]`。<br>**修订的边界**：只改该档的**测试夹具**；`preset-null` 的产品文件与消融语义不动 |
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
| **T6**（增量新增）修 macOS `os.tmpdir()` 符号链接导致的夹具缺陷 | live：消费者 = LG5（根 `npm test` 末段 `cd dsh/preset/plugins && node --test`）、LG6（`cd en && npm test` 末段）、LG2（4 副本字节一致）、T3 的 macOS CI job / CG2 | `warm`（每次本地与 CI 测试都执行；且是 G-B 唯一阻断项）| ✅ 采纳：成本 ≈ 1 文件 × 4 副本的同构改动；**不修则 LG5/LG6 与 G-B/CG2 均不可达** |
| **T7**（增量新增）CHANGELOG Sprint 1 条目补 T6 段 | live：消费者 = 包用户与维护者 | `cold`，🟡 low-ROI | ✅ 采纳但降优先级：成本 ≈ 1 次追加；Sprint 1 条目是**当前状态**条目（非历史条目），不补则与本 Sprint 实测的最终门禁口径不一致（G-D 同类漂移）|

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

### 4.1 增量新增任务（2026-09-22，L2 前修订）

> T1–T5 的条目、结论与证据一律保留（见上文与 progress.md）；以下为**追加**。

- [ ] **T6 — 修 macOS `os.tmpdir()` 符号链接导致的 pwsh 无关夹具缺陷（只修夹具，不改产品）**
  - **定位**：`dsh/preset/plugins/kix-focus.test.js:691`「symlink 部署（WSL2 实测 bug 场景）: realpath 候选解析成功」，返回式 `viaRealpath && resolved === true`。
  - **根因（已由 orchestrator 独立复核，可直接引用）**：夹具在 692 行用 `fsSync.mkdtempSync(path.join(osMod.tmpdir(), 'kix-focus-res-'))` 建临时根；macOS 的 `os.tmpdir()` = `/var/folders/…`，而 `/var` 是 `/private/var` 的符号链接 → 解析器返回的 realpath 候选是 `/private/var/…/dsh-install/dsh`，与夹具中未归一化的 `pkgRoot`（`/var/folders/…`）字面不等 → 711 行 `c.includes(realEntry)` 为 `false`。**产品行为正确**（`resolved === true`），Linux/Windows 的 tmp 无符号链接故 baseline CI 一直绿。
  - **做法（推荐方向：夹具侧实时 realpath 归一化）**：把临时根归一化后再派生全部路径，例如
    `const tmp = fsSync.realpathSync(fsSync.mkdtempSync(path.join(osMod.tmpdir(), 'kix-focus-res-')))`
    （等价可接受方案：比较对象侧归一化，`c.includes(fsSync.realpathSync(realEntry))`）。
    目标是让该断言在 **Linux / Windows / macOS 三平台验证同一件事**——「realpath 候选链可用」，而非改变它所验证的语义。
    归一化后 `linkDir`（夹具自建的 symlink）与 `realEntry` 同处归一化根下，`viaRealpath === true && resolved === true` 结构性成立。
  - **不做什么（硬）**：① 不删除该断言、不删除 `viaRealpath` 或 `resolved` 任一合取项；② 不放宽为恒真式（`>= 2`、`return true`、`||` 兜底、try/catch 吞异常）；③ **不改产品代码** `kix-focus.js`（4 副本 md5 必须保持 `52346442ca28b753ff9ad9ef7856242c`）；④ 不要求把 704 行「symlink 创建失败的受限环境降级分支」当作修法复用（那是既有的环境降级，不是本缺陷的解）；⑤ 改动面严格限定为该用例的**路径构造**（临时根归一化），不得顺手"整理"同文件其它断言的措辞或结构；⑥ 第 765 行另一处 `osKix.tmpdir()` 夹具当前不失败 → **不改**（无证据改动 = 风险）。
  - **4 副本同步要求（必须全部改，否则 LG2 红）**：

    | 副本路径 | 由哪个命令执行 | LG2 字节一致守护 |
    |---|---|---|
    | `dsh/preset/plugins/kix-focus.test.js` | 根 `npm test` 末段（`cd dsh/preset/plugins && node --test`）→ LG5 / LG10 | ✓ |
    | `en/preset-classic-en/plugins/kix-focus.test.js` | `cd en && npm test` 末段（`cd preset-classic-en/plugins && node --test`）→ LG6 / LG11 | ✓ |
    | `dsh/preset-classic/plugins/kix-focus.test.js` | **无任何 npm script 执行**（仅被 LG2 守护字节一致）| ✓ |
    | `dsh/preset-null/plugins/kix-focus.test.js` | **无任何 npm script 执行**（仅被 LG2 守护字节一致）| ✓ |

    **守护事实（对 orchestrator 交接注记的修订）**：`kix-focus.js`/`.test.js` **确实不在** `PLUGIN_IDENTITY_GROUPS`（`consistency-lib.cjs:312-324`，仅 5 个插件）——但**不在白名单 ≠ 无守护**：白名单只用于**收窄**分组，缺省分支 `if (!spec) return [roots.slice()]`（`consistency-lib.cjs:358-359`）把**发现到的全部 preset 根当作同一身份组**；`pluginNames()` 只列非测试文件（`:633-639`），再由 `checkPluginPair` 以 `testName` 回查同名 `.test.js`（`:397`、`:404-414`）→ **4 副本测试夹具同样被 `checkIdenticalGroup` 硬绑**。本机只读 introspection 实测分组 = 单一组含 4 根（见 §2 修订行）。**结论：同步是机械强制的，不是自律性的**；覆盖面的真实缺口是「其中 2 个副本不被任何命令执行」（见 §9 OQ8）。
  - **判据（用于区分「夹具缺陷」与「产品缺陷」，必须全部满足）**：
    1. **修后行为**：本机 macOS 上该用例 `viaRealpath === true && resolved === true`（pass）；且 ubuntu/windows/macos 三平台同一断言均为 pass。
    2. **产品零改动**：`git diff --stat c3c31eb..HEAD -- '**/kix-focus.js'` 输出为空；4 个 `kix-focus.js` 副本 md5 均 = `52346442ca28b753ff9ad9ef7856242c`（baseline 值，已用 `git show c3c31eb:…` 复核）。
    3. **夹具仍有区分力（反例 control，防「靠删断言变绿」）**：把 `resolveEntryCandidates` 的 realpath 回退在**仓库外 scratch 副本**中临时置空后，同一断言场景必须得到 `viaRealpath === false` → 证明该断言在修后仍能捕获产品缺陷，不是恒真。
    4. **diff 形态**：`git diff c3c31eb..HEAD -- '*kix-focus*'` 中，`*.js` 零命中；`*.test.js` 的 diff 只含路径归一化，**不得出现被删除的 `await ok(` 行**，也不得删除 `viaRealpath` / `resolved` 任一合取项。
    > 反例 control 只允许在**仓库外**临时副本上进行；工作树内 `kix-focus.js` 任何时刻不得出现 diff（由 MG5 机械校验）。
  - **验收**：`npm test`（LG5）与 `cd en && npm test`（LG6）**exit 0**；聚焦 gate LG10/LG11 计数由红转绿（见 §7）；LG2 保持绿（4 副本字节一致）。
  - **文件**：`dsh/preset/plugins/kix-focus.test.js`、`dsh/preset-classic/plugins/kix-focus.test.js`、`dsh/preset-null/plugins/kix-focus.test.js`、`en/preset-classic-en/plugins/kix-focus.test.js`

- [ ] **T7 — CHANGELOG Sprint 1 条目补 T6 段（只追加，不改 T5 已写内容与历史条目）**
  - **为什么需要（判定：需要）**：T5 写的三条内容（installer 双口径 20/0/5 与 25/0/0、v1.3.13 幂等勘误、v1.3.15 平台限定）**均未被 T6 反证**（它们描述的是各自测量时刻的事实），故 **T6 不需要对 T5 追加「勘误」**；但 Sprint 1 条目是**当前状态条目**（非历史条目），它记录了 T1–T5 交付而**不含 T6**，且读者无法从中看出「`npm test` / `cd en && npm test` 已从 exit 1 转为 exit 0」——这正是 G-D「文档声称与实测可对照」要防的漂移。因此以 **T7 追加同一条目的 T6 段**（而非改写 T5 文字、也非"不写"）。
  - **做法**：在 `CHANGELOG.md` 顶部 Sprint 1 条目内追加一小段：夹具缺陷（macOS `os.tmpdir()` → `/private/var` 符号链接）、**非本 Sprint 引入**（baseline `c3c31eb` 复现）、修夹具而非产品、4 副本同步；并写入最终门禁口径（本机 macOS：`npm test` 末段 60 tests → **59 pass / 0 fail / 1 skip**、`cd en && npm test` 末段 36 tests → **35 pass / 0 fail / 1 skip**；该 1 skip = `kix-browser.test.js` 的 real smoke，需 `KIX_BROWSER_SMOKE=1`，非能力型 skip）。
  - **不做什么**：不改写 T5 已落盘的句子与数字；不改任何历史版本条目（diff 必须为纯追加）；不宣称 CI 已绿（CG1/CG2 仍 pending，见 §9 OQ3）。
  - **依赖**：T6（需要最终数字）+ T5（同文件，T5 已完成 → 顺序追加）。
  - **验收**：`git diff -- CHANGELOG.md` 为纯追加；T6 相关数字均标注测量平台。
  - **文件**：`CHANGELOG.md`

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
    # ── 以下为 2026-09-22 增量修订新增（L2 前新证据 → 扩范围；T1–T5 节点与证据不变）──
    - id: T6
      desc: "修 kix-focus.test.js:691 的 macOS os.tmpdir() 符号链接夹具缺陷（4 副本字节同步）；产品源码 kix-focus.js 禁改"
      depends_on: []               # 与 T1–T5 无输入依赖：改的是 4 个 *.test.js 夹具，不消费其产物
      coupling: none
      estimated_tokens: low
      target_rules:
        globs:
          - "dsh/preset/plugins/kix-focus.test.js"
          - "dsh/preset-classic/plugins/kix-focus.test.js"
          - "dsh/preset-null/plugins/kix-focus.test.js"      # 消融档：本 Sprint 仅因字节一致守护而纳入（§2 修订行）
          - "en/preset-classic-en/plugins/kix-focus.test.js"
        modules: []                # 不写语义模块名：4 副本跨 dsh/ 与 en/ 两个顶层，globs 显式优于会落空的模块前缀匹配
        languages: [javascript]
        mechanical_links:
          - type: identical_mirror   # 仓库本地扩展类型（见 §5.1）：字节镜像副本组
            of:
              - "dsh/preset-classic/plugins/kix-focus.test.js"
              - "dsh/preset-null/plugins/kix-focus.test.js"
              - "en/preset-classic-en/plugins/kix-focus.test.js"
            guard: "consistency-lib.cjs:394-414 checkPluginPair + :358-359 默认全根身份组 → npm run test:consistency (LG2)"
          - type: callees            # 该夹具调用/断言的被测对象（禁改边界）
            of: ["dsh/preset/plugins/kix-focus.js"]
    - id: T7
      desc: "CHANGELOG Sprint 1 条目追加 T6 段（夹具缺陷 + 最终门禁口径），只追加不改 T5 已写内容"
      depends_on: [T5, T6]         # T5 的条目文本是追加基座；T6 的最终数字是输入
      coupling: weak               # 顺序追加（前驱已完成，无并发写入）；消费结论而非产物 → 与 T5 同口径取 weak
      estimated_tokens: low
      target_rules:
        globs: ["CHANGELOG.md"]
        modules: []
        languages: [markdown]
        mechanical_links: []
  properties:
    max_antichain_width: 3        # ω：{T1,T2,T6} 或 {T3,T4,T6}（Dilworth：n−最大匹配 = 7−4 = 3；T7 与 T5 均与其余节点可比，故不能入更大反链）
    critical_path_depth: 4        # δ：T1→T3→T5→T7 或 T1→T4→T5→T7（T6→T7 为长度 2 的旁支）
    coupling_density: 0.23        # γ：(0+0+0.3+0.7+0.3+0+0.3)/7 = 1.6/7 = 0.2286
    recommended_topology: sequential   # 命中强制串行条件（见 §5.2）；无强制时按 ω=3,γ=0.23 应得 parallel
    layers:
      - [T1, T2, T6]
      - [T3, T4]
      - [T5]
      - [T7]
```

### 5.1 `identical_mirror` 类型说明

TEAM_CONVENTIONS 的 `mechanical_links.type` 闭集为 `callers|callees|same_trait|same_struct`（CodeGraphy 语义），没有「副本镜像」类型。本仓库存在一类机械可验证的镜像关系（`scripts/install-lib.js` ↔ `en/scripts/install-lib.js`，由 `consistency-lib.cjs:691` 守护），故**显式扩展一个仓库本地类型** `identical_mirror`，其 `guard` 字段指向真实守护与门禁命令（LG2）。这不是新增机制，而是把已存在的机械守护登记进 `target_rules`，避免 Dev 只改单侧。

> **T6 增量注记（2026-09-22）**：T6 复用该类型，但守护路径不同——`kix-focus.test.js` **不在** `PLUGIN_IDENTITY_GROUPS` 白名单内，走的是 `pluginIdentityGroups` 的**默认全根身份组**（`consistency-lib.cjs:358-359`），由 `checkPluginPair` 以 `testName` 回查（`:397`、`:404-414`）。白名单只**收窄**分组，不作为「无守护」的依据；本机只读 introspection 实测该文件的分组 = 单一组含 4 个 preset 根。

### 5.2 `force_sequential` 判定理由

```yaml
force_sequential: true
```

| # | 触发条件（TEAM_CONVENTIONS §何时强制 sequential）| 本 Sprint 命中情况 |
|---|---|---|
| 1 | **涉及同一文件的多个任务** | ① T1 与 T4 同为 `scripts/sync-dsh-preset.test.js`（已由 `T4.depends_on: [T1]` 串行化）；② **增量新增**：T5 与 T7 同为 `CHANGELOG.md`（由 `T7.depends_on: [T5, T6]` 串行化）。禁止并行 worktree 分别编辑同一文件（避免 merge 冲突）|
| 2 | 加密/认证敏感改动 | 不命中 |
| 3 | plan 明确标注 force_sequential | 命中 |

**额外理由（本 Sprint 特有，非规则要求）**：

- **共享唯一验证入口**：T1 与 T2 虽改不同文件，但**唯一 canonical 入口是 `npm run test:installer`**，该命令同时包含 3 条 pwsh 红与 1 条幂等红。任一未修时该命令必红 → 分区并行的两个 Dev **都无法各自产出绿灯结算**；而 L2 要求「同一 revision 上全部 required local gate 通过」，分区自证不成立。
- **扇出固定开销不回本**：全 Sprint 总改动 ≈ 5 文件（含 CHANGELOG）+ CI 配置，7 个任务、δ=4；worktree/partition/synthesis 的固定成本高于串行收益。

**增量修订后的追加理由（2026-09-22，记录公式与实际的分歧，不掩盖）**：

- **剩余工作量已是单链**：T1–T5 已提交，剩余节点仅 T6 → T7（T6 独立于 T1–T5，T7 消费 T6 与 T5）→ 无并行空间，串行是唯一可行拓扑。
- **公式分歧被显式覆盖**：按 §拓扑路由规则，ω=3 ≥ 3 且 γ=0.23 < 0.3 应得 `parallel`；但规则**按顺序命中即停**，`force_sequential`（上表 #1/#3）优先 → 仍为 `sequential`。此处保留公式值供 orchestrator 复核，不作为被隐藏的矛盾。
- **DAG 属性变化本身不影响已完成结论**：ω 2→3、δ 3→4 是**新增节点**带来的结构量变化，不改变 T1–T5 的完成状态与证据。
- **ω 经机械复核**：本节 ω/δ/γ/layers 由独立探针按 `depends_on` 暴力枚举反链 + 最长路径重算得出（ω=3、δ=4、γ=0.2286、layers 与上文一致），非人工估计；`{T3,T4,T6}` 与 `{T1,T2,T6}` 是两个最大反链，T5/T7 因与其余节点可比而不能入更大反链。

> 结论：`recommended_topology: sequential`。DAG 仍输出 `layers` 与 ω/δ/γ，供 orchestrator 在修复过程中若改变范围时重新路由。

---

## 6. task_sizing（derived_commit_budget）

```yaml
task_sizing:
  inputs:
    task_count: 7                      # k（仅参考，不进公式）
    dag_layers: 4                      # δ = critical_path_depth（增量修订：3 → 4，新增 T7 层）
    dag_width: 3                       # ω = max_antichain_width（增量修订：2 → 3；经暴力枚举复核，非估计）
    strong_coupling_count: 1           # coupling ∈ {strong, critical} 的节点数（T4）
    bug_reserve: 2                     # 增量修订：1 → 2（依据见下方 bug_reserve_source 与「实测校验」）
    bug_reserve_source: >-
      ① 冷启动常量 1 已被本 Sprint 实测取代：规划期未预见的缺陷实数 = 1
      （kix-focus 夹具红；证据 progress.md「⚠️ 范围外发现」+ baseline c3c31eb 独立 worktree 复现 138/1），
      观测率 = 1 / sprint；
      ② 该 1 个已被提升为**计划内** T6，占用的是 base 之外的额外 commit，**不构成 reserve**
      （reserve 是留给「下一个」不可预见缺陷的）；
      ③ 独立证据表明同类缺陷**成批**而非单个暴露：`npm test` 是 `&&` 链，链首红遮蔽了链尾，
      ≥2 个既有红中本次只暴露 1 个（LL-3 / progress.md N7）→ 剩余未知 ≥1；
      ④ 故 bug_reserve = observed(1) + residual(1) = 2。
      另注：base = δ 的前提是「层内并行 task 合并为 1 commit」，本 Sprint 实测 L0 用了 2 个 commit
      （039811d = T1+T4，1c9d479 = T2），差额同样由 coupling_bonus / bug_reserve 与 hard_cap 余量承载。
  derived_commit_budget: 7             # base(4) + coupling_bonus(1) + bug_reserve(2)
  hard_cap: 10
  warn_threshold: 14                   # dag_layers*3 + bug_reserve = 12 + 2（> hard_cap → 见 §9 OQ9）
  over_cap: false
  # 实测校验（防「事后改常数合理化」，与 sync_watcher 反例的区别在于：先给出可复算的实数，再看公式是否覆盖）
  realized_check:
    commits_used_at_c43d36e: 5         # 428e41f(规划) + 039811d(T1+T4) + 1c9d479(T2) + 8696b02(T3) + c43d36e(T5)
    commits_required_by_T6_T7: 2
    total_required: 7                  # 5 + 2
    consistent: true                   # derived(7) ≥ total_required(7) 且 ≤ hard_cap(10)
    falsifier: >-
      若 bug_reserve 仍取 1 → derived = 5 < total_required 7 → 预算低于已实现需求，
      使 T6/T7 无法提交（blast-radius hook 直接拒绝），即该取值自相矛盾。
```

同步到 `progress.md` 的 `blast_radius.commit_budget: 7`（**由 5 修订而来；这是 hook 的强制读取字段，不改则 T6/T7 无法提交**）。

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
        【原期望（规划期，保留痕迹）】"exit 0 …通过即证明链首红已解除…" —— 该期望在 T6 前**不可达**。
        【T6 前的实测口径（c43d36e）】exit 1：链首 4 步全绿（installer 20/0/5 + CONSISTENCY OK +
        pressures + vision），链尾 `cd dsh/preset/plugins && node --test` 为 60 tests → 58 pass / 1 fail /
        1 skip，唯一红 = kix-focus.test.js:691（macOS os.tmpdir() 符号链接夹具缺陷）。
        【T6 后应达到】exit 0，且链尾恰为 60 tests → 59 pass / 0 fail / 1 skip。
        该 1 skip 是 kix-browser.test.js 的 real smoke（需 KIX_BROWSER_SMOKE=1），**非** pwsh 能力型 skip，
        不得与 LG1 的 skipped 5 混算（本 gate 对应 plugins 套件，LG1 对应 installer 套件）。
      required: true
      covers: [T1, T2, T4, T6]
    - id: LG6
      type: local_gate
      cmd: "cd en && npm test"
      expect: >-
        exit 0（英文包独立门禁；en 不含 sync-dsh-preset 测试）。
        【原期望（规划期，保留痕迹）】"exit 0（英文包独立门禁；en 不含 sync-dsh-preset 测试）"。
        【T6 前的实测口径（c43d36e）】exit 1：test:installer 12/12 + CONSISTENCY OK + bridge 20/20，
        链尾 `cd preset-classic-en/plugins && node --test` 为 36 tests → 34 pass / 1 fail / 1 skip，
        同一 kix-focus 夹具红（en 侧副本）。
        【T6 后应达到】exit 0，且链尾恰为 36 tests → 35 pass / 0 fail / 1 skip。
      required: true
      covers: [T2, T6]
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
    # ── 增量新增（2026-09-22）：把「被 && 链遮蔽的链尾套件」升为独立 required gate ──
    # 动机（实证，非推测）：本 Sprint LL-3 —— 链首红使链尾 4 步从未执行，T6 的红直到 T1/T2 修完才暴露。
    # cmd 与 package.json#scripts.test 第 5 段 / en/package.json#scripts.test 第 4 段**逐字相同**（非新增脚本）。
    - id: LG10
      type: local_gate
      cmd: "cd dsh/preset/plugins && node --test"
      expect: >-
        exit 0。T6 前：60 tests → 58 pass / 1 fail / 1 skip（红 = kix-focus.test.js:691）。
        T6 后：恰 60 tests → 59 pass / 0 fail / 1 skip。
        本 gate 是 T6 的**聚焦判据**：不经 && 链、不被链首遮蔽，计数直接可读。
      required: true
      covers: [T6]
    - id: LG11
      type: local_gate
      cmd: "cd en/preset-classic-en/plugins && node --test"
      expect: >-
        exit 0。T6 前：36 tests → 34 pass / 1 fail / 1 skip（en 侧同一夹具红）。
        T6 后：恰 36 tests → 35 pass / 0 fail / 1 skip。
        注：LG11 只覆盖 en 副本；`dsh/preset-classic/plugins` 与 `dsh/preset-null/plugins` 两个副本
        **无任何命令执行**，仅由 LG2 保证字节一致（缺口见 §9 OQ8）。
      required: true
      covers: [T6]
  ci_gate:
    - id: CG1
      type: ci_gate
      cmd: "gh pr checks <sprint-PR> -R olicesx/kixparadigm"
      expect: >-
        全部 check 为 success，且对应当前 Sprint HEAD（40 位 SHA）。
        注意：本地 origin 是 fork slchris/kixparadigm，该 fork 无 workflow 注册、无 run 历史，
        CI 只能在「fork → 上游 PR」路径上观测；无 PR 时本 gate 记 pending，不得记为 pass。
      required: true
      covers: [T1, T2, T3, T4, T6]
    - id: CG2
      type: ci_gate
      cmd: "gh run view <run-id> -R olicesx/kixparadigm --json conclusion,jobs"
      expect: >-
        conclusion == success；jobs 覆盖 6 个 matrix 组合
        （ubuntu-latest / windows-latest / macos-latest × node 20.16.0 / 22.x）；
        且 macOS job 的执行输出含 npm test 的真实运行记录与 "# skipped 0"
        （证明 macOS runner 真的跑了，而非仅一个绿勾）。
        【增量修订】T6 前本 gate **不可达**：macOS 上 kix-focus.test.js:691 确定性红（tmpdir 必为符号链接）
        → 该 job 必 fail；T6 后 6 组合才可能全 success。covers 因此加入 T6。
      required: true
      covers: [T3, T4, T6]
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
    # ── 增量新增（2026-09-22）：T6 的**独立判据**，刻意不依赖被修文件自身的断言 ──
    - id: MG5
      type: manual_gate
      cmd: "md5 -q dsh/preset/plugins/kix-focus.js dsh/preset-classic/plugins/kix-focus.js dsh/preset-null/plugins/kix-focus.js en/preset-classic-en/plugins/kix-focus.js dsh/preset/plugins/kix-focus.test.js dsh/preset-classic/plugins/kix-focus.test.js dsh/preset-null/plugins/kix-focus.test.js en/preset-classic-en/plugins/kix-focus.test.js"
      expect: >-
        前 4 行（4 个 kix-focus.js 产品副本）必须同为 52346442ca28b753ff9ad9ef7856242c
        （= baseline `git show c3c31eb:dsh/preset/plugins/kix-focus.js | md5 -q` 的值，已复核）→ 证明**产品源码零改动**。
        后 4 行（4 个 kix-focus.test.js 夹具副本）必须 4 行同值 → 证明 4 副本已字节同步（否则 LG2 会红）。
        并列判据（同一条证据的另一半）：`git diff --name-only c3c31eb..HEAD -- '**/kix-focus.js'` 输出必须为空。
      required: true
      covers: [T6]
    - id: MG6
      type: manual_gate
      cmd: "grep -n \"T6-evidence\" docs/sprint-1/progress.md"
      expect: >-
        progress.md 存在 T6-evidence 段，且**独立于被修文件的断言**给出三重证据：
        ① 独立探针（不经由 kix-focus.test.js，用 realpath 归一化的临时根复现同一 symlink 布局）输出
           `literal_equal: false` / `realpath_equal: true` / `resolved: true` → 产品 realpath 回退可用，红在夹具侧；
        ② **反例 control**：把 `resolveEntryCandidates` 的 realpath 回退在仓库外 scratch 副本中临时置空 → 同一场景
           `realpath_equal: false` → 证明该断言修后仍有区分力（不是恒真式、不是靠删断言/放宽条件变绿）；
        ③ diff 形态：`git diff c3c31eb..HEAD -- '*kix-focus*'` 中 `*.js` 零命中，`*.test.js` 只含路径归一化、
           无被删除的 `await ok(` 行、无被删除的 `viaRealpath` / `resolved` 合取项。
        **仅「测试转绿」不满足本 gate** —— 违反则 QA 拒签（同 MG3 口径）。
      required: true
      covers: [T6]

drift_whitelist:
  - pattern: "docs/**"
  - pattern: ".kixpower/**"
  - pattern: "**/*.md"
  - pattern: ".github/**"
  - pattern: "kix-discipline/**"
  - pattern: "**/*.test.js"
```

**L2 必需 gate 集合**（供 orchestrator 计算 `l2_gate_manifest_sha256`）：
`required: true` 的 local_gate = `[LG1, LG2, LG3, LG4, LG5, LG6, LG10, LG11]`（按 id 排序后规范化 `{id,type,cmd,expect,required}`）。
ci_gate / manual_gate 不计入 manifest digest，但计入 QA 签署证据。

**增量修订说明（2026-09-22）**：
- LG5/LG6 的 `expect` 已改写（T6 前/后双口径），**其 `id`/`cmd`/`required` 未变**；按 §L2 规则，gate manifest 变化会使旧 L2 整体失效——本 Sprint 的 L2 **尚未发生**（`l2_verification_passed: []`），故无失效代价，orchestrator 需按新集合重算 digest。
- 新增 LG10/LG11 为 **required**：动机是**实证过的**遮蔽失效（LL-3），把链尾套件从「被 `&&` 链遮蔽」提升为可独立判读，而不是新增测试机制（cmd 逐字取自既有 npm script 段落）。
- 新增 MG5/MG6 为 **required**（manual）：这是「不依赖被修文件自身断言」的独立判据通道；MG 不进 digest，但 QA 必须逐条给出结论。
- `drift_whitelist` 无需变更：T6 触碰的 4 个文件均命中既有 `**/*.test.js`（T7 的 `CHANGELOG.md` 命中 `**/*.md`），不会触发 goal-drift。
- 仍**不新增任何 npm script**；LG10/LG11 是既有脚本段落的逐字复用，不是新入口。

---

## 8. 交付物与责任人

| 产物 | 责任 | 说明 |
|---|---|---|
| 源码修复（T1–T5 的 4 个文件）| Dev | `scripts/sync-dsh-preset.test.js`、`scripts/install-lib.js`(+`en/` 镜像)、`.github/workflows/ci.yml`、`CHANGELOG.md` |
| **T6 夹具修复（增量，4 个副本同一改动）** | Dev | `dsh/preset/plugins/kix-focus.test.js`、`dsh/preset-classic/plugins/kix-focus.test.js`、`dsh/preset-null/plugins/kix-focus.test.js`、`en/preset-classic-en/plugins/kix-focus.test.js`；**`kix-focus.js` 产品源码不在交付面内（禁改）** |
| **T7 CHANGELOG 追加（增量）** | Dev | `CHANGELOG.md`（Sprint 1 条目补 T6 段；纯追加）|
| `docs/sprint-1/progress.md` 执行状态 / Trace Log | orchestrator（+ Dev 串行模式写任务行）| frontmatter 数值为结构化真相源 |
| `docs/qa/qa-signoff-1.md` | QA（Ivy）| 必含 MG1–MG6 结论、skip 明细（LG1 的 5 条 + 链尾 kix-browser real smoke 1 条，分别说明）|
| L2 证据（`l2_verification_passed` / `l2_verified_sha` / manifest digest）| orchestrator | 只有 orchestrator 可写；manifest 按新的 required 集合 `[LG1, LG2, LG3, LG4, LG5, LG6, LG10, LG11]` 重算 |
| `docs/sprint-1/done.md`、`PROJECT_BRIEF.md` §7/§8 | Producer | Sprint 收尾 |

---

## 9. 开放问题（未取证事项，不得当作已定结论）

| ID | 问题 | 影响 | 取证方式 |
|---|---|---|---|
| OQ1 | **T2 根因未确证**：观测为「第二次调用 `added+updated = 3`」，但 `Math.round(mtimeMs/1000)` 容差模型（两值截断误差 < 1ms 时数学上不可能跨 0.5s 边界）预测 0，秒级精度模型预测 ~50（`skills` 中 mtime 小数 ≥ 0.5 的文件数）。**两个模型都不预测 3** | 决定修哪一层；改错层会静默掩盖安装非幂等 | T2 步骤 A 的 `{added,updated,same,pruned}` 四元组分解 |
| OQ2 | `en/` 包基线未实测（orchestrator 只跑了主包 `npm test`）| 若 en 也红，属本 Sprint 范围内的新发现（en 有 `install-lib.js` 镜像但无 `ensureDefaultShelf` 测试）| **状态：已由实测回答（2026-09-22）**——`cd en && npm test` 实测 exit 1，链尾 36 tests → 34/1/1，红点与 zh 侧**同一夹具**（非新增缺陷）。结论：en 无 installer 幂等类新缺陷；剩余动作 = T6 后由 LG6 复验为 exit 0 |
| OQ3 | fork 无 workflow 注册：CI 是否仅在「fork → 上游 PR」路径触发？上游是否接受本 Sprint 的 PR | CG1/CG2 能否执行 | 用户决定 PR 路径后由 `gh pr checks` 验证。**增量补充**：T3 新增的 macOS job 只能在 PR 路径上被观测；且 **T6 前该 job 必 fail**（macOS tmpdir 符号链接确定性），故 OQ3 未解期间 CG1/CG2 记 pending，**不得**把"本地 LG5/LG6 绿"当作 CI 绿的替代证据 |
| OQ4 | 上游 `main` 已存在 `v1.3.17` 的 CI 失败 run（2026-09-13），本地 HEAD 停在 `v1.3.16` 的 `c3c31eb` | Sprint 的对照口径 | 合并前 rebase 并复跑全量 gate；若用户要求以上游最新为 baseline 需重估 |
| OQ5 | `macos-latest` 当前指向的镜像版本未取证（已取证的证据来自 `macos-15-Readme.md:152`）；若指向别的版本，「预装 pwsh」结论需重新取证 | 影响 T3 的预期（是否会复现 T1 的 3 条红）| 读取 `actions/runner-images` 的镜像标签映射。**增量补充**：T6 后 macOS job 的**成败判据不再依赖**该镜像是否预装 pwsh（两种情形都应为 success），但「T1 的 3 条 pwsh 用例在 macOS 上是否真跑」仍取决于它 → OQ5 对 T6 不再是阻塞项 |
| OQ6 | 本机无 pwsh → `verification-fidelity-check.ps1` 不可运行，drift-check 为手工 baseline 报告（`legacy/degraded`）| 无法量化上一 Sprint 门禁覆盖率 | Sprint 2 起评估 Node 等价实现 |
| OQ7 | `docs/.kixpower-current-sprint`（内容 `1`，untracked）与「工作树干净」的前提不符 | planning snapshot 的干净性判据 | 确认该 marker 是否应入库或加入 `.gitignore`。**状态：仍未解**（本次增量重规划前 `git status --short` 仍见该 untracked 项）|
| **OQ8**（增量新增） | **覆盖缺口**：`dsh/preset-classic/plugins` 与 `dsh/preset-null/plugins` 两个副本的 `kix-focus.test.js` **不被任何 npm script 执行**，仅由 LG2 保证字节一致 | 「4 副本」中实际只有 2 副本的可运行性被验证；字节一致 ≠ 可执行（语法/API 漂移仍可能只在未执行副本中潜伏）。本 Sprint **不扩范围**（T6 只做同构修夹具），但该缺口使 LG2 的强度被高估 | 只读证据：`package.json#scripts.test` 末段只 `cd dsh/preset/plugins`；`en/package.json#scripts.test` 末段只 `cd preset-classic-en/plugins`；全仓无任何 script 引用另外两根。处理方式见 §10 N8 |
| **OQ9**（增量新增） | **公式冲突**：`warn_threshold = dag_layers*3 + bug_reserve`。本 Sprint δ=4、bug_reserve=2 → 14，而 `hard_cap = 10` → **warn 通道结构性不可能先于硬上限触发**（δ=3、reserve=1 时恰为 10，即临界）| 「task 拆分过细」的预警机制在 δ ≥ 3 时失效；本 Sprint 只能靠人工判读，不能依赖 warn | 公式层复核（TEAM_CONVENTIONS §Task Sizing v5.0）；本 Sprint 先如实记录 14 并标 `over_cap: false`（derived 7 ≤ 10），不改公式、不静默 clamp。候选处理见 §10 N9 |

---

## 10. Sprint+1 候选（本 Sprint 不做）

| ID | 候选 | 触发条件 |
|---|---|---|
| N1 | 用 Node 重写 pwsh 依赖测试（Milo 方案）| 若本机 `sync-dsh-preset.ps1` 零覆盖在 Sprint 2 产生实际漏检 |
| N2 | `verification-fidelity-check.ps1` 的 Node 等价实现 | OQ6 未解决且 Sprint 2 需要量化门禁覆盖率 |
| N3 | Windows PowerShell 5.1 路径覆盖（`sync-dsh-preset.ps1` 声称 5.1/7 通用）| macOS 已入 CI 后，评估 5.1 分支是否只有 windows runner 覆盖 |
| N4 | kixpower hooks 在 DSH 下的机械承载缺口（`block-source-edit` 等 hook 不自动触发，仅靠 prompt 约束）| 出现越权编辑事故时 |
| N5 | baseline 对齐例行检查（本地 HEAD vs 上游 `main`）| OQ4 反复出现 |

**增量归位（2026-09-22）**：progress.md 中登记的两条执行期发现已由本次增量重规划**收回本 Sprint**，不再作为 Sprint+1 候选：

| ID | 原候选 | 归位结果 |
|---|---|---|
| ~~N6~~ | `kix-focus.test.js:691` 夹具改用 realpath 归一化比较 | **已提升为本 Sprint 的 T6**（其阻塞 G-B/CG2 的证据成立 → 不满足"本 Sprint 不做"的条件）。范围严格限定为 4 个夹具副本，`kix-focus.js` 仍禁改 |
| ~~N7~~ | 把「本机 macOS 链尾红」纳入例行本地门禁判读（`&&` 链首红会遮蔽**多于一个**既有缺陷）| **已由本 Sprint 的 LG10 / LG11 承载**：链尾两个套件升为独立 required local_gate，不再被链首遮蔽。残余部分（"以后还会有第三个被遮蔽的红"）无法事先枚举，属监测项而非候选 |

**本次增量新增的 Sprint+1 候选**：

| ID | 候选 | 触发条件 |
|---|---|---|
| N8 | 让 4 个 preset 根的 `plugins` 套件**全部可执行**（例如一条遍历式 gate），补上 `preset-classic` / `preset-null` 两副本「只被 LG2 守护字节一致、从不运行」的缺口 | OQ8；若出现「字节一致但不可运行」的实际漏检，或 4 副本间出现仅在运行期暴露的差异 |
| N9 | `task_sizing` 公式的 `warn_threshold` 与 `hard_cap` 冲突（δ≥3 时 warn 结构性不可达，见 OQ9）→ 属 kixpower 框架层（TEAM_CONVENTIONS v5.0）的公式复核/收紧 | 下一个 δ≥3 的 Sprint 仍无法给出有效预警时；或累计 2 个 Sprint 出现 `derived_commit_budget` 被实测需求顶满（本 Sprint 即第 1 例）|
