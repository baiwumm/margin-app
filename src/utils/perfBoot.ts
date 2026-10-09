/**
 * 启动期性能与内存探针（M3 前置基线，D21 同族，M5 提审前与 perf.ts 一起移除）。
 * 单独成文件的原因：它必须 import Taro，而 utils/perf.ts 不能（request.ts 也依赖 perf.ts，
 * node 单测里拖进 Taro 运行时会让 manifest/request 两个测试文件整文件挂）。
 * 三条都是只读日志，任何一条不支持就静默跳过 —— 探针不能反过来影响被测对象。
 */
import Taro from "@tarojs/taro";

import { perfLog, LAUNCH_T0 } from "./perf";

type ObserveOption = Parameters<Taro.PerformanceObserver["observe"]>[0];

/**
 * 条目的 startTime 在这版基础库上是**绝对 epoch 毫秒**（实测 1.79e12），和 perfLog 的
 * `+Nms`（相对 LAUNCH_T0）不同基 ⇒ 统一换算成后者，读的人只看一条时间轴。
 * 若某版基础库给的是相对 timeOrigin 的小数（<1e11）则原样打印，不做减法 —— 减了会是个
 * 一兆多的负数，一眼就能看出基线错了。
 */
function at(start: number): string {
  if (!Number.isFinite(start)) return "?";
  return start > 1e11 ? `${Math.round(start - LAUNCH_T0)}ms` : `${start.toFixed(1)}(rel)`;
}

function line(e: Taro.PerformanceEntry): string {
  const dur = e.duration && e.duration > 0 ? ` dur=${Math.round(e.duration)}` : "";
  return `${e.entryType}:${e.name}@${at(e.startTime)}${dur}`;
}

/**
 * 把基础库实际给的性能条目原样打出来：不同基础库给的东西不一样，先量再定口径。
 * 实测这版（3.17.17）render 类给 firstPaint / firstRender / firstContentfulPaint /
 * largestContentfulPaint，script 给 evaluateScript，navigation 给 route（+ appLaunch）
 * —— LCP 就是我们要的「首屏真有内容」的官方口径。
 * @param tail 冷启动要看最前面的 appLaunch（截尾会正好把它切掉）；页面级快照要看最新落的那几条
 */
export function perfDumpEntries(tag: string, tail = false): void {
  try {
    const p = typeof Taro.getPerformance === "function" ? Taro.getPerformance() : null;
    if (!p) return perfLog(`entries[${tag}] 无 getPerformance`);
    const es = p.getEntries() ?? [];
    const shown = tail ? es.slice(-8) : es.slice(0, 14);
    perfLog(`entries[${tag}] n=${es.length} ${shown.map(line).join(" ")}`);
  } catch (e) {
    perfLog(`entries[${tag}] 读取失败 ${String(e).slice(0, 80)}`);
  }
}

/** 订阅后续条目：render 类往往在启动那一刻之后才落，晚订阅一步就漏掉 firstRender */
export function perfWatchEntries(): void {
  try {
    const p = typeof Taro.getPerformance === "function" ? Taro.getPerformance() : null;
    if (!p) return;
    p.createObserver((list: { getEntries(): Taro.PerformanceEntry[] }) => {
      const es = list?.getEntries?.() ?? [];
      if (es.length === 0) return;
      perfLog(`entries[obs] ${es.map(line).join(" ")}`);
      // Taro 的 Option 类型把 type 与 entryTypes 都标成必填（运行时是二选一），故断言绕过
    }).observe({ entryTypes: ["navigation", "render", "script"] } as unknown as ObserveOption);
  } catch {
    /* 这版基础库不认某个类型 ⇒ 放弃订阅 */
  }
}

/** 内存告警：真机才有意义（滚千行代码块 / 长列表时若触发就是硬信号） */
export function perfMemoryWarning(): void {
  try {
    Taro.onMemoryWarning?.((res: { level?: number | string }) => {
      perfLog(`内存告警 level=${res?.level ?? "?"}`);
    });
  } catch {
    /* 不支持则跳过 */
  }
}
