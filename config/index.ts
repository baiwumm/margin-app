import path from "node:path";

import { defineConfig, type UserConfigExport } from "@tarojs/cli";
import { WeappTailwindcss } from "weapp-tailwindcss/webpack";

import devConfig from "./dev";
import prodConfig from "./prod";

// https://taro-docs.jd.com/docs/
export default defineConfig(async merge => {
  const baseConfig: UserConfigExport = {
    projectName: "margin-app",
    date: "2026-9-29",
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2,
      375: 2,
      // designWidth 750 时 375 也按 1 处理即可（默认含 640/750/828）
    },
    sourceRoot: "src",
    outputRoot: "dist",
    // @/ → src/*（与 tsconfig paths 一致；Taro 不读 tsconfig paths）
    alias: {
      "@": path.resolve(__dirname, "..", "src"),
    },
    // 编译器：webpack5（保守回退，见 docs 决策 D48——pnpm 12.6 对 vite 全线
    // 标记 trust downgrade 无法安装；webpack5 + babel 为 Taro 4 默认且最稳）
    compiler: "webpack5",
    framework: "react",
    plugins: [],
    defineConstants: {},
    copy: { patterns: [], options: {} },
    mini: {
      // D37：Tailwind v4 + weapp-tailwindcss v5——样式生成由 weapp-tw 接管，
      // 不叠加 @tailwindcss/postcss（双生成器禁止，见 weapp-tw README）
      webpackChain(chain) {
        chain.plugin("weapp-tailwindcss").use(WeappTailwindcss, [
          {
            appType: "taro",
          },
        ]);
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
      },
    },
    h5: {},
  };

  if (process.env.NODE_ENV === "development") {
    return merge({}, baseConfig, devConfig);
  }
  return merge({}, baseConfig, prodConfig);
});
