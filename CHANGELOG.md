# Changelog

## [2.1.0](https://github.com/baiwumm/margin-app/compare/v2.0.0...v2.1.0) (2026-10-20)

### ✨ Features | 新功能

* **theme:** 视觉基准同步 margin 终端风（D1）——暗 [#0b0b0b](https://github.com/baiwumm/margin-app/issues/0b0b0b) / 浅方格纸版 [#f5f5f3](https://github.com/baiwumm/margin-app/issues/f5f5f3)、墨水 [#303036](https://github.com/baiwumm/margin-app/issues/303036)，muted/surface/accent-mix 派生全量重算 ([f9b4130](https://github.com/baiwumm/margin-app/commit/f9b41303748fdd648cdfdf196993fd4d271728f5))
* **ui:** 代码块头部改 Mac 窗口风格——加红黄绿灯、语言/文件名弱化为 muted、复制按钮改 muted 胶囊；SHIKI_SURFACE 同步 Atom One 系实测值（浅 [#fff](https://github.com/baiwumm/margin-app/issues/fff)/[#383a42](https://github.com/baiwumm/margin-app/issues/383a42)、暗 [#121212](https://github.com/baiwumm/margin-app/issues/121212)/[#abb2bf](https://github.com/baiwumm/margin-app/issues/abb2bf)） ([7c42b88](https://github.com/baiwumm/margin-app/commit/7c42b88bc99c5e400d08ac193974fc4fb8f15e9c))

### 🔧 Continuous Integration | CI 配置

* **release:** 补 packageManager 字段（pnpm@12.6.0，对齐 margin）——release workflow 的 pnpm/action-setup 因缺版本号首跑失败 ([619ad7a](https://github.com/baiwumm/margin-app/commit/619ad7aba1da6954db8ffdda5aa96f16829d8cb0))
* **release:** 重新生成 pnpm-lock.yaml 对齐 package.json——frozen-lockfile 校验失败（本地开发用 npm，lock 久未同步） ([71a4bbc](https://github.com/baiwumm/margin-app/commit/71a4bbc17d717c247b75e05731c81a24dadf4d31))
* 发版自动化——release-it 对齐 margin 机制 + 版本两轴独立口径（D79） ([ada6a1c](https://github.com/baiwumm/margin-app/commit/ada6a1c0ccdf1818c68fce308867b8e2872fdcd0))
