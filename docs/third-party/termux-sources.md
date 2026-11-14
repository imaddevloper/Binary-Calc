# Termux upstream source and licensing manifest

This manifest records the pinned upstream libraries and package sources used by the embedded Termux implementation. The terminal libraries are consumed as a pinned JitPack dependency; the app-specific bootstrap is built from the separately pinned termux-packages source in GitHub Actions.

## Pinned upstream revision

- Repository: https://github.com/termux/termux-app
- Revision: `8629e632fcb95da272221be327db653fb24befe9` (master head checked 2026-11-13)
- Upstream README stable-release note: `v0.118.3`. The pinned master source reports Gradle `versionName 0.118.0` and `versionCode 118`, while including later master commits. The implementation pins the exact master commit rather than using a floating branch or a prebuilt standalone Termux APK.
- Gradle terminal library pin: JitPack commit `8629e632fc` for `com.termux.termux-app:terminal-view`; `terminal-emulator` is imported transitively as documented by Termux. The Gradle module also includes the upstream-required empty Guava ListenableFuture compatibility dependency.
- Revision URL: https://github.com/termux/termux-app/commit/8629e632fcb95da272221be327db653fb24befe9
- Audited source date: 2026-11-13
- Do not use a floating `master-SNAPSHOT` or unpinned dependency in release builds.

## Termux packages / Bootstrap source pin

- Repository: https://github.com/termux/termux-packages
- Revision: `46ca3fd5a25d42615e7f4cc12c2f7b38c0bdb070` (master head checked 2026-11-13)
- The custom bootstrap workflow changes `TERMUX_APP__PACKAGE_NAME` to `com.binarycalculator.app` and `TERMUX_APP__NAMESPACE` to `com.binarycalculator.termux` and `TERMUX_APP__APP_IDENTIFIER` to `binarycalc` before running the upstream default Debian/APT `scripts/build-bootstraps.sh` flow in a fresh builder container. The workflow intentionally omits `-f`: this pinned upstream script currently uses an unset `TERMUX_BUILT_PACKAGES_DIRECTORY_FOR_ARCH` in its force-clean branch, which would expand to `/*`. It deliberately does not pass `--android10`, which selects a different bootstrap packaging mode and omits the APT bootstrap package.
- Bootstrap package variant: `apt-android-7` (the current Termux app build configuration for Android 7+), which works on modern Android versions including Android 13. Architectures: `aarch64` and `arm`, matching arm64-v8a and armeabi-v7a Android phones.
- The bootstrap is generated from the pinned package source for the app's private prefix. The standalone Termux app is not required.
- Additional tools such as Python and Git are installed later with Termux `pkg` / `apt`, not bundled into the initial bootstrap.

## Components identified

| Component | Upstream location | License note | Planned use |
|---|---|---|---|
| Termux Android app/runtime integration | `app/` | GPL-3.0-only per upstream `LICENSE.md` | Reference only; the Binary-Calc bridge is its own implementation |
| Terminal emulator | `terminal-emulator/` | Apache-2.0 exception identified by upstream `LICENSE.md` | Imported transitively by the pinned `terminal-view` library |
| Terminal view | `terminal-view/` | Apache-2.0 exception identified by upstream `LICENSE.md` | Direct pinned Gradle dependency used by the native view manager |
| Shared utilities | `termux-shared/` | Mixed; see `termux-shared/LICENSE.md`, including GPLv3-only exceptions for `com/termux/shared/termux/*` | Use only required classes after per-file license review |
| Bootstrap and packages | https://github.com/termux/termux-packages | Each package has its own license; bootstrap archives must be audited as a collection | Rebuild bootstrap for Binary-Calc's package ID and prefix |

## Primary upstream references

- App license: https://github.com/termux/termux-app/blob/8629e632fcb95da272221be327db653fb24befe9/LICENSE.md
- Shared library license: https://github.com/termux/termux-app/blob/8629e632fcb95da272221be327db653fb24befe9/termux-shared/LICENSE.md
- Termux libraries and integration guidance: https://github.com/termux/termux-app/wiki/Termux-Libraries
- Termux app repository and bootstrap overview: https://github.com/termux/termux-app
- Termux package/bootstrap repository: https://github.com/termux/termux-packages/tree/46ca3fd5a25d42615e7f4cc12c2f7b38c0bdb070

## Compliance checklist before distribution

- [x] Include the applicable GPL-3.0 and Apache-2.0 license texts and third-party notice files in the Android build assets.
- [ ] Audit the complete bootstrap archive and every included package license.
- [ ] Mark all local modifications to GPL-covered source files.
- [ ] Provide the corresponding source, build scripts and installation scripts for GPL-covered distributed binaries.
- [ ] Wire the native license-notices bridge to a user-visible Licenses & Notices screen in the app.
- [ ] Confirm all included dependencies are compatible with the combined distribution.
- [ ] Have the final source-offer/distribution method reviewed before publishing a release.

The app-level GPL-3.0-only license does not mean every file in the upstream repository has the same license. License obligations must be tracked per component and, where required, per source file/package.
