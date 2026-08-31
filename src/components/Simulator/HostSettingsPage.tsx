import React, { useState } from 'react';
import {
  AspectRatioMode,
  ClientDevice,
  OrientationMode,
  ScaleMode,
  VideoSourceOption
} from '../../types';
import { DeviceScreen } from './DeviceScreen';
import {
  Monitor,
  Sparkles,
  Sliders,
  Smartphone,
  Eye,
  Plus,
  Minus,
  RefreshCw,
  Grid,
  Play,
  Pause,
  RotateCcw,
  Upload,
  ArrowLeft,
  Tv,
  Move,
  RotateCw,
  ExternalLink,
  Wifi,
  Minimize2,
  Maximize2,
  CheckCircle2,
  Film
} from 'lucide-react';

interface HostSettingsPageProps {
  orientation: OrientationMode;
  setOrientation: (o: OrientationMode) => void;
  totalDevices: number;
  setTotalDevices: (count: number) => void;
  gridRows: number;
  setGridRows: (r: number) => void;
  gridCols: number;
  setGridCols: (c: number) => void;
  aspectRatioMode: AspectRatioMode;
  setAspectRatioMode: (mode: AspectRatioMode) => void;
  customAspectRatioValue: number;
  setCustomAspectRatioValue: (val: number) => void;
  scaleMode: ScaleMode;
  setScaleMode: (mode: ScaleMode) => void;
  devices: ClientDevice[];
  onUpdateDevicePosition: (deviceIndex: number, row: number, col: number) => void;
  onUpdateDeviceRotation: (deviceIndex: number, rotation: 0 | 90 | 180 | 270) => void;
  onToggleDeviceEnabled: (deviceIndex: number) => void;
  onBatchAssignLayout: (type: 'ltr' | 'rtl' | 'ttb' | 'invert_cols' | 'invert_rows' | 'reset') => void;
  isIdentifying: boolean;
  onTriggerIdentify: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  videoOptions: VideoSourceOption[];
  selectedVideoId: string;
  onSelectVideo: (id: string) => void;
  onCustomFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activeVideo: any;
  showBezels: boolean;
  setShowBezels: (show: boolean) => void;
  showOverlayStats: boolean;
  setShowOverlayStats: (show: boolean) => void;
  preserveAspectRatio: boolean;
  setPreserveAspectRatio: (preserve: boolean) => void;
  bezelCompensation: number;
  setBezelCompensation: (comp: number) => void;
  simulatedPing: number;
  setSimulatedPing: (ping: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasPatternRef: React.RefObject<HTMLCanvasElement | null>;
  onBackToRoles: () => void;
  onPopoutWindow: (deviceIndex: number) => void;
}

export const HostSettingsPage: React.FC<HostSettingsPageProps> = ({
  orientation,
  setOrientation,
  totalDevices,
  setTotalDevices,
  gridRows,
  setGridRows,
  gridCols,
  setGridCols,
  aspectRatioMode,
  setAspectRatioMode,
  customAspectRatioValue,
  setCustomAspectRatioValue,
  scaleMode,
  setScaleMode,
  devices,
  onUpdateDevicePosition,
  onUpdateDeviceRotation,
  onToggleDeviceEnabled,
  onBatchAssignLayout,
  isIdentifying,
  onTriggerIdentify,
  isPlaying,
  onTogglePlay,
  onRestart,
  currentTime,
  duration,
  onSeek,
  videoOptions,
  selectedVideoId,
  onSelectVideo,
  onCustomFileUpload,
  activeVideo,
  showBezels,
  setShowBezels,
  showOverlayStats,
  setShowOverlayStats,
  preserveAspectRatio,
  setPreserveAspectRatio,
  bezelCompensation,
  setBezelCompensation,
  simulatedPing,
  setSimulatedPing,
  videoRef,
  canvasPatternRef,
  onBackToRoles,
  onPopoutWindow
}) => {
  // Immersion Mode state: when Play All is active and user wants zero disturbance
  const [isImmersionMode, setIsImmersionMode] = useState<boolean>(false);
  const [selectedScreenNumber, setSelectedScreenNumber] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<{ row: number; col: number } | null>(null);
  const [isRotatedLandscape, setIsRotatedLandscape] = useState<boolean>(false);

  // Derive effective rows and cols directly from grid state
  const effectiveRows = gridRows;
  const effectiveCols = gridCols;

  const handlePlayAllImmersion = () => {
    if (!isPlaying) {
      onTogglePlay();
    }
    // Rotate to landscape if needed and enter pure immersion mode
    setIsRotatedLandscape(true);
    setIsImmersionMode(true);
  };

  const handleExitImmersion = () => {
    setIsImmersionMode(false);
  };

  // Build sorted devices by assigned row/col
  const sortedDevices = [...devices].sort((a, b) => {
    if (a.assignedSegment.row !== b.assignedSegment.row) {
      return a.assignedSegment.row - b.assignedSegment.row;
    }
    return a.assignedSegment.col - b.assignedSegment.col;
  });

  // Selected device object
  const currentDevice = devices.find((d) => d.index === selectedScreenNumber) || devices[0];

  // -------------------------------------------------------------
  // FULL IMMERSION CINEMA VIEW: ALL DISTRACTIONS & CONTROLS HIDDEN
  // -------------------------------------------------------------
  if (isImmersionMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden group">
        {/* The Seamless Multi-Screen Video Wall Playing with Zero Disturbance */}
        <div
          className={`w-full h-full flex items-center justify-center transition-transform duration-500 ${
            isRotatedLandscape ? 'rotate-0' : ''
          }`}
        >
          <div
            className="w-full h-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${effectiveRows}, minmax(0, 1fr))`,
              gap: bezelCompensation > 0 ? `${bezelCompensation * 0.8}px` : '0px'
            }}
          >
            {sortedDevices.map((device) => (
              <DeviceScreen
                key={device.id}
                device={device}
                totalDevices={totalDevices}
                orientation="custom_grid"
                gridRows={effectiveRows}
                gridCols={effectiveCols}
                aspectRatioMode={aspectRatioMode}
                customAspectRatioValue={customAspectRatioValue}
                scaleMode={scaleMode}
                videoElementRef={videoRef}
                canvasTestPatternRef={canvasPatternRef}
                useTestPattern={selectedVideoId === 'test-pattern'}
                videoWidth={activeVideo.width}
                videoHeight={activeVideo.height}
                showBezel={false}
                showOverlayStats={false}
                preserveAspectRatio={preserveAspectRatio}
                bezelCompensationPercent={bezelCompensation}
                isIdentifying={false}
                isImmersionMode={true}
              />
            ))}
          </div>
        </div>

        {/* Minimal Subtle Floating Bar: reveals on hover / tap to control playback & exit without disturbance */}
        <div className="absolute top-4 right-4 opacity-90 hover:opacity-100 transition-opacity duration-300 pointer-events-auto flex items-center gap-2 bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/20 text-xs font-mono text-white shadow-2xl">
          <span className="text-emerald-400 font-bold flex items-center gap-1.5 pr-1">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            {isPlaying ? `PLAYING (${totalDevices} SCREENS)` : 'PAUSED'}
          </span>
          <button
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
            title={isPlaying ? 'Pause Playback' : 'Resume Playback'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>
          <button
            onClick={onRestart}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Restart Video From Beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleExitImmersion}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // REGULAR SETTINGS VIEW: PREVIEW TOP + MOBILE HORIZONTAL SETTINGS
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToRoles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change Role</span>
          </button>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                Host Master Settings & Preview
              </h2>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerIdentify}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isIdentifying
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Flash identification numbers on all screens"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Flash Screen Numbers</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PREVIEW WINDOW (TOP): DYNAMIC LIVE PREVIEW OF VIDEO WALL & SCREEN SLICES */}
      {/* ========================================================================= */}
      <div className="bg-[#050811] border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3 relative overflow-hidden">
        {/* Preview Title & Telemetry Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Live Video Wall Preview
            </span>
            <span className="text-[10px] font-mono bg-[#0b1021] text-indigo-300 border border-[#1a2238] px-2 py-0.5 rounded">
              {gridRows} × {gridCols} GRID ({totalDevices} SCREENS)
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="text-indigo-300">
              Aspect: <strong className="text-white">{aspectRatioMode.toUpperCase()}</strong>
            </span>
            <span>•</span>
            <span className="text-indigo-300">
              Scale: <strong className="text-white">{scaleMode.toUpperCase()}</strong>
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">NTP Sync &lt;2ms</span>
          </div>
        </div>

        {/* Live Multi-Screen Interactive Grid Canvas (Horizontal / Landscape View) */}
        <div
          className="w-full transition-all duration-300 gap-2.5 py-1"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${effectiveRows}, minmax(0, auto))`
          }}
        >
          {sortedDevices.map((device) => (
            <DeviceScreen
              key={device.id}
              device={device}
              totalDevices={totalDevices}
              orientation="custom_grid"
              gridRows={effectiveRows}
              gridCols={effectiveCols}
              aspectRatioMode={aspectRatioMode}
              customAspectRatioValue={customAspectRatioValue}
              scaleMode={scaleMode}
              videoElementRef={videoRef}
              canvasTestPatternRef={canvasPatternRef}
              useTestPattern={selectedVideoId === 'test-pattern'}
              videoWidth={activeVideo.width}
              videoHeight={activeVideo.height}
              showBezel={showBezels}
              showOverlayStats={showOverlayStats}
              preserveAspectRatio={preserveAspectRatio}
              bezelCompensationPercent={bezelCompensation}
              isIdentifying={isIdentifying}
              isImmersionMode={false}
              onPopoutWindow={onPopoutWindow}
              onUpdateDevicePosition={onUpdateDevicePosition}
              onToggleDeviceEnabled={onToggleDeviceEnabled}
            />
          ))}
        </div>

        {/* Large Prominent "Play All" Action Trigger + Quick Play/Pause */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-auto flex-1 flex items-center gap-2">
            <button
              id="btn-play-all-immersion"
              onClick={handlePlayAllImmersion}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-sm py-3 px-6 rounded-xl shadow-xl shadow-indigo-600/30 transition-all transform active:scale-98 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>PLAY ALL (FULL DISTRACTION-FREE IMMERSION)</span>
            </button>

            <button
              id="btn-host-settings-playpause"
              onClick={onTogglePlay}
              className={`p-3 rounded-xl border flex items-center justify-center transition-all cursor-pointer font-bold text-xs ${
                isPlaying
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
              }`}
              title={isPlaying ? 'Pause All Screens' : 'Play All Screens'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <button
              onClick={onRestart}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
              title="Restart Video From Beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBezels(!showBezels)}
              className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                showBezels
                  ? 'bg-slate-800 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              {showBezels ? 'Frames: ON' : 'Frames: OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BELOW PREVIEW: ALL NECESSARY SETTINGS IN MOBILE HORIZONTAL VIEW */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* A. HOST IP & NETWORK STATUS */}
        <div className="bg-[#080d1e] border border-[#1a233d] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>Host IP & Network</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
              BROADCASTING
            </span>
          </div>

          <div className="bg-[#050811] p-3 rounded-lg border border-[#141b2f] space-y-1.5">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Master Socket Address</div>
            <div className="text-base font-mono font-extrabold text-emerald-400 flex items-center justify-between">
              <span>192.168.43.1:8988</span>
              <span className="text-[10px] font-normal text-slate-400 font-sans">TCP/UDP</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-tight">
            Connect all client devices to the same Wi-Fi router or phone Mobile Hotspot.
          </p>
        </div>

        {/* B. HOW MANY DEVICES ARE CONNECTED (SCREEN COUNT) */}
        <div className="bg-[#080d1e] border border-[#1a233d] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>Connected Devices</span>
            </div>
            <span className="text-sm font-mono font-extrabold text-indigo-400">
              {totalDevices} {totalDevices === 1 ? 'Screen' : 'Screens'}
            </span>
          </div>

          {/* Stepper & Number Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                const count = Math.max(1, totalDevices - 1);
                setTotalDevices(count);
                setGridCols(count);
              }}
              className="w-8 h-8 rounded-lg bg-[#0e142a] hover:bg-[#192244] border border-[#212b48] text-slate-300 flex items-center justify-center font-bold text-xs"
              title="Remove 1 Screen"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {[1, 2, 3, 4, 5, 6, 8].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setTotalDevices(n);
                  if (gridRows === 1) setGridCols(n);
                }}
                className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                  totalDevices === n
                    ? 'bg-[#5850ec] text-white shadow-md shadow-indigo-600/30'
                    : 'bg-[#0b1021] text-slate-400 border border-[#1a2238] hover:border-slate-700'
                }`}
              >
                {n}
              </button>
            ))}

            <button
              onClick={() => {
                const count = Math.min(16, totalDevices + 1);
                setTotalDevices(count);
                setGridCols(count);
              }}
              className="w-8 h-8 rounded-lg bg-[#0e142a] hover:bg-[#192244] border border-[#212b48] text-slate-300 flex items-center justify-center font-bold text-xs"
              title="Add 1 Screen"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>NTP Drift: &lt;1.8ms</span>
            <span className="text-emerald-400">All Nodes In Sync</span>
          </div>
        </div>

        {/* C. CHOOSE ASPECT RATIO */}
        <div className="bg-[#080d1e] border border-[#1a233d] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Aspect Ratio</span>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-300">
              {aspectRatioMode.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: '16:9', label: '16 : 9' },
              { id: '9:16', label: '9 : 16' },
              { id: '4:3', label: '4 : 3' },
              { id: '1:1', label: '1 : 1' },
              { id: '21:9', label: '21 : 9' },
              { id: 'auto', label: 'Auto' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setAspectRatioMode(item.id as AspectRatioMode)}
                className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                  aspectRatioMode === item.id
                    ? 'bg-[#5850ec] text-white border-[#5850ec] shadow-sm'
                    : 'bg-[#0b1021] border-[#1a2238] text-slate-400 hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="text-[10px] text-slate-500 font-mono text-center">
            Adapts viewport geometry across all mobile screens.
          </div>
        </div>

        {/* D. SCREEN NUMBER SELECTION & ASSIGNMENT */}
        <div className="bg-[#080d1e] border border-[#1a233d] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>Screen Number</span>
            </div>
            <span className="text-xs font-mono text-indigo-300 font-bold">
              Screen #{selectedScreenNumber + 1} {selectedScreenNumber === 0 ? '(Master)' : ''}
            </span>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {devices.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedScreenNumber(d.index)}
                className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all ${
                  selectedScreenNumber === d.index
                    ? 'bg-[#5850ec] text-white shadow-md'
                    : 'bg-[#0b1021] text-slate-400 border border-[#1a2238] hover:border-slate-700'
                }`}
              >
                #{d.index + 1}
              </button>
            ))}
          </div>

          <div className="bg-[#050811] p-2.5 rounded-lg border border-[#141b2f] flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Position in Grid:</span>
            <span className="text-indigo-300 font-bold">
              [Row {currentDevice.assignedSegment.row}, Col {currentDevice.assignedSegment.col}]
            </span>
          </div>
        </div>

        {/* E. SCREEN APPEARANCE (SCALE & BEZEL COMPENSATION) */}
        <div className="bg-[#080d1e] border border-[#1a233d] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Screen Appearance</span>
            </div>
            <span className="text-xs font-mono text-indigo-300 font-bold">{scaleMode.toUpperCase()}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setScaleMode('cover')}
              className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                scaleMode === 'cover'
                  ? 'bg-[#5850ec] text-white border-[#5850ec]'
                  : 'bg-[#0b1021] border-[#1a2238] text-slate-400 hover:text-white'
              }`}
            >
              Cover
            </button>
            <button
              onClick={() => setScaleMode('contain')}
              className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                scaleMode === 'contain'
                  ? 'bg-[#5850ec] text-white border-[#5850ec]'
                  : 'bg-[#0b1021] border-[#1a2238] text-slate-400 hover:text-white'
              }`}
            >
              Contain
            </button>
            <button
              onClick={() => setScaleMode('stretch')}
              className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                scaleMode === 'stretch'
                  ? 'bg-[#5850ec] text-white border-[#5850ec]'
                  : 'bg-[#0b1021] border-[#1a2238] text-slate-400 hover:text-white'
              }`}
            >
              Stretch
            </button>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Bezel Gap:</span>
              <span className="text-indigo-400 font-bold">{bezelCompensation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={bezelCompensation}
              onChange={(e) => setBezelCompensation(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* F. SCREEN POSITION WITH GRID VIEW */}
        <div className="bg-[#080d1e] border border-[#1a233d] rounded-xl p-4 space-y-3 md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Grid className="w-4 h-4 text-indigo-400" />
              <span>Grid View Position</span>
            </div>
            <span className="text-xs font-mono text-indigo-300 font-bold">
              {gridRows}R × {gridCols}C
            </span>
          </div>

          {/* Grid Dimension Selectors */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 bg-[#050811] p-1.5 rounded-lg border border-[#141b2f]">
              <span className="text-slate-400 font-medium pl-1">Rows:</span>
              <button
                onClick={() => setGridRows(Math.max(1, gridRows - 1))}
                className="w-6 h-6 rounded bg-[#0e142a] text-white flex items-center justify-center font-bold text-xs"
              >
                -
              </button>
              <span className="font-mono font-bold text-indigo-300 px-1">{gridRows}</span>
              <button
                onClick={() => setGridRows(Math.min(8, gridRows + 1))}
                className="w-6 h-6 rounded bg-[#0e142a] text-white flex items-center justify-center font-bold text-xs"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-1 bg-[#050811] p-1.5 rounded-lg border border-[#141b2f]">
              <span className="text-slate-400 font-medium pl-1">Cols:</span>
              <button
                onClick={() => setGridCols(Math.max(1, gridCols - 1))}
                className="w-6 h-6 rounded bg-[#0e142a] text-white flex items-center justify-center font-bold text-xs"
              >
                -
              </button>
              <span className="font-mono font-bold text-indigo-300 px-1">{gridCols}</span>
              <button
                onClick={() => setGridCols(Math.min(8, gridCols + 1))}
                className="w-6 h-6 rounded bg-[#0e142a] text-white flex items-center justify-center font-bold text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Interactive Screen Slot Arranger */}
          <div
            className="grid gap-1.5 p-2 bg-[#050811] rounded-lg border border-[#141b2f] max-h-36 overflow-auto"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(40px, 1fr))`,
              gridTemplateRows: `repeat(${gridRows}, minmax(36px, auto))`
            }}
          >
            {Array.from({ length: gridRows }).map((_, r) =>
              Array.from({ length: gridCols }).map((_, c) => {
                const assigned = devices.find(
                  (d) => d.assignedSegment.row === r && d.assignedSegment.col === c
                );
                return (
                  <button
                    key={`slot-${r}-${c}`}
                    onClick={() => {
                      onUpdateDevicePosition(selectedScreenNumber, r, c);
                    }}
                    className={`p-1 rounded border text-center font-mono text-[10px] flex flex-col items-center justify-center transition-all ${
                      assigned
                        ? assigned.index === selectedScreenNumber
                          ? 'bg-[#5850ec] text-white border-[#5850ec] shadow-sm'
                          : 'bg-[#0e142a] text-indigo-300 border-[#212b48]'
                        : 'bg-[#050811] text-slate-600 border-dashed border-[#1a2238]'
                    }`}
                  >
                    <span className="font-bold">
                      {assigned ? `#${assigned.index + 1}` : `[${r}:${c}]`}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* G. MEDIA STREAM CHOOSER (WIDE) */}
        <div className="bg-[#080d1e] border border-[#1a233d] rounded-xl p-4 space-y-3 md:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Film className="w-4 h-4 text-indigo-400" />
              <span>Media Source Video Stream</span>
            </div>
            <label className="cursor-pointer text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium">
              <Upload className="w-3.5 h-3.5" /> Upload Custom MP4
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={onCustomFileUpload}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {videoOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onSelectVideo(opt.id)}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  selectedVideoId === opt.id
                    ? 'bg-[#121633] border-[#5850ec] text-white shadow-md'
                    : 'bg-[#0b1021] border-[#1a2238] text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs truncate text-slate-200">{opt.title}</div>
                <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                  <span>{opt.width}×{opt.height}</span>
                  <span>{opt.isTestPattern ? 'CALIBRATION' : `${opt.duration}s`}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
