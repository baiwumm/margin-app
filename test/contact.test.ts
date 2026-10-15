import { describe, expect, it } from "vitest";

import {
  contactEmail,
  contactGithub,
  contactItems,
  friendApplicationTemplate,
} from "@/utils/contact";
import type { SitePayload } from "@/types/api";

const SITE: SitePayload = {
  title: "Margin",
  desc: "边白 · 记录代码、思考与灵感",
  author: "白雾茫茫丶",
  avatar: "https://www.baiwumm.com/avatar.png",
  socials: [
    { name: "GitHub", url: "https://github.com/baiwumm" },
    { name: "Mail", url: "mailto:me@baiwumm.com" },
  ],
  nav: [],
  hero: "",
  announcement: null,
  theme: { accent: "#1158d1", accentDark: "#008fec" },
};
const BASE = "https://www.baiwumm.com";

describe("contactEmail / contactGithub（从 site.json.socials 取，无硬编码）", () => {
  it("邮箱剥 mailto: 前缀；GitHub 原样", () => {
    expect(contactEmail(SITE)).toBe("me@baiwumm.com");
    expect(contactGithub(SITE)).toBe("https://github.com/baiwumm");
  });

  it("socials 缺项 ⇒ undefined（页面按存在性渲染）", () => {
    const noMail = { ...SITE, socials: [{ name: "GitHub", url: "https://github.com/baiwumm" }] };
    expect(contactEmail(noMail)).toBeUndefined();
    expect(contactGithub({ ...SITE, socials: [] })).toBeUndefined();
    expect(contactEmail(null)).toBeUndefined();
  });
});

describe("contactItems（联系行）", () => {
  it("邮箱展示原值、复制文本剥前缀；GitHub 展示去协议", () => {
    const items = contactItems(SITE);
    expect(items).toEqual([
      { label: "邮箱", value: "me@baiwumm.com", copyText: "me@baiwumm.com" },
      { label: "GitHub", value: "github.com/baiwumm", copyText: "https://github.com/baiwumm" },
    ]);
  });
});

describe("friendApplicationTemplate（margin friends.astro applicationText 同构）", () => {
  it("四行站点信息 + 空行 + 申请语；头像跟随站点口径用 logo.png；base 尾斜杠归一", () => {
    expect(friendApplicationTemplate(SITE, BASE)).toBe(
      [
        "name: Margin",
        "description: 边白 · 记录代码、思考与灵感",
        "url: https://www.baiwumm.com",
        "avatar: https://www.baiwumm.com/logo.png",
        "",
        "您好博主，本站已添加贵站友链，想申请与贵站互链。以上是本站信息，麻烦审核一下，感谢！",
      ].join("\n")
    );
    // 尾斜杠不产生双斜杠
    expect(friendApplicationTemplate(SITE, "https://www.baiwumm.com/")).toContain(
      "url: https://www.baiwumm.com\n"
    );
  });
});
