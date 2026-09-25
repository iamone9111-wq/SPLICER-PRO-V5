import React from 'react';
import { Layers, Code2, Calculator, Activity, BookOpen, Download, Smartphone } from 'lucide-react';

export type ActiveTab = 'simulator' | 'codebase' | 'matrix' | 'sync-lab' | 'guide' | 'apk';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onDownloadProject: () => void;
  isDownloading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onDownloadProject,
  isDownloading
}) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'simulator', label: 'Wall Simulator', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'codebase', label: 'Kotlin Codebase', icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: 'matrix', label: 'Matrix Splicer', icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 'sync-lab', label: 'NTP Sync Lab', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'guide', label: 'Architecture', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'apk', label: 'Build APK', icon: <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> },
  ];

  return (
    <header className="h-16 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl sticky top-0 z-50 text-slate-100 flex items-center justify-between px-4 sm:px-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 rounded-xl flex items-center justify-center font-black text-white text-base tracking-tighter shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-white/20">
          S
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              SPLICER <span className="text-cyan-400 font-extrabold text-xs tracking-wider px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">PRO</span>
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider bg-white/[0.06] text-indigo-300 border border-white/10 backdrop-blur-md">
              Android Kotlin • ExoPlayer
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
            Zero-Delay Clock Lock • Frosted Glass Engine
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-1 p-1 bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/10 shadow-inner">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_0_16px_rgba(99,102,241,0.4)] border border-white/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Live Master Node Telemetry & Export */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></div>
          <span className="text-xs font-mono font-medium text-emerald-300">Master Locked</span>
        </div>

        <div className="hidden sm:block px-3 py-1 bg-white/[0.04] border border-white/10 rounded-xl text-[11px] font-mono text-cyan-300 backdrop-blur-md shadow-sm">
          192.168.43.1:8988
        </div>

        <button
          id="btn-download-project"
          onClick={onDownloadProject}
          disabled={isDownloading}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:brightness-110 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.35)] border border-white/20 active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isDownloading ? 'Packaging...' : 'Export Android Project'}</span>
          <span className="sm:hidden">{isDownloading ? '...' : 'ZIP'}</span>
        </button>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto px-3 py-2 bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 gap-1.5 no-scrollbar shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] whitespace-nowrap font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border border-white/20 shadow-md'
                : 'text-slate-400 bg-white/[0.04] border border-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
