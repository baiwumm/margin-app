# Margin 小程序 · 视觉与交互规范

> **基准（D10 → D53 修订）**：UI 对齐基准 = **本地 uni-halo 3.0.0 源码**（`E:\personal-project\uni-halo`，unibest 4.4.1 + wot-ui-v2，main@077e45 附近）+ `demo/` 5 张 3.x 实机截图**互证**。此前本地为 2.0.10 时只有页面结构可参考；3.x 起配色、玻璃卡片语言、组件规格均以源码为准，截图用于裁决视觉细节。margin 站点的终端风装饰（Maple Mono、光标光晕、颗粒噪点、`#f2f5ec` 底）一律不进小程序，只嫁接品牌元素（D9）。
> demo 只有浅色稿：浅色令牌 = 最终基线；暗色是 margin 自研推导（**uni-halo 3.x 无暗色模式**），M1 打样第 2 项真机校准。

## 1. 五屏结构（页面验收基准，D53 对齐 3.x）

| 屏 | 结构（自上而下） |
| --- | --- |
| **首页** | ① Hero 512rpx 全出血（**无圆角** + 底部融底渐变；标题胶囊 accent 90% 底 + 白色日期文案，D38 图待定稿先渐变占位）② 搜索玻璃胶囊（80% 宽居中，**叠 hero 下缘 -48rpx**，「内容」柠檬绿 chip）③ 公告三段条（😄 + 红色「公告」标 + 内容 + 「全部 ›」；`announcement = null` 整条隐藏不占位，D32）④ 快捷导航（5 列彩底玻璃块 104rpx + 彩色标签）⑤ 热门标签（3.x「精选分类」同款槽位拼图：左跨行大卡 + 右两小卡；margin 无分类数据，用标签数据 + D45 深底色块）⑥ 最新推荐（小节标题左 + **分段控件右置**玻璃容器，选中柠檬绿块 + **纯文字卡**列表，D28） |
| **标签** | 固定 NavBar 标题「标签」+ 双列色块卡（28rpx 粗名 + 24rpx「共 N 篇笔记」）+ 空态「呜呜，没有更多数据了~」 |
| **图库** | 固定 NavBar「图库」+ 横滚筛选胶囊（「全部」+ `画廊名(照片数)`，激活 **primary #B9E424**，D27）+ 双列 304rpx 玻璃框图片卡 + 底部渐变命名浮层（白字最多 2 行）+ 空态 |
| **瞬间** | 固定 NavBar（left 槽 = 「年份 + 本月」primary 小方钮）+ 居中标题「我的日常」+ **6 月翻页玻璃选择器**（左右箭头 + 月名/年份双行，选中 primary 块）+ 瞬间卡（方头像 72rpx + 昵称 + 中文日期「2026年09月20日 星期日」+ 26rpx 正文 + **1/2/3 列动态图网格** + 柠檬 tag chips + 分隔线操作栏 点赞/收藏）+ 右下悬浮「＋ 发布瞬间」（**一期隐藏**，个人主体 UGC 风险，D2） |
| **我的** | **overlay NavBar「关于博主」**（透明盖 hero，白字滚过阈值转正）+ Hero 768rpx（圆形头像 176rpx 白描边 + 昵称 36rpx + 简介；D38 背景图打包一期落位，落位后文字切白）+ 玻璃 rounded-3xl 八宫格（彩底图标块 80rpx + 彩色标签）+ 「其他功能」列表行（图标块 64rpx + 副标题 + 箭头）+ 底部版权行 22rpx |

**全局**：非首页四页 = **固定玻璃 NavBar**（D53 新增组件：page 底色 + blur 随滚动渐显 `min(scrollY/360, 0.9)`，标题居中加粗，0.05 档量化控制重渲染）；悬浮胶囊 tabBar（5 tab，**D55 定档**：玻璃胶囊 558rpx 居中（uni-halo `px-12` 口径）、5 项 flex-1 等宽、深墨线性图标、选中浅柠檬绿圆角方块；**视觉全内联**（custom-tab-bar 内 WXSS 变量不可达，D55）；暗色深底 + 灰图标 + 亮柠檬选中）；右侧悬浮操作组（回顶 + 设置 + 头像，滚动超一屏出现——**M1-b 未实装**）；全部页面 `navigationStyle: custom`。

⚠️ demo 是 uni-halo v3.x 实机截图，不是为本项目设计的稿子——品牌位与文案必须全部替换；本地 uni-halo 已是 3.0.0 源码（D53），配色/卡片语言/组件规格以源码为准。

## 2. 设计令牌（写入 `src/styles/tokens.css`，D53 对齐 3.x 源码）

浅色数值全部来自 uni-halo 3.0.0 源码（`src/style/index.scss` wot 变量 + `uno.config.ts` theme + UnoCSS 默认灰阶/圆角档），demo 截图互证：

```css
:root {
  /* 品牌 —— 双强调色（3.x：--wot-color-theme 主色系 + secondary 高亮系） */
  --c-primary: #b9e424;        /* 主强调：选中态填充 / 图标 / 文字 accent */
  --c-primary-active: #a7cd20; /* 按下态（--wot-primary-7） */
  --c-primary-soft: #f4fbe0;   /* 主色浅底（--wot-primary-1） */
  --c-primary-ink: #111827;    /* 主色块上的文字（gray-900，明暗同值） */
  --c-accent: #d7f94c;         /* 次强调：柠檬绿色块高亮底（3.x secondary） */
  --c-accent-soft: #e0ef93;    /* 浅强调，tabBar 选中块（D52 保留） */
  --c-accent-ink: #111827;
  --c-chip-bg: #d7f94c;        /* 高亮块配对：暗色反转为暗橄榄底+亮柠檬字 */
  --c-chip-ink: #111827;

  /* 表面 */
  --c-bg: #f6f3ee;             /* 页面底色（3.x bg-page） */
  --c-surface: #fcfaf8;        /* 不透明卡面（代码块/骨架） */
  --c-surface-alt: #f2efe6;
  --c-border: #ecebeb;

  /* 玻璃拟态（3.x .uh-global-card-glass） */
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-bg-solid: rgba(255, 255, 255, 0.88); /* JS 端按机型降级换实底用 */
  --glass-border: rgba(255, 255, 255, 0.65);
  --glass-highlight: rgba(255, 255, 255, 0.75);
  --glass-backdrop: blur(24rpx) saturate(160%);

  /* 文字（3.x UnoCSS 灰阶） */
  --c-text: #111827;      /* gray-900 */
  --c-text-mid: #4b5563;  /* gray-600 */
  --c-text-sub: #6b7280;  /* gray-500 */
  --c-text-weak: #9ca3af; /* gray-400 */
  --c-sep: rgba(0, 0, 0, 0.05); /* 3.x border-black/5 */

  /* 圆角（3.x Uno 默认档换算 rpx：md/lg/xl/2xl/3xl） */
  --r-sm: 12rpx; --r-md: 16rpx; --r-lg: 24rpx; --r-xl: 32rpx; --r-2xl: 48rpx; --r-full: 999rpx;

  /* 间距 */
  --sp-page: 24rpx; --sp-gap: 20rpx;
  --sp-1: 8rpx; --sp-2: 16rpx; --sp-3: 24rpx; --sp-4: 32rpx; --sp-5: 48rpx;

  /* 阴影（3.x 玻璃投影 = inset 高光 + 淡紫环境投影 rgb(90 105 200 / 14%)） */
  --sh-card: inset 0 1rpx 0 var(--glass-highlight), 0 8rpx 32rpx rgba(90, 105, 200, 0.14);
  --sh-card-soft: /* 同上 7% */;
  --sh-float: /* 同上 14% */;

  /* 字号 */
  --fs-xs: 20rpx; --fs-cap: 24rpx; --fs-sm: 28rpx; --fs-body: 30rpx;
  --fs-title: 32rpx; --fs-h1: 40rpx; --lh-body: 1.75;
}
```

暗色为 margin 自研推导（demo 与 3.x 均无暗色稿），M1 真机校准；要点：玻璃 = 低透明白（6%）+ 亮描边（12%）；`--c-primary` 保持亮柠檬（只做小面积，对暗底 ≥10:1）；高亮块配对反转（`--c-chip-bg #35401F` + `--c-chip-ink #D7F94C`，避免 #A8C63A 底 × #D7F94C 字的 1.6:1 低对比）。完整数值见 `src/styles/tokens.css`。

> **双强调色分工（3.x 源码口径）**：`--c-primary #B9E424` = 状态色（筛选/月份/年份按钮选中填充、tabBar 选中、图标与文字 accent）；`--c-accent #D7F94C` = 内容高亮块（搜索「内容」chip、tabs 选中、tag chips、小节标题垫块），配 `#111827` 深字。
>
> **几何**：画布 430×932pt @3x；页面边距 24rpx、双列列间距 20rpx、卡宽 341rpx（`(750 − 24×2 − 20) / 2 = 341` ✅）。

## 3. 标签色板（D22 / D31 / D45 现行口径）

- 公式色板 10 档：`h = (index × 36) % 360`；**D45 定档 = 白字深底**：`color hsl(h, 45%, 32%)` / `colorDark hsl(h, 40%, 22%)` / `ink #ffffff`，全档 WCAG ≥4.97（构建内断言）。
- 取色 = 该标签按 count 降序后的**序号 % 10**（非 hash：新增标签只在尾部插色，不打乱已有配色）。
- 色块渲染继承 3.x「精选分类」卡的版式（左下角白字：28rpx 粗名 + 24rpx 计数），底色用 D45 深底色板替代 3.x 的图片封面——margin 契约无分类/封面数据（见 §9）。

## 4. 关键交互规范

| 交互 | 规范 |
| --- | --- |
| 列表入场 | 逐项错峰上浮（`delay = index × 50ms`，封顶 300ms） |
| 下拉刷新 / 上拉加载 | 页面级 `enablePullDownRefresh`；`onReachBottom` 触发 `usePagination.next()`，无更多时 toast |
| 图片预览 | 统一 `Taro.previewImage({ current, urls, indicator: 'number', loop: true })` |
| 长按图片 | 转发 / 保存到相册（D16，需隐私指引 + `openSetting` 容错） |
| 长按正文 | 复制文本 |
| 返回顶部 | 滚动超一屏显示悬浮按钮，平滑回顶（M1-b） |
| 空态文案 | 区分「未输入」与「无结果」 |
| 分享 | `onShareAppMessage` 用 OG 图（`/posts/<slug>/index.png`，现成红利）；朋友圈 `onShareTimeline` 同图复用 |
| 深色模式 | `Taro.onThemeChange` 跟随系统；偏好设置可强制浅色 / 深色（M2） |
| 导航栏 | 非首页固定玻璃 NavBar，滚动渐显；mine 为 overlay 变体（白字→正色） |

## 5. 字体策略

- **不打包中文字体**（子集化也常在 1MB+）。
- 正文系统字体栈：`-apple-system, "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", sans-serif`（uni-halo 3.x 同样零自定义正文字体，仅图标字体——margin 无需对齐）。
- 代码块可用仅含拉丁字形的 Maple Mono 子集（约 20–40 KB）；包体紧张则降级系统 `monospace`。

## 6. 小程序 CSS 硬约束（M1 打样必须撞到）

| 约束 | 影响 | 应对 |
| --- | --- | --- |
| **构建管线剥 `@supports` 块（D53 实测）** | `@supports` 内的规则**整块消失**（旧 tabBar 的 blur 增强从未进产物） | `backdrop-filter` 一律**裸声明**（不支持机型自动忽略）；按机型换实底走 JS 判断（`--glass-bg-solid` 令牌留给该场景） |
| `backdrop-filter`（毛玻璃） | 安卓低版本 / 部分机型不支持 → 悬浮 tabBar 失效变透明 | 半透明底在纯色页底上观感成立；导航底 alpha 上限提到 0.9 保可读 |
| `position: sticky` | 安卓不稳 | 吸顶改 `scroll-view` + 动态 class |
| 选择器限制 | 不支持 `*` 通配、部分伪类与属性选择器 | 显式书写，禁用通配符 |
| **rgba 语法** | WXSS 不认 `rgb(255 255 255 / 55%)` 空格斜杠语法（uni-halo 靠 Uno presetLegacyCompat 转译，margin 裸 WXSS） | 一律逗号写法 `rgba(255, 255, 255, 0.55)` |
| webfont | 不支持普通 `@font-face` 外部字体 | 系统字体栈 + 代码块拉丁子集（可选项） |
| 大面积 `filter: blur()` | 安卓性能差、掉帧 | 静态图或缩小作用范围 |

## 7. Tailwind 使用边界

- ✅ 用原子类写间距 / 圆角 / 字号 / 颜色 / flex（覆盖日常约 80%）。
- ❌ 不要指望：`space-x-*` / `divide-*` / `group-hover` / `peer` / 复杂 arbitrary value——手写 WXSS。
- ✅ 设计令牌一律走 CSS 变量——暗色与偏好设置只换根变量，不改类名。
- ⚠️ **Tailwind v4 必须配 weapp-tailwindcss v5**（v5 才支持 v4，D37）。

## 8. M1 打样清单（先打样再铺量，6 项全过才算视觉基线）

> D53 全量重对齐后，第 1/2/3/4/5 项需**重新走一遍**（令牌数值、卡片材质、瞬间选择器都变了）。

| # | 打样项 | 通过判据 |
| --- | --- | --- |
| 1 | 浅色令牌真机显色 | 与 demo 逐屏对照 + 与 uni-halo 3.x 真机互证，四类色无明显偏差 |
| 2 | 暗色显色 | `.theme-dark` 校准完成；暗色 accent「只做小面积」+ chip 配对反转落地；标签色板对比度断言全过 |
| 3 | 悬浮胶囊 tabBar | D55 内联后：胶囊白底明显悬浮、选中方块随 tab 正确移动；暗色三态切换 |
| 4 | 错落双列网格 | 341rpx 卡宽对得上；跨行卡在 375pt 窄屏不溢出 |
| 5 | 月份翻页选择器 | 6 月窗口翻页 + 边界钳制 + 「本月」快捷钮 + 空数据月空态 |
| 6 | `backdrop-filter` 降级形态 | 裸声明下不支持毛玻璃的机上：玻璃卡（55% 白）/ 导航（0.9 底）/ tabBar（0.94 底）均可读可接受 |

### tabBar 实现路线（Q8 已定案 D52，记录保留）

**路线 A（定案）**：`tabBar.custom = true` + `custom-tab-bar/`，switchTab 语义 + 页面缓存，真机验证滚动保留通过。图标 = 线性 PNG 四态 20 枚（81px，构建内联 base64；D54：浅色 normal/active 同深墨 #2D2F2E，暗色 normal-dark 灰 #9AA09A + active-dark 亮柠檬 #D7F94C）。D54 后 tabbar 形态对齐 demo：宽胶囊等距 + 墨色图标 + 方块高亮（3.x 源码为彩色激活图标 + 玻璃层高亮，观感细节不同，见 §9）。

## 9. 有意偏离声明（验收时别当 bug 查）

- **文章卡无图（D28）**：文章卡 = 纯文字卡（标题 + 摘要 + 标签 chips + 日期 + 阅读时长），与站点网页版一致、与 3.x 有图卡（image_top 默认）**有意偏离**。视觉重量靠排版撑；不把封面加回来。
- **tabBar 形态（D52 → D54 → D55）**：白玻璃胶囊 **558rpx 居中、5 项 flex-1 等宽**（uni-halo `px-12` 口径）+ 深墨线性图标（normal/active 同色，选中靠浅绿方块区分，同 demo 首页特写）+ 暗色灰/柠檬图标。**视觉（底色/描边/阴影/选中块）全部 tsx 内联**——custom-tab-bar 内 WXSS 变量不可达（浅色令牌块无 `:host`，var 落空时整条 background 作废回透明，D53/D54 两轮截图复现），D55 起禁止在 tab-bar 用 CSS 变量做关键视觉。
- **今日一言未接（3.x 新增 `uh-home-hitokoto`）**：数据来自外部一言 API，需域名白名单 + 契约/缓存层改造，超出静态导出架构；挂 Q 待用户决定是否引入。
- **「精选分类」→「热门标签」**：margin 契约无分类端点（13 端点冻结，M0），该槽位用标签数据 + D45 深底色块渲染，版式（拼图 + 左下角文字）对齐 3.x。
- **文章卡浏览数/作者头像未渲染**：契约 `PostMeta` 无 views 字段；footer 只放日期 + 阅读时长。
- **瞬间「详情」按钮未渲染**：跳 moment-detail 属 M2；操作栏暂为静态「点赞/收藏」两项（3.x 三项含评论，交互均 M2+）。
- **右侧悬浮操作组未实装**（回顶/设置/头像）：M1-b 项，样式位已留。
- **图库「全部」聚合视图**：待 M1-b 详情懒加载接入。
- **Hero / 我的页背景图为占位渐变（D38）**：一期打包图定稿后落位；落位后我的页 hero 文字切换为白字（当前浅渐变用暗字保可读）。
- **「发布瞬间」一期隐藏**（D2，个人主体 UGC 风险）。
- 页面底色已与 3.x 一致（`#f6f3EE`）；margin 站点网页版的 `#f2f5ec` 不采用（有意差异，D9）。
