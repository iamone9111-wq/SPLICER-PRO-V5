import React from 'react';
import { Tv, Smartphone, Sparkles, Wifi, Shield, ArrowRight, Layers, HelpCircle } from 'lucide-react';

interface RoleSelectionScreenProps {
  onSelectHost: () => void;
  onSelectJoin: () => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
  onSelectHost,
  onSelectJoin
}) => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Android Video Wall Studio & Splicing Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Choose Your Video Wall Role
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          Select whether this device will act as the <strong className="text-slate-200">Host Master</strong> (broadcasting and controlling the multi-screen wall) or as a <strong className="text-slate-200">Join Client</strong> (rendering a synchronized video slice).
        </p>
      </div>

      {/* Role Selection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* Ambient Glows */}
        <div className="absolute -top-10 left-1/4 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-10 right-1/4 w-72 h-72 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Host Card */}
        <div
          id="btn-role-host"
          onClick={onSelectHost}
          className="group relative glass-card glass-card-hover rounded-3xl p-7 flex flex-col justify-between cursor-pointer border border-white/10 hover:border-indigo-500/50 shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-300"
        >
          <div className="absolute top-5 right-5 text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
            MASTER CONTROLLER
          </div>

          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-blue-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              <Tv className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                I am a Host (Master)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Configure wall layout, screen count, custom grid (R×C), aspect ratio, and video splicing. Broadcasts real-time synchronized video and master clock ticks to all connected client screens.
              </p>
            </div>

            <div className="pt-2 space-y-2.5 text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <span>Arbitrary matrix grid slicing (Custom Rows × Columns)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                <span>Zero-latency playback resume & lockstep sync engine</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span>Master watchdog: Automatic client freeze when host stops</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-5 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-cyan-300">
            <span>Enter Host Master Settings</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>

        {/* Join Card */}
        <div
          id="btn-role-join"
          onClick={onSelectJoin}
          className="group relative glass-card glass-card-hover rounded-3xl p-7 flex flex-col justify-between cursor-pointer border border-white/10 hover:border-emerald-500/50 shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-300"
        >
          <div className="absolute top-5 right-5 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
            DISPLAY NODE
          </div>

          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              <Smartphone className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                Join Screen (Client)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect this device as a synchronized display screen in the wall. Connects directly to the Host's local stream with sub-millisecond drift correction.
              </p>
            </div>

            <div className="pt-2 space-y-2.5 text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span>Auto-detect Host IP over local Wi-Fi / Hotspot</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <span>Screen position & rotation orientation preview</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                <span>Pure display terminal: Master-synchronized TextureView</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-5 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
            <span>Configure Client Screen & Join</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Quick Setup Notes */}
      <div className="glass-panel rounded-2xl p-4.5 flex items-start gap-3 text-xs text-slate-300 border border-white/10 shadow-lg">
        <Wifi className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white">Local Network Synchronization Architecture:</span>
          <p className="leading-relaxed text-slate-400">
            Host streams media chunks and lockstep clock ticks over port <code className="text-cyan-300 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/10">8988 / 8990</code>. Client displays behave as synchronized screens, immediately freezing if the Host shuts down.
          </p>
        </div>
      </div>
    </div>
  );
};
