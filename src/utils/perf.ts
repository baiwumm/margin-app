/**
 * M1 真机验收打点（A1 清单专用）：
 * - LAUNCH_T0：本模块被求值的时刻 ≈ 小程序启动起点（app.ts 首个 import）
 * - perfLog：带启动偏移的统一日志前缀 [perf]
 * ⚠️ 打点为 M1 验收而保留，M5 提审前统一移除（docs/m1a-progress.md 记录在案）
 */
export const LAUNCH_T0 = Date.now();

export function perfLog(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[perf +${Date.now() - LAUNCH_T0}ms] ${message}`);
}
