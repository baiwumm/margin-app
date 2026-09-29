# M1-a 进度记录（2026-09-29，闲时长任务）

> 状态：**基座与打样代码完成，本地编译验收全绿**；DevTools 导入、真机复核与两项定案（Q8 / React 19 运行确认）待用户。

## 完成清单

| 项 | 结果 |
| --- | --- |
| Taro 4.2.1 工程（React + TS，webpack5，D48） | `taro build weapp` ✅（占位基线 334KB → 全功能 358KB） |
| Tailwind v4 + weapp-tailwindcss v5（D37 版本写死） | ✅ 集成验证：tokens 变量进产物、arbitrary 类转义（`px-[24rpx]` → `.px-_b24rpx_B`） |
| 设计令牌 tokens.css | ✅ design.md §2 全量（浅色基线 + .theme-dark 推导 + 字体栈 + 暗色切换接口） |
| React 19（D49） | ✅ 19.3.0 编译级通过；**真机运行确认挂起** |
| services 层 | ✅ request（超时/重试/LocalError 归一/并发去重/400KB 断言）+ cache（4MB 字节 LRU/单篇 1MB 上限/快照 prefs 保护/70-90% 水位/buildId 清理）+ manifest（If-None-Match 304 流程）——**平台适配层可注入，纯逻辑 node 可测** |
| 单测（vitest） | ✅ **22/22**（request 9 / cache 8 / manifest 5，mock 平台适配） |
| Block 渲染器 | ✅ 九类基础块（p/h/img/code/quote/list/table/hr/unknown）+ Inline 修饰 + CodeBlock tokens 上色（manifest 配色表接口留好）+ CacheImage 三态（avgColor 占位/懒加载/失败态） |
| 打样页 ×5 | ✅ 首页（Hero/搜索胶囊/公告隐藏/快捷导航/标签错落网格/最新推荐 tabs 全模块，接生产 CDN，D40 排序 + D28 无图卡 + 错峰入场）、标签（双列色块卡）、图库（横滚筛选胶囊 D27 + 双列网格）、瞬间（月份横滚选择器 + 卡片图组）、我的（渐变 hero + 八宫格 D9 映射） |
| custom-tab-bar（D50） | ✅ Q8 路线 A 搭法（switchTab + onShow 同步），悬浮胶囊 + 毛玻璃 @supports 降级 |
| lint | ✅ 0 错误 |

## 遗留（M1-b）

- 「全部」图库聚合视图的详情懒加载（页面已留占位说明）
- CodeBlock 复制按钮接 `Taro.setClipboardData`；linkcard/music/video 卡片视觉（M2 范畴已提前占位）
- `BlockAssetsContext` 与 `setCodeColors` 接 manifest 数据（启动流程 M1-b 接线）
- rpx-theme 警告（weapp-tw）：Tailwind 内置 shadow/blur 变量在小程序的换算提示，M1 真机校验

## 待用户清单（按顺序）

1. **微信开发者工具导入** `E:\personal-project\margin-app`（appid 已配 wxab2feaffc36b3190）→ 预览五页
2. **真机复核**：首屏 TTI / 缓存命中 / 存储配额（R16）/ 301 行为 / React 19 运行（D49 收口）/ 切 tab 滚动位置保留
3. **Q8 定案**（design.md §8 打样第 3 项，当前按路线 A 搭好）
4. **打样视觉基线宣告**（6 项对照 demo；暗色显色与标签色板校准在第 2 项一起验）
5. git push 确认（本次全部 commit 仅在本地）

## 决策

- **D48** 编译器 webpack5（vite 被 pnpm 12.6 trustPolicy 拦截 + peer 冲突；项目级 trustPolicy: off）
- **D49** React 19.3.0 编译级通过
- **D50** tabBar 路线 A 搭法（Q8 不定案）
