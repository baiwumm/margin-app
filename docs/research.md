# Margin 小程序 · 调研事实与依据

> 本文是「依据层」：记录结论所基于的实测事实与来源。现行口径看 requirements.md 与各专项文件。旧版本文档（含完整论证过程）见 git 历史。
> ⚠️ 本文是**调研时点的快照**：与现行口径冲突时，以 requirements.md / design.md / compliance.md 的现行表述与 decisions.md 后续编号为准（例：F13 记的首页 RECENT「卡双列」已被 D66 改为单列）。

## 1. 内容源 margin：决定数据层形态的 8 个事实（F1–F8）

| # | 事实 | 落点 |
| --- | --- | --- |
| F1 | 三集合字段差异大：blog 有正文 body + TDK；galleries 无 body、图片靠目录 glob；moments 正文在 frontmatter `text`、图片靠 glob | 导出层出三套结构，不套通用模型 |
| F2 | 没有 category，只有 tags（blog+galleries 去重 62 个） | 无分类模块，标签为独立 tab |
| F3 | 内容无 slug 字段，URL 由文件路径推导（`src/utils/getPath.ts`） | 导出层输出显式 `slug` / `path` |
| F4 | 图片经 `astro:assets` 产出 `dist/_astro/<name>.<hash>_<w>.webp` 多宽度变体 | 端上不猜地址，AssetRef 给绝对 URL + 尺寸 |
| F5 | 三个自定义 remark 指令 `::link-card` / `::music` / `::video`；插件把节点降级成 HTML 字符串（`remarkVideo.ts:87-89` 等） | 选 AST 的决定性理由；`parse*Card` 已抽出（已进 margin main） |
| F6 | 可复用 `readingTime.ts`、OG 图（74 个已在 dist）、`getCollection`、`postFilter` | 导出层组装既有能力 |
| F7 | 档位实测不一致：blog srcset = `640,750,828,1080,1280,1541`；gallery = `400,800,1600`（封面 `800,1200,1600`）；moment = `400,800` | 「只选择不生成」；无全体可用固定三档 |
| F8 | 裸域所有路径 301 → `www`；静态资源带 ETag | assetBase=www；JSON 走 304 再验证 |

**其他已确认事实**：

- **部署**：`wrangler.jsonc` → Cloudflare Workers Static Assets，由 Dashboard 连 Git 自动构建，无需新 CI。
- **构建脚本**：`astro check && astro build && pagefind --site dist && node -e "...cpSync('dist/pagefind','public/pagefind',...)"`——末段把产物写回源码目录，导出脚本**不要照抄**。
- **margin 本地 build 会随机卡死**（三次复现、进程零 CPU；`astro check` 始终 0 错误）→ 验证策略：本地只跑 `astro check` + 单测 + dev 冒烟；合并前信号 = 分支构建 check-run（构建内断言）；合并后 = 生产域（www）复核。workers.dev 已关闭。
- **margin 仓库硬约束**（其 AGENTS.md）：不升级/不新增依赖须用户批准（pinyin-pro 已批）；禁改 `astro.config.ts` / `content.config.ts` / `Layout.astro` / `src/config.ts`。字体子集文件与 `_headers` CORS（D4 配套）走其正常评审流程。
- 主题常量：`SITE.title="Margin"`、`desc="边白 · 记录代码、思考与灵感"`、作者「白雾茫茫丶」、`lang=zh-CN`、时区 Asia/Shanghai、`postPerPage=12`、**`showCoverImages: false`**（文章卡本就无图）。动态数据：`friends.ts`（4 组）、`projects.ts`（7 个）。

## 2. margin 设计体系事实（F9–F15，2026-09-29 源码实测；UI 基准，D1）

### F9 令牌与主题（`src/styles/global.css`）

- 双主题：`:root/[data-theme=light]` 与 `[data-theme=dark]`，经 `data-theme` 属性切换；`lightAndDarkMode: true`。
- 浅色：bg `#f2f5ec` / fg `#353538` / muted-foreground = fg 60% / accent 默认 blue `#1158d1` / muted `#bbc789` / border `#7cadff` / featured `#b56007` / gallery `#6d28d9`。
- 暗色：bg `#10131a` / fg `#f6f7f8` / accent `#008fec` / muted `#212f3f` / border `#2264e3` / featured `#f59e0b` / gallery `#a855f7`。
- **accent 五套可轮换**（`data-accent`）：blue `#1158d1/#008fec`、green `#1f9d63/#34d399`、purple `#7c3aed/#a78bfa`、orange `#ea580c/#fb923c`、rose `#dc2626/#f87171`（浅/暗）；featured/gallery 语义色随 accent 轮转有完整对照表（global.css `html[data-accent=…]` 块）。
- 源码大量使用 `color-mix(in srgb/oklab, …)` 与空格斜杠 rgba——端上全部预计算（D20）。

### F10 字体

- 全站 `--font-app: "Maple Mono CN"`（`@theme inline`；`--font-sriracha/--font-firacode` 为历史别名同指 `--font-app`）——**等宽字是身份载体**；斜体/强调（`.italic/em/.spicy`）同字体。
- 端上不可打包（中文子集 MB 级）→ D4：系统栈默认 + `wx.loadFontFace` 异步子集偏好项。

### F11 卡片语言（`Card.astro` / `tags/index.astro` / `GalleryCard.astro`）

- 卡 = `rounded-2xl` + 1px 半透明描边 + 低饱和 tint 底（`bg-muted/10`、fg 2–3% 混 bg）+ hover 抬升（`-translate-y-0.5` + shadow-lg + accent 描边/bg 加深）；**无玻璃拟态**。
- 语义变体：featured = 琥珀（border 30% / bg 5%，featured-glow）；gallery = 紫罗兰（border 20% / bg 5%）。
- 标签卡：fg 2% 底 + fg 6% 描边 + 卡内 aurora（鼠标跟随，端上删）；图库卡 cover `aspect-video`。
- **无暗色独立卡片体系**——同一套 alpha 语义在暗色令牌下自动成立。

### F12 装饰层（`Layout.astro` / `hero-aurora.css`）

- 背景三层：`.site-grid`（50px 网格，accent 3.5%，径向 mask 渐隐）、`.site-grain`（SVG feTurbulence 噪点平铺）、`.site-cursor-glow`（800px 鼠标跟随光晕，触屏无对应物）。
- aurora 光球 ×3：radial-gradient 圆球 + `blur(60px)` + 7/9/11s 位移动画（hero 区）；`prefers-reduced-motion` 时停。
- `.glow-text`：135° fg→accent 渐变字 + drop-shadow；首页 `.hero-title` shimmer（background-position 6s 循环）。
- `.hero-badge`：accent 8% 底 + accent 15% 描边胶囊（统计徽章用）。
- 终端徽章：`~ /ready-to-go $` / `~ ls -la $`（各页 hero 通用），ping 双层圆点。

### F13 页面与组件结构

- 首页 `/`：hero（终端徽章 + glow 大标题 + 描述 + 作者/社交 + intro 音频）→ FEATURED（★ + 横线 + featured 卡双列）→ RECENT（横线 + `[n/total]` 等宽计数 + 卡双列 + 「查看全部文章」outline CTA）。
- 内容页通用 hero：终端徽章 + glow 标题 + 描述 + hero-badge 统计（tags/archives/posts 等）。
- `/tags`：tag 卡网格；`/galleries`：画廊卡；`/moments`：瞬间卡（日期 + featured ★ + text + 图网格 + tag pill + lightbox）；`/archives`：时间轴；`/about`：头像/简介/社交/统计/贡献日历/技能跑马灯/MBTI；`/friends`、`/projects`。
- 导航：桌面 header（logo mark + 字标 / 链接 / 搜索 / 主题 / accent 圆点 / 快捷键）；**移动端 = 汉堡抽屉**（MobileMenu：圆角浮层面板 + 逐项 stagger 入场 + 主题分段器 + accent 圆点）——端上以底 tabBar + 顶栏替代（D3/D19）。
- 搜索 = SearchModal（Pagefind）；快捷键 ShortcutsPanel；BackToTopButton；ReadMode（r 键）；TTS（l 键）；IntroAudio（LOFI 电台流 `fluxfm.streamabc.net`）。
- logo 资产：`src/assets/logo/mark.svg`（方标）+ `margin.svg`（字标）——可直接打包进 app；图标集 `src/assets/icons/Icon*.svg`（线性风 24×24 stroke）= tabBar/界面图标重生成源。

### F14 端上不可用/不做（取舍依据）

| 功能 | 原因 |
| --- | --- |
| 快捷键/命令面板 | 无键盘（D7） |
| TTS | Web Speech API 不可用（D7） |
| giscus 评论 | iframe/web-view 个人主体不可用（D7/D8） |
| IntroAudio 电台 | `fluxfm.streamabc.net` 境外流，downloadFile 白名单须 ICP（D6） |
| 鼠标跟随效果 | 触屏无对应物（D7） |
| Pagefind UI | WASM 分片不可复用 → 端上自建双层检索 |
| **音频播放能力本身** | InnerAudioContext / BackgroundAudioManager 可用，自托管音频无障碍——删除的只是这个第三方流 |

### F15 与旧 uni-halo 基准的关系

uni-halo 3.0.0（柠檬绿 + 玻璃拟态）曾为视觉基准（2026-09-29 前的 D53 口径）；D1 转向后**仅工程教训仍有效**并已并入 decisions.md D19/D20（custom-tab-bar 变量不可达、@supports 被剥、rgba 语法），视觉层全部以 margin 为准。

## 3. 关键数字口径

| 数字 | 口径 |
| --- | --- |
| 74 | blog 总篇数 |
| 246 | 正文图片**引用数**（counts.images 生产实测） |
| 3 / 75 | 画廊数 / 画廊图数 |
| 9 / 16 | 瞬间数 / 瞬间图数 |
| 62 | 标签数（blog+galleries） |
| 14.5 / 37.6 / 46.3 / 379 / 3.3 KB | manifest / posts 列表 / titles / terms / stats 生产实测体积 |
| ≈880ms | A1 真机冷启动 TTI（iPhone 16 Pro） |

## 4. M0 实测证据（摘要；过程细节见 git 历史旧版 research.md §7–§8）

- **探针 A**（图片落盘）：Endpoint 内 `getImage()` 变体随构建落盘 `dist/_astro/`，sharp 0.35.4 在 CF 构建镜像可跑 → 「只选择不生成」成立。
- **探针 B**（插件重构等价）：同环境双管线逐字节比对三篇样文 HTML 全等（3345/9340/9170 B）→ `parse*Card` 抽取无行为变化。
- **生产验收**：13 端点全 200；buildId `71831bc-9bf4b88413de`；`/_astro/*` immutable；HTML diff 唯一差异 = `@layer astro.images` 样式层注入 + Footer chunk 重组（有界例外：全站 0 个 full-width 元素、342 处 constrained 规则与 Tailwind preflight 冗余、object-fit 在 height:auto 下几何无效——视觉零变化）。
- **环境噪声三案**（导出层设计输入）：music/video 缓存路径 bundle 后 miss → 导出层自读缓存文件；shiki 语言懒加载 → 复用站点管线；fetchTdk 联网不稳定 → 导出层禁联网。

## 5. 排查方法论留档

「线上与源码不符」按三步走：① `git status --porcelain` 先排掉「本地已改未提交」；② `git show origin/main:<file>` + `git log -1 -- <file>` 分清「未推送」与「已推送未构建」；③ 再判是「没写」「没提交」还是「未重建」。只抓线上不查工作区 = 把部署时延读成代码缺失。

## 6. 事实来源对照（精选）

| 结论 | 来源 |
| --- | --- |
| 集合字段 / 标签 / 图片引用 | margin `src/content.config.ts`、`src/config.ts`、`src/data/**` |
| 设计令牌 / 卡片 / 装饰 / 页面结构 | margin `src/styles/*.css`、`src/components/*.astro`、`src/pages/*.astro`（2026-09-29 逐文件实测） |
| 图片档位 | `astro.config.ts` + dist srcset + `GalleryCard.astro` / `MomentCard.astro` 实测 |
| 指令降级 HTML | `remarkVideo.ts:87-89`、`remarkMusic.ts:160`、`remarkLinkCard.ts:429` |
| 部署方式 / 构建脚本 | `wrangler.jsonc`、`package.json` |
| 个人主体限制 / 音频域名 | 微信开放社区官方文档（2026-09-28 复核） |
| 备案 / 小程序后台状态 | 工信部查询、小程序后台截图（2026-09-28） |
| M0 生产数字 | www.baiwumm.com 生产域 curl + 构建内断言（2026-09-29） |
