/**
 * 固定玻璃导航栏（对齐 uni-halo 3.x uh-navbar，D53）：
 * 顶部 fixed + 状态栏高度，行高 92rpx，标题居中加粗；
 * 背景随滚动渐显（page 底色 + blur，opacity 由页面 usePageScroll 传入，
 * 用 navAlpha 量化到 0.05 档控制重渲染频率）。
 * overlay 模式（我的页）：无占位、透明盖在 hero 上，标题顶部白字、滚过阈值转正文字色。
 */
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type { ReactNode } from "react";
import "./NavBar.scss";

const STATUS_BAR = (() => {
  try {
    return Taro.getSystemInfoSync().statusBarHeight ?? 44;
  } catch {
    return 44;
  }
})();

/** 滚动渐显 alpha（3.x min(scrollY/360, 0.8)；上限提到 0.9——管线剥 @supports 后
 *  无 blur 机型靠更高的底色透明度保证标题可读），量化到 0.05 档 */
export function navAlpha(scrollTop: number): number {
  const a = Math.min(scrollTop / 360, 0.9);
  return Math.round(a * 20) / 20;
}

interface NavBarProps {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  overlay?: boolean;
  /** navAlpha(scrollTop) 的返回值（页面 usePageScroll 里 setState） */
  alpha?: number;
}

export default function NavBar({
  title,
  left,
  right,
  overlay = false,
  alpha = 0,
}: NavBarProps) {
  const solid = alpha > 0.4; // 3.x 阈值：scrollY/360 > 0.5
  return (
    <>
      <View className='nav-root'>
        <View className='nav-bg' style={{ opacity: alpha }} />
        <View className='nav-row' style={{ paddingTop: `${STATUS_BAR}px` }}>
          <View className='nav-side'>{left}</View>
          <Text
            className={`nav-title ${overlay && !solid ? "nav-title-white" : ""}`}
          >
            {title}
          </Text>
          <View className='nav-side nav-side-right'>{right}</View>
        </View>
      </View>
      {!overlay ? (
        <View
          className='nav-spacer'
          style={{ height: `calc(${STATUS_BAR}px + 92rpx)` }}
        />
      ) : null}
    </>
  );
}
