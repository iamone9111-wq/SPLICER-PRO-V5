# Android Video Wall & Screen Splicing App

A high-performance Android application built with **Kotlin**, **AndroidX Media3 (ExoPlayer)**, **TCP Socket Server**, and **2D Affine TextureView Matrix Splicing**.

---

## 🚀 How to Build the APK File

### Option 1: Using Android Studio (Recommended)
1. Download and extract this project ZIP.
2. Open **Android Studio** (Hedgehog, Iguana, or Ladybug).
3. Click **File -> Open...** and select this directory.
4. Wait for Gradle sync to complete (JDK 17 required).
5. Click **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
6. The generated APK will be at:
   `app/build/outputs/apk/debug/app-debug.apk`

---

### Option 2: Using Command Line (Terminal / CMD)

**On macOS / Linux:**
```bash
chmod +x gradlew
./gradlew assembleDebug
```

**On Windows:**
```cmd
gradlew.bat assembleDebug
```

The compiled APK file will be located at:
`app/build/outputs/apk/debug/app-debug.apk`

---

### Option 3: Automatic Cloud Build via GitHub Actions
1. Push this repository to GitHub.
2. The included `.github/workflows/build-apk.yml` will automatically trigger.
3. Go to the **Actions** tab on GitHub and download the `VideoWall-Splicer-Debug-APK` artifact directly to your phone!

---

## 📱 How to Install on Android Devices

### Via ADB (USB Cable):
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Via Phone Sideloading:
1. Send `app-debug.apk` to your Android device (via Google Drive, USB, WhatsApp, or LocalDrop).
2. Tap the APK on your device and enable **"Install from unknown sources"** when prompted.
3. Open **Video Wall Splicer**!

---

## 🌐 Running the Video Wall System
1. **Master Device (Host)**:
   - Connect to Wi-Fi (or turn on Mobile Hotspot).
   - Select **Host Video Wall (Master)**.
   - Note the displayed IP address (e.g., `192.168.43.1`).
   - Pick an MP4 video.

2. **Client Devices (Screens 2..N)**:
   - Connect to the same Wi-Fi / Hotspot.
   - Select **Join Video Wall (Screen)**.
   - Enter the Host IP and connect.

3. **Play**: Tap **Play Wall** on the Master device. All screens will start video playback at the exact millisecond synchronized by NTP!
