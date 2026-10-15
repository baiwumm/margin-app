/**
 * 关于页（M4 步 5，D64；对应站点 /about = AboutLayout + about.mdx 同构）：
 * avatar hero（accent 环 + Hi! I'm + glow 名 + 三徽章）+ 七小节（关于我 /
 * 技能跑马灯 / 成长足迹时间线 / 兴趣与生活 / 人格档案五维条 / 这个博客 +
 * SiteStats 四格 / 十年之约进度卡 / 友链与联系）+ 尾部定位行（compliance
 * §11 待定夺 #3 按倾向从免责正文迁来）+ 版权/备案行（验收④落点，备案号
 * 点击复制）。
 * 偏差记档：跑马灯外链官网端上不做（装饰性外链，D8）；评论区两处文案端上
 * 不做（D7）；光标 aurora / ring-spin hero 动效端上不做（D7 同族）。
 * 数据：stats 四计数走既有 getStats（cache-first）；文案与数值在
 * utils/aboutData.ts（纯数据，可单测）。
 */
import { Image, Text, View } from "@tarojs/components";
import Taro, { usePageScroll } from "@tarojs/taro";
import { useEffect, useState } from "react";

import PageBackdrop from "@/components/deco/PageBackdrop";
import SectionTitle from "@/components/deco/SectionTitle";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha } from "@/components/NavBar/NavBar";
import { MINI_PROGRAM_BEIAN, BEIAN_SITE_URL } from "@/config/site";
import {
  getAccent,
  subscribeAccent,
  type AccentKey,
} from "@/config/accent";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass, useTheme } from "@/hooks/useTheme";
import { getStats } from "@/services/api/collections";
import type { Stats } from "@/types/api";
import {
  ABOUT_BLOG,
  ABOUT_INTRO,
  ABOUT_INTERESTS,
  ABOUT_MBTI,
  ABOUT_QUOTE,
  ABOUT_SKILLS,
  ABOUT_TIMELINE,
  PLEDGE_DESC,
  PLEDGE_RANGE,
  tenYearProgress,
} from "@/utils/aboutData";

/* 技能图标（margin simple-icons，fg 单色烘焙，明暗两版） */
import skillNextL from "@/assets/about/skill-nextdotjs-light.png";
import skillNextD from "@/assets/about/skill-nextdotjs-dark.png";
import skillNuxtL from "@/assets/about/skill-nuxtdotjs-light.png";
import skillNuxtD from "@/assets/about/skill-nuxtdotjs-dark.png";
import skillReactL from "@/assets/about/skill-react-light.png";
import skillReactD from "@/assets/about/skill-react-dark.png";
import skillVueL from "@/assets/about/skill-vuedotjs-light.png";
import skillVueD from "@/assets/about/skill-vuedotjs-dark.png";
import skillNestL from "@/assets/about/skill-nestjs-light.png";
import skillNestD from "@/assets/about/skill-nestjs-dark.png";
import skillTsL from "@/assets/about/skill-typescript-light.png";
import skillTsD from "@/assets/about/skill-typescript-dark.png";
import skillJsL from "@/assets/about/skill-javascript-light.png";
import skillJsD from "@/assets/about/skill-javascript-dark.png";
import skillHtmlL from "@/assets/about/skill-html5-light.png";
import skillHtmlD from "@/assets/about/skill-html5-dark.png";
import skillPrismaL from "@/assets/about/skill-prisma-light.png";
import skillPrismaD from "@/assets/about/skill-prisma-dark.png";
import skillPgL from "@/assets/about/skill-postgresql-light.png";
import skillPgD from "@/assets/about/skill-postgresql-dark.png";
import skillVercelL from "@/assets/about/skill-vercel-light.png";
import skillVercelD from "@/assets/about/skill-vercel-dark.png";

/* 内容图标（about.mdx / AboutLayout 内联 lucide 字形，fg 单色烘焙） */
import uiCodeL from "@/assets/about/icon-code-light.png";
import uiCodeD from "@/assets/about/icon-code-dark.png";
import uiTerminalL from "@/assets/about/icon-terminal-light.png";
import uiTerminalD from "@/assets/about/icon-terminal-dark.png";
import uiMappinL from "@/assets/about/icon-mappin-light.png";
import uiMappinD from "@/assets/about/icon-mappin-dark.png";
import uiSproutL from "@/assets/about/icon-sprout-light.png";
import uiSproutD from "@/assets/about/icon-sprout-dark.png";
import uiRocketL from "@/assets/about/icon-rocket-light.png";
import uiRocketD from "@/assets/about/icon-rocket-dark.png";
import uiPencilL from "@/assets/about/icon-pencil-light.png";
import uiPencilD from "@/assets/about/icon-pencil-dark.png";
import uiPhoneL from "@/assets/about/icon-phone-light.png";
import uiPhoneD from "@/assets/about/icon-phone-dark.png";
import uiMusicL from "@/assets/about/icon-music-light.png";
import uiMusicD from "@/assets/about/icon-music-dark.png";
import uiGamepadL from "@/assets/about/icon-gamepad-light.png";
import uiGamepadD from "@/assets/about/icon-gamepad-dark.png";
import uiDumbbellL from "@/assets/about/icon-dumbbell-light.png";
import uiDumbbellD from "@/assets/about/icon-dumbbell-dark.png";

/* 光球（margin hero-aurora 同款预渲染 PNG：orb1/orb3 跟 accent，orb2 跟主题；
 * 与 AuroraHero 用同一批资产，映射表在此复制一份、不动冻结组件） */
import orb1BlueL from "@/assets/aurora/orb-1-blue-light.png";
import orb1BlueD from "@/assets/aurora/orb-1-blue-dark.png";
import orb1GreenL from "@/assets/aurora/orb-1-green-light.png";
import orb1GreenD from "@/assets/aurora/orb-1-green-dark.png";
import orb1PurpleL from "@/assets/aurora/orb-1-purple-light.png";
import orb1PurpleD from "@/assets/aurora/orb-1-purple-dark.png";
import orb1OrangeL from "@/assets/aurora/orb-1-orange-light.png";
import orb1OrangeD from "@/assets/aurora/orb-1-orange-dark.png";
import orb1RoseL from "@/assets/aurora/orb-1-rose-light.png";
import orb1RoseD from "@/assets/aurora/orb-1-rose-dark.png";
import orb3BlueL from "@/assets/aurora/orb-3-blue-light.png";
import orb3BlueD from "@/assets/aurora/orb-3-blue-dark.png";
import orb3GreenL from "@/assets/aurora/orb-3-green-light.png";
import orb3GreenD from "@/assets/aurora/orb-3-green-dark.png";
import orb3PurpleL from "@/assets/aurora/orb-3-purple-light.png";
import orb3PurpleD from "@/assets/aurora/orb-3-purple-dark.png";
import orb3OrangeL from "@/assets/aurora/orb-3-orange-light.png";
import orb3OrangeD from "@/assets/aurora/orb-3-orange-dark.png";
import orb3RoseL from "@/assets/aurora/orb-3-rose-light.png";
import orb3RoseD from "@/assets/aurora/orb-3-rose-dark.png";
import orb2Light from "@/assets/aurora/orb-2-light.png";
import orb2Dark from "@/assets/aurora/orb-2-dark.png";

import "./about.scss";

type Pair = { light: string; dark: string };

/** 光球素材表（与 AuroraHero 同一批资产、同映射；accent 跟偏好，orb2 跟主题） */
const HERO_ORB1: Record<AccentKey, Pair> = {
  blue: { light: orb1BlueL, dark: orb1BlueD },
  green: { light: orb1GreenL, dark: orb1GreenD },
  purple: { light: orb1PurpleL, dark: orb1PurpleD },
  orange: { light: orb1OrangeL, dark: orb1OrangeD },
  rose: { light: orb1RoseL, dark: orb1RoseD },
};
const HERO_ORB3: Record<AccentKey, Pair> = {
  blue: { light: orb3BlueL, dark: orb3BlueD },
  green: { light: orb3GreenL, dark: orb3GreenD },
  purple: { light: orb3PurpleL, dark: orb3PurpleD },
  orange: { light: orb3OrangeL, dark: orb3OrangeD },
  rose: { light: orb3RoseL, dark: orb3RoseD },
};

const SKILL_ICONS: Record<string, Pair> = {
  nextdotjs: { light: skillNextL, dark: skillNextD },
  nuxtdotjs: { light: skillNuxtL, dark: skillNuxtD },
  react: { light: skillReactL, dark: skillReactD },
  vuedotjs: { light: skillVueL, dark: skillVueD },
  nestjs: { light: skillNestL, dark: skillNestD },
  typescript: { light: skillTsL, dark: skillTsD },
  javascript: { light: skillJsL, dark: skillJsD },
  html5: { light: skillHtmlL, dark: skillHtmlD },
  prisma: { light: skillPrismaL, dark: skillPrismaD },
  postgresql: { light: skillPgL, dark: skillPgD },
  vercel: { light: skillVercelL, dark: skillVercelD },
};

const UI_ICONS: Record<string, Pair> = {
  code: { light: uiCodeL, dark: uiCodeD },
  terminal: { light: uiTerminalL, dark: uiTerminalD },
  mappin: { light: uiMappinL, dark: uiMappinD },
  sprout: { light: uiSproutL, dark: uiSproutD },
  rocket: { light: uiRocketL, dark: uiRocketD },
  pencil: { light: uiPencilL, dark: uiPencilD },
  phone: { light: uiPhoneL, dark: uiPhoneD },
  music: { light: uiMusicL, dark: uiMusicD },
  gamepad: { light: uiGamepadL, dark: uiGamepadD },
  dumbbell: { light: uiDumbbellL, dark: uiDumbbellD },
};

const HERO_BADGES = [
  { icon: "code", label: "前端工程师" },
  { icon: "terminal", label: "vibecoding" },
  { icon: "mappin", label: "深圳" },
] as const;

/** 站点统计四格（margin SiteStats.astro：文章/画廊/标签/动态） */
const STATS_CELLS = [
  { key: "postCount", label: "篇文章" },
  { key: "galleryCount", label: "个画廊" },
  { key: "tagCount", label: "个标签" },
  { key: "momentCount", label: "条动态" },
] as const;

export default function About() {
  const rootCls = useRootClass();
  const theme = useTheme();
  const [accent, setAccentState] = useState<AccentKey>(getAccent());
  useEffect(() => subscribeAccent(setAccentState), []);
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const [stats, setStats] = useState<Stats | null>(null);
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  useEffect(() => {
    if (!buildId) return;
    getStats(buildId, s => setStats(s));
  }, [buildId]);

  const pick = (map: Record<string, Pair>, key: string) => map[key][theme];
  const pledge = tenYearProgress(new Date());

  const copy = (text: string, toast: string) => {
    void Taro.setClipboardData({ data: text });
    void Taro.showToast({ title: toast, icon: "none" });
  };

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title='关于' alpha={alpha} />
      <View className='page-body about'>
        {/* hero：margin about-hero 同款容器（surface 底 + accent 12% 描边 +
            r-hero 圆角 + 光球 PNG 跟 accent/主题）内坐 avatar + 名字 + 徽章 */}
        <View className='about-hero-card'>
          <Image
            className='about-orb about-orb-1'
            src={HERO_ORB1[accent][theme]}
          />
          <Image
            className='about-orb about-orb-2'
            src={theme === "dark" ? orb2Dark : orb2Light}
          />
          <Image
            className='about-orb about-orb-3'
            src={HERO_ORB3[accent][theme]}
          />
          <View className='about-hero'>
            <View className='about-avatar-ring'>
              <Image
                className='about-avatar'
                src='https://www.baiwumm.com/avatar.png'
                mode='aspectFill'
              />
            </View>
            <Text className='about-greeting'>Hi! I&apos;m</Text>
            <Text className='about-name glow-text'>白雾茫茫丶</Text>
            <View className='about-badges'>
              {HERO_BADGES.map(b => (
                <View key={b.label} className='about-badge'>
                  <Image className='about-badge-icon' src={pick(UI_ICONS, b.icon)} />
                  <Text className='about-badge-label'>{b.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 关于我 */}
        <SectionTitle title='关于我' />
        <View className='about-para'>
          {ABOUT_INTRO.map((seg, i) => (
            <Text key={i} className={seg.bold ? "about-bold" : ""}>
              {seg.text}
            </Text>
          ))}
        </View>

        {/* 专业技能（跑马灯，双组接缝循环） */}
        <SectionTitle title='专业技能' />
        <View className='skill-marquee'>
          <View className='skill-track'>
            {[0, 1].map(dup => (
              <View key={dup} className='skill-group' aria-hidden={dup === 1}>
                {ABOUT_SKILLS.map(s => (
                  <View key={`${dup}-${s.key}`} className='skill-pill'>
                    <Image className='skill-icon' src={pick(SKILL_ICONS, s.key)} />
                    <Text className='skill-name'>{s.name}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* 成长足迹（时间线：渐隐主线 + accent 圆点 + 图标） */}
        <SectionTitle title='成长足迹' />
        <View className='timeline'>
          {ABOUT_TIMELINE.map(item => (
            <View key={item.title} className='timeline-item'>
              <View className='timeline-dot'>
                <Image className='timeline-dot-icon' src={pick(UI_ICONS, item.icon)} />
              </View>
              <Text className='timeline-title'>{item.title}</Text>
              <Text className='timeline-desc'>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* 兴趣与生活（icon-chip 行） */}
        <SectionTitle title='兴趣与生活' />
        <View className='interest-list'>
          {ABOUT_INTERESTS.map(item => (
            <View key={item.title} className='interest-row'>
              <View className='interest-chip'>
                <Image className='interest-icon' src={pick(UI_ICONS, item.icon)} />
              </View>
              <Text className='interest-text'>
                <Text className='about-bold'>{item.title}</Text>
                {" —— "}
                {item.desc}
              </Text>
            </View>
          ))}
        </View>

        {/* 人格档案（INTJ-A + 五维条） */}
        <SectionTitle title='人格档案' />
        <View className='mbti-head'>
          <Text className='mbti-label'>
            {ABOUT_MBTI.label}{" "}
            <Text className='mbti-type'>{ABOUT_MBTI.type}</Text>
          </Text>
          <Text className='mbti-source'>{ABOUT_MBTI.source}</Text>
        </View>
        <View className='mbti-bars'>
          {ABOUT_MBTI.traits.map(t => (
            <View key={t.left} className='mbti-row'>
              <View className='mbti-labels'>
                <Text className='mbti-label-text'>
                  {t.left} · {t.leftPct}%
                </Text>
                <Text className='mbti-label-text'>{t.right}</Text>
              </View>
              <View className='mbti-bar'>
                <View
                  className='mbti-bar-fill'
                  style={{ width: `${t.leftPct}%` }}
                />
                <View className='mbti-bar-mid' />
              </View>
            </View>
          ))}
        </View>

        {/* 这个博客（段落 + 站点统计四格） */}
        <SectionTitle title='这个站点' />
        {ABOUT_BLOG.map((para, i) => (
          <View key={i} className='about-para'>
            {para.map((seg, j) => (
              <Text key={j} className={seg.bold ? "about-bold" : ""}>
                {seg.text}
              </Text>
            ))}
          </View>
        ))}
        <View className='site-stats'>
          {STATS_CELLS.map(cell => (
            <View key={cell.key} className='site-stat-card'>
              <Text className='site-stat-num'>
                {stats ? stats[cell.key] : "–"}
              </Text>
              <Text className='site-stat-label'>{cell.label}</Text>
            </View>
          ))}
        </View>

        {/* 十年之约（进度卡，算式在 utils/aboutData 纯函数） */}
        <SectionTitle title='十年之约' />
        <View className='pledge-card'>
          <View className='pledge-head'>
            <View className='pledge-tag'>
              <View className='pledge-dot' />
              <Text className='pledge-tag-text'>十年之约</Text>
            </View>
            <Text className='pledge-range'>{PLEDGE_RANGE}</Text>
          </View>
          <Text className='pledge-desc'>{PLEDGE_DESC}</Text>
          <View className='pledge-bar'>
            <View
              className='pledge-bar-fill'
              style={{ width: `${pledge.percent.toFixed(1)}%` }}
            />
          </View>
          <View className='pledge-foot'>
            <Text className='pledge-elapsed'>
              已走过 {pledge.elapsedDays} 天 · {pledge.percent.toFixed(1)}%
            </Text>
            <Text className='pledge-remain'>
              还剩约 {pledge.remainingYears} 年 {pledge.remainingMonths} 个月
            </Text>
          </View>
        </View>

        {/* 友链与联系（邮箱点击复制，D8） */}
        <SectionTitle title='友链与联系' />
        <View className='about-para'>
          <Text>如果你也喜欢搭建自己的小天地，欢迎添加友链，与我在互联网中共同进步。</Text>
        </View>
        <View
          className='about-mail'
          hoverClass='row-press'
          hoverStayTime={80}
          onClick={() => copy("me@baiwumm.com", "已复制邮箱")}
        >
          <Text className='about-mail-text'>友链申请或交流：me@baiwumm.com</Text>
          <Text className='about-mail-hint'>点击复制</Text>
        </View>
        <View className='about-quote'>
          <Text className='about-quote-text'>{ABOUT_QUOTE}</Text>
        </View>

        {/* 尾部：定位行（compliance §11 #3 迁移）+ 版权/备案行（验收④） */}
        <View className='about-footer'>
          <Text className='about-positioning'>
            这是个人学习记录工具，不提供新闻采编、出版发布与评论服务。
          </Text>
          <Text className='about-copyright'>
            © {new Date().getFullYear()} Margin · 白雾茫茫丶
          </Text>
          <Text
            className='about-beian'
            onClick={() => copy(`${MINI_PROGRAM_BEIAN}\n${BEIAN_SITE_URL}`, "已复制备案号")}
          >
            {MINI_PROGRAM_BEIAN}
          </Text>
        </View>
      </View>
    </View>
  );
}
