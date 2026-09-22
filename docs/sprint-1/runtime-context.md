# Runtime Context Snapshot — Sprint 1（本项目特化：工具链能力快照）

> 生成时间：2026-09-22 15:07 CST｜生成者：kixpower-producer (Remy)｜Sprint 1 初步收集
> 模板：`skills/kixpower/templates/runtime-context-snapshot.md`
>
> **特化说明**：本项目的交付物是**配置与规则资产**，不是应用/服务 —— 没有 `.env`、没有数据库、没有 HTTP 服务、没有运行中进程。
> 因此模板 §1（环境变量）/ §2（DB schema）/ §3（上游 API response）/ §4（health endpoint）四节**不适用**，
> 替换为等价的「工具链能力快照」：安装器配置面、preset 结构面、宿主/runner 能力面、本地探针面。
> **硬约束照旧**：不输出任何密钥值（本仓 `.gitignore` 已排除 `.npmrc` / `.env*`）。

## 1. 配置面（替代「环境变量 keys」）

| 项 | 值 | 来源 |
|---|---|---|
| 生效的环境变量 | 仅 `DSH_HOME`（可选，缺省 `~/.dsh`）；`KIX_VERBOSE`（安装日志详细度）；`GITHUB_PERSONAL_ACCESS_TOKEN`（宿主 MCP，部署面）| `scripts/install-lib.js:20-31`、`scripts/verify-guards.js:7-9` |
| 仓库内配置文件 | `package.json`（scripts/files/engines/bin）、`.github/workflows/ci.yml`、`.gitattributes`（`* text=auto` + shebang 强制 LF）、`.gitignore` | 文件实读 |
| 无 `.env` / `.env.example` / `docker-compose*.yml` | 确认不存在 | 顶层 `ls -A` |
| `kix-discipline/`（本地需求三检契约）| 存在于 `.gitignore`（运行时本地产物，不入库）| `.gitignore:41-42` |

## 2. preset 结构面（替代「DB schema」）

| 变体 | id | 事实源 | 是否随 npm 安装 | 备注 |
|---|---|---|---|---|
| 默认档（激励面）| `kixparadigm` | `dsh/preset/` | ✅ | `skills`/`agents` 是指向 `preset-classic` 的 **git symlink 指针**（`git ls-files -s` 模式 120000）|
| 经典档 | `kixparadigm-classic` | `dsh/preset-classic/` | ✅ | `agents/` 6 份角色定义；`skills/` 18 个货架 / 63 文件 |
| 消融档 | `kixparadigm-null` | `dsh/preset-null/` | ❌ | 不随 npm 安装，不在 CI 一致性契约内（D6）|
| 英文经典档 | `kixparadigm-classic-en` | `en/preset-classic-en/` | ✅（独立包 `kixparadigm-en`）| |
| vision bridge | `dsh-vision-bridge` | `dsh/vision-bridge/` | ✅ | 与 `en/bridge/` 镜像（`checkMirrorTree`）|

- `dsh/preset/plugins/` = 34 个文件（32 个 `*.js`，含 16 个 `*.test.js`）
- 插件挂载契约：宿主按**名字快照**缓存插件 → **磁盘改完必须重启 dsh-web**（CHANGELOG v1.3.6/v1.3.16）
- **漂移**：无（结构与 README / CHANGELOG 一致）

## 3. 宿主与 runner 能力面（替代「上游 API 实际响应」）

| 能力 | 结论 | 证据 |
|---|---|---|
| DSH 宿主版本 | 0.1.2-rc.1 与 0.1.5-rc.1 双兼容（persona 用 YAML 锚点同时给 `text` 与 `prefix`）| `CHANGELOG.md` v1.3.16 |
| GitHub Actions `ubuntu-latest` 预装 pwsh | ✅ PowerShell 7.6.5 | `actions/runner-images` `images/ubuntu/Ubuntu2404-Readme.md:218`（web，2026-09-22 取）|
| GitHub Actions `macos-15` 预装 pwsh | ✅ PowerShell 7.6.4 | `actions/runner-images` `images/macos/macos-15-Readme.md:152` |
| `macos-latest` 指向哪个镜像版本 | **未取证**（开放问题 OQ5）| — |
| windows runner 的 `powershell.exe`（5.1）| 未取证（`sync-dsh-preset.ps1` 声称 5.1/7 通用）| Sprint+1 候选 N3 |
| `gh` CLI | ✅ 已认证（账号 `slchris`）| `gh auth status` |
| 上游仓库 | `olicesx/kixparadigm`（本地 `origin` 是 fork `slchris/kixparadigm`）| `gh repo view`（`isFork: true`，parent = `olicesx/kixparadigm`）|
| 上游 Issues | ❌ **已禁用**（`hasIssuesEnabled: false`）→ 不能提 Issue | `gh repo view --json hasIssuesEnabled` |
| fork 上的 CI | ❌ 无 workflow 注册、无 run 历史 → 本地 push 不触发 CI | `gh workflow list -R slchris/kixparadigm`（空）、`gh run list -R slchris/kixparadigm`（空）|
| 上游 CI 历史（baseline）| `main` push @ `c3c31eb` = **success**（run 34699043255）| `gh run list -R olicesx/kixparadigm` |
| 上游 CI 历史（非 baseline）| `release/v1.3.17` 与 tag `v1.3.17` 的 run = **failure**（2026-09-13，与本地 HEAD 不同 revision）| 同上（登记为风险 R3 / OQ4）|

## 4. 本地能力探针（替代「运行中进程 health」）

| 探针 | 命令 | 结果 |
|---|---|---|
| node | （已实测，勿重跑）| v22.14.0 ✅ |
| npm | （已实测）| 可用 ✅ |
| **pwsh** | `command -v pwsh` | **NOT FOUND** ❌ → 所有 `.ps1` 不可执行 |
| Python 3 | `python3`（本报告 §5/§6 取证用）| 可用 ✅（仅用于只读 stat，不执行项目代码）|

**pwsh 缺失的影响面（穷举，只读 grep 得出）**：
- `scripts/sync-dsh-preset.ps1`（197 行，仓库→`DSH_HOME` 唯一单向同步入口）→ 5 条相关用例只能 skip
- `install.ps1`（VS Code Copilot 安装入口）
- kixpower hooks：`block-dev-authority-edit.ps1` / `block-source-edit.ps1` / `blast-radius-check.ps1` / `pre-commit-lint-check.ps1`（**注**：DSH 下这些 hooks 本就不自动触发，机械门禁由 `dsh/preset/plugins/kix-guards.js` 承载）
- `scripts/install-kix-stalled.ps1` / `scripts/ensure-vision-bridge.ps1`
- `skills/kixpower/scripts/verification-fidelity-check.ps1` → **本 Sprint 的 drift-check 无法运行，降级为手工 baseline 报告**

## 5. git 状态

```text
branch: main
HEAD:   c3c31eb3268622358761cb2035ec84810a12ca11
origin: https://github.com/slchris/kixparadigm (fork of olicesx/kixparadigm)
origin/main: c3c31eb3268622358761cb2035ec84810a12ca11   （与本地 HEAD 相同）
status: 1 untracked → docs/.kixpower-current-sprint（内容 "1"）
recent: c3c31eb Merge PR #32 (feat/context-budget-200k)
        fc52b2f feat(dsh): 上下文甜点阈值 200K + 新模型零配置适配
        9ef6b68 Merge PR #31 (release/v1.3.16)
```

> **与给定前提的差异（须记录）**：任务上下文称「工作树干净」，实测有 1 个 untracked 文件
> `docs/.kixpower-current-sprint`（kixpower 的 current-sprint marker，内容 `1`）。
> 该文件是编排期产物，不构成用户改动，但会使「planning snapshot 前工作树必须干净」的判据不成立 → 见 plan.md OQ7。

## 6. canonical 命令清单（实测存在，逐字来自 `package.json#scripts`）

| 包 | 命令 |
|---|---|
| 主包 | `test` / `test:installer` / `test:consistency` / `test:vision` / `test:pressures` / `audit:pressures` / `verify:guards` / `verify:vision` / `postinstall` |
| `en/` | `test` / `test:installer` / `test:consistency` / `test:vision` / `postinstall` |

**`npm test` 的链式语义（关键）**：
```
npm run test:installer && node scripts/check-dsh-consistency.cjs && npm run test:pressures \
  && node --test dsh/vision-bridge/test.js && cd dsh/preset/plugins && node --test
```
→ 第一步红 ⇒ 后续 4 步**不执行**。当前本机门禁覆盖 = 链首之后为 0。

## 7. 文档漂移登记

| # | 文档声称 | 实测 | 类别 | 处置 |
|---|---|---|---|---|
| D-1 | `CHANGELOG.md:55`（v1.3.13）「复制保留 mtime 使**重复安装幂等**」 | `install-lib.test.js:207` 在 macOS 上红：第二次调用 `added+updated = 3` | **被实测反证**（限 macOS；根因未确证 → OQ1）| T5 追加勘误 + 平台限定；措辞取决于 T2 结论 |
| D-2 | `CHANGELOG.md:58`（v1.3.13）「`install-lib` 20/20」 | 本机 `install-lib.test.js` = 19 pass / 1 fail | 同上 | T5 |
| D-3 | `CHANGELOG.md:40`（v1.3.15）「`npm test` 59 pass / 0 fail / 1 skip」 | 本机 `npm test` exit 1（首个子命令 25 用例中 4 fail）| **未标注测量平台**（该数字很可能测于 Windows/CI，Windows 有 pwsh 且 ext4/NTFS 无 mtime 边界问题）| T5 追加平台限定，**不改历史数字** |
| D-4 | `CHANGELOG.md` 全篇未声明「本项目 CI 不含 macOS」 | `.github/workflows/ci.yml` matrix 无 macOS | 遗漏声明（非错误声称）| T3 + T5 在新条目写清 |
| D-5 | README 徽章指向 `olicesx/kixparadigm`；本地 `origin` 是 fork `slchris/kixparadigm`（无 workflow）| 一致（徽章指上游，正确）| 无漂移 | 记录为 CI 可观测性事实（R4） |
| D-6 | `docs/.kixpower-current-sprint` 未入库 | untracked | 未分类 | OQ7 |
| D-7 | 任务上下文「工作树干净」| 1 个 untracked 文件 | 前提偏差 | 本文件 §5 已记录 |

> **未列入漂移的已核对项**：`README.md` 的安装命令与 `bin/kixparadigm.js` / `install-lib.js cli` 一致；
> `package.json#files` 覆盖 README 宣称的分发面；`engines.node >= 20.16.0` 与 CI node 矩阵一致。

## 8. 与 plan.md 的接口

- 本文档 §4 的 pwsh 缺失 → `plan.md` T1/T4 的存在理由 + `manual_gate MG1`
- §6 的链式语义 → `plan.md` LG5 的期望值说明
- §7 的 D-1/D-2/D-3 → `plan.md` T5 与 `manual_gate MG2`
- §3/§5 的 CI 可观测性 → `plan.md` CG1/CG2/CG3 与风险 R4
- **后续 Dev 发现新的 runtime 漂移 → 追加到本文档 §7 + `.kixpower/memory/repo/lessons-learned.md`**（本 Sprint 只生成一次，不重复生成）
