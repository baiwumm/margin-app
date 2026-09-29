/**
 * accent 五套配置表（D5，margin global.css html[data-accent=…] 同值）：
 * tabBar / NavBar 等 custom-tab-bar 边界与内联视觉消费方从这里取具体色值
 * （D19：custom-tab-bar 内 CSS 变量不可达，内联 style 需要确定性 hex/rgba）。
 * 模块级状态 + 订阅，与 custom-tab-bar/store 同款模式；持久化留 M2 偏好页。
 */
export type AccentKey = "blue" | "green" | "purple" | "orange" | "rose";
export type Theme = "light" | "dark";

export const ACCENT_KEYS: AccentKey[] = ["blue", "green", "purple", "orange", "rose"];

/** accent 主色（明暗两套 = margin --accent-* 变量原值） */
const ACCENT_HEX: Record<AccentKey, Record<Theme, string>> = {
  blue: { light: "#1158d1", dark: "#008fec" },
  green: { light: "#1f9d63", dark: "#34d399" },
  purple: { light: "#7c3aed", dark: "#a78bfa" },
  orange: { light: "#ea580c", dark: "#fb923c" },
  rose: { light: "#dc2626", dark: "#f87171" },
};

export function accentHex(key: AccentKey, theme: Theme): string {
  return ACCENT_HEX[key][theme];
}

/** accent 的 alpha 派生色（rgba 逗号写法，预计算口径同 tokens.css） */
export function accentRgba(key: AccentKey, theme: Theme, alpha: number): string {
  const n = parseInt(ACCENT_HEX[key][theme].slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* ── 模块级当前 accent（默认 blue；M2 偏好页接持久化）──────────────── */
type Listener = (key: AccentKey) => void;

let current: AccentKey = "blue";
const listeners = new Set<Listener>();

export function getAccent(): AccentKey {
  return current;
}

export function setAccent(key: AccentKey): void {
  if (current === key) return;
  current = key;
  for (const fn of listeners) fn(key);
}

export function subscribeAccent(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
