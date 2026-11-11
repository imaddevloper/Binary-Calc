module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo configures Reanimated/Worklets automatically for the installed SDK.
  return { presets: ['babel-preset-expo'] };
};
