/**
 * 友链页（M4 步 3；requirements §6.2 分包 A，对应站点 /friends）。
 * 站点结构：hero（徽章 + glow Friends + N 个分组/N 位友人）+ FriendGroup
 * （组标题 + 友卡：头像/昵称/域名/描述）+ 大段互友准则 info 面板。
 * 端上：准则面板内容重且与「联系站长」重复 ⇒ 只做分组 + 友卡，偏差记档；
 * 点卡 = 复制网址（D8 个人主体无 web-view，外链一律剪贴板）。
 * 头像 = 远程图直穿（同 music 封面口径：不走 request 白名单、失败留空叠首字母）。
 */
import { Image, Text, View } from "@tarojs/components";
import Taro, { usePageScroll } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";

import PageBackdrop from "@/components/deco/PageBackdrop";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha } from "@/components/NavBar/NavBar";
import { getFriends } from "@/services/api/collections";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import type { FriendGroupPayload } from "@/types/api";
import "./index.scss";

export default function FriendsPage() {
  const rootCls = useRootClass();
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const [groups, setGroups] = useState<FriendGroupPayload[] | null>(null);
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  useEffect(() => {
    if (!buildId) return;
    // 既有 service 回调模式（同 getMoments/getGalleryDetail），不新增 hook
    getFriends(buildId, setGroups);
  }, [buildId]);

  const total = useMemo(
    () => (groups ?? []).reduce((s, g) => s + g.items.length, 0),
    [groups]
  );

  const copy = (url: string) => {
    void Taro.setClipboardData({ data: url });
    void Taro.showToast({ title: "已复制友链地址", icon: "none" });
  };

  const host = (url: string) =>
    url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title='友链' alpha={alpha} />
      <View className='page-body friends'>
        {groups === null ? (
          <Text className='friends-loading'>加载中…</Text>
        ) : (
          <>
            <View className='friends-stats'>
              <Text className='friends-stats-text'>{groups.length} 个分组</Text>
              <Text className='friends-stats-dot'>·</Text>
              <Text className='friends-stats-text'>{total} 位友人</Text>
            </View>

            {groups.map(g => (
              <View key={g.title} className='friends-group'>
                <View className='friends-group-head'>
                  <Text className='friends-group-title'>{g.title}</Text>
                  <View className='friends-group-line' />
                </View>
                <View className='friends-grid'>
                  {g.items.map(f => (
                    <View
                      key={f.url}
                      className='friend-card'
                      hoverClass='card-press'
                      hoverStayTime={80}
                      onClick={() => copy(f.url)}
                    >
                      <View className='friend-avatar'>
                        {f.avatar ? (
                          <Image
                            className='friend-avatar-img'
                            src={f.avatar}
                            mode='aspectFill'
                          />
                        ) : (
                          <Text className='friend-avatar-fallback'>
                            {f.name.slice(0, 1)}
                          </Text>
                        )}
                      </View>
                      <View className='friend-info'>
                        <Text className='friend-name'>{f.name}</Text>
                        <Text className='friend-host'>{host(f.url)}</Text>
                      </View>
                      <Text className='friend-desc'>{f.desc}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {total === 0 ? (
              <View className='empty'>
                <Text className='empty-title'>这里还什么都没有</Text>
                <Text className='empty-desc'>友链正在路上，敬请期待。</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
