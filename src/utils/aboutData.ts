/**
 * 关于页静态内容（M4 步 5，D64）：文案 = margin about.mdx 原文，数值 = 站点
 * 组件同源（MBTI 五维 / 十年之约算式）。纯数据 + 纯函数、零 Taro 依赖 ——
 * tenYearProgress 可单测（期望值用独立算式在测试里另算，不抄实现）。
 * 图标名对应 src/assets/about/icon-<name>-<theme>.png。
 */

/** 「关于我」段落（** 包裹 = 加粗片段，端上分段渲染） */
export const ABOUT_INTRO: { text: string; bold?: boolean }[] = [
  {
    text: "Hi，我是白雾茫茫丶 👋 一名扎根深圳的前端程序员。在互联网行业深耕多年，最初因兴趣开始折腾代码，如今把它走成了职业：喜欢用 ",
  },
  { text: "React / Vue", bold: true },
  { text: " 构建用户界面，对" },
  { text: "工程化", bold: true },
  { text: "与" },
  { text: "性能优化", bold: true },
  {
    text: "充满好奇，正努力向「更优雅的代码」和「更高效的协作」靠近。",
  },
];

/** 成长足迹时间线（margin .timeline 四项，图标 = 内联 lucide 字形同源） */
export const ABOUT_TIMELINE = [
  { icon: "sprout", title: "兴趣萌芽", desc: "最初因兴趣开始折腾代码，对互联网懵懂又好奇。" },
  { icon: "rocket", title: "入行摸索", desc: "在工作中持续踩坑，也在踩坑中不断进步。" },
  { icon: "pencil", title: "建站", desc: "工作两年左右萌生建站想法，记录成长。" },
  { icon: "phone", title: "现在", desc: "扎根深圳，专注前端，追求更优雅的代码与协作。" },
] as const;

/** 兴趣与生活（margin 四行 icon-chip 列表） */
export const ABOUT_INTERESTS = [
  { icon: "code", title: "写代码", desc: "把想法变成能跑起来的产品，享受从 0 到 1 的过程。" },
  { icon: "music", title: "音乐", desc: "写代码时的固定背景音是 Lo-fi，安静又治愈。" },
  { icon: "gamepad", title: "游戏", desc: "偶尔钻进虚拟世界放松一下，也算一种解压方式。" },
  { icon: "dumbbell", title: "健身", desc: "保持身体在线，才能持续产出。" },
] as const;

/** 人格档案（margin MbtiType + 五维条：leftPct = 左侧特质占比） */
export const ABOUT_MBTI = {
  label: "建筑师",
  type: "INTJ-A",
  source: "数据来自 16Personalities 测试结果",
  traits: [
    { left: "内向 I", leftPct: 55, right: "外向 E" },
    { left: "直觉 N", leftPct: 58, right: "实感 S" },
    { left: "思考 T", leftPct: 56, right: "情感 F" },
    { left: "判断 J", leftPct: 86, right: "知觉 P" },
    { left: "自信果断 A", leftPct: 78, right: "谨慎 T" },
  ],
} as const;

/** 「这个博客」段落 */
export const ABOUT_BLOG: { text: string; bold?: boolean }[][] = [
  [
    {
      text: "我认为，寻找一种以自己喜欢的方式，把生活、学习、工作、进步与经验记录下来，是一件很美好的事——这就是我建立这个小站的初衷。",
    },
  ],
  [
    {
      text: "工作两年左右，我萌生了搭建站点的想法。那时候我对互联网还处于一种懵懂的状态，有太多新鲜事物等着去摸索；摸索的过程里会一直踩坑，但踩坑本身，就是一种进步。",
    },
  ],
  [
    {
      text: "拥有一个自己喜欢的站点，是一件很酷的事。你会以自己喜欢的方式去不断完善它。在这个物欲横流的时代，能有一件自己喜欢、并且有能力去追逐的事情，并不容易。",
    },
  ],
  [
    { text: "Margin", bold: true },
    {
      text: " 是我为自己搭建的小天地，用来记录代码、思考与灵感。这里会有关于开发与技术的文章，以及偶尔深夜冒出来的随想。它由 ",
    },
    { text: "Astro", bold: true },
    {
      text: " 构建，纯静态生成，自带全文搜索与动态 OG 图，力求在性能与体验之间取得平衡。",
    },
  ],
];

/** 尾部引用（about.mdx 结尾 blockquote） */
export const ABOUT_QUOTE = "代码是写给人看的，只是顺便让机器能运行。";

/** 技能跑马灯（margin SkillMarquee 11 项；key = src/assets/about/skill-<key>-<theme>.png。
 * 站点每项外链官网，端上纯展示不做链接 —— D8 外链口径 + 装饰性外链无复制价值） */
export const ABOUT_SKILLS = [
  { key: "nextdotjs", name: "Next.js" },
  { key: "nuxtdotjs", name: "Nuxt.js" },
  { key: "react", name: "React" },
  { key: "vuedotjs", name: "Vue" },
  { key: "nestjs", name: "NestJS" },
  { key: "typescript", name: "TypeScript" },
  { key: "javascript", name: "JavaScript" },
  { key: "html5", name: "HTML5" },
  { key: "prisma", name: "Prisma" },
  { key: "postgresql", name: "PostgreSQL" },
  { key: "vercel", name: "Vercel" },
] as const;

/** 十年之约（margin TenYearPledge.astro：2023-04-29 → 2033-04-29，东八区） */
export const PLEDGE_START = "2023-04-29T00:00:00+08:00";
export const PLEDGE_END = "2033-04-29T00:00:00+08:00";
export const PLEDGE_RANGE = "2023.04.29 → 2033.04.29";
export const PLEDGE_DESC = "与未来的自己约定：把记录这件事，坚持十年。";

export interface TenYearProgress {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  /** 0–100，未取整（展示层 toFixed(1)） */
  percent: number;
  remainingYears: number;
  remainingMonths: number;
}

/** 十年之约进度（margin 同算式：未开始钳 0、已结束钳满、剩余按 365.2425/30.437 折算年月） */
export function tenYearProgress(now: Date): TenYearProgress {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const start = new Date(PLEDGE_START).getTime();
  const end = new Date(PLEDGE_END).getTime();
  const totalDays = Math.round((end - start) / DAY_MS);
  const clamped = Math.min(Math.max(now.getTime() - start, 0), end - start);
  const elapsedDays = Math.floor(clamped / DAY_MS);
  const remainingDays = Math.max(totalDays - elapsedDays, 0);
  const percent = (elapsedDays / totalDays) * 100;
  const remainingYears = Math.floor(remainingDays / 365.2425);
  const remainingMonths = Math.floor((remainingDays % 365.2425) / 30.437);
  return { totalDays, elapsedDays, remainingDays, percent, remainingYears, remainingMonths };
}
