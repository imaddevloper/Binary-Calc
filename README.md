# Binary Calculator

Android-first React Native (Expo + TypeScript) app for learning and using number systems:
Base 2 / 10 / 16 conversion with real step-by-step explanations, binary arithmetic, an IPv4 analyzer,
camera/gallery IPv4 text recognition, 17 lessons, practice challenges and a local history.
English and Arabic; technical input and values remain LTR. Light and Dark themes with a circular reveal transition.
Core calculations and lessons work **offline**. After the user explicitly chooses online OCR, the selected/captured image is sent to the project's Vercel OCR endpoint and then to OpenAI. The user can choose on-device OCR instead. If the service is unavailable, on-device ML Kit is used when supported. There is no account or analytics.

> **Honest status.** The calculation engine and the localization are covered by automated tests that were
> run (see "Verified so far"). The React Native UI was written but **has not been compiled or run on a device
> or emulator yet** — the authoring environment had no network access, so dependencies could not be installed.
> Follow the setup below, then run the checks; expect to fix a few compile-time details. See "Known limitations".

## Versions

- **Expo SDK 58** — the latest stable SDK when this project was started (released 15 Oct 2026, React Native 0.88 per the
  official changelog: https://expo.dev/changelog/sdk-58). `package.json` pins only `expo`; every other package is added with
  `npx expo install`, which picks the exact versions Expo supports for SDK 58 and writes them (and the lockfile) for you.
- Node.js: use the version required by SDK 58 (see https://docs.expo.dev/get-started/installation/). I did not confirm
  the exact minimum — a current LTS release is the safe choice.

## Setup

```bash
cd binary-calculator
npm install                       # installs `expo`

# Expo-managed packages: versions are chosen for SDK 58
npx expo install expo-router react-native-reanimated react-native-worklets react-native-safe-area-context \
  react-native-screens react-native-view-shot expo-camera expo-image-picker expo-image-manipulator \
  expo-clipboard expo-haptics expo-localization expo-sqlite expo-splash-screen expo-status-bar \
  expo-constants expo-font expo-linking expo-system-ui expo-text-extractor @expo/vector-icons \
  @expo-google-fonts/cairo @expo-google-fonts/jetbrains-mono

npx expo install -- --save-dev typescript @types/react eslint eslint-config-expo

npx expo install --check          # dependency compatibility
npx expo-doctor                   # project health (resolve any warning it reports)
npm run typecheck                 # tsc --noEmit
npm run lint                      # expo lint
npm test                          # unit tests (no install needed beyond Node)
```

If `expo-doctor` reports a missing peer dependency (for example a navigation package that `expo-router` needs), install it
with `npx expo install <name>`.

## Run

Text recognition uses a native module, so use a **development build** (Expo Go cannot load it):

```bash
npx expo run:android              # local build (needs Android SDK) — or use EAS below
npm run dev-client                # start Metro for the installed development build
```

Everything except the text-recognition step also works in Expo Go; the scanner then explains that on-device text recognition
is unavailable and offers manual entry.

### EAS builds

```bash
npm i -g eas-cli && eas login
eas build --profile development --platform android   # development client APK
eas build --profile preview     --platform android   # installable release APK
eas build --profile production  --platform android   # Play Store AAB
```

No APK/AAB has been built by me; these are the supported commands from `eas.json`.

## Tests

```bash
npm test      # node --experimental-strip-types --test tests/*.test.ts
```

Covers: base parsing/formatting, conversion tables, large integers, negative values, step generators, bit breakdown,
binary arithmetic (carries, borrows, partial products, remainders, division by zero), strict IPv4 validation, 32-bit and
hex output, CIDR classification boundaries, OCR candidate extraction and validation, challenge generation and answer checking,
lesson exercises, and translation integrity (same keys, same placeholders, every used key exists).
UI/integration flows (navigation, theme reveal, permissions, clipboard, restart persistence) need a device and are **not automated**.

## Features and where they live

| Feature | Location |
| --- | --- |
| Conversion + arithmetic + IPv4 + challenge logic (pure, no UI) | `src/core/*` |
| Screens (Expo Router) | `app/` (`(tabs)`: Home, Calculator, IPv4, Learning, History; plus Settings, Help, Scanner, Lesson) |
| Reusable components | `src/components/` |
| Feature UI | `src/features/*` |
| English / Arabic dictionaries | `src/i18n/en.ts`, `src/i18n/ar.ts` (Arabic is typed against the English key set) |
| Theme, circular reveal | `src/theme/` |
| SQLite storage (versioned) | `src/storage/` |
| OCR adapter | `src/services/ocr/` |

### Number model

Whole numbers only (BigInt, no floating point). Max 256 digits. A leading `-` is allowed and shown as sign + magnitude
(not two's complement). Binary accepts spaces/`_`/`0b`; hex accepts `0x`; results are uppercase unless changed in Settings.
Binary arithmetic uses non-negative operands; a result below zero is shown as a signed mathematical value (never wrapped).

### IPv4

Strict dotted-decimal validation: four octets of 1–3 digits, 0–255, no signs/letters/spaces, and **leading zeros are rejected**
(never read as octal). Each octet is shown as exactly 8 bits; the 32-bit value uses unsigned arithmetic. Classification uses a
CIDR table with longest-prefix matching (private-use, shared/CGNAT, loopback, link-local, documentation, benchmarking, multicast,
reserved, limited broadcast, unspecified, …). Anything not in the table is "not in a listed special-purpose range" —
**not** "public and reachable". Classful labels are shown as historical/educational only. No subnet/CIDR calculator is included.

## Permissions and privacy

- `CAMERA` — requested only when the scanner opens and the user taps "Allow camera". Images may be sent to the Vercel OCR endpoint and OpenAI for online recognition; when online OCR is unavailable, ML Kit processes them on-device. The app does not save the source image.
- Gallery import uses the Android system photo picker; no storage permission is requested. Storage/media/microphone permissions are blocked in `app.json`.
- Stored locally (SQLite): theme, language, calculator preferences, history (max 200 items), challenge score, lesson progress.
- Online OCR makes a network request to the configured Vercel endpoint. The OpenAI API key is stored only as a Vercel environment variable and must never be embedded in the mobile app.

## OCR

Online vision OCR is attempted first through the Vercel endpoint. When it fails or is unavailable, `expo-text-extractor` (Google ML Kit on Android, on-device) is used as a fallback. The OpenAI API key is stored on Vercel, never in the app.
Recognized text is parsed into IPv4 candidates; common confusions (`O→0`, `l/I/|→1`, `,→.`) are *suggested*, flagged and shown with the
original text; the user must review/edit, and the same strict validator as manual entry decides whether analysis can proceed.
No confidence value is shown because the library does not provide one. I have not run it on a device.

## Language, RTL and theme

- Language is chosen on first launch from the device language, then only by the user (Settings). It is stored and applied in-app, without a restart:
  the app keeps a consistent left-to-right layout for controls while Arabic text is localized; technical values remain left-to-right. Technical values (IPs, binary, hex, formulas) are
  isolated left-to-right with Unicode isolates and a monospace font, so they never reverse in Arabic.
- Theme: Light / Dark / System, stored in SQLite and loaded **before** the first frame (the native splash is held until preferences and fonts are ready).
  The header button photographs the old look, switches the theme underneath, photographs the new look, and grows a circle from the button that
  reveals the new photo (`react-native-view-shot` + Reanimated). With "Reduce motion" (app setting or Android "Remove animations") the theme changes instantly.

## Splash

The native splash (Expo config, `#0B0B0F` with the icon) hands over to an in-app intro with the same background: icon centred, name beneath, a progress line,
6 seconds in total (0.5 s background, 1 s icon, 1 s name, 3 s progress, 0.5 s fade). It plays once per cold start, not on resume.

## Known limitations

- UI code, camera, online/offline OCR, SQLite, clipboard, haptics, Arabic shaping and the circular reveal must pass a real Android device test before release.
- Image crop is not implemented (rotate and retake are); the picked/captured image is only held in memory/cache by the platform and is never saved by the app.
- Tab and stack transitions use fades; they do not mirror slide direction in RTL.
- Keyboard: binary/decimal use the numeric keypad (no space, `_` or `0b` keys there; pasted text still works); hex uses the normal keyboard.
- Arabic strings were written carefully but have not been reviewed by a native speaker.
- No subnet calculator, no two's-complement mode, no fractions.
