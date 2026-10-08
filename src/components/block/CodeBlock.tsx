/**
 * CodeBlock：构建期 Shiki 预高亮 tokens 上色（零运行时解析）。
 * - 配色表 = manifest 的 additive 字段 `codeColors`（`utils/codeColors.ts` 读取，
 *   由详情页注入 `setCodeColors`）；表为空（旧版本站点）时退回单色 = 默认字色；
 * - 文本由 tokens join 复原（不存纯文本），复制用 tokens 拼接、**点击时才算**
 *   （原来每次渲染都 join 全篇，千行块等于白算一遍 6w 字符）；
 * - 底色/默认字色取线上 `--shiki-*-bg` / `--shiki-*` 实测原值（margin .astro-code 同源）；
 * - 行号 + 语言角标 + file 徽章 + 横向滚动；换行偏好 codeWrap 仍未接（遗留项）；
 * - 长块分片渲染（M2 步 9）：超过 CODE_CHUNK_ROWS 行只先渲首片，滚近片尾再追加下一片；
 *   未渲行用等高清片占位（高度 = 未渲行数 × 1.6em，em 基数与行字号同源），
 *   所以文档总高从第一帧起就是对的 ⇒ detail 页的 TOC 偏移表与进度条分母不受影响。
 */
import { ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";
import Taro from "@tarojs/taro";

import { useTheme } from "@/hooks/useTheme";
import { SHIKI_SURFACE, tokenColor } from "@/utils/codeColors";
import {
  CODE_ROW_EM,
  firstRows,
  hiddenRows,
  mergeRuns,
  nextRows,
} from "@/utils/codeTokens";
import type { Block, CodeColors } from "@/types/api";

/** 配色表：详情页拿到 manifest 后注入（模块级，整份文档共享） */
let codeColors: CodeColors[] = [];

export function setCodeColors(colors: CodeColors[]): void {
  codeColors = colors;
}

/** 视口高：boundingClientRect 的 top 是视口相对值，用它判「片尾进视野了吗」 */
const VIEWPORT_H = (() => {
  try {
    return Taro.getSystemInfoSync().windowHeight;
  } catch {
    return 667; // 取不到就按 iPhone SE 档算
  }
})();

/* 预读带 = 一整屏。占位片是**空白**的，触发点又正好在「空白刚开始进视野」那一刻，
 * 带子给窄了就会看到用户先撞上一段空白、等 setData 落地才出字（追加一片实测要 100–300ms）
 * ⇒ 提前一屏把下一片备好。这里不碰 windowWidth：rpx→px 的量化由 CSS 负责（见 CODE_ROW_EM）。 */
const PRELOAD_PX = VIEWPORT_H;

/** 同页多个长块要各有自己的 id（观察器与探针都按 id 定点） */
let uid = 0;

export function CodeBlock({ block }: { block: Extract<Block, { t: "code" }> }) {
  const theme = useTheme();
  const surface = SHIKI_SURFACE[theme];
  /* 配色表快照：detail.tsx 的注入 effect 依赖 manifest.buildId，而正文 effect 也依赖
   * 同一个 buildId ⇒ 注入必然早于本组件首渲，读到的就是与正文同一 build 的那张表 */
  const table = codeColors;
  const total = block.tokens.length;
  const [ids] = useState(() => ({ tail: `code-t-${++uid}` }));
  const [shown, setShown] = useState(() => firstRows(total));

  // 换文复用同一实例（上下篇 redirectTo / 缓存先给再被网络结果覆盖）⇒ 回到首片
  useEffect(() => {
    setShown(firstRows(block.tokens.length));
  }, [block]);

  const hidden = hiddenRows(shown, total);

  /* 只合并「要渲出去的那一片」：1000 行块不会为了首帧先把 5600 个 token 走一遍。
   * 每行 run 仍然各包一层 Text —— 「默认色 run 直接退化成裸文本、省掉那层节点」这条路
   * 实测只值 0.8%（全语料 16962 个 run 里仅 143 个无色），却要在 Text 里混排字符串与元素，
   * 不值得为它引入新的渲染形态。 */
  const runs = useMemo(
    () =>
      block.tokens
        .slice(0, shown)
        .map(line =>
          mergeRuns(line, c =>
            tokenColor(c === undefined ? undefined : table[c], theme)
          )
        ),
    [block, shown, table, theme]
  );

  /* 每武装一次（= 每追加一片）用一次查询办两件事：
   *  ① 尾片节点查不到 = id 选择器在这套管线上不生效（base.wxml 是 `id="{{i.uid||i.sid}}"`，
   *     Taro runtime 在 setAttribute("id") 时把 uid 一起写掉 ⇒ 实测可用，但闸留着）。
   *     ⇒ 整块渲完。宁可一次多渲，不能滚到片尾看见一片空白。
   *  ② 片尾已经在（或已贴近）视口 ⇒ 立刻追加，不等观察器。这条是给 IO 兜底的：
   *     IO 要页面实例当 context，而 Taro 的 getCurrentInstance().page 是不是 wx 认的那个实例
   *     没有保证；位置探针与 IO 用的是同一套选择器，所以「探针查得到」至少说明节点找得到。
   *     实测 IO 有响（1000 行块滚到底补齐 ⇒ 判据 C 过），位置探针是第二道保险。
   *  占位片高度走 `hidden × 1.6em`（em 基数 = `.code-block-tail` 的 font-size 26rpx），
   *  所以这里不再需要量行高 —— 详见 utils/codeTokens.ts 的 CODE_ROW_EM。 */
  useEffect(() => {
    if (hidden <= 0) return;
    let alive = true;
    const probe = (triesLeft: number) => {
      const q = Taro.createSelectorQuery();
      q.select(`#${ids.tail}`).boundingClientRect();
      q.exec(res => {
        if (!alive) return;
        const tail = res?.[0] as { top?: number } | undefined;
        if (tail?.top === undefined) {
          if (triesLeft > 0) setTimeout(() => alive && probe(triesLeft - 1), 150);
          else setShown(total); // 三次都查不到 ⇒ 不玩分片了
          return;
        }
        if (tail.top < VIEWPORT_H + PRELOAD_PX) setShown(s => nextRows(s, total));
      });
    };
    Taro.nextTick(() => probe(2));
    /* 被观察节点就是占位片本身（真实高度、面积恒 > 0）；换成 1px 探针的话面积为 0、
     * intersectionRatio 无从计算，回调可能永远不来。每追加一次重建观察器 ——
     * 微信的 IO 只在**相交比例跨过阈值**时回调，占位片换了高度但依旧相交不会再触发，
     * 不重建就会停在「一直相交」不动。 */
    let observer: Taro.IntersectionObserver | null = null;
    try {
      const io = Taro.createIntersectionObserver(Taro.getCurrentInstance().page ?? {}, {
        thresholds: [0],
        // 挂上时若已经相交（首片比视口矮、或用户直接跳到了块中间），initialRatio=0 让它立刻回一次
        initialRatio: 0,
      });
      // observe() 返 void，所以句柄单独留着（cleanup 里要的是 disconnect）
      io.relativeToViewport({ bottom: PRELOAD_PX }).observe(`#${ids.tail}`, res => {
        if ((res?.intersectionRatio ?? 0) > 0) setShown(s => nextRows(s, total));
      });
      observer = io;
    } catch {
      observer = null;
    }
    if (!observer) setShown(total); // 连观察器都建不出来 ⇒ 整块渲完，内容不能少
    return () => {
      alive = false;
      try {
        observer?.disconnect();
      } catch {
        /* 已经断开了 */
      }
    };
  }, [hidden, ids, total]);

  const copyText = () =>
    block.tokens.map(line => line.map(tk => tk.v).join("")).join("\n");

  return (
    <View className='code-block'>
      <View className='code-block-head'>
        <View className='code-block-lang'>{block.lang ?? "text"}</View>
        {block.file ? (
          <View className='code-block-file'>{block.file}</View>
        ) : null}
        <View
          className='code-block-copy'
          hoverClass='row-press'
          hoverStayTime={80}
          onClick={() => void Taro.setClipboardData({ data: copyText() })}
        >
          复制
        </View>
      </View>
      <ScrollView
        className='code-block-body'
        scrollX
        style={{ backgroundColor: surface.bg }}
      >
        <View className='code-block-rows'>
          {runs.map((line, li) => (
            <View key={li} className='code-line'>
              <Text className='code-line-num'>{li + 1}</Text>
              <Text className='code-line-content' style={{ color: surface.fg }}>
                {line.length === 0 ? (
                  " "
                ) : (
                  line.map((run, ri) => {
                    /* 无颜色时整对象都不传：style={{color: undefined}} 会被序列化成
                     * 畸形声明 `color:;`，实测足以把渲染层楔住（DOM 查询全部超时） */
                    return (
                      <Text key={ri} style={run.color ? { color: run.color } : undefined}>
                        {run.v}
                      </Text>
                    );
                  })
                )}
              </Text>
            </View>
          ))}
          {hidden > 0 ? (
            <View
              id={ids.tail}
              className='code-block-tail'
              style={{ height: `${hidden * CODE_ROW_EM}em` }}
            />
          ) : null}
        </View>
      </ScrollView>
      <View className='code-block-lines'>{block.lines} 行</View>
    </View>
  );
}
