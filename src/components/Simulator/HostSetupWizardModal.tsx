import React, { useState } from 'react';
import {
  AspectRatioMode,
  ClientDevice,
  OrientationMode,
  ScaleMode
} from '../../types';
import {
  Smartphone,
  Layers,
  ArrowRight,
  ArrowLeft,
  Check,
  Tv,
  Grid,
  Columns,
  Rows,
  Sliders,
  Sparkles,
  Plus,
  Minus,
  Eye,
  RefreshCw,
  X,
  Shuffle,
  Monitor
} from 'lucide-react';

interface HostSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDevices: number;
  setTotalDevices: (n: number) => void;
  orientation: OrientationMode;
  setOrientation: (o: OrientationMode) => void;
  gridRows: number;
  setGridRows: (r: number) => void;
  gridCols: number;
  setGridCols: (c: number) => void;
  aspectRatioMode: AspectRatioMode;
  setAspectRatioMode: (mode: AspectRatioMode) => void;
  scaleMode: ScaleMode;
  setScaleMode: (mode: ScaleMode) => void;
  clients: ClientDevice[];
  onUpdateDevicePosition: (deviceIndex: number, row: number, col: number) => void;
  onBatchAssignLayout: (type: 'ltr' | 'rtl' | 'ttb' | 'invert_cols' | 'invert_rows' | 'reset') => void;
  onTriggerIdentifyScreens?: () => void;
}

export const HostSetupWizardModal: React.FC<HostSetupWizardModalProps> = ({
  isOpen,
  onClose,
  totalDevices,
  setTotalDevices,
  orientation,
  setOrientation,
  gridRows,
  setGridRows,
  gridCols,
  setGridCols,
  aspectRatioMode,
  setAspectRatioMode,
  scaleMode,
  setScaleMode,
  clients,
  onUpdateDevicePosition,
  onBatchAssignLayout,
  onTriggerIdentifyScreens
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Local draft state during wizard
  const [tempTotalDevices, setTempTotalDevices] = useState<number>(totalDevices);
  const [tempOrientation, setTempOrientation] = useState<OrientationMode>(orientation);
  const [tempRows, setTempRows] = useState<number>(gridRows);
  const [tempCols, setTempCols] = useState<number>(gridCols);
  const [tempAspect, setTempAspect] = useState<AspectRatioMode>(aspectRatioMode);
  const [tempScale, setTempScale] = useState<ScaleMode>(scaleMode);
  const [selectedSlot, setSelectedSlot] = useState<{ row: number; col: number } | null>(null);

  if (!isOpen) return null;

  // Calculate effective layout based on current orientation and count
  const effectiveRows =
    tempOrientation === 'horizontal'
      ? 1
      : tempOrientation === 'vertical'
      ? tempTotalDevices
      : tempOrientation === 'grid_2x2'
      ? Math.ceil(tempTotalDevices / 2)
      : tempOrientation === 'grid_auto'
      ? tempTotalDevices <= 3
        ? 1
        : tempTotalDevices === 4
        ? 2
        : tempTotalDevices <= 6
        ? Math.ceil(tempTotalDevices / 3)
        : Math.ceil(tempTotalDevices / 4)
      : tempRows;

  const effectiveCols =
    tempOrientation === 'horizontal'
      ? tempTotalDevices
      : tempOrientation === 'vertical'
      ? 1
      : tempOrientation === 'grid_2x2'
      ? 2
      : tempOrientation === 'grid_auto'
      ? tempTotalDevices <= 3
        ? tempTotalDevices
        : tempTotalDevices === 4
        ? 2
        : tempTotalDevices <= 6
        ? 3
        : 4
      : tempCols;

  const handleApplyAndFinish = () => {
    setTotalDevices(tempTotalDevices);
    setOrientation(tempOrientation);
    setGridRows(tempRows);
    setGridCols(tempCols);
    setAspectRatioMode(tempAspect);
    setScaleMode(tempScale);
    onClose();
  };

  const handleQuickCountSelect = (count: number) => {
    setTempTotalDevices(count);
    if (tempOrientation === 'horizontal') {
      setTempCols(count);
      setTempRows(1);
    } else if (tempOrientation === 'vertical') {
      setTempRows(count);
      setTempCols(1);
    } else if (tempOrientation === 'grid_2x2') {
      setTempRows(Math.ceil(count / 2));
      setTempCols(2);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">
                Host Video Wall Setup Wizard
              </h2>
              <p className="text-xs text-slate-400">
                Configure screen count, division orientation, and physical screen arrangement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          {[
            { step: 1, title: '1. Screen Count' },
            { step: 2, title: '2. Video Division' },
            { step: 3, title: '3. Screen Arrangement' },
            { step: 4, title: '4. Aspect & Fit' }
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => setCurrentStep(item.step as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                currentStep === item.step
                  ? 'bg-indigo-600 text-white shadow-md'
                  : currentStep > item.step
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {currentStep > item.step ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold">
                  {item.step}
                </span>
              )}
              <span>{item.title}</span>
            </button>
          ))}
        </div>

        {/* Wizard Body / Step Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: How many screens do you have? */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">
                  Step 1: How many screens do you have connected?
                </h3>
                <p className="text-xs text-slate-400">
                  The screen count is not fixed. The video will automatically divide and slice according to how many screens are connected to your host.
                </p>
              </div>

              {/* Dynamic Number Stepper & Counter */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-xs font-mono uppercase tracking-widest text-slate-400">
                    Total Connected Screens
                  </div>
                  <div className="text-4xl font-bold font-mono text-indigo-400">
                    {tempTotalDevices} <span className="text-base font-normal text-slate-500">Screen{tempTotalDevices > 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    1 Host Device + {tempTotalDevices - 1} Client Node{tempTotalDevices > 2 ? 's' : ''}
                  </div>
                </div>

                {/* Plus / Minus Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuickCountSelect(Math.max(1, tempTotalDevices - 1))}
                    disabled={tempTotalDevices <= 1}
                    className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white flex items-center justify-center font-bold text-lg border border-slate-700 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-16 text-center font-mono text-2xl font-bold text-white">
                    {tempTotalDevices}
                  </span>
                  <button
                    onClick={() => handleQuickCountSelect(Math.min(16, tempTotalDevices + 1))}
                    disabled={tempTotalDevices >= 16}
                    className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-600/20 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">
                  Quick Select Screen Quantity:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[2, 3, 4, 5, 6, 8].map((count) => (
                    <button
                      key={count}
                      onClick={() => handleQuickCountSelect(count)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-semibold transition-all flex flex-col items-center gap-1 ${
                        tempTotalDevices === count
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">{count}</span>
                      <span className="text-[10px] font-sans text-slate-400 font-normal">Screens</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Connected Devices List */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    Detected Active Devices ({tempTotalDevices})
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Auto-Synchronized
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {Array.from({ length: tempTotalDevices }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className="font-medium text-slate-200">
                          {i === 0 ? 'Master Host Device' : `Screen Client #${i + 1}`}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {i === 0 ? '192.168.1.100 (Host)' : `192.168.1.${100 + i}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: How would you like to play the video? (Orientation / Splice) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">
                  Step 2: How would you like to play and slice the video?
                </h3>
                <p className="text-xs text-slate-400">
                  Select how the master video frame will be partitioned and divided across your {tempTotalDevices} screens.
                </p>
              </div>

              {/* Orientation Mode Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Horizontal Strip */}
                <div
                  onClick={() => {
                    setTempOrientation('horizontal');
                    setTempRows(1);
                    setTempCols(tempTotalDevices);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-3 ${
                    tempOrientation === 'horizontal'
                      ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Columns className="w-5 h-5 text-indigo-400" />
                      <h4 className="text-sm font-semibold text-white">
                        Horizontal Strip (1 × {tempTotalDevices})
                      </h4>
                    </div>
                    {tempOrientation === 'horizontal' && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Arranges screens side-by-side horizontally. The video is sliced left-to-right into {tempTotalDevices} vertical strips for a wide panoramic experience.
                  </p>
                  {/* Miniature visual preview */}
                  <div className="flex gap-1 h-10 w-full bg-slate-900 p-1 rounded border border-slate-800">
                    {Array.from({ length: Math.min(tempTotalDevices, 6) }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-indigo-600/30 border border-indigo-500/50 rounded flex items-center justify-center text-[9px] font-mono text-indigo-300"
                      >
                        S{idx + 1}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Option 2: Vertical Column */}
                <div
                  onClick={() => {
                    setTempOrientation('vertical');
                    setTempRows(tempTotalDevices);
                    setTempCols(1);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-3 ${
                    tempOrientation === 'vertical'
                      ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Rows className="w-5 h-5 text-indigo-400" />
                      <h4 className="text-sm font-semibold text-white">
                        Vertical Column ({tempTotalDevices} × 1)
                      </h4>
                    </div>
                    {tempOrientation === 'vertical' && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Stacks screens vertically top-to-bottom. The video is sliced top-to-bottom into {tempTotalDevices} horizontal slices (Totem / Tower display).
                  </p>
                  {/* Miniature visual preview */}
                  <div className="flex flex-col gap-1 h-16 w-16 mx-auto bg-slate-900 p-1 rounded border border-slate-800">
                    {Array.from({ length: Math.min(tempTotalDevices, 4) }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-indigo-600/30 border border-indigo-500/50 rounded flex items-center justify-center text-[8px] font-mono text-indigo-300"
                      >
                        S{idx + 1}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Option 3: 2D Grid Matrix */}
                <div
                  onClick={() => {
                    setTempOrientation('grid_auto');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-3 ${
                    tempOrientation === 'grid_auto' || tempOrientation === 'grid_2x2'
                      ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Grid className="w-5 h-5 text-indigo-400" />
                      <h4 className="text-sm font-semibold text-white">
                        2D Matrix Grid ({effectiveRows} × {effectiveCols})
                      </h4>
                    </div>
                    {(tempOrientation === 'grid_auto' || tempOrientation === 'grid_2x2') && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Divides video into a 2D matrix array with balanced rows and columns. Ideal for 2×2, 2×3, or 3×3 video walls.
                  </p>
                  {/* Miniature visual preview */}
                  <div
                    className="grid gap-1 h-16 w-24 mx-auto bg-slate-900 p-1 rounded border border-slate-800"
                    style={{
                      gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${effectiveRows}, minmax(0, 1fr))`
                    }}
                  >
                    {Array.from({ length: tempTotalDevices }).map((_, idx) => (
                      <div
                        key={idx}
                        className="bg-indigo-600/30 border border-indigo-500/50 rounded flex items-center justify-center text-[8px] font-mono text-indigo-300"
                      >
                        S{idx + 1}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Option 4: Custom Rows & Columns */}
                <div
                  onClick={() => {
                    setTempOrientation('custom_grid');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-3 ${
                    tempOrientation === 'custom_grid'
                      ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-indigo-400" />
                      <h4 className="text-sm font-semibold text-white">
                        Custom R × C Matrix
                      </h4>
                    </div>
                    {tempOrientation === 'custom_grid' && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Explicitly specify any custom row and column geometry for non-standard wall shapes.
                  </p>

                  {/* Row / Col Steppers */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Rows</span>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={tempRows}
                        onChange={(e) => {
                          setTempRows(Math.max(1, parseInt(e.target.value) || 1));
                          setTempOrientation('custom_grid');
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Cols</span>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={tempCols}
                        onChange={(e) => {
                          setTempCols(Math.max(1, parseInt(e.target.value) || 1));
                          setTempOrientation('custom_grid');
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: How do you want to arrange the screens? (Screen Arrangement) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">
                  Step 3: How do you want to arrange the screens?
                </h3>
                <p className="text-xs text-slate-400">
                  Assign which physical device corresponds to which slot on your wall. Click any slot below to place or swap a screen.
                </p>
              </div>

              {/* Quick Arrangement Preset Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-xs font-medium text-slate-300">
                  Quick Ordering Presets:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => onBatchAssignLayout('ltr')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Left → Right (1..N)
                  </button>
                  <button
                    onClick={() => onBatchAssignLayout('rtl')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Right → Left (N..1)
                  </button>
                  <button
                    onClick={() => onBatchAssignLayout('ttb')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Top → Bottom
                  </button>
                  {onTriggerIdentifyScreens && (
                    <button
                      onClick={onTriggerIdentifyScreens}
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Identify Screens</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Interactive Screen Grid Map */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Physical Video Wall Canvas ({effectiveRows} Rows × {effectiveCols} Columns)</span>
                  <span className="font-mono text-indigo-400">
                    {tempTotalDevices} Active Screens Assigned
                  </span>
                </div>

                <div
                  className="w-full gap-3 transition-all"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${effectiveRows}, minmax(80px, auto))`
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
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-950/60 border-indigo-400 ring-2 ring-indigo-400 shadow-lg'
                              : assignedDevice
                              ? 'bg-slate-900 border-slate-700 hover:border-slate-600'
                              : 'bg-slate-950/50 border-dashed border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">
                              [Row {r}, Col {c}]
                            </span>
                            {assignedDevice && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                          </div>

                          <div className="my-2 text-center">
                            {assignedDevice ? (
                              <div>
                                <div className="text-xs font-bold text-white">
                                  {assignedDevice.name}
                                </div>
                                <div className="text-[10px] font-mono text-indigo-300 mt-0.5">
                                  {assignedDevice.index === 0 ? 'Master Host' : `Node #${assignedDevice.index + 1}`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">
                                Empty Slot
                              </span>
                            )}
                          </div>

                          <div className="text-[9px] text-center text-slate-500 font-mono">
                            {assignedDevice ? assignedDevice.ip : 'Click to assign'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Device Placement Drawer when a slot is selected */}
                {selectedSlot && (
                  <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        Assign Screen to Slot [Row {selectedSlot.row}, Col {selectedSlot.col}]:
                      </span>
                      <button
                        onClick={() => setSelectedSlot(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {clients.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => {
                            onUpdateDevicePosition(d.index, selectedSlot.row, selectedSlot.col);
                            setSelectedSlot(null);
                          }}
                          className={`p-2 rounded-lg border text-xs text-left transition-colors ${
                            d.assignedSegment.row === selectedSlot.row &&
                            d.assignedSegment.col === selectedSlot.col
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="font-medium truncate">{d.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Currently: [R{d.assignedSegment.row}:C{d.assignedSegment.col}]
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Aspect Ratio & Video Fit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">
                  Step 4: Aspect Ratio & Video Fit Mode
                </h3>
                <p className="text-xs text-slate-400">
                  Select the desired aspect ratio and scaling behavior across your overall virtual wall.
                </p>
              </div>

              {/* Aspect Ratio Modes */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">
                  Target Wall Aspect Ratio:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'auto', label: 'Auto (Original Video)' },
                      { id: '16:9', label: '16:9 Standard HD' },
                      { id: '9:16', label: '9:16 Vertical Video' },
                      { id: '4:3', label: '4:3 Classic TV' },
                      { id: '1:1', label: '1:1 Square' },
                      { id: '21:9', label: '21:9 UltraWide' },
                      { id: '32:9', label: '32:9 Super UltraWide' },
                      { id: 'custom', label: 'Custom Numerical' }
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTempAspect(item.id)}
                      className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                        tempAspect === item.id
                          ? 'bg-indigo-950/50 border-indigo-500 text-white ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono font-semibold uppercase">{item.id}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale Modes */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">
                  Scale & Crop Mode:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      {
                        id: 'cover',
                        title: 'Cover (Full Bleed)',
                        desc: 'Fills the entire wall with no black borders (crops excess).'
                      },
                      {
                        id: 'contain',
                        title: 'Contain (Letterbox)',
                        desc: 'Fits entire video without cropping (adds black bars if needed).'
                      },
                      {
                        id: 'stretch',
                        title: 'Stretch (Exact Fit)',
                        desc: 'Stretches the frame to exactly match the wall boundaries.'
                      }
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTempScale(item.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        tempScale === item.id
                          ? 'bg-indigo-950/50 border-indigo-500 text-white ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">{item.title}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configuration Summary Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Final Wall Configuration Summary
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-300 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">SCREENS</span>
                    {tempTotalDevices} Active Nodes
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">ORIENTATION</span>
                    {tempOrientation.toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">GRID MATRIX</span>
                    {effectiveRows} × {effectiveCols}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">ASPECT & SCALE</span>
                    {tempAspect.toUpperCase()} ({tempScale.toUpperCase()})
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((currentStep - 1) as any)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep((currentStep + 1) as any)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleApplyAndFinish}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Apply & Divide Video Wall</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
