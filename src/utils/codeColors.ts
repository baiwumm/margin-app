/**
 * 代码块配色的端上消费口（M2 步 5）。
 *
 * 背景：`CodeToken.c` 是**索引**，指向 margin 构建期按文章渲染顺序累积去重的
 * `globalColors`（markdown.ts:128-148），所以配色表必须与同一批正文同源，端上无法自建。
 * 契约 §4 写着「配色表由 manifest 下发」，但那是 675d1a7 才接上的字段（此前 manifestData
 * 从未调用 codeColors()）⇒ 数据层红线不动 `src/types/api.ts`，这里用局部只读交叉类型读它；
 * 字段缺失（旧版本站点）时返回空表，代码块自然退回单色，不报错。
 */
import type { CodeColors, Manifest } from "@/types/api";

/** manifest 的 additive 可选字段（schemaVersion 未变，老客户端忽略未知键） */
type ManifestWithColors = Manifest & { codeColors?: CodeColors[] };

export function readCodeColors(manifest: Manifest | null | undefined): CodeColors[] {
  const table = (manifest as ManifestWithColors | null | undefined)?.codeColors;
  return Array.isArray(table) ? table : [];
}

/**
 * Shiki 代码块底色/默认字色，取线上 `<pre class="astro-code ...">` 的
 * `--shiki-light-bg / --shiki-dark-bg / --shiki-light / --shiki-dark` 实测原值
 * （主题对 = one-light / one-dark-pro，margin astro.config shikiConfig；底色为站点
 * typography.css 覆盖后的实测值：浅色白卡、暗色 #121212）。
 */
export const SHIKI_SURFACE = {
  light: { bg: "#ffffff", fg: "#383a42" },
  dark: { bg: "#121212", fg: "#abb2bf" },
} as const;

/** 索引 → 当前主题下的 CSS 颜色；单边缺失（空串）时返回 undefined 走默认字色 */
export function tokenColor(
  colors: CodeColors | undefined,
  theme: keyof typeof SHIKI_SURFACE
): string | undefined {
  const hex = colors?.[theme];
  return hex ? `#${hex}` : undefined;
}
