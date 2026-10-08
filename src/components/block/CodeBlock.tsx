/**
 * CodeBlock：构建期 Shiki 预高亮 tokens 上色（零运行时解析）。
 * - 配色表 = manifest 的 additive 字段 `codeColors`（`utils/codeColors.ts` 读取，
 *   由详情页注入 `setCodeColors`）；表为空（旧版本站点）时退回单色 = 默认字色；
 * - 文本由 tokens join 复原（不存纯文本），复制用 tokens 拼接、**点击时才算**
 *   （原来每次渲染都 join 全篇，千行块等于白算一遍 6w 字符）；
 * - 底色/默认字色取线上 `--shiki-*-bg` / `--shiki-*` 实测原值（margin .astro-code 同源）；
 * - 行号 + 语言角标 + file 徽章 + 横向滚动；换行偏好 codeWrap 仍未接（遗留项）；
 * - 长块分片渲染（M2 步 9）：超过 CODE_CHUNK_ROWS 行只先渲首片，尾部占位片顶住
 *   真实行高，滚近片尾再追加下一片。占位高度 = 未渲行数 × 实测行高，
 *   所以文档总高从第一帧起就是对的 ⇒ detail 页的 TOC 偏移表与进度条分母不受影响。
 */
import { ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";
import Taro from "@tarojs/taro";

import { useTheme } from "@/hooks/useTheme";
import { SHIKI_SURFACE, tokenColor } from "@/utils/codeColors";
import {
  CODE_ROW_RPX,
  firstRows,
  hiddenRows,
  mergeRuns,
  nextRows,
  rpxToPx,
} from "@/utils/codeTokens";
import type { Block, CodeColors } from "@/types/api";

/** 配色表：详情页拿到 manifest 后注入（模块级，整份文档共享） */
let codeColors: CodeColors[] = [];

export function setCodeColors(colors: CodeColors[]): void {
  codeColors = colors;
}

/** 视口尺寸：宽用来换 rpx→px，高用来判「片尾进视口了吗」（boundingClientRect 的 top 是视口相对值） */
const WINDOW = (() => {
  try {
    const { windowWidth, windowHeight } = Taro.getSystemInfoSync();
    return { w: windowWidth, h: windowHeight };
  } catch {
    return { w: 375, h: 667 }; // 取不到就按 iPhone SE 档算，误差只有几 px
  }
})();

/** 提前 3 行就开始追加下一片（滚到这儿还没看见片尾就不会有「等一下才出字」的感觉） */
const PRELOAD_PX = Math.round(rpxToPx(CODE_ROW_RPX * 3, WINDOW.w));

/** 同页多个长块要各有自己的 id（观察器与探针都按 id 定点） */
let uid = 0;

export function CodeBlock({ block }: { block: Extract<Block, { t: "code" }> }) {
  const theme = useTheme();
  const surface = SHIKI_SURFACE[theme];
  /* 配色表快照：detail.tsx 的注入 effect 依赖 manifest.buildId，而正文 effect 也依赖
   * 同一个 buildId ⇒ 注入必然早于本组件首渲，读到的就是与正文同一 build 的那张表 */
  const table = codeColors;
  const total = block.tokens.length;
  const [ids] = useState(() => ({ head: `code-h-${++uid}`, tail: `code-t-${++uid}` }));
  const [shown, setShown] = useState(() => firstRows(total));
  // 首帧先用算式值（blocks.scss 的 26rpx × 1.6），随后被实测行高替换（见下方探针）
  const [rowPx, setRowPx] = useState(() => rpxToPx(CODE_ROW_RPX, WINDOW.w));

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

  /* 每武装一次（= 每追加一片）用同一批查询把三件事办完：
   *  ① 首行真实行高 ⇒ 占位片按它算。算式 41.6rpx 若被内核取整，880 行能累计差出几百 px，
   *     那正是会把片尾之后的 TOC 锚点整体推歪的量级 ⇒ 以实测为准，算式只当首帧估算。
   *  ② 尾片节点查不到 = id 选择器在这套管线上不生效（base.wxml 是 `id="{{i.uid||i.sid}}"`，
   *     Taro runtime 在 setAttribute("id") 时把 uid 一起写掉 ⇒ 理论上可用，但端上无先例）
   *     ⇒ 整块渲完。宁可一次多渲，不能滚到片尾看见一片空白。
   *  ③ 片尾已经在（或已贴近）视口 ⇒ 立刻追加，不等观察器。这条是给 IO 兜底的：
   *     IO 要页面实例当 context，而 Taro 的 getCurrentInstance().page 是不是 wx 认的那个实例
   *     没有保证；位置探针与 IO 用的是同一套选择器，所以「探针查得到」至少说明节点找得到。
   *     IO 全程不回话时，判据 C（滚到块尾能否补齐 1000 行）会把它揪出来，届时改轮询。 */
  useEffect(() => {
    if (hidden <= 0) return;
    let alive = true;
    const probe = (mayRetry: boolean) => {
      const q = Taro.createSelectorQuery();
      q.select(`#${ids.head}`).boundingClientRect();
      q.select(`#${ids.tail}`).boundingClientRect();
      q.exec(res => {
        if (!alive) return;
        const head = res?.[0] as { height?: number } | undefined;
        const tail = res?.[1] as { top?: number } | undefined;
        if (tail?.top === undefined) {
          if (mayRetry) setTimeout(() => alive && probe(false), 150);
          else setShown(total); // 两次都查不到 ⇒ 不玩分片了
          return;
        }
        if (head?.height) setRowPx(head.height);
        if (tail.top < WINDOW.h + PRELOAD_PX) setShown(s => nextRows(s, total));
      });
    };
    Taro.nextTick(() => probe(true));
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
            <View
              key={li}
              id={li === 0 ? ids.head : undefined}
              className='code-line'
            >
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
              style={{ height: `${hidden * rowPx}px` }}
            />
          ) : null}
        </View>
      </ScrollView>
      <View className='code-block-lines'>{block.lines} 行</View>
    </View>
  );
}
