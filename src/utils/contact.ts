/**
 * 联系站长页数据（M4 步 10；端上特有页——margin 无 /contact，承接站点
 * friends.astro 的站长信息行与友链申请模板，D61 记档的「承接面」就此收口）。
 * D8 口径：个人主体无 web-view/邮件客户端 ⇒ 一切联系动作 = 复制到剪贴板。
 * 纯函数、零 Taro 依赖，可单测。数据全部来自 site.json 契约 + currentBase()，
 * 无硬编码站点信息。
 */
import type { SitePayload } from "@/types/api";

export interface ContactItem {
  /** 行标题（邮箱 / GitHub / 站点） */
  label: string;
  /** 展示文本 */
  value: string;
  /** 点击复制的文本（邮箱剥掉 mailto:） */
  copyText: string;
}

/** 从 site.json.socials 取邮箱（Mail 项，mailto: 前缀剥掉）；缺席返回 undefined */
export function contactEmail(site: SitePayload | null): string | undefined {
  const mail = site?.socials?.find(s => /^mailto:/i.test(s.url));
  return mail ? mail.url.replace(/^mailto:/i, "") : undefined;
}

/** 从 site.json.socials 取 GitHub 主页（GitHub 项） */
export function contactGithub(site: SitePayload | null): string | undefined {
  return site?.socials?.find(s => s.name.toLowerCase() === "github")?.url;
}

/** 联系行（邮箱优先；GitHub 兜底存在才出） */
export function contactItems(site: SitePayload | null): ContactItem[] {
  const items: ContactItem[] = [];
  const email = contactEmail(site);
  if (email) items.push({ label: "邮箱", value: email, copyText: email });
  const github = contactGithub(site);
  if (github) {
    items.push({
      label: "GitHub",
      value: github.replace(/^https?:\/\//, ""),
      copyText: github,
    });
  }
  return items;
}

/**
 * 友链申请模板（margin friends.astro applicationText 同构）：
 * name/description/url/avatar 四行 + 空行 + 申请语；头像跟随站点口径用 logo.png。
 */
export function friendApplicationTemplate(site: SitePayload, base: string): string {
  const b = base.replace(/\/$/, "");
  return [
    `name: ${site.title}`,
    `description: ${site.desc}`,
    `url: ${b}`,
    `avatar: ${b}/logo.png`,
    "",
    "您好博主，本站已添加贵站友链，想申请与贵站互链。以上是本站信息，麻烦审核一下，感谢！",
  ].join("\n");
}
