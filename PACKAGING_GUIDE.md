# Budget Pro — Standalone Android APK & Windows Desktop (.exe) Packaging Guide

This guide explains how to generate standalone native executables (**Android .apk** and **Windows .exe**) from Budget Pro.

---

## Method 1: Instant Online APK & Windows EXE (Recommended — No SDKs Needed)

Because Budget Pro is a fully compliant Progressive Web App (PWA) with complete offline caching, manifest, and icons, you can generate ready-to-install Android APKs and Windows Store/Desktop packages in 60 seconds without installing Android Studio, Java, or C++ compilers.

### Generating Android APK via PWABuilder (Official Microsoft Tool):
1. Copy your application URL:
   ```
   https://ais-pre-nkp2yksv7yh33bjiehdkdh-678544913864.europe-west2.run.app
   ```
2. Navigate to [PWABuilder.com](https://www.pwabuilder.com).
3. Paste the URL and click **Start**.
4. PWABuilder analyzes the manifest, service worker, and icons (Budget Pro scores 100% PWA compliance).
5. Click **Package for Stores** -> **Android**.
6. Select **Generate APK / AAB** and download your compiled, signed APK package.
7. Transfer the `.apk` file to any Android phone and tap to install!

---

## Method 2: Local Android APK via Capacitor

If you want to compile directly using Android Studio / Gradle on your computer:

### 1. Install Capacitor Dependencies
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 2. Initialize Android Platform
```bash
npx cap add android
```

### 3. Build Web Assets & Synchronize
```bash
npm run build
npx cap sync android
```

### 4. Build the APK
Open the Android project in Android Studio:
```bash
npx cap open android
```
Inside Android Studio:
- Select **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
- Or run in terminal:
  ```bash
  cd android && ./gradlew assembleDebug
  ```
The compiled APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## Method 3: Standalone Windows Desktop App (.exe) via Electron

Budget Pro includes ready-to-run Electron configuration files (`electron/main.cjs`, `electron/preload.cjs`, `electron-builder.yml`).

### 1. Install Electron & Builder DevDependencies
```bash
npm install -D electron electron-builder
```

### 2. Test in Desktop Window Locally
```bash
npm run build
npx electron electron/main.cjs
```

### 3. Generate Windows .exe (Installer & Portable)
```bash
npm run build:electron
```
Electron-Builder will create:
- `release/Budget Pro Setup 1.0.0.exe` (Standard Windows installer with desktop shortcut)
- `release/Budget Pro 1.0.0.exe` (Standalone portable single-file executable requiring no installation)

---

## Method 4: Standalone Desktop WebApp via Chrome / Edge Native Wrapper

On Windows, macOS, or ChromeOS:
1. Open Budget Pro in Chrome, Edge, or Brave.
2. In the browser address bar, click the **Install Budget Pro** icon (or in the app, click **Install App on Desktop** in the left sidebar).
3. Budget Pro creates a dedicated desktop executable shortcut on your Windows Desktop and Start Menu that runs in an isolated native window without browser toolbars.
