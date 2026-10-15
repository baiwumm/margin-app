/**
 * 二级页顶栏（design.md §4「标题居中」）：返回 + 居中标题 + 右侧动作槽。
 * 几何/滚动态复用 NavBar.scss 的 .nav-root/.nav-bg/.nav-row（同一套 margin Header
 * 语言），NavBar 的 alpha-only 契约与五 tab 页用法不动。
 * action = 右槽动作（步 8 起收藏页用：详情页传 ★ 收藏开关；不传时槽位保留、
 * 几何与旧版一致）。
 */
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type { ReactNode } from "react";

import { CAP_RIGHT, STATUS_BAR } from "./NavBar";
import "./NavBar.scss";
import "./SubNavBar.scss";

interface SubNavBarProps {
  title: string;
  /** navAlpha(scrollTop) 的返回值（页面 usePageScroll 里 setState） */
  alpha?: number;
  /** 阅读进度 0–1（margin .progress-container：顶栏底沿 4rpx 渐变条） */
  progress?: number;
  /** 右槽动作（如详情页的收藏开关） */
  action?: ReactNode;
}

export default function SubNavBar({ title, alpha = 0, progress = 0, action }: SubNavBarProps) {
  return (
    <>
      <View className='nav-root'>
        <View className='nav-bg' style={{ opacity: alpha }} />
        <View className='nav-row' style={{ paddingTop: `${STATUS_BAR}px`, paddingRight: `${CAP_RIGHT}px` }}>
          <View
            className='sub-nav-back'
            hoverClass='row-press'
            hoverStayTime={80}
            onClick={() => void Taro.navigateBack()}
          >
            <View className='sub-nav-chevron' />
          </View>
          <Text className='sub-nav-title'>{title}</Text>
          <View className='sub-nav-slot'>{action}</View>
        </View>
        <View className='nav-progress'>
          <View
            className='nav-progress-bar'
            /* 不再 round 到整数百分比（那是第二重量化，和 detail 那边叠起来把进度压成
             * 101 档）；三位小数 = 390px 屏上 0.004px 一档，肉眼连续 */
            style={{
              width: `${(Math.min(1, Math.max(0, progress)) * 100).toFixed(3)}%`,
            }}
          />
        </View>
      </View>
      <View
        className='nav-spacer'
        style={{ height: `calc(${STATUS_BAR}px + 88rpx)` }}
      />
    </>
  );
}
