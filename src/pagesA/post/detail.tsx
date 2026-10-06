/**
 * 文章详情页（M2；分包 A，requirements §6.2/§9）。
 * 数据接线不动：直调既有 getPostDetail（不新增 hook），cache-first 回调回填；
 * 正文走 BlockRenderer（分发机制不动），assets 经 BlockAssetsProvider 下发。
 * 本单元范围 = 进入路径 + 文章头 + 基础块渲染 + 上下篇 + 加载/失败态；
 * TOC/进度、字号行距与阅读模式、代码配色、图片预览、指令块视觉、分享在后续单元。
 */
import { Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import Taro, { usePageScroll, useRouter } from "@tarojs/taro";

import PageBackdrop from "@/components/deco/PageBackdrop";
import PostHeader from "@/components/Post/PostHeader";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha } from "@/components/NavBar/NavBar";
import { BlockAssetsProvider } from "@/components/block/BlockImage";
import { BlockRenderer } from "@/components/block/BlockRenderer";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import { getPostDetail } from "@/services/api/collections";
import { postDetailUrl } from "@/utils/routes";
import type { PostDetail, PostMeta } from "@/types/api";
import "./detail.scss";

export default function PostDetailPage() {
  const rootCls = useRootClass();
  const { params } = useRouter();
  const slug = params.slug ?? "";
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // 导航滚动渐显（0.05 档量化，与 tab 页同一套）
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  useEffect(() => {
    if (!buildId || !slug) return;
    let alive = true;
    let got = false;
    setDetail(null);
    setFailed(false);
    void getPostDetail(buildId, slug, d => {
      if (!alive) return;
      got = true;
      setDetail(d);
    });
    // loadWithCache 返回 void 且吞掉所有网络错误（collections.ts:46-48/65-80），
    // 视图层能表达的只有「超时仍无数据」，给不出 HTTP 原因
    const timer = setTimeout(() => {
      if (alive && !got) setFailed(true);
    }, 3000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [buildId, slug, reloadKey]);

  const open = (next: string) => {
    // 上下篇用 redirectTo 换页：连续翻文不会把页面栈堆到 10 层上限，返回仍回来源页
    void Taro.redirectTo({ url: postDetailUrl(next) });
  };

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title={detail?.meta.title ?? ""} alpha={alpha} />
      <View className='page-body detail'>
        {detail ? (
          <>
            <PostHeader meta={detail.meta} />
            <BlockAssetsProvider assets={detail.assets}>
              <BlockRenderer blocks={detail.blocks} />
            </BlockAssetsProvider>
            <View className='post-nav'>
              {detail.prev ? (
                <PostNavItem post={detail.prev} label='上一篇' onClick={open} />
              ) : (
                <View />
              )}
              {detail.next ? (
                <PostNavItem
                  post={detail.next}
                  label='下一篇'
                  align='right'
                  onClick={open}
                />
              ) : (
                <View />
              )}
            </View>
          </>
        ) : failed ? (
          <View className='empty'>
            <Text className='empty-title'>这篇没能加载出来</Text>
            <Text className='empty-desc'>网络不通或正文还没同步，可以重试一下。</Text>
            <View
              className='detail-retry'
              hoverClass='row-press'
              hoverStayTime={80}
              onClick={() => setReloadKey(k => k + 1)}
            >
              重试
            </View>
          </View>
        ) : (
          <Text className='detail-loading'>加载中…</Text>
        )}
      </View>
    </View>
  );
}

function PostNavItem({
  post,
  label,
  align,
  onClick,
}: {
  post: PostMeta;
  label: string;
  align?: "right";
  onClick: (slug: string) => void;
}) {
  return (
    <View
      className={`post-nav-item ${align === "right" ? "post-nav-right" : ""}`}
      hoverClass='card-press'
      hoverStayTime={80}
      onClick={() => onClick(post.slug)}
    >
      <Text className='post-nav-label'>{label}</Text>
      <Text className='post-nav-title'>{post.title}</Text>
    </View>
  );
}
