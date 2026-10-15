import { PropsWithChildren } from "react";
import Taro, { useLaunch } from "@tarojs/taro";

import { setPlatformAdapter } from "./services/platform";
import { taroAdapter } from "./services/taro-adapter";
import { KEY_PREFS } from "./services/cache";
import { setAccent } from "./config/accent";
import { setThemePreference } from "./hooks/useTheme";
import { getPrefs, hydratePrefs } from "./utils/prefs";
import { loadSiteFont } from "./utils/siteFont";
import "./app.scss";

setPlatformAdapter(taroAdapter);

/* 偏好水合（M2 步 3）：必须在首帧前同步落到 theme/accent 单例，否则强制暗色或
 * 非 blue accent 的用户会闪一帧默认浅色 + 蓝。这里直读 getStorageSync——cache 层的
 * readCache 是异步的，等不到首帧之前；水合本身不回写（省一次无意义磁盘写）。 */
hydratePrefs(Taro.getStorageSync(KEY_PREFS) || null);
const bootPrefs = getPrefs();
setThemePreference(bootPrefs.theme);
setAccent(bootPrefs.accent);
// D4：站点字体偏好开 ⇒ 启动即异步取 ASCII 切片（不等首帧、失败静默、关偏好不取）
if (bootPrefs.siteFont) loadSiteFont();

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    // M1-b：启动流程接 manifest 版本比对（读缓存渲染 → 后台 checkForUpdate）
  });

  // children 是即将要渲染的页面（Taro 约定）
  return children;
}

export default App;
