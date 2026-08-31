import React, { useRef, useEffect, useState } from 'react';
import { AspectRatioMode, ClientDevice, MatrixTransformResult, OrientationMode, ScaleMode } from '../../types';
import { calculateScreenMatrix } from '../../utils/matrixMath';
import { ExternalLink, Smartphone, Tv, RotateCw, Check, Grid, Move } from 'lucide-react';

interface DeviceScreenProps {
  device: ClientDevice;
  totalDevices: number;
  orientation: OrientationMode;
  gridRows?: number;
  gridCols?: number;
  aspectRatioMode?: AspectRatioMode;
  customAspectRatioValue?: number;
  scaleMode?: ScaleMode;
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
  canvasTestPatternRef: React.RefObject<HTMLCanvasElement | null>;
  useTestPattern: boolean;
  videoWidth: number;
  videoHeight: number;
  showBezel: boolean;
  showOverlayStats: boolean;
  preserveAspectRatio: boolean;
  bezelCompensationPercent: number;
  isIdentifying?: boolean;
  isImmersionMode?: boolean;
  onPopoutWindow?: (deviceIndex: number) => void;
  onUpdateDevicePosition?: (deviceIndex: number, row: number, col: number) => void;
  onToggleDeviceEnabled?: (deviceIndex: number) => void;
}

export const DeviceScreen: React.FC<DeviceScreenProps> = ({
  device,
  totalDevices,
  orientation,
  gridRows = 1,
  gridCols = 1,
  aspectRatioMode = 'auto',
  customAspectRatioValue,
  scaleMode = 'cover',
  videoElementRef,
  canvasTestPatternRef,
  useTestPattern,
  videoWidth,
  videoHeight,
  showBezel,
  showOverlayStats,
  preserveAspectRatio,
  bezelCompensationPercent,
  isIdentifying,
  isImmersionMode = false,
  onPopoutWindow,
  onUpdateDevicePosition,
  onToggleDeviceEnabled
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 320, height: 180 });
  const [matrixResult, setMatrixResult] = useState<MatrixTransformResult | null>(null);
  const [isEditingPosition, setIsEditingPosition] = useState<boolean>(false);

  // Measure container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute Matrix whenever dimensions or wall parameters change
  useEffect(() => {
    const res = calculateScreenMatrix({
      deviceIndex: device.index,
      totalDevices,
      orientation,
      viewWidth: dimensions.width,
      viewHeight: dimensions.height,
      videoWidth,
      videoHeight,
      customRow: device.assignedSegment.row,
      customCol: device.assignedSegment.col,
      gridRows: device.assignedSegment.totalRows || gridRows,
      gridCols: device.assignedSegment.totalCols || gridCols,
      aspectRatioMode,
      customAspectRatioValue,
      scaleMode,
      rotation: device.rotation || 0,
      bezelCompensationPercent,
      preserveAspectRatio
    });
    setMatrixResult(res);
  }, [
    device.index,
    device.assignedSegment.row,
    device.assignedSegment.col,
    device.assignedSegment.totalRows,
    device.assignedSegment.totalCols,
    device.rotation,
    totalDevices,
    orientation,
    gridRows,
    gridCols,
    aspectRatioMode,
    customAspectRatioValue,
    scaleMode,
    dimensions.width,
    dimensions.height,
    videoWidth,
    videoHeight,
    preserveAspectRatio,
    bezelCompensationPercent
  ]);

  // Continuous frame rendering loop to mimic TextureView GPU buffer rendering
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && matrixResult) {
        // Set canvas resolution to match container
        if (canvas.width !== dimensions.width || canvas.height !== dimensions.height) {
          canvas.width = dimensions.width;
          canvas.height = dimensions.height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (device.enabled === false) {
          // Disabled / Standby screen pattern
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, dimensions.width, dimensions.height);
          ctx.fillStyle = '#64748b';
          ctx.font = '12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('STANDBY / UNASSIGNED', dimensions.width / 2, dimensions.height / 2);
          animationFrameId = requestAnimationFrame(render);
          return;
        }

        ctx.save();

        // Apply center rotation if specified
        if (matrixResult.rotation !== 0) {
          ctx.translate(dimensions.width / 2, dimensions.height / 2);
          ctx.rotate((matrixResult.rotation * Math.PI) / 180);
          ctx.translate(-dimensions.width / 2, -dimensions.height / 2);
        }

        // Apply TextureView matrix transformation in Canvas 2D
        ctx.translate(matrixResult.translateX, matrixResult.translateY);
        ctx.scale(matrixResult.scaleX, matrixResult.scaleY);

        if (useTestPattern && canvasTestPatternRef.current) {
          ctx.drawImage(canvasTestPatternRef.current, 0, 0, dimensions.width, dimensions.height);
        } else if (videoElementRef.current && videoElementRef.current.readyState >= 2) {
          ctx.drawImage(videoElementRef.current, 0, 0, dimensions.width, dimensions.height);
        } else {
          // Placeholder gradient
          const grad = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height);
          grad.addColorStop(0, '#1e293b');
          grad.addColorStop(1, '#0f172a');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions, matrixResult, useTestPattern, videoElementRef, canvasTestPatternRef, device.enabled]);

  const isHost = device.index === 0;
  const isEnabled = device.enabled !== false;
  const effectiveTotalRows = device.assignedSegment.totalRows || gridRows || 1;
  const effectiveTotalCols = device.assignedSegment.totalCols || gridCols || 1;

  return (
    <div
      id={`device-screen-${device.index}`}
      className={`relative flex flex-col transition-all duration-300 ${
        isImmersionMode
          ? 'p-0 m-0 bg-black rounded-none border-0 shadow-none ring-0'
          : showBezel
          ? `p-2 rounded-xl shadow-lg border ring-1 ${
              isEnabled
                ? 'bg-slate-900 border-slate-800 ring-slate-700/50'
                : 'bg-slate-950/70 border-slate-900 opacity-60'
            }`
          : 'bg-black rounded-md overflow-hidden border border-slate-800'
      }`}
    >
      {/* Device Header in Bezel Mode */}
      {!isImmersionMode && showBezel && (
        <div className="flex items-center justify-between px-1.5 pb-1.5 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            {isHost ? (
              <span className="flex items-center gap-1 text-emerald-400 font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> MASTER NODE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-indigo-400 font-mono font-semibold">
                <Smartphone className="w-3 h-3" /> NODE_0{device.index + 1}
              </span>
            )}
            <span className="bg-slate-950 text-indigo-300 px-1.5 py-0.5 rounded border border-slate-800 font-mono text-[9px]">
              R{device.assignedSegment.row}:C{device.assignedSegment.col}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Position Edit Toggle */}
            {onUpdateDevicePosition && (
              <button
                onClick={() => setIsEditingPosition(!isEditingPosition)}
                title="Change manual grid position"
                className={`p-1 rounded text-xs transition-colors ${
                  isEditingPosition
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Move className="w-3 h-3" />
              </button>
            )}

            {onPopoutWindow && (
              <button
                onClick={() => onPopoutWindow(device.index)}
                title="Pop out node into separate window"
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inline Quick Position Modifier Overlay */}
      {!isImmersionMode && isEditingPosition && onUpdateDevicePosition && (
        <div className="bg-slate-950 border border-indigo-500/50 rounded-lg p-2 mb-2 text-xs font-mono space-y-2 z-20">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="text-indigo-300 font-semibold">Manual Grid Position</span>
            <button
              onClick={() => setIsEditingPosition(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              Done
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-slate-500 block mb-0.5">Row (0..{effectiveTotalRows - 1})</label>
              <select
                value={device.assignedSegment.row}
                onChange={(e) =>
                  onUpdateDevicePosition(device.index, parseInt(e.target.value), device.assignedSegment.col)
                }
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-1 text-xs"
              >
                {Array.from({ length: effectiveTotalRows }).map((_, r) => (
                  <option key={r} value={r}>
                    Row {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-slate-500 block mb-0.5">Col (0..{effectiveTotalCols - 1})</label>
              <select
                value={device.assignedSegment.col}
                onChange={(e) =>
                  onUpdateDevicePosition(device.index, device.assignedSegment.row, parseInt(e.target.value))
                }
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-1 text-xs"
              >
                {Array.from({ length: effectiveTotalCols }).map((_, c) => (
                  <option key={c} value={c}>
                    Col {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Screen Canvas Container */}
      <div
        ref={containerRef}
        className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center ${
          isImmersionMode
            ? 'min-h-[220px] rounded-none border-0'
            : 'min-h-[150px] sm:min-h-[180px] lg:min-h-[210px] rounded border border-slate-900'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover select-none"
        />

        {/* Flashing Device Identification Badge */}
        {!isImmersionMode && isIdentifying && (
          <div className="absolute inset-0 z-30 bg-indigo-600/90 flex flex-col items-center justify-center text-white backdrop-blur-sm animate-pulse">
            <div className="text-4xl sm:text-5xl font-black font-mono">#{device.index + 1}</div>
            <div className="text-xs font-semibold uppercase tracking-wider mt-1">{device.name}</div>
            <div className="text-[10px] font-mono text-indigo-200 mt-0.5">
              Position: [Row {device.assignedSegment.row}, Col {device.assignedSegment.col}]
            </div>
          </div>
        )}

        {/* Live HUD Overlay */}
        {!isImmersionMode && showOverlayStats && matrixResult && isEnabled && (
          <div className="absolute top-2 left-2 pointer-events-none bg-slate-950/90 backdrop-blur-sm border border-slate-800 rounded px-2 py-1 text-[9px] font-mono text-slate-300 shadow-md">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
              <span className={`w-1 h-1 rounded-full ${isHost ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
              {isHost ? 'NODE_01_MASTER' : `NODE_0${device.index + 1}_SLICED`}
              <span className="text-[8px] text-amber-400 ml-1">
                [R{device.assignedSegment.row}:C{device.assignedSegment.col}]
              </span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5 space-y-0.5">
              <div>M: [{matrixResult.scaleX.toFixed(2)}, 0, {matrixResult.translateX.toFixed(0)}][0, {matrixResult.scaleY.toFixed(2)}, {matrixResult.translateY.toFixed(0)}]</div>
              <div className="text-emerald-400">RTT: {device.simulatedPingMs}ms | Offset: {device.clockOffsetMs.toFixed(1)}ms</div>
            </div>
          </div>
        )}

        {/* Device Index & Grid Coordinate Watermark */}
        {!isImmersionMode && (
          <div className="absolute bottom-2 right-2 pointer-events-none px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-mono text-slate-300 border border-slate-800 flex items-center gap-1">
            <span>{isHost ? 'MASTER' : `DEV ${device.index + 1}`}</span>
            <span className="text-indigo-400 font-bold">
              (R{device.assignedSegment.row}, C{device.assignedSegment.col})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
