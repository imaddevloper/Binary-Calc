# Embedded Termux Engine

Status: native integration and bootstrap pipeline implemented on `feature/embedded-termux-engine`; automated Android build is still queued/pending and physical-device validation has not yet been performed. Do not treat this feature as production-ready until those gates pass.

- App: Binary-Calc
- Android application ID: `com.binarycalculator.app`
- Expo SDK / React Native: `58 / 0.88.1`
- Base branch: `feature/supabase-remote-clean`
- Feature branch: `feature/embedded-termux-engine`

## What is implemented

1. **Upstream terminal engine**
   - Uses the Termux upstream `terminal-view` library and its transitive `terminal-emulator` dependency from a pinned JitPack commit.
   - Native Android `TerminalSession` owns the PTY and shell process; the UI does not emulate shell commands in JavaScript.
   - Android keyboard input, clipboard copy/paste, terminal resize and session reuse are wired through the native view.

2. **Expo / React Native integration**
   - `plugins/withEmbeddedTermux.js` registers the local Android library module, JitPack repository and native React package.
   - `modules/embedded-termux/android` contains the native module, view manager, session holder and bootstrap installer.
   - `src/features/terminal` provides the app-themed terminal screen; `app/terminal.tsx` is the route.
   - Arabic and English translations and a Home shortcut are present.

3. **Self-contained runtime**
   - GitHub Actions builds the upstream `apt-android-7` bootstrap for `aarch64` and `arm` from pinned `termux-packages` source, changing the build prefix/package identity to `com.binarycalculator.app`.
   - Bootstrap archives are transferred as workflow artifacts, checksum manifests are packaged beside them, and the Android installer verifies SHA-256 before extraction.
   - First-run extraction is staged under app-private storage, validates archive paths, restores symlinks, activates by rename and marks managed prefixes for interrupted-install recovery.
   - Existing unmarked user data is not overwritten when an invalid prefix is encountered.

4. **Android executable loading**
   - The app keeps Expo SDK 58's modern target SDK instead of lowering it to API 28.
   - On Android 10+ the initial Bash process is started through the platform system linker. The Termux `termux-exec` preload handles child execution when Android's app-data W^X policy requires it.
   - `LD_LIBRARY_PATH` is deliberately unset on Android 7+ so Termux binaries use their ELF `DT_RUNPATH`, matching upstream Termux environment behavior.

5. **Licensing**
   - Binary-Calc retains GPL-3.0-only distribution terms.
   - Upstream terminal libraries are Apache-2.0 exceptions in Termux's licensing model.
   - The workflow packages license notices and a generated inventory of bootstrap packages. The inventory is a review aid, not a substitute for checking every package's license before release.

## Upstream pins

See [third-party source and licensing manifest](../third-party/termux-sources.md). The Termux app/library source is pinned to commit `8629e632fcb95da272221be327db653fb24befe9` (master head checked 2026-11-13). The package/bootstrap source is pinned separately to `46ca3fd5a25d42615e7f4cc12c2f7b38c0bdb070`.

The current upstream app Gradle version at that app commit is `0.118.0`; the commit includes later master changes. Do not confuse this source pin with the newest published stable release tag. Do not replace the commit pin with a floating branch or snapshot.

## CI workflow

`.github/workflows/embedded-termux-android.yml`:
- builds ARM64 and ARM bootstrap archives from upstream package sources;
- generates package/license inventory and SHA-256 manifests;
- downloads and verifies both archives;
- runs Expo prebuild with the config plugin;
- builds a debug APK and uploads it as a workflow artifact.

Project Checks separately cover unit tests, TypeScript, ESLint, Expo dependency compatibility, Expo Doctor and JS bundle generation.

## Required acceptance tests

The feature is not complete for release until all of these pass:

- CI bootstrap jobs and Android Gradle debug build succeed.
- APK installs and launches on a clean Android 13 ARM64 device with no standalone Termux installed.
- First-run setup succeeds; `bash`, `pwd`, `ls`, `echo`, pipes, redirection, environment variables and Ctrl-C work.
- Terminal input opens the Android keyboard; copy/paste and resize work.
- `pkg update`, installing Python and Git, and executing them succeed against the matching Termux repositories.
- Installed packages and files persist after force-stop, reboot and app upgrade.
- Interrupted first-run installation can be retried without deleting unrelated user data.
- Existing Binary-Calc calculator, OCR, Supabase remote management, FCM/notifications and learning routes remain functional.
- GPL corresponding-source, build/install scripts and complete third-party package-license review are ready before distributing APKs.

## Runtime and security limits

- The system-linker execution workaround is intended for sideloaded APK distribution. Termux documents that downloading and installing executable code at runtime is not compliant with Google Play executable-code policy; a Play Store release requires a different package-delivery architecture.
- This is a Termux/Bionic userspace running under Binary-Calc's Android UID, not a Linux VM, not root, and not a separate security sandbox.
- Shell commands can access only what Android grants to the Binary-Calc process. Do not inject Supabase service-role keys, FCM server credentials or signing keys into the shell.
- Do not run remote commands automatically. Terminal commands are user-entered.
- Android may stop background processes due to OS process limits and battery management; uninterrupted daemon operation is not guaranteed.
- Uninstalling Binary-Calc removes its app-private Termux environment unless the user backs it up first.

## Current release gate

No merge to `main` is authorized by this document. Keep the feature isolated until CI and real-device acceptance tests pass. PR #6 and the `feature/supabase-remote-clean` work remain untouched.
