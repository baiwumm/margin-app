/**
 * M1-b 资产管线（design.md §10 步骤 4）：构建期用 sharp 预渲染装饰资产。
 * sharp 不新增依赖：优先取 margin 仓库 node_modules（D1 唯一事实源仓库），
 * 可用 SHARP_PATH 环境变量覆盖。用法：
 *   node scripts/gen-assets.mjs [noise|tabbar|logo|aurora|all]
 * 输出落 src/assets/（deco/ tabbar/ logo/ aurora/）。
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
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

const jobs = { noise: genNoise };
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
