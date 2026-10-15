/**
 * 标签页（design.md §3 标签屏，margin tags/index.astro 同构）：
 * aurora hero（~/tags $ ls -la 徽章 + glow 标题 Tags + 斜体描述 + 统计
 * hero-badge ×2）+ tag 卡双列（surface-2 底 + fg 6% 描边 + hash 图标 accent
 * + 标签名 + 计数 + 强度进度条；按压 = accent 30% 描边 + accent 4% 底）。
 * 不用彩色块（D14：margin 标签卡 = 细边框 + accent 交互，契约三色字段不消费）。
 */
import { View, Text } from "@tarojs/components";
import { useMemo, useState } from "react";
import Taro, { useDidShow, usePageScroll } from "@tarojs/taro";

import NavBar, { navAlpha } from "@/components/NavBar/NavBar";
import PageBackdrop from "@/components/deco/PageBackdrop";
import AuroraHero from "@/components/deco/AuroraHero";
import { useTags } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import { setSelectedTab } from "@/custom-tab-bar/store";
import { tagDetailUrl } from "@/utils/routes";
import "./tags.scss";

export default function Tags() {
  const rootCls = useRootClass();
  // 同步 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(1));
  const { manifest } = useManifest();
  const tags = useTags(manifest?.buildId ?? null);
  // 导航滚动渐显（0.05 档量化，控制重渲染频率）
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  const maxCount = useMemo(
    () => Math.max(1, ...(tags ?? []).map(t => t.count)),
    [tags]
  );

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <NavBar alpha={alpha} />
      <View className='page-body tags'>
        <AuroraHero
          path='/tags'
          trail='ls -la'
          title='Tags'
          desc='浏览全部话题，每个标签都是一个内容宇宙。'
          badges={[`${tags?.length ?? 0} 个标签`]}
        />
        <View className='tag-grid'>
          {(tags ?? []).map((tag, i) => (
            <View
              key={tag.slug}
              className='tag-card'
              hoverClass='tag-card-press'
              hoverStayTime={80}
              onClick={() => void Taro.navigateTo({ url: tagDetailUrl(tag.name) })}
              style={{
                animation: "rise-in 0.4s ease both",
                animationDelay: `${Math.min(i * 50, 300)}ms`,
              }}
            >
              <View className='tag-card-content'>
                <Text className='tag-card-hash'>#</Text>
                <Text className='tag-card-name'>{tag.name}</Text>
                <View className='tag-card-count'>
                  <Text className='tag-card-count-number'>{tag.count}</Text>
                  <Text className='tag-card-count-label'>篇文章</Text>
                </View>
              </View>
              <View className='tag-card-bar'>
                <View
                  className='tag-card-bar-fill'
                  style={{ width: `${Math.max((tag.count / maxCount) * 100, 8)}%` }}
                />
              </View>
            </View>
          ))}
        </View>
        {tags && tags.length === 0 ? (
          <View className='empty'>
            <Text className='empty-title'>这里还什么都没有</Text>
            <Text className='empty-desc'>标签正在路上，敬请期待。</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
