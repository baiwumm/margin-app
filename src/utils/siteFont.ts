/**
 * 站点字体加载器（D4）：偏好「站点字体」开启时，异步加载 Maple Mono CN 的
 * ASCII 切片（数据与 URL 构造在同级 siteFontData.ts，纯数据可单测）。
 *
 * CSS 侧 --font-mono 栈常驻两个家族名、未加载时自动穿透到系统等宽栈
 * ⇒ 关偏好零成本、零视觉变化；中文仍随系统（全量子集 MB 级，D4 红线）。
 * 加载不阻塞首屏、失败静默（fail 回调只吞，渲染层无感）。
 */
import Taro from "@tarojs/taro";

import { currentBase } from "@/services/api/manifest";
import { siteFontUrls } from "./siteFontData";

/** 本会话是否已发起过加载（幂等；不在意失败 —— 下一次冷启动会再试） */
let requested = false;

/** 偏好开启时调用；幂等、失败静默 */
export function loadSiteFont(): void {
  if (requested) return;
  requested = true;
  for (const { family, url } of siteFontUrls(currentBase())) {
    void Taro.loadFontFace({
      family,
      source: `url("${url}")`,
      global: true,
      success: () => undefined,
      fail: () => undefined,
    }).catch(() => undefined);
  }
}
