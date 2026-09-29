// babel-preset-taro：Taro 编译链共用配置（webpack5 模式，见 docs 决策 D48）
module.exports = {
  presets: [
    [
      "taro",
      {
        framework: "react",
        ts: true,
        compiler: "webpack5",
      },
    ],
  ],
};
