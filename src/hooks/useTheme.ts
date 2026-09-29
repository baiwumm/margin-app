/**
 * 主题 hook：系统暗色（onThemeChange）+ 偏好覆盖接口（M2 偏好设置页接入）。
 * - system：跟随系统（Taro.onThemeChange，app.json darkmode:true）
 * - preference：'system' | 'light' | 'dark'（M2 从 prefs 读取注入 setPreference）
 * 页面用法：root View 挂 `theme-dark` 类（tokens.css 的 .theme-dark 覆盖变量）。
 * 自定义 tabBar 在页面树内，变量自动继承；其自身的类切换由本 store 同步。
 */
import Taro, { onThemeChange } from "@tarojs/taro";
import { useEffect, useState } from "react";

import {
  getAccent,
  subscribeAccent,
  type AccentKey,
} from "@/config/accent";

export type Theme = "light" | "dark";
export type ThemePreference = "system" | Theme;

type Listener = (theme: Theme) => void;

let preference: ThemePreference = "system"; // M2 接偏好设置持久化
let system: Theme = "light";
const listeners = new Set<Listener>();
let bound = false;

function notify(): void {
  const t = resolved();
  for (const fn of listeners) fn(t);
}

function resolved(): Theme {
  return preference === "system" ? system : preference;
}

function bindSystem(): void {
  if (bound) return;
  bound = true;
  try {
    system = (Taro.getSystemInfoSync().theme as Theme) || "light";
  } catch {
    system = "light";
  }
  try {
    onThemeChange?.(res => {
      system = (res.theme as Theme) ?? "light";
      notify();
    });
  } catch {
    /* 不支持时不跟随 */
  }
}

/** M2 偏好设置页调用：切换强制浅/深 */
export function setThemePreference(p: ThemePreference): void {
  preference = p;
  notify();
}

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(resolved());

  useEffect(() => {
    bindSystem();
    setTheme(resolved());
    listeners.add(setTheme);
    return () => {
      listeners.delete(setTheme);
    };
  }, []);

  return theme;
}

/** 当前 accent（D5：模块级状态，默认 blue；M2 偏好页接 setAccent 持久化） */
export function useAccent(): AccentKey {
  const [accent, setAccentState] = useState<AccentKey>(getAccent());

  useEffect(() => subscribeAccent(setAccentState), []);

  return accent;
}

/** 页面 root 类名：`theme-dark`（偏好强制/系统暗色）+ `accent-<key>`（blue 免挂），
 * 对应 tokens.css 的变量组（design.md §10 步骤 9）。 */
export function useRootClass(): string {
  const theme = useTheme();
  const accent = useAccent();
  return `${theme === "dark" ? "theme-dark" : ""} ${
    accent === "blue" ? "" : `accent-${accent}`
  }`.trim();
}
