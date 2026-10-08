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

/**
 * 占位片高度的单位口径：**一个未渲行 = 1.6em**（= blocks.scss 里 `.code-line-*` 的
 * line-height，em 基数 = 行字号 26rpx，写在 `.code-block-tail` 的 font-size 上）。
 * 为什么不在 JS 里算 px：模拟器实测行盒 20.796875px，而 `26rpx × 1.6` 按 windowWidth=390
 * 换算是 21.632px —— 内核把 26rpx 字号量化成 ~13px 再乘 1.6 ⇒ 算式系统性高 3.9%，
 * 880 行未渲就多顶 735px，正是会把片尾之后 TOC 锚点整体推歪的量级。
 * 走 em 则占位与行盒**同源同量化**：不猜 windowWidth、不查节点、不等实测回填。
 */
export const CODE_ROW_EM = 1.6;

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

/**
 * 占位片的高度：量到平均行高就用 px，否则退回 `未渲行数 × 1.6em`。
 * 为什么两种单位并存：不换行时每行等高，em 与行盒同源、零查询就准确（实测 880 行只差 2.75px）；
 * 换行模式（prefs.codeWrap）下每行高度不等，**只有实测平均行高靠得住** ⇒ 每次武装都顺手量一次
 * 平均行高（尾片顶 − 首行顶）÷ 已渲行数，px 分支自动接管。两分支都写死在同一处，
 * 免得以后又出现「一处改单位、另一处忘了改」。
 */
export function reserveHeightPx(hidden: number, rowPx: number | null): string {
  return rowPx && rowPx > 0
    ? `${(hidden * rowPx).toFixed(2)}px`
    : `${hidden * CODE_ROW_EM}em`;
}

/**
 * 平均行高：已渲区间的实际高度 ÷ 已渲行数。
 * 高度取「尾片顶边 − 首行顶边」（两者是同一个 flex 列里的兄弟节点，视口相对值相减即文档内距离），
 * 所以它天然不含占位片自己，也不依赖任何单位换算假设。
 */
export function avgRowPx(tailTop: number, headTop: number, shown: number): number | null {
  if (!(shown > 0) || !Number.isFinite(tailTop) || !Number.isFinite(headTop)) return null;
  const h = tailTop - headTop;
  return h > 0 ? h / shown : null;
}
