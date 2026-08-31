import React, { useState } from 'react';
import { AspectRatioMode, OrientationMode, ScaleMode } from '../../types';
import { calculateScreenMatrix } from '../../utils/matrixMath';
import {
  Calculator,
  Layers,
  Sparkles,
  Smartphone,
  Copy,
  Check,
  Info,
  ArrowRight,
  Maximize,
  Grid,
  Sliders,
  RotateCw
} from 'lucide-react';

export const MatrixMathInspector: React.FC = () => {
  const [orientation, setOrientation] = useState<OrientationMode>('custom_grid');
  const [totalDevices, setTotalDevices] = useState<number>(4);
  const [gridRows, setGridRows] = useState<number>(2);
  const [gridCols, setGridCols] = useState<number>(2);
  const [inspectedRow, setInspectedRow] = useState<number>(0);
  const [inspectedCol, setInspectedCol] = useState<number>(0);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);

  const [aspectRatioMode, setAspectRatioMode] = useState<AspectRatioMode>('16:9');
  const [customAspectValue, setCustomAspectValue] = useState<number>(1.78);
  const [scaleMode, setScaleMode] = useState<ScaleMode>('cover');

  const [viewWidth, setViewWidth] = useState<number>(360);
  const [viewHeight, setViewHeight] = useState<number>(640);
  const [videoWidth, setVideoWidth] = useState<number>(1920);
  const [videoHeight, setVideoHeight] = useState<number>(1080);
  const [bezelCompensation, setBezelCompensation] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

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

  const safeRow = Math.min(inspectedRow, effectiveRows - 1);
  const safeCol = Math.min(inspectedCol, effectiveCols - 1);

  const matrixResult = calculateScreenMatrix({
    deviceIndex: safeRow * effectiveCols + safeCol,
    totalDevices,
    orientation,
    viewWidth,
    viewHeight,
    videoWidth,
    videoHeight,
    customRow: safeRow,
    customCol: safeCol,
    gridRows: effectiveRows,
    gridCols: effectiveCols,
    aspectRatioMode,
    customAspectRatioValue: customAspectValue,
    scaleMode,
    rotation,
    bezelCompensationPercent: bezelCompensation,
    preserveAspectRatio: true
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(matrixResult.matrixCodeKotlin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const virtualWallWidth = viewWidth * effectiveCols;
  const virtualWallHeight = viewHeight * effectiveRows;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-medium uppercase tracking-wider text-white">
              TextureView 3x3 Matrix Transformation Engine
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Android's <code className="text-indigo-300 font-mono text-[11px]">TextureView.setTransform(matrix)</code> applies hardware affine matrix transformation to map and slice any virtual wall geometry ({effectiveRows}x{effectiveCols}), aspect ratio, and screen orientation.
          </p>
        </div>
      </div>

      {/* Interactive Controls & 3x3 Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Parameters */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> Manual Topology & Splicing Controls
          </h3>

          {/* Orientation Mode */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Wall Layout Mode</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'horizontal', label: '1×N Row' },
                  { id: 'vertical', label: 'N×1 Col' },
                  { id: 'grid_auto', label: 'Auto Grid' },
                  { id: 'custom_grid', label: 'Custom R×C' }
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setOrientation(m.id)}
                  className={`py-1.5 px-2 rounded text-xs font-medium border transition-colors ${
                    orientation === m.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Grid Dimensions (if Custom Grid) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Rows</label>
                <span className="font-mono text-indigo-400 font-semibold">{effectiveRows}</span>
              </div>
              <input
                type="number"
                min="1"
                max="8"
                value={gridRows}
                onChange={(e) => {
                  setGridRows(Math.max(1, parseInt(e.target.value) || 1));
                  setOrientation('custom_grid');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Columns</label>
                <span className="font-mono text-indigo-400 font-semibold">{effectiveCols}</span>
              </div>
              <input
                type="number"
                min="1"
                max="8"
                value={gridCols}
                onChange={(e) => {
                  setGridCols(Math.max(1, parseInt(e.target.value) || 1));
                  setOrientation('custom_grid');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
              />
            </div>
          </div>

          {/* Inspected Screen Slot Coordinate */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 block">
              Inspected Screen Position (Row, Col)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">Assigned Row (0..{effectiveRows - 1})</label>
                <select
                  value={safeRow}
                  onChange={(e) => setInspectedRow(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono"
                >
                  {Array.from({ length: effectiveRows }).map((_, r) => (
                    <option key={r} value={r}>
                      Row {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">Assigned Col (0..{effectiveCols - 1})</label>
                <select
                  value={safeCol}
                  onChange={(e) => setInspectedCol(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono"
                >
                  {Array.from({ length: effectiveCols }).map((_, c) => (
                    <option key={c} value={c}>
                      Col {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Aspect Ratio & Scale Mode */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Aspect Ratio Mode</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['auto', '16:9', '9:16', '4:3', '1:1', '21:9', '32:9', 'custom'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setAspectRatioMode(r)}
                  className={`py-1 px-1.5 rounded text-[11px] font-mono border transition-colors ${
                    aspectRatioMode === r
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Scale Mode */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Scale Mode</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['cover', 'contain', 'stretch'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScaleMode(s)}
                  className={`py-1 px-2 rounded text-xs font-medium border capitalize transition-colors ${
                    scaleMode === s
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: 3x3 Matrix & Live Transformation Visualizer */}
        <div className="lg:col-span-7 space-y-5">
          {/* 3x3 Matrix Grid Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Active android.graphics.Matrix Values
              </h3>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                Slot [Row {safeRow}, Col {safeCol}]
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-indigo-500/20">
                <div className="text-[9px] text-slate-500 uppercase">MSCALE_X (scaleX)</div>
                <div className="text-sm font-semibold text-indigo-400">{matrixResult.scaleX.toFixed(3)}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase">MSKEW_X</div>
                <div className="text-sm text-slate-400">0.000</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-500/20">
                <div className="text-[9px] text-slate-500 uppercase">MTRANS_X (dx)</div>
                <div className="text-sm font-semibold text-emerald-400">{matrixResult.translateX.toFixed(1)}px</div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase">MSKEW_Y</div>
                <div className="text-sm text-slate-400">0.000</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-indigo-500/20">
                <div className="text-[9px] text-slate-500 uppercase">MSCALE_Y (scaleY)</div>
                <div className="text-sm font-semibold text-indigo-400">{matrixResult.scaleY.toFixed(3)}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-500/20">
                <div className="text-[9px] text-slate-500 uppercase">MTRANS_Y (dy)</div>
                <div className="text-sm font-semibold text-emerald-400">{matrixResult.translateY.toFixed(1)}px</div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase">MPERSP_0</div>
                <div className="text-sm text-slate-500">0.000</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase">MPERSP_1</div>
                <div className="text-sm text-slate-500">0.000</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase">MPERSP_2</div>
                <div className="text-sm font-semibold text-slate-200">1.000</div>
              </div>
            </div>
          </div>

          {/* Visual Slicing Diagram */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Maximize className="w-3.5 h-3.5 text-emerald-400" /> Virtual Wall Grid Geometry ({effectiveRows}×{effectiveCols})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Total Wall: {virtualWallWidth}x{virtualWallHeight}px
              </span>
            </div>

            {/* Virtual Wall Frame Box */}
            <div className="relative w-full min-h-[160px] bg-black rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center p-3">
              <div
                className="w-full h-full grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${effectiveRows}, minmax(60px, 1fr))`
                }}
              >
                {Array.from({ length: effectiveRows }).map((_, r) =>
                  Array.from({ length: effectiveCols }).map((_, c) => {
                    const isCurrent = r === safeRow && c === safeCol;
                    return (
                      <div
                        key={`cell-${r}-${c}`}
                        onClick={() => {
                          setInspectedRow(r);
                          setInspectedCol(c);
                        }}
                        className={`flex flex-col items-center justify-center border rounded p-2 cursor-pointer transition-all ${
                          isCurrent
                            ? 'border-emerald-400 bg-emerald-500/20 shadow-md ring-1 ring-emerald-400 z-10'
                            : 'border-slate-800 bg-slate-950/40 text-slate-600 hover:border-slate-700'
                        }`}
                      >
                        <span className={`text-xs font-mono font-medium ${isCurrent ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                          [R{r}, C{c}]
                        </span>
                        {isCurrent && (
                          <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest mt-1">
                            ACTIVE SCREEN
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Kotlin Implementation Block */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="font-mono text-xs text-indigo-400 font-medium">
              MatrixTransformHelper.kt (Generated Logic for Screen [Row {safeRow}, Col {safeCol}])
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied!' : 'Copy Snippet'}</span>
          </button>
        </div>
        <div className="p-4 bg-black font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
          <pre className="select-text">
            <code>{matrixResult.matrixCodeKotlin}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
