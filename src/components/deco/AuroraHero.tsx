/**
 * aurora hero 容器（margin tags/galleries/moments/about 页 *-hero 同构，
 * design.md §3/§10 步骤 7）：surface 底 + accent 12% 描边 + 48rpx 圆角，
 * 三枚预渲染光球 PNG（accent 跟随偏好，位置/位移动画 = margin
 * hero-aurora.css 降档：transform 位移保留、无运行时 blur）+
 * 终端徽章 + glow 标题 + 斜体描述 + hero-badge 统计行。
 */
import { View, Text, Image } from "@tarojs/components";
import type { ReactNode } from "react";

import { useTheme } from "@/hooks/useTheme";
import {
  getAccent,
  subscribeAccent,
  type AccentKey,
} from "@/config/accent";
import { useEffect, useState } from "react";

import orb1BlueLight from "@/assets/aurora/orb-1-blue-light.png";
import orb1BlueDark from "@/assets/aurora/orb-1-blue-dark.png";
import orb1GreenLight from "@/assets/aurora/orb-1-green-light.png";
import orb1GreenDark from "@/assets/aurora/orb-1-green-dark.png";
import orb1PurpleLight from "@/assets/aurora/orb-1-purple-light.png";
import orb1PurpleDark from "@/assets/aurora/orb-1-purple-dark.png";
import orb1OrangeLight from "@/assets/aurora/orb-1-orange-light.png";
import orb1OrangeDark from "@/assets/aurora/orb-1-orange-dark.png";
import orb1RoseLight from "@/assets/aurora/orb-1-rose-light.png";
import orb1RoseDark from "@/assets/aurora/orb-1-rose-dark.png";
import orb3BlueLight from "@/assets/aurora/orb-3-blue-light.png";
import orb3BlueDark from "@/assets/aurora/orb-3-blue-dark.png";
import orb3GreenLight from "@/assets/aurora/orb-3-green-light.png";
import orb3GreenDark from "@/assets/aurora/orb-3-green-dark.png";
import orb3PurpleLight from "@/assets/aurora/orb-3-purple-light.png";
import orb3PurpleDark from "@/assets/aurora/orb-3-purple-dark.png";
import orb3OrangeLight from "@/assets/aurora/orb-3-orange-light.png";
import orb3OrangeDark from "@/assets/aurora/orb-3-orange-dark.png";
import orb3RoseLight from "@/assets/aurora/orb-3-rose-light.png";
import orb3RoseDark from "@/assets/aurora/orb-3-rose-dark.png";
import orb2Light from "@/assets/aurora/orb-2-light.png";
import orb2Dark from "@/assets/aurora/orb-2-dark.png";

import TerminalBadge from "./TerminalBadge";
import "./AuroraHero.scss";

/** 光球素材表：orb1/orb3 跟 accent（margin 25%/12% 峰值已烘焙），orb2 跟主题 */
const ORB1: Record<AccentKey, { light: string; dark: string }> = {
  blue: { light: orb1BlueLight, dark: orb1BlueDark },
  green: { light: orb1GreenLight, dark: orb1GreenDark },
  purple: { light: orb1PurpleLight, dark: orb1PurpleDark },
  orange: { light: orb1OrangeLight, dark: orb1OrangeDark },
  rose: { light: orb1RoseLight, dark: orb1RoseDark },
};
const ORB3: Record<AccentKey, { light: string; dark: string }> = {
  blue: { light: orb3BlueLight, dark: orb3BlueDark },
  green: { light: orb3GreenLight, dark: orb3GreenDark },
  purple: { light: orb3PurpleLight, dark: orb3PurpleDark },
  orange: { light: orb3OrangeLight, dark: orb3OrangeDark },
  rose: { light: orb3RoseLight, dark: orb3RoseDark },
};

interface AuroraHeroProps {
  /** 终端徽章路径段（/tags、/galleries…） */
  path: string;
  /** 徽章尾随命令（如 ls -la） */
  trail?: string;
  title: string;
  desc?: string;
  /** hero-badge 统计行（margin：N 个标签 / N 篇文章） */
  badges?: string[];
  children?: ReactNode;
}

export default function AuroraHero({
  path,
  trail,
  title,
  desc,
  badges,
  children,
}: AuroraHeroProps) {
  const theme = useTheme();
  const [accent, setAccentState] = useState<AccentKey>(getAccent());
  useEffect(() => subscribeAccent(setAccentState), []);

  return (
    <View className='aurora-hero'>
      <Image className='aurora-orb aurora-orb-1' src={ORB1[accent][theme]} />
      <Image className='aurora-orb aurora-orb-2' src={theme === "dark" ? orb2Dark : orb2Light} />
      <Image className='aurora-orb aurora-orb-3' src={ORB3[accent][theme]} />
      <View className='aurora-hero-body'>
        <TerminalBadge path={path} trail={trail} />
        <Text className='aurora-hero-title glow-text'>{title}</Text>
        {desc ? <Text className='aurora-hero-desc'>{desc}</Text> : null}
        {badges && badges.length > 0 ? (
          <View className='aurora-hero-badges'>
            {badges.map(b => (
              <View key={b} className='hero-badge'>
                <Text className='hero-badge-text'>{b}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}
