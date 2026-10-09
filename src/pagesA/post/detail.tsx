/**
 * 文章详情页（M2；分包 A，requirements §6.2/§9）。
 * 数据接线不动：直调既有 getPostDetail（不新增 hook），cache-first 回调回填；
 * 正文走 BlockRenderer（分发机制不动），assets 经 BlockAssetsProvider 下发。
 * 本单元范围 = 进入路径 + 文章头 + 基础块渲染 + 上下篇 + 加载/失败态；
 * TOC/进度、字号行距与阅读模式、代码配色、图片预览、指令块视觉、分享在后续单元。
 */
import { Text, View } from "@tarojs/components";
import { useCallback, useEffect, useRef, useState } from "react";
import Taro, {
  usePageScroll,
  useRouter,
  useShareAppMessage,
  useShareTimeline,
} from "@tarojs/taro";

import PageBackdrop from "@/components/deco/PageBackdrop";
import BackToTop from "@/components/deco/BackToTop";
import PostHeader from "@/components/Post/PostHeader";
import PostToc from "@/components/Post/PostToc";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha, STATUS_BAR } from "@/components/NavBar/NavBar";
import { BlockAssetsProvider } from "@/components/block/BlockImage";
import { BlockRenderer } from "@/components/block/BlockRenderer";
import { setCodeColors } from "@/components/block/CodeBlock";
import { readCodeColors } from "@/utils/codeColors";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import { getPostDetail } from "@/services/api/collections";
import { perfLog } from "@/utils/perf";
import { perfDumpEntries } from "@/utils/perfBoot";
import { postDetailUrl } from "@/utils/routes";
import { getPrefs, prefsClass, subscribePrefs } from "@/utils/prefs";
import type { PostDetail, PostMeta } from "@/types/api";
import "./detail.scss";

/** 视口高（滚动进度分母与「返回顶部」浮现阈值用） */
const VIEWPORT_H = (() => {
  try {
    return Taro.getWindowInfo().windowHeight;
  } catch {
    return 667;
  }
})();

/**
 * 锚点线：顶栏底沿（状态栏 + 88rpx≈44px）+ 12px 呼吸位。margin 那边是写死的
 * HEADER_OFFSET = 104px（sticky header 6rem + 余量），端上按自己的顶栏几何算等价值。
 */
const SPY_LINE = STATUS_BAR + 44 + 12;

export default function PostDetailPage() {
  const rootCls = useRootClass();
  const { params } = useRouter();
  const slug = params.slug ?? "";
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // 字号/行距偏好（M2 步 3 机制）：订阅即时生效，落到 root 的 .fs-*/.lead-* 类
  const [prefs, setPrefsState] = useState(getPrefs);
  useEffect(() => subscribePrefs(setPrefsState), []);
  /* 配色表与正文必须同源：codeColors 的索引顺序 = 同一个 buildId 那批正文的构建期累积顺序，
   * 而 buildId 正是下面 getPostDetail 的缓存键成分，所以注入点就跟着 manifest 走 */
  useEffect(() => {
    setCodeColors(readCodeColors(manifest));
  }, [manifest]);
  // 顶栏渐显 / 阅读进度 / TOC 命中 / 返回顶部浮现
  const [alpha, setAlpha] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showBtt, setShowBtt] = useState(false);
  const scrollTopRef = useRef(0);
  const arriveRef = useRef(0);
  /** 各标题的文档绝对偏移（top）与对应 toc id —— 端上读不到 JSX 的 id 属性
   * （boundingClientRect 回的 id 是 Taro 内部节点号），而 toc 与 .block-h 同为
   * 文档序、同为 depth 2|3|4，故按序号配对，不需要 id 查询 */
  const headsRef = useRef<{ id: string; top: number }[]>([]);
  const rangeRef = useRef(1);

  const measure = () => {
    const q = Taro.createSelectorQuery();
    q.selectAll(".block-h").boundingClientRect();
    q.select(".page").boundingClientRect();
    q.exec(res => {
      const rects = (res?.[0] ?? []) as Array<{ top: number }>;
      const pageBox = res?.[1] as { height?: number } | undefined;
      const y = scrollTopRef.current;
      const toc = detail?.toc ?? [];
      headsRef.current = rects.map((r, i) => ({
        id: toc[i]?.id ?? "",
        top: r.top + y,
      }));
      rangeRef.current = Math.max(1, (pageBox?.height ?? 0) - VIEWPORT_H);
    });
  };

  // 图片是 widthFix（高度要等加载完才知道），故渲染后补测一次，避免锚点偏移整体偏小
  useEffect(() => {
    if (!detail) return;
    measure();
    const t = setTimeout(measure, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  /* 性能基线打点（M3 前置，D21 同族，M5 提审前随 utils/perf 一起拆）：
   * 「可渲」= 逻辑层已把整棵正文 vnode 交给渲染层的时刻，「首屏落地」= 渲染层把这一轮
   * setData 用完、nextTick 回调跑起来的时刻 —— 后者才是用户看见字的点，两者之差就是
   * 渲染层耗时，也是 1000 行形态唯一会放大的那一段。
   * 同一时刻顺手抓一次官方条目：FCP/LCP 按 webview（= 按页）记，落到这里就能和上面两条
   * 自己的打点对到同一条时间轴上。 */
  useEffect(() => {
    if (!detail) return;
    perfLog("详情页可渲");
    Taro.nextTick(() => {
      perfLog("详情页首屏落地");
      perfDumpEntries("详情页", true);
    });
  }, [detail]);

  usePageScroll(p => {
    const y = p.scrollTop;
    scrollTopRef.current = y;
    setAlpha(navAlpha(y));
    /* 进度只量化到万分之一：原来这里 round 到 1%、SubNavBar 那层又 round 到整数百分比，
     * 双重下取整 ⇒ 整条进度只有 101 档，390px 屏上每档 3.9px ⇒ 肉眼就是「一点一点跳」。
     * 留万分之一档是为了值没真变时 React 能 bail out（同 navAlpha 的 1/20 量化思路）。 */
    setProgress(Math.round((y / rangeRef.current) * 10000) / 10000);
    setShowBtt(y > VIEWPORT_H);
    const hs = headsRef.current;
    if (hs.length === 0) return;
    // 二分：最后一个「顶边已越过锚点线」的标题即当前小节（margin spy 同规则）
    const line = y + SPY_LINE;
    let lo = 0;
    let hi = hs.length - 1;
    let idx = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (hs[mid].top <= line) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    setActiveId(hs[idx].id || null);
  });

  /* useCallback 是给 memo(PostToc) 用的：不稳住这个引用，页面每次重渲染都会造一个新函数，
   * TOC 的 memo 立刻失效。函数体只读 ref 与模块常量，空依赖是安全的。 */
  const jumpTo = useCallback((id: string) => {
    const hit = headsRef.current.find(h => h.id === id);
    if (!hit) return;
    void Taro.pageScrollTo({ scrollTop: Math.max(0, hit.top - SPY_LINE), duration: 200 });
  }, []);

  useEffect(() => {
    if (!buildId || !slug) return;
    let alive = true;
    let got = false;
    setDetail(null);
    setFailed(false);
    void getPostDetail(buildId, slug, d => {
      if (!alive) return;
      got = true;
      arriveRef.current += 1;
      // #1 = 缓存命中或首次网络到达；出现 #2 说明缓存先给、网络后覆盖（M2 的 cache-first 形态）
      perfLog(`详情页数据到达 #${arriveRef.current}`);
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

  /* ── 分享（M2 步 10）────────────────────────────────────────────
   * 卡图这一版**不传 imageUrl** ⇒ 微信用「当前页截图」当封面。原因实测过：站点 OG 图是
   * 1200×630，而转发位显示比例 5:4、朋友圈位 1:1，居中裁完只剩 65.7% / 52.5% 的宽度，
   * 标题首字与 `baiwumm.com` 徽章都会被切掉（预检图 mp-probe-work/code-step9/evidence/og-crops.jpg）。
   * 回调里只读 ref：Taro 只在页面实例上挂一次回调，直接闭包 detail 会拿到首帧的 null。 */
  const shareRef = useRef<{ title: string; path: string; query: string }>({
    title: "",
    path: postDetailUrl(slug),
    query: `slug=${encodeURIComponent(slug)}`,
  });
  useEffect(() => {
    shareRef.current = {
      title: detail?.meta.title ?? "",
      path: postDetailUrl(slug),
      query: `slug=${encodeURIComponent(slug)}`,
    };
  }, [detail, slug]);
  useShareAppMessage(() => {
    const s = shareRef.current;
    /* title 空串会被当成「无标题」，宁可不传让微信回落小程序名 */
    return s.title ? { title: s.title, path: s.path } : { path: s.path };
  });
  useShareTimeline(() => {
    const s = shareRef.current;
    return s.title ? { title: s.title, query: s.query } : { query: s.query };
  });

  return (
    <View
      className={`page page-bg ${rootCls} ${prefsClass(prefs)} ${
        prefs.readMode ? "read-mode" : ""
      }`}
    >
      <PageBackdrop />
      <SubNavBar title={detail?.meta.title ?? ""} alpha={alpha} progress={progress} />
      <View className='page-body detail'>
        {detail ? (
          <>
            <PostHeader meta={detail.meta} />
            {detail.toc.length > 0 ? (
              <PostToc items={detail.toc} activeId={activeId} onJump={jumpTo} />
            ) : null}
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
      <BackToTop
        visible={showBtt}
        onTop={() => void Taro.pageScrollTo({ scrollTop: 0, duration: 200 })}
      />
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
