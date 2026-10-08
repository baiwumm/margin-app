/**
 * 启动期性能与内存探针（M3 前置基线，D21 同族，M5 提审前与 perf.ts 一起移除）。
 * 单独成文件的原因：它必须 import Taro，而 utils/perf.ts 不能（request.ts 也依赖 perf.ts，
 * node 单测里拖进 Taro 运行时会让 manifest/request 两个测试文件整文件挂）。
 * 三条都是只读日志，任何一条不支持就静默跳过 —— 探针不能反过来影响被测对象。
 */
import Taro from "@tarojs/taro";

import { perfLog } from "./perf";

type ObserveOption = Parameters<Taro.PerformanceObserver["observe"]>[0];

/**
 * 把基础库实际给的性能条目原样打出来：不同基础库给的东西不一样，先量再定口径。
 * 我们要的 name 都在这里面 —— appLaunch（点图标 → 首页 onReady 的官方冷启动耗时）、
 * firstRender（逻辑层收到路由 → 首页 onReady）、firstPaint / firstContentfulPaint、
 * evaluateScript（JS 注入耗时）、route（路由处理）。
 */
export function perfDumpEntries(tag: string): void {
  try {
    const p = typeof Taro.getPerformance === "function" ? Taro.getPerformance() : null;
    if (!p) return perfLog(`entries[${tag}] 无 getPerformance`);
    const es = p.getEntries() ?? [];
    perfLog(
      `entries[${tag}] n=${es.length} ` +
        es
          .slice(-10)
          .map(e => `${e.entryType}:${e.name}@${Math.round(e.startTime)}`)
          .join(" ")
    );
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
      perfLog(
        "entries[obs] " +
          es
            .map(
              e =>
                `${e.entryType}:${e.name}@${Math.round(e.startTime)} dur=${Math.round(e.duration || 0)}`
            )
            .join(" ")
      );
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
