import { PropsWithChildren } from "react";
import Taro, { useLaunch } from "@tarojs/taro";

import { setPlatformAdapter } from "./services/platform";
import { taroAdapter } from "./services/taro-adapter";
import {
  KEY_PREFS,
  KEY_PREFS_SCHEMA,
  writeCache,
} from "./services/cache";
import { setAccent } from "./config/accent";
import { setThemePreference } from "./hooks/useTheme";
import {
  PREFS_SCHEMA,
  getPrefs,
  hydratePrefs,
  migrateLegacyPrefs,
  setPrefs,
} from "./utils/prefs";
import { loadSiteFont } from "./utils/siteFont";
import "./app.scss";

setPlatformAdapter(taroAdapter);

/* 偏好水合（M2 步 3）：必须在首帧前同步落到 theme/accent 单例，否则强制暗色或
 * 非 blue accent 的用户会闪一帧默认浅色 + 蓝。这里直读 getStorageSync——cache 层的
 * readCache 是异步的，等不到首帧之前；水合本身不回写（省一次无意义磁盘写）。
 * D75：默认值反转（siteFont false → true）要处理老存储——旧版把旧默认 false 写进
 * 了盘，不迁的话新默认对老用户永远不生效。schema 戳保证只迁一次。 */
const storedPrefs: string | null = Taro.getStorageSync(KEY_PREFS) || null;
const schemaStamped =
  Taro.getStorageSync(KEY_PREFS_SCHEMA) === String(PREFS_SCHEMA);
const legacyPrefs = storedPrefs !== null && !schemaStamped;
hydratePrefs(legacyPrefs ? migrateLegacyPrefs(storedPrefs) : storedPrefs);
const bootPrefs = getPrefs();
setThemePreference(bootPrefs.theme);
setAccent(bootPrefs.accent);
// D4：站点字体偏好开 ⇒ 启动即异步取 ASCII 切片（不等首帧、失败静默、关偏好不取）
if (bootPrefs.siteFont) loadSiteFont();
// D63/D75 取证：真机「开关已开但无变化」排查第一站（loaded 出现 = 字体已就位，
// 无变化即平台已渲染页不重绘，冷启即好；这行不出现 = prefs 里就是关）
console.log(
  `[prefs] boot siteFont=${bootPrefs.siteFont ? "on" : "off"}` +
    (legacyPrefs ? " (legacy migrated)" : "")
);
// 一次性迁移收尾：回写迁好的 prefs + 打 schema 戳（异步、失败静默 ⇒ 下次冷启再迁，
// 幂等）。fresh install（无存储）不写，省一次无意义磁盘写。
if (legacyPrefs) {
  setPrefs({});
  void writeCache(KEY_PREFS_SCHEMA, String(PREFS_SCHEMA)).catch(() => undefined);
}

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    // M1-b：启动流程接 manifest 版本比对（读缓存渲染 → 后台 checkForUpdate）
  });

  // children 是即将要渲染的页面（Taro 约定）
  return children;
}

export default App;
