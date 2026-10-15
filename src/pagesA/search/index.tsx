/**
 * 搜索页（M4 步 7；requirements §6.2 分包 A，对应站点 /search——design §9：
 * Pagefind UI 不做，端上双层检索页，皮按 margin 终端语言自绘）。
 *
 * 状态机：未输入（历史 chips + 提示）→ <2 字（titles 层实时）→ ≥2 字（双层，
 * terms 首次懒加载 376KB，水位 >90% 时第二层缺席照常出 titles 结果）→ 无结果空态。
 * 结果卡复用 PostCard（highlight 可选 prop，缺省渲染与旧版一致）；与 posts index
 * 按 slug 合出日期/阅读时长；拼音命中出「拼音」标识、仅正文命中出「正文」标识。
 * 查询即输即搜（真语料基准 <1ms，无需防抖）；确认或点结果时记历史。
 */
import { Input, Text, View } from "@tarojs/components";
import Taro, { usePageScroll } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";

import PageBackdrop from "@/components/deco/PageBackdrop";
import PostCard from "@/components/business/PostCard";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha } from "@/components/NavBar/NavBar";
import { useManifest } from "@/hooks/useManifest";
import { usePostsIndex } from "@/hooks/useCollection";
import { useRootClass } from "@/hooks/useTheme";
import { getSearchTerms, getSearchTitles } from "@/services/api/collections";
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  hydrateSearchHistory,
  subscribeSearchHistory,
 SEARCH_HISTORY_KEY } from "@/utils/searchHistory";
import { queryTokens, searchAll } from "@/utils/search";
import { readCache } from "@/services/cache";
import type {
  PostMeta,
  SearchTermsPayload,
  SearchTitlesPayload,
} from "@/types/api";
import "./index.scss";

export default function SearchPage() {
  const rootCls = useRootClass();
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const posts = usePostsIndex(buildId);
  const [query, setQuery] = useState("");
  const [titles, setTitles] = useState<SearchTitlesPayload | null>(null);
  const [terms, setTerms] = useState<SearchTermsPayload["terms"] | null>(null);
  const [termsState, setTermsState] = useState<
    "idle" | "loading" | "ready" | "unavailable"
  >("idle");
  const [history, setHistory] = useState<string[]>(getSearchHistory());
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  useEffect(() => {
    if (!buildId) return;
    getSearchTitles(buildId, setTitles);
  }, [buildId]);

  // 惰性水合历史（不占冷启动预算）
  useEffect(() => {
    void readCache(SEARCH_HISTORY_KEY).then(hydrateSearchHistory);
    return subscribeSearchHistory(setHistory);
  }, []);

  const norm = query.trim();
  const tokens = useMemo(() => queryTokens(norm), [norm]);
  /** 高亮词 = 完整短语优先（整词命中优先于 bigram 局部），tokens 兜底 */
  const hlTokens = useMemo(() => {
    if (!norm) return [];
    return [...new Set([norm.toLowerCase(), ...tokens])];
  }, [norm, tokens]);

  const results = useMemo(() => {
    if (!titles || !norm) return [];
    // terms 只在 ≥2 字且已就绪时参与（水位缺席 = titles 层兜底）
    return searchAll(norm, titles.docs, terms ?? undefined);
  }, [titles, terms, norm]);

  /** ≥2 字且 terms 还没就绪 ⇒ 触发首次懒加载（一次性 376KB，水位守卫在 service 层） */
  useEffect(() => {
    if (!buildId || norm.length < 2 || termsState !== "idle") return;
    setTermsState("loading");
    getSearchTerms(buildId, payload => {
      setTerms(payload.terms);
      setTermsState("ready");
    });
    // loadWithCache 高水位时静默不回调 ⇒ 用超时把状态落到「不可用」（titles 兜底）
    const timer = setTimeout(() => {
      setTermsState(s => (s === "loading" ? "unavailable" : s));
    }, 8000);
    return () => clearTimeout(timer);
  }, [buildId, norm, termsState]);

  const remember = (q: string) => {
    if (q.trim()) addSearchHistory(q);
  };

  const byslug = useMemo(() => {
    const m = new Map<string, PostMeta>();
    for (const p of posts ?? []) m.set(p.slug, p);
    return m;
  }, [posts]);

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title='搜索' alpha={alpha} />
      <View className='page-body search'>
        {/* 终端风输入行：~ /search $ */}
        <View className='search-box'>
          <Text className='search-prompt'>~ /search $</Text>
          <Input
            className='search-input'
            type='text'
            value={query}
            focus
            confirmType='search'
            placeholder='标题、标签或正文里的词'
            placeholderClass='search-placeholder'
            onInput={e => setQuery(e.detail.value)}
            onConfirm={() => remember(query)}
          />
          {query ? (
            <Text
              className='search-clear'
              onClick={() => setQuery("")}
            >
              ✕
            </Text>
          ) : null}
        </View>

        {/* 未输入：历史 + 提示 */}
        {!norm ? (
          <View className='search-idle'>
            {history.length > 0 ? (
              <View className='search-hist'>
                <View className='search-hist-head'>
                  <Text className='search-hist-title'>最近搜索</Text>
                  <Text
                    className='search-hist-clear'
                    onClick={() => clearSearchHistory()}
                  >
                    清空
                  </Text>
                </View>
                <View className='search-hist-chips'>
                  {history.map(h => (
                    <Text
                      key={h}
                      className='search-chip'
                      onClick={() => {
                        setQuery(h);
                        remember(h);
                      }}
                    >
                      {h}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}
            <View className='empty'>
              <Text className='empty-title'>~ /search --ready</Text>
              <Text className='empty-desc'>
                即输即搜：标题、标签、摘要、小标题、拼音与正文全文
              </Text>
            </View>
          </View>
        ) : results.length === 0 && titles !== null ? (
          /* 无结果空态（titles 已到达才判，加载中不误报） */
          <View className='empty'>
            <Text className='empty-title'>没有找到与「{norm}」相关的内容</Text>
            <Text className='empty-desc'>换个更短的关键词试试？</Text>
          </View>
        ) : (
          /* 结果列表（含加载中：titles 未到先不出列表） */
          titles !== null ? (
            <View className='search-results'>
              <View className='search-meta'>
                <Text className='search-meta-text'>
                  {results.length} 条结果
                  {termsState === "loading"
                    ? " · 正在载入全文索引…"
                    : termsState === "unavailable"
                      ? " · 全文层不可用（存储水位）"
                      : ""}
                </Text>
              </View>
              <View className='post-list'>
                {results.map(r => {
                  const meta = byslug.get(r.doc.slug);
                  return (
                    <View key={r.doc.slug}>
                      {(r.viaPinyin || r.viaBody) && (
                        <View className='search-badges'>
                          {r.viaPinyin ? (
                            <Text className='search-badge'>拼音</Text>
                          ) : null}
                          {r.viaBody ? (
                            <Text className='search-badge'>正文</Text>
                          ) : null}
                        </View>
                      )}
                      {meta ? (
                        <PostCard post={meta} highlightTokens={hlTokens} />
                      ) : (
                        /* posts index 未到/缺项的兜底行（罕见：同语料同源） */
                        <View
                          className='post-card card'
                          hoverClass='card-press'
                          hoverStayTime={80}
                          onClick={() => {
                            remember(query);
                            void Taro.navigateTo({
                              url: `/pagesA/post/detail?slug=${encodeURIComponent(r.doc.slug)}`,
                            });
                          }}
                        >
                          <Text className='post-card-title'>{r.doc.title}</Text>
                          <Text className='post-card-desc'>{r.doc.desc}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text className='search-loading'>加载中…</Text>
          )
        )}
      </View>
    </View>
  );
}
