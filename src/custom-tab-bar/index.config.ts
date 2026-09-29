// 自定义 tabBar 必须声明为组件（缺 component:true 时微信不按组件实例化，
// Taro 运行时 Component 包装会崩：n[e] is not a function，见 M1-a 修复记录 #3）
export default {
  component: true,
};
