import { PropsWithChildren } from "react";
import { useLaunch } from "@tarojs/taro";

import { setPlatformAdapter } from "./services/platform";
import { taroAdapter } from "./services/taro-adapter";
import "./app.scss";

setPlatformAdapter(taroAdapter);

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    // M1-b：启动流程接 manifest 版本比对（读缓存渲染 → 后台 checkForUpdate）
  });

  // children 是即将要渲染的页面（Taro 约定）
  return children;
}

export default App;
