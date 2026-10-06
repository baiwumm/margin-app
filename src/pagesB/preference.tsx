/**
 * 偏好设置页（M2 步 3b；requirements §6.2 分包 B）。生效通路 = utils/prefs
 * （启动水合见 app.ts），本页只负责改值。
 * 形态取 margin mobile-menu 的 Preferences 小节 + ReadMode.astro 的缩放交互
 * （margin 桌面是 −/+ 缩放 80–140%，端上按 requirements §10 落 26–40rpx 步进 2）。
 * 站点字体开关不做：字体子集从未生成（/fonts/*.woff2 实测 404），D25 步骤 10 跳过，
 * 做成开关就是骗人的（D26 第 5 项继续挂未验）。
 */
import { Switch, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import { usePageScroll } from "@tarojs/taro";

import PageBackdrop from "@/components/deco/PageBackdrop";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha } from "@/components/NavBar/NavBar";
import {
  ACCENT_KEYS,
  accentHex,
  setAccent,
  type AccentKey,
} from "@/config/accent";
import {
  setThemePreference,
  useRootClass,
  useTheme,
  type ThemePreference,
} from "@/hooks/useTheme";
import {
  BODY_RPX_MAX,
  BODY_RPX_MIN,
  BODY_RPX_STEP,
  getPrefs,
  prefsClass,
  setPrefs,
  subscribePrefs,
  type Prefs,
} from "@/utils/prefs";
import "./preference.scss";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

/** 行距三档（1.75 = margin .app-prose 原值） */
const LEAD_OPTIONS: { value: number; label: string }[] = [
  { value: 1.6, label: "紧凑" },
  { value: 1.75, label: "标准" },
  { value: 1.9, label: "宽松" },
];

export default function Preference() {
  const rootCls = useRootClass();
  const theme = useTheme();
  const [prefs, setP] = useState<Prefs>(getPrefs);
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));
  useEffect(() => subscribePrefs(setP), []);

  /** 改值同时落到运行时单例（theme/accent 由各自模块广播，prefs 负责持久化） */
  const patch = (p: Partial<Prefs>) => {
    if (p.accent) setAccent(p.accent);
    if (p.theme) setThemePreference(p.theme);
    setPrefs(p);
  };

  return (
    <View className={`page page-bg ${rootCls} ${prefsClass(prefs)}`}>
      <PageBackdrop />
      <SubNavBar title='偏好设置' alpha={alpha} />
      <View className='page-body pref'>
        <Group title='主题'>
          <Segment
            options={THEME_OPTIONS}
            value={prefs.theme}
            onPick={v => patch({ theme: v })}
          />
        </Group>

        <Group title='Accent'>
          <View className='pref-dots'>
            {ACCENT_KEYS.map(k => (
              <View
                key={k}
                className={`accent-dot ${prefs.accent === k ? "accent-dot-active" : ""}`}
                style={{ backgroundColor: accentHex(k, theme) }}
                hoverClass='row-press'
                hoverStayTime={80}
                onClick={() => patch({ accent: k as AccentKey })}
              />
            ))}
          </View>
        </Group>

        <Group title='正文字号'>
          <View className='pref-stepper'>
            <View
              className='pref-step'
              hoverClass='row-press'
              onClick={() => patch({ bodyRpx: prefs.bodyRpx - BODY_RPX_STEP })}
            >
              <Text className='pref-step-sign'>−</Text>
            </View>
            <Text className='pref-step-value'>{prefs.bodyRpx}rpx</Text>
            <View
              className='pref-step'
              hoverClass='row-press'
              onClick={() => patch({ bodyRpx: prefs.bodyRpx + BODY_RPX_STEP })}
            >
              <Text className='pref-step-sign'>＋</Text>
            </View>
          </View>
          <Text className='pref-hint'>
            可调区间 {BODY_RPX_MIN}–{BODY_RPX_MAX}rpx（无障碍口径，requirements §10）
          </Text>
        </Group>

        <Group title='行距'>
          <Segment
            options={LEAD_OPTIONS}
            value={prefs.leading}
            onPick={v => patch({ leading: v })}
          />
        </Group>

        <Group title='阅读模式'>
          <SwitchRow
            checked={prefs.readMode}
            hint='隐藏装饰层与上下篇，只留正文'
            color={accentHex(prefs.accent, theme)}
            onChange={v => patch({ readMode: v })}
          />
        </Group>

        <Group title='代码块换行'>
          <SwitchRow
            checked={prefs.codeWrap}
            hint='关闭则横向滚动（margin 原站默认）'
            color={accentHex(prefs.accent, theme)}
            onChange={v => patch({ codeWrap: v })}
          />
        </Group>
      </View>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className='pref-group'>
      <Text className='pref-group-title'>{title}</Text>
      <View className='pref-group-body'>{children}</View>
    </View>
  );
}

function Segment<T extends string | number>({
  options,
  value,
  onPick,
}: {
  options: { value: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <View className='pref-segment'>
      {options.map(o => (
        <View
          key={String(o.value)}
          className={`pref-seg-item ${o.value === value ? "pref-seg-active" : ""}`}
          hoverClass='row-press'
          hoverStayTime={80}
          onClick={() => onPick(o.value)}
        >
          <Text className='pref-seg-label'>{o.label}</Text>
        </View>
      ))}
    </View>
  );
}

function SwitchRow({
  checked,
  hint,
  color,
  onChange,
}: {
  checked: boolean;
  hint: string;
  /** 开关底色给确定 hex（Switch 的 color 属性不吃 var()，同 D19 口径） */
  color: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className='pref-switch-row'>
      <View className='pref-switch-texts'>
        <Text className='pref-switch-hint'>{hint}</Text>
      </View>
      <Switch
        checked={checked}
        color={color}
        onChange={e => onChange(!!e.detail.value)}
      />
    </View>
  );
}
