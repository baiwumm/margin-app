# Margin 小程序 · 视觉与交互规范

> **基准（D1）**：唯一视觉基准 = **margin 博客原设计**。全部数值读自 margin 源码（`src/styles/global.css` / `hero-aurora.css` / 页面与组件内联样式）；端上排版参考线上站移动端（≤640px 断点，即手机上站点的真实形态）。margin 的终端风装饰（Maple Mono、网格、噪点、aurora、glow）**全部进小程序**（旧「装饰不进」口径作废）；端上做不到的按 §9 清单取舍。
> 对照物 = 线上站 `https://www.baiwumm.com/`（真机 / DevTools 移动视口）。demo 截图已删除（D1/D22）。

## 1. 设计语言总纲

- **终端/等宽气质**：全站 Maple Mono CN（§5）；等宽计数器 `[6/74]`、终端提示符徽章 `~ /ready-to-go $`、ping 圆点、`$`/`~` 符号点缀。
- **极简细边框卡片**：1px 半透明描边 + 低饱和 tint 底 + `rounded-2xl`；**无玻璃拟态**、不依赖 `backdrop-filter`（安卓友好）；hover 抬升在端上映射为**按压态**。
- **装饰层**：accent 网格底纹（3.5% 不透明度）+ 颗粒噪点 + aurora 光球 + glow 渐变标题（§6 实现规范）。
- **双主题 + 五色 accent 轮换**（D5 偏好项）：margin 有真实暗色稿，暗色为一等公民。

## 2. 设计令牌（`src/styles/tokens.css` = 唯一事实源）

主令牌为 margin `global.css` 原值；**margin 源码的 `color-mix()/oklab` 一律预计算为固定值**（WXSS 兼容，D20③），下表为关键派生值：

```css
/* ── 浅色（margin :root / [data-theme=light]）── */
--c-bg: #f2f5ec;            /* 页面底 */
--c-fg: #353538;            /* 正文 */
--c-fg-mid: rgba(53, 53, 56, 0.6);     /* muted-foreground = fg 60% */
--c-accent: #1158d1;        /* accent（blue 套） */
--c-muted: #bbc789;         /* 滚动条/弱强调 */
--c-border: #7cadff;        /* 描边基色（一律低透明度使用） */
--c-featured: #b56007;      /* 精选语义色（琥珀） */
--c-gallery: #6d28d9;       /* 画廊语义色（紫罗兰） */
--c-surface: #ecefe7;       /* 卡面 = fg 3% 混 bg（预计算） */
--c-surface-2: #eef1e8;     /* 次级卡面 = fg 2% 混 bg（预计算） */

/* ── 暗色（margin [data-theme=dark]）── */
--c-bg: #10131a;
--c-fg: #f6f7f8;
--c-fg-mid: rgba(246, 247, 248, 0.6);
--c-accent: #008fec;
--c-muted: #212f3f;
--c-border: #2264e3;
--c-featured: #f59e0b;
--c-gallery: #a855f7;
--c-surface: #171a21;       /* fg 3% 混 bg（预计算） */
--c-surface-2: #15181e;

/* ── accent 五套（D5 偏好项，浅色值 / 暗色值）──
   blue   #1158d1 / #008fec   （默认）
   green  #1f9d63 / #34d399
   purple #7c3aed / #a78bfa
   orange #ea580c / #fb923c
   rose   #dc2626 / #f87171
   切换 = 根节点 data-accent 变量组；featured/gallery 语义色随 accent 轮转
   （margin 源码有完整轮转表，端上按表落值，不做运行时计算） */
```

**使用规则**（对齐 margin 源码习惯）：

- 描边一律 `var(--c-border)` 低透明度：卡 `25%`、胶囊/输入 `40%`、分隔线 `20–30%`；交互激活描边 = accent 30–40%。
- tint 底 = 语义色的低透明度 alpha（如 featured 5%、gallery 5%、accent 8–10%），不引入新的实体色。
- 圆角：小件 `12rpx`（rounded-lg）/ 卡 `24rpx`（rounded-2xl）/ hero 容器 `48rpx`（rounded-3xl）/ 胶囊 `999rpx`。
- 间距：页面边距 `32rpx`（站点 px-4 @375 视口）、卡间距 `16rpx`（gap-4）、小节距 `48rpx`。
- 字号：小节标题 `22rpx` 大写加宽字距（text-sm tracking-widest）、正文 `30rpx`、卡标题 `32–34rpx`、hero 标题 `72rpx+`（text-5xl @375）、徽章/计数 `22–24rpx`。

## 3. 五屏结构（页面验收基准）

| 屏 | 结构（自上而下） |
| --- | --- |
| **首页** | ① 终端徽章（ping 圆点 + `~` accent + `/ready-to-go` + 半透明 `$`）② glow 渐变大标题「Margin」 ③ 描述行（fg 75%）④ 作者 + 社交行（虚线下划线链接）⑤ **FEATURED** 小节（大写 accent 标题 ★ + 横线）= featured 琥珀 tint 卡 ⑥ **RECENT** 小节（横线 + `[n/74]` 等宽计数）= 纯文字卡列表 ⑦ 「查看全部文章」outline CTA（→ 归档）⑧ 底部留白。无 banner 图、无搜索框（搜索在顶栏放大镜，M4 页）；文章卡无图（站点 `showCoverImages:false` 本然一致） |
| **标签** | aurora hero 容器（`~ ls -la $` 徽章 + glow 标题「Tags」+ 斜体描述 + 统计 hero-badge ×2）+ tag 卡双列网格（`surface-2` 底 + fg 6% 描边 + rounded-2xl：标签名 + 「N 篇」；按压 = accent 30% 描边 + accent 4% 底） |
| **图库** | aurora hero（同构，标题「Galleries」）+ 画廊卡双列（cover `aspect-video` + 底部名称/描述浮层；gallery 紫罗兰 tint 描边）+ 筛选胶囊（全部 + 画廊名 + 照片数） |
| **瞬间** | aurora hero（标题「Moments」）+ 月份导航（端上组件：细边框容器 + 左右箭头 + 月份格，选中 = accent 底）+ 瞬间卡（日期 + featured ★ + 正文 + 1/2/3 列图网格 + tag pill；margin 卡规格） |
| **我的** | hero（圆形头像 accent 描边 + 昵称 + 简介 + 社交图标行）+ 统计卡（文章/字数/连续月，margin 统计卡规格）+ 贡献日历（stats 热力图视图网格）+ 功能列表行（收藏/历史/偏好/联系/免责声明，fg 2% 底圆角行）+ 版权/备案行 |

**全局**：顶栏 = margin header 语言——logo mark + 字标居左、放大镜（搜索）+ 主题切换居右；滚过后底色转 `surface` + 底部发丝线（border 20%）。页面底 = `--c-bg` + 装饰层（§6）。tabBar = 端上特有形态（D19 机制）：`surface` 底 + 顶部发丝线 + 线性图标（margin 图标集字形）+ accent 选中色；**视觉全内联 style，WXSS 只留几何**。

## 4. 关键交互规范

| 交互 | 规范 |
| --- | --- |
| 列表入场 | 逐项错峰上浮（`delay = index × 50ms`，封顶 300ms） |
| 按压态 | margin hover 抬升/描边accent → 端上 pressed：`border-color: accent 30%` + `bg: accent 4%`（卡片）；`opacity 0.7`（按钮/行） |
| 下拉刷新 / 上拉加载 | 页面级 `enablePullDownRefresh`；`onReachBottom` 触发切片加载，无更多 toast |
| 图片预览 | `Taro.previewImage({ current, urls, indicator: 'number', loop: true })` |
| 长按图片 | 转发 / 保存到相册（需隐私指引 + `openSetting` 容错） |
| 主题 | 跟随系统 + 偏好覆盖；margin 双主题令牌原值 |
| accent | 偏好页五色圆点选择器（同 margin accent-dots 形态），即点即换 |
| 分享 | `onShareAppMessage` 用 OG 图（`/posts/<slug>/index.png`）；朋友圈同图 |
| 返回顶部 | 滚动超一屏出现，margin BackToTopButton 形态（细边框圆钮 + accent 箭头） |
| 空态 | 区分「未输入」与「无结果」；margin EmptyState 文案风格 |
| 导航 | 顶栏滚动态：bg → `surface` + 发丝线；标题居中 |

## 5. 字体策略（D4，D64 扩展口径）

- **不打包中文字体**（D4 红线：CJK 全量 MB 级；`wx.loadFontFace` 不支持 unicode-range，站点那套 229 片渐进加载端上做不了）。**偏好项「站点字体」开启 ⇒ 全 app 拉丁变装**：`--font-body` 与 `--font-mono` 栈常驻「Maple Mono CN」「Maple Mono CN Ext」两个家族名（ASCII 切片 2 片 ≈34KB，`app.ts` 水合即 `loadSiteFont()` 异步加载，不阻塞首屏）；未加载时两个名字不命中任何字体、自动穿透系统栈 ⇒ 关偏好零成本零视觉变化。**中文永远随系统**（Maple 的 CJK 字形需全量子集，MB 级，见上）；正文观感 = 拉丁/数字 Maple + 中文系统栈，与 margin global.css「全站字体统一为 Maple Mono CN」的差距只剩 CJK 部分。加载失败静默回落（`[siteFont]` 日志留证），不重试超过 2 次；重进小程序后生效（D63：global 字体对已渲染页不保证生效）。
- 系统栈：`-apple-system, "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", sans-serif`；等宽穿透栈 `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`。
- 代码块同 family；Shiki 配色 = margin typography.css 的 `--shiki-light/dark` 变量值（构建期 tokens 已带，端上按主题取色）。

## 6. 装饰元素实现规范（margin 装饰 → 端上）

| 元素 | margin 源码 | 端上实现 |
| --- | --- | --- |
| 网格底纹 | 两方向 `linear-gradient` 50px 格，accent 3.5% + 径向 mask 渐隐 | WXSS 原样（rgba 逗号写法）；`-webkit-mask-image` 不支持机型降级为均匀 3% |
| 颗粒噪点 | SVG feTurbulence data-URI 200px 平铺 | **预渲染 200px PNG tile（几 KB）打包**平铺 + 低透明度；WXSS 对 SVG data-URI 支持不稳，不赌 |
| aurora 光球 | 三个 radial-gradient 圆球 `blur(60px)` + 位移动画 | **预渲染模糊 PNG**（构建期 sharp 生成，每主题一套或中性色）+ transform 位移动画；禁大半径运行时 `filter: blur`（安卓掉帧） |
| 光标光晕 | 鼠标跟随 800px 径向渐变 | **删除**（触屏无对应物，D7） |
| glow 标题 | 135° 渐变 text + drop-shadow | `-webkit-background-clip: text` + 透明字（iOS/安卓新内核可用）；降级 = 纯 `--c-fg` |
| 标题 shimmer | background-position 6s 循环 | `@keyframes` 同款；低端机静态（首帧位置） |
| ping 圆点 | animate-ping 双层圆 | `@keyframes` scale + opacity 同款 |
| 徽章 hero-badge | accent 8% 底 + accent 15% 描边 + 胶囊 | 原样（预计算 rgba） |

## 7. WXSS / Tailwind 硬约束

| 约束 | 应对 |
| --- | --- |
| 构建管线剥 `@supports` 块（实测） | `backdrop-filter` 一律裸声明；降级靠令牌默认值 |
| `rgb(255 255 255 / 55%)` 空格斜杠不认 | rgba 一律逗号写法 |
| `color-mix()/oklab` 兼容性无保证 | **全部构建期预计算**为固定 rgba/hex（tokens 落死） |
| 外链 `@font-face` 不可用 | `wx.loadFontFace`（§5） |
| 禁 `*` 通配、部分伪类/属性选择器 | 显式书写 |
| `position: sticky` 安卓不稳 | 吸顶改 scroll-view + 动态 class |
| hover 类（group-hover 等）触屏无意义 | 按压态替代（§4）；Tailwind 勿用 hover 变体 |
| 大面积 `filter: blur` | 光球用预渲染 PNG（§6）；正文内禁用 |
| Tailwind v4 必须配 weapp-tailwindcss v5 | `space-x-*` / `divide-*` / 复杂 arbitrary 勿用，手写 WXSS |

## 8. 打样清单（M1-b 视觉基线，6 项全过才进 M2）

| # | 打样项 | 通过判据 |
| --- | --- | --- |
| 1 | 浅色令牌 | 与 margin 线上站（DevTools 移动视口）逐屏对照，四类色无明显偏差 |
| 2 | 暗色令牌 | margin 暗色稿对照；featured/gallery 语义色随主题正确轮转 |
| 3 | accent 五套 | 偏好切换即点即生效；五套 × 明暗十组对比度抽查 ≥4.5:1 |
| 4 | tabBar margin 皮 | 细边框 + 线性图标 + accent 选中；明暗三态；内联样式无变量依赖 |
| 5 | 字体换装 | 偏好开启后 Maple Mono 生效；断网/失败静默回落系统栈；TTI 无回退 |
| 6 | 装饰层降级 | 无 mask / 无 background-clip:text 机型：网格均匀化、glow 标题纯色，可读无破相 |

## 9. 端上不支持 / 不做清单（验收时别当 bug 查）

| 功能 | 处置 | 依据 |
| --- | --- | --- |
| 快捷键 / 命令面板 / ShortcutsPanel | 抛弃 | D7 |
| TTS 朗读（Web Speech） | 抛弃（二期可评估同声传译插件） | D7 |
| giscus 评论 | 抛弃（个人主体无 web-view；二期云开发另议） | D7/D8 |
| LOFI 电台播放器 | 删除（境外流进不了合法域名白名单） | D6 |
| 编辑本文 / RSS 订阅跳转 | 改「复制链接」 | D8 外链口径 |
| 光标光晕 / 鼠标跟随 aurora | 删除（触屏无对应物；卡片内 aurora 改按压态显形） | D7 |
| Pagefind 搜索 UI | 换端上双层检索页（M4），皮按 margin 搜索样式 | §6.2 |
| 沉浸阅读模式（`r` 键） | 转偏好开关 | M2 |
| 瞬间发布入口 / 点赞云同步 | 一期隐藏/本地；二期 | D8 |
| 标签彩色块（旧 D45 色板视觉） | 不用（margin 标签卡 = 细边框 + accent 交互）；契约三色字段保留不消费 | D14 |

## 10. M1-b 执行清单（照此顺序执行；每步含验收）

> 数据接线（services/hooks/useCollection/types/CacheImage/Block 渲染器机制）**全程不动**，只换视图层。所有样式数值以本文档与 margin 源码为准；两条铁律贯穿：**custom-tab-bar 内禁用 CSS 变量做关键视觉（内联 style，D19）**；**rgba 逗号写法、color-mix 预计算、@supports 裸声明（D20）**。

| 步 | 内容 | 要点 | 验收 |
| --- | --- | --- | --- |
| 1 | `src/styles/tokens.css` 全量重写 | §2 令牌表落死（主令牌 = margin 原值；预计算值 `--c-surface #ecefe7/#171a21`、`--c-surface-2 #eef1e8/#15181e`、`--c-fg-mid`）；**accent 五套变量组**（`[data-accent="green"]` 等覆盖 `--c-accent/--c-featured/--c-gallery`，轮转表抄 margin global.css `html[data-accent=…]` 块）；暗色 media 块 + `.theme-dark` 类同步 | 四类色（bg/fg/accent/语义）与 margin 线上站一致；tsc/build 过 |
| 2 | `src/app.scss` 共享件换皮 | `page` 底色/字体栈换 margin；`.section-head` 重做为 §3 的「大写 accent 小节标题 + 横线 + 可选 `[n/m]` 计数」；删除柠檬绿垫块 `::after`；`.empty` 文案改 margin 风格；`rise-in` 动画保留 | 首页小节标题形态 = margin FEATURED/RECENT |
| 3 | `src/app.config.ts` | `window.navigationBarBackgroundColor` → `#F2F5EC`；tabBar 原生兜底字段（不渲染但要有）：color `#353538`/selectedColor `#1158d1`/backgroundColor `#f2f5ec` | DevTools 无告警 |
| 4 | 资产管线 | sharp 脚本（可用 margin 仓库 `node_modules/sharp` 经 NODE_PATH 运行，或 devDependency）：① tabbar 图标 5 枚 × {normal fg 55% / active fg 100%} × 明暗 = 20 PNG（81px，字形取 margin `src/assets/icons/Icon*.svg` 同族线性风，home/moment/user 三个缺的字形按同风格补画：24×24、stroke 2、round cap）；② logo `mark.svg`→PNG（accent 蓝 + fg 两版）与 `margin.svg` 字标→PNG（fg 两版）；③ 噪点 tile 200px PNG（feTurbulence 同款参数预渲染）；④ aurora 光球模糊 PNG（radial 渐变预模糊，中性色可两主题共用） | PNG 落 `src/assets/`；单枚 ≤2KB |
| 5 | `custom-tab-bar/` 换皮 | 形态 = margin 语言**非悬浮胶囊**：全宽 `surface` 底 + 顶部 1px 发丝线（border 20%）+ 5 项等宽；图标 44rpx 上下、无文字；**选中 = accent 8% 圆角底块（12rpx 圆角）+ 图标全色**（margin 移动菜单 active = accent 色 + accent 8% 底的同族映射），未选中 fg 55%；accent 跟随偏好（内联 style 读 accent 配置）；底/线/底块全部 **tsx 内联**，WXSS 只留几何 | 明暗三态正确；切 tab 高亮随动；无 CSS 变量依赖 |
| 6 | `components/NavBar` 重做 | 居左 logo mark+字标（PNG），居右搜索（→ M4）与主题切换占位；滚动态：bg → `surface` + 底部发丝线；高度 = 状态栏 + 88rpx；mine 页可后接 overlay 变体 | 滚动渐变正确；返回键语义不变 |
| 7 | 基础组件三件 | `TerminalBadge`（ping 点 + `~ path $` 徽章）、`AuroraHero`（hero 容器：surface 底 + accent 12% 描边 + 48rpx 圆角 + 光球 PNG ×2-3 + 可选位移动画降档）、`SectionTitle`（大写 accent + 横线 + 计数） | 与 margin hero 逐元素对照 |
| 8 | 五页重写（顺序：home → tags → gallery → moment → mine） | **home**：§3 首页结构（终端徽章 + glow 标题「Margin」+ 描述 + 作者行 + FEATURED featured 琥珀卡 + RECENT `[n/74]` 计数卡 + CTA→归档；删除搜索胶囊/公告条/快捷导航/热门标签/分段 tabs——公告数据保留待定）。**tags**：aurora hero（`~ ls -la $` + Tags + hero-badge 统计 ×2）+ tag 卡双列（surface-2 底 + fg 6% 描边 + 名/计数，按压 accent 30% 描边；**不用彩色块**）。**gallery**：hero + 筛选胶囊（全部 + 画廊名(照片数)，激活 accent 8% 底 + accent 字）+ 画廊卡（cover aspect-video + gallery 紫 tint 描边 + 名称/描述）。**moment**：hero + 月份导航（细边框容器 + 箭头 + 月份格选中 accent 底，端上组件）+ 瞬间卡（日期 + ★ + 正文 + 图网格 + tag pill）。**mine**：头像（accent 描边）+ 昵称/简介 + 社交行 + 统计卡 + 贡献日历（stats heatmap 视图网格）+ 功能列表行（收藏/历史/偏好/联系/免责声明）+ 版权备案行 | 每页对照 margin 对应页移动端视口；数据加载/缓存行为与改造前一致（22 单测保持绿） |
| 9 | `useTheme` 扩展 accent | 模块级 accent 状态（默认 blue）+ `setAccent()`（持久化留 M2 偏好页）；root 节点挂 `data-accent` 或类名映射 tokens 变量组；tabBar/NavBar 内联色值走同一配置表 | 五套切换全 UI 即时生效 |
| 10 | 字体管线 | 端上：`loadSiteFont()`（loadFontFace global:true，成功/失败各打点，失败静默）；margin 侧：常用字子集 woff2 → `public/fonts/` + `_headers` 仅对 `/fonts/*` 加 `Access-Control-Allow-Origin: *`（走 margin 仓库评审）；偏好开关 UI 可先落 M2 | 打样第 5 项过 |
| 11 | 打样验证 | design.md §8 六项全过 → 视觉基线宣告；真机复核滚动保留/存储/TTI 无回退 | §8 表全绿 |

**占位与待定**：首页 `announcement` 条在 margin 首页无对应物——暂不渲染，数据字段保留（Q 待用户决定是否做成 margin 风格终端徽章行）；技能跑马灯/MBTI 等关于页重装饰项属 M4「关于」页范围，不阻塞 M1-b；accent 浅色对比度口径 Q（green 3.14 / orange 3.23 / rose 4.38 < 4.5:1，margin 原值即如此，建议按 requirements §10「装饰性小件 ≥3」口径判）——待用户拍板，处置见 decisions D26。
