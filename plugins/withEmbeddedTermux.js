const {
  withAppBuildGradle,
  withMainApplication,
  withProjectBuildGradle,
  withSettingsGradle,
} = require('expo/config-plugins');

const withEmbeddedTermux = (config) => {
  config = withProjectBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes('jitpack.io')) {
      const anchor = /allprojects\s*\{\s*repositories\s*\{/;
      if (!anchor.test(contents)) {
        throw new Error('Embedded Termux: could not locate allprojects.repositories in android/build.gradle');
      }
      contents = contents.replace(anchor, (match) => `${match}\n        maven { url 'https://jitpack.io' }`);
    }
    mod.modResults.contents = contents;
    return mod;
  });

  config = withSettingsGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes("project(':embedded-termux')")) {
      contents += `\n\ninclude ':embedded-termux'\nproject(':embedded-termux').projectDir = new File(rootProject.projectDir, '../modules/embedded-termux/android')\n`;
    }
    mod.modResults.contents = contents;
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes("project(':embedded-termux')")) {
      const anchor = /dependencies\s*\{/;
      if (!anchor.test(contents)) {
        throw new Error('Embedded Termux: could not locate app dependencies in android/app/build.gradle');
      }
      contents = contents.replace(anchor, (match) => `${match}\n    implementation project(':embedded-termux')`);
    }
    mod.modResults.contents = contents;
    return mod;
  });

  config = withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;
    const importLine = 'import com.binarycalculator.termux.EmbeddedTermuxPackage';
    if (!contents.includes(importLine)) {
      const packageLine = contents.match(/^package [^\n]+\n/m);
      if (packageLine) {
        contents = contents.replace(packageLine[0], `${packageLine[0]}\n${importLine}\n`);
      } else {
        contents = `${importLine}\n${contents}`;
      }
    }

    if (!contents.includes('EmbeddedTermuxPackage()')) {
      const kotlinAnchor = 'PackageList(this).packages.apply {';
      const javaAnchor = 'new PackageList(this).getPackages()';
      if (contents.includes(kotlinAnchor)) {
        contents = contents.replace(kotlinAnchor, `${kotlinAnchor}\n        add(EmbeddedTermuxPackage())`);
      } else if (contents.includes(javaAnchor)) {
        contents = contents.replace(javaAnchor, `${javaAnchor}.apply { add(new EmbeddedTermuxPackage()); }`);
      } else {
        throw new Error('Embedded Termux: could not find the React Native package registration point in MainApplication');
      }
    }
    mod.modResults.contents = contents;
    return mod;
  });

  return config;
};

module.exports = withEmbeddedTermux;
