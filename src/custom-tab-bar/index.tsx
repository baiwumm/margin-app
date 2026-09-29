/**
 * 自定义 tabBar（Q8 路线 A 倾向：tabBar.custom = true，保留 switchTab 语义与
 * 页面缓存——切 tab 回首页滚动位置保留；路线 B 的页面内自绘变体待 Q8 定案）。
 * 每次 onShow 手动同步选中态（Taro.getCurrentPages().length 判定 + dataset）。
 * 悬浮胶囊形态（design.md §1 全局：5 tab 选中带色，非通栏）。
 * backdrop-filter 不支持的降级：半透明白 + 描边 + 淡阴影（design.md §6）。
 */
import Taro, { useDidShow } from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { useState } from "react";
import "./index.scss";

const TABS = [
  { path: "/pages/home/index", icon: "🏠", label: "首页" },
  { path: "/pages/tags/index", icon: "🏷️", label: "标签" },
  { path: "/pages/gallery/index", icon: "🖼️", label: "图库" },
  { path: "/pages/moment/index", icon: "⚡", label: "瞬间" },
  { path: "/pages/mine/index", icon: "👤", label: "我的" },
];

export default function CustomTabBar() {
  const [selected, setSelected] = useState(0);

  useDidShow(() => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1];
    if (!current) return;
    const path = `/${current.route ?? ""}`;
    const idx = TABS.findIndex(t => t.path === path);
    if (idx >= 0) setSelected(idx);
  });

  const switchTo = (idx: number) => {
    setSelected(idx);
    void Taro.switchTab({ url: TABS[idx].path });
  };

  return (
    <View className='float-tabbar'>
      <View className='float-tabbar-inner'>
        {TABS.map((tab, idx) => (
          <View
            key={tab.path}
            className={`float-tab ${selected === idx ? "float-tab-active" : ""}`}
            onClick={() => switchTo(idx)}
          >
            <Text className='float-tab-icon'>{tab.icon}</Text>
            <Text className='float-tab-label'>{tab.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
