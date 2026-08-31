import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { VideoWallSimulator } from './components/Simulator/VideoWallSimulator';
import { CodeViewer } from './components/Codebase/CodeViewer';
import { MatrixMathInspector } from './components/Visualizers/MatrixMathInspector';
import { NtpSyncLab } from './components/Visualizers/NtpSyncLab';
import { ArchitectureGuide } from './components/Architecture/ArchitectureGuide';
import { ApkBuilderGuide } from './components/ApkBuilder/ApkBuilderGuide';
import { PopoutClientScreen } from './components/Simulator/PopoutClientScreen';
import { generateAndroidProjectZip } from './utils/exportProject';
import { OrientationMode } from './types';
import { CheckCircle2, Download, ExternalLink, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Check for popout window query params
  const [popoutParams, setPopoutParams] = useState<{
    deviceIndex: number;
    totalDevices: number;
    orientation: OrientationMode;
    customRow?: number;
    customCol?: number;
    totalRows?: number;
    totalCols?: number;
    aspectRatioMode?: any;
    scaleMode?: any;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const popout = searchParams.get('popoutScreen');
      if (popout !== null) {
        setPopoutParams({
          deviceIndex: parseInt(popout) || 1,
          totalDevices: parseInt(searchParams.get('total') || '3') || 3,
          orientation: (searchParams.get('orient') as OrientationMode) || 'horizontal',
          customRow: searchParams.get('row') ? parseInt(searchParams.get('row')!) : undefined,
          customCol: searchParams.get('col') ? parseInt(searchParams.get('col')!) : undefined,
          totalRows: searchParams.get('totalRows') ? parseInt(searchParams.get('totalRows')!) : undefined,
          totalCols: searchParams.get('totalCols') ? parseInt(searchParams.get('totalCols')!) : undefined,
          aspectRatioMode: searchParams.get('aspect') || 'auto',
          scaleMode: searchParams.get('scale') || 'cover'
        });
      }
    }
  }, []);

  const handleDownloadProject = async () => {
    try {
      setIsDownloading(true);
      const zipBlob = await generateAndroidProjectZip();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Android-VideoWall-Splicer-Kotlin.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to export Android project zip:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // If this window is opened as a Popout Screen, render only the fullscreen texture view
  if (popoutParams) {
    return (
      <PopoutClientScreen
        deviceIndex={popoutParams.deviceIndex}
        totalDevices={popoutParams.totalDevices}
        orientation={popoutParams.orientation}
        customRow={popoutParams.customRow}
        customCol={popoutParams.customCol}
        totalRows={popoutParams.totalRows}
        totalCols={popoutParams.totalCols}
        aspectRatioMode={popoutParams.aspectRatioMode}
        scaleMode={popoutParams.scaleMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadProject={handleDownloadProject}
        isDownloading={isDownloading}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast Notification */}
        {downloadSuccess && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="font-semibold text-xs text-white">Android Studio Project Exported!</div>
              <div className="text-[11px] text-emerald-300">Unzip and open directly in Android Studio.</div>
            </div>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'simulator' && <VideoWallSimulator />}
        {activeTab === 'codebase' && (
          <CodeViewer
            onDownloadProject={handleDownloadProject}
            isDownloading={isDownloading}
          />
        )}
        {activeTab === 'matrix' && <MatrixMathInspector />}
        {activeTab === 'sync-lab' && <NtpSyncLab />}
        {activeTab === 'guide' && <ArchitectureGuide />}
        {activeTab === 'apk' && (
          <ApkBuilderGuide
            onDownloadProject={handleDownloadProject}
            isDownloading={isDownloading}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Android Video Wall Studio & Screen Splicing Engine • Kotlin & Media3 ExoPlayer</span>
          <div className="flex items-center gap-3 text-slate-400">
            <span>TCP Port: 8988</span>
            <span>•</span>
            <span>NTP &lt; 2ms Drift Watchdog</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
