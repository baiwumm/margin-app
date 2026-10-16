# Margin 小程序 · 工具链怪癖速查

> 本页是**索引**：症状 → 判据与处置 → 决策出处。论证与取证细节一律看对应 D 行，本页不复制论证；口径以 decisions.md 为准。
> 适用范围 = 本机开发环境（Windows + 微信开发者工具 + automator）；换环境先复核再信。

## 固定排查序

**探针 / E2E 首查失败，先查 IDE 旧编译，再查代码**（D69；D31/D34 两次误判的教训）。改到主包与分包共享的模块（`CacheImage`、`blocks.scss`、`PostCard` 这一类）必然使分包 `sub-common/<hash>` chunk 换 hash，IDE 常拿旧引用在编译 → 症状五花八门（ENOENT、选择器全空、渲染全白、`wx://not-found`）。处置 = `cli auto` 重跑强制真重编译，立刻恢复。

## 症状速查

| 症状 / 场景 | 判据与处置 | 出处 |
| --- | --- | --- |
| `ENOENT …/sub-common/<旧hash>.wxss/js` | IDE 旧编译引旧 chunk，**预期现象非代码回归**；重编译即恢复。可核产物自洽：dist 里引用的每个 `sub-common/*` 都存在 | D33/D46/D63/D69 |
| 连上 automator 但页面全白、`data` 只剩 `__webviewId__`、选择器全空、无日志 | **僵尸 app service**：`cli close` + `cli auto` 之后连上的可能是早上的旧实例。判据 = 启动期日志的时间偏移是秒级还是小时级（小时级 = 僵尸；原判据用 `[perf` 首行，D71 探针拆除后改用 console 首条日志 / 页面 data 完整性）。别照它改代码 | D43 |
| `Remote debug connection lost` / auto 端口连不上 | IDE 通道僵死：`cli close --project` 关项目窗口再 `cli auto`；**auto 端口不保证 9420**（实测起过 25822），扫 devtools 进程监听口逐一握手 | D55/D68 |
| `automator.launch` 报 EINVAL / spawn 失败 | Node 24 禁 `spawn` 直启 `.bat`：改**后台 `cli.bat auto` + `connect(ws)`**（automator 0.12.1 未适配 launch） | D68 |
| automator 首次连不上 | IDE 设置 → 安全设置 → 开「服务端口」；`automator.launch` 须带 `trustProject: true`（「允许获取工具登录票据」「自动化接口打开工具时默认信任项目」开关关闭时）；服务端口 ≠ 自动化端口 | D26/D35 |
| 这版 devtools 上 automator 拿不到 Page 对象 | `navigateTo` 返回值 / `currentPage()` 卡 `getPageMetaByWebviewId(...) is null`。绕法 = 只用 `callWxMethod` + `evaluate`（结果暂存 `getApp().__pData` 轮询取回，不依赖协议 await Promise） | D35 |
| 对非启动 tab 页 tap 派发不动 | 工具限制（home 页 tap 正常、其余页 onClick 不触发）：**reLaunch 到目标页把它变成启动页**再派发 | D27/D56 |
| showModal 等原生弹层点不到 | automator 点不到原生弹窗：E2E 只验弹层出现 + 截图，确认后的逻辑用单测覆盖 | D69 |
| IDE 警告：WAAutoService preload not used / `scroll-view` padding / `WindowInfoChanged` listeners 泄漏 | **IDE 注入或 Taro 产物噪音，不修**：src/dist 全零命中，或属产物模板无条件携带的组件属性。验收时别当 bug 查 | D71 追加/D49/D28 |
| 部署后 curl 仍拿到旧 buildId | 边缘缓存：**核验部署必须带 cache-buster**（`?cb=<时间戳>`），否则会误判「没部署成功」 | D32 |
| 站点 HTML 与 JSON 不同步（导出层改了、HTML 没变） | Astro content cache：`.md` 一字未改时 Pages 构建缓存复用旧编译产物；动一下 `.md` 或清缓存重部署。端上走 API 不受影响 | D33 |
| 取「日常冷启动」读数 | **划掉开发版小程序会连带清存储**；正确取法 = 杀微信进程再重进。`reLaunch` 不重启 app service ⇒ boot 路径必须真冷启验 | D50/D58 |
| ugrep 对含 `/` 的 pattern 行为异常 | HTML / 产物验证改用 node 脚本或 grep | D74 |

## 性能读数口径（量测前必读）

- 官方 `firstRender` 是**页面骨架首帧**（loading 态），比端上自己的「可渲」打点早几百毫秒，两者不能互替（D44）。
- `render:stutter` **已判死，不作任何判据**：静止期也报、`dur` 是聚合量（实测出现过单条 8.5s 而手感正常，D48）。判「卡不卡」只押端上三段打点 + 人眼手感。
- LCP 会二次触发（正文变长时重发）⇒ 基线只认最后落的那条（D43）。
- 模拟器不产 `navigation:appLaunch`、`evaluateScript` 不进 `getEntries()` ⇒ 启动类收益别在模拟器量，也不编数（D43/D55）。
- 真机调试通道把启动量级放大约 2.65×（D48 对照），正式基线只认预览版 vConsole 读数，且必须连基础库版本一起记（D44/D49）。
- 滚动步墙钟含 automator 往返 + 大批量 rect 传输（地板 ~300ms），只能 A/B 横比、不能当帧率（D35）。
