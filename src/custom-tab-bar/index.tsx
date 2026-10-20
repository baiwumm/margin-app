/**
 * 自定义 tabBar（D3/D19：tabBar.custom 路线，保留 switchTab 语义与页面缓存）。
 * 形态（design.md §3/§10 步骤 5）= margin 语言、非悬浮胶囊：全宽 surface 底 +
 * 顶部发丝线（border 20%）+ 5 项等宽、图标 44rpx 上下无文字；
 * 选中 = accent 8% 圆角底块（12rpx 圆角）+ 图标全色（fg 100%），未选中 fg 55%
 * （margin 移动菜单 active = accent 底同族映射）；accent 跟随偏好配置表。
 * ⚠️ D19：custom-tab-bar 组件内 WXSS 的 CSS 变量不可达（var 落空整条声明作废
 * 回透明）——底/发丝线/选中底块全部 tsx 内联 style 按主题 + accent 算具体值，
 * index.scss 只留几何（不用任何 var）。
 * 选中态同步：页面 useDidShow → store.setSelectedTab → 本组件订阅回显。
 */
import { View, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useState } from "react";

import { useTheme } from "@/hooks/useTheme";
import {
  accentRgba,
  getAccent,
  subscribeAccent,
  type AccentKey,
} from "@/config/accent";
import { getSelectedTab, setSelectedTab, subscribeSelectedTab } from "./store";
import "./index.scss";

import homeNormal from "../assets/tabbar/home-normal-light.png";
import homeActive from "../assets/tabbar/home-active-light.png";
import homeNormalDark from "../assets/tabbar/home-normal-dark.png";
import homeActiveDark from "../assets/tabbar/home-active-dark.png";
import tagNormal from "../assets/tabbar/tag-normal-light.png";
import tagActive from "../assets/tabbar/tag-active-light.png";
import tagNormalDark from "../assets/tabbar/tag-normal-dark.png";
import tagActiveDark from "../assets/tabbar/tag-active-dark.png";
import galleryNormal from "../assets/tabbar/gallery-normal-light.png";
import galleryActive from "../assets/tabbar/gallery-active-light.png";
import galleryNormalDark from "../assets/tabbar/gallery-normal-dark.png";
import galleryActiveDark from "../assets/tabbar/gallery-active-dark.png";
import momentNormal from "../assets/tabbar/moment-normal-light.png";
import momentActive from "../assets/tabbar/moment-active-light.png";
import momentNormalDark from "../assets/tabbar/moment-normal-dark.png";
import momentActiveDark from "../assets/tabbar/moment-active-dark.png";
import userNormal from "../assets/tabbar/user-normal-light.png";
import userActive from "../assets/tabbar/user-active-light.png";
import userNormalDark from "../assets/tabbar/user-normal-dark.png";
import userActiveDark from "../assets/tabbar/user-active-dark.png";

const TABS = [
  { path: "/pages/home/index", normal: homeNormal, active: homeActive, normalDark: homeNormalDark, activeDark: homeActiveDark },
  { path: "/pages/tags/index", normal: tagNormal, active: tagActive, normalDark: tagNormalDark, activeDark: tagActiveDark },
  { path: "/pages/gallery/index", normal: galleryNormal, active: galleryActive, normalDark: galleryNormalDark, activeDark: galleryActiveDark },
  { path: "/pages/moment/index", normal: momentNormal, active: momentActive, normalDark: momentNormalDark, activeDark: momentActiveDark },
  { path: "/pages/mine/index", normal: userNormal, active: userActive, normalDark: userNormalDark, activeDark: userActiveDark },
];

/** margin 令牌内联值（light/dark）：surface 底 + 发丝线（border 20%），
 * 与 tokens.css 预计算值一致——本组件内不可用 var，故按主题落死 */
const BAR = {
  light: {
    backgroundColor: "#efefed", // --c-surface
    borderTop: "1rpx solid rgba(124, 173, 255, 0.2)", // --c-border-20
  },
  dark: {
    backgroundColor: "#121212",
    borderTop: "1rpx solid rgba(34, 100, 227, 0.2)",
  },
} as const;

export default function CustomTabBar() {
  const theme = useTheme();
  const [selected, setSelected] = useState(getSelectedTab());
  const [accent, setAccentState] = useState<AccentKey>(getAccent());

  useEffect(() => subscribeSelectedTab(setSelected), []);
  useEffect(() => subscribeAccent(setAccentState), []);

  const switchTo = (idx: number) => {
    setSelectedTab(idx);
    void Taro.switchTab({ url: TABS[idx].path });
  };

  const bar = BAR[theme];

  return (
    <View className='tabbar' style={bar}>
      <View className='tabbar-row'>
        {TABS.map((tab, idx) => {
          const isActive = selected === idx;
          const src =
            theme === "dark"
              ? isActive
                ? tab.activeDark
                : tab.normalDark
              : isActive
                ? tab.active
                : tab.normal;
          return (
            <View
              key={tab.path}
              className='tabbar-item'
              hoverClass='tabbar-press'
              hoverStayTime={80}
              onClick={() => switchTo(idx)}
            >
              <View
                className='tabbar-block'
                style={
                  isActive
                    ? { backgroundColor: accentRgba(accent, theme, 0.08) }
                    : undefined
                }
              >
                <Image className='tabbar-icon' src={src} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
