export default definePageConfig({
  navigationBarTitleText: "文章",
  // 右上角「转发 / 分享到朋友圈」两个入口（Taro 只在 enable* 或页面定义了 onShare* 时注册生命周期）
  enableShareAppMessage: true,
  enableShareTimeline: true,
});
