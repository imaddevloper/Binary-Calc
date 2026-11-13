# Embedded Termux Engine — Architecture and Integration Plan

Status: planning / repository reconnaissance only. No Termux source, native code, dependencies, Android permissions, or app behavior have been changed by this document.

Target branch: `feature/embedded-termux-engine`
Base: `feature/supabase-remote-clean`
Application: Binary-Calc (Expo SDK 58 / React Native 0.88.1)
Android application ID: `com.binarycalculator.app`

## Product requirement

Provide a real Termux-derived terminal inside Binary-Calc that works on a clean Android installation where the standalone Termux app is not installed. The terminal must use the upstream Termux terminal emulator and execution/runtime components rather than a fake command prompt or a home-grown shell. Existing Binary-Calc features must remain intact.

## Important architecture distinction

Termux is not a single embeddable library. Upstream separates:
- `termux-app`: Android application, session/service lifecycle, installer and app integration.
- `terminal-view` and `terminal-emulator`: terminal rendering and VT/ANSI emulation libraries.
- `termux-shared`: shared constants and Android/runtime utilities.
- `termux-packages`: native Android/Bionic packages and the bootstrap archives.

The upstream library documentation permits third-party apps to use the published terminal libraries, but those libraries alone do not provide a complete shell environment or package manager. The standalone-app `RUN_COMMAND` integration is explicitly not suitable for the requirement because it requires Termux to be installed separately.

## Current implementation on feature branch

- Added an Expo config plugin at `plugins/withEmbeddedTermux.js` to register a local Android library module and the pinned Termux terminal library from JitPack.
- Added a native Android bridge and React Native view manager under `modules/embedded-termux/android`.
- The view hosts upstream `TerminalView` / `TerminalSession`; it does not emulate a shell in JavaScript.
- Added a bootstrap installer that validates extracted paths, stages files under the app-private Termux prefix, restores upstream symlinks, and activates the prefix atomically.
- Added an Arabic/English Terminal screen and a Home shortcut.
- Added `.github/workflows/embedded-termux-android.yml` to build app-specific Android 10+ bootstrap archives from pinned Termux packages sources, then prebuild Expo and assemble a debug APK.
- The bootstrap assets are generated in CI and are not committed as binary blobs.

This is an in-progress integration. It has not yet passed Android compilation or a real-device shell test. Do not describe it as production-ready until CI and device validation succeed.

## Proposed implementation

1. **Pin and audit upstream sources**
   - Pin a specific stable upstream Termux release/commit; do not track `master` or floating Maven versions.
   - Record exact source URLs, commit hashes, SPDX/license identifiers, copyright notices and required attribution for every imported component.
   - Keep upstream source changes isolated under `vendor/termux/` (or a documented Gradle source dependency) so future upstream updates are reviewable.
   - Confirm the precise license of each library and bootstrap/package component; do not assume every Termux-related repository has identical terms.

2. **Native Android host integration**
   - Generate the Expo Android project through the repository's supported Expo prebuild flow; do not hand-edit generated native files without a config-plugin/source-of-truth strategy.
   - Add a Kotlin React Native native view/module that hosts upstream `TerminalView` and the upstream terminal emulator/session implementation.
   - Implement lifecycle-safe session creation, resize, input, output events, Ctrl keys, process exit, foreground/background handling and cleanup.
   - Keep the terminal implementation behind a narrow native interface so the existing TypeScript app remains isolated from Termux internals.

3. **Self-contained Termux runtime**
   - Build and package the correct upstream bootstrap archives for the supported Android ABIs.
   - Rebuild/patch bootstrap and native package prefix assumptions for `com.binarycalculator.app`; do not reuse a `com.termux`-bound prefix blindly.
   - Install the bootstrap into Binary-Calc's private app files directory on first launch, with atomic extraction, checksum/signature verification, migration/version marker and recovery from interrupted installation.
   - Set the required `HOME`, `PREFIX`, `PATH`, `TMPDIR`, linker and `LD_PRELOAD` environment for the Termux execution model.
   - Preserve Termux's Android/Bionic execution model; do not claim a full GNU/Linux VM, root, systemd or kernel isolation.

4. **React Native / Expo integration**
   - Add an Expo config plugin for native Gradle, manifest, ABI packaging and Kotlin registration changes.
   - Add a Terminal route and navigation entry only after the native runtime passes a standalone Android smoke test.
   - Reuse upstream terminal rendering; do not create a replacement terminal emulator in JavaScript.
   - Keep all existing routes, settings, i18n, Supabase remote management, notifications, OCR, calculator and learning features unchanged.

5. **Package management and persistence**
   - Verify `pkg` / `apt` against the correct Termux repositories and supported Android ABI.
   - Store the user prefix and installed packages in app-private persistent storage.
   - Define backup/restore and app-upgrade migration behavior before release.
   - Clearly document that uninstalling Binary-Calc removes its private Linux environment unless the user exports a backup.

## Security boundaries

- The shell executes arbitrary commands with Binary-Calc's Android app UID and permissions. It is not a sandbox and does not provide root.
- Do not expose Supabase service-role keys, FCM server credentials, signing keys, or other app secrets to the shell environment.
- Do not grant broad storage, microphone, camera or notification access merely to make the terminal work. Add only permissions with a reviewed user-facing reason.
- Keep app-private runtime data separate from the existing remote-device/file-management feature.
- Do not silently execute commands from remote-control messages. Terminal input must be directly user initiated unless a separately reviewed, explicit authorization model is added.
- Handle process limits, Android phantom-process restrictions, battery optimization and app lifecycle behavior; report limitations rather than promising uninterrupted daemons.

## GPL-3.0 compliance work

Before importing or distributing upstream code:
- Add the complete applicable GPL-3.0 license text and preserve upstream copyright notices.
- Add a third-party notices / source manifest identifying each upstream component and exact version/commit.
- Publish the corresponding source code and build/install scripts for the distributed GPL-covered binaries in a GPL-compliant way.
- Keep modifications to GPL-covered components clearly marked.
- Audit dependencies and bootstrap package licenses individually; the user's GPL-3.0 acceptance does not replace this component-by-component audit.

## Required validation gates

Do not merge this feature until all gates pass:

- Clean Android install with no Termux app installed.
- First-run bootstrap installation and recovery after forced process termination.
- Shell basics: `pwd`, `ls`, `echo`, environment variables, pipes, redirection, Ctrl-C, interactive shell and terminal resize.
- `pkg update`, install and execute at least Python and Git from the matching Termux repositories.
- Persistence after force-stop, reboot and Binary-Calc upgrade.
- Supported ABI coverage (at minimum the actual target devices' ABI; universal APK only if size and packaging checks pass).
- No regression in existing Expo routes, typecheck, lint, unit tests, Expo Doctor and Android release build.
- APK/AAB size and first-install storage measurements.
- GPL/source-offer and third-party notice review.

## Current known constraints

- The checked branch uses Expo SDK 58 / React Native 0.88.1 and currently has no committed `android/` directory.
- The existing Android package ID is `com.binarycalculator.app`.
- The repository's `app.json` already defines permissions, plugins and Google Services configuration. Native integration must preserve them.
- The existing PR #6 branch remains separate; this work is on a new feature branch and must not be merged into `main` or PR #6 automatically.
- This plan does not yet constitute a working terminal implementation.

## First implementation milestone

Create a reproducible upstream pin and licensing manifest, add the Expo config-plugin/native skeleton without changing existing app behavior, then build a minimal debug APK. Only after that APK launches cleanly should the bootstrap/runtime be introduced. This staged approach isolates native build failures from shell/runtime failures.
