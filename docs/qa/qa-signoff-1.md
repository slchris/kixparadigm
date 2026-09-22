---
sprint: 1
sprint_name: 测试基线健康（测试基线健康 / gate 双口径 + 安装器幂等根因修复）
qa_agent: Ivy (kixpower-qa)
signed_at: 2026-09-22
branch: feature/sprint-1-test-baseline
qa_started_sha: a3cdfb18b55ee16027bf268e6de7472343a611d2
qa_verified_sha: a3cdfb18b55ee16027bf268e6de7472343a611d2
l2_verified_sha: a3cdfb18b55ee16027bf268e6de7472343a611d2
l2_gate_manifest_sha256: 46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb
qa_gate_manifest_sha256: 46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb
qa_gate_manifest_recompute: not_reproduced_locally   # 见 §8 R-1：canonical 实现依赖 pwsh（本机无），96 组候选规范化均不匹配；集合/manifest 源内容已独立核对
qa_test_changes: []
ci_pending: true
status: CONDITIONAL
l2_stash_refs_expected: []
l2_gate_manifest_source: docs/sprint-1/plan.md §7（@ a3cdfb1，工作树未修改）
---

# QA Sign-off — Sprint 1（测试基线健康）

> **状态：`CONDITIONAL`**（唯一理由 = `ci_gate` pending；`ci_pending: true`）。
> 依据：`local_gate` 权威结果 ✅（L2 @ `a3cdfb1`，QA 未重跑全量，仅核对集合/manifest/revision）
> + `manual_gate` MG1–MG6 全部 ✅ + `ci_gate` CG1/CG2/CG3 pending（本机无 CI 可观测通道）。
> **本报告不含任何 PASS 声明**：CI 未验证前不构成发布证据。

---

## 1. Revision 与信任链绑定（QA 实测）

| 检查 | 期望 | 实测 | 结论 |
|---|---|---|---|
| `qa_started_sha == HEAD` | 同一 40 位 SHA | `a3cdfb18b55ee16027bf268e6de7472343a611d2` == `a3cdfb18b55ee16027bf268e6de7472343a611d2`（`git rev-parse HEAD`）| ✅ |
| `l2_verified_sha == HEAD` | 同一 revision | `a3cdfb1…`（`progress.md:34`） == HEAD | ✅ |
| session marker 快照 | `docs/.kixpower-qa-session.json` 记录同一 SHA | marker 的 `l2_verified_sha`/`qa_started_sha` 均为 `a3cdfb1…`、`l2_stash_refs: []`（QA 未编辑该文件）| ✅ |
| `l2_stash_refs == 当前 stash 集合` | 相等 | `git stash list --format=%H` 输出为空；marker `stash_refs_at_handoff: []` | ✅ |
| required local_gate 集合 | `== l2_verification_passed` | plan §7 `required: true` 的 local_gate = `[LG1,LG2,LG3,LG4,LG5,LG6,LG10,LG11]`（QA 独立解析 YAML 块）= `progress.md:33` = marker | ✅ |
| manifest 源未被改动 | plan.md 在 L2 后无改动 | `git status --porcelain` 仅 `M docs/sprint-1/progress.md`；plan.md 干净（`a3cdfb1` 提交内容）| ✅ |
| L2 后无测试/fixture 变更 | `qa_test_changes: []` | 工作树唯一修改 = progress.md 5 行 frontmatter 元数据（`observe_fingerprint` + `l2_*` 四字段，`git diff` 实读）；**无任何 `*.test.js`/源码/fixture/构建/gate 命令变更** | ✅ |
| QA 自身未留改动 | QA 不改业务源码/测试 | QA 仅新增本文件；探针/control/A-B 脚本全部位于仓库外 `/tmp/qa-ivy-t6/`；临时 worktree 已 `git worktree remove` | ✅ |

> **声明**：`docs/sprint-1/progress.md` 的 L2 字段是**未提交的工作树修改**（Orchestrator 依 §L2 写入）→ 本报告的 L2 证据来源是该工作树内容，不是某个 commit；内容经 QA 逐行 diff 核对，只含元数据（见上表第 7 行）。登记为观察项 F-6。

## 2. 客观门禁结果

> **执行边界（实测声明）**：QA **未重跑全部 local_gate**。为满足 MG1/反方辩护的取证需要，
> QA 运行了 LG1 的**同命令内容**（`node --test scripts/install-lib.test.js scripts/sync-dsh-preset.test.js`，分别运行）
> 与 LG10 的**单文件子集**（`node dsh/preset/plugins/kix-focus.test.js`、`node --test dsh/preset/plugins/kix-browser.test.js`）
> ——结果与 L2 记录**一致**（见 §5/§6），不改变任何 gate 结论。
> 同一会话末尾（交付前复确认，非签署依据的初测）QA 另跑了 **LG2** `npm run test:consistency` → `CONSISTENCY OK`、exit 0
> （该守护内置仓内全部 JS/CJS/MJS 语法检查：`scripts: 16`、`dsh/preset: 35`、`en/preset-classic-en: 26`、`dsh/vision-bridge: 3`、`en/bridge: 3` 全 OK）。
> 上述复确认命令的退出码均为 **0**，与 L2 记录口径一致。其余 local_gate（LG3/LG4/LG5/LG6/LG11）未由 QA 重跑。

| gate | type | 结论 | 证据 |
|---|---|---|---|
| LG1 `npm run test:installer` | local_gate | **pass**（L2 权威 @a3cdfb1）| `progress.md:33`；QA 取证复算：installer 套件 25 tests → **20 pass / 0 fail / 5 skip**（下表 §4）|
| LG2 `npm run test:consistency` | local_gate | **pass**（L2 权威 + QA 复确认）| `progress.md:33`；QA 机械复核 4 副本夹具 md5 同值（§7 MG5）；QA 复跑 `npm run test:consistency` → `CONSISTENCY OK`，exit 0（含仓内 JS 语法检查全 OK）|
| LG3 `npm run test:pressures` | local_gate | **pass**（L2 权威）| `progress.md:33`（QA 未重跑）|
| LG4 `npm run test:vision` | local_gate | **pass**（L2 权威）| `progress.md:33`（QA 未重跑）|
| LG5 `npm test` | local_gate | **pass**（L2 权威；exit 0，链尾 60 → 59/0/1）| `progress.md:28,33`；QA 子集复核链尾套件单文件 139/0（§6 反方辩护）|
| LG6 `cd en && npm test` | local_gate | **pass**（L2 权威；exit 0，链尾 36 → 35/0/1）| `progress.md:29,33`（QA 未重跑）|
| LG10 `cd dsh/preset/plugins && node --test` | local_gate | **pass**（L2 权威；60 → 59/0/1）| `progress.md:33`；QA 子集：`kix-focus.test.js` 139/0 + `kix-browser.test.js` 22 tests → 21 pass/1 skip（唯一 skip = `KIX_BROWSER_SMOKE=1` opt-in，`kix-browser.test.js:473`）|
| LG11 `cd en/preset-classic-en/plugins && node --test` | local_gate | **pass**（L2 权威；36 → 35/0/1）| `progress.md:33`（QA 未重跑）|
| **CG1** `gh pr checks <sprint-PR>` | ci_gate | **pending** | QA 实测：`gh workflow list -R slchris/kixparadigm` **空**、`gh run list -R slchris/kixparadigm` **空**（fork 无 workflow 注册）；上游 `olicesx/kixparadigm` 无 `a3cdfb1` 的 run（见下）；本机无 PR 路径且**用户未授权 push/PR** |
| **CG2** `gh run view <run-id>`（6 组合 success + macOS 真跑）| ci_gate | **pending** | 同上；上游最近 3 条 run 的 `headSha` = `5376d6c…`(failure) / `df3e590…`(failure) / `c3c31eb…`(success, baseline) —— **均非本 Sprint HEAD** |
| **CG3** `gh run list --workflow=ci.yml`（CG1 降级通道）| ci_gate（`required: false`）| **pending** | 同上 |

**CG pending 的判定依据（QA 自证，非转述）**：
`gh run list -R olicesx/kixparadigm --limit 3 --json headSha,status,conclusion,workflowName` →
`[{"conclusion":"failure","headSha":"5376d6c9184d811e39df56604c3e732d0c4ce0b7",…},{"conclusion":"failure","headSha":"df3e590fbc816525d67b560fa6cdfadacb4e2e09",…},{"conclusion":"success","headSha":"c3c31eb3268622358761cb2035ec84810a12ca11",…}]`。
`a3cdfb1` 无任何 run → **CG1/CG2/CG3 只能记 pending，不得记 pass**（与其他 revision 的 failure run 无关，但登记为观察项 F-7）。

## 3. manual_gate 明细

### MG1 — 5 条 skip 逐条登记（两类语义可区分）✅ pass

`grep -n "t.skip" scripts/sync-dsh-preset.test.js` → **恰 5 处调用点**（45/73/100/127/156 行，每用例一处）；
`node --test scripts/sync-dsh-preset.test.js` → `# tests 5 / # pass 0 / # fail 0 / # skipped 5`。

| # | 用例名 | 源码调用点 | 语义分类（源码）| 本机（macOS，无 pwsh）实测输出 |
|---|---|---|---|---|
| 1 | sync expands repository directory pointers into materialized targets | `:45` | 能力型 | `# SKIP SKIP: pwsh unavailable — pwsh not found on PATH` |
| 2 | sync preserves ordinary files whose content names a directory | `:73` | 能力型 | `# SKIP SKIP: pwsh unavailable — pwsh not found on PATH` |
| 3 | sync expands an explicitly declared native directory symlink | `:100` | 平台型 \| 能力型（注解 `:100`）| 本机走能力型：`# SKIP SKIP: pwsh unavailable — pwsh not found on PATH` |
| 4 | sync rejects a case-variant sibling as outside the bundle on POSIX | `:127` | 平台型 \| 能力型（注解 `:127`）| 本机走能力型：同上 |
| 5 | sync fails closed for missing or out-of-source declared pointers | `:156` | 能力型 | `# SKIP SKIP: pwsh unavailable — pwsh not found on PATH` |

**两类语义可区分的机制（源码证据）**：`scripts/sync-dsh-preset.test.js:18-19` 定义两个机器可识别前缀
`SKIP_WINDOWS_ONLY = 'SKIP: windows-only — '` 与 `SKIP_PWSH_UNAVAILABLE = 'SKIP: pwsh unavailable — '`；
`:34-41` 的 `pwshGuard(platformReason)` 中平台型分支以 `process.platform === 'win32'` 判定并**优先**返回，
能力型分支以探针 `probe.error.code === 'ENOENT'` 判定；**探针存在但退出码非 0 不构成 skip**（`:30`，交调用方断言暴露）。
本机 `process.platform === 'darwin'` → 5 条全部落入能力型分支（用例 3/4 的平台型原因不适用）。
→ 两类语义在**同一函数内分支可区分**，但**本机只能观测到能力型一类**；平台型的真实触发只能由 win32 宿主观测（见 §8 R-4）。

> **红线声明：本机 `pass 20 ≠ 用例总数 25`，`skip` 不计为通过。** 本机 `npm run test:installer` 的有效通过面
> 是 `install-lib.test.js` 20 条（20/0/0）+ `sync-dsh-preset.test.js` **0 条**；后者的 5 条在该宿主上
> **完全没有执行任何断言**。CI（预装 pwsh）口径应为 25/0/0，该口径由 CG2 验证（当前 pending，见 §8 R-2）。

### MG2 — CHANGELOG 纯追加 ✅ pass

| 检查 | 命令 | 结果 |
|---|---|---|
| 是否为纯追加 | `git diff --numstat c3c31eb..HEAD -- CHANGELOG.md` | `58  0  CHANGELOG.md` → **58 追加 / 0 删除** |
| 是否有被覆写的历史行 | `git diff c3c31eb..HEAD -- CHANGELOG.md \| grep -E "^-" \| grep -v "^---"` | **无输出**（无删除行）→ 历史条目数字**逐字未改** |
| 门禁数字是否标注测量平台 | 实读追加内容 | ✅ 条目头显式声明「**本机** = macOS + node v22.14.0 + **无 `pwsh`**；**CI** = ubuntu/windows/macos runner（三者镜像均预装 `pwsh`）」；本机口径 `20/0/5` 与 CI 口径 `25/0/0` 并列 |
| 已被反证的声称是否有勘误/限定 | 实读追加内容 | ✅ 两条：`平台限定（Sprint 1…）`（v1.3.15「59 pass/0 fail/1 skip」未标平台）与 `勘误（Sprint 1…）`（v1.3.13「保留 mtime 幂等」/「install-lib 20/20」被实测反证）——均**追加**于 Sprint 1 条目内，历史条目原文保留 |
| 是否宣称 CI 已绿 | grep 追加内容 | ✅ 显式写「**CI（CG1/CG2）仍 pending**：本节只陈述本机实测，不构成 CI 已绿的证据」 |

### MG3 — T2 取证（独立于测试断言）✅ pass

| 判据 | 证据 | 结论 |
|---|---|---|
| `T2-evidence` 行存在（四元组）| `progress.md:219-221`：`T2-evidence: added=0 updated=3 same=60 pruned=0` / `-cold: added=63 …` / `-third: added=0 updated=3 same=60 pruned=0` | ✅ |
| 失配文件 `(相对路径, size, mtimeMs)` 对照表 | `progress.md:224-228`：3 行，`src.size == dst.size`，`src.mtimeMs` ∈ {…499.546, …499.7085, …499.8994} | ✅ |
| **修复层与根因一致**（QA 独立复核，非采信）| `git diff c3c31eb..HEAD -- scripts/install-lib.js`：修复仅落在**写侧** `copyFileKeepingMtime`（`fs.utimesSync(d, st.atime, st.mtime)` → `fs.utimesSync(d, st.atimeMs/1000, st.mtimeMs/1000)`，`scripts/install-lib.js:197`）；比较侧 `Math.round(a.mtimeMs/1000) === Math.round(b.mtimeMs/1000)`（`:235`）**未改**（该行 diff 只改注释）| ✅ |
| 根因机制独立复现 | QA 微探针（`node` v22.14.0，仓库外）：源 `mtimeMs=1790060295499.8994` → 数值秒写回 `…499.899`（桶 `1790060295` 保持）；`Date` 形态写回 `…500.000`（桶 `1790060296`）→ `date_write_rounds_up_across_bucket: true`、`numeric_write_keeps_bucket: true`。即损失源是 **`Date` 的毫秒四舍五入**，不是注释曾假设的「utimes 只有秒级精度」 | ✅ |
| 「3/63 越界」可复算 | QA 只读 stat 扫描主仓 `dsh/preset-classic/skills` = **63 文件**，落在失败带 `[x.4995, x.500)` 的 = **3 个**，且 mtimeMs **逐值等于** `progress.md:226-228` 记录的三个值 | ✅ |
| **受控 A/B（红→绿归因于修复，而非 mtime 状态漂移）** | 仓库外 worktree（baseline `c3c31eb`），同一 3 个文件的 mtime 置为记录带内值（读回 `in_band_count: 3`）：**baseline `install-lib.js` → 19 pass / 1 fail**（`not ok 13 ensureDefaultSkillsShelf materializes classic shelf when dest has none`）；把 `scripts/install-lib.js` 换成 HEAD 版本（测试文件两 revision 间逐字相同，`git diff --name-only c3c31eb..HEAD -- scripts/install-lib.test.js` 空）→ **20 pass / 0 fail**，mtime 带仍为 3 | ✅ 修复层正确且**充分** |

### MG4 — `install-lib.js` 字节镜像 ✅ pass

```
md5 -q scripts/install-lib.js en/scripts/install-lib.js
a72674afb96399cf530f7e0ef7fde4da
a72674afb96399cf530f7e0ef7fde4da
```
两行相同 ✅（与 baseline 值 `c53b119…` 不同属预期：T2 修改了该文件，两侧同步）。

### MG5 — `kix-focus.js` 产品零改动 + 夹具 4 副本字节同步 ✅ pass

| 检查 | 命令 | 结果 |
|---|---|---|
| 产品 4 副本 md5 | `md5 -q dsh/preset/plugins/kix-focus.js dsh/preset-classic/plugins/kix-focus.js dsh/preset-null/plugins/kix-focus.js en/preset-classic-en/plugins/kix-focus.js` | `52346442ca28b753ff9ad9ef7856242c` ×4 —— 等于计划值 ✅ |
| 与 baseline 产品值比对 | `git show c3c31eb:dsh/preset/plugins/kix-focus.js \| md5 -q` | `52346442ca28b753ff9ad9ef7856242c`（同值）→ **产品源码零改动** ✅ |
| 产品文件 diff（并列判据）| `git diff --name-only c3c31eb..HEAD -- '**/kix-focus.js'` | 空输出 ✅ |
| 夹具 4 副本 md5 | 同一命令（后 4 个路径）| `8f87e48f8ab27660decb66e5aab032a5` ×4 → 字节同步 ✅（baseline 值 `4a11c76e45eb9aebe1534beb5f611c48`，与 T6 前不同属预期）|
| 未被任何命令执行的 2 副本实际可用性（QA 加验，补 OQ8）| `node dsh/preset-classic/plugins/kix-focus.test.js` / `node dsh/preset-null/plugins/kix-focus.test.js` | 均 `139 passed, 0 failed` ✅ |

### MG6 — T6 三重独立证据（QA 自建探针，不复述 Dev 输出）✅ pass

| 判据 | QA 实测 | 结论 |
|---|---|---|
| ① 独立探针（不经由 `kix-focus.test.js`）| QA 自写 `/tmp/qa-ivy-t6/probe.js`（仓库外）在 realpath 归一化场景下直接调 `kix-focus.js` 的 `__internals`：`tmpdir=/var/folders/…`、`tmpdir_is_symlinked: true`、**`literal_equal: false`**、**`realpath_equal: true`**、`realpath_equivalent_in_candidates: true`、**`resolved: true`** | ✅ 红在夹具侧（字面比较），产品链可用 |
| ② 反例 control（仓库外 scratch，防「删断言/放宽条件变绿」）| QA 用自己的生成器（逐行定位，未命中则 exit 2）把 `resolveEntryCandidates` 的 realpath 回退置空（`kix-focus-noRealpath.js`，与 HEAD 产品**仅 1 行不同**，`node --check` OK，`realpathSync(entry)` 出现 0 次）→ 同场景 **`realpath_equal: false`** | ✅ 修后断言**仍有区分力**，非恒真式 |
| ③ diff 形态 | `git diff c3c31eb..HEAD -- '**/kix-focus.test.js'`：删除行**仅 4 行**，全部是 `const tmp = fsSync.mkdtempSync(path.join(osMod.tmpdir(), 'kix-focus-res-'))`（每副本 1 行）；`grep -E "^\+.*(return true\|>= 2\|t\.skip\|assert\.ok\(true)"` → **无命中**；`grep -c "^-.*await ok("` → **0**；`kix-focus.test.js:728` 返回式 `return viaRealpath && resolved === true` **两个合取项完整保留**；断言/`await ok(` 计数 baseline 144 == HEAD 144 | ✅ 仅路径归一化，语义未放宽 |

## 4. 独立复核（不采信 Dev/orchestrator 自述的三条 claim）

| # | claim | QA 独立结论 | 证据 |
|---|---|---|---|
| a | 「T6 只是夹具路径归一化，产品零改动」 | **成立** | T6 diff 实读：唯一实质改动是 `mkdtempSync(...)` → `realpathSync(mkdtempSync(...))`（4 副本各 1 行 + 注释）；`viaRealpath && resolved === true`（`:728`）两合取项都在；**0 行被删的 `await ok(`**；**无** `return true` / `>= 2` / `\|\|` 兜底 / `t.skip` 新增；产品 4 副本 md5 == baseline 值且 `git diff --name-only c3c31eb..HEAD -- '**/kix-focus.js'` 为空。相对路径归一化对语义的影响：归一化**同时作用于** `linkDir` 与 `realEntry` 的派生根，二者仍同处一个符号链接根的语义下（`c.includes(realpathSync(realEntry))`），断言验证的仍是「realpath 候选链可用」，只是不再要求「字面路径相等」——即修的是 macOS `/var`→`/private/var` 的**路径字符串归一化**，不是放宽语义。（QA 曾专门检查「`return I.resolveEntryCandidates('/x').length >= 2` 弱兜底」：该分支位于 `:703-709`，**baseline 已存在**（`git show c3c31eb:…` 同处可见）、本 Sprint 未触碰、本机未触发（`symlink_created: true`）→ 记为观察项 F-2，不构成本 claim 的反证） |
| b | 「本机 5 条 skip 全是能力型（无 pwsh）而非掩盖失败」 | **成立，但需精确表述** | 源码实读：5 条用例的跳过条件全部经由 `:34-41` 的 `pwshGuard()`；本机 `process.platform !== 'win32'` → 平台型分支不触发；探针 `spawnSync('pwsh', …)` 返回 `ENOENT`（`command -v pwsh` 为空）→ 能力型分支触发 5/5。**「不是掩盖失败」的关键判据（QA 实测的 A/B）**：baseline 同文件同宿主为 `# pass 0 / # fail 3 / # skipped 2`（我实测），HEAD 为 `# pass 0 / # fail 0 / # skipped 5` —— 新增的 3 条 skip 在 baseline 是**失败**用例，不存在「由 pass 转 skip」的覆盖置换；且这 5 条在具备 pwsh 的宿主（CI 三镜像按仓库证据预装）会**真跑**（探针非 ENOENT → 不 skip → 执行断言，`assert.equal(probe.status, 0, …)`），该 CI 侧结论由 CG2 pending 验证 |
| c | 「kix-focus 红是 baseline 既有、非本 Sprint 引入」 | **成立** | QA 在仓库外 worktree（`git worktree add --detach /tmp/qa-ivy-baseline c3c31eb`，HEAD == `c3c31eb`，夹具 md5 == `4a11c76e45eb9aebe1534beb5f611c48`）实跑：`kix-focus: 138 passed, 1 failed`，失败用例名 `FAIL symlink 部署（WSL2 实测 bug 场景）: realpath 候选解析成功`；同文件 @HEAD（主仓，夹具 md5 `8f87e48f…`）：`139 passed, 0 failed`。**用后已 `git worktree remove --force` 清除，无残留、HEAD/分支/stash 未变**（`git worktree list`、`git status --porcelain`、`git stash list` 均已复核）|

## 5. 反方辩护测试（证据门禁）——`npm test` exit 0 是否只是「跳过变多」的假绿？

**结论：不是。** 用计数逐项对上（每一格均为 QA 实测或明确标注为 L2 权威记录）：

| 套件 / 口径 | baseline `c3c31eb`（QA 实测）| HEAD `a3cdfb1`（QA 实测或标注）| 变化解读 |
|---|---|---|---|
| `scripts/sync-dsh-preset.test.js` | 5 tests → 0 pass / **3 fail** / 2 skip | 5 tests → 0 pass / 0 fail / **5 skip** | skip +3，但被转 skip 的 3 条 baseline 是 **fail**，**无 pass→skip 置换** |
| `scripts/install-lib.test.js` | 20 tests → 20 pass / 0 fail / 0 skip（fresh checkout 的 mtime 状态；带内 mtime 下为 19/1，见 §3 MG3 A/B）| 20 tests → **20 pass** / 0 fail / 0 skip | pass 持平；T2 修复使带内 mtime 场景由 1 fail → 0 fail（A/B 已证） |
| `npm run test:installer`（合计 25）| （fresh）20 / 3 / 2；（带内 mtime）19 / 4 / 2 | **20 / 0 / 5**（QA 实测）| **skip 净增只发生在原本 fail 的用例上** |
| `dsh/preset/plugins/kix-focus.test.js` | 138 pass / **1 fail** / 0 skip | **139 pass / 0 fail** / 0 skip | **skip 未增加、pass +1**（真修复） |
| `dsh/preset/plugins/kix-browser.test.js` | （未单独实测 baseline）| 22 tests → 21 pass / **1 skip**（`:473` `{ skip: process.env.KIX_BROWSER_SMOKE !== '1' }`）| 该 1 skip 是 **opt-in 真浏览器 smoke**，与 pwsh 能力无关；baseline 链尾同为 1 skip 系**采信** L2 记录口径（`progress.md:103` 的 `60/58/1`），QA 未重跑整链 |
| 全 diff 断言减量审计 | — | `git diff c3c31eb..HEAD \| grep -E "^-"` 删除行全集 = T6 的 4 行路径构造 + `sync-dsh-preset.test.js` 的守卫脚手架（4× `return`、2× `if (process.platform === 'win32') {`、2× ENOENT 判断、2× `t.skip(...)`、2× 探针行）；**无任何 `assert.*` / `await ok(` 删除行**（`sync-dsh-preset.test.js` 断言数 22 → **25**，`kix-focus.test.js` 144 → **144**）| **没有靠删断言变绿** |

**「pass 数净增」判断依据**：链尾两套件（LG5/LG6 末段）skip 恒为 1（opt-in smoke），pass 由 58→59、34→35 净增；
installer 套件 skip 由 2→5 而 pass 由 19→20（带内 mtime 口径）——**新增 skip 全部来自原本失败的用例**，
且这些用例在具备 pwsh 的宿主（CI）会实际执行。故 `exit 0` 由「3 条能力型守卫 + 1 条 T2 真修复 + 1 条 T6 夹具修复」构成，
**不存在「跳过变多导致假绿」**。

**（反方视角的诚实补充）** 本机 `pass 20 ≠ 25` 这一事实本身**不能**支撑「安装器被完整验证」的结论：
本机对 `sync-dsh-preset.ps1` 的 5 条用例覆盖 = **0**。真正的覆盖证据只能来自 CG2（CI 预装 pwsh）。

## 6. 门禁集合 / 范围与漂移

| 检查 | 结果 |
|---|---|
| required local_gate 集合 = plan §7 = `l2_verification_passed` | ✅ `[LG1,LG2,LG3,LG4,LG5,LG6,LG10,LG11]`（QA 独立解析 plan.md §7 YAML 块）|
| 全部改动是否在 `in_scope`/`drift_whitelist` 内 | ✅ `git diff --name-only c3c31eb..HEAD` 共 18 个文件，逐一映射：T2 → `scripts/install-lib.js` + `en/scripts/install-lib.js`；T1/T4 → `scripts/sync-dsh-preset.test.js`；T3 → `.github/workflows/ci.yml`；T5/T7 → `CHANGELOG.md`；T6 → 4 个 `kix-focus.test.js`；规划产物 → `PROJECT_BRIEF.md`、`docs/**`、`.kixpower/**`、`docs/qa/.gitkeep`。**无范围外源码改动**（`dsh/**/*.js` 非测试文件 = 0）|
| commit 粒度 | 7 个 commit 全部带任务前缀（`test:`/`fix:`/`ci:`/`docs:`），`fix:` 仅 2 个（T2/T6），与 `commit_budget: 7` 一致 |
| 探测到的文档漂移（非阻塞）| `PROJECT_BRIEF.md` §6 仍写 CI matrix = `[ubuntu-latest, windows-latest] × [20.16.0, 22.x]`，与 HEAD `.github/workflows/ci.yml`（含 `macos-latest`，6 组合）不一致 → closeout 刷新项（登记 F-5）|

## 7. Findings（QA 独立发现，按证据门禁定级）

| ID | 严重级别 | 内容 | 证据 | 处置 |
|---|---|---|---|---|
| F-1 | **P2 / minor** | **T2 幂等用例非 hermetic**：其红/绿取决于**未入库的工作树 mtime 状态**。fresh checkout 的 `dsh/preset-classic/skills` 63 文件中落在失败带 `[x.4995,x.500)` 的为 **0** → baseline 在该 checkout 上 **20 pass / 0 fail**（我实测）；只有把 mtime 置为记录带内值才复现 **19/1**。**影响**：CI（fresh checkout）与任何新克隆大概率**不触发**这条断言的真实分支 → LG1 在 CI 的绿**不足以**证明幂等路径被验证；Dev 报告的「baseline 19/1」依赖具体机器状态，不可跨机复现。**非本 Sprint 引入**（baseline 代码 + baseline 夹具，同一测试文件两 revision 逐字相同）| §3 MG3 A/B（`in_band_count: 0` → 20/0；置带内 → 19/1；换 HEAD 代码 → 20/0）；主仓 `3/63` 且 mtimeMs 与 `progress.md:226-228` 逐值相同 | **不阻塞本 Sprint 签署**（HEAD 代码已消除该缺陷类）；建议登记 Sprint+1：把 mtime 边界做成 fixture 内的**确定性输入**（复制前显式 `utimesSync` 源到带内值），使该断言在任意 checkout 上都有区分力 |
| F-2 | P3 / info | `kix-focus.test.js:703-709` 的 symlink 创建失败降级分支 `return I.resolveEntryCandidates('/x').length >= 2` 是近恒真的弱断言（记录了「受限环境退化」但形态上是「通过」）。**baseline 已存在**，本 Sprint 未触碰，本机未触发（`symlink_created: true`）| `git show c3c31eb:dsh/preset/plugins/kix-focus.test.js` 同处可见；QA 探针输出 | 登记观察项，Sprint+1 可考虑改为显式 `t.skip` 语义 |
| F-3 | P3 / info | `l2_gate_manifest_sha256` 未能在本机**字节级复算**（见 §8 R-1）| 80 组主候选规范化（另含 CRLF 变体）均不匹配；canonical 实现 `Get-KixGateManifestJson` 依赖 pwsh（`skills/kixpower/scripts/kixpower-contract.ps1:173-185`），本机无 pwsh | 不阻塞（集合与内容已独立核对）；falsifier 见 R-1 |
| F-4 | P3 / info | `.git/worktrees` 残留 orchestrator 的 `/private/tmp/kix-baseline-wt`（detached @ `c3c31eb`）——非 QA 产物，QA 未触碰 | `git worktree list` | 交 Orchestrator 收尾清理（QA 不越权删除） |
| F-5 | P3 / info | `PROJECT_BRIEF.md` §6 的 CI matrix 描述落后于 HEAD（缺 `macos-latest`）| §6 表 | closeout 更新 §7/§8 时一并刷新 |
| F-6 | P3 / info | L2 证据（`l2_verified_sha`/`l2_gate_manifest_sha256`/`l2_stash_refs`）以**未提交**的工作树修改形式存在于 `progress.md`；内容经 QA 逐行 diff 核对仅含元数据 | `git diff -- docs/sprint-1/progress.md`（5 行）| 依 §L2 属 Orchestrator 的写入约定；提示收尾时随 Sprint 提交固化 |
| F-7 | P3 / info | 上游 `olicesx/kixparadigm` 存在**非本 revision** 的 CI failure run（`5376d6c`、`df3e590`）| `gh run list -R olicesx/kixparadigm --limit 3` | 与本 Sprint 无关（不同 headSha），登记备查 |

> **无 P0/P1 finding。** 本 Sprint 未发现「修复不成立 / 断言被放宽 / 产品被误改 / 范围外源码改动」类问题；
> 唯一的 P2 是**既有**测试的 hermetic 性缺陷（对本次签署不构成阻塞，但削弱 CI 侧证据强度，见 R-2）。

## 8. 残余不确定与 falsifier（不得当作已结论）

| ID | 残余不确定 | 当前证据状态 | Falsifier（可判定） |
|---|---|---|---|
| R-1 | `qa_gate_manifest_sha256` 的**字节级**正确性 | **未证实**：QA 独立解析 plan §7 得到 required 集合与 plan/`l2_verification_passed`/marker 三方一致，并在 4 类规范化族（JSON compact/默认/缩进、行式、PS `ConvertTo-Json -Compress` 语义、`ensure_ascii` × HTML 转义 × 排序 × 换行后缀）共 **80 组主候选（另含 CRLF 变体）** 下**均未复算出** `4612165…`。canonical 实现依赖 pwsh（本机无）→ 无法排除是 QA 的 `expect` 提取差异还是 digest 记录有误 | 在具备 `pwsh` 的宿主上按 `kixpower-contract.ps1:173-185`（`Sort-Object id` + `ConvertTo-Json -Compress -Depth 4` + UTF-8 SHA-256）复算：**应等于** `46121655fd8f5367052aa6c73b56a529ceb7cc966fba6390ba7b36f7b5a531cb`；不等即 digest 记录有误 → L2/QA 需重绑 |
| R-2 | CI 侧「5 条 pwsh 用例真跑、`skipped 0`」 | **未证实**（CG2 pending）：依赖外部平台语义（ubuntu/macos runner 预装 pwsh），仓库内证据为 `runtime-context.md:39-40`、`lessons-learned.md:11`（引 `actions/runner-images` README 行号），**QA 未独立取证**（本机 web 取回 raw README 失败：hostname 解析到非公网 IP）| CG2：macOS/ubuntu job 的 `npm test` 日志中出现真实运行记录与 `# skipped 0`；若某 runner 无 pwsh，则 5 条会静默 skip → 该 gate 应在 CI 侧改为显式断言 skip==0 |
| R-3 | win32「平台型 skip」语义在本机不可观测 | 仅源码分支可读（`:35-37`），本机 `process.platform=darwin` → 0 次触发 | windows-latest runner 日志（CG2 的 6 组合含 windows）或 Windows 宿主实跑 |
| R-4 | 本机 `npm test` 全链退出码 | **未由 QA 重跑**（LG5 采信 L2 记录 60→59/0/1，exit 0）；QA 只复核了链尾单文件子集（139/0）与 installer 子集（20/0/5）| 在 `a3cdfb1` 上执行 `npm test` / `cd en && npm test` 应 exit 0 且链尾计数为 60→59/0/1 与 36→35/0/1 |

## 9. 签署结论

```text
status: CONDITIONAL          # 状态机合法值（PASS | CONDITIONAL | REVERIFY_REQUIRED | FAIL）
ci_pending: true             # CONDITIONAL 的唯一合法理由
qa_started_sha == qa_verified_sha == l2_verified_sha == HEAD == a3cdfb18b55ee16027bf268e6de7472343a611d2
qa_test_changes: []          # QA 未新增/修改任何测试、fixture、测试脚本或测试配置
local_gate:  pass (L2 authoritative @ a3cdfb1, 8/8 required)
manual_gate: pass (MG1..MG6 all green, QA-executed)
ci_gate:     pending (CG1/CG2/CG3) -> 不得记 pass; 不得由 QA push/开 PR 解锁
```

**给 Orchestrator 的后续动作**：① CI 通道可用后按 CG1→CG2→CG3 依次取证（CG2 必须核对 6 组合与
`# skipped 0`）；② 处理 F-1（Sprint+1：把 mtime 边界夹具化为确定性输入）与 F-4/F-5/F-6 的收尾项；
③ 本 Sprint **不因本报告获得发布许可**，CI 全绿前不得进入 done。
