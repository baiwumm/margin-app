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
  chunked,
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

/** 750 稿 → 设备 px 的基准（占位片高度用；取不到按 375 算，误差只有几 px） */
const WINDOW_W = (() => {
  try {
    return Taro.getSystemInfoSync().windowWidth;
  } catch {
    return 375;
  }
})();

/** 提前 3 行就开始追加下一片（滚到这儿还没看见片尾就不会有「等一下才出字」的感觉） */
const PRELOAD_PX = Math.round(rpxToPx(CODE_ROW_RPX * 3, WINDOW_W));

/** 同页多个长块要各有自己的 id（观察器与探针都按 id 定点） */
let uid = 0;

export function CodeBlock({ block }: { block: Extract<Block, { t: "code" }> }) {
  const theme = useTheme();
  const surface = SHIKI_SURFACE[theme];
  /* 配色表快照：detail.tsx 的注入 effect 依赖 manifest.buildId，而正文 effect 也依赖
   * 同一个 buildId ⇒ 注入必然早于本组件首渲，读到的就是与正文同一 build 的那张表 */
  const table = codeColors;
  const total = block.tokens.length;
  const isChunked = chunked(total);
  const [ids] = useState(() => ({ head: `code-h-${++uid}`, tail: `code-t-${++uid}` }));
  const [shown, setShown] = useState(() => firstRows(total));
  // 首帧先用算式值（blocks.scss 的 26rpx × 1.6），随后被实测行高替换（见下方探针）
  const [rowPx, setRowPx] = useState(() => rpxToPx(CODE_ROW_RPX, WINDOW_W));

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

  /* 一次查询办两件事：
   *  ① 首行真实行高 ⇒ 占位片按它算（算式 41.6rpx 若被内核取整，880 行能累计差出几百 px，
   *     会让片尾之后的 TOC 锚点整体偏掉，所以以实测为准、算式只当首帧估算）
   *  ② 尾片节点查得到吗 ⇒ 查不到就是 id 选择器在这套渲染管线上不生效，
   *     那分片/观察器都无从谈起，直接整块渲完。宁可一次多渲，不能滚到片尾看见一片空白。 */
  useEffect(() => {
    if (!isChunked) return;
    let alive = true;
    const probe = (mayRetry: boolean) => {
      const q = Taro.createSelectorQuery();
      q.select(`#${ids.head}`).boundingClientRect();
      q.select(`#${ids.tail}`).boundingClientRect();
      q.exec(res => {
        if (!alive) return;
        const head = res?.[0] as { height?: number } | undefined;
        const tail = res?.[1] as { height?: number } | undefined;
        if (head?.height) setRowPx(head.height);
        if (tail) return;
        if (mayRetry) setTimeout(() => alive && probe(false), 150);
        else setShown(total);
      });
    };
    Taro.nextTick(() => probe(true));
    return () => {
      alive = false;
    };
  }, [isChunked, ids, total]);

  /* 追加下一片：观察占位片是否进入（或即将进入）视口。
   * 每追加一次就重建观察器 —— 微信的 IntersectionObserver 只在**相交比例跨过阈值**时回调，
   * 占位片换高度但依旧相交时不会再来第二次，不重建就会停在「一直相交」不动。
   * 占位片本身当被观察节点（真实高度、面积恒 > 0）；换成 1px 探针的话面积为 0，
   * intersectionRatio 无从计算，回调可能永远不来。 */
  useEffect(() => {
    if (hidden <= 0) return;
    let observer: Taro.IntersectionObserver | null = null;
    try {
      observer = Taro.createIntersectionObserver(Taro.getCurrentInstance().page ?? {}, {
        thresholds: [0],
        // 挂上时若已经相交（首片比视口矮、或用户直接跳到了块中间），
        // initialRatio=0 保证这一臂立刻回调一次，不必等「跨过阈值」
        initialRatio: 0,
      });
    } catch {
      observer = null;
    }
    if (!observer) {
      setShown(total); // 建不出观察器 ⇒ 整块渲完，内容不能少
      return;
    }
    observer
      .relativeToViewport({ bottom: PRELOAD_PX })
      .observe(`#${ids.tail}`, res => {
        if ((res?.intersectionRatio ?? 0) > 0) setShown(s => nextRows(s, total));
      });
    return () => {
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
