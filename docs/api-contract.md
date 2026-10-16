# Margin 小程序 · 数据契约（/api/v1）

> **状态**：M0 冻结对象（冻结后字段名不再改动）。本文是导出层（margin 仓库）与端上 `src/types/` 的唯一对齐源。
> **变更规则**：契约变更 = 新增 `/api/v2/**` 目录、`/api/v1/**` 保留不删，构建期同时产出两版；端上对 `schemaVersion` 不匹配做**软降级**（继续用本地缓存 + 只渲染认识的字段），**不弹「请更新小程序」**（提审滞后 + 自动更新滞后，硬提示等于自我锁死）。旧目录下线时机 = 该 schemaVersion 存量占比 < 1%。

## 1. 公共约定

```ts
// 所有 /api/v1/** JSON 的公共外包装
interface ApiEnvelope<T> {
  schemaVersion: number;   // 不匹配 → 软降级
  buildId: string;         // git short sha + 内容 hash；sha 只作可读标签，主键是内容 hash
  generatedAt: string;     // ISO8601
  data: T;
}
```

- **全量不分页**：所有列表端点一次给全量，`ApiEnvelope` 不含 `page / hasNext / total`。74 篇量级上取消分页；将来超 400 KB 硬线再引入 `?cursor=`，届时按新编号补记。端上列表分页因此是**纯端上切片**（页码从 1 起，`hasNext = 已渲染 < 全量`）。
- **assetBase**：`https://www.baiwumm.com`（**无尾斜杠**）。裸域所有路径 301 → www，任何请求不得依赖 301；JSON 里 `path` 类字段仍是站点相对路径。
- **URL 断言（构建内硬规则）**：产物 JSON 中任何 URL 不得出现 `//_astro/`、不得出现 `https://baiwumm.com/`。
- **体积硬线**：单请求 ≤ 400 KB（gzip 前）；首页所需 JSON 合计 ≤ 120 KB（gzip 后）。
- **图片路径口径**：`AssetRef.src/md/thumb` 填**站点已产出的变体文件名**（§5），不保证宽度等于目标值；缺档按「≤目标宽度的最大可用档」回落，并如实写实际宽度。

## 2. 端点清单（13 个，构建期由 `src/pages/api/v1/**` 落盘为静态文件）

> 体积预算列中「实测」为 M0 全量构建数字（74 篇）；端上真实流量以 gzip 后为准（manifest ≈ 4KB、titles ≈ 12KB）。

| 端点 | 内容 | 体积预算（gzip 前） |
| --- | --- | --- |
| `GET /api/v1/manifest.json` | 版本与资源清单（结构见 §3.3 Manifest） | ≤ 24 KB（实测 14.5KB） |
| `GET /api/v1/site.json` | 站点配置：标题/描述/作者/头像（avatar）/社交链接/导航/hero 文案/`announcement`（单条或 null）/首页 layout 开关/主题令牌 + 色板 | < 6 KB（实测 0.8KB） |
| `GET /api/v1/posts/index.json` | 文章列表元数据（**不含正文**），74 篇全量 | < 80 KB（实测 37.6KB） |
| `GET /api/v1/posts/<slug>.json` | 文章详情（含 Block AST 正文） | 单篇 ≤ 200 KB（实测 3.8–42.6KB，中位 12KB） |
| `GET /api/v1/galleries/index.json` | 画廊列表（`photoCount` / `cover` / `tags`） | < 4 KB（实测 3.6KB） |
| `GET /api/v1/galleries/<slug>.json` | 画廊详情（`photos: GalleryPhoto[]`，一份文件给全不分片） | ≤ 200 KB（实测 ≤ 42.6KB） |
| `GET /api/v1/moments/index.json` | 瞬间全量（9 条 / 16 图，单文件不分片；月份分组由端上按 `pubDatetime` 算） | < 60 KB（实测 14.6KB） |
| `GET /api/v1/tags/index.json` | 标签聚合（blog + galleries = 62 个；含 `count` / `slug` / `color` / `colorDark` / `ink`） | < 12 KB（实测 6.6KB） |
| `GET /api/v1/friends.json` | 友链分组 | < 8 KB（实测 6.5KB） |
| `GET /api/v1/projects.json` | 项目列表（stars/forks 构建期已刷新） | < 8 KB（实测 1.8KB） |
| `GET /api/v1/stats.json` | 数据看板（热力图按 `pubDatetime` 聚合） | < 16 KB（实测 3.3KB） |
| `GET /api/v1/search/titles.json` | 检索第一层：标题/标签/摘要/小标题 + 拼音 | ≤ 48 KB（实测 46.3KB） |
| `GET /api/v1/search/terms.json` | 检索第二层：全文倒排，输入 ≥2 字懒加载（bigram） | ≤ 400 KB（实测 376–379KB，两批次口径均低于硬线；正文只索引前 28 段，§6 授权的收缩手段） |

## 3. 类型定义

### 3.1 文章

```ts
/** 列表项元数据 —— 不含正文，首页/标签/归档/搜索复用同一结构。
 *  列表排序 = pubDatetime 降序；首页「RECENT」同口径。 */
interface PostMeta {
  slug: string;              // 由 getPath 推导，端上不推算
  path: string;              // 站点相对路径，如 "/posts/r4ACa87S/"
  title: string;
  description: string;
  tags: string[];
  pubDatetime: string;       // ISO8601（Asia/Shanghai）
  modDatetime: string | null;
  featured: boolean;         // 对应 frontmatter featured → 端上 FEATURED 区 + 琥珀语义色
  draft: false;              // 导出层已过滤，恒为 false
  cover?: AssetRef;          // 一期不下发（margin 站点 showCoverImages=false，文章卡本就无图）。
                             // 保留可选字段，为将来「只给 featured 配封面」留后门，不必升契约版本
  ogImage: string | null;    // "/posts/<slug>/index.png"，只服务分享卡
  readingTime: number;       // 分钟（readingTime.ts）
  wordCount: number;
}

/** 图片资源引用：端上只认这个结构，不猜路径。
 *  三个字段填「站点已产出的档位」，不保证宽度等于目标值；缺档回落并如实写实际宽度。 */
interface AssetRef {
  src: string;               // 绝对 URL，全屏预览用（该图可用的最大档）
  md: string;                // 绝对 URL，正文用（目标 ≤800px）
  thumb: string;             // 绝对 URL，列表卡用（目标 ≤400px）
  srcWidth: number;          // src 档实际宽度
  mdWidth: number;           // md 档实际宽度
  thumbWidth: number;        // thumb 档实际宽度
  width: number;             // 原始宽度（与 height 一起决定占位比例）
  height: number;
  format: 'webp' | 'avif' | 'png' | 'jpg';
  bytes: number;             // src 档字节数，端上做省流模式与流量判断
  avgColor: string;          // "#RRGGBB"，显色前的占位背景，避免白闪
}

/** 文章详情 */
interface PostDetail {
  meta: PostMeta;
  blocks: Block[];           // §4 结构化正文；img 块只存 assets 下标
  toc: TocItem[];
  assets: AssetRef[];        // 正文内所有图片的唯一一份定义，img 块按下标引用
  prev: PostMeta | null;
  next: PostMeta | null;
  canonicalURL: string;
}

interface TocItem { id: string; text: string; depth: 2 | 3 | 4 }
```

### 3.2 其余集合

```ts
interface Gallery {
  slug: string; path: string; title: string; description: string;
  tags: string[];                       // 画廊自身 frontmatter 的 tags
  photoCount: number;                   // 实测全集 3 个画廊 / 75 张
  cover: AssetRef;                      // 站点封面档为 800/1200/1600
  photos: GalleryPhoto[];
}
interface GalleryPhoto { asset: AssetRef; alt: string; name: string }   // name = 去掉数字前缀的语义名，供网格左下叠字

interface Moment {
  id: string;                           // moments 无 slug，用文件名派生的稳定 id
  text: string;                         // 正文在 frontmatter `text` 字段
  pubDatetime: string;
  images: AssetRef[];                   // import.meta.glob 收集，档位仅 400/800
  tags: string[];
  music?: { platform: 'netease' | 'qq'; id: string; audio?: string };
  video?: { id?: string; src?: string; poster?: string; title?: string; ratio?: string };
  likes: null;                          // 一期恒 null，占位以免二期改结构（点赞属二期）
}

interface Tag {
  name: string; slug: string; count: number;
  color: string; colorDark: string; ink: string;   // 构建期定死三个色值，端上零计算。
                                                   // margin 对齐下标签卡为细边框 + accent 风格，
                                                   // 三色字段端上暂不消费，契约不动
}
interface FriendGroup { title: string; items: { name: string; url: string; desc: string; avatar: string | null }[] }
interface Project { name: string; url: string; desc: string; lang: string | null; stars: number; forks: number; topics: string[]; accountStars?: number; joinedAt?: string }
// accountStars/joinedAt = 账号级加性可选字段（D66，margin 8079583 起逐项冗余下发：
// 站点 hero 徽章口径「全账号 Stars + 加入 GitHub 时长」）。GitHub 拉取失败时整组
// 缺席 ⇒ 端上回退旧口径（已列项目 Stars/Forks 合计），schemaVersion 保持 1。
// url = repoUrl（D66 起不再回退 homepage）。
```

### 3.3 统计与清单

```ts
interface Stats {
  postCount: number; galleryCount: number; momentCount: number; tagCount: number;
  totalWords: number; readingMinutes: number;
  streakMonths: number;                 // 连续写作月数
  heatmap: { date: string; count: number }[];   // 按文章 pubDatetime 聚合，不读 git（语义＝「本月发布了几篇」）
  monthBuckets: { month: string; words: number; posts: number }[];
}

interface Resource { name: string; path: string; hash: string; bytes: number }
// hash = sha256 截断 12 位（M0 实测定档）
interface Manifest {
  schemaVersion: number; buildId: string; generatedAt: string;
  assetBase: string;                    // 固定 "https://www.baiwumm.com"
  site: { title: string; author: string; desc: string };
  counts: { posts: number; galleries: number; moments: number; tags: number; images: number };
  // images = 正文图片引用数（生产实测 246）
  resources: Resource[];                // 端上按 hash 做细粒度失效
  searchIndex: { titlesPath: string; titlesHash: string; termsPath: string; termsHash: string;
                 termsMinChars: 2; strategy: 'bigram' };
}
```

## 4. 正文结构化：Block AST

**为什么不用 HTML + mp-html**：① 三个自定义指令 `::link-card` / `::music` / `::video` 在标准 HTML 里没有对应物；② 富文本组件体积大、内联样式毁掉端上主题切换；③ 端上解析 HTML 是纯浪费（构建期有充裕算力做高亮/尺寸/目录）。

**前置重构 ✅ 已完成**：margin 三个 remark 插件的解析逻辑已抽成导出函数（以节点为入参，指令匹配与插件本体严格同源）：

```ts
parseLinkCard(node: MdNode): LinkCardData | null      // { url, note?, overrideTitle?, overrideDescription? }
parseMusicCard(node: MdNode): MusicCardAttrs | null   // { id, platform, audio? }（含 platform 白名单兜底）
parseVideoCard(node: MdNode): VideoCardAttrs | null   // { id?, src?, poster?, title?, ratio? }
```

非指令段落一律返回 `null`；插件本体 = 「parse → TDK/resolve → buildHtml」。等价性以同环境双管线逐字节比对证明（research.md）。导出层在 Markdown AST 层先摘出指令节点、旁路调 `parse*`，其余节点走 hast 降维。

**M0 实测行为定档（全量 74 篇验证）**：

- `linkcard`：站内链填 frontmatter TDK（禁联网）+ `icon` = `/posts/<slug>/index.png`；外链**只填** `href` + 作者手写 `title`（override/note），无手写时标题降级为域名（fetchTdk 不重跑的代价）。
- `video`：B 站链接自动提取 BV 号；非 B 站 `id`（无 `src`）离线降级为 `linkcard`（b23.tv 短链因禁联网保留原样，端上 M2 处理）。
- `unknown` 兜底实测 35 处/10 篇：作者手写 `<div class="grid …">` 布局 HTML（成对出现，端上按 unknown 呈现占位说明）、MDX 文章的 JSX（仅 1 篇 4 处）、远程图（1 处）。构建期警告不阻断。
- 块统计实测：p 1070 / h 520 / list 442 / code 365 / img 246 / linkcard 46 / quote 52 / table 29 / music 3 / video 4 / hr 2 / unknown 35。

**禁止联网**：`remarkLinkCard.ts:222 fetchTdk()` 会在构建期发网络请求抓外链 TDK——导出层**不得**重跑（Cloudflare 构建容器耗时/内存更紧，不拿已知不稳定环节赌发布）；linkcard 块只填 `href` + 作者手写标题/备注，已解析的 TDK 从 `music-cache.json` / `video-cache.json` 读。

```ts
type Block =
  | { t: 'p';    i: Inline[] }
  | { t: 'h';    d: 2 | 3 | 4; i: Inline[]; id: string }
  | { t: 'img';  a: number; alt?: string }   // assets 下标，不内嵌 AssetRef（瘦身）
  | { t: 'code'; lang?: string; file?: string; lines: number;
                 tokens: CodeToken[][];       // 构建期 Shiki 预高亮结果
                 highlighted: true }          // 高亮失败时 tokens 仍存在（每行一个无 c 的 token）
  | { t: 'quote'; i: Inline[] }
  | { t: 'list'; ordered: boolean; items: Inline[][] }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { t: 'hr' }
  // ── 三类自定义指令，由 parse* 直接给出，不经过 HTML 串 ──
  | { t: 'linkcard'; href: string; title: string; desc?: string; icon?: string }
  | { t: 'music';    platform: 'netease' | 'qq'; id: string; audio?: string;
                 name?: string; artist?: string; cover?: string }
  | { t: 'video';    id?: string; src?: string; poster?: string; title?: string; ratio?: string }
  // ── 兜底：未识别的节点不丢内容 ──
  | { t: 'unknown'; raw: string };

interface Inline {
  t: 'text' | 'code' | 'br';
  v: string;
  bold?: boolean; italic?: boolean; strike?: boolean;
  link?: { href: string; external: boolean };
}

/** 紧凑的代码着色：颜色走索引，配色表由 manifest 下发 */
interface CodeToken { v: string; c?: number }
```

- **瘦身两处**（服务「单篇 ≤200 KB / 单 key ≤1 MB / 总 10 MB」上限）：`img` 引 `assets` 下标（一个 AssetRef ≈ 250 B × 246 张正文图，内嵌等于白翻倍）；`code` 删掉 `code: string` 字段（纯文本 = `tokens.map(t=>t.v).join('')`，复制功能照用）。
- **构建期校验**：逐篇转换收集 `unknown` 块与缺失字段，构建日志汇总；CI 上 unknown = 警告不阻断发布。

## 5. 图片管线

**原则：只选择、不生成。** 三集合档位不一致（research.md 实测），不存在一组全体可用的固定三档；从**集合自身已有档位**按「≤目标宽度的最大可用档」挑，变体零新增。

| 档位 | 目标宽度 | blog 正文图命中 | galleries / moments 命中 | 用途 |
| --- | --- | --- | --- | --- |
| `thumb` | ≤400px | 640（无 400 档回落，如实写宽度） | 400 | 画廊卡、瞬间图网格、画廊封面（**不含文章卡**） |
| `md` | ≤800px | 750 / 828 | 800 | 正文内图片、瞬间图片 |
| `src` | 该图可用的最大档 | 1080 / 1280 / 1541 | 1600 / 800 | 全屏预览 |

- 格式随站点产物（webp），**不新增 avif 档**。
- 体积验收阈值：`thumb` ≤40 KB / `md` ≤120 KB / `src` ≤400 KB（M0 实测全过）。
- **avgColor**：构建期用 sharp 对每图做 1×1 采样取平均色（CF 构建镜像实证可跑）。

## 6. 检索索引

否决：Pagefind（WASM 分片 + DOM 依赖，技术不可用）、Algolia/Meilisearch/Typesense（要常驻服务）、云开发正则（无全文索引 = 全表扫描）。

```ts
interface TitleIndex {
  buildId: string;
  docs: {
    slug: string;
    title: string;
    tags: string[];
    desc: string;
    headings: string[];
    pinyin: string;      // 标题+标签的全拼与首字母（pinyin-pro 构建期生成）
    pubDatetime: string;
  }[];
}

interface TermIndex {
  buildId: string;
  fields: ['title', 'tags', 'description', 'headings', 'body'];
  terms: Record<string, string>;   // term → 紧凑 postings "docId:weight,docId:weight"
  strategy: 'bigram';
}
```

- **切词 = bigram 滑窗**：中文 2 字滑窗（「小程序」→ `小程` + `程序`），拉丁/数字按词（小写、去标点）；单字查询交给第一层。`Intl.Segmenter('zh-CN')` 实测把常用词全切成单字，弃用；bigram 召回稳定、体积可预测、零依赖，且**建索引与端上查询共用同一纯函数**。
- **权重**：标题 5 / 标签 4 / 摘要 3 / 小标题 2 / 正文 1。
- **排序**：不用 BM25。简化打分 = `Σ(命中词 × 字段权重) × 时间衰减 + featured 加成`。
- **高亮**：端上用命中 term 反向标注，取首个命中前后约 20 字作摘要行；高亮样式按 margin 搜索结果皮（accent 25% 底 + accent 字）。
- **体积控制**：超 400 KB 先启用「正文只索引前 N 段」，不放宽上限（实测正文前 28 段 = 379KB）。
- **端上流程**：输入 → 第一层即时渲染 → 关键词 ≥2 字且第二层未加载则后台拉取 → 合并去重重排。全程无阻塞。

## 7. 缓存、版本与存储

| 机制 | 设计 |
| --- | --- |
| 版本标识 | buildId = git short sha + 内容 hash；**内容 hash 是主键**（浅克隆只影响可读性）；热力图按 `pubDatetime` 聚合，零 git 依赖 |
| 服务端缓存 | ① 图片 `/_astro/*`：`max-age=31536000, immutable`（已上线生产，只加这一组）；② JSON `/api/v1/**`：维持 `max-age=0, must-revalidate` + 已有 ETag（304 只回头部），**不加长缓存**（路径不含 hash，强缓存会让新版发布后端上读到旧版） |
| 端上启动 | ① 读本地缓存渲染（0 等待）② 后台 GET manifest（If-None-Match）③ 304 结束；200 且 buildId 变 → 后台刷新 + 清旧版本缓存 |
| 存储键 | `api:<name>:<buildId>`、`manifest`、`prefs`（跨版本保留）；另有 `snapshot` / `api:lru` / `prefs:schema` / `manifest:etag` 及本地 store 键（`favorites` / `read-history` / `search-history`），全量以 `services/cache.ts` 常量为准 |
| 正文缓存 | 总预算 **4 MB** 按字节 LRU，超出淘汰最旧；单篇 >1 MB 只留内存不缓存；**离线快照与 prefs 不参与淘汰**（快照是备案万一失效的唯一兜底） |
| 存储上限 | 以 `wx.setStorage` 单 key ≈1 MB / 总配额 ≈10 MB 为设计边界；真机实测 10240 KB，代码读 `wx.getStorageInfo` 不写死常量 |
| 水位守卫 | 冷启动读 `getStorageInfo`：已用 >70% 提前触发 LRU 淘汰；>90% 禁用预取 + 偏好设置给清理入口 |
| 预取 / 省流 | **规划项未实现**（端上已实现的是 site/index 预热与水位停预取）：可见首屏预取前 3 篇正文，WiFi 放宽 6 篇；省流模式 = 列表与正文都用 `thumb` + 不预取 |

## 8. M0 冻结验收记录（已全部通过，2026-09-29 生产验收完成）

> 验收口径：机械性检查以**构建内断言**执行（违规 throw 使构建失败）；体验性检查与抽样复核在生产域（www）执行。

1. ✅ 13 端点产物全部过 schema 校验 + 体积预算（实测见 §2 表）；URL 断言通过——生产域抽样 13 端点全 200、裸域 0。
2. ✅ 6 篇样文转换验证：指令块全部结构化（music 3 / video 4+1 降级 / linkcard 46）、代码 365 块 tokens 化、图片 246 引 244 资产；手写网格 HTML 与 MDX JSX 按契约落 `unknown`（35 处/10 篇，警告清单在构建日志）。
3. ✅ 三组体积实测：posts/index 37.6KB、`terms.json` 379KB（<400KB 硬线）、`stats.json` 3.3KB 各字段非空。
4. ✅ `/_astro/*` 生产域实测回传 `immutable`；HTML / JSON 保持 `must-revalidate` + ETag 未被误设。
5. ✅ 站点 HTML 产物 diff（156 页）：唯一差异 = `@layer astro.images` 样式层注入 + Footer.css chunk 重组（**惰性已证明的有界例外**，视觉零变化），无其它差异行。
6. ✅ 10 档标签色 × 明暗两套 × `ink` 的 WCAG 对比度断言全过（最低 4.97，构建内断言）。

## 变更记录

- 2026-09-29：文档组重建——schema **零变化**，承接 M0 冻结版全文；移除旧决策编号引用，改按重建后 decisions.md 编号口径。M0 冻结与验收的过程记录见 research.md 与 git 历史。
- 2026-09-28/29（M0 期间，历史）：契约冻结、双探针、生产验收——细节见 git 历史（旧版本文档）。
