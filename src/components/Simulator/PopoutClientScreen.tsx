import React, { useState, useEffect, useRef } from 'react';
import { calculateScreenMatrix } from '../../utils/matrixMath';
import { AspectRatioMode, OrientationMode, ScaleMode } from '../../types';
import { VideoWallBroadcastBus } from '../../utils/syncEngine';
import { Maximize2, Minimize2, Tv, Wifi } from 'lucide-react';

interface PopoutClientScreenProps {
  deviceIndex: number;
  totalDevices: number;
  orientation: OrientationMode;
  customRow?: number;
  customCol?: number;
  totalRows?: number;
  totalCols?: number;
  aspectRatioMode?: AspectRatioMode;
  scaleMode?: ScaleMode;
}

export const PopoutClientScreen: React.FC<PopoutClientScreenProps> = ({
  deviceIndex,
  totalDevices,
  orientation,
  customRow,
  customCol,
  totalRows,
  totalCols,
  aspectRatioMode = 'auto',
  scaleMode = 'cover'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isHostOffline, setIsHostOffline] = useState<boolean>(false);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState<number>(Date.now());
  const broadcastBusRef = useRef<VideoWallBroadcastBus | null>(null);

  useEffect(() => {
    broadcastBusRef.current = new VideoWallBroadcastBus((data) => {
      setLastHeartbeatTime(Date.now());
      setIsHostOffline(false);

      if (data.type === 'SCHEDULED_PLAY' || data.type === 'FAST_RESUME') {
        setIsPlaying(true);
        setCurrentTimeMs(data.startPositionMs || 0);
      } else if (data.type === 'PAUSE') {
        setIsPlaying(false);
        setCurrentTimeMs(data.currentPositionMs || 0);
      } else if (data.type === 'SEEK') {
        setCurrentTimeMs(data.targetPositionMs || 0);
      } else if (data.type === 'HOST_SHUTDOWN') {
        setIsPlaying(false);
        setIsHostOffline(true);
      } else if (data.type === 'MASTER_HEARTBEAT') {
        setIsPlaying(data.isPlaying);
        if (data.positionMs !== undefined) {
          setCurrentTimeMs(data.positionMs);
        }
      }
    });

    // Request state from host
    broadcastBusRef.current.broadcast({ type: 'REQUEST_STATE' });

    // Host watchdog: If no heartbeat from host for > 3.0s, freeze playback
    const watchdogInterval = setInterval(() => {
      if (Date.now() - lastHeartbeatTime > 3500) {
        setIsHostOffline(true);
        setIsPlaying(false);
      }
    }, 1000);

    // Request Screen Wake Lock to keep display awake during video wall operation
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        // Ignored if unsupported
      }
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(watchdogInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
      broadcastBusRef.current?.close();
    };
  }, [lastHeartbeatTime]);

  // Continuous animation loop rendering the test pattern / spliced canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const now = performance.now();

      const matrix = calculateScreenMatrix({
        deviceIndex,
        totalDevices,
        orientation,
        viewWidth: w,
        viewHeight: h,
        videoWidth: 1920,
        videoHeight: 1080,
        customRow,
        customCol,
        gridRows: totalRows,
        gridCols: totalCols,
        aspectRatioMode,
        scaleMode,
        preserveAspectRatio: true
      });

      ctx.clearRect(0, 0, w, h);
      ctx.save();

      // Apply matrix
      ctx.translate(matrix.translateX, matrix.translateY);
      ctx.scale(matrix.scaleX, matrix.scaleY);

      // Draw virtual wall canvas
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Crosshairs & Text
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 200, 0, Math.PI * 2);
      ctx.stroke();

      const msClock = Math.floor(currentTimeMs + (isPlaying ? now % 1000 : 0));
      const sec = Math.floor(msClock / 1000);
      const subMs = Math.floor(msClock % 1000);
      const str = `${Math.floor(sec / 60)
        .toString()
        .padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}.${subMs.toString().padStart(3, '0')}`;

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 54px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(str, w / 2, h / 2 - 40);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 24px sans-serif';
      ctx.fillText('VIDEO WALL FULLSCREEN CLIENT', w / 2, h / 2 + 50);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '500 18px monospace';
      ctx.fillText(
        `SCREEN [Row ${customRow ?? 0}, Col ${customCol ?? deviceIndex}] OF [${totalRows ?? 1}x${totalCols ?? totalDevices}]`,
        w / 2,
        h / 2 + 90
      );

      ctx.restore();
      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [deviceIndex, totalDevices, orientation, customRow, customCol, totalRows, totalCols, aspectRatioMode, scaleMode, isPlaying, currentTimeMs]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={window.innerWidth || 1280}
        height={window.innerHeight || 720}
        className="w-full h-full object-cover"
      />

      {/* Floating Blurry Glass HUD Controls */}
      <div className="absolute top-4 left-4 flex items-center gap-2.5 glass-hud px-4 py-2 rounded-2xl text-xs font-mono text-slate-200 shadow-2xl border border-white/10">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
        <span className="font-semibold text-white">
          Screen #{deviceIndex + 1}
        </span>
        <span className="text-slate-500">•</span>
        <span className="text-cyan-300">
          [R{customRow ?? 0}:C{customCol ?? deviceIndex}]
        </span>
        <span className="text-slate-500">•</span>
        <span className="text-indigo-300 font-bold">{orientation.toUpperCase()}</span>
      </div>

      {/* Host Disconnected / Offline Blurry Glass Banner */}
      {isHostOffline && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center space-y-4 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Tv className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Host Master Inactive / Paused</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Playback on this screen has been automatically suspended because the Host app was paused, closed, or heartbeat timed out.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-cyan-300 bg-white/[0.05] p-2.5 rounded-xl border border-white/10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Waiting for Host signal...</span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={toggleFullscreen}
          className="p-2.5 rounded-2xl glass-hud text-slate-300 hover:text-white hover:border-white/30 transition-all border border-white/10 shadow-lg cursor-pointer"
          title="Toggle Immersive Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
