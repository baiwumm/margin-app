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
    navigationBarBackgroundColor: "#F6F3EE",
    navigationBarTitleText: "Margin",
    navigationBarTextStyle: "black",
    navigationStyle: "custom", // design.md：全部页面自定义导航
  },
  // Q8 路线 A（D52 定案）：custom tabBar 保留 switchTab 语义与页面缓存。
  // color/selectedColor/backgroundColor 仅为原生兜底字段（custom:true 不渲染），
  // 色值对齐 uni-halo 3.x config.ts（D53）
  tabBar: {
    custom: true,
    color: "#303133",
    selectedColor: "#B9E424",
    backgroundColor: "#ffffff",
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
