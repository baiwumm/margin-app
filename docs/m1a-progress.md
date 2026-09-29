# M1-a 进度记录（2026-09-29，闲时长任务）

> 状态：**基座与打样代码完成，本地编译验收全绿**；DevTools 导入、真机复核与两项定案（Q8 / React 19 运行确认）待用户。

## 完成清单

| 项 | 结果 |
| --- | --- |
| Taro 4.2.1 工程（React + TS，webpack5，D48） | `taro build weapp` ✅（占位基线 334KB → 全功能 358KB） |
| Tailwind v4 + weapp-tailwindcss v5（D37 版本写死） | ✅ 集成验证：tokens 变量进产物、arbitrary 类转义（`px-[24rpx]` → `.px-_b24rpx_B`） |
| 设计令牌 tokens.css | ✅ design.md §2 全量（浅色基线 + .theme-dark 推导 + 字体栈 + 暗色切换接口） |
| React 版本（D49/D51） | ⚠️ 19.3.0 编译通过但**运行时失败**（DevTools 实测 ReactCurrentBatchConfig undefined，React 19 内部 API 改名 × Taro reconciler 未跟上）→ 已回退 **18.3.1**，产物复验 + 22 单测复绿；React 19 关闭待 Taro 升级 |
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
2. **真机复核**：首屏 TTI / 缓存命中 / 存储配额（R16）/ 301 行为 / 切 tab 滚动位置保留（React 19 项已关闭见 D51）
3. **Q8 定案**（design.md §8 打样第 3 项，当前按路线 A 搭好）
4. **打样视觉基线宣告**（6 项对照 demo；暗色显色与标签色板校准在第 2 项一起验）
5. git push 确认（本次全部 commit 仅在本地）

## 决策

- **D48** 编译器 webpack5（vite 被 pnpm 12.6 trustPolicy 拦截 + peer 冲突；项目级 trustPolicy: off）
- **D49** React 19.3.0 编译级通过（后被 D51 运行时否决）
- **D50** tabBar 路线 A 搭法（Q8 不定案）
- **D51** React 19 运行时失败回退 18.3.1（2026-09-29 用户实测触发）

## 运行时修复记录（2026-09-29，用户 DevTools 实测驱动）

| # | 报错 | 根因 | 修复 | 决策 |
| --- | --- | --- | --- | --- |
| 1 | `app.js: Cannot read property 'ReactCurrentBatchConfig' of undefined` | React 19 改内部 API 导出名，Taro 4.2.1 react-reconciler 为 React 18 系 | 回退 react/react-dom **18.3.1**，产物复验 + 22 单测复绿 | **D51**（React 19 关闭待 Taro 升级） |
| 2 | `custom-tab-bar/index: n[e] is not a function` | custom-tab-bar 组件内使用 `useDidShow`——页面级 hook 在无页面实例的组件上下文崩溃 | 移除组件内 useDidShow，改 **store 订阅模式**（`custom-tab-bar/store.ts` 单例 + 五页面各自 useDidShow 广播选中态）；产物复验 0 处 useDidShow | 实现模式修正（D50 补充：页面 → store → 组件单向同步） |

提交（本地未推送）：`ed3f28a`（M1-a 全量）→ `9bebe71`（React 18.3.1 回退）→ `e9dce81`（tabBar store 模式）。
| 3 | `custom-tab-bar/index: n[e] is not a function`（修复 #2 后仍在）+ `Page pages/home/index has not been registered yet` | **`src/custom-tab-bar/` 缺 `index.config.ts`** → 产物 json 为 `{}`、无 `component: true`，微信不把 custom-tab-bar 按组件实例化，Taro 运行时 Component 包装在错误上下文执行并连锁中断启动序列（页面注册失败是同一根因的下游症状）。Node 模拟求值（app→page→tabbar 同序）排除了 chunk 依赖图问题——产物模块注册表完整 | 补 `index.config.ts`（`component: true`），产物 json 复验 `{"component":true}`；useDidShow→store 改造（修复 #2）保留（正确实现模式） | 修复 #2 属必要但不充分；#3 才是崩溃主因 |
| 4 | （同 #2 报错，三轮字节级一致） | **待定：DevTools 热重载增量缓存疑似把新旧两轮 chunk 混合服务**（私有配置 compileHotReLoad:true；三轮报错完全相同、`s=` 指纹不变、而 dist 实际已大改；Node 双顺序模拟均无法复现 → 指向 DevTools 侧缓存而非产物缺陷）。产物模块图已静态核验完整（tab bar 所需 7 模块全部在声明 chunk [907,96,76] 内） | 已：① 私有配置关 `compileHotReLoad` 与 `ignoreDevUnusedFiles`；② dist/runtime.js 注入缺失模块探针（打印确切 module id，下次 pnpm build 覆盖） | 待用户：清缓存（工具菜单 → 清除全部缓存）→ 重新编译；若仍报错，控制台会出现 `[mp-debug] missing module factory: <id>`——把该行发回 |
