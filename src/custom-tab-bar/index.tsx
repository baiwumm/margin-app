/**
 * 自定义 tabBar（Q8 定案：路线 A —— tabBar.custom = true，保留 switchTab 语义与
 * 页面缓存；切 tab 滚动位置保留已真机验证）。
 * 悬浮胶囊形态（design.md §1 全局）；毛玻璃降级：半透明白 + 描边 + 阴影。
 * 图标：线性 PNG 两态（src/assets/tabbar/，选中柠檬绿——D52）。
 * 选中态同步：页面 useDidShow → store.setSelectedTab → 本组件订阅回显。
 */
import { View, Text, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useState } from "react";

import { getSelectedTab, setSelectedTab, subscribeSelectedTab } from "./store";
import "./index.scss";

import homeNormal from "../assets/tabbar/home-normal.png";
import homeActive from "../assets/tabbar/home-active.png";
import tagNormal from "../assets/tabbar/tag-normal.png";
import tagActive from "../assets/tabbar/tag-active.png";
import imageNormal from "../assets/tabbar/image-normal.png";
import imageActive from "../assets/tabbar/image-active.png";
import momentNormal from "../assets/tabbar/moment-normal.png";
import momentActive from "../assets/tabbar/moment-active.png";
import mineNormal from "../assets/tabbar/mine-normal.png";
import mineActive from "../assets/tabbar/mine-active.png";

const TABS = [
  { path: "/pages/home/index", label: "首页", normal: homeNormal, active: homeActive },
  { path: "/pages/tags/index", label: "标签", normal: tagNormal, active: tagActive },
  { path: "/pages/gallery/index", label: "图库", normal: imageNormal, active: imageActive },
  { path: "/pages/moment/index", label: "瞬间", normal: momentNormal, active: momentActive },
  { path: "/pages/mine/index", label: "我的", normal: mineNormal, active: mineActive },
];

export default function CustomTabBar() {
  const [selected, setSelected] = useState(getSelectedTab());

  useEffect(() => subscribeSelectedTab(setSelected), []);

  const switchTo = (idx: number) => {
    setSelectedTab(idx);
    void Taro.switchTab({ url: TABS[idx].path });
  };

  return (
    <View className="float-tabbar">
      <View className="float-tabbar-inner">
        {TABS.map((tab, idx) => (
          <View
            key={tab.path}
            className={`float-tab ${selected === idx ? "float-tab-active" : ""}`}
            onClick={() => switchTo(idx)}
          >
            <Image
              className="float-tab-icon"
              src={selected === idx ? tab.active : tab.normal}
            />
            <Text className="float-tab-label">{tab.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
