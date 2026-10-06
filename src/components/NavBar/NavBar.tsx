/**
 * 顶栏（margin Header.astro 同族，design.md §3 / §10 步骤 6）：
 * 居左 logo lockup（mark 56rpx + 字标 40rpx，明暗两版 PNG），
 * 居右搜索（M4 检索页就绪前占位提示）与主题切换（轻/暗直接翻转偏好，
 * 恢复跟随系统走 M2 偏好页）；滚动态 bg → surface + 底部发丝线，
 * 透明度随 navAlpha 渐显（页面 usePageScroll 传入，0.05 档量化控制重渲染）。
 * 高度 = 状态栏 + 88rpx。
 */
import { View, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { setThemePreference, useTheme } from "@/hooks/useTheme";
import "./NavBar.scss";

import markLight from "@/assets/logo/mark-light.png";
import markDark from "@/assets/logo/mark-dark.png";
import wordmarkLight from "@/assets/logo/wordmark-light.png";
import wordmarkDark from "@/assets/logo/wordmark-dark.png";
import searchLight from "@/assets/deco/icon-search-light.png";
import searchDark from "@/assets/deco/icon-search-dark.png";
import moonLight from "@/assets/deco/icon-moon-light.png";
import sunDark from "@/assets/deco/icon-sun-dark.png";

/** 状态栏高度（px）——SubNavBar 复用同一套顶栏几何 */
export const STATUS_BAR = (() => {
  try {
    return Taro.getSystemInfoSync().statusBarHeight ?? 44;
  } catch {
    return 44;
  }
})();

/**
 * 微信右上角胶囊按钮占掉的右侧宽度（+8px 呼吸位），顶栏右侧内容必须让开它。
 * 实测 iPhone 12/13 档 cap.left=296 / windowWidth=390 ⇒ 预留 102px；取不到时回落 0
 * （不破坏原几何）。NavBar 与 SubNavBar 共用这一份，避免两栏各算各的。
 */
export const CAP_RIGHT = (() => {
  try {
    const cap = Taro.getMenuButtonBoundingClientRect();
    const win = Taro.getSystemInfoSync().windowWidth;
    return cap && cap.left ? Math.max(0, win - cap.left + 8) : 0;
  } catch {
    return 0;
  }
})();

/** 滚动渐显 alpha（scrollY/360 封顶 1），量化到 0.05 档 */
export function navAlpha(scrollTop: number): number {
  const a = Math.min(scrollTop / 360, 1);
  return Math.round(a * 20) / 20;
}

interface NavBarProps {
  /** navAlpha(scrollTop) 的返回值（页面 usePageScroll 里 setState） */
  alpha?: number;
}

export default function NavBar({ alpha = 0 }: NavBarProps) {
  const theme = useTheme();
  const dark = theme === "dark";

  const onSearch = () => {
    // M4 检索页（双层索引）就绪前占位
    void Taro.showToast({ title: "搜索即将上线", icon: "none" });
  };
  const onToggleTheme = () => {
    setThemePreference(dark ? "light" : "dark");
  };

  return (
    <>
      <View className='nav-root'>
        <View className='nav-bg' style={{ opacity: alpha }} />
        <View
          className='nav-row'
          style={{
            paddingTop: `${STATUS_BAR}px`,
            paddingRight: `${CAP_RIGHT}px`,
          }}
        >
          <View className='nav-logo'>
            <Image className='nav-mark' src={dark ? markDark : markLight} />
            <Image
              className='nav-wordmark'
              src={dark ? wordmarkDark : wordmarkLight}
            />
          </View>
          <View className='nav-actions'>
            <View
              className='nav-action'
              hoverClass='row-press'
              onClick={onSearch}
            >
              <Image
                className='nav-action-icon'
                src={dark ? searchDark : searchLight}
              />
            </View>
            <View
              className='nav-action'
              hoverClass='row-press'
              onClick={onToggleTheme}
            >
              <Image
                className='nav-action-icon'
                src={dark ? sunDark : moonLight}
              />
            </View>
          </View>
        </View>
      </View>
      <View
        className='nav-spacer'
        style={{ height: `calc(${STATUS_BAR}px + 88rpx)` }}
      />
    </>
  );
}
