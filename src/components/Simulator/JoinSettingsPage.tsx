import React, { useState } from 'react';
import { Smartphone, ArrowLeft, Wifi, RotateCw, ExternalLink, Sparkles, CheckCircle2, Shield, Eye, Tv } from 'lucide-react';
import { OrientationMode, ScaleMode } from '../../types';

interface JoinSettingsPageProps {
  onBackToRoles: () => void;
  onLaunchClient: (hostIp: string, screenIndex: number, rotation: number) => void;
  totalDevices: number;
  orientation: OrientationMode;
  scaleMode: ScaleMode;
  onPopoutWindow: (deviceIndex: number) => void;
}

export const JoinSettingsPage: React.FC<JoinSettingsPageProps> = ({
  onBackToRoles,
  onLaunchClient,
  totalDevices,
  orientation,
  scaleMode,
  onPopoutWindow
}) => {
  const [hostIp, setHostIp] = useState<string>('192.168.1.100');
  const [selectedScreenIndex, setSelectedScreenIndex] = useState<number>(1); // Screen 2 (index 1)
  const [rotation, setRotation] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToRoles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Role Selection</span>
          </button>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Join Client Display Configuration
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                  CLIENT NODE
                </span>
              </h2>
            </div>
          </div>
        </div>

        <button
          onClick={() => onPopoutWindow(selectedScreenIndex)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Launch Screen in Popout Window</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP PREVIEW: CLIENT SCREEN SLICE & APPEARANCE */}
      {/* ========================================================================= */}
      <div className="bg-[#080d1e] border-2 border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Screen #{selectedScreenIndex + 1} Spliced Viewport Preview
            </span>
          </div>
          <span className="text-[10px] font-mono bg-slate-900 text-emerald-400 border border-slate-800 px-2.5 py-0.5 rounded">
            NODE {selectedScreenIndex + 1} OF {totalDevices} • {rotation}° ROTATION
          </span>
        </div>

        {/* Simulated Phone Frame with Screen Slice Rendering */}
        <div className="flex justify-center py-4">
          <div
            className="w-full max-w-sm aspect-video bg-[#050811] rounded-2xl border-4 border-slate-700 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center transition-transform"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {/* Screen Slice Simulated Graphics */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-950 to-emerald-950/40 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-emerald-500/40 animate-spin flex items-center justify-center">
                <span className="text-4xl font-extrabold font-mono text-emerald-300">
                  {selectedScreenIndex + 1}
                </span>
              </div>
            </div>

            {/* Screen Overlay Telemetry */}
            <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-1 rounded text-[9px] font-mono text-emerald-300 border border-emerald-500/30">
              SLOT: [Col {selectedScreenIndex}, Row 0]
            </div>

            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs px-2 py-1 rounded text-[9px] font-mono text-slate-300 border border-slate-800">
              TextureView: 1080×2400 @ 60fps
            </div>
          </div>
        </div>

        {/* Screen Appearance Note */}
        <p className="text-center text-xs text-slate-400 font-mono">
          This preview renders the active video viewport segment matrix calculated for Screen #{selectedScreenIndex + 1}.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 2. CONNECTION & SCREEN NUMBER SETTINGS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Host IP Config */}
        <div className="bg-[#080d1e] border border-[#1a233d] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>Host Master Connection</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 block">Host IP Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={hostIp}
                onChange={(e) => setHostIp(e.target.value)}
                className="flex-1 bg-[#0b1021] border border-[#212b48] text-white rounded-lg px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-hidden"
                placeholder="192.168.43.1"
              />
              <button
                onClick={() => setHostIp('192.168.43.1')}
                className="px-2.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono whitespace-nowrap"
                title="Android Mobile Hotspot Default Gateway"
              >
                ⚡ Hotspot (192.168.43.1)
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 <strong>Tip:</strong> If connected to the Host's Mobile Hotspot, the Host is always <code className="text-emerald-300">192.168.43.1</code>. If using Wi-Fi router, enter the Host IP shown on the Host screen.
            </p>
          </div>

          <div className="bg-[#050811] p-3 rounded-lg border border-[#141b2f] flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Wi-Fi Network Status:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Ready to Bind
            </span>
          </div>
        </div>

        {/* Screen Index & Appearance Orientation */}
        <div className="bg-[#080d1e] border border-[#1a233d] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Screen Number & Appearance</span>
          </div>

          {/* Screen Index Selector */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 block">Assigned Screen Number</label>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: Math.min(8, totalDevices) }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedScreenIndex(idx)}
                  className={`py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                    selectedScreenIndex === idx
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-[#0b1021] text-slate-400 border border-[#1a2238] hover:border-slate-700'
                  }`}
                >
                  Screen #{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation Stepper */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 block">Physical Screen Rotation</label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() => setRotation(deg)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    rotation === deg
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-[#0b1021] text-slate-400 border border-[#1a2238] hover:border-slate-700'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
