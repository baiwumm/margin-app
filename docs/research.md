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
- **margin 本地 build 会随机卡死**（三次复现、进程零 CPU；`astro check` 始终 0 错误）→ 验证策略（D44 定型）：本地只跑 `astro check` + 单测 + dev 冒烟；合并前信号 = 分支构建 check-run（构建内断言，违规即构建失败）；合并后 = 生产域（www）复核。~~产物真伪以 Cloudflare 预览构建为准~~（workers.dev 已于 2026-09-28 关闭，预览产物不再可访问）。
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

## 7. M0-0 双探针实测（2026-09-28，决策 D42 / D43）

**执行方式**：margin 仓库临时分支 `probe/mp-export`（基点 1d6c198，6 个提交），Cloudflare Workers Builds 随推送自动构建（`astro check` + `astro build` + pagefind，每次约 3–5 分钟），构建状态经 GitHub check-run「Workers Builds: margin」轮询（其 output 含 Version ID 与 Preview URL：`https://<version前缀8位>-margin.proud-wood-97f5.workers.dev`，另有分支别名 `probe-mp-export-margin.…`）。构建耗时留档：margin 全仓 `git log --oneline | wc -l` = **184**（仅留档，不作决策输入）。

**验证方法论（workers.dev 被墙的替代方案）**：本机网络对 `*.workers.dev` DNS 污染 + SNI 阻断，公共 CORS 代理全部不可用 → 无法本地爬预览产物做全站 diff。改为：① 探针端点在**构建时**把探针 JSON POST 到临时收集器（webhook.site，仅公开站点渲染数据，探针后删除）回传证据；② 探针 B 等价性用「**同一构建内**内嵌 1d6c198 旧插件副本 vs 新插件双管线渲染逐字节比对」证明——环境差异对两侧同时生效完全抵消。生产站（www，本机可达）另做对照。生产站基线：156 个 sitemap 页全量爬取存档（`mp-probe-work/prod/`），确认 = 1d6c198 内容（ICP 页脚 + 最新文章在线）。

**探针 A 实测（CF 构建 Version 69d995d3）**：

| 项 | 结果 |
| --- | --- |
| `getImage({src, width:750})` blog 正文图 | 返回静态产物路径 `/_astro/01-1panel-appstore-install.gQGeOO6e_1JSbx4.webp`（原图 1600×759 webp），srcset 描述符 640/750/828/1080/1280/1500w |
| `getImage({src, width:800})` 画廊图 | 返回 `/_astro/01-panda-telescope.BlJfiB4t_Z1jKIhk.webp`（1600×1200），srcset 640–1600w |
| sharp（构建镜像内） | 0.35.4 可跑；1×1 均色 blog `#fdfdfd`、gallery `#93adc2`（flatten 白底，即 M0 avgColor 同款用法） |
| 结论 | Endpoint 内 `getImage()` 变体随构建落盘 `dist/_astro/`（emit 路径 + 构建成功 + dist 全量部署）；URL 的 HTTP 200 点验因 workers.dev 被墙移至 M0 生产部署后在 www 域复核 |

**探针 B 实测（同一次构建）**：

| 项 | 结果 |
| --- | --- |
| 同环境 旧插件 vs 新插件（决定性证据） | 三篇样文（link/music/video 各 1 篇）渲染 HTML **逐字节全等**：hjmbkpt6 3345 B、m6qk2v8x 9340 B、v3k8mz7q 9170 B，`equal: true ×3` |
| `parse*Card` 结构化输出 | hjmbkpt6 1 条 link-card、m6qk2v8x 3 条 music（含 platform 白名单与 audio 透传）、v3k8mz7q 5 条 video（BV/直链/降级全形态），与站点 HTML 节点一一对应；代码围栏内的示例行不误判 |
| 生产站 vs 本构建对照（环境噪声记录） | hjmbkpt6：唯一差异为 GitHub og 图 URL 内嵌 cache hash（时变），归一化后全等；m6qk2v8x：等长差一处网易云封面 CDN URL（见下）；v3k8z7q：shiki `mdx` 语言高亮差异（见下）。三者均为**既有构建环境行为**，与重构无关（同环境实验已隔离证明） |

**环境噪声三案（M0 导出层设计输入）**：

1. **music/video 数据层缓存路径**：`music.ts`/`video.ts` 用 `import.meta.url` 定位缓存 JSON，bundle 后指向产物位置 → CI 构建内缓存 miss → 回源抓取，网易云封面 CDN URL 轮换 → 同内容两次构建 HTML 不等长不变但 URL 变。M0 的 toBlocks **必须自己读缓存文件**（构建脚本进程内 cwd 可达），不能依赖插件数据层的隐式缓存。
2. **shiki 语言懒加载**：独立调用 `createMarkdownProcessor`/`createRenderer` 时部分语言（如 `mdx`）高亮回退纯文本；与站点渲染管线共用同一 processor 实例则一致。M0 渲染正文应复用站点管线形态。
3. **fetchTdk 构建期联网不稳定实锤**：某次 CI 构建中对 `github.com` 的 TDK 抓取失败，链接卡降级渲染 → 支持「导出层禁止联网、linkcard 只填 href+手写文案」的既定决策。

**探针产物清理**：临时端点 `src/pages/api/v1/probe-mp.json.ts`、旧插件内嵌副本 `src/utils/probeLegacyPlugins.ts` 与 probe 分支随验收删除；**重构本体（三插件 parse*Card 导出，提交 d92b8f1）已验证、需进 margin main**——以补丁形式存档于 `docs/archive/probe-mp-export-refactor.patch`，margin 本地另留备份分支 `backup/probe-mp-export`，M0 开工时由用户确认后应用进 main。

**后续变更（2026-09-28 晚，D44）**：用户已**关闭 workers.dev 访问**（站点仅 `www.baiwumm.com` 可达）——上文 Preview URL / 分支别名模式与 webhook 回传自此成为**历史手段**（本节保留作过程记录）。M0 起的验证口径定型为：

1. **合并前**：分支 push → Workers Builds check-run（构建脚本含 `astro check` + 构建 + **构建内断言**——导出端点对 schema/体积预算/URL 规则/缓存头/WCAG 自检，违规 throw 使构建失败）。⚠️ non-production builds 必须保持开启，check-run 是唯一合并前 CI 信号。
2. **本地**：`pnpm dev` 冒烟看端点 JSON 形态（dev 可用，完整 build 才会卡死）。
3. **合并后**：生产域复核——curl URL 200 / `/_astro/*` immutable / JSON 抽样；全站 HTML diff 用「合并前后各爬一次 www」（基线 156 页已存档 `mp-probe-work/prod/`，爬取脚本 `mp-probe-work/scripts/crawl.py` 可复用）。
