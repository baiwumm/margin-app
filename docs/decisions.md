# Margin 小程序 · 决策记录

> **规则**：出现新的分叉时在表尾追加并递增编号，**不回改**既有行；论证过程写进 research.md 或对应专项文件的引用章节。
> **重建说明（2026-09-29）**：UI 方向转向 margin 原设计（D1）后本文档组整体重建，旧版文档（requirements v1.0–v3.6、决策旧编号 D1–D55、archive 快照、demo/ 截图）全部作废删除，**完整历史以 git 历史为准**。新表自 D1 起重新编号：D1–D7 为本轮转向决策，D8 起为重建时仍然有效的历史结论浓缩（口径不变，仅换编号）。

| # | 决策项 | 结论（现行口径） |
| --- | --- | --- |
| **D1** | UI 基准转向 | **唯一视觉基准 = margin 博客原设计**：源码 `E:\personal-project\margin` 为唯一事实（global.css 令牌 + 页面/组件样式），线上站 `https://www.baiwumm.com/` 移动端样式作端上排版参考；无独立设计稿。uni-halo（3.0.0 源码与 demo 截图）不再作为任何基准；其对齐层 UI 代码（五页视图、令牌、tabBar 视觉、20 枚图标、玻璃 NavBar）推翻重做；`demo/` 删除 |
| **D2** | 转向边界 | 纯端上 UI 层替换：margin 博客仓库、13 个导出端点、API 契约、导出管线、M0 全部验收成果**零影响**；services / 契约类型 / Block 渲染器机制 / 缓存基建 / tabBar 路线 A 机制保留 |
| **D3** | tab 集合 | 维持五 tab（首页/标签/图库/瞬间/我的）只换视觉；归档、搜索、项目、友链、关于为二级页。切 tab 语义与页面缓存已真机验证，不动结构 |
| **D4** | 站点字体 | Maple Mono CN **不打包**（中文子集 MB 级，爆主包 1.5MB 红线）。落地 = `wx.loadFontFace` 运行时异步加载子集（www.baiwumm.com 同域 + CORS，不阻塞首屏）+ 系统字体栈兜底（失败静默回落）；做成偏好项「站点字体」，默认系统栈。⚠️ margin 侧需配套：字体子集文件 + `_headers` CORS（挂 margin 仓库流程，M1-b 交付） |
| **D5** | accent 五色轮换 | **做**（margin 站点特色）：blue/green/purple/orange/rose 五套 accent 做成偏好项，纯 CSS 变量切换，明暗两套数值随主题 |
| **D6** | LOFI 电台 | **删除**。margin 首页电台流为第三方境外流（`fluxfm.streamabc.net`），downloadFile 合法域名须 ICP 备案、该域无法配置；不为其新增代理服务（违背零后端）。音频播放能力本身可用（InnerAudio/BackgroundAudioManager），将来放自托管音频不受此限 |
| **D7** | 端上不做的 margin 功能 | 抛弃：快捷键/命令面板/ShortcutsPanel、TTS 朗读（Web Speech 不可用）、giscus 评论（个人主体无 web-view；二期云开发另议）、编辑本文/RSS 跳转（改复制链接）、光标光晕（触屏无对应物）、Pagefind 搜索 UI（换端上双层检索）。转形态保留：阅读模式 → 偏好开关（M2）；贡献日历/统计照做（stats 数据已就绪）。清单详见 design.md §9 |
| **D8** | 主体与载体 | 个人主体小程序（2026-07-02 已微信认证，认证 ≠ 变更主体，web-view 仍不可用）；复用 AppID `wxab2feaffc36b3190`；名称「白雾茫茫丶」、简称「白雾茫茫」（改名次数剩 0）；服务类目 `工具 > 备忘录`；一期全只读，外链只能复制剪贴板 |
| **D9** | 域名与分发 | `assetBase = https://www.baiwumm.com`（**无尾斜杠**）；裸域所有路径 301 → www，任何请求不得依赖 301；request / downloadFile 白名单各两条已配；图片全程同域 + `/_astro/*` immutable；不维护独立 CDN/对象存储 |
| **D10** | 备案 | 网站备案 粤ICP备2023007649号-2 + 公安备案 44030402006402（站点页脚已挂）；**小程序变更备案审核中（2026-09-28 发起，审核期严禁改名）**；接入商核查闭环 = 接受风险 + 端上离线快照兜底（背景与升级路径见 compliance.md §6）；旧版已暂停服务，新版上线前取消 |
| **D11** | 框架链 | Taro 4.2.1 + **webpack5**（Vite 因 pnpm trustPolicy 与 peer 冲突回退，迁移另验）+ **React 18.3.1**（19 运行时验证失败关闭，待 Taro reconciler 跟进）+ TypeScript strict + Tailwind v4 / weapp-tailwindcss v5 + pnpm；数据契约与 Block 渲染器框架无关 |
| **D12** | 数据层形态 | 构建期导出 13 端点静态 JSON + Block AST（三个自定义指令 `::link-card/::music/::video` 只有 AST 能表达）；列表全量不分页、端上切片；`schemaVersion` 不匹配软降级，契约变更走 `/api/v1` `/api/v2` 并存；buildId = git short sha（可读标签）+ 内容 hash（主键） |
| **D13** | 图片管线 | 只选择、不生成：按「≤目标宽度的最大可用档」取站点已有变体；档位按集合定档（blog 640/750/1280、画廊照片 400/800/1600、画廊封面 800/1200/1600、瞬间 400/800），变体零新增由构造保证；AssetRef 带实际宽度 + `avgColor` 占位色 |
| **D14** | 标签 | blog + galleries 合并去重 62 个（moments 的 2 个不进标签页）；slug 沿用站点 slugify；契约下发 `color/colorDark/ink`（构建期 WCAG 断言全过，最低 4.97）。**margin 对齐下标签卡不用彩色块**（margin 标签卡 = 细边框 + accent 交互），三色字段保留在契约里端上暂不消费，契约不动 |
| **D15** | 检索 | 自建双层索引、端上本地检索：titles 随首屏（实测 46.3KB）+ terms 输入 ≥2 字懒加载（实测 379KB ≤ 400KB 硬线）；切词 = 中文 bigram 滑窗（`Intl.Segmenter` 实测全切单字，弃用）+ pinyin-pro 拼音（构建期 devDependency，已批准）；建索引与端上共用同一纯函数 |
| **D16** | 缓存与存储 | 正文 4 MB 按字节 LRU；离线快照与 prefs 不参与淘汰（备案失效唯一兜底）；70%/90% 双水位守卫；真机实测配额 10240 KB（iPhone 16 Pro），代码读 `getStorageInfo` 不写死 |
| **D17** | M0 状态 | ✅ **完成并生产验收（2026-09-29）**：margin main@71831bc 部署，13 端点全 200、buildId `71831bc-9bf4b88413de`、counts.images = 246、`/_astro/*` immutable、HTML diff = 有界例外（astro.images 样式层注入，惰性已证明，视觉零变化）。契约细节见 api-contract.md |
| **D18** | M1-a 状态 | ✅ 基建完成 + A1 真机验收全绿（2026-09-29，iPhone 16 Pro/iOS 26.6.2）：TTI ≈880ms、缓存命中 <500ms、切 tab 滚动保留、存储 44–46KB 起步、版本比对→清缓存→刷新闭环。**UI 层按 D1 新基准重做中**（M1-b） |
| **D19** | tabBar 机制 | 路线 A：`tabBar.custom` + `custom-tab-bar/`，switchTab 语义 + 页面缓存（真机验证通过）。⚠️ **custom-tab-bar 组件内 WXSS 的 page 作用域变量不可达**：`var()` 落空时按 CSS 规范整条声明作废回透明——**该组件内禁用 CSS 变量做关键视觉，全部 tsx 内联 style**（按主题算具体值），WXSS 只留几何 |
| **D20** | WXSS 硬约束 | ① 构建管线剥掉全部 `@supports` 块 → `backdrop-filter` 一律裸声明（不支持机型自动忽略）；② WXSS 不认 `rgb(255 255 255 / 55%)` 空格斜杠语法 → rgba 一律逗号写法；③ margin 源码大量 `color-mix()/oklab` → 端上**构建期预计算为固定值**；④ 禁 `*` 通配与大部分伪类；⑤ `position: sticky` 安卓不稳，吸顶改 scroll-view + 动态 class |
| **D21** | A1 打点探针 | 启动链路/缓存/存储打点探针仍在产物中，**M5 提审前移除** |
| **D22** | 打样纪律 | 先打样再铺量：视觉基线 6 项（design.md §8）全过才宣告基线；对照物 = margin 线上站（真机/DevTools 移动视口），demo 截图已随 D1 删除 |
