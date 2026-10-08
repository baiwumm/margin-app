import { describe, expect, it } from "vitest";

import {
  CODE_CHUNK_ROWS,
  CODE_ROW_EM,
  avgRowPx,
  chunked,
  firstRows,
  mergeRuns,
  nextRows,
  reserveHeightPx,
  type CodeRun,
} from "@/utils/codeTokens";
import type { CodeToken } from "@/types/api";
import fixture from "./golden/code-tokens-real.json";

/** 配色表桩：下标即 CodeToken.c，越界返回 undefined（与 tokenColor 的缺色回落同形） */
const TABLE: (string | undefined)[] = ["#d73a49", "#005cc5", "#22863a", "#6f42c1"];
const colorOf = (c: number | undefined) => (c === undefined ? undefined : TABLE[c]);

const t = (v: string, c?: number): CodeToken => (c === undefined ? { v } : { v, c });
const joinRuns = (runs: CodeRun[]) => runs.map(r => r.v).join("");

describe("相邻同色合并", () => {
  it("同色相邻合成一个 run，且拼接结果与原 token 序列逐字相等", () => {
    const line = [t("const ", 0), t("x", 0), t(" = ", 1), t("1", 1)];
    const runs = mergeRuns(line, colorOf);
    expect(runs).toEqual([
      { v: "const x", color: "#d73a49" },
      { v: " = 1", color: "#005cc5" },
    ]);
    expect(joinRuns(runs)).toBe(line.map(x => x.v).join(""));
  });

  it("合并键是**解析后的颜色**而不是 c 索引：不同 c 同色照样并", () => {
    TABLE[8] = "#22863a"; // 与下标 2 同色的另一条
    const runs = mergeRuns([t("a", 2), t("b", 8)], colorOf);
    expect(runs).toEqual([{ v: "ab", color: "#22863a" }]);
    delete TABLE[8];
  });

  it("`c` 缺失 = 默认字色：多个缺色 token 并成一个 run，且整个 color 键不写", () => {
    const runs = mergeRuns([t("  "), t("→"), t(" ")], colorOf);
    expect(runs).toEqual([{ v: "  → " }]);
    expect("color" in runs[0]).toBe(false);
  });

  it("缺色与有色交替时逐个断开（默认色不是「无色」的同伙）", () => {
    const runs = mergeRuns([t("a"), t("b", 0), t("c")], colorOf);
    expect(runs.map(r => r.v)).toEqual(["a", "b", "c"]);
  });

  it("越界 c 解析不到色 ⇒ 与缺色同组并掉（表比正文新/旧时不产生碎节点）", () => {
    const runs = mergeRuns([t("x", 99), t("y")], colorOf);
    expect(runs).toEqual([{ v: "xy" }]);
  });

  it("空串与脏值 token 不产 run，但不吃掉其它字符", () => {
    const line = [t("", 0), t("k", 0), { v: "" } as CodeToken, t("v", 1)];
    const runs = mergeRuns(line, colorOf);
    expect(joinRuns(runs)).toBe("kv");
    expect(runs).toHaveLength(2);
  });

  it("空行 → 空数组（由调用方落成一个占位空格）", () => {
    expect(mergeRuns([], colorOf)).toEqual([]);
  });

  it("不改输入：同一份 tokens 渲染两次得到同样结果（幂等 + 无副作用）", () => {
    const line = [t("foo", 0), t("bar", 0), t("baz", 2)];
    const snapshot = JSON.parse(JSON.stringify(line));
    const first = mergeRuns(line, colorOf);
    const second = mergeRuns(line, colorOf);
    expect(line).toEqual(snapshot);
    expect(second).toEqual(first);
    // 交出去的是新数组新对象，输入 token 一个都没被引用/改写
    expect(second).not.toBe(first);
    expect(second[0]).not.toBe(first[0]);
  });

  it("run 数不超过 token 数（结构上界）", () => {
    const line = Array.from({ length: 50 }, (_, i) => t(`${i}`, i % 3));
    expect(mergeRuns(line, colorOf).length).toBeLessThanOrEqual(line.length);
  });

  it("语料事实留档：Shiki 每行几乎都是「异色相邻」⇒ 合并收益是个位数百分比", () => {
    // 取样自线上 theme-switch-animation 第一行 `pnpm add theme-switch-animation`
    const line = [t("pnpm", 0), t(" ", 1), t("add", 2), t(" ", 1), t("theme", 3), t("-switch-animation", 2)];
    expect(mergeRuns(line, colorOf)).toHaveLength(line.length);
  });
});

describe("分片行区间", () => {
  it(`门槛 = ${CODE_CHUNK_ROWS} 行：不超过就整块渲（语料实测最长块 125 行）`, () => {
    expect(chunked(CODE_CHUNK_ROWS)).toBe(false);
    expect(chunked(CODE_CHUNK_ROWS + 1)).toBe(true);
    expect(chunked(0)).toBe(false);
    expect(firstRows(CODE_CHUNK_ROWS)).toBe(CODE_CHUNK_ROWS);
    expect(firstRows(30)).toBe(30);
    expect(firstRows(1000)).toBe(CODE_CHUNK_ROWS);
  });

  it("每片 +N 且钳到 total", () => {
    expect(nextRows(120, 1000)).toBe(240);
    expect(nextRows(960, 1000)).toBe(1000);
    expect(nextRows(1000, 1000)).toBe(1000);
  });

  it("shown 比 total 大（换文复用同一实例）时不回绕，直接给 total", () => {
    expect(nextRows(1500, 1000)).toBe(1000);
  });

  it("从首片走到收尾：累计覆盖 total 行，片数 = ⌈total/片⌉（探针响过：步数实测）", () => {
    const total = 1000;
    const seen: number[] = [];
    let shown = firstRows(total);
    for (let guard = 0; guard < 100 && shown < total; guard++) {
      seen.push(shown);
      shown = nextRows(shown, total);
    }
    seen.push(shown);
    expect(seen[0]).toBe(CODE_CHUNK_ROWS);
    expect(seen[seen.length - 1]).toBe(total);
    expect(seen).toHaveLength(Math.ceil(total / CODE_CHUNK_ROWS));
    // 相邻两次之间严格增长，不存在「追加了个寂寞」的死循环
    expect(seen.every((v, i) => i === 0 || v > seen[i - 1])).toBe(true);
  });

  it("不分片的块 nextRows 一次到底（IO 不该把它切两半）", () => {
    expect(nextRows(firstRows(50), 50)).toBe(50);
  });
});

describe("占位片高度口径", () => {
  /* 一行 = 1.6em，em 基数 = `.code-block-tail` 的 font-size（必须与 .code-line-* 的 26rpx 同值）。
     实测模拟器行盒 20.796875px，而按 windowWidth 换算的算式值 21.632px 高 3.9% ⇒ 占位只能走 em */
  it("1 个未渲行 = 1.6em（= .code-line-* 的 line-height）", () => {
    expect(CODE_ROW_EM).toBe(1.6);
  });
});

describe("占位高度：em 兜底 / 实测均值优先", () => {
  it("没量到平均行高 ⇒ 走 1.6em（与行盒同源，不换行时精确）", () => {
    expect(reserveHeightPx(880, null)).toBe("1408em");
    expect(reserveHeightPx(880, 0)).toBe("1408em");
  });

  it("量到了 ⇒ 走 px（换行模式下每行不等高，只有实测靠得住）", () => {
    // 20.796875 = 模拟器实测行盒；880 行未渲 ⇒ 18301.25px（与运行时量到的占位高度一致）
    expect(reserveHeightPx(880, 20.796875)).toBe("18301.25px");
  });
});

describe("平均行高（尾片顶 − 首行顶）÷ 已渲行数", () => {
  it("用模拟器那一对真实 rect 反算出行盒 20.796875px", () => {
    expect(avgRowPx(3167.109375, 671.484375, 120)).toBeCloseTo(20.796875, 6);
  });

  it("退化输入一律给 null（0 / 负数 / NaN 都不拿去顶占位）", () => {
    expect(avgRowPx(100, 100, 120)).toBeNull();
    expect(avgRowPx(50, 100, 120)).toBeNull();
    expect(avgRowPx(Number.NaN, 0, 10)).toBeNull();
    expect(avgRowPx(100, 0, 0)).toBeNull();
  });
});

/* 真实语料金标准（test/golden/code-tokens-real.json，脚本 make-fixture.mjs 从线上
 * r254pvqf 的最大代码块抽 26 行样本，2026-10-08 抓）。这个块是全语料 token 最密的一块
 * （1173 token / 125 行），样本合并率 16.95% 是**上界**；语料整体只 3.65%（见 stats2.json）。
 * 数字写死在这里，不是让被测函数自己算自己。 */
describe("真实语料 fixture（线上 r254pvqf 行样本）", () => {
  const stubColorOf = (c: number | undefined) => (c === undefined ? undefined : `#${c}`);
  const lines = fixture.lines as CodeToken[][];
  const golden = fixture.golden as {
    lines: number;
    tokens: number;
    runsByIndex: number;
    mergedLinesByIndex: number;
  };

  it("样本形状没被改动（行条数 / token 总数对得上）", () => {
    expect(lines).toHaveLength(golden.lines);
    expect(lines.reduce((s, l) => s + l.length, 0)).toBe(golden.tokens);
  });

  it("每一行合并后逐字等价 —— 真实 Shiki 样本上文本不能掉一个字符", () => {
    for (const line of lines) {
      expect(joinRuns(mergeRuns(line, stubColorOf))).toBe(
        line.map(tk => tk.v).join("")
      );
    }
  });

  it(`236 token → 196 run，且 ${golden.mergedLinesByIndex} 行真的被合并过（探针响过）`, () => {
    const merged = lines.map(line => mergeRuns(line, stubColorOf));
    const runCount = merged.reduce((s, r) => s + r.length, 0);
    expect(runCount).toBe(golden.runsByIndex);
    expect(runCount).toBeLessThan(golden.tokens); // 恒等实现会在这里露馅
    expect(merged.filter((r, i) => r.length < lines[i].length).length).toBe(
      golden.mergedLinesByIndex
    );
  });

  it("样本里的空行渲成 0 个 run（由调用方落一个占位空格）", () => {
    const empties = lines.filter(l => l.length === 0);
    expect(empties.length).toBeGreaterThan(0);
    for (const line of empties) expect(mergeRuns(line, stubColorOf)).toEqual([]);
  });
});
