export default defineAppConfig({
  pages: [
    "pages/home/index",
    "pages/tags/index",
    "pages/gallery/index",
    "pages/moment/index",
    "pages/mine/index",
  ],
  darkmode: true, // 跟随系统暗色（WXSS @media prefers-color-scheme 生效开关）
  // 分包 A = 内容与浏览类页面（requirements §6.2）。详情页分享 path 一旦发布即固化，
  // 故按 §6.2 规划落 pagesA 而非主包（M4 还有 9 个二级页要进分包，主包预算 ≤1.5MB）。
  subPackages: [
    {
      root: "pagesA",
      pages: ["post/detail"],
    },
  ],
  preloadRule: {
    // 首页是详情页的唯一入口，预加载分包（WiFi/蜂窝都预取）
    "pages/home/index": { network: "all", packages: ["pagesA"] },
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
