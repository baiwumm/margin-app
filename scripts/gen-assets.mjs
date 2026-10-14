/**
 * M1-b 资产管线（design.md §10 步骤 4）：构建期用 sharp 预渲染装饰资产。
 * sharp 不新增依赖：优先取 margin 仓库 node_modules（D1 唯一事实源仓库），
 * 可用 SHARP_PATH 环境变量覆盖。用法：
 *   node scripts/gen-assets.mjs [noise|tabbar|logo|aurora|all]
 * 输出落 src/assets/（deco/ tabbar/ logo/ aurora/）。
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "src", "assets");

const ensureDir = out => mkdirSync(path.dirname(out), { recursive: true });

function loadSharp() {
  if (process.env.SHARP_PATH) return createRequire(__dirname)(process.env.SHARP_PATH);
  const candidates = [
    path.resolve(ROOT, "..", "margin", "node_modules", "sharp", "dist", "index.cjs"),
    path.resolve(ROOT, "..", "personal-project", "margin", "node_modules", "sharp", "dist", "index.cjs"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return createRequire(__dirname)(p);
  }
  return createRequire(__dirname)("sharp");
}
const sharp = loadSharp();

/* ── 噪点 tile（margin Layout.astro site-grain 同观感：feTurbulence
 *    fractalNoise baseFrequency 0.4 numOctaves 4 → 端上预渲染 200px PNG。
 *    双倍频混合近似分形噪声；灰度 + 半透明 alpha，层透明度由 CSS 控制）── */
async function genNoise() {
  const W = 64; // tile 重复平铺，小 tile 无观感差异（层透明度由 CSS 控制）
  const fine = Buffer.alloc(W * W * 4);
  const coarseScale = 5; // 粗倍频块尺寸（近似 numOctaves 低频分量）
  const q = (v, levels) => Math.round((v / 255) * (levels - 1)) * Math.floor(255 / (levels - 1));
  const rnd = () => Math.floor(Math.random() * 256);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const cx = Math.floor(x / coarseScale) * coarseScale + Math.floor(coarseScale / 2);
      const cy = Math.floor(y / coarseScale) * coarseScale + Math.floor(coarseScale / 2);
      // 粗倍频用坐标散列保持逐像素稳定
      const h = Math.abs(Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453) % 1;
      const v = Math.floor(0.6 * rnd() + 0.4 * h * 256);
      const i = (y * W + x) * 4;
      fine[i] = q(v, 8);
      fine[i + 1] = q(v, 8);
      fine[i + 2] = q(v, 8);
      fine[i + 3] = q(v, 6); // 灰度即透明度：暗点更透，亮点更实（半透明噪点）
    }
  }
  const out = path.join(ASSETS, "deco", "noise.png");
  ensureDir(out);
  await sharp(fine, { raw: { width: W, height: W, channels: 4 } })
    .png({ compressionLevel: 9, palette: true, colours: 32 })
    .toFile(out);
  console.log("noise.png →", out);
}

/* ── tabBar 图标（margin 线性图标族：24×24 / stroke 2 / round cap；
 *    home·user 为 margin 缺字形按同风格补画（lucide 同族）。
 *    normal = fg 55%，active = fg 100%，明暗两套 → 5×2×2 = 20 PNG @81px ── */
const FG = { light: "#353538", dark: "#f6f7f8" };
const TAB_GLYPHS = {
  home: `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  tag: `<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><path d="M7 7h.01"/>`,
  gallery: `<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>`,
  moment: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  user: `<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
};
const iconSvg = (glyphs, color, opacity = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">${glyphs}</svg>`;

async function genTabbar() {
  for (const [name, glyphs] of Object.entries(TAB_GLYPHS)) {
    for (const theme of ["light", "dark"]) {
      for (const [state, opacity] of [
        ["normal", 0.55],
        ["active", 1],
      ]) {
        const out = path.join(ASSETS, "tabbar", `${name}-${state}-${theme}.png`);
        ensureDir(out);
        await sharp(Buffer.from(iconSvg(glyphs, FG[theme], opacity)))
          .resize(81, 81)
          .png({ compressionLevel: 9 })
          .toFile(out);
      }
    }
  }
  console.log("tabbar icons ×20 →", path.join(ASSETS, "tabbar"));
}

/* ── NavBar 右侧图标：搜索（fg 明暗两版）+ 主题切换（月/日，fg）── */
async function genNavIcons() {
  const glyphs = {
    search: `<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/>`,
    moon: `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`,
    sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`,
  };
  for (const [name, g] of Object.entries(glyphs)) {
    const themes = name === "search" ? ["light", "dark"] : [name === "moon" ? "light" : "dark"];
    for (const theme of themes) {
      const out = path.join(ASSETS, "deco", `icon-${name}-${theme}.png`);
      ensureDir(out);
      await sharp(Buffer.from(iconSvg(g, FG[theme])))
        .resize(81, 81)
        .png({ compressionLevel: 9 })
        .toFile(out);
    }
  }
  console.log("nav icons →", path.join(ASSETS, "deco"));
}

/* ── logo（margin src/assets/logo）：mark = fg 外框 + accent 色块（60% 圆点）；
 *    字标 margin.svg = fg 单色。各明暗两版 ── */
async function genLogo() {
  const margin = process.env.MARGIN_REPO || path.resolve(ROOT, "..", "margin");
  const read = rel => readFileSync(path.join(margin, "src", "assets", "logo", rel), "utf8");

  for (const theme of ["light", "dark"]) {
    const fg = FG[theme];
    const accent = theme === "light" ? "#1158d1" : "#008fec";
    // mark：frame/dot 用 fg，block 用 accent（margin .logo-mark-block 同族映射）
    const mark = read("mark.svg")
      .replace(/<rect class="logo-mark-frame"([^>]*)stroke="currentColor"/, `<rect class="logo-mark-frame"$1stroke="${fg}"`)
      .replace(/<rect class="logo-mark-block"([^>]*)fill="currentColor"/, `<rect class="logo-mark-block"$1fill="${accent}"`)
      .replace(/<circle class="logo-mark-dot"([^>]*)fill="currentColor"/, `<circle class="logo-mark-dot"$1fill="${fg}" opacity="0.6"`);
    const markOut = path.join(ASSETS, "logo", `mark-${theme}.png`);
    ensureDir(markOut);
    await sharp(Buffer.from(mark)).resize(84, 84).png({ compressionLevel: 9 }).toFile(markOut);

    // 字标：currentColor 全量替换为 fg
    const wordmark = read("margin.svg").replaceAll('fill="currentColor"', `fill="${fg}"`);
    const wordOut = path.join(ASSETS, "logo", `wordmark-${theme}.png`);
    ensureDir(wordOut);
    await sharp(Buffer.from(wordmark))
      .resize({ height: 60 })
      .png({ compressionLevel: 9, palette: true, colours: 8 })
      .toFile(wordOut);
  }
  console.log("logo →", path.join(ASSETS, "logo"));
}

/* ── aurora 光球（margin hero-aurora.css：radial 25%/20%/12% + blur(60px) →
 *    预渲染模糊 PNG，禁大半径运行时 blur。orb1/orb3 跟随 accent（五套×明暗），
 *    orb2 = border 色（随主题）；峰值透明度已烘焙进 PNG ── */
const ACCENT_HEX = {
  light: { blue: "#1158d1", green: "#1f9d63", purple: "#7c3aed", orange: "#ea580c", rose: "#dc2626" },
  dark: { blue: "#008fec", green: "#34d399", purple: "#a78bfa", orange: "#fb923c", rose: "#f87171" },
};
const BORDER_HEX = { light: "#7cadff", dark: "#2264e3" };

const hexRgba = (h, a) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** 预模糊光球：多停靠点径向渐变近似 blur(60px) 后的观感 */
const orbSvg = (hex, peak) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs><radialGradient id="g">
      <stop offset="0%" stop-color="${hexRgba(hex, peak)}"/>
      <stop offset="35%" stop-color="${hexRgba(hex, peak * 0.68)}"/>
      <stop offset="60%" stop-color="${hexRgba(hex, peak * 0.24)}"/>
      <stop offset="78%" stop-color="${hexRgba(hex, 0)}"/>
      <stop offset="100%" stop-color="${hexRgba(hex, 0)}"/>
    </radialGradient></defs>
    <circle cx="50" cy="50" r="50" fill="url(#g)"/>
  </svg>`;

async function genAurora() {
  const writeOrb = async (name, hex, peak) => {
    const out = path.join(ASSETS, "aurora", `orb-${name}.png`);
    ensureDir(out);
    await sharp(Buffer.from(orbSvg(hex, peak)))
      .resize(100, 100)
      .png({ compressionLevel: 9, palette: true, colours: 16 })
      .toFile(out);
  };
  for (const theme of ["light", "dark"]) {
    for (const [key, hex] of Object.entries(ACCENT_HEX[theme])) {
      await writeOrb(`1-${key}-${theme}`, hex, 0.25);
      await writeOrb(`3-${key}-${theme}`, hex, 0.12);
    }
    await writeOrb(`2-${theme}`, BORDER_HEX[theme], 0.2);
  }
  console.log("aurora orbs →", path.join(ASSETS, "aurora"));
}

/* ── 关于页图标（M4 步 5，D64）：技能跑马灯 11 枚（margin simple-icons 单路径，
 *    fill 烘焙为 fg 单色 —— 站点同为 mono 观感）+ 内容图标 10 枚（about.mdx /
 *    AboutLayout 内联 lucide 字形，stroke 2）。各明暗两版 @96px ── */
const SKILL_FILES = [
  "nextdotjs", "nuxtdotjs", "react", "vuedotjs", "nestjs", "typescript",
  "javascript", "html5", "prisma", "postgresql", "vercel",
];
const ABOUT_GLYPHS = {
  code: `<path d="M10 9l-6 5 6 5"/><path d="M14 9l6 5-6 5"/>`,
  terminal: `<path d="M4 17l6-5-6-5"/><path d="M12 19h8"/>`,
  mappin: `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>`,
  sprout: `<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>`,
  rocket: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  pencil: `<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>`,
  phone: `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>`,
  music: `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`,
  gamepad: `<rect width="20" height="12" x="2" y="6" rx="2"/><path d="M6 12h4"/><path d="M8 10v4"/><path d="M15 13h.01"/><path d="M18 11h.01"/>`,
  dumbbell: `<path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>`,
};

async function genAboutIcons() {
  const margin = process.env.MARGIN_REPO || path.resolve(ROOT, "..", "margin");
  const outDir = path.join(ASSETS, "about");
  for (const theme of ["light", "dark"]) {
    const fg = FG[theme];
    for (const name of SKILL_FILES) {
      const raw = readFileSync(
        path.join(margin, "src", "assets", "icons", "skills", `${name}.svg`),
        "utf8"
      );
      const svg = raw
        .replace(/<title>[^<]*<\/title>/, "")
        .replace("<svg ", `<svg fill="${fg}" `);
      const out = path.join(outDir, `skill-${name}-${theme}.png`);
      ensureDir(out);
      await sharp(Buffer.from(svg)).resize(96, 96).png({ compressionLevel: 9 }).toFile(out);
    }
    for (const [name, g] of Object.entries(ABOUT_GLYPHS)) {
      const out = path.join(outDir, `icon-${name}-${theme}.png`);
      ensureDir(out);
      await sharp(Buffer.from(iconSvg(g, fg))).resize(96, 96).png({ compressionLevel: 9 }).toFile(out);
    }
  }
  console.log("about icons →", outDir);
}

const jobs = { noise: genNoise, tabbar: genTabbar, navicons: genNavIcons, logo: genLogo, aurora: genAurora, about: genAboutIcons };
const what = process.argv[2] || "all";
if (what === "all") {
  for (const fn of Object.values(jobs)) await fn();
} else {
  if (!jobs[what]) {
    console.error(`unknown job: ${what} (known: ${Object.keys(jobs).join(", ")}, all)`);
    process.exit(1);
  }
  await jobs[what]();
}
