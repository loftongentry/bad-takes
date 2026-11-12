// Expo's recommended rules (React, React Hooks, imports): https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", ".tamagui/*"],
  },
  {
    // Dev scripts run in Node, not the app
    files: ["scripts/**/*.js"],
    languageOptions: { globals: globals.node },
  },
]);
