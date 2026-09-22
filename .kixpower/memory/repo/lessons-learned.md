# Lessons Learned — kixparadigm（repo memory）

> **canonical root**：`<PROJECT_ROOT>/.kixpower/memory/repo/`。本文件是本项目经验的唯一可写真相源。
> **只读参照**：仓库顶层 `memories/`（preset 分发资产 / kix-mem 经验库，`legacy_ref: memories/`）——**不与本目录双写**。
> **写入合约**：Dev/QA 仅在**失败**时追加；Producer 在规划/收尾时追加；每条必须带 `source`（文件:行号 / 命令 / trace entry）。
> **规则是负债**：单次经验只作 candidate，不自动升级为 repo 规则（升级走 `harness-backlog.md` 的 eval 三态机）。

| ID | 日期 | 来源 Sprint | 教训（可操作） | 证据 | 状态 |
|---|---|---|---|---|---|
| LL-1 | 2026-09-22 | 1（规划期）| **`node --test` 的 skip 不改变 exit code**：把 fail 改写成 skip 会让门禁「变绿」而不增加覆盖。凡以 skip 收口的修复，必须同时给出可区分的计数判据（`pass` 数与总数分离登记），否则是假绿。 | `npm run test:installer` 预测口径：本机 `20/0/5` vs CI `25/0/0`；`pass 20 ≠ 25` | observed |
| LL-2 | 2026-09-22 | 1（规划期）| **CI 绿 ≠ 本机绿（平台能力差异）**：CI runner 预装 `pwsh`（Ubuntu 24.04 / macOS 15 镜像 README 均列出 PowerShell 7.6.x），本机 macOS 无 `pwsh` → 依赖 `pwsh` 的用例在 CI 真跑、在本机 ENOENT 失败，**该红在现有 CI 上永不可见**。判据：「某条红只在本地出现」时，先查 CI 平台矩阵缺哪个平台，再查该平台的**能力预装差异**。 | `actions/runner-images` `Ubuntu2404-Readme.md:218`、`macos-15-Readme.md:152`；`command -v pwsh` 空；上游 CI @baseline success | observed |
| LL-3 | 2026-09-22 | 1（规划期）| **`&&` 链式门禁的首步红会遮蔽整链**：`npm test` = `test:installer && check-dsh-consistency && test:pressures && vision && plugins`。首步红 ⇒ 后续 4 步**从未执行**。描述基线时**禁止**说「大部分通过」；必须给出「链首之后覆盖 = 0」这一结论。 | `package.json#scripts.test`；`npm test` exit 1 | observed |
| LL-4 | 2026-09-22 | 1（规划期）| **文档声称是错误传播载体（比代码缺陷更危险）**：`CHANGELOG.md:55` 声称「复制保留 mtime 使重复安装幂等」，而该断言在本平台实测红 → 读者据文档认为已解决，缺陷因此不被排查。修正方式：**不改历史数字**，追加平台限定 + 勘误指针，并在新条目写清双口径。 | `CHANGELOG.md:40,55,58` vs `install-lib.test.js:207` 实测红 | observed |
| LL-5 | 2026-09-22 | 1（规划期）| **强相关不等于因果（证据门禁的自我应用）**：`skills/` 63 文件的 mtime 小数部分横跨 `Math.round(sec)` 的 0.5 判定边界（50 个 ≥ 0.5），`agents/` 6 文件全部 < 0.5 —— 而只有 `skills` 的幂等断言红。相关性极强，但两个主流模型分别预测 `0` 与 `~50` 次失配，**都不预测实测的 3**。→ 高相关 + 模型不预测观测值时，先取证收口，禁止直接改代码。 | Producer 只读 stat 扫描；`install-lib.js:226-230` | observed |
| LL-7 | 2026-09-22 | 1（QA 验收期）| **门禁的可复现性不等于「同一代码 ⇒ 同一红绿」**：`install-lib.test.js:216` 的幂等断言以**仓库工作树 skill 文件的 mtime**为输入（未入库状态）。fresh checkout 上 `dsh/preset-classic/skills` 63 文件中落在失败带 `[x.4995, x.500)` 的为 **0** → baseline 在该 checkout 上 `20 pass / 0 fail`（T2 红**不可复现**）；只有主仓当时那 3 个带内 mtime 才复现 `19/1`。**教训**：凡断言依赖「未入库的文件系统状态」，其红/绿必须标注该状态值（或把状态显式构造进 fixture），否则 CI/新克隆的绿**不构成**该路径被验证的证据；QA 复核 baseline 声称时，必须换 checkout 重跑一次而非只读记录。 | QA 受控 A/B：仓库外 worktree `c3c31eb`，`in_band_count: 0` → 20/0；置 3 文件为记录带内值 → baseline 19/1、HEAD（同 mtime）20/0；主仓只读 stat `3/63` 且 mtimeMs 与 `progress.md:226-228` 逐值相同 | observed |

| LL-6 | 2026-09-22 | 1（规划期）| **fork 的 CI 盲区**：本地 `origin` 是 fork（无 workflow 注册、无 run 历史）→ 本地 push 不触发任何 CI；CI 只在上游 `olicesx/kixparadigm` 的 PR/push 上跑。设计 `ci_gate` 前必须先确认「哪个 remote 才产生 run」。 | `gh workflow list -R slchris/kixparadigm`（空）；`gh run list -R olicesx/kixparadigm`（有历史）| observed |

**修剪记录**：无（本文件首次初始化）。
