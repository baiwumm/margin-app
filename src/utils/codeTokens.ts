/**
 * 代码块的渲染期纯计算（M2 步 9「千行代码不卡」）：相邻同色 token 合并 + 长块分片。
 * 不 import 框架，可在 node 下单测。
 *
 * 取证口径（离线脚本 E:/personal-project/mp-probe-work/code-step9/stats2.mjs 扫线上全 74 篇，
 * buildId 80863c1-abc0db29dcbc）：365 块 / 5066 行 / 17605 个 token ⇒ 合并后 16962 个 run，
 * **只省 3.65%** —— Shiki 给行内每个 span 都带色（全语料 `c` 缺失只有 143 个），相邻 token
 * 几乎总是异色。所以合并不是主杠杆，主杠杆是分片渲染：每行节点 = 行容器 + 行号 + 内容 + run
 * ≈ 3 + 3.35 = 6.35，1000 行就是 ≈6.4k 个节点。合并仍然做（零风险、顺手少 3.65% 节点，
 * 且把「同色相邻」这种肉眼无差别的情况收敛成一个文本节点，减少内联 style 数量）。
 */
import type { CodeToken } from "@/types/api";

/**
 * 一片行数。同时是「超过它才分片」的门槛：语料实测最长块 125 行（r254pvqf 的 css 块），
 * 取 120 ⇒ 现有 365 块里只有 1 块会被切成 120 + 5，已验收过的渲染面基本不动。
 */
export const CODE_CHUNK_ROWS = 120;

/** blocks.scss 的 `.code-line` 行盒 = font-size 26rpx × line-height 1.6（占位高度的首帧估算） */
export const CODE_ROW_RPX = 26 * 1.6;

/** token.c → 当前主题下的颜色；undefined = 与该行的默认字色同色（不必再包一层 Text） */
export type ColorOf = (c: number | undefined) => string | undefined;

/** 合并后的一行：连续同色文本 = 一个 run */
export interface CodeRun {
  v: string;
  /** 缺省 = 走父 Text 的 color（= --shiki-*-fg）；有值 = 需要内联覆盖 */
  color?: string;
}

/**
 * 相邻同色合并。三条不变式（单测逐条守）：
 *  ① 拼接等价：runs.map(r => r.v).join("") === line.map(t => t.v).join("")（复制/朗读都靠它）
 *  ② 不改输入：返回的都是新对象（同一份 tokens 可能被渲染两次）
 *  ③ 颜色等价：同色才并；`color` 为空时**整个键都不写**，因为 style={{color: undefined}}
 *     会被 Taro 序列成畸形声明 `color:;`，实测能把渲染层楔住（见 3efe61b 的踩坑记录）
 */
export function mergeRuns(line: readonly CodeToken[], colorOf: ColorOf): CodeRun[] {
  const out: CodeRun[] = [];
  for (const token of line) {
    const v = token?.v;
    if (typeof v !== "string" || v === "") continue;
    const color = colorOf(token.c);
    const last = out[out.length - 1];
    if (last && last.color === color) {
      last.v += v;
      continue;
    }
    out.push(color === undefined ? { v } : { v, color });
  }
  return out;
}

/** 是否分片渲染（不超过一片就整块渲，跟改动前一模一样） */
export function chunked(total: number, chunk = CODE_CHUNK_ROWS): boolean {
  return total > chunk;
}

/** 首片行数 */
export function firstRows(total: number, chunk = CODE_CHUNK_ROWS): number {
  return chunked(total, chunk) ? chunk : total;
}

/**
 * 追加一片之后的行数。钳到 total，且对 `shown` 做单调保护
 * （换文/重渲时 shown 可能大于新 total，返回 total 而不是回绕成 0）。
 */
export function nextRows(shown: number, total: number, chunk = CODE_CHUNK_ROWS): number {
  if (!chunked(total, chunk)) return total;
  return Math.min(total, Math.max(shown, firstRows(total, chunk)) + chunk);
}

/** 还没渲的行数（= 占位片要顶的高度对应的行数） */
export function hiddenRows(shown: number, total: number): number {
  return Math.max(0, total - shown);
}

/** rpx → px（750 设计稿）。占位高度用内联 px 而不是 rpx：避开 D31/D34 那类单位换算不确定点 */
export function rpxToPx(rpx: number, windowWidth: number): number {
  return (rpx * windowWidth) / 750;
}
