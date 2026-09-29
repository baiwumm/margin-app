# Margin 小程序 · 决策记录

> **规则**：出现新的分叉时在表尾追加并递增编号，**不回改**其他文档的既有结论。论证过程与背景见 `archive/requirements-v2.1.md` 对应章节。
> **依据分层**：D1–D18 用户逐条确认；D19–D27 技术选型授权决策（2026-09-28「按你觉得最佳的方案更新文档」）；D28–D34 用户 2026-09-28 逐条答复固化；D35–D37 v3.0 评审补记（技术选型层，同 D19–D27 授权口径）。

| # | 决策项 | 结论（现行口径） |
| --- | --- | --- |
| **D1** | 域名与备案 | `baiwumm.com` 已 ICP 备案（粤ICP备2023007649号，个人），API 与图片同域分发 |
| **D2** | 小程序主体 | 个人（已微信认证 2026-07-02；认证 ≠ 变更主体，`web-view` 仍不可用）。据此收敛：外链只能复制剪贴板、一期全只读、类目避开资讯/社区 |
| **D3** | 检索方案 | 自建双层索引、端上本地检索；否决 Pagefind / Algolia / Meilisearch / 云开发正则 |
| **D4** | 分类模块 | 取消。第二个 tab = 标签（设计化色块卡），与 margin「只有 tags」的内容模型对齐 |
| **D5** | 框架 | Taro 4（React + TypeScript），不再讨论；已否决 uni-app（Vue3）与微信原生。数据层与 Block 渲染器框架无关 |
| **D6** | 音乐 / 视频块 | 一期降级为「卡片 + 复制链接 / 封面 + 跳转」，不追求站内播放 |
| **D7** | 点赞 / 收藏 | 一期纯本地；云同步放二期 |
| **D8** | 端 | 一期只做微信小程序；跨端能力保留不展开 |
| **D9** | demo 品牌与文案 | 全部替换为 margin（品牌 Margin / 作者 白雾茫茫丶），导航项按需求文档 §6.3 重映射 |
| **D10** | 视觉基准 | 以 demo 图为唯一基准（暖白 `#F6F3EE` + 柠檬绿 `#D7F94C` + 大圆角 + 悬浮胶囊）；margin 站点终端风装饰不进小程序 |
| **D11** | 标签页卡片 | 设计化色块卡「标签名 + N 篇」（取色机制后被 D22 修订） |
| **D12** | 检索深度 | 双层全做：第一层随首屏（< 40 KB）即时出结果；第二层全文倒排懒加载（≤ 400 KB） |
| **D13** | 图片分发 | 一期走 `baiwumm.com` 同域，接受国内 TTFB 200–400ms；`assetBase` 保持可配 |
| **D14** | 小程序载体 | 复用现有 AppID `wxab2feaffc36b3190`（变更信息 + 覆盖代码），不注销重注册（注销 ≈ 14 天不可逆 + 重走备案 1–20 工作日） |
| **D15** | 名称 / 简称 | 名称 = `白雾茫茫丶`（同主体公众号已占用，唯一性零风险），简称 = `白雾茫茫`；改名次数剩 0 |
| **D16** | 保存图片到相册 | 一期要做。后台配《用户隐私保护指引》声明 `saveImageToPhotosAlbum`；拒绝授权后走 `wx.openSetting` 引导（容错不能省） |
| **D17** | 图片分发域名 | 放弃 `cdn.baiwumm.com`，一期到后续全程同域（不维护对象存储桶）；配套补 `/_astro/*` 的 immutable 缓存头 |
| **D18** | 服务类目 | `工具 > 备忘录`（后台实际配置）；文案定位「个人技术笔记记录」 |
| **D19** | `assetBase` | = `https://www.baiwumm.com`（无尾斜杠）。实测裸域所有路径 301 → www；配套两条域名已进三类白名单 |
| **D20** | 端点收敛到 13 个 | 取消 moments 月分片（9 条不分片，端上按 `pubDatetime` 聚合）、公告并入 `site.json`、一期不做公告列表/详情页（无内容源，空壳页是提审减分项） |
| **D21** | 检索切词 | bigram 滑窗替代 `Intl.Segmenter`（实测把「微信/小程序/优化」等全切单字）；建索引与端上共用同一纯函数 |
| **D22** | 标签配色 | 构建期直接下发 `color` / `colorDark` / `ink` 三色值（端上零 hash 零计算）；取色依据 = 按 count 降序的序号 % 10（非 hash，避免新增标签打乱全局配色） |
| **D23** | Block 载荷瘦身 | `img` 引 `assets` 下标不内嵌 AssetRef；`code` 只发 tokens（纯文本由 tokens join 复原）。节省比例 M0 实测 |
| **D24** | 契约版本策略 | 变更走 `/api/v1` 与 `/api/v2` 目录并存（不覆盖式）；端上对 schemaVersion 不匹配软降级，不弹「请更新」 |
| **D25** | 图片策略 | 只选择、不生成：按「≤目标宽度的最大可用档」取站点已有变体（三集合档位不一致，固定三档不成立），变体零新增 |
| **D26** | 列表不分页 | 全部列表端点一次给全量；`usePagination` 降级为纯端上切片。将来超 400 KB 硬线再引入 `?cursor=` |
| **D27** | 图库筛选 | 胶囊 = 「全部」+ 3 个画廊名 + `photoCount`；不做照片级 tag 筛选（tags 挂在画廊级，做不出照片粒度） |
| **D28** | 文章卡不出图 | 「文章去掉封面图，博客定位就是没有封面图」——封面链路整条作废，`PostMeta.cover` 一期不下发。列表页每屏约 480 KB 图片请求归零，本期最大首屏收益。与 demo 有图卡是有意偏离，视觉重量靠排版 |
| **D29** | 依赖批准 | 加 `pinyin-pro`（devDependency，构建期专用）；不加 `unified`（走 `@astrojs/markdown-remark`）。⚠️ 例外须写回 margin 的 `AGENTS.md:393-400`（M0 执行项） |
| **D30** | 存储与缓存 | 正文 4 MB 按字节预算（不按篇数）+ 离线快照与 prefs 不参与淘汰 + 70%/90% 双水位守卫；实际配额 M1 真机复核，代码读 `getStorageInfo` 不写死 |
| **D31** | 标签色板 | 公式生成（10 档、色相每 36°、S/L 固定）+ 构建期 WCAG 对比度断言；真机校准挂 M1 打样第 2 项，校准后色值写进 api-contract.md |
| **D32** | 公告与免责声明 | 一期 `announcement = null` 整条隐藏；免责声明由我起草、用户审核（Q3，初稿见 compliance.md §11） |
| **D33** | 线上旧版 | 已开「暂停服务」（空壳风险消除）。⚠️ 新版上线前记得取消暂停 |
| **D34** | 热力图数据源 | 按文章 `pubDatetime` 聚合，不读 git 历史（语义 = 本月发布几篇；浅克隆风险随之消除）。`buildId` 主键 = 内容 hash，short sha 仅可读标签 |
| **D35** | 备案接入商核查（Q1 闭环） | 腾讯云客服答复判定「仅新增一个不承载业务的境内子域名，无法保证核查通过」→ 占位子域式 A 方案否决，处置回归 B（接受风险 + 端上快照兜底）。⚠️ 客服建议的「取消腾讯云接入」不可照做（= 放弃备案）。答复全文与升级路径见 compliance.md §6 |
| **D36** | React 版本口径 | Taro 4 主线默认 React 18，React 19 依赖 react-reconciler 升级、官方未宣布完整支持 → **以 React 18.3 起步**，M1 工程基座第一步用最小脚手架验证 19 可行后再升 |
| **D37** | Tailwind 工具链 | 选 Tailwind CSS v4 必须配 **weapp-tailwindcss v5**（v5 才支持 v4）；版本写死进 M1 基座依赖清单 |
| **D38** | 首页 Hero 图来源 | 一期**打包进 app `src/assets/`**（品牌视觉、零请求、不占合法域名名额）；`site.json` 只新增 `hero` 文案字段（胶囊公告/日期文案）。具体用哪张图 M1 视觉打样时定稿 |
| **D39** | 作者头像 | = margin `public/avatar.png`（512×512 PNG，线上即 `https://www.baiwumm.com/avatar.png`）。一期**双轨**：打包进 app 零请求使用（打包时可压 webp 减包体，145 KB 原图偏重）+ `site.json.avatar` 下发线上 URL；将来头像常换时端上切线上字段，不改契约 |
| **D40** | 首页 tabs「默认」排序 | = `pubDatetime` 降序 |
| **D41** | `counts.images` 口径 | 按**正文图片引用数**统计（当前 249，与各篇 `PostDetail.assets` 导出口径一致），非文件数（228） |
| **D42** | M0-0 探针 A：Endpoint 内 `getImage()` 落盘 | **通过（2026-09-28，CF 构建 Version 69d995d3）**。临时端点内 `getImage()` 对 blog 正文图（abb988gt/01-1panel-appstore-install.webp，请求 750w）与画廊图（changsha/01-panda-telescope.webp，请求 800w）均返回**静态产物路径** `/_astro/<name>.<hash>.webp`，变体随构建落盘 `dist/_astro/`；sharp 0.35.4 在 CF 构建镜像可跑，1×1 均色 #fdfdfd / #93adc2（即 toAssetRef.avgColor 同款用法）。→ D25「只选择、不生成」按原案推进，api-contract §5 三条退路不启用。URL 的 HTTP 200 点验因 workers.dev 被墙改在 M0 生产部署后于 www 域复核（证据链：emit 路径 + 构建成功 + dist 全量部署） |
| **D43** | M0-0 探针 B：`parse*Card` 重构行为等价 | **通过（2026-09-28）**。三插件抽出导出 `parseLinkCard/parseMusicCard/parseVideoCard(node)`（非指令段落返回 null，签名与 api-contract §4 同步），本体改为「parse → TDK/resolve → buildHtml」。验收证据：**同一 CF 构建内**内嵌 1d6c198 旧插件副本做双管线逐字节比对，link/music/video 各 1 篇真实样文 HTML **全等**（3345/9340/9170 字节）——环境差异（shiki 语言加载、music/video 缓存路径、外链时变数据）对两侧同时生效完全抵消，任何差异即重构引入，实测为零。parse 结构化输出（1/3/5 条）与站点 HTML 一一对应。全站字节 diff 因 workers.dev 被墙无法本地执行，以同环境等价 + 生产站对照（排除 og-hash/封面 URL 时变）替代，M0 全站 diff（api-contract §8.5）照常执行。顺手实锤：本构建 fetchTdk 对 github 抓取失败一次（外链抓取不稳定，支持导出层禁联网决策） |
| **D44** | workers.dev 关闭与验证口径定型 | 2026-09-28 用户**关闭 margin 的 workers.dev 访问**，站点仅经 `www.baiwumm.com` 可达（与 R1 收敛方向一致；Workers Builds 构建与生产部署不受影响）。影响 = 分支预览产物不再有可访问 URL。**验证口径定型**：合并前 = 分支构建 check-run（`astro check` + 构建 + **构建内断言**：schema/体积/URL/缓存头/WCAG 违规即构建失败）+ 本地 `pnpm dev` 冒烟；合并后 = 生产域复核（curl URL 200 / immutable / JSON 抽样 + 全站 HTML diff，基线 156 页已存档）。⚠️ Workers Builds 的 non-production builds 必须保持开启（check-run 是唯一合并前 CI 信号）；探针期的 workers.dev 预览 URL 与 webhook 回传为一次性手段，已随探针关闭/删除 |
| **D45** | M0 实测修订与定档（契约冻结依据） | 2026-09-28 夜，`feat/mp-export` 分支全量实装后以 74 篇实测校准契约：① **预算修订** manifest 4KB→24KB（resources 含 87 文件）、titles 40KB→48KB（拼音键全量），实测 14.5KB / 46.3KB；② **terms 收缩**正文只索引前 28 段（实测 376KB ≤400KB）；③ **资源 hash 12 位**（sha256 截断，manifest 体积减半）；④ **标签色板** = 白字深底（color hsl(h,45%,32%) / colorDark hsl(h,40%,22%) / ink #ffffff，全档 WCAG ≥4.97，构建内断言）；⑤ **counts.images = 246**（引用数口径生产实测；本地早期冒烟值 244 系 fjvvy2hf 图片计数 bug 修复前数据；249 为估算值，差额 = MDX 内远程图走 unknown 不计等）；⑥ **linkcard 外链标题降级为域名**（导出层禁联网的代价，作者手写 title/note 优先）；⑦ **unknown 兜底实测** = 35 处/10 篇（手写网格 HTML、MDX JSX、远程图），警告不阻断。全部数字见 api-contract.md §2/§4/§8 |
| **D46** | AssetRef 档位按集合定档 | 推送前自查发现初版实现用「固定三档 400/800/1600」请求所有图——正是 D25 明确否决的形态（blog 站点档位是 640/750/828/1080/1280/1541，请求 400 会**新增变体**）。修正为按 research.md F7 实测的站点集合选档：blog 640/750/1280、画廊照片 400/800/1600、画廊封面 800/800/1600、瞬间 400/800/800；thumb 目标 ≤400 而 blog 无该档 → 按「≤目标宽度的最大可用档」回落到最小档并如实写实际宽度（api-contract §1）。请求宽 ⊆ 站点已渲染 srcset → **变体零新增由构造保证**；请求宽 > 原图宽时 Astro 不放大（= 站点小图原始档）。api-contract §5 表同步（blog thumb 行 400 → 回落 640）。契约 §3.3 的 counts.images 注释同步修正为 246 |
| **D47** | M0 生产验收与 HTML diff 例外（astro.images 样式层） | 2026-09-29，`feat/mp-export` 合并 main（71831bc）部署生产后验收**通过**：13 端点全 200、buildId=71831bc-9bf4b88413de、`/_astro/*` 回传 `immutable` 且 HTML/JSON 保持 must-revalidate、变体 URL 200（探针 A 的 D42 复核闭环）、裸域 0。**HTML diff 未达字节一致，记录有界例外**：每页多一个 `@layer astro.images` 内联样式块（~1.8KB）+ Footer.css 因 chunk 重组换 hash。机制 = 端点引入 `astro:assets` 使其样式副作用进入公共模块图（`layout:"none"` 已试、不能阻止，Astro 内部 API 绕过违背 R8 故不采用）。**惰性已证明**：全站 0 个 `full-width` 元素（`width:100%` 规则永不命中）；342 个 constrained 元素的 `height:auto`/`max-width:100%` 与 Tailwind preflight 的 `img{max-width:100%;height:auto}` 完全冗余；object-fit 在 height:auto（盒比例=图片比例）下几何无效。视觉零变化，字节增量 ≈ 全站 gzip 后 ~15KB。`data-astro-image` 属性本身旧 build 就有（36 处/有图页），旧 build 是「属性无 CSS」的半生效状态。D25 档位随 D46 定档后由构造保证零新增（请求宽 ⊆ F7 实测站点集合） |
| **D48** | 编译器回退 webpack5 + trustPolicy 项目级 off | M1-a 搭建时按 §4.1 选 Vite 遇双重阻塞：① 用户 pnpm 12.6 全局 `trustPolicy: no-downgrade` 对 vite/semver 等历史代发版本一律「possible package takeover」拦截（无包级白名单可行性），② `@tarojs/vite-runner@4.2.1` peer vite ^4 与 weapp-tailwindcss v5 peer vite ≥5.2 冲突。保守回退 **webpack5 + babel**（Taro 4 默认最稳、weapp-tw webpack 插件最成熟）；项目级 `pnpm-workspace.yaml` 设 `trustPolicy: off`（不动用户全局配置；新工程依赖均官方来源）。§4.1 的「Vite + SWC」意向下修为「编译器以工程可行为准」，数据契约与渲染器不受影响；vite 迁移留待后续单独验证 |
| **D49** | React 19 编译级通过（D36 第一步） | Taro 4.2.1 + react/react-dom **19.3.0** `taro build weapp` 编译成功（2026-09-29）。按 D36 口径：保留 19 起步，「真机运行确认」挂起（DevTools 导入 + 真机复核时定）；失败则回退 18.3 |
| **D50** | tabBar 双路线搭法（Q8 不定案） | app.config 按 **Q8 倾向路线 A** 搭建（`tabBar.custom: true` + `src/custom-tab-bar/`，保留 switchTab 语义与页面缓存，onShow 同步选中态）；路线 B（页面内自绘）不另建工程——若打样定案切 B，改造点集中在删除 custom-tab-bar 与各页内嵌组件，路由结构不变。毛玻璃降级形态已内置（@supports 渐进增强） |
