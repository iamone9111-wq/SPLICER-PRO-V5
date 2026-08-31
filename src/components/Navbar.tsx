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
    <header className="h-16 border-b border-slate-800 bg-slate-950 sticky top-0 z-50 text-slate-100 flex items-center justify-between px-4 sm:px-8">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center font-bold text-white text-sm tracking-tighter shadow-sm">
          S
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-medium tracking-tight text-white">
              SPLICER <span className="text-slate-500 font-normal">PRO</span>
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-slate-900 text-indigo-400 border border-slate-800">
              Android Kotlin
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
            Media3 ExoPlayer • 2D Affine Matrix
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900/80 rounded-lg border border-slate-800/90">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Live Master Node Telemetry & Export */}
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden lg:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Master Active</span>
        </div>

        <div className="hidden sm:block px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-[10px] font-mono text-slate-300">
          192.168.1.100:8988
        </div>

        <button
          id="btn-download-project"
          onClick={onDownloadProject}
          disabled={isDownloading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isDownloading ? 'Packaging...' : 'Export ZIP'}</span>
          <span className="sm:hidden">{isDownloading ? '...' : 'ZIP'}</span>
        </button>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto px-3 py-2 bg-slate-950 border-t border-slate-800 gap-1.5 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] whitespace-nowrap font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 bg-slate-900 border border-slate-800'
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
