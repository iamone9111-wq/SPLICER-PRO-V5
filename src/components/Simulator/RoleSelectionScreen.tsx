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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Host Card */}
        <div
          id="btn-role-host"
          onClick={onSelectHost}
          className="group relative bg-slate-900/80 hover:bg-slate-900 border-2 border-slate-800 hover:border-indigo-500/80 rounded-2xl p-6 sm:p-7 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
        >
          <div className="absolute top-4 right-4 text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
            MASTER CONTROLLER
          </div>

          <div className="space-y-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Tv className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                I am a Host (Master)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure wall layout, screen count, custom grid (R×C), aspect ratio, and video splicing. Broadcasts NTP synchronized video to all connected phone screens.
              </p>
            </div>

            <div className="pt-2 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>Arbitrary matrix grid slicing (Custom Rows × Columns)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>Live interactive screen layout preview</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>Distraction-free full immersion video playback</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
            <span>Enter Host Master Settings</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Join Card */}
        <div
          id="btn-role-join"
          onClick={onSelectJoin}
          className="group relative bg-slate-900/80 hover:bg-slate-900 border-2 border-slate-800 hover:border-emerald-500/80 rounded-2xl p-6 sm:p-7 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1"
        >
          <div className="absolute top-4 right-4 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
            DISPLAY NODE
          </div>

          <div className="space-y-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smartphone className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                Join Screen (Client)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect this device as a synchronized screen in the video wall. Enter the Host IP to automatically receive your slice coordinates and render seamless video.
              </p>
            </div>

            <div className="pt-2 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Auto-detect Host IP over local Wi-Fi / Hotspot</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Screen position & rotation orientation preview</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Full-screen hardware accelerated TextureView</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
            <span>Configure Client Screen & Join</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Quick Setup Notes */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <Wifi className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-slate-200">Local Network Requirement:</span>
          <p className="leading-relaxed">
            All devices must be connected to the same Wi-Fi router or phone Mobile Hotspot. Port <code className="text-indigo-300 font-mono">8988</code> is used for ultra-low latency TCP/UDP command & clock synchronization.
          </p>
        </div>
      </div>
    </div>
  );
};
