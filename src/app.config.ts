export default defineAppConfig({
  pages: [
    "pages/home/index",
    "pages/tags/index",
    "pages/gallery/index",
    "pages/moment/index",
    "pages/mine/index",
  ],
  darkmode: true, // 跟随系统暗色（WXSS @media prefers-color-scheme 生效开关）
  // 按需注入（步 9b，D50 排期）：启动只注入当前页依赖的自定义组件与页面代码，
  // 未访问页面/未声明组件不注入（官方「代码注入优化」，基础库 ≥2.11.1，我们要求 ≥2.30）。
  // ⚠️ 与自定义 tabBar（D19）+ 分包预加载的兼容性未验 ⇒ automator 探针验过才留。
  lazyCodeLoading: "none",
  // 分包 A = 内容与浏览类页面、分包 B = 个人与设置类页面（均按 requirements §6.2）。
  // 详情页分享 path 一旦发布即固化，故按 §6.2 规划落分包而非主包（M4 还有 8 个二级页
  // 要进分包，主包预算 ≤1.5MB）。
  subPackages: [
    {
      root: "pagesA",
      pages: [
        "post/detail",
        "gallery-detail/index",
        "archive/index",
        "tag-detail/index",
        "friends/index",
        "projects/index",
        "search/index",
      ],
    },
    {
      root: "pagesB",
      pages: [
        "preference",
        "about",
        "disclaimer",
        "stats",
        "favorite",
        "history",
        "contact",
      ],
    },
  ],
  preloadRule: {
    // 预加载分包（WiFi/蜂窝都预取）：首页 → 文章详情；图库 tab → 画廊详情（M3 步 4，
    // 少了这条，从图库进详情要现拉分包）；我的 tab → 分包 B（M4 步 5：偏好/关于/
    // 免责都在 B，mine 列表是唯一入口）
    "pages/home/index": { network: "all", packages: ["pagesA"] },
    "pages/gallery/index": { network: "all", packages: ["pagesA"] },
    "pages/mine/index": { network: "all", packages: ["pagesB"] },
  },
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#F2F5EC", // margin --background 浅色原值
    navigationBarTitleText: "Margin",
    navigationBarTextStyle: "black",
    navigationStyle: "custom", // design.md §3：全部页面自定义导航
  },
  // custom tabBar（D3/D19：tabBar.custom + custom-tab-bar，保留 switchTab 语义与
  // 页面缓存）。color/selectedColor/backgroundColor 仅为原生兜底字段（不渲染），
  // 色值 = margin 令牌（fg / accent blue / bg）
  tabBar: {
    custom: true,
    color: "#353538",
    selectedColor: "#1158d1",
    backgroundColor: "#f2f5ec",
    borderStyle: "white",
    list: [
      { pagePath: "pages/home/index", text: "首页" },
      { pagePath: "pages/tags/index", text: "标签" },
      { pagePath: "pages/gallery/index", text: "图库" },
      { pagePath: "pages/moment/index", text: "瞬间" },
      { pagePath: "pages/mine/index", text: "我的" },
    ],
  },
});
