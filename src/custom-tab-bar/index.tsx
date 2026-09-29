/**
 * 自定义 tabBar（Q8 定案：路线 A —— tabBar.custom = true，保留 switchTab 语义与
 * 页面缓存；切 tab 滚动位置保留已真机验证）。
 * 形态（对照 demo 特写）：纯图标窄胶囊、无文字，选中项 = 浅柠檬绿圆角方块高亮；
 * 暗色模式：胶囊深底，选中块暗橄榄 + 亮柠檬图标（accent 反用，design.md §2）。
 * 毛玻璃降级：半透明白/深 + 描边 + 阴影。
 * 选中态同步：页面 useDidShow → store.setSelectedTab → 本组件订阅回显。
 */
import { View, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useState } from "react";

import { useTheme } from "@/hooks/useTheme";
import { getSelectedTab, setSelectedTab, subscribeSelectedTab } from "./store";
import "./index.scss";

import homeNormal from "../assets/tabbar/home-normal.png";
import homeActive from "../assets/tabbar/home-active.png";
import homeActiveDark from "../assets/tabbar/home-active-dark.png";
import tagNormal from "../assets/tabbar/tag-normal.png";
import tagActive from "../assets/tabbar/tag-active.png";
import tagActiveDark from "../assets/tabbar/tag-active-dark.png";
import imageNormal from "../assets/tabbar/image-normal.png";
import imageActive from "../assets/tabbar/image-active.png";
import imageActiveDark from "../assets/tabbar/image-active-dark.png";
import momentNormal from "../assets/tabbar/moment-normal.png";
import momentActive from "../assets/tabbar/moment-active.png";
import momentActiveDark from "../assets/tabbar/moment-active-dark.png";
import mineNormal from "../assets/tabbar/mine-normal.png";
import mineActive from "../assets/tabbar/mine-active.png";
import mineActiveDark from "../assets/tabbar/mine-active-dark.png";

const TABS = [
  { path: "/pages/home/index", normal: homeNormal, active: homeActive, activeDark: homeActiveDark },
  { path: "/pages/tags/index", normal: tagNormal, active: tagActive, activeDark: tagActiveDark },
  { path: "/pages/gallery/index", normal: imageNormal, active: imageActive, activeDark: imageActiveDark },
  { path: "/pages/moment/index", normal: momentNormal, active: momentActive, activeDark: momentActiveDark },
  { path: "/pages/mine/index", normal: mineNormal, active: mineActive, activeDark: mineActiveDark },
];

export default function CustomTabBar() {
  const theme = useTheme();
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
            <Image
              className='float-tab-icon'
              src={selected === idx ? (theme === "dark" ? tab.activeDark : tab.active) : tab.normal}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
