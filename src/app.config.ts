export default defineAppConfig({
  pages: [
    "pages/home/index",
    "pages/tags/index",
    "pages/gallery/index",
    "pages/moment/index",
    "pages/mine/index",
  ],
  darkmode: true, // 跟随系统暗色（WXSS @media prefers-color-scheme 生效开关）
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
