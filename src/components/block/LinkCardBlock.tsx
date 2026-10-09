/**
 * linkcard / video 共用的一张引用卡。
 * 视觉溯源 margin typography.css `.link-card*`：padding 1rem 1.25rem、border
 * border/30、radius 1rem、bg muted/12、缩略图 4rem（窄屏 3.25rem）radius .75rem、
 * 标题 1rem/600/1.45 两行截断、描述 .85rem/1.5 两行截断、域名行 .7rem 等宽大写加宽。
 *
 * 行为口径（D8 个人主体、无 web-view、一期只读）：
 *  · 站内 `/posts/<slug>/` → navigateTo 详情页；
 *  · 站外链接与 B 站视频（只有 BV 号）→ 复制到剪贴板，不内嵌不外跳；
 *  · 契约 :173 明确「非 B 站且无 src 的 video 降级 linkcard」，这里同样走复制。
 */
import { Image, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { currentBase } from "@/services/api/manifest";
import { postDetailUrl } from "@/utils/routes";
import type { Block } from "@/types/api";

type CardData = {
  title: string;
  desc?: string;
  href: string;
  icon?: string;
  /** 卡片右下角的动作文案 */
  action: string;
};

function postSlug(href: string): string | null {
  const m = /^\/posts\/([^/]+)/.exec(href);
  return m ? decodeURIComponent(m[1]) : null;
}

function hostname(href: string): string {
  const m = /^https?:\/\/([^/]+)/.exec(href);
  return m ? m[1] : href;
}

export default function LinkCardBlock({ data }: { data: CardData }) {
  const slug = postSlug(data.href);

  const onTap = () => {
    if (slug) {
      void Taro.navigateTo({ url: postDetailUrl(slug) });
      return;
    }
    void Taro.showToast({ title: `已复制 ${data.action === "打开链接" ? "链接" : "视频地址"}`, icon: "none" });
    void Taro.setClipboardData({ data: data.href });
  };

  return (
    <View className='link-card' hoverClass='link-card-press' hoverStayTime={80} onClick={onTap}>
      {data.icon ? (
        <View className='link-card-thumb'>
          <Image
            className='link-card-thumb-img'
            src={
              data.icon.startsWith("http")
                ? data.icon
                : currentBase() + data.icon
            }
            mode='aspectFill'
          />
        </View>
      ) : null}
      <View className='link-card-body'>
        <Text className='link-card-title'>{data.title}</Text>
        {data.desc ? <Text className='link-card-desc'>{data.desc}</Text> : null}
        {!slug ? <Text className='link-card-domain'>{hostname(data.href)}</Text> : null}
      </View>
      <Text className='link-card-action'>{data.action}</Text>
    </View>
  );
}

/** VideoCard 只消费 id / src / title 三个字段 ⇒ 入参收成结构子集，
 *  瞬间卡的 video（与正文 video 块同形、只少一个 t 判别位）可直接复用，不必造二层适配 */
export type VideoLike = { id?: string; src?: string; title?: string };

export function VideoCard({ block }: { block: VideoLike }) {
  const bv = block.id;
  return (
    <LinkCardBlock
      data={{
        title: block.title || (bv ? `B 站视频 ${bv}` : "视频"),
        href: bv ? `https://www.bilibili.com/video/${bv}` : (block.src ?? ""),
        action: "复制",
      }}
    />
  );
}

export function LinkCardOf({ block }: { block: Extract<Block, { t: "linkcard" }> }) {
  return (
    <LinkCardBlock
      data={{
        title: block.title,
        desc: block.desc,
        icon: block.icon,
        href: block.href,
        action: postSlug(block.href) ? "阅读" : "打开",
      }}
    />
  );
}
