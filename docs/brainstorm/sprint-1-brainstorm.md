# Sprint 1 结构化脑暴 — kixparadigm 测试基线健康

> 主持：Remy（Producer）｜参与：Kira（架构/范式）、Milo（Dev·可靠性）、Nova（Dev·实现）、Sage（Dev·测试与工具链）、Ivy（QA）
> 日期：2026-09-22｜baseline：`c3c31eb3268622358761cb2035ec84810a12ca11`｜内容语言：zh（结构化区英文）

## 0. 共享证据包（脑暴前分发，先读后说）

| ID | 事实 | 来源 |
|---|---|---|
| E1 | `npm test` exit 1；红点全在链首 `test:installer`（25 用例 → 19 pass / 4 fail / 2 skip）→ 后续 4 步从未执行 | orchestrator 实测（勿重跑） |
| E2 | 3 条红 = `sync-dsh-preset.test.js` 82/110/140，仅挡 `process.platform === 'win32'`；同文件 21/52 有 `probe.error.code === 'ENOENT'` 探针 | `scripts/sync-dsh-preset.test.js:12,22-25,83-84,111-112` |
| E3 | 本机无 `pwsh`（`command -v pwsh` 空）；上游 CI runner 镜像 README 列出 PowerShell 7.6.5（Ubuntu 24.04）/ 7.6.4（macOS 15） | 本机实测 + `actions/runner-images` `Ubuntu2404-Readme.md:218`、`macos-15-Readme.md:152` |
| E4 | baseline `c3c31eb` 的上游 `main` push CI run **success**（ubuntu + windows）| `gh run list -R olicesx/kixparadigm` run 34699043255 |
| E5 | `.github/workflows/ci.yml` matrix = `[ubuntu-latest, windows-latest] × [20.16.0, 22.x]`，无 macOS | 文件实读 |
| E6 | `install-lib.test.js:207` 幂等断言失败；`install-lib.js:226-230` 幂等判据 = `size 相同 且 Math.round(mtimeMs/1000) 相同` | 文件实读 |
| E7 | `dsh/preset-classic/skills` = 63 文件，mtime 小数部分 ∈ [0.4973, 0.5129]（**50 个 ≥ 0.5**，跨 `Math.round` 的 0.5 判定边界）；`dsh/preset-classic/agents` = 6 文件，mtime 小数部分 ∈ [0.470, 0.475]（**全部 < 0.5**）——而 `agents` 的同型幂等断言**通过** | Producer 只读 stat 扫描 |
| E8 | `scripts/install-lib.js` ↔ `en/scripts/install-lib.js` md5 一致（`c53b1198…`），由 `consistency-lib.cjs:691 checkIdenticalSet` 机械守护 | md5 + 源码 |
| E9 | CHANGELOG v1.3.13 声称「复制保留 mtime 使重复安装幂等」「install-lib 20/20」；v1.3.15 声称「`npm test` 59 pass / 0 fail / 1 skip」——均未标注测量平台 | `CHANGELOG.md:40,55,58` |
| E10 | 上游仓库 Issues 已禁用（`hasIssuesEnabled: false`）；fork `slchris/kixparadigm` 无 workflow 注册、无 run 历史 | `gh repo view` / `gh workflow list` |

---

## 1. Kira（架构 / 范式）— 开场定性问题

1. **本 Sprint 的名义目标是「4 条红转绿」，但真实目标是「门禁可信」**。E1 显示：`&&` 链的第一步红掉之后，`check-dsh-consistency` / `test:pressures` / `test:vision` / `plugins/` 套件**本机从未跑过**。当前本机门禁覆盖率不是「95% 绿」，而是**链首之后为 0**。
2. 因此判据不能是「4 条转绿」这种绝对计数，必须是**可复算的计数模型**：25 = 20（install-lib）+ 5（sync）；有 pwsh 的环境必须 25/0/0，无 pwsh 的环境必须 20/0/5，且 `20 ≠ 25` 必须在门禁里显式可见。
3. **反对把 T4 当文档任务**：如果 skip 语义只写在 plan.md 里、没有机械可读的判据，下个 Sprint 会原样复发（这正是 E9 的漂移成因：声称没有平台限定语）。

## 2. Nova（Dev·实现）— 主张速修

- T1 我 20 分钟能修完：把 82/110/140 的 `if (process.platform === 'win32')` 换成同款 ENOENT 探针即可（照抄 21/52 的写法）。
- T2 我判断是**比较口径写错**：`install-lib.js:229` 用 `Math.round(a.mtimeMs/1000) === Math.round(b.mtimeMs/1000)`；E7 显示 skills 的 mtime 恰好横跨 0.5 判定边界，agents 没有横跨 —— 相关性这么强，「一看就是」`Math.round` 在边界上不稳定。改成 `Math.abs(a.mtimeMs - b.mtimeMs) < 1000` 或 `Math.floor` 就完事。
- 我倾向**不做取证直接修**：这是 3 行改动，取证的时间比修还长。

## 3. Sage（Dev·测试与工具链）— 对 Nova 的两处反驳

1. **对 T2 的算术反驳**：「`Math.round` 边界不稳」这个模型有一个**可算的预言**。若 `fs.utimesSync` 真的只落到秒级（`install-lib.js:228` 的注释就是这么写的），那么目标 mtime 的小数部分会变成 0，于是**所有 50 个 ≥ 0.5 的源文件都会失配**——应报 `updated = 50`，实测是 **3**。你的模型被 E7 自己的数据反证了。反过来，若 `utimes` 保留了毫秒级精度，则数学上**不可能**失配（截断误差 < 1ms，跨不过 0.5s 边界）。**两个模型都不预测 3** → 现有证据不足以收口根因。
2. **对 T1 的语义反驳**：照抄探针没错，但要分清两类 skip（见 PROJECT_BRIEF 第 10 章）：`process.platform` 是「平台不适用」，`ENOENT` 是「能力缺失」。把 82/110/140 改成 ENOENT skip 后，本机这 5 条**全部不执行** → `sync-dsh-preset.ps1`（197 行，唯一的 仓库→DSH_HOME 单向同步入口）在本机回归覆盖 = 0。这个代价必须写进 gate，不能悄悄发生。

## 4. Milo（Dev·可靠性）— 提出替代路径，引发**分歧 A**

> **【分歧 A】根除 pwsh 依赖 vs 保留 pwsh 依赖 + 显式 skip**

- **Milo 主张**：把 82/110/140 用 Node 重写（用 `fs.symlinkSync` 造 fixture、用 Node 校验 fail-closed 分支），彻底不再 spawn PowerShell。理由：测试的可移植性不该依赖「目标机器装没装 PowerShell」——这本来就是**测试基础设施缺陷**，不是环境缺陷。同时 3 条红永久转绿，本机也真跑。
- **Nova + Sage 反驳**：这三条用例的**被测对象就是 `sync-dsh-preset.ps1`**。Node 重写 fixture 只会测到「Node 造的 symlink 能不能被 Node 读」，**不会执行那 197 行 PowerShell**。等于用「测试变绿」换「被测脚本零覆盖」——违反 G1 liveness（`sync-dsh-preset.ps1` 有真实消费者：`dsh/README-DSH.md:41,57-59` 的维护流程、`scripts/context-budget/README.md:74` 的改动顺序约定）。
- **Kira 补刀**：Milo 的方案还有一个隐性代价——它会**掩盖 CI 与本地的不对称**。现在的不对称（CI 有 pwsh、本机没有）是**真实环境差异**，把它抹平等于把「本机不能验证的东西」伪装成「本机已验证」。
- **Ivy 折中提案**：保留 pwsh 依赖 + 显式 skip，但加一条硬约束——**skip 不许是永久豁免**：CI（预装 pwsh）必须 `skipped = 0`，本机 skip 的 5 条必须在 QA signoff 里逐条列名；任何一次 CI 出现 pwsh 相关 skip，视为回归。
- **裁决（Remy）**：采纳 Ivy 折中；Milo 方案**否决**，但吸收其一半——**只跳过「需要 spawn pwsh」的部分**，不允许把整个脚本的回归覆盖一起删掉；Milo 的诉求以「T4 的 skip 门禁化」形式回填。记录：本项**不是**「Milo 错了」，而是「在 G1（有真实消费者）前提下，覆盖率 > 可移植性」。

## 5. Nova × Kira — **分歧 B**：T2 该不该先取证

> **【分歧 B】直接改比较口径（3 行） vs 先取证再决定改哪一层**

- **Nova**：E7 的相关性足够强，先修再看，红了再查。
- **Kira**：E7 是**相关**不是**因果**，而且 Sage 已经算出一个**反证**：两个主流模型都不预测 3。此时改 `Math.round` 是在赌。更危险的是**修错层**：如果真实原因是「第一次调用就少复制了 3 个文件、第二次补上」（即 `added = 3` 而非 `updated = 3`），那改比较口径会**把真缺陷盖掉**，测试变绿而安装仍然非幂等——这是本项目**唯一卖点**（可复现分发）上的静默回归。
- **Sage**：支持 Kira，并给出最小取证动作：一次调用打印 `{added, updated, same, pruned}` 四元组 + 失配文件的 `(size, mtimeMs)` 对照。**一次实验就能把 `added=3` 与 `updated=3` 分开**，成本远低于「改错再回滚」。
- **Ivy（QA 视角反方辩护）**：还要防另一种收口——「把断言改宽」。幂等的定义是**用户可见行为**（同一份源安装两次，安装副本不发生变化），不是「测试怎么写」。若最终结论是「断言过严」，必须给出「目标副本字节未变」的独立证据，不能只让数字对上。
- **裁决（Remy）**：T2 拆成两个验收点——**A 取证**（四元组分解 + 逐文件对照，必须落盘）与 **B 修复**（根因确定后改最窄的那一层）。未产出 A 证据就改代码 → QA 拒签（本项进入 `manual_gate MG3`）。`Math.round` 容差口径按**待验证假设**处理，不写进 plan 作为已定决策（证据门禁：外部技术语义无取证不得作确定结论）。

## 6. Remy × Milo — **分歧 C**：CI 加 macOS 的时机

> **【分歧 C】先上 macOS 让 CI 立刻变红（暴露问题） vs 修完再上（保持 CI 绿）**

- **Milo**：先上 macOS。红了才有人疼；按你们的顺序，macOS 支持永远排在最后。
- **Remy**：本 Sprint 的目标就是「红转绿」，在共享分支上引入长红会让其他改动无法判断自己是否引入回归。且 E4 显示 baseline 上游 `main` CI 是 **success** —— 保持这个可判定性本身就是资产。
- **Kira 补充事实约束**：E3 表明 **macOS runner 也预装 pwsh**，所以 T3（加 macOS）**不会**复现 T1 的那 3 条红——它复现的是 **T2 的幂等红**。也就是说 T3 的价值集中在 T2 的回归防护，与 T1 无关。这个区分必须写进 plan，否则 T3 的验收会被误判为「加了 macOS 还是绿，所以没发现问题」。
- **裁决（Remy）**：`T3 depends_on [T1, T2]`（合并顺序保证 CI 不长红）；同时采纳 Milo 的一半——T3 的 gate **不只看绿勾**，必须核对 macOS job 的 `npm test` 实际输出（否则无法区分「跑绿了」与「根本没跑」）。

## 7. Ivy × Remy — **分歧 D**：CHANGELOG 怎么改

> **【分歧 D】改写历史条目数字 vs 追加勘误 + 限定语**

- **Ivy**：历史记录不可篡改。v1.3.15 的「59 pass / 0 fail」在它当时的测量环境下可能就是真的（Windows），改掉等于伪造历史。
- **Remy** 初稿主张直接改成实测值。
- **对撞结论**：采纳 Ivy。**不动历史条目数字**，改为：① 在该条目追加平台限定与勘误指针；② 在 Sprint 1 的新条目中写清双口径（本机 macOS `20/0/5`；CI 预装 pwsh `25/0/0`）；③ v1.3.13「重复安装幂等」的声称按 T2 的取证结论决定措辞（若确证非幂等 → 加勘误并指明受影响平台）。
- **收敛**：T5 的验收从「数字改对」变成「**声称与实测的可对照性**」——读者能看出该数字在哪个平台测得。

---

## 8. 收敛结论（→ plan.md）

| # | 结论 | 落入 |
|---|---|---|
| C1 | 判据用可复算计数模型（25 = 20 + 5；本机 20/0/5，CI 25/0/0），不用「4 条转绿」 | plan `verifiable_gates` LG1/LG5 |
| C2 | T1 保留 pwsh 依赖 + 统一 ENOENT 探针（不 Node 重写）；只跳过需 spawn 的部分 | T1 |
| C3 | T2 必须先取证（`added/updated/same/pruned` 四元组 + 逐文件对照），再改最窄一层；禁止改宽断言 | T2 + `manual_gate MG3` |
| C4 | `Math.round` 容差口径标为**待验证假设**，不作已定决策 | plan §开放问题 OQ1 |
| C5 | skip ≠ 通过：本机 skip 5 条逐条登记；CI `skipped` 必须为 0，出现 pwsh 相关 skip 即回归 | T4 + `manual_gate MG1` + `ci_gate CG2` |
| C6 | T3 加 macOS runner，但必须依赖 T1/T2 已合并；且 macOS 预装 pwsh → 它防的是 T2 而非 T1 | T3 + `ci_gate CG1/CG2` |
| C7 | CHANGELOG 不改历史数字，追加勘误/平台限定 | T5 |
| C8 | `install-lib.js` 修复必须同步 `en/scripts/install-lib.js`（字节镜像，守护强制）| T2 `target_rules` |
| C9 | 门禁只能引用真实存在的 canonical 命令；`npm test` 的 `&&` 链语义必须显式写出 | plan `verifiable_gates` |

## 9. 未达成一致（留给执行期）

| # | 争点 | 双方 | 处理 |
|---|---|---|---|
| U1 | T2 真实根因是 `updated=3` 还是 `added=3` | Nova（比较口径）vs Sage/Kira（数据不足以收口）| 交给 T2 的取证步骤裁定，不由脑暴投票决定 |
| U2 | `sync-dsh-preset.ps1` 本机零覆盖是否可接受 | Milo（不可接受，应重写测试）vs Kira/Ivy（可接受，但必须显式登记）| 本 Sprint 按 C5 执行；若下个 Sprint 出现同类复发，重开 Milo 方案 |
