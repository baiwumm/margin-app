# Margin 小程序 · 需求文档（主文档）

| 项 | 内容 |
| --- | --- |
| 项目代号 | margin-app |
| 文档版本 | **v3.2**（2026-09-28）：workers.dev 关闭（D44），M0 验收口径改为构建内断言 + 生产域复核。v3.1 完成 M0-0 双探针（D42/D43）；v3.0 全文重组口径不变，论证与过程记录在 `archive/` |
| 内容源 | `E:\personal-project\margin`（Astro 7 纯静态博客，线上 https://www.baiwumm.com/） |
| 视觉基准 | `demo/` 5 张图（uni-halo v3.x 实机观感）为唯一基准（D10）；`E:\personal-project\uni-halo`（2.0.10）仅作页面结构参考 |
| 配套文件 | [api-contract.md](api-contract.md) · [design.md](design.md) · [compliance.md](compliance.md) · [decisions.md](decisions.md) · [research.md](research.md) · [archive/requirements-v2.1.md](archive/requirements-v2.1.md) |

## 0. 一句话

把 Margin 静态博客的内容，用**构建期导出静态 JSON + 结构化正文 AST** 的方式喂给小程序，端上零后端、零运维地还原一个比 uni-halo 更精致的个人内容小程序。

## 1. 背景与目标

### 1.1 背景

- `margin` 是纯静态站：Astro SSG，内容为本地 Markdown/MDX（`src/data/blog|galleries|moments`），部署在 Cloudflare Workers Static Assets，**无任何运行时后端**。
- 内容规模：文章 **74** 篇（54 文件夹型 + 20 平铺型）、画廊 **3** 个（75 图）、瞬间 **9** 条（16 图）、标签 **62** 个（blog+galleries 口径）。
- 现有机器可读产物只有 rss / sitemap / OG 图 / comment-titles.json；站内搜索是 Pagefind（WASM 分片），小程序不可复用。
- `uni-halo` 是成熟的小程序客户端，页面结构可借鉴；但 Vue2 + HBuilderX + tm-vuetify 属上一代方案，不可沿用。

### 1.2 目标

| # | 目标 | 可验证标准 |
| --- | --- | --- |
| G1 | 内容零维护接入 | 发一篇文章 → 构建 → 小程序看到更新，人工操作 0 步 |
| G2 | 端上零后端 | 一期不新增任何服务器；静态内容全走 CDN 静态文件 |
| G3 | 阅读体验优于参考项目 | 含代码/表格/图片/自定义块的 6 类文章真机渲染正确，字号/行距/主题可调 |
| G4 | 视觉与 demo 一致 | 5 屏对照 demo 稿，设计令牌误差在可接受范围（design.md） |
| G5 | 包体与性能达标 | 主包 ≤ 1.5MB；冷启动 TTI < 1.5s（4G），缓存命中 < 500ms |

### 1.3 非目标

- ❌ 不做多用户/注册登录（个人博客，不是社区）。
- ❌ 不做后台管理端（内容仍在 margin 的 Markdown 里写）。
- ❌ 不把博客 HTML 搬进小程序（Block AST 方案，§5.3）。
- ❌ 一期不做评论/点赞云同步（降级为本地，二期视审核情况再定）。
- ❌ 不做 uni-halo 的「投票中心」「恋爱日记」等无关模块。

## 2. 范围

- **一期（M0–M4）**：内容浏览为主——首页、标签、图库、瞬间、我的 5 个 tab + 文章详情、搜索、归档、标签详情、友链、项目、关于/免责声明、偏好设置、收藏（本地）等二级页。
- **二期（M5，可选）**：微信云开发承载 UGC——点赞/收藏云同步、评论（含内容安全）、订阅消息、作者发布瞬间；提审发布。

## 3. 整体架构

### 3.1 总图

```mermaid
graph TB
  subgraph A["作者侧（不变）"]
    A1["Markdown 写作<br/>src/data/blog/&lt;slug&gt;/index.md"]
    A2["git push"]
  end

  subgraph B["margin 构建期（Cloudflare Git 集成，无新增 CI）"]
    B1["astro check + build"]
    B2["新增：小程序导出管线<br/>src/pages/api/v1/**"]
    B3["复用：astro:assets 图片优化<br/>getImage() + .astro 缓存"]
    B4["站点侧产物<br/>pagefind / rss / sitemap / OG"]
  end

  subgraph C["静态托管层"]
    C1[("CDN（已备案域名）<br/>/api/v1/*.json<br/>/_astro/*.webp<br/>/posts/*/index.png")]
    C2[("微信云开发 CloudBase（二期）<br/>云数据库 / 云存储 / 云函数")]
  end

  subgraph D["Margin 小程序（Taro + React + TS）"]
    D1["数据层<br/>manifest buildId + SWR 缓存"]
    D2["Block AST 渲染器"]
    D3["页面 / 业务组件"]
  end

  A1 --> A2 --> B1
  B1 --> B2 --> C1
  B1 --> B3 --> C1
  B1 --> B4
  C1 -->|"wx.request HTTPS + 白名单"| D1
  D1 --> D2 --> D3
  D3 -->|"点赞 / 收藏 / 评论（二期）"| C2
```

### 3.2 分层职责

| 层 | 职责 | 关键约束 |
| --- | --- | --- |
| 内容层 | Markdown 源文件，唯一事实来源 | 写作流程与 AGENTS.md 规范不变 |
| 导出层（新增，margin 内） | 内容编译成面向小程序的 JSON + Block AST；图片给绝对 URL 与尺寸 | 纯构建期；站点 HTML 产物字节不变 |
| 分发层 | CDN 静态分发 JSON 与图片 | 图片 immutable 强缓存；JSON 走 ETag 再验证 |
| 端上数据层 | manifest 版本比对、缓存、预取、失败降级 | 首屏不依赖网络（读缓存渲染） |
| 渲染层 | Block AST → 小程序原生组件 | 框架无关，纯数据驱动 |
| 交互层 | 页面、组件、偏好、动画 | 令牌统一，暗色可用 |

### 3.3 边界原则

> **内容（读）走静态 CDN，用户数据（写）走云开发。** 两条链路互不依赖——二期不上云开发，一期功能也完整可用。为什么不需要数据库 → §5.10。

## 4. 技术选型

### 4.1 结论

| 维度 | 选型 | 理由 |
| --- | --- | --- |
| 框架 | **Taro 4.x** | D5，见 §4.2 |
| 语言 | TypeScript 5+（strict） | 数据契约需要类型约束 |
| UI 运行时 | **React 18.3 起步（D36）** | 与用户既有栈一致；19 待 M1 验证 Taro 支持后再升 |
| 构建 | Taro 内置 Vite + SWC | 冷启动与 HMR 优于 Webpack |
| 状态管理 | Zustand + 自研 storage 持久化中间件 | 用户已在用；体积极小 |
| 数据请求 | 自研轻量 request（拦截器 + SWR 缓存 + 重试） | 小程序无 fetch/cookie 心智负担 |
| 样式 | CSS 变量令牌层 + **Tailwind v4 + weapp-tailwindcss v5（D37）** | 复用肌肉记忆；令牌层负责主题/暗色 |
| 基础组件 | 自研为主 | demo 视觉高度定制，组件库收益为负（§4.4） |
| 富文本正文 | 自研 Block AST 渲染器（不引 mp-html） | §5.3 |
| 代码高亮 | 构建期 Shiki 预高亮 → 端上按 token 上色 | 复用 margin 现有配置，端上零解析 |
| 图片 | Taro `<Image>` + 自研 `CacheImage`（三态 + 占位色 + 懒加载） | — |
| 图表 | 自研 canvas 轻量绘制 | 看板指标简单，引 echarts 增包 |
| 云能力（二期） | 微信云开发 CloudBase | 免备案域名、天然 openid、免费额度够用 |
| 包管理 | pnpm | 与 margin 一致 |

### 4.2 框架 = Taro 4（D5，不再讨论）

- 理由：① 用户既有项目全为 React/TS，选 Vue 系是逆肌肉记忆（单人长期维护权重最高）；② demo 视觉高度定制，框架组件生态无加成；③ Taro 4 工程条件更好（Vite+SWC、TS 一等公民、跨端保留）。
- 已否决：uni-app（Vue3 + wot-design-uni）、微信原生 + TS。**数据契约与 Block 渲染器框架无关——框架选错数据层不用重做。**
- ⚠️ **React 版本（D36）**：Taro 4 主线默认 React 18，React 19 依赖 react-reconciler 升级、官方未宣布完整支持。以 18.3 起步，M1 工程基座第一步用最小脚手架验证 19 可行后再升。

### 4.3 明确不采用

| 不采用 | 原因 |
| --- | --- |
| mp-html / towxml | 体积大；无法表达三个自定义指令块；样式不可控 |
| tm-vuetify | Vue2 时代重型组件库 |
| 直接魔改 uni-halo | 技术栈过时 + 1500 行死代码 |
| Pagefind 索引搬进小程序 | WASM 分片，技术不可行 |
| 为小程序加 SSR/接口服务 | 与零运维目标冲突 |
| 全套 UI 库（NutUI 等） | 见 §4.4；虚拟列表等硬骨头出现时按需引单个组件 |

### 4.4 关于「不引入组件库」

demo 视觉是低对比、大圆角、暖白底、柠檬绿点缀、悬浮胶囊导航——主流 UI 库默认风格覆盖成本与自研等价还多背包体。真正复杂的组件只有 4 个（图片网格、月份横滚选择器、Block 渲染器、悬浮 tabBar），全是一次性定制。反而这批基础设施值得自研长期持有：`request` / `CacheImage` / `usePagination` / `Empty` / `Skeleton` / `SafeArea`。

## 5. 数据层方案

### 5.1 核心判断

> **不在运行时把博客当接口用**：在 margin 构建期增设「小程序导出管线」，产出静态 JSON + Block AST，与站点同域部署；端上只消费 JSON 与图片，不解析 HTML、不依赖任何服务端。

1. margin 纯静态，任何接口化都要新起运行时服务，与 G1/G2 冲突。
2. 正文结构化/高亮/图片变体/聚合/索引全部构建期算完，端上零计算。
3. 内容更新频率 = 发文频率（低频），与 Cloudflare Git 自动构建天然契合，**无需新 CI**。
4. 失败模式好：CDN 没有「接口挂了」，最坏读到旧缓存仍可用。

### 5.2 契约概览（全文与类型见 api-contract.md）

- 统一 `ApiEnvelope`（`schemaVersion` / `buildId` / `generatedAt` / `data`）；`schemaVersion` 不匹配 = **软降级**（继续用缓存 + 只读认识字段），硬性版本隔离靠 `/api/v1` 与 `/api/v2` 目录并存（D24）。
- **13 个端点**，全部列表一次给全量、不做服务端分页（D26）。
- `assetBase = https://www.baiwumm.com`（无尾斜杠，D19）；端上代码不出现硬编码域名。
- 类型 M0 冻结进 `docs/api-contract.md`。

### 5.3 正文 = Block AST（类型见 api-contract.md §4）

- 三个自定义指令 `::link-card` / `::music` / `::video` 在标准 HTML 无对应物——选 AST 不选「HTML + mp-html」的决定性理由；同时端上主题切换、图片占位防抖、代码 token 上色、TOC 都只有 AST 能干净支撑。
- **前置重构（探针 B）✅ 已完成（2026-09-28，D43）**：三插件已抽出导出 `parse*Card(node)`，导出层旁路调用；同环境双管线比对证明 HTML 字节等价。**验收硬闸门 = 站点 HTML 产物字节不变**（M0 全站 diff 照常执行）。
- **禁止联网**：导出层不重跑外链 TDK 抓取，只读已入库的 `music-cache.json` / `video-cache.json`。
- 兜底：未识别节点落 `unknown` 块 + 构建期告警清单（警告不阻断发布）。

### 5.4 图片管线

- **只选择、不生成（D25）**：从集合自身已有档位按「≤目标宽度的最大可用档」挑，变体零新增（三集合档位不一致，api-contract.md §5）。
- AssetRef 给绝对 URL + 实际宽度 + `avgColor` 占位色（布局不抖动、加载不白闪）。
- **M0-0 探针 A ✅ 已通过（2026-09-28，D42）**：Endpoint 内 `getImage()` 确认落盘 `dist/_astro/` 且 sharp 可在 CF 构建镜像运行 → 按 D25 推进，三条退路不启用。
- **M0 必修**：`public/_headers` 追加 `/_astro/*` → `max-age=31536000, immutable`（只加这一组；JSON 维持 must-revalidate + ETag）。

### 5.5 检索（D3 / D12 / D21）

- 自建双层索引、端上本地检索：第一层 `titles.json` 随首屏（标题/标签/摘要/小标题 + 拼音，pinyin-pro 生成）；第二层 `terms.json` 输入 ≥2 字懒加载（全文倒排）。
- **中文 bigram 滑窗**：`Intl.Segmenter` 实测把「微信/小程序/优化」全切单字，弃用；bigram 零依赖、确定性，建索引与端上共用同一纯函数。
- 体积超 400 KB 先「正文只索引前 N 段」，不放宽上限。

### 5.6 标签口径（D4 / D22 / D31）

| 项 | 口径 |
| --- | --- |
| 数据源 | blog + galleries 合并去重 = **62**（moments 的 2 个标签不进标签页，与站点一致） |
| slug | 沿用 margin 的 slugify（拉丁 lower，CJK 走 kebabcase） |
| 配色 | 构建期直接下发 `color` / `colorDark` / `ink`（端上零计算）；按 count 降序序号 %10 取 10 档公式色板；构建期 WCAG 断言；M1 校准后色值写回 api-contract.md |
| 相关标签 | 标签详情页底部按共现推荐，**端上从 posts/index.json 现算**（74 篇量级零压力，不扩契约） |

### 5.7 版本、缓存与存储

| 机制 | 设计 |
| --- | --- |
| buildId | git short sha（仅可读标签）+ 内容 hash（**主键**）；热力图按 `pubDatetime` 聚合，零 git 依赖（D34） |
| 服务端缓存 | 图片 `/_astro/*` immutable；JSON 维持 must-revalidate + ETag（304） |
| 启动流程 | ① 读缓存渲染（0 等待）② 后台 GET manifest（If-None-Match）③ 304 结束 / 200 且 buildId 变 → 后台刷新 + 清旧 |
| 存储键 | `api:<name>:<buildId>` / `manifest` / `prefs` |
| 正文缓存 | 4 MB 按字节 LRU；单篇 >1MB 只留内存；**快照与 prefs 不参与淘汰**（D30） |
| 水位守卫 | `getStorageInfo`：>70% 触发淘汰、>90% 停预取；上限真机复核，不写死常量（R16） |
| 预取 / 省流 | 首屏预取 3 篇（WiFi 6 篇）；省流 = 全用 thumb + 不预取 |

### 5.8 margin 侧改造清单（纯新增 + 3 处行为等价重构）

| # | 改动 | 位置 | 影响站点 |
| --- | --- | --- | --- |
| 1 | 新增 13 个导出端点 | `src/pages/api/v1/**` | ❌ |
| 2 | AST 转换器 `toBlocks.ts` | `src/utils/export/`（走 `@astrojs/markdown-remark`，不新增 unified） | ❌ |
| 3 | 重构三个 remark 插件：抽 `parse*Card()` | `remarkLinkCard/Music/Video.ts` 各 3–5 行 | ⚠️ 行为等价，HTML diff 闸门守 |
| 4 | 图片工具 `toAssetRef.ts` | 档位选取 + getImage + sharp 取色 | ❌（前提=探针 A） |
| 5 | 检索索引 `buildSearchIndex.ts` | bigram 纯函数 + pinyin-pro；与端上共用同一实现 | ❌ |
| 6 | `export:mp` 脚本（可选，本地校验） | 不照抄 build 脚本写回 `public/` 的模式 | ❌ |
| 7 | `public/_headers` 追加 `/_astro/*` immutable | **只加这一组** | ⚠️ 回归确认 HTML/JSON 未被误设长缓存 |
| 8 | buildId 与内容 hash | git short sha + dist/api 内容 hash | ❌ |

硬性约束：`astro check` 0 错误；站点 HTML 产物 diff 字节一致（排除 `_astro` / `/api/v1` / 写回的 `public/pagefind`）；把 pinyin-pro 例外写回 margin `AGENTS.md:393-400`（D29 遗留）。

### 5.9 端上数据层

```
src/services/
├── request.ts        # 统一请求：baseURL 收敛、超时、重试、错误归一、并发去重
├── api/              # manifest(版本比对唯一入口) / site / posts / galleries / moments / tags / search
└── cache.ts          # storage 读写 + buildId 失效 + LRU + 体积统计
```

| 关注点 | 设计 |
| --- | --- |
| 统一响应 | 只认 HTTP 状态 + `ApiEnvelope`；4xx/5xx/超时/解析失败/schemaVersion 不认识 → 归一为 `LocalError` 枚举，业务层不接触 HTTP 细节 |
| 并发去重 | 同资源飞行中请求共享同一 Promise |
| 降级 | 网络失败 → 缓存；无缓存 → 内置最小 site 兜底 + 空态 + 重试；**上次成功全量快照写 storage 且不随 buildId 清空**（备案失效唯一兜底，compliance.md §7） |
| 域名 | `assetBase` 与 API baseURL 同取 `manifest.assetBase`，零硬编码 |
| 错误上报 | 仅本地记录 + 微信自带数据，不接第三方埋点 |

### 5.10 为什么不需要数据库

只有一个写者（git push）、读多写极少、数据量小到全量重算（产物 gzip 后几百 KB）、CDN 失败模式更好——数据库的核心价值（并发写/事务/随机读强一致）在这里全用不上。

```
你:    编辑 md → git push
CF:    astro build → dist/api/v1/** 与 dist/_astro/**
端上:  ① 读缓存渲染（0 等待）② 后台 GET manifest（If-None-Match）
       ③ 304 → 结束；200 且 buildId 变 → 后台刷新 + 清旧
```

**没有轮询、没有推送、没有「同步」动作**——每次启动只问一句「版本变了吗」。二期写入路径（点赞/收藏云同步/评论/发布）才用云开发，且只存 `openid + 目标 id + 时间戳`，**内容一个字不入库**。

## 6. 页面与模块

### 6.1 目录结构（Taro 工程）

```
margin-app/
├── config/                      # Taro 编译配置
├── docs/                        # 本文档组
├── src/
│   ├── app.tsx / app.config.ts / app.scss
│   ├── assets/                  # 图标、tabBar 图标、内置兜底图、Hero 图（本地打包，零请求）
│   ├── components/
│   │   ├── base/                # Card Pill Tag Empty Skeleton NavBar SafeArea Footer
│   │   ├── block/               # Block 渲染器：Paragraph Heading Image Code Quote List Table
│   │   │                        #             LinkCard Music Video Divider Unknown
│   │   ├── media/               # CacheImage ImageGrid VideoPlayer AudioCard
│   │   └── business/            # PostCard TagCard GalleryCard MomentCard
│   │                            # FloatingActions TabBar SearchBar MonthPicker
│   ├── constants/               # 设计令牌、枚举
│   ├── hooks/                   # usePagination useTheme usePreference useFavorite useManifest useReadingProgress
│   ├── services/                # §5.9
│   ├── store/                   # zustand：config / preference / cache / favorite
│   ├── styles/                  # tokens.css、暗色、Tailwind 入口
│   ├── types/                   # 与 /api/v1 契约对齐（api-contract.md）
│   ├── utils/                   # 日期、格式化、检索、存储、节流
│   └── pages/                   # §6.2
└── project.config.json
```

### 6.2 页面清单

**主包（5 tab，自定义 tabBar）**

| 页面 | 路径 | 数据来源 |
| --- | --- | --- |
| 首页 | `pages/home/index` | site + posts/index + tags/index |
| 标签 | `pages/tags/index` | tags/index（色块卡） |
| 图库 | `pages/gallery/index` | galleries/index + `<slug>.json`（筛选胶囊 = 全部 + 3 画廊名，D27） |
| 瞬间 | `pages/moment/index` | moments/index（全量单文件，端上聚合月份轴） |
| 我的 | `pages/mine/index` | site + stats + 本地收藏/记录 |

**分包 A（`pagesA`，内容与浏览）**：文章详情 `post`、搜索 `search`（双层索引）、归档 `archive`、标签详情 `tag-detail`、画廊详情 `gallery-detail`、图片浏览 `photo-view`、友链 `friends`、项目 `projects`、关于 `about` + 免责声明 `disclaimer`。~~公告列表/详情~~ 一期移除（D20：无内容源，空壳页是提审减分项；首页公告条 = `site.json.announcement` 单条，null 时整条隐藏）。

**分包 B（`pagesB`，个人与设置）**：偏好设置 `preference`（首页布局/字号/行距/主题/代码换行/省流）、我的收藏 `favorite`（本地）、阅读记录 `history`（本地）、数据看板 `stats`（自绘图表）、联系博主 `contact`（复制到剪贴板）。

### 6.3 demo → margin 映射要点

| 模块 | 口径 |
| --- | --- |
| 首页 Hero | site.json hero 配置 + featured 首篇；**Hero 图建议本地打包**（品牌视觉、零请求）⚠️ hero 字段与头像资产来源 M0 冻结契约时补进 site.json 定义 |
| 快捷导航 / 八宫格 | demo 项重映射（D9）：恋爱日记→图库、通知公告→删（D20）、投票中心→删；第 8 格用免责声明 |
| 最新推荐 tabs | 默认 / 置顶 / 最新 / 最旧；**「默认」= pubDatetime 降序**（M0 冻结时确认）；卡片无图（D28） |
| 瞬间发布入口 | 一期隐藏（个人主体 UGC 风险） |
| 全局 tabBar / 悬浮操作组 | 自定义组件（路线 Q8 待 M1 定案）；滚动超一屏出现 |

### 6.4 核心组件清单

| 组件 | 职责 | 复杂度 |
| --- | --- | --- |
| BlockRenderer | AST → 组件树分发，unknown 兜底 | 高 |
| CodeBlock | 按 token 上色、行号、语言角标、复制、换行/滚动切换 | 高 |
| CacheImage | 三态 + avgColor 占位 + 懒加载 + 预览 | 中 |
| ImageGrid / MonthPicker / TabBar / FloatingActions | 网格、月份选择、悬浮胶囊、滚动显隐 | 中 |
| Skeleton / Empty | 骨架屏（3 形态）、空态/错误态 | 低 |
| usePagination | 纯端上切片（页码 1 起，hasNext = 已渲染 < 全量） | 中 |

## 7. 视觉与交互

→ 全部见 [design.md](design.md)（令牌、交互规范、字体、CSS 硬约束、M1 打样 6 项、tabBar 路线）。两条先记：

- 浅色令牌 = 最终基线；暗色为推导值，M1 打样第 2 项校准。
- **有意偏离（D28）**：文章卡无图；视觉重量靠排版撑，M1 专门看是否单薄。

## 8. 备案与发布合规

→ 全部见 [compliance.md](compliance.md)。当前要点：个人主体已备案已认证；域名白名单两条已配；**变更备案已发起（2026-09-28）审核中**；接入商核查已闭环（D35）；上线前 checklist（取消暂停 / 隐私指引 / 备案号展示）见其 §12。

## 9. 里程碑

| 里程碑 | 内容 | 验收标准 |
| --- | --- | --- |
| **M0-0 可行性探针** ✅ **双通过（2026-09-28，D42/D43）** | **探针 A**：临时 Endpoint 对 blog+画廊图调 `getImage()` + sharp 1×1 均色，CF 预览构建实证：静态 `/_astro/*` 产物路径返回、sharp 0.35.4 可跑；**探针 B**：`parse*Card(node)` 抽取完成，同构建内嵌旧插件双管线比对三篇样文 HTML 全等（3345/9340/9170 B），parse 结构化 Block 1/3/5 条 | A 过 → 按「只选择不生成」（D25）推进，三退路不启用；B 等价性以同环境逐字节比对证明（全站 diff 因 workers.dev 被墙移至 M0 照常执行）；**无未验证前提进入 M0-1** |
| **M0 契约与导出管线** | 冻结 schema（api-contract.md）+ 13 端点 + toBlocks + toAssetRef + bigram 索引 + `_headers` + assetBase=www | ① 6 篇样文无 unknown + 单测过；② **构建内断言**（schema/体积/URL，违规即构建失败，D44）+ 合并后生产域抽样复核；③ HTML diff 一致（生产域合并前后比对）；④ `astro check` 0 错误；⑤ `_astro` 回传 immutable 且 JSON 未误设（生产域 curl）；⑥ 记录构建耗时与 dist 增量；⑦ 三组体积实测（D23 收益 / terms.json / stats）；⑧ WCAG 断言全过 |
| **M1 打样 + 基座 + 首页** | 6 个打样项（design.md §8）→ Taro 工程 / Tailwind v4+weapp-tw v5 / request+cache / Block 渲染器基础块 / 首页全部模块；**tabBar 路线定案（Q8）** | ① 打样全过=视觉基线；② 首屏 <1.5s、缓存命中 <500ms；③ 首页 6 模块数据正确无白闪（文章卡按无图验收）；④ 真机复核存储配额 + 301 行为写回文档；⑤ 切 tab 回首页滚动位置保留 |
| **M2 文章详情** | Block 全量块 + TOC + 进度 + 字号/行距/主题 + 代码块 + 图片预览 + 上下篇 + 分享 | ① 10 篇抽样渲染与站点一致（含三类指令块）；② 1000 行代码不卡；③ 分享卡图正确 |
| **M3 图库与瞬间** | 画廊列表/详情/图片浏览；瞬间年月导航/卡片/图组/视频音乐块 | ① 75+16 图全可浏览；② 月份切换计数正确；③ 大图手势顺畅 |
| **M4 检索、归档与个人中心** | 搜索（双层+拼音+高亮+历史）、归档、标签详情、友链、项目、关于（**备案号展示**）、我的页 | ① 一层 <40KB 即时、二层 ≤400KB、拼音首字母命中；② 偏好全生效持久化；③ 主包 ≤1.5MB；④ 备案号可见可复制；⑤ 连续读 30+ 篇无 `exceed size` |
| **M5 云能力与发布（二期）** | 云开发（点赞/收藏同步、评论+msgSecCheck、订阅消息、发布瞬间）；提审 | ① 审核通过；② 内容安全自检过；③ 云数据按 openid 隔离 |

**关键路径**：M0-0 双探针是第一硬前置——它决定 §5.3/§5.4 的地基是否成立。探针过了才冻结契约；M0 完成经确认后启动 M1 打样。**先撞墙再铺量，顺序不能反。** 验证策略（D44 定型）：本地只跑 `astro check` + 单测 + dev 冒烟（margin 本地完整 build 会随机卡死，research.md §1）；合并前信号 = 分支构建 check-run（构建内断言，违规即失败）；合并后 = 生产域（www）复核。workers.dev 已关闭（D44），不再有预览产物可访问。

**外部流程**（不阻塞编码）：✅ 备案号悬挂、✅ 域名白名单两条、✅ 控制台核查、✅ 头像；🔄 变更备案审核中；⬜ 隐私指引（M5 提审前）、小程序备案号展示（M4）、`_headers`（M0 顺手）、**新版上线前取消暂停**。

## 10. 非功能性需求

| 类别 | 要求 |
| --- | --- |
| 包体 | 主包 ≤1.5MB；总包 ≤6MB；大资源走网络+缓存不进包 |
| 性能 | 冷启动 TTI <1.5s（4G）；缓存命中 <500ms；列表 60fps；长文（>5000 字）分段渲染 |
| 网络 | 单请求 ≤400KB；首页 JSON 合计 ≤120KB（gzip 后）；弱网走缓存可读；全部请求走 www、不依赖 301 |
| 存储 | 单 key ≈1MB / 总 ≈10MB 为设计边界（真机复核，代码读 getStorageInfo）；正文 4MB + 索引 0.5MB + 快照/prefs 1MB；70%/90% 双水位 |
| 兼容 | 基础库 ≥2.30（推定，M1 按实际 API 核对：onThemeChange / previewImage loop / tabBar.custom）；iOS 14+ / Android 8+；仅竖屏 |
| 暗色 | 跟随系统 + 手动覆盖；令牌 M1 定稿 |
| 无障碍 | 正文 26–40rpx 可调；对比度正文 ≥4.5:1、大字 ≥3:1，色板由构建期断言 |
| 安全 / 隐私 | 端上无 token；云数据按 openid 隔离；不采集设备信息、不接埋点、不请求非必要权限 |
| 可维护 | 站与小程序同一内容源；结构变更由构建期校验提前暴露 |

## 11. 当前状态与风险

### 11.1 风险登记（R1–R18）

| # | 风险 | 状态 | 缓解 |
| --- | --- | --- | --- |
| R1 | 境外托管与备案的张力 | P2 接受 | 快照兜底 + `_astro` 长缓存（compliance §7） |
| R2 | 个人主体硬限制 | P0 约束 | compliance §3，已写入方案 |
| R3 | 导出管线构建增量 | P2 | 变体零新增（D25）；avgColor 按 hash 缓存；M0 实测耗时 |
| R4 | 内容结构漂移缺块 | P1 | unknown 兜底 + 告警 + schemaVersion |
| R5 | 音乐块不可播 | P1 | 卡片 + 复制链接 / 自托管 mp3 |
| R6 | 视频块不可播 | P1 | 封面跳转 / 自托管 mp4 |
| R7 | 超长文章单文件过大 | P2 | D23 瘦身（M0 实测）；仍超再分块传输 |
| R8 | 依赖 Astro 内部 API | P2 | export 解耦 + schemaVersion；落盘前提=探针 A |
| R9 | 框架选型反复 | ✅ 关闭（D5） | — |
| R10 | 备案号悬挂 | ✅ 关闭 | `1d6c198` 已上线（compliance §8） |
| R11 | 接入商核查「解析非腾讯云」 | ✅ 闭环（D35） | 回归 B：接受 + 快照兜底（compliance §6） |
| R12 | 备案联系方式失效 | ✅ 前置已确认 | 保持可达（compliance §6） |
| R13 | 改名未变更备案 | ✅ 关闭 | 已发起，审核中（compliance §5） |
| **R14** | `getImage()` 在 Endpoint 内是否落盘 | ✅ **关闭（D42）** | 探针 A 通过：CF 构建实证静态 `/_astro/*` 落盘 + sharp 可跑 |
| **R15** | 三个 remark 插件降级 HTML 串 | ✅ **关闭（D43）** | 探针 B 通过：`parse*Card` 抽取 + 同环境字节级等价证明 |
| R16 | `wx.setStorage` 上限 | P1 | D30 字节预算 + 水位守卫 + M1 真机复核 |
| R17 | 浅克隆影响热力图/buildId | ✅ 关闭（D34） | — |
| R18 | 依赖批准 | ✅ 关闭（D29） | AGENTS.md 写回归 M0 |

### 11.2 开放项

| # | 事项 | 归属 |
| --- | --- | --- |
| Q3 | 免责声明初稿待审（含 3 处措辞） | compliance.md §11 |
| Q8 | tabBar 路线 A/B | M1 打样第 3 项定案（design.md §8） |
| Q11 | `docs/` + `demo/` 提交范围 | ✅ **已提交（2026-09-28）**：docs/（含 archive 快照）与 demo/ 5 张稿一起入库（私有仓库，采样源随之可复现） |

### 11.3 契约待补项 → ✅ 已全部闭环（D38–D41，2026-09-28 用户确认）

| 项 | 结论 |
| --- | --- |
| Hero 图来源 | 打包进 app `src/assets/`；`site.json` 加 `hero` 文案字段；具体图片 M1 定稿（D38） |
| 作者头像 | margin `public/avatar.png`；打包 + `site.json.avatar` 双轨（D39） |
| tabs「默认」排序 | `pubDatetime` 降序（D40） |
| `counts.images` 口径 | 按引用数 249（D41） |

M0 冻结 api-contract.md 时把这四条落进类型定义即可，无剩余待确认。

## 12. 文档地图

| 文件 | 内容 | 何时读 |
| --- | --- | --- |
| **requirements.md**（本文） | 目标 / 架构 / 选型 / 数据层 / 页面 / 里程碑 / 状态 | 总览 |
| **api-contract.md** | 13 端点 + 全部类型 + Block AST + 图片档位 + 检索索引 + 缓存规则；**M0 冻结对象** | M0 起每天 |
| **design.md** | 令牌 / 交互 / 字体 / CSS 硬约束 / M1 打样清单 / tabBar | M1 起 |
| **compliance.md** | 备案 / 域名 / 个人主体限制 / D35 留档 / 免责声明 / 上线 checklist | 备案事务与发布前 |
| **decisions.md** | D1–D37 一行结论 | 查口径 |
| **research.md** | F1–F8 事实 / uni-halo 结论 / 数字口径 / 方法论 | 追溯依据 |
| **archive/requirements-v2.1.md** | v2.1 全文快照（只读，含全部论证过程） | 需要背景论证时 |

## 13. 变更记录

- **v3.2（2026-09-28 晚）**：workers.dev 关闭（D44）；M0 验收口径改为「构建内断言（违规即构建失败）+ 生产域复核」，§9 同步。
- **v3.1（2026-09-28）**：M0-0 双探针通过（D42/D43）——R14/R15 关闭，§5.3/§5.4 前置项消除；探针方法与实测数据见 research.md §7。M0 解锁。
- **v3.0（2026-09-28）**：全文重组拆分；补记 D36（React 18.3 起步）/ D37（weapp-tailwindcss v5）；契约待补项显式列出（§11.3）。内容口径与 v2.1 等价。
- v2.1（2026-09-28）：Q1 闭环（D35：A 否决、回归 B）；变更备案发起 / 头像 / 控制台核查三项闭合。
- v2.0（2026-09-28）：事实层勘误 + M0-0 双探针前置 + 11 项答复固化 D19–D34。
- v1.9 及更早：见 archive。
