# Margin 小程序 · 调研事实与依据

> 本文是「依据层」：记录结论所基于的实测事实与来源。现行口径看 requirements.md 与各专项文件；完整论证过程看 `archive/requirements-v2.1.md`。

## 1. 内容源 margin：决定数据层形态的 8 个事实（F1–F8）

| # | 事实 | 落点 |
| --- | --- | --- |
| F1 | 三集合字段差异大：blog 有正文 body + TDK；galleries 无 body、图片靠目录 glob；moments 正文在 frontmatter `text`、图片靠 glob | 导出层出三套结构，不套通用模型 |
| F2 | 没有 category，只有 tags（blog+galleries 去重 62 个） | D4：取消分类模块 |
| F3 | 内容无 slug 字段，URL 由文件路径推导（`src/utils/getPath.ts`） | 导出层输出显式 `slug` / `path` |
| F4 | 图片经 `astro:assets` 产出 `dist/_astro/<name>.<hash>_<w>.webp` 多宽度变体（实测 1651 个文件） | 端上不猜地址，AssetRef 给绝对 URL + 尺寸 |
| F5 | 三个自定义 remark 指令 `::link-card` / `::music` / `::video`；插件最后一步把节点降级成 HTML 字符串（`remarkVideo.ts:87-89`、`remarkMusic.ts:160`、`remarkLinkCard.ts:429`；`parseAttrs` / `buildHtml` 未导出） | 选 AST 的决定性理由 + 前置重构（探针 B） |
| F6 | 可复用 `readingTime.ts`、OG 图（74 个已在 dist）、`getCollection`、`postFilter`；**但** parse 重构、`getImage()`（全仓 0 处）、`fetchTdk()` 构建期联网三处不是既有能力 | v1.9「组装既有能力」的估算下修 |
| F7 | 档位实测不一致：blog srcset = `640,750,828,1080,1280,1541`；gallery = `400,800,1600`（封面 `800,1200,1600`）；moment = `400,800` | D25「只选择不生成」；无全体可用固定三档 |
| F8 | 裸域所有路径 301 → `www`；静态资源 `max-age=0, must-revalidate` 但**带 ETag** | D19 assetBase=www；JSON 走 304 再验证 |

**其他已确认事实**：

- **部署**：`wrangler.jsonc`（14 行）→ Cloudflare Workers Static Assets，static 模式无 adapter；由 Dashboard 连 Git 自动构建，新增 Astro Endpoint 随 `astro build` 自动落盘，**无需新 CI**（现有 6 个 Endpoint 均无 `prerender` 导出）。
- **构建脚本**：`astro check && astro build && pagefind --site dist && node -e "...cpSync('dist/pagefind','public/pagefind',...)"`——末段把产物写回源码目录 `public/`，导出脚本**不要照抄**。
- **依赖**：astro 7.3.2、sharp（`src/` 0 处 import，属新用法）、无顶层 `unified`/`remark-*`（独立脚本 import 直接 `ERR_MODULE_NOT_FOUND`）、无 `.npmrc`（pnpm 严格 node_modules）。`AGENTS.md` 硬约束：不升级/不新增依赖须用户批准（pinyin-pro 已批，D29）；禁改 `astro.config.ts` / `content.config.ts` / `Layout.astro` / `src/config.ts`。
- **margin 本地 build 会随机卡死**（三次复现、进程零 CPU；`astro check` 始终 0 错误）→ 验证策略：本地只跑 `astro check` + 单测，产物真伪以 **Cloudflare 预览构建**为准，不依赖本地完整 build。
- 主题常量：`SITE.title="Margin"`、作者「白雾茫茫丶」、`lang=zh-CN`、时区 Asia/Shanghai、`postPerPage=12`。动态数据：`friends.ts`（4 组）、`projects.ts`（7 个，stars/forks 构建期经 GitHub API 刷新）——同需导出 JSON。

## 2. uni-halo：借鉴 4 条 / 规避 5 条

**借鉴**：① 「配置中心 + 能力探测 + 默认兜底」（远端配置深合并本地默认，失败也能渲染）；② 请求层收口（拦截器统一注入/解包/401 处理）；③ 统一视觉令牌 + 原子工具类；④ 列表逐项错峰入场（成本低观感好）。

**规避**：① 技术栈过时（Vue2 + HBuilderX + tm-vuetify 109 组件）；② `pages.json` 样板重复、`navigationStyle` 混用；③ 死代码与硬编码（三处 `BASE_API`、1500 行未引用组件、`v-if="false"` 隐藏的深色按钮、缺失死链）；④ 分页状态位各页各写 → 抽统一 `usePagination`；⑤ 错误码依赖后端旧形态 + 正则抠参数 → 显式约定响应结构。

## 3. demo 图身份

5 张图是 **uni-halo v3.x 实机截图**，非为本项目设计——品牌位与文案（UniHalo 发布公告、小莫唐尼、恋爱日记/投票中心）必须全部替换（D9）。本地仓库是 2.0.10，配色（粉 `#f79ea3` / Material 蓝 `#03a9f4`）与 demo 完全不同（全库无 `#D7F94C`）→ **页面结构参考本地，视觉令牌只认 demo**。设计令牌全部程序化采样（像素直方图 / 众数色 / 几何测量），非肉眼估计。

## 4. 关键数字口径

| 数字 | 口径 |
| --- | --- |
| 74 | blog 总篇数（54 文件夹型 + 20 平铺型） |
| 249 / 228 | 正文图片**引用数** / **文件数**（一图多引与引用未落盘并存）——`counts.images` 用哪个口径 M0 定，不用含糊的 246 |
| 3 / 75 | 画廊数 / 画廊图数 |
| 9 / 16 | 瞬间数 / 瞬间图数 |
| 62 / 64 | 站点标签口径（blog+galleries）/ 三集合原始去重（moments 的 2 个标签不进标签页） |
| 1651 | `dist/_astro/` 图片文件数（随内容变动） |
| 74 | OG 图 `/posts/<slug>/index.png` 已在 dist（只服务分享卡，D28 后不参与封面） |

## 5. 排查方法论留档（R10 复盘）

「线上与源码不符」按三步走：① `git status --porcelain` 先排掉「本地已改未提交」；② `git show origin/main:<file>` + `git log -1 -- <file>` 分清「未推送」与「已推送未构建」；③ 再判是「没写」「没提交」还是「未重建」。只抓线上不查工作区 = 把部署时延读成代码缺失。结论必须在动手前再确认一次前提，不能沿用几小时前的快照。

## 6. 事实来源对照（精选）

| 结论 | 来源 |
| --- | --- |
| 集合字段 / 标签 / 图片引用 | margin `src/content.config.ts`、`src/config.ts`、`src/data/**` |
| 内容规模 | 对 `src/data` 实测计数 |
| 部署方式 | `wrangler.jsonc`、`package.json` build 脚本 |
| 图片档位 | `astro.config.ts:66-69`；`dist/posts/*/index.html` srcset；`galleries/[gallery].astro:217-253`；`MomentCard.astro:94-101` |
| 指令降级 HTML | `remarkVideo.ts:87-89`、`remarkMusic.ts:160`、`remarkLinkCard.ts:429` |
| Pagefind 不可用 | `dist/pagefind/` 产物形态（WASM + 分片） |
| 设计令牌 | 对 `demo/*.png` 程序化采样与几何测量 |
| 裸域 301 / 缓存头 / ETag | `curl -sI` 实测（2026-09-28，四路径 + `_astro` 资源） |
| `Intl.Segmenter` 切词质量 | 本机 Node v24.15（full-icu）4 句实测 |
| 个人主体限制（web-view / 类目） | 微信开放社区《域名管理》官方文档（2026-09-28 复核） |
| 备案详情 / 小程序后台状态 | 工信部查询截图、小程序后台截图（2026-09-28） |
| 腾讯云核查口径与 D35 答复 | 腾讯云备案官方文档 + 智能客服答复截图（compliance.md §6） |
