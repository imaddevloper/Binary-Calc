<!--
  README IMAGE PLACEHOLDERS
  1) Add your app icon at: docs/image/icon.png
  2) Add an in-app screenshot at: docs/image/App.png
  Keep these paths, or update the image paths below to match your files.
-->

<p align="center">
  <img src="docs/image/icon.png" alt="Binary-Calc app icon" width="160" />
</p>

<h1 align="center">Binary-Calc</h1>

<p align="center">
  <strong>A practical, offline-friendly toolkit for number systems, binary arithmetic, and IPv4 learning.</strong>
</p>

<p align="center">
  <a href="https://github.com/imaddevloper/Binary-Calc">
    <img src="https://img.shields.io/badge/Platform-Android-3DDC84?logo=android&logoColor=white" alt="Android" />
  </a>
  <img src="https://img.shields.io/badge/Framework-Expo%20%2F%20React%20Native-4630EB?logo=expo&logoColor=white" alt="Expo and React Native" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Languages-English%20%7C%20Arabic-0A7E8C" alt="English and Arabic" />
  <img src="https://img.shields.io/badge/Mode-Offline%20Friendly-2E8B57" alt="Offline friendly" />
</p>

<p align="center">
  <a href="#overview">Overview</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="#features">Features</a> ·
  <a href="#privacy--permissions">Privacy</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#testing">Testing</a>
</p>

---

## Overview

**Binary-Calc** is an Android-first educational and utility application built with **Expo, React Native, and TypeScript**. It brings together number-system conversion, binary arithmetic, IPv4 analysis, image-based IPv4 text recognition, networking lessons, practice challenges, and local calculation history in one mobile experience.

The application is designed for students and anyone learning computer science, networking, or cybersecurity fundamentals. It focuses on clear results, step-by-step explanations, strict input validation, and practical exercises rather than presenting unexplained answers.

Core calculations and locally available learning content are designed to work **without an internet connection**. Online OCR is an optional service and is used only after the user chooses that recognition method.

## Screenshots

> **Add your application screenshot:** place an image of the app interface at `docs/image/App.png`. You can replace this path with your preferred filename.

<p align="center">
  <img src="docs/image/App.jpg" alt="Binary-Calc application interface preview — replace with an actual app screenshot" width="320" />
</p>

<p align="center">
  <sub>Replace the placeholder above with a real screenshot captured from the application.</sub>
</p>

## Features

### 1. Number-system converter

Convert whole numbers between the following number systems:

- **Binary (base 2)**
- **Decimal (base 10)**
- **Hexadecimal (base 16)**

The conversion engine uses JavaScript `BigInt` to handle large integer values without floating-point precision loss.

Highlights:

- Clear conversion results.
- Step-by-step conversion explanations.
- Support for large values, up to the limits enforced by the application.
- Negative values represented as a sign plus magnitude.
- Input normalization for supported prefixes and separators.
- Configurable result formatting through application settings.

### 2. Binary arithmetic

Practice and calculate common binary operations:

- Addition.
- Subtraction.
- Multiplication.
- Division.

The application can display the calculation process, including carries, borrows, partial products, and remainders where applicable. Binary arithmetic uses non-negative operands; negative mathematical results are represented as signed results rather than silently wrapping to a fixed-width value.

### 3. IPv4 analyzer

Inspect and understand an IPv4 address with a structured breakdown.

The analyzer includes:

- Strict dotted-decimal IPv4 validation.
- Four-octet binary representation.
- 32-bit and hexadecimal representations.
- Address-range classification using a CIDR-based special-purpose range table.
- Explanations that help learners understand the address structure.

The classification is deliberately careful: an address not found in a listed special-purpose range is **not automatically guaranteed to be publicly reachable**.

> **Scope note:** this analyzer focuses on IPv4 inspection and classification. Do not interpret it as a full subnet-planning or network-scanning tool.

### 4. Image-based IPv4 text recognition (OCR)

Use the device camera or select an image from the gallery to extract possible IPv4 addresses.

Recognition flow:

1. Open the scanner.
2. Capture an image or select one from the gallery.
3. Choose the available recognition method.
4. Review the extracted text and suggested IPv4 candidates.
5. Confirm or edit the candidate before analysis.

OCR capabilities include:

- Optional online vision recognition through the project's Vercel API endpoint.
- On-device text recognition through Google ML Kit where supported.
- Candidate extraction and strict IPv4 validation.
- Suggestions for common OCR character confusions, displayed for user review.
- Loading, validation, and error handling.

The app does not treat OCR output as automatically trusted input. The user can review and edit the extracted address before continuing.

### 5. Networking lessons and practice challenges

Learn through structured lessons and interactive practice.

The current learning content includes **17 lessons**, covering number systems, binary concepts, and introductory networking topics, together with practice challenges and explanations.

Learning features include:

- Guided lesson content.
- Exercises and knowledge checks.
- Challenge questions with answer validation.
- Explanations and hints.
- Progress information stored locally.

### 6. Local calculation history

Review previous activity without needing an online account.

- Calculation and analysis history is stored locally.
- History is limited to the most recent 200 items.
- Local history is designed to remain available between application sessions.

### 7. English and Arabic

The application provides English and Arabic interface text.

- Language selection is available in Settings.
- The selected language is saved locally.
- Technical values such as IPv4 addresses, binary strings, hexadecimal values, and formulas retain left-to-right presentation to avoid reversing important notation in Arabic text.

### 8. Light and dark themes

Choose the preferred appearance:

- Light.
- Dark.
- System preference.

The application includes a circular-reveal theme transition concept and a reduced-motion option. Theme behavior and animation smoothness should be verified on a physical Android device for the target release.

---

## Screenshots and assets

Keep project images in a dedicated folder so the README remains easy to maintain.

Suggested structure:

```text
docs/
└── images/
    ├── icon.png
    └── App.png
```

- `icon.png`: the application icon displayed at the top of this README.
- `App.png`: a genuine screenshot showing the application interface.

Use screenshots captured from the actual application. Avoid mockups that could misrepresent the shipped UI.

## Technology stack

| Area | Technology |
|---|---|
| Mobile framework | Expo |
| UI framework | React Native |
| Programming language | TypeScript |
| Navigation | Expo Router |
| Local persistence | Expo SQLite |
| Animation | React Native Reanimated |
| Theme transition capture | React Native View Shot |
| Camera | Expo Camera |
| Image selection | Expo Image Picker |
| On-device text recognition | Expo Text Extractor / Google ML Kit on supported Android builds |
| Online OCR API | Vercel serverless endpoint |
| Online vision provider | OpenAI API, called by the server-side endpoint |
| Testing | Node.js test runner and TypeScript test files |

The project uses Expo-compatible native modules. Features that depend on native modules, including on-device text recognition, require an appropriate development or production build; Expo Go may not include every native capability.

## Project structure

The repository is organized by application routes, reusable UI, feature modules, core logic, and services.

| Directory / file | Responsibility |
|---|---|
| `app/` | Expo Router screens and navigation |
| `src/core/` | Reusable calculation, validation, IPv4, and challenge logic |
| `src/components/` | Shared UI components |
| `src/features/` | Feature-specific screens and UI |
| `src/i18n/` | English and Arabic translations |
| `src/theme/` | Theme state, tokens, and theme transition logic |
| `src/storage/` | Local SQLite persistence |
| `src/services/ocr/` | OCR service integration and recognition flow |
| `api/` | Server-side API routes, including online OCR |
| `tests/` | Automated tests for core behavior |

## Privacy & permissions

Binary-Calc is designed to keep its core learning and calculation features local.

### Local data

The application stores supported preferences and learning/activity data locally, including:

- Theme preference.
- Language preference.
- Calculator settings.
- Recent history (up to 200 items).
- Challenge score and lesson progress.

There is no application account requirement for these local features.

### Camera and gallery

- Camera access is requested when the user enters the scanner and chooses to use the camera.
- Gallery images are selected through the Android system photo picker.
- The application does not request broad storage access for normal gallery selection.
- The application does not save the original scan image as a user-visible permanent file.

### Online OCR

Online OCR is optional. When the user chooses it, the selected or captured image is sent to the configured Vercel OCR endpoint, which communicates with the OpenAI API for recognition.

- The OpenAI API key must remain on the server as a Vercel environment variable.
- Never place API secrets in the Android application, repository, or public documentation.
- On-device recognition is available as a local alternative where supported.
- Users should review extracted text before using a suggested address.

Network access is required for online OCR and for opening external learning references. Core calculations and locally available lessons do not depend on online OCR.

## Getting started

### Requirements

Install the tools required for Expo and Android development:

- Node.js (use a version supported by the project's Expo SDK).
- npm.
- Android Studio and Android SDK for local Android builds.
- A physical Android device or Android emulator for runtime testing.

### Install dependencies

Clone the repository and install the project dependencies:

```bash
git clone https://github.com/imaddevloper/Binary-Calc.git
cd Binary-Calc
npm install
```

If the repository's dependency setup requires Expo-managed package alignment, use the Expo installer and follow the versions specified by the project's SDK:

```bash
npx expo install --check
npx expo-doctor
```

### Start the development server

```bash
npx expo start
```

### Run on Android

For a local native Android build:

```bash
npx expo run:android
```

Native functionality such as on-device OCR requires a development build containing the corresponding native modules. Expo Go may be sufficient for parts of the interface, but it should not be assumed to support every native feature.

## Available npm scripts

| Command | Purpose |
|---|---|
| `npm start` | Start the Expo development server |
| `npm run android` | Build and run the Android application locally |
| `npm run dev-client` | Start Metro for a development client |
| `npm test` | Run the automated test suite |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run check-deps` | Check Expo dependency compatibility |
| `npm run doctor` | Run Expo Doctor |

## Testing

Run the project checks before submitting changes:

```bash
npm test
npm run typecheck
npm run lint
npm run check-deps
npm run doctor
npx expo config --type public
```

The automated test suite covers core calculation and validation behavior, including number conversion, binary arithmetic, IPv4 validation and classification, OCR candidate handling, challenge logic, lesson exercises, and translation integrity.

Automated tests do not replace device testing. Camera permissions, gallery selection, native OCR, theme animation, system bars, navigation, and persistence should also be checked on a real Android device or a suitable emulator.

## Build notes

The project includes EAS build configuration. Review `eas.json` and the current Expo configuration before producing a release.

Typical EAS commands are:

```bash
npm install --global eas-cli
eas login

# Development build
eas build --profile development --platform android

# Preview build
eas build --profile preview --platform android

# Production build
eas build --profile production --platform android
```

A build command being available does not mean that a release artifact has already been produced. Check the actual build result and test the generated APK/AAB before distribution.

## Development principles

Contributions and maintenance work should follow these principles:

- Preserve existing features and user data.
- Keep calculation and validation logic independent from presentation.
- Prefer reusable, typed components.
- Keep translations complete in both supported languages.
- Keep secrets out of the mobile client and Git history.
- Preserve offline behavior for local functionality.
- Validate changes with automated checks and device testing.
- Document limitations honestly rather than presenting unverified behavior as complete.

## Current limitations

The following areas require device-level verification before a production release:

- Theme-transition smoothness and absence of visual flashing across screens and system bars.
- Camera and gallery behavior on supported Android versions.
- On-device OCR availability in the selected native build.
- Online OCR configuration, connectivity, and server-side rate limiting.
- Arabic text rendering and mixed-direction technical values on different devices.
- Animation performance on lower- and mid-range Android hardware.

Feature availability can vary by build type and device. Check the current implementation and release notes before relying on a native capability.

## License

No license terms are declared here. Unless a license file is added to the repository, all rights remain with the copyright holder and reuse should not be assumed to be permitted.

---

<p align="center">
  <strong>Binary-Calc</strong><br />
  <sub>Understand the numbers. Understand the network.</sub>
</p>
