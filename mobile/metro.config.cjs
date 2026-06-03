/* global __dirname */

const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [repoRoot];
config.resolver.assetExts = [...config.resolver.assetExts, "wasm"];

module.exports = config;
