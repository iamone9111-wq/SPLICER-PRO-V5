import JSZip from 'jszip';
import { ANDROID_CODE_FILES } from '../data/androidCodebase';

export async function generateAndroidProjectZip(): Promise<Blob> {
  const zip = new JSZip();

  // Root project files
  zip.file('settings.gradle.kts', `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "VideoWallSplicer"
include(":app")
`);

  zip.file('build.gradle.kts', `plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}
`);

  zip.file('gradle/libs.versions.toml', `[versions]
agp = "8.4.1"
kotlin = "1.9.23"
coreKtx = "1.13.1"
junit = "4.13.2"
junitVersion = "1.1.5"
espressoCore = "3.5.1"
appcompat = "1.6.1"
material = "1.12.0"
media3 = "1.3.1"
coroutines = "1.8.0"
serialization = "1.6.3"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-appcompat = { group = "androidx.appcompat", name = "appcompat", version.ref = "appcompat" }
material = { group = "com.google.android.material", name = "material", version.ref = "material" }
media3-exoplayer = { group = "androidx.media3", name = "media3-exoplayer", version.ref = "media3" }
media3-ui = { group = "androidx.media3", name = "media3-ui", version.ref = "media3" }
media3-common = { group = "androidx.media3", name = "media3-common", version.ref = "media3" }
kotlinx-coroutines = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }
kotlinx-serialization = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "serialization" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
`);

  // Add all code files
  for (const file of ANDROID_CODE_FILES) {
    zip.file(file.path, file.code);
  }

  zip.file('gradle.properties', `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
`);

  zip.file('gradle/wrapper/gradle-wrapper.properties', `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);

  zip.file('app/proguard-rules.pro', `# Proguard rules
-keep class com.videowall.splicer.network.** { *; }
-keepclassmembers class * {
    @kotlinx.serialization.Serializable *;
}
`);

  zip.file('app/src/main/res/xml/data_extraction_rules.xml', `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <include domain="root" path="."/>
    </cloud-backup>
    <device-transfer>
        <include domain="root" path="."/>
    </device-transfer>
</data-extraction-rules>
`);

  zip.file('app/src/main/res/xml/backup_rules.xml', `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <include domain="sharedpref" path="."/>
</full-backup-content>
`);

  zip.file('app/src/main/res/values/strings.xml', `<resources>
    <string name="app_name">Video Wall Splicer</string>
</resources>
`);

  zip.file('app/src/main/res/values/colors.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="black">#FF000000</color>
    <color name="white">#FFFFFFFF</color>
    <color name="primary">#3B82F6</color>
    <color name="primary_dark">#1D4ED8</color>
    <color name="accent">#10B981</color>
    <color name="background_dark">#0F172A</color>
</resources>
`);

  zip.file('app/src/main/res/values/themes.xml', `<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="Theme.VideoWallSplicer" parent="Theme.Material3.DayNight.NoActionBar">
        <item name="android:statusBarColor">#0F172A</item>
        <item name="android:navigationBarColor">#0F172A</item>
    </style>

    <style name="Theme.VideoWallSplicer.Fullscreen" parent="Theme.VideoWallSplicer">
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
    </style>
</resources>
`);

// Gradle Wrapper Properties
  zip.file('gradle/wrapper/gradle-wrapper.properties', `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.4-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);

  // GitHub Actions Workflow for automatic cloud APK compilation
  zip.file('.github/workflows/build-apk.yml', `name: Build Android APK

on:
  push:
    branches: [ "**" ]
  pull_request:
    branches: [ "**" ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Set up JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'

    - name: Setup Gradle
      uses: gradle/actions/setup-gradle@v4
      with:
        gradle-version: '8.7'
        cache-disabled: true

    - name: Accept Android SDK Licenses
      run: |
        yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses || true

    - name: Build Debug APK
      run: |
        echo "=== Repository file listing ==="
        ls -la

        # Search recursively for Android project root containing settings.gradle or build.gradle
        TARGET_DIR=$(find . -name "settings.gradle.kts" -o -name "settings.gradle" -o -name "build.gradle.kts" -o -name "build.gradle" | grep -v "/app/build" | head -n 1 | xargs dirname 2>/dev/null || true)

        if [ -n "$TARGET_DIR" ] && [ -d "$TARGET_DIR" ]; then
          echo "Found Android project at: $TARGET_DIR"
          cd "$TARGET_DIR"
        else
          echo "No settings.gradle found in repo root. Checking tree..."
          find . -maxdepth 3
        fi

        # Generate gradle wrapper
        gradle wrapper --gradle-version 8.7
        chmod +x gradlew

        ./gradlew assembleDebug --stacktrace --no-daemon --no-build-cache

    - name: Upload Debug APK
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: VideoWall-Splicer-Debug-APK
        path: '**/app/build/outputs/apk/debug/*.apk'
        if-no-files-found: warn
        retention-days: 30
`);

  // gradlew (Unix)
  zip.file('gradlew', `#!/bin/sh

# Attempt to set APP_HOME
# Resolve links: $0 may be a link
PRG="$0"
# Need this for relative symlinks.
while [ -h "$PRG" ] ; do
    ls=\`ls -ld "$PRG"\`
    link=\`expr "$ls" : '.*-> \\(.*\\)$'\`
    if expr "$link" : '/.*' > /dev/null; then
        PRG="$link"
    else
        PRG=\`dirname "$PRG"\`"/$link"
    fi
done
SAVED="\`pwd\`"
cd "\`dirname \\"$PRG\\"\`/" >/dev/null
APP_HOME="\`pwd -P\`"
cd "$SAVED" >/dev/null

APP_NAME="Gradle"
APP_BASE_NAME=\`basename "$0"\`

# Use the maximum available, or set MAX_FD != -1 to use that value.
MAX_FD="maximum"

warn () {
    echo "$*"
}

die () {
    echo
    echo "$*"
    echo
    exit 1
}

# OS specific support (must be 'true' or 'false').
cygwin=false
msys=false
darwin=false
nonstop=false
case "\`uname\`" in
  CYGWIN* ) cygwin=true ;;
  Darwin* ) darwin=true ;;
  MINGW* ) msys=true ;;
  NONSTOP* ) nonstop=true ;;
esac

CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar

# Determine the Java command to use to start the JVM.
if [ -n "$JAVA_HOME" ] ; then
    if [ -x "$JAVA_HOME/jre/sh/java" ] ; then
        JAVACMD="$JAVA_HOME/jre/sh/java"
    else
        JAVACMD="$JAVA_HOME/bin/java"
    fi
else
    JAVACMD="java"
fi

exec "$JAVACMD" "-Dorg.gradle.appname=$APP_BASE_NAME" -classpath "$CLASSPATH" org.gradle.wrapper.GradleWrapperMain "$@"
`);

  // gradlew.bat (Windows)
  zip.file('gradlew.bat', `@rem
@rem Copyright 2015 the original author or authors.
@rem
@if "%DEBUG%" == "" @echo off
@rem ##########################################################################
@rem
@rem  Gradle startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Resolve Java
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto execute

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

:execute
set CLASSPATH=%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar

"%JAVA_EXE%" "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
if "%ERRORLEVEL%"=="0" goto mainEnd

:fail
exit /b 1

:mainEnd
if "%OS%"=="Windows_NT" endlocal
`);

  // README.md with build instructions
  zip.file('README.md', `# Android Video Wall & Screen Splicing App

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
   \`app/build/outputs/apk/debug/app-debug.apk\`

---

### Option 2: Using Command Line (Terminal / CMD)

**On macOS / Linux:**
\`\`\`bash
chmod +x gradlew
./gradlew assembleDebug
\`\`\`

**On Windows:**
\`\`\`cmd
gradlew.bat assembleDebug
\`\`\`

The compiled APK file will be located at:
\`app/build/outputs/apk/debug/app-debug.apk\`

---

### Option 3: Automatic Cloud Build via GitHub Actions
1. Push this repository to GitHub.
2. The included \`.github/workflows/build-apk.yml\` will automatically trigger.
3. Go to the **Actions** tab on GitHub and download the \`VideoWall-Splicer-Debug-APK\` artifact directly to your phone!

---

## 📱 How to Install on Android Devices

### Via ADB (USB Cable):
\`\`\`bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
\`\`\`

### Via Phone Sideloading:
1. Send \`app-debug.apk\` to your Android device (via Google Drive, USB, WhatsApp, or LocalDrop).
2. Tap the APK on your device and enable **"Install from unknown sources"** when prompted.
3. Open **Video Wall Splicer**!

---

## 🌐 Running the Video Wall System
1. **Master Device (Host)**:
   - Connect to Wi-Fi (or turn on Mobile Hotspot).
   - Select **Host Video Wall (Master)**.
   - Note the displayed IP address (e.g., \`192.168.43.1\`).
   - Pick an MP4 video.

2. **Client Devices (Screens 2..N)**:
   - Connect to the same Wi-Fi / Hotspot.
   - Select **Join Video Wall (Screen)**.
   - Enter the Host IP and connect.

3. **Play**: Tap **Play Wall** on the Master device. All screens will start video playback at the exact millisecond synchronized by NTP!
`);

  // Add all code files
  for (const file of ANDROID_CODE_FILES) {
    zip.file(file.path, file.code);
  }

  // Generate blob
  return await zip.generateAsync({ type: 'blob' });
}
