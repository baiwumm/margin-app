# Agent Instructions

margin-app = Margin 博客（baiwumm.com）的微信小程序阅读端：Taro 4.2.1（webpack5）+ React 18.3.1 + TS strict + Tailwind v4 / weapp-tailwindcss 5 + pnpm；内容走站点构建期导出的静态 JSON（13 端点，契约冻结），端上零后端、全只读。

## Commands
| 任务 | 命令 |
| --- | --- |
| 安装 | `pnpm install` |
| 构建（产物落 `dist/`） | `pnpm build:weapp` |
| 监听构建 | `pnpm dev:weapp` |
| 全量单测 | `pnpm test` |
| 单个测试文件 | `pnpm test test/prefs.test.ts` |
| Lint（含自动修复） | `pnpm lint` |
| 类型检查 | `npx tsc --noEmit` |

## External References
| 需求 | 文件 |
| --- | --- |
| 总览 / 架构 / 页面清单 / 里程碑 | `docs/requirements.md` |
| API 契约与 Block AST（M0 冻结对象） | `docs/api-contract.md` |
| 视觉令牌 / WXSS 硬约束 / 端上不做清单 | `docs/design.md` |
| 备案 / 隐私指引 / 提审 checklist | `docs/compliance.md` |
| 决策记录（口径查询，只追加） | `docs/decisions.md` |
| 工具链怪癖速查（IDE/automator/量测口径） | `docs/toolchain-quirks.md` |
| 调研事实；「线上与源码不符」的排查三步（§5） | `docs/research.md` |

## 工作约定
- 一个功能单元 = 一个 commit；合入前四闸门全绿：build + 单测 + lint + tsc。
- commit 标题沿用历史格式 `type: 中文描述（D 编号）`，正文写根因与边界取舍。
- AI 提交携带 `Co-Authored-By: <agent 名与署名>` 尾注。
- `docs/decisions.md` 只在表尾追加并递增 D 编号，不回改既有行；**改变现行口径、推翻既有决策、反转回滚 = 当天记档**（纯笔误与实现细节不必），先记档再动代码。
- 推送与站点部署由用户执行，不要代推。

## 冻结面（改动前先记档或在 commit 正文说明理由）
- 契约 `docs/api-contract.md` 与 `src/types/` 逐字段对齐：只允许加性可选字段，`schemaVersion` 保持 1；破坏性变更走 `/api/v2` 并存流程。
- `src/services/` 全目录（request / cache / errors / platform / taro-adapter / api/）是已验收数据层；改动必须带缓存三态回归测试（无缓存 / 命中 / buildId 变更驱逐）。
- 主包 ≤ 1.5MB：新页面一律进 `pagesA` / `pagesB` 分包（见 `src/app.config.ts`），tab 入口页按需配 `preloadRule`。

## 生成物（不要手改）
- `dist/`：构建产物，`project.config.json` 的 miniprogramRoot 指向它。
- `src/assets/`：由 `node scripts/gen-assets.mjs [noise|tabbar|navicons|logo|aurora|about|all]` 生成（sharp 取 margin 仓库 node_modules；`MARGIN_REPO` / `SHARP_PATH` 可覆盖路径）；生成后提交入库，不入 gitignore。
- `test/fixtures/` 已被 gitignore；金标准语料放 `test/golden/`。

## 环境事实
- margin 站点仓库（视觉唯一基准 + sharp 来源）本机实际路径 = `F:\projects\margin`；历史文档写的 `E:\personal-project\margin` 在本机不存在。
- `pnpm-workspace.yaml` 的 `trustPolicy: off` 等字段是既定决策（D76），不要改。

## WXSS / 端上原语硬约束（违反 = 真机缺陷；细则见 design.md §7 与 D19/D20/D38/D41/D45/D47）
- custom-tab-bar 内禁用 CSS 变量做关键视觉：全部 tsx 内联 style，WXSS 只留几何。
- rgba 一律逗号写法；`color-mix()` / oklab 构建期预计算为固定值；`@supports` 不写（`backdrop-filter` 一律裸声明）、`*` 通配与 hover 变体不写（显式书写、按压态替代）。
- 横滚一律 `ScrollView scrollX`；`<scroll-view>` 本体不写 padding，内边距写在包一层的内层 View 上。
- 圆角 / 裁切落在紧贴被裁元素的那一层（容器里还有别的子元素时底角圆不到）。
- 表格 = View + flex 等分列；`display:table` 真机不可靠。模拟器全绿 ≠ 真机全绿。
- `CacheImage` 的 className 只作用外层盒；内层 `<Image>` 尺寸由组件按 mode 负责。
- 契约里可能为相对路径的字段（`video.src` 等）消费前过 `currentBase()`。
