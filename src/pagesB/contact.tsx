/**
 * 联系站长（M4 步 10；requirements §6.2 分包 B「contact（复制到剪贴板）」，
 * 端上特有页——margin 无 /contact，承接 D61 记档的友链申请承接面）。
 * D8 口径：个人主体无 web-view/邮件客户端 ⇒ 全部动作 = 复制到剪贴板 + toast。
 * 数据全部来自 site.json + currentBase()（utils/contact.ts 纯函数，无硬编码）。
 * 结构：联系行（邮箱/GitHub，点击复制）+ 友链申请说明 + 模板卡（点击复制整段，
 * margin friends.astro applicationText 同构）。
 */
import { Text, View } from "@tarojs/components";
import Taro, { usePageScroll } from "@tarojs/taro";
import { useMemo, useState } from "react";

import PageBackdrop from "@/components/deco/PageBackdrop";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha } from "@/components/NavBar/NavBar";
import { useSiteData } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import { currentBase } from "@/services/api/manifest";
import { contactItems, friendApplicationTemplate } from "@/utils/contact";
import "./contact.scss";

export default function ContactPage() {
  const rootCls = useRootClass();
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const site = useSiteData(buildId);
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  const items = useMemo(() => contactItems(site), [site]);
  const template = useMemo(
    () => (site ? friendApplicationTemplate(site, currentBase()) : ""),
    [site]
  );

  const copy = (text: string, toast: string) => {
    void Taro.setClipboardData({ data: text });
    void Taro.showToast({ title: toast, icon: "none" });
  };

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title='联系站长' alpha={alpha} />
      <View className='page-body contact'>
        <View className='contact-lead'>
          <Text className='contact-lead-text'>
            内容授权、勘误、合作或友链申请，欢迎通过以下方式找到我。
          </Text>
        </View>

        {items.length > 0 ? (
          <View className='contact-rows'>
            {items.map(item => (
              <View
                key={item.label}
                className='contact-row'
                hoverClass='row-press'
                hoverStayTime={80}
                onClick={() => copy(item.copyText, `已复制${item.label}`)}
              >
                <Text className='contact-row-label'>{item.label}</Text>
                <Text className='contact-row-value'>{item.value}</Text>
                <Text className='contact-row-hint'>点击复制</Text>
              </View>
            ))}
          </View>
        ) : null}

        {template ? (
          <>
            <View className='contact-friend-head'>
              <Text className='contact-friend-title'>友链申请</Text>
              <Text className='contact-friend-hint'>
                已添加本站为友链后，复制以下信息通过邮箱发给我即可。
              </Text>
            </View>
            <View
              className='contact-template'
              hoverClass='row-press'
              hoverStayTime={80}
              onClick={() => copy(template, "已复制友链申请信息")}
            >
              {template.split("\n").map((line, i) => (
                <Text key={i} className='contact-template-line'>
                  {line}
                </Text>
              ))}
              <Text className='contact-template-copy'>点击复制整段</Text>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}
