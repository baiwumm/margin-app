/**
 * 自定义 tabBar（Q8 定案：路线 A —— tabBar.custom = true，保留 switchTab 语义与
 * 页面缓存；切 tab 滚动位置保留已真机验证）。
 * 形态（D54 对照 demo 复核）：白玻璃胶囊等距 5 图标、无文字；图标 = 深墨线性
 * （浅色 normal/active 同色，选中态靠浅柠檬绿圆角方块区分，同 demo）；
 * 暗色：胶囊深底，未选中灰（normal-dark），选中暗橄榄方块 + 亮柠檬图标。
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
import homeNormalDark from "../assets/tabbar/home-normal-dark.png";
import tagNormal from "../assets/tabbar/tag-normal.png";
import tagActive from "../assets/tabbar/tag-active.png";
import tagActiveDark from "../assets/tabbar/tag-active-dark.png";
import tagNormalDark from "../assets/tabbar/tag-normal-dark.png";
import imageNormal from "../assets/tabbar/image-normal.png";
import imageActive from "../assets/tabbar/image-active.png";
import imageActiveDark from "../assets/tabbar/image-active-dark.png";
import imageNormalDark from "../assets/tabbar/image-normal-dark.png";
import momentNormal from "../assets/tabbar/moment-normal.png";
import momentActive from "../assets/tabbar/moment-active.png";
import momentActiveDark from "../assets/tabbar/moment-active-dark.png";
import momentNormalDark from "../assets/tabbar/moment-normal-dark.png";
import mineNormal from "../assets/tabbar/mine-normal.png";
import mineActive from "../assets/tabbar/mine-active.png";
import mineActiveDark from "../assets/tabbar/mine-active-dark.png";
import mineNormalDark from "../assets/tabbar/mine-normal-dark.png";

const TABS = [
  { path: "/pages/home/index", normal: homeNormal, active: homeActive, activeDark: homeActiveDark, normalDark: homeNormalDark },
  { path: "/pages/tags/index", normal: tagNormal, active: tagActive, activeDark: tagActiveDark, normalDark: tagNormalDark },
  { path: "/pages/gallery/index", normal: imageNormal, active: imageActive, activeDark: imageActiveDark, normalDark: imageNormalDark },
  { path: "/pages/moment/index", normal: momentNormal, active: momentActive, activeDark: momentActiveDark, normalDark: momentNormalDark },
  { path: "/pages/mine/index", normal: mineNormal, active: mineActive, activeDark: mineActiveDark, normalDark: mineNormalDark },
];

export default function CustomTabBar() {
  const theme = useTheme();
  const [selected, setSelected] = useState(getSelectedTab());

  useEffect(() => subscribeSelectedTab(setSelected), []);

  const switchTo = (idx: number) => {
    setSelectedTab(idx);
    void Taro.switchTab({ url: TABS[idx].path });
  };

  /* 底色/描边/阴影/选中块全部内联（D55）：WXSS 的 CSS 变量在 custom-tab-bar
   * 组件边界不保证可达（浅色令牌块无 :host 选择器，var 落空时按规范整条
   * background 作废回透明——D53/D54 两轮截图透明即此），内联是确定性通道。 */
  const glass =
    theme === "dark"
      ? {
          backgroundColor: "rgba(30, 32, 29, 0.92)",
          border: "1rpx solid rgba(255, 255, 255, 0.12)",
          boxShadow:
            "inset 0 1rpx 0 rgba(255, 255, 255, 0.08), 0 8rpx 32rpx rgba(0, 0, 0, 0.5)",
        }
      : {
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          border: "1rpx solid rgba(255, 255, 255, 0.9)",
          boxShadow:
            "inset 0 1rpx 0 rgba(255, 255, 255, 0.8), 0 8rpx 32rpx rgba(45, 47, 46, 0.16)",
        };
  const activeBg = theme === "dark" ? "#35401F" : "#E0EF93";

  return (
    <View className='float-tabbar'>
      <View className='float-tabbar-inner' style={glass}>
        {TABS.map((tab, idx) => (
          <View
            key={tab.path}
            className={`float-tab ${selected === idx ? "float-tab-active" : ""}`}
            style={selected === idx ? { backgroundColor: activeBg } : undefined}
            onClick={() => switchTo(idx)}
          >
            <Image
              className='float-tab-icon'
              src={
                selected === idx
                  ? theme === "dark"
                    ? tab.activeDark
                    : tab.active
                  : theme === "dark"
                    ? tab.normalDark
                    : tab.normal
              }
            />
          </View>
        ))}
      </View>
    </View>
  );
}
