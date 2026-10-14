/**
 * 站点字体加载器（D4）：偏好「站点字体」开启时，异步加载 Maple Mono CN 的
 * ASCII 切片（数据与 URL 构造在同级 siteFontData.ts，纯数据可单测）。
 *
 * CSS 侧 --font-body / --font-mono 栈常驻两个家族名、未加载时自动穿透
 * （D64 扩展：正文/标题的拉丁字符也走 Maple —— margin global.css 即全站
 * Maple；中文仍随系统：loadFontFace 无 unicode-range，CJK 全量 MB 级，D4 红线）。
 * 加载不阻塞首屏、失败静默（留 [siteFont] 日志，渲染层无感）。
 */
import Taro from "@tarojs/taro";

import { currentBase } from "@/services/api/manifest";
import { siteFontUrls } from "./siteFontData";

/** 本会话是否已发起过加载（幂等；不在意失败 —— 下一次冷启动会再试） */
let requested = false;

/** 偏好开启时调用；幂等、失败不打断 UI（留 [siteFont] 日志供 vConsole 取证：
 * 真机已知「global 对已打开页面不保证生效，冷启动路径才可靠」——
 * 若日志 loaded 而当前页无变化，属平台已渲染页不重绘，重进即好转） */
export function loadSiteFont(): void {
  if (requested) return;
  requested = true;
  for (const { family, url } of siteFontUrls(currentBase())) {
    void Taro.loadFontFace({
      family,
      source: `url("${url}")`,
      global: true,
      success: () => console.log(`[siteFont] loaded ${family}`),
      fail: ({ errMsg }) => console.warn(`[siteFont] fail ${family}: ${errMsg}`),
    }).catch(() => undefined);
  }
}
