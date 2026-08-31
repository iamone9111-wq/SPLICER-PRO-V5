import React, { useState } from 'react';
import {
  Download,
  Terminal,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  Github,
  PlayCircle,
  ShieldAlert,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  FolderArchive,
  ExternalLink
} from 'lucide-react';

interface ApkBuilderGuideProps {
  onDownloadProject: () => void;
  isDownloading: boolean;
}

export const ApkBuilderGuide: React.FC<ApkBuilderGuideProps> = ({
  onDownloadProject,
  isDownloading,
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'studio' | 'cli' | 'github'>('studio');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const cliMacLinux = `chmod +x gradlew\n./gradlew assembleDebug`;
  const cliWindows = `gradlew.bat assembleDebug`;
  const adbInstallCmd = `adb install -r app/build/outputs/apk/debug/app-debug.apk`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-200">
      {/* Top Banner / Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">
              Android APK Build & Distribution Hub
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Ready to Compile
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Generate and package the native Kotlin <strong className="text-slate-200">app-debug.apk</strong> for Android phones, tablets, or TV boxes. Includes AndroidX Media3 ExoPlayer, Coroutine TCP socket server, and TextureView hardware matrix splicing.
          </p>
        </div>

        <button
          onClick={onDownloadProject}
          disabled={isDownloading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-3 rounded-lg transition-colors disabled:opacity-50 shadow-md shrink-0"
        >
          <FolderArchive className="w-4 h-4" />
          <span>{isDownloading ? 'Packaging Project...' : 'Download Project (.ZIP)'}</span>
        </button>
      </div>

      {/* APK Metadata & Target Specs Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Package ID</div>
          <div className="text-xs font-mono font-semibold text-slate-200 truncate">com.videowall.splicer</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Target SDK</div>
          <div className="text-xs font-mono font-semibold text-indigo-400">Android 14 (API 34)</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Min SDK</div>
          <div className="text-xs font-mono font-semibold text-slate-300">Android 7.0 (API 24+)</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Target Output</div>
          <div className="text-xs font-mono font-semibold text-emerald-400 truncate">app-debug.apk</div>
        </div>
      </div>

      {/* Compilation Method Selector Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Choose Your APK Compilation Method
            </h3>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setSelectedMethod('studio')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                selectedMethod === 'studio'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Android Studio (GUI)
            </button>
            <button
              onClick={() => setSelectedMethod('cli')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                selectedMethod === 'cli'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terminal (Gradle CLI)
            </button>
            <button
              onClick={() => setSelectedMethod('github')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                selectedMethod === 'github'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              GitHub Cloud CI/CD
            </button>
          </div>
        </div>

        {/* Method 1: Android Studio */}
        {selectedMethod === 'studio' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-300">
              The recommended visual workflow. Android Studio automatically downloads Android SDK 34, JDK 17, and dependencies.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-indigo-400">
                  <span>STEP 01</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-medium text-white">Download & Extract</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click <strong>Download Project (.ZIP)</strong> above and unzip the contents to your development folder.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-indigo-400">
                  <span>STEP 02</span>
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-medium text-white">Open in Studio</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Launch <strong>Android Studio</strong> (Ladybug / Hedgehog) and select <strong>File → Open...</strong>, choosing the unzipped directory.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-indigo-400">
                  <span>STEP 03</span>
                  <PlayCircle className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-medium text-white">Build APK(s)</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  In top menu bar, click <strong>Build → Build Bundle(s) / APK(s) → Build APK(s)</strong>.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
                  <span>STEP 04</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-medium text-emerald-300">Locate APK File</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click <strong>"locate"</strong> in the bottom-right popup to open <code className="text-slate-300 font-mono text-[10px]">app-debug.apk</code>.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-black border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between">
              <span className="text-slate-400">Default Output Path: <span className="text-emerald-400">app/build/outputs/apk/debug/app-debug.apk</span></span>
            </div>
          </div>
        )}

        {/* Method 2: Gradle CLI */}
        {selectedMethod === 'cli' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-300">
              Direct terminal compilation using the pre-configured Gradle Wrapper scripts included in the project ZIP.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* macOS / Linux */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">macOS / Linux Command</span>
                  <button
                    onClick={() => copyToClipboard(cliMacLinux, 'cli-mac')}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedCmd === 'cli-mac' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCmd === 'cli-mac' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3 bg-black rounded font-mono text-xs text-indigo-300 border border-slate-800">
                  <pre>{cliMacLinux}</pre>
                </div>
              </div>

              {/* Windows */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">Windows (CMD / PowerShell)</span>
                  <button
                    onClick={() => copyToClipboard(cliWindows, 'cli-win')}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedCmd === 'cli-win' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCmd === 'cli-win' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3 bg-black rounded font-mono text-xs text-indigo-300 border border-slate-800">
                  <pre>{cliWindows}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Method 3: GitHub Actions Cloud Build */}
        {selectedMethod === 'github' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-300">
              No Android Studio or local JDK needed! Push the project to GitHub, and the included workflow compiles the APK in the cloud.
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Github className="w-4 h-4 text-indigo-400" />
                <span>Pre-configured Cloud Workflow: <code className="text-indigo-300 font-mono">.github/workflows/build-apk.yml</code></span>
              </div>
              <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Create a new repository on <strong className="text-slate-200">GitHub</strong> and push this extracted project.</li>
                <li>The GitHub Actions bot automatically triggers on commit and boots an Ubuntu Android SDK runner.</li>
                <li>Go to the <strong className="text-slate-200">"Actions"</strong> tab in your repository and click the latest workflow run.</li>
                <li>Download the ready-to-use <strong className="text-emerald-400">VideoWall-Splicer-Debug-APK</strong> artifact zip containing <code className="text-slate-200 font-mono">app-debug.apk</code>!</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Sideloading & Installation to Physical Android Hardware */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-indigo-400" />
          Installing the APK on Android Phones & Tablets
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Method A: ADB Command */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Method A: Fast ADB USB Sideload</span>
              <button
                onClick={() => copyToClipboard(adbInstallCmd, 'adb-cmd')}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
              >
                {copiedCmd === 'adb-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd === 'adb-cmd' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Connect your Android phone with USB Debugging enabled and run:
            </p>
            <div className="p-2.5 bg-black rounded font-mono text-xs text-emerald-400 border border-slate-800 break-all">
              {adbInstallCmd}
            </div>
          </div>

          {/* Method B: Direct File Sideload */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-white">Method B: Direct File Share / AirDrop Alternative</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              1. Transfer <code className="text-slate-300 font-mono">app-debug.apk</code> to your phone via Google Drive, WhatsApp, or USB.
              <br />
              2. Tap the APK file in your phone's File Manager.
              <br />
              3. If prompted, toggle <strong className="text-indigo-300">"Allow from this source"</strong> in Android Security Settings.
              <br />
              4. Tap <strong>"Install"</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Network & Physical Wall Setup Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Physical Video Wall Synchronization Protocol
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300 pt-1">
          <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
            <div className="font-semibold text-indigo-400">1. Master (Device #0)</div>
            <p className="text-[11px] text-slate-400">Select "Host Video Wall", choose wall orientation (Horizontal/Vertical), and pick an MP4 video.</p>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
            <div className="font-semibold text-emerald-400">2. Clients (Devices #1..N)</div>
            <p className="text-[11px] text-slate-400">Select "Join Video Wall", enter the Master device's IP (e.g. 192.168.43.1), and tap Connect.</p>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
            <div className="font-semibold text-amber-400">3. Tap "Play Wall"</div>
            <p className="text-[11px] text-slate-400">Master schedules playback timestamp; all screens synchronize video playback with sub-2ms accuracy!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
