import React, { useState } from 'react';
import {
  AspectRatioMode,
  ClientDevice,
  OrientationMode,
  ScaleMode,
  VideoSourceOption
} from '../../types';
import {
  Play,
  Pause,
  RotateCcw,
  Upload,
  Sliders,
  Sparkles,
  Layers,
  Clock,
  Wifi,
  Smartphone,
  Info,
  Tv,
  Grid,
  Maximize2,
  Minimize2,
  Move,
  RotateCw,
  Plus,
  Minus,
  RefreshCw,
  LayoutGrid,
  Check
} from 'lucide-react';

interface HostControlPanelProps {
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
  setCustomAspectRatioValue: (ratio: number) => void;
  scaleMode: ScaleMode;
  setScaleMode: (mode: ScaleMode) => void;
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
  simulatedPing: number;
  setSimulatedPing: (ping: number) => void;
  simulatedJitter: number;
  setSimulatedJitter: (jitter: number) => void;
  showBezels: boolean;
  setShowBezels: (show: boolean) => void;
  showOverlayStats: boolean;
  setShowOverlayStats: (show: boolean) => void;
  preserveAspectRatio: boolean;
  setPreserveAspectRatio: (preserve: boolean) => void;
  bezelCompensation: number;
  setBezelCompensation: (bezel: number) => void;
  clients: ClientDevice[];
  onUpdateDevicePosition: (deviceIndex: number, row: number, col: number) => void;
  onUpdateDeviceRotation: (deviceIndex: number, rotation: 0 | 90 | 180 | 270) => void;
  onToggleDeviceEnabled: (deviceIndex: number) => void;
  onBatchAssignLayout: (type: 'ltr' | 'rtl' | 'ttb' | 'invert_cols' | 'invert_rows' | 'reset') => void;
  scheduledCountdown: number | null;
  onOpenWizard?: () => void;
}

export const HostControlPanel: React.FC<HostControlPanelProps> = ({
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
  simulatedPing,
  setSimulatedPing,
  simulatedJitter,
  setSimulatedJitter,
  showBezels,
  setShowBezels,
  showOverlayStats,
  setShowOverlayStats,
  preserveAspectRatio,
  setPreserveAspectRatio,
  bezelCompensation,
  setBezelCompensation,
  clients,
  onUpdateDevicePosition,
  onUpdateDeviceRotation,
  onToggleDeviceEnabled,
  onBatchAssignLayout,
  scheduledCountdown,
  onOpenWizard
}) => {
  const [selectedSlot, setSelectedSlot] = useState<{ row: number; col: number } | null>(null);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const effectiveRows =
    orientation === 'horizontal'
      ? 1
      : orientation === 'vertical'
      ? totalDevices
      : orientation === 'grid_2x2'
      ? Math.ceil(totalDevices / 2)
      : orientation === 'grid_auto'
      ? totalDevices <= 3
        ? 1
        : totalDevices === 4
        ? 2
        : totalDevices <= 6
        ? Math.ceil(totalDevices / 3)
        : Math.ceil(totalDevices / 4)
      : gridRows;

  const effectiveCols =
    orientation === 'horizontal'
      ? totalDevices
      : orientation === 'vertical'
      ? 1
      : orientation === 'grid_2x2'
      ? 2
      : orientation === 'grid_auto'
      ? totalDevices <= 3
        ? totalDevices
        : totalDevices === 4
        ? 2
        : totalDevices <= 6
        ? 3
        : 4
      : gridCols;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-xl space-y-6">
      {/* Top Header: Host Status & Broadcast */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm text-white">Master Video Wall Control Center</h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                TCP :8988 ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Manual screen layout, arbitrary grid dimensions ({effectiveRows}x{effectiveCols}), aspect ratio & position mapping
            </p>
          </div>
        </div>

        {/* Sync Countdown Alert */}
        {scheduledCountdown !== null && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded text-xs font-mono animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled Start: -{scheduledCountdown}ms</span>
          </div>
        )}
      </div>

      {/* SECTION 1: Wall Topology & Custom Grid Builder */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4 text-indigo-400" />
            1. Layout Mode & Screen Arrangement
          </label>
          <div className="flex items-center gap-2">
            {onOpenWizard && (
              <button
                onClick={onOpenWizard}
                className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Setup Wizard</span>
              </button>
            )}
            <span className="text-[11px] font-mono bg-slate-900 text-indigo-400 border border-slate-800 px-2.5 py-0.5 rounded">
              Grid Geometry: {effectiveRows} Row{effectiveRows > 1 ? 's' : ''} × {effectiveCols} Column{effectiveCols > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Orientation Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            id="btn-layout-horizontal"
            onClick={() => setOrientation('horizontal')}
            className={`py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center justify-center gap-1.5 ${
              orientation === 'horizontal'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex gap-0.5">
              <span className="w-2.5 h-2 bg-current rounded-xs opacity-90" />
              <span className="w-2.5 h-2 bg-current rounded-xs opacity-90" />
              <span className="w-2.5 h-2 bg-current rounded-xs opacity-90" />
            </div>
            <span>Horizontal (1×N)</span>
          </button>

          <button
            id="btn-layout-vertical"
            onClick={() => setOrientation('vertical')}
            className={`py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center justify-center gap-1.5 ${
              orientation === 'vertical'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="w-5 h-1 bg-current rounded-xs opacity-90" />
              <span className="w-5 h-1 bg-current rounded-xs opacity-90" />
              <span className="w-5 h-1 bg-current rounded-xs opacity-90" />
            </div>
            <span>Vertical (N×1)</span>
          </button>

          <button
            id="btn-layout-grid2x2"
            onClick={() => setOrientation('grid_2x2')}
            className={`py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center justify-center gap-1.5 ${
              orientation === 'grid_2x2'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="grid grid-cols-2 gap-0.5">
              <span className="w-2.5 h-1.5 bg-current rounded-xs opacity-90" />
              <span className="w-2.5 h-1.5 bg-current rounded-xs opacity-90" />
              <span className="w-2.5 h-1.5 bg-current rounded-xs opacity-90" />
              <span className="w-2.5 h-1.5 bg-current rounded-xs opacity-90" />
            </div>
            <span>2×2 Grid</span>
          </button>

          <button
            id="btn-layout-gridauto"
            onClick={() => setOrientation('grid_auto')}
            className={`py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center justify-center gap-1.5 ${
              orientation === 'grid_auto'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="grid grid-cols-3 gap-0.5">
              <span className="w-1.5 h-1.5 bg-current rounded-xs opacity-90" />
              <span className="w-1.5 h-1.5 bg-current rounded-xs opacity-90" />
              <span className="w-1.5 h-1.5 bg-current rounded-xs opacity-90" />
              <span className="w-1.5 h-1.5 bg-current rounded-xs opacity-90" />
              <span className="w-1.5 h-1.5 bg-current rounded-xs opacity-90" />
              <span className="w-1.5 h-1.5 bg-current rounded-xs opacity-90" />
            </div>
            <span>Auto Balanced</span>
          </button>

          <button
            id="btn-layout-custom"
            onClick={() => setOrientation('custom_grid')}
            className={`py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center justify-center gap-1.5 ${
              orientation === 'custom_grid'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-400/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Custom (R × C)</span>
          </button>
        </div>

        {/* Screen Count and Custom Grid Dimensions Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Screen Count Controls */}
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Screens</span>
              <span className="font-mono text-indigo-400 font-bold text-sm">{totalDevices}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTotalDevices(Math.max(1, totalDevices - 1))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Decrease screen count"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="flex-1 flex gap-1 justify-center">
                {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTotalDevices(n)}
                    className={`flex-1 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                      totalDevices === n
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setTotalDevices(Math.min(16, totalDevices + 1))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Increase screen count"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Custom Grid Dimensions (Rows & Cols) */}
          <div
            className={`p-3 rounded-lg border space-y-2 md:col-span-2 ${
              orientation === 'custom_grid'
                ? 'bg-indigo-950/20 border-indigo-500/30'
                : 'bg-slate-900 border-slate-800 opacity-85'
            }`}
          >
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Custom Grid Dimensions (Rows × Cols)
              </span>
              <span className="font-mono text-xs text-indigo-300">
                {gridRows} Rows × {gridCols} Cols = {gridRows * gridCols} Grid Slots
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Rows */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-12 font-medium">Rows:</span>
                <button
                  onClick={() => {
                    setGridRows(Math.max(1, gridRows - 1));
                    setOrientation('custom_grid');
                  }}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-mono font-bold text-sm text-indigo-400 w-6 text-center">{gridRows}</span>
                <button
                  onClick={() => {
                    setGridRows(Math.min(8, gridRows + 1));
                    setOrientation('custom_grid');
                  }}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setGridRows(r);
                        setOrientation('custom_grid');
                      }}
                      className={`flex-1 py-1 rounded text-[10px] font-mono ${
                        gridRows === r ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      {r}R
                    </button>
                  ))}
                </div>
              </div>

              {/* Columns */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-12 font-medium">Cols:</span>
                <button
                  onClick={() => {
                    setGridCols(Math.max(1, gridCols - 1));
                    setOrientation('custom_grid');
                  }}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-mono font-bold text-sm text-indigo-400 w-6 text-center">{gridCols}</span>
                <button
                  onClick={() => {
                    setGridCols(Math.min(8, gridCols + 1));
                    setOrientation('custom_grid');
                  }}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4, 5].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setGridCols(c);
                        setOrientation('custom_grid');
                      }}
                      className={`flex-1 py-1 rounded text-[10px] font-mono ${
                        gridCols === c ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      {c}C
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Visual Grid Topology Canvas */}
        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Move className="w-3 h-3 text-indigo-400" />
              Interactive Matrix Slot Mapping (Click a slot to assign a device)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onBatchAssignLayout('ltr')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                title="Fill Left to Right"
              >
                L $\to$ R
              </button>
              <button
                onClick={() => onBatchAssignLayout('ttb')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                title="Fill Top to Bottom"
              >
                Top $\to$ Bottom
              </button>
              <button
                onClick={() => onBatchAssignLayout('invert_cols')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                title="Reverse Column Order"
              >
                Flip Cols
              </button>
              <button
                onClick={() => onBatchAssignLayout('reset')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 flex items-center gap-1"
                title="Reset layout order"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Reset
              </button>
            </div>
          </div>

          {/* Grid of Slots */}
          <div
            className="grid gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800/80 overflow-x-auto"
            style={{
              gridTemplateColumns: `repeat(${effectiveCols}, minmax(80px, 1fr))`,
              gridTemplateRows: `repeat(${effectiveRows}, minmax(60px, auto))`
            }}
          >
            {Array.from({ length: effectiveRows }).map((_, r) =>
              Array.from({ length: effectiveCols }).map((_, c) => {
                const assignedDevice = clients.find(
                  (d) => d.assignedSegment.row === r && d.assignedSegment.col === c
                );
                const isSelected = selectedSlot?.row === r && selectedSlot?.col === c;

                return (
                  <div
                    key={`slot-${r}-${c}`}
                    onClick={() => setSelectedSlot(isSelected ? null : { row: r, col: c })}
                    className={`p-2 rounded-md border text-xs font-mono flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-950/50 ring-2 ring-indigo-500/40 shadow-md'
                        : assignedDevice
                        ? assignedDevice.index === 0
                          ? 'border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-400'
                          : 'border-slate-700 bg-slate-900/90 hover:border-indigo-500/60'
                        : 'border-dashed border-slate-800 bg-slate-950 text-slate-600 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-slate-400 font-semibold">
                        [R{r}:C{c}]
                      </span>
                      {assignedDevice && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            assignedDevice.index === 0 ? 'bg-emerald-400' : 'bg-indigo-400'
                          }`}
                        />
                      )}
                    </div>

                    <div className="my-1 truncate font-medium">
                      {assignedDevice ? (
                        <span
                          className={assignedDevice.index === 0 ? 'text-emerald-300 font-bold' : 'text-slate-200'}
                        >
                          {assignedDevice.index === 0 ? 'MASTER #1' : `DEV #${assignedDevice.index + 1}`}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">Vacant Slot</span>
                      )}
                    </div>

                    <div className="text-[8px] text-slate-500 flex justify-between items-center">
                      <span>{assignedDevice ? assignedDevice.ip.split(' ')[0] : 'Click to bind'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Slot Quick Assignment Popover / Banner */}
          {selectedSlot && (
            <div className="bg-slate-900 p-2.5 rounded-lg border border-indigo-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-indigo-300 font-bold">
                  Slot [Row {selectedSlot.row}, Col {selectedSlot.col}]:
                </span>
                <span className="text-slate-400">Assign device:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {clients.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      onUpdateDevicePosition(d.index, selectedSlot.row, selectedSlot.col);
                      setSelectedSlot(null);
                    }}
                    className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                      d.assignedSegment.row === selectedSlot.row && d.assignedSegment.col === selectedSlot.col
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {d.index === 0 ? '01 Master' : `0${d.index + 1} Client`}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Aspect Ratio & Splicing Fitting Studio */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-indigo-400" />
            2. Aspect Ratio & Scaling Mode
          </label>
          <span className="text-[11px] font-mono text-slate-400">
            Selected Ratio: <span className="text-white font-bold">{aspectRatioMode.toUpperCase()}</span>
          </span>
        </div>

        {/* Aspect Ratio Preset Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {(
            [
              { id: 'auto', label: 'Auto Source', desc: 'Match Video' },
              { id: '16:9', label: '16 : 9', desc: 'Widescreen' },
              { id: '9:16', label: '9 : 16', desc: 'Shorts/TikTok' },
              { id: '4:3', label: '4 : 3', desc: 'Standard TV' },
              { id: '1:1', label: '1 : 1', desc: 'Square Wall' },
              { id: '21:9', label: '21 : 9', desc: 'Ultrawide' },
              { id: '32:9', label: '32 : 9', desc: 'Super Ultra' },
              { id: 'custom', label: 'Custom W:H', desc: `${customAspectRatioValue.toFixed(2)}:1` }
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setAspectRatioMode(item.id)}
              className={`p-2 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                aspectRatioMode === item.id
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-400/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-xs font-mono">{item.label}</div>
              <div className="text-[9px] text-slate-500">{item.desc}</div>
            </button>
          ))}
        </div>

        {/* Custom Aspect Ratio Slider if Custom mode */}
        {aspectRatioMode === 'custom' && (
          <div className="bg-slate-900 p-3 rounded-lg border border-indigo-500/30 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-indigo-300 font-mono">Custom Target Ratio (Width / Height)</span>
              <span className="font-mono text-indigo-400 font-bold">{customAspectRatioValue.toFixed(2)} : 1.0</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="4.0"
              step="0.05"
              value={customAspectRatioValue}
              onChange={(e) => setCustomAspectRatioValue(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>0.40 (Ultra Tall)</span>
              <span>1.00 (Square)</span>
              <span>1.78 (16:9)</span>
              <span>2.33 (21:9)</span>
              <span>4.00 (Ultra Wide)</span>
            </div>
          </div>
        )}

        {/* Splicing Fitting Mode & Bezel Compensation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Scaling / Cropping Mode */}
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Splicing Scaling Mode
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setScaleMode('cover')}
                className={`py-1.5 px-2 rounded text-xs font-medium border transition-colors ${
                  scaleMode === 'cover'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Cover (Seamless)
              </button>
              <button
                onClick={() => setScaleMode('contain')}
                className={`py-1.5 px-2 rounded text-xs font-medium border transition-colors ${
                  scaleMode === 'contain'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Fit (Letterbox)
              </button>
              <button
                onClick={() => setScaleMode('stretch')}
                className={`py-1.5 px-2 rounded text-xs font-medium border transition-colors ${
                  scaleMode === 'stretch'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Stretch (Grid)
              </button>
            </div>
          </div>

          {/* Bezel Gap Compensation */}
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Bezel Gap Compensation
              </span>
              <span className="font-mono text-indigo-400 font-bold">{bezelCompensation}%</span>
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
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>0% (Bezelless)</span>
              <span>10% (Medium Frame)</span>
              <span>20% (Thick Bezel)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Per-Screen Manual Coordinates & Settings Table */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            3. Per-Screen Manual Coordinates & Device Config ({clients.length} Devices)
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {clients.map((client) => {
            const isHost = client.index === 0;
            const isEnabled = client.enabled !== false;

            return (
              <div
                key={client.id}
                className={`p-3 rounded-lg border text-xs font-mono transition-colors ${
                  isHost
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : isEnabled
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isHost ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                    <span className="font-bold text-slate-200">
                      {isHost ? '01 Master' : `0${client.index + 1} Client`}
                    </span>
                    <span className="text-[9px] text-slate-500">({client.ip.split(' ')[0]})</span>
                  </div>

                  <button
                    onClick={() => onToggleDeviceEnabled(client.index)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                      isEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isEnabled ? 'ACTIVE' : 'STANDBY'}
                  </button>
                </div>

                {/* Coordinates & Rotation Pickers */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
                  {/* Row */}
                  <div>
                    <label className="text-[9px] text-slate-500 block mb-0.5">Row</label>
                    <select
                      value={client.assignedSegment.row}
                      onChange={(e) =>
                        onUpdateDevicePosition(client.index, parseInt(e.target.value), client.assignedSegment.col)
                      }
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded px-1 py-1 text-xs"
                    >
                      {Array.from({ length: effectiveRows }).map((_, r) => (
                        <option key={r} value={r}>
                          Row {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Col */}
                  <div>
                    <label className="text-[9px] text-slate-500 block mb-0.5">Column</label>
                    <select
                      value={client.assignedSegment.col}
                      onChange={(e) =>
                        onUpdateDevicePosition(client.index, client.assignedSegment.row, parseInt(e.target.value))
                      }
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded px-1 py-1 text-xs"
                    >
                      {Array.from({ length: effectiveCols }).map((_, c) => (
                        <option key={c} value={c}>
                          Col {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rotation */}
                  <div>
                    <label className="text-[9px] text-slate-500 block mb-0.5">Rotation</label>
                    <button
                      onClick={() => {
                        const current = client.rotation || 0;
                        const next = ((current + 90) % 360) as 0 | 90 | 180 | 270;
                        onUpdateDeviceRotation(client.index, next);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 text-slate-200 rounded px-1 py-1 text-xs flex items-center justify-center gap-1"
                      title="Rotate Screen 90 degrees"
                    >
                      <RotateCw className="w-2.5 h-2.5 text-indigo-400" />
                      <span>{client.rotation || 0}°</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: Media Source Stream Selector */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
            Media Source Stream
          </label>
          <label className="cursor-pointer text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium">
            <Upload className="w-3 h-3" /> Custom MP4 File
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={onCustomFileUpload}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {videoOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelectVideo(opt.id)}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-colors ${
                selectedVideoId === opt.id
                  ? 'bg-indigo-600/15 border-indigo-500 text-white'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-medium text-xs truncate text-slate-200">{opt.title}</div>
              <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                <span>{opt.width}x{opt.height}</span>
                <span>{opt.isTestPattern ? 'CALIBRATION' : `${opt.duration}s`}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 5: Master Playback Transport Controls */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
        {/* Timeline Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span className="text-slate-500 uppercase tracking-wider">Scheduled Sync Timeline</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.05"
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Play / Pause Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              id="btn-master-play-pause"
              onClick={onTogglePlay}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'PAUSE ALL SCREENS' : 'BROADCAST PLAY (NTP SYNC)'}</span>
            </button>

            <button
              onClick={onRestart}
              title="Restart from beginning"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={preserveAspectRatio}
                onChange={(e) => setPreserveAspectRatio(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
              />
              <span className="text-[11px]">Auto Aspect-Ratio Fit</span>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 6: Network Simulation & HUD Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Latency / Ping simulation */}
        <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-indigo-400" /> Simulated Wi-Fi RTT
            </span>
            <span className="font-mono text-indigo-400 font-semibold">{simulatedPing}ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            step="5"
            value={simulatedPing}
            onChange={(e) => setSimulatedPing(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* HUD & Bezel display toggles */}
        <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Viewport HUD & Bezels
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showBezels}
                onChange={(e) => setShowBezels(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
              />
              <span className="text-[11px]">Bezels</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOverlayStats}
                onChange={(e) => setShowOverlayStats(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
              />
              <span className="text-[11px]">Matrix HUD</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
