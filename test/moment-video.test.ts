import { describe, expect, it } from "vitest";

import { frameRatio, selfHostedVideoSrc } from "@/utils/momentVideo";
import { DEFAULT_BASE } from "@/services/api/manifest";

/**
 * D52 单元：瞬间自托管 mp4 内嵌播放的两个纯函数。
 * currentBase() 在无 manifest 时 = DEFAULT_BASE（bootstrap 常量，D19/D52 同源）。
 */
describe("selfHostedVideoSrc", () => {
  it("站内相对路径拼成绝对地址（D52：契约 video.src 可以是 /video/xxx.mp4）", () => {
    expect(selfHostedVideoSrc("/video/atyjcue6.mp4")).toBe(
      `${DEFAULT_BASE}/video/atyjcue6.mp4`
    );
  });

  it("同 assetBase 的绝对地址原样返回", () => {
    const abs = `${DEFAULT_BASE}/video/abc.mp4`;
    expect(selfHostedVideoSrc(abs)).toBe(abs);
  });

  it("外链返回 null（调用方回退降级引用卡）", () => {
    expect(selfHostedVideoSrc("https://www.bilibili.com/video/BV1xx")).toBe(null);
    expect(selfHostedVideoSrc("https://example.com/x.mp4")).toBe(null);
  });

  it("缺省 / 空串 / 不带斜杠的相对路径都返回 null（不猜）", () => {
    expect(selfHostedVideoSrc(undefined)).toBe(null);
    expect(selfHostedVideoSrc("")).toBe(null);
    expect(selfHostedVideoSrc("video/x.mp4")).toBe(null);
  });
});

describe("frameRatio", () => {
  it("缺省回落 16/9", () => {
    expect(frameRatio(undefined)).toBe("16/9");
  });

  it("站点 ratio=9/16 形态透传（去空白）", () => {
    expect(frameRatio("9/16")).toBe("9/16");
    expect(frameRatio(" 16 / 9 ")).toBe("16/9");
    expect(frameRatio("4/3")).toBe("4/3");
  });

  it("非法串回落 16/9（不把脏值写进 CSS）", () => {
    expect(frameRatio("abc")).toBe("16/9");
    expect(frameRatio("16/9/9")).toBe("16/9");
    expect(frameRatio("")).toBe("16/9");
  });
});
