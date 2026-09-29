/**
 * 自定义 tabBar（Q8 路线 A：tabBar.custom = true，保留 switchTab 语义与页面缓存）。
 * 悬浮胶囊形态（design.md §1 全局）；毛玻璃不支持时降级半透明白 + 描边 + 阴影。
 * 选中态同步：页面 useDidShow → store.setSelectedTab → 本组件订阅回显
 * （组件内不能用 useDidShow —— 页面级 hook，见 M1-a 修复记录）。
 */
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useState } from "react";

import {
  getSelectedTab,
  setSelectedTab,
  subscribeSelectedTab,
} from "./store";
import "./index.scss";

const TABS = [
  { path: "/pages/home/index", icon: "🏠", label: "首页" },
  { path: "/pages/tags/index", icon: "🏷️", label: "标签" },
  { path: "/pages/gallery/index", icon: "🖼️", label: "图库" },
  { path: "/pages/moment/index", icon: "⚡", label: "瞬间" },
  { path: "/pages/mine/index", icon: "👤", label: "我的" },
];

export default function CustomTabBar() {
  const [selected, setSelected] = useState(getSelectedTab());

  useEffect(() => subscribeSelectedTab(setSelected), []);

  const switchTo = (idx: number) => {
    setSelectedTab(idx);
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
