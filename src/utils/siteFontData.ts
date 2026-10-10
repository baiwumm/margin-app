/**
 * 站点字体的切片数据（D4，纯数据无 Taro 依赖 —— 单测要能 import；
 * 含 Taro 的加载器在同级 siteFont.ts）。
 *
 * 块从哪来（当年挂起的根因）：站点自己就在 served 这些切片 —— margin 的
 * Layout.astro 引 /giscus/fonts/maple-mono-cn/maple-mono-cn.css（229 个
 * unicode-range 切片）。D4/D25 当年假设要新生成子集（/fonts/*.woff2 404）
 * ⇒ 一直挂起，实际同域已有、且与图片同走 downloadFile 白名单（D9）。
 *
 * 覆盖口径：可打印 ASCII = 2 片（U+20-4A / U+4B-7E，实测合计约 34KB）；
 * CJK 仍回落系统（全量子集 MB 级，D4 红线不变）。
 */
export const SITE_FONT_SLICES = [
  {
    family: "Maple Mono CN",
    hash: "4eee787d900af2eff915fa460dcc0904",
    range: "U+D, U+20-4A, U+6F",
  },
  {
    family: "Maple Mono CN Ext",
    hash: "2f04d0609cf5de6e65c92a1db9b41dee",
    range: "U+4B-6E, U+70-7E",
  },
] as const;

const FONT_DIR = "/giscus/fonts/maple-mono-cn/";

/** 切片 URL（base 取 manifest.assetBase，零硬编码，同其余资产口径） */
export function siteFontUrls(
  base: string
): { family: string; url: string; range: string }[] {
  return SITE_FONT_SLICES.map(s => ({
    family: s.family,
    url: `${base}${FONT_DIR}${s.hash}.woff2`,
    range: s.range,
  }));
}
