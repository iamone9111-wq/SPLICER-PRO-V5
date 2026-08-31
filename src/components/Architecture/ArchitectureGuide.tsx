import React from 'react';
import {
  BookOpen,
  Layers,
  Cpu,
  Wifi,
  ShieldCheck,
  Zap,
  Terminal,
  CheckCircle2,
  Tv,
  Smartphone,
  Sliders
} from 'lucide-react';

export const ArchitectureGuide: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-200">
      {/* Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-white">
              Android Video Wall Architecture Blueprint
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Production Architecture: Kotlin • Media3 ExoPlayer • Coroutine TCP Sockets • 2D Affine Matrix
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: System Workflow Architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          1. Master-Client System Architecture & Protocol Lifecycle
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          The video wall operates under a <strong>Master-Authoritative Distributed Topology</strong>. One Android device assumes the <strong>Host (Master)</strong> role, running an embedded TCP server on port <code className="text-indigo-300 font-mono">8988</code>. Secondary devices join over local Wi-Fi or Wi-Fi Direct as <strong>Clients (Screens)</strong>.
        </p>

        {/* Lifecycle Flowchart */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-950 p-3.5 rounded-lg border border-indigo-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
              <span className="font-mono text-[10px] uppercase">Phase 01</span>
              <Wifi className="w-3.5 h-3.5" />
            </div>
            <div className="font-medium text-xs text-white">TCP Handshake & Auto-Role</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Client connects to Host IP. Host assigns physical index <code className="text-slate-300">deviceIndex</code> (0 for Host, 1..N for Clients) and wall orientation.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-indigo-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
              <span className="font-mono text-[10px] uppercase">Phase 02</span>
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="font-medium text-xs text-white">NTP Clock Calibration</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Continuous 4-timestamp Ping/Pong calculates network round-trip delay (RTT) and synchronizes client clocks to <code className="text-slate-300">&lt;2ms</code> accuracy.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
              <span className="font-mono text-[10px] uppercase">Phase 03</span>
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div className="font-medium text-xs text-white">Scheduled Playback Dispatch</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Host dispatches: <code className="text-slate-300 text-[10px]">SCHEDULE_PLAY(T_target = Now + 500ms)</code>. All devices start ExoPlayer at the exact same millisecond.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="font-mono text-[10px] uppercase">Phase 04</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="font-medium text-xs text-white">Micro-Drift Watchdog</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Continuous watchdog compares video position. If drift is 10-50ms, adjusts playback speed (<code className="text-slate-300">0.98x - 1.02x</code>) smoothly without audio pops.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Mathematical Foundation of Screen Splicing */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          2. Splicing Mathematics: TextureView Affine Matrix
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Why <code className="text-indigo-300 font-mono">TextureView</code> instead of <code className="text-slate-400 font-mono">SurfaceView</code>? Standard Android <code className="text-slate-300 font-mono">SurfaceView</code> creates a dedicated punch-hole surface behind the window, preventing arbitrary Matrix translations without visual clipping. <code className="text-indigo-300 font-mono">TextureView</code> behaves as a standard GPU-backed View that accepts direct 3x3 affine transformation matrices via <code className="text-indigo-300 font-mono">textureView.setTransform(matrix)</code>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-indigo-400">Horizontal (Landscape) Splice Math</h4>
            <div className="bg-slate-900 p-3 rounded font-mono text-[11px] text-indigo-300 space-y-1 border border-slate-800">
              <div>val scaleX = totalDevices.toFloat()</div>
              <div>val scaleY = 1.0f</div>
              <div>val translateX = -(deviceIndex * viewWidth)</div>
              <div>val translateY = 0f</div>
              <div className="text-slate-500 pt-1">// Set scale from pivot (0,0) then translate</div>
              <div>matrix.setScale(scaleX, scaleY, 0f, 0f)</div>
              <div>matrix.postTranslate(translateX, translateY)</div>
            </div>
            <p className="text-[11px] text-slate-400">
              Horizontally stretches the video across all <code className="text-slate-300">N</code> screen widths, then shifts device <code className="text-slate-300">i</code> by its specific offset <code className="text-slate-300">-i * W</code>.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-emerald-400">Vertical (Portrait) Splice Math</h4>
            <div className="bg-slate-900 p-3 rounded font-mono text-[11px] text-emerald-300 space-y-1 border border-slate-800">
              <div>val scaleX = 1.0f</div>
              <div>val scaleY = totalDevices.toFloat()</div>
              <div>val translateX = 0f</div>
              <div>val translateY = -(deviceIndex * viewHeight)</div>
              <div className="text-slate-500 pt-1">// Set scale from pivot (0,0) then translate</div>
              <div>matrix.setScale(scaleX, scaleY, 0f, 0f)</div>
              <div>matrix.postTranslate(translateX, translateY)</div>
            </div>
            <p className="text-[11px] text-slate-400">
              Vertically stretches the video across all <code className="text-slate-300">N</code> screen heights, then shifts device <code className="text-slate-300">i</code> by <code className="text-slate-300">-i * H</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: ExoPlayer Media3 Low-Latency Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          3. ExoPlayer (AndroidX Media3) Low-Latency Tuning
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Standard ExoPlayer settings buffer up to 50,000ms of video in advance, causing multi-second delays when executing seek or play commands. For video wall synchronization, we tune <code className="text-indigo-300 font-mono">DefaultLoadControl</code> with aggressive low-latency thresholds:
        </p>

        <div className="bg-black p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-200">
          <pre>
            <code>{`val loadControl = DefaultLoadControl.Builder()
    .setBufferDurationsMs(
        500,  // minBufferMs (minimum video buffered before allowing play)
        1500, // maxBufferMs (cap to prevent memory strain)
        250,  // bufferForPlaybackMs (low latency start trigger)
        500   // bufferForPlaybackAfterRebufferMs
    )
    .setPrioritizeTimeOverSizeThresholds(true)
    .build()

val player = ExoPlayer.Builder(context)
    .setLoadControl(loadControl)
    .build()
    .apply {
        setVideoTextureView(textureView)
    }`}</code>
          </pre>
        </div>
      </div>

      {/* Section 4: Testing & Deployment Instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          4. Step-by-Step Physical Device Deployment
        </h3>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-sm bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 font-mono">
              01
            </span>
            <div>
              <strong className="text-white">Export & Import in Android Studio:</strong> Click <strong className="text-indigo-400">"Export ZIP"</strong> in the top-right navbar. Unzip the project and open it in Android Studio (Hedgehog, Iguana, or Ladybug).
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-sm bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 font-mono">
              02
            </span>
            <div>
              <strong className="text-white">Connect Devices to Same Wi-Fi / Hotspot:</strong> Connect all Android phones/tablets to the same Wi-Fi router or enable Wi-Fi Hotspot on the Master phone and connect client phones to it.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-sm bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 font-mono">
              03
            </span>
            <div>
              <strong className="text-white">Launch Host on Device 1:</strong> Select <strong className="text-indigo-400">"Host Video Wall"</strong> and choose Horizontal or Vertical. Note the displayed IP address (e.g. <code className="text-indigo-300">192.168.43.1</code>). Pick your MP4 video.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-sm bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 font-mono">
              04
            </span>
            <div>
              <strong className="text-white">Launch Clients on Devices 2..N:</strong> Open the app on client devices, enter the Host IP, and tap <strong className="text-emerald-400">"Join Video Wall"</strong>. Place devices side-by-side and tap <strong>"Play Wall"</strong> on the Master!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
