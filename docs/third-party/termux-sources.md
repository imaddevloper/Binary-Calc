# Termux upstream source and licensing manifest

This is the initial source pin for the embedded Termux investigation. It does not mean that upstream code has already been vendored or linked into Binary-Calc.

## Pinned upstream revision

- Repository: https://github.com/termux/termux-app
- Revision: `8629e632fcb95da272221be327db653fb24befe9`
- Revision URL: https://github.com/termux/termux-app/commit/8629e632fcb95da272221be327db653fb24befe9
- Audited source date: 2026-11-13
- Do not use a floating `master-SNAPSHOT` or unpinned dependency in release builds.

## Components identified

| Component | Upstream location | License note | Planned use |
|---|---|---|---|
| Termux Android app/runtime integration | `app/` | GPL-3.0-only per upstream `LICENSE.md` | Reference/fork selected installer, lifecycle and runtime integration code as required |
| Terminal emulator | `terminal-emulator/` | Apache-2.0 exception identified by upstream `LICENSE.md` | Upstream terminal emulator and PTY/session implementation |
| Terminal view | `terminal-view/` | Apache-2.0 exception identified by upstream `LICENSE.md` | Upstream Android terminal view |
| Shared utilities | `termux-shared/` | Mixed; see `termux-shared/LICENSE.md`, including GPLv3-only exceptions for `com/termux/shared/termux/*` | Use only required classes after per-file license review |
| Bootstrap and packages | https://github.com/termux/termux-packages | Each package has its own license; bootstrap archives must be audited as a collection | Rebuild bootstrap for Binary-Calc's package ID and prefix |

## Primary upstream references

- App license: https://github.com/termux/termux-app/blob/8629e632fcb95da272221be327db653fb24befe9/LICENSE.md
- Shared library license: https://github.com/termux/termux-app/blob/8629e632fcb95da272221be327db653fb24befe9/termux-shared/LICENSE.md
- Termux libraries and integration guidance: https://github.com/termux/termux-app/wiki/Termux-Libraries
- Termux app repository and bootstrap overview: https://github.com/termux/termux-app
- Termux package/bootstrap repository: https://github.com/termux/termux-packages

## Compliance checklist before distribution

- [ ] Download and retain the exact upstream license texts and copyright notices for every imported source file.
- [ ] Audit the complete bootstrap archive and every included package license.
- [ ] Mark all local modifications to GPL-covered source files.
- [ ] Provide the corresponding source, build scripts and installation scripts for GPL-covered distributed binaries.
- [ ] Add a user-visible third-party notices screen or document.
- [ ] Confirm all included dependencies are compatible with the combined distribution.
- [ ] Have the final source-offer/distribution method reviewed before publishing a release.

The app-level GPL-3.0-only license does not mean every file in the upstream repository has the same license. License obligations must be tracked per component and, where required, per source file/package.
