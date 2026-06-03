/* global __dirname */

const path = require("node:path");

module.exports = function babelConfig(api) {
  api.cache(true);

  const projectRoot = __dirname;
  const repoRoot = path.resolve(projectRoot, "..");

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@": path.join(repoRoot, "src"),
            "~": path.join(projectRoot, "src"),
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
