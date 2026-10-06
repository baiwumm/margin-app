/**
 * 二级页顶栏（design.md §4「标题居中」）：返回 + 居中标题 + 右侧动作槽。
 * 几何/滚动态复用 NavBar.scss 的 .nav-root/.nav-bg/.nav-row（同一套 margin Header
 * 语言），NavBar 的 alpha-only 契约与五 tab 页用法不动。
 * 右槽留给后续单元（TOC / 阅读模式），本轮不放动作。
 */
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { STATUS_BAR } from "./NavBar";
import "./NavBar.scss";
import "./SubNavBar.scss";

interface SubNavBarProps {
  title: string;
  /** navAlpha(scrollTop) 的返回值（页面 usePageScroll 里 setState） */
  alpha?: number;
}

export default function SubNavBar({ title, alpha = 0 }: SubNavBarProps) {
  return (
    <>
      <View className='nav-root'>
        <View className='nav-bg' style={{ opacity: alpha }} />
        <View className='nav-row' style={{ paddingTop: `${STATUS_BAR}px` }}>
          <View
            className='sub-nav-back'
            hoverClass='row-press'
            hoverStayTime={80}
            onClick={() => void Taro.navigateBack()}
          >
            <View className='sub-nav-chevron' />
          </View>
          <Text className='sub-nav-title'>{title}</Text>
          <View className='sub-nav-slot' />
        </View>
      </View>
      <View
        className='nav-spacer'
        style={{ height: `calc(${STATUS_BAR}px + 88rpx)` }}
      />
    </>
  );
}
