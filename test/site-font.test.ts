import { describe, expect, it } from "vitest";

import { SITE_FONT_SLICES, siteFontUrls } from "@/utils/siteFontData";

/** D4 站点字体：两个 ASCII 切片的 URL 构造（base 取 manifest.assetBase 口径） */
describe("siteFontUrls", () => {
  const urls = siteFontUrls("https://www.baiwumm.com");

  it("两片：基本段 + 扩展段，家族名不同（CSS 栈按字形回退拼接）", () => {
    expect(urls).toHaveLength(2);
    expect(urls[0].family).toBe("Maple Mono CN");
    expect(urls[1].family).toBe("Maple Mono CN Ext");
    expect(urls[0].range).toContain("U+20-4A");
    expect(urls[1].range).toContain("U+4B-6E");
    expect(urls[1].range).toContain("U+70-7E");
  });

  it("URL = base + 站点切片目录 + hash.woff2（同域、无硬编码域名）", () => {
    expect(urls[0].url).toBe(
      "https://www.baiwumm.com/giscus/fonts/maple-mono-cn/4eee787d900af2eff915fa460dcc0904.woff2"
    );
    expect(urls[1].url).toBe(
      "https://www.baiwumm.com/giscus/fonts/maple-mono-cn/2f04d0609cf5de6e65c92a1db9b41dee.woff2"
    );
  });

  it("base 带尾斜杠也不双斜杠（调用方传的是 manifest.assetBase，无尾斜杠）", () => {
    const u = siteFontUrls("https://www.baiwumm.com");
    for (const x of u) expect(x.url).not.toContain("com//");
  });

  it("切片常量与 URL 一一对应", () => {
    for (const s of SITE_FONT_SLICES) {
      const hit = urls.find(x => x.family === s.family);
      expect(hit?.url).toContain(`${s.hash}.woff2`);
    }
  });
});
