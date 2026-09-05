import React, { useState, useEffect, useRef } from 'react';
import {
  AspectRatioMode,
  ClientDevice,
  OrientationMode,
  ScaleMode,
  VideoSourceOption
} from '../../types';
import { RoleSelectionScreen } from './RoleSelectionScreen';
import { HostSettingsPage } from './HostSettingsPage';
import { JoinSettingsPage } from './JoinSettingsPage';
import { HostSetupWizardModal } from './HostSetupWizardModal';
import { simulateNtpExchange, VideoWallBroadcastBus } from '../../utils/syncEngine';

const PRESET_VIDEOS: VideoSourceOption[] = [
  {
    id: 'test-pattern',
    title: '16:9 Calibration Grid & Sync Clock (1920×1080)',
    url: '',
    width: 1920,
    height: 1080,
    duration: 60,
    thumbnail: '',
    isTestPattern: true
  },
  {
    id: 'video-nature',
    title: '16:9 Cinematic Mountain Drone (1920×1080)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    width: 1920,
    height: 1080,
    duration: 596,
    thumbnail: ''
  },
  {
    id: 'video-vertical-short',
    title: '9:16 Portrait Reel / Shorts (1080×1920)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    width: 1080,
    height: 1920,
    duration: 15,
    thumbnail: ''
  },
  {
    id: 'video-tech',
    title: '16:9 Sci-Fi Cyberpunk Render (1920×1080)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    width: 1920,
    height: 1080,
    duration: 734,
    thumbnail: ''
  }
];

export const VideoWallSimulator: React.FC = () => {
  // Page Workflow Mode: 'select_role' | 'host_settings' | 'join_settings'
  const [pageMode, setPageMode] = useState<'select_role' | 'host_settings' | 'join_settings'>('select_role');

  const [orientation, setOrientation] = useState<OrientationMode>('custom_grid');
  const [totalDevices, setTotalDevices] = useState<number>(3);
  const [gridRows, setGridRows] = useState<number>(1);
  const [gridCols, setGridCols] = useState<number>(3);

  const [aspectRatioMode, setAspectRatioMode] = useState<AspectRatioMode>('auto');
  const [customAspectRatioValue, setCustomAspectRatioValue] = useState<number>(1.78);
  const [scaleMode, setScaleMode] = useState<ScaleMode>('cover');

  const [selectedVideoId, setSelectedVideoId] = useState<string>('test-pattern');
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(60);
  const [simulatedPing, setSimulatedPing] = useState<number>(18);
  const [simulatedJitter, setSimulatedJitter] = useState<number>(4);
  const [showBezels, setShowBezels] = useState<boolean>(true);
  const [showOverlayStats, setShowOverlayStats] = useState<boolean>(true);
  const [preserveAspectRatio, setPreserveAspectRatio] = useState<boolean>(true);
  const [bezelCompensation, setBezelCompensation] = useState<number>(0);
  const [scheduledCountdown, setScheduledCountdown] = useState<number | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isIdentifying, setIsIdentifying] = useState<boolean>(false);
  const [divisionNotice, setDivisionNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasPatternRef = useRef<HTMLCanvasElement | null>(null);
  const broadcastBusRef = useRef<VideoWallBroadcastBus | null>(null);

  // Client device telemetry state
  const [devices, setDevices] = useState<ClientDevice[]>([]);

  // Setup broadcast bus for cross-tab sync
  useEffect(() => {
    broadcastBusRef.current = new VideoWallBroadcastBus((data) => {
      if (data.type === 'REQUEST_STATE') {
        broadcastBusRef.current?.broadcast({
          type: 'CURRENT_STATE',
          isPlaying,
          currentTime,
          orientation,
          totalDevices,
          selectedVideoId
        });
      }
    });
    return () => broadcastBusRef.current?.close();
  }, [isPlaying, currentTime, orientation, totalDevices, selectedVideoId]);

  // Request screen wake lock during active playback session to keep display awake
  useEffect(() => {
    let wakeLock: any = null;
    if (isPlaying) {
      const requestWakeLock = async () => {
        try {
          if ('wakeLock' in navigator) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
          }
        } catch (err) {
          // Unsupported or denied
        }
      };
      requestWakeLock();
    }

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [isPlaying]);

  // Compute effective rows and columns for current mode
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

  // Initialize and update client devices list
  useEffect(() => {
    setDevices((prevDevices) => {
      const list: ClientDevice[] = [];

      for (let i = 0; i < totalDevices; i++) {
        const isHost = i === 0;
        const ping = isHost ? 0 : simulatedPing + Math.round((Math.random() - 0.5) * simulatedJitter);
        const ntp = simulateNtpExchange(ping, simulatedJitter);

        const existing = prevDevices.find((d) => d.index === i);

        // Default default (row, col)
        let defaultRow = 0;
        let defaultCol = i;

        if (orientation === 'vertical') {
          defaultRow = i;
          defaultCol = 0;
        } else if (orientation === 'grid_2x2') {
          defaultRow = Math.floor(i / 2);
          defaultCol = i % 2;
        } else if (orientation === 'grid_auto') {
          defaultRow = Math.floor(i / effectiveCols);
          defaultCol = i % effectiveCols;
        } else if (orientation === 'custom_grid') {
          defaultRow = existing?.assignedSegment ? existing.assignedSegment.row : Math.floor(i / effectiveCols);
          defaultCol = existing?.assignedSegment ? existing.assignedSegment.col : i % effectiveCols;
        }

        // Clamp inside valid grid bounds
        const targetRow = Math.min(defaultRow, effectiveRows - 1);
        const targetCol = Math.min(defaultCol, effectiveCols - 1);

        list.push({
          id: existing ? existing.id : `device-${i}`,
          name: isHost ? 'Host Master Device' : `Client Screen #${i + 1}`,
          index: i,
          ip: isHost ? '192.168.1.100 (Host)' : `192.168.1.${101 + i}`,
          connected: true,
          enabled: existing ? existing.enabled !== false : true,
          simulatedPingMs: ping,
          simulatedJitterMs: simulatedJitter,
          clockOffsetMs: isHost ? 0 : ntp.clockOffset,
          currentPlaybackMs: currentTime * 1000,
          syncState: 'SYNCHRONIZED',
          driftMs: 0,
          rotation: existing ? existing.rotation || 0 : 0,
          assignedSegment: {
            row: targetRow,
            col: targetCol,
            totalCols: effectiveCols,
            totalRows: effectiveRows,
            enabled: existing ? existing.enabled !== false : true,
            rotation: existing ? existing.rotation || 0 : 0
          }
        });
      }

      return list;
    });
  }, [totalDevices, orientation, effectiveRows, effectiveCols, simulatedPing, simulatedJitter]);

  // Per-Device Position Updater
  const handleUpdateDevicePosition = (deviceIndex: number, row: number, col: number) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.index === deviceIndex) {
          return {
            ...d,
            assignedSegment: {
              ...d.assignedSegment,
              row,
              col,
              totalRows: effectiveRows,
              totalCols: effectiveCols
            }
          };
        }
        return d;
      })
    );
  };

  // Dynamic Add / Remove Screen functions
  const handleAddDynamicScreen = () => {
    const nextCount = Math.min(16, totalDevices + 1);
    setTotalDevices(nextCount);
    if (orientation === 'horizontal') {
      setGridCols(nextCount);
      setGridRows(1);
    } else if (orientation === 'vertical') {
      setGridRows(nextCount);
      setGridCols(1);
    }
    showDivisionToast(`Video dynamically re-divided across ${nextCount} screens (${orientation.toUpperCase()})`);
  };

  const handleRemoveDynamicScreen = () => {
    if (totalDevices <= 1) return;
    const nextCount = totalDevices - 1;
    setTotalDevices(nextCount);
    if (orientation === 'horizontal') {
      setGridCols(nextCount);
      setGridRows(1);
    } else if (orientation === 'vertical') {
      setGridRows(nextCount);
      setGridCols(1);
    }
    showDivisionToast(`Video dynamically re-divided across ${nextCount} screens (${orientation.toUpperCase()})`);
  };

  const showDivisionToast = (msg: string) => {
    setDivisionNotice(msg);
    setTimeout(() => setDivisionNotice(null), 3500);
  };

  const handleTriggerIdentify = () => {
    setIsIdentifying(true);
    setTimeout(() => setIsIdentifying(false), 3000);
  };

  // Per-Device Rotation Updater
  const handleUpdateDeviceRotation = (deviceIndex: number, rotation: 0 | 90 | 180 | 270) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.index === deviceIndex) {
          return {
            ...d,
            rotation,
            assignedSegment: {
              ...d.assignedSegment,
              rotation
            }
          };
        }
        return d;
      })
    );
  };

  // Per-Device Enable/Disable Toggle
  const handleToggleDeviceEnabled = (deviceIndex: number) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.index === deviceIndex) {
          const nextEnabled = d.enabled === false ? true : false;
          return {
            ...d,
            enabled: nextEnabled,
            assignedSegment: {
              ...d.assignedSegment,
              enabled: nextEnabled
            }
          };
        }
        return d;
      })
    );
  };

  // Batch Layout Helper (Fill Left-to-Right, Top-to-Bottom, Flip Cols, etc.)
  const handleBatchAssignLayout = (type: 'ltr' | 'rtl' | 'ttb' | 'invert_cols' | 'invert_rows' | 'reset') => {
    setDevices((prev) => {
      const updated = [...prev];

      if (type === 'ltr' || type === 'reset') {
        updated.forEach((d, i) => {
          d.assignedSegment.row = Math.floor(i / effectiveCols) % effectiveRows;
          d.assignedSegment.col = i % effectiveCols;
        });
      } else if (type === 'rtl') {
        updated.forEach((d, i) => {
          d.assignedSegment.row = Math.floor(i / effectiveCols) % effectiveRows;
          d.assignedSegment.col = effectiveCols - 1 - (i % effectiveCols);
        });
      } else if (type === 'ttb') {
        updated.forEach((d, i) => {
          d.assignedSegment.col = Math.floor(i / effectiveRows) % effectiveCols;
          d.assignedSegment.row = i % effectiveRows;
        });
      } else if (type === 'invert_cols') {
        updated.forEach((d) => {
          d.assignedSegment.col = effectiveCols - 1 - d.assignedSegment.col;
        });
      } else if (type === 'invert_rows') {
        updated.forEach((d) => {
          d.assignedSegment.row = effectiveRows - 1 - d.assignedSegment.row;
        });
      }

      return [...updated];
    });
  };

  // Calibration test pattern generator with millisecond clock & moving crosshair
  useEffect(() => {
    const canvas = canvasPatternRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let ballX = 100;
    let ballSpeed = 6;

    const renderPattern = () => {
      const w = canvas.width;
      const h = canvas.height;
      const now = performance.now();

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      const step = 80;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Main Crosshair
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Center calibration circles
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 200, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 350, 0, Math.PI * 2);
      ctx.stroke();

      // Animated Sweeping Laser Line
      const angle = (now / 1000) * Math.PI;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(w / 2 + Math.cos(angle) * 350, h / 2 + Math.sin(angle) * 350);
      ctx.stroke();

      // Horizontal bouncing crosshair ball to clearly verify cross-screen seamless alignment
      ballX += ballSpeed;
      if (ballX > w - 50 || ballX < 50) ballSpeed = -ballSpeed;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(ballX, h / 2, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Large Millisecond Synchronization Clock in Center
      const currentTimeMs = isPlaying ? currentTime * 1000 + (now % 1000) : currentTime * 1000;
      const totalSec = Math.floor(currentTimeMs / 1000);
      const ms = Math.floor(currentTimeMs % 1000);
      const clockStr = `${Math.floor(totalSec / 60)
        .toString()
        .padStart(2, '0')}:${(totalSec % 60).toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 54px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(clockStr, w / 2, h / 2 - 40);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 24px sans-serif';
      ctx.fillText('VIDEO WALL SEAMLESS SPLICING TEST REEL', w / 2, h / 2 + 50);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '500 18px monospace';
      ctx.fillText(
        `WALL GEOMETRY: ${effectiveRows}x${effectiveCols} | ASPECT: ${aspectRatioMode.toUpperCase()} | SCALE: ${scaleMode.toUpperCase()}`,
        w / 2,
        h / 2 + 90
      );

      // Boundary indicators
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(0, 0, 20, 20);
      ctx.fillRect(w - 20, 0, 20, 20);
      ctx.fillRect(0, h - 20, 20, 20);
      ctx.fillRect(w - 20, h - 20, 20, 20);

      frameId = requestAnimationFrame(renderPattern);
    };

    renderPattern();
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, currentTime, effectiveRows, effectiveCols, aspectRatioMode, scaleMode]);

  // Video playback time progression for calibration test reel
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && selectedVideoId === 'test-pattern') {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration, selectedVideoId]);

  // Real-time zero-latency Play / Pause
  const handleTogglePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      setScheduledCountdown(null);
      if (videoRef.current && selectedVideoId !== 'test-pattern') {
        videoRef.current.play().catch(() => {});
      }
      broadcastBusRef.current?.broadcast({
        type: 'SCHEDULED_PLAY',
        startPositionMs: currentTime * 1000,
        targetSystemTimeMs: Date.now()
      });
    } else {
      setIsPlaying(false);
      setScheduledCountdown(null);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      broadcastBusRef.current?.broadcast({
        type: 'PAUSE',
        currentPositionMs: currentTime * 1000
      });
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    broadcastBusRef.current?.broadcast({
      type: 'SEEK',
      targetPositionMs: 0
    });
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    broadcastBusRef.current?.broadcast({
      type: 'SEEK',
      targetPositionMs: time * 1000
    });
  };

  const handleSelectVideo = (id: string) => {
    setSelectedVideoId(id);
    const selected = PRESET_VIDEOS.find((v) => v.id === id);
    if (selected) {
      setDuration(selected.duration);
      setCurrentTime(0);
      if (videoRef.current) {
        if (selected.url) {
          videoRef.current.src = selected.url;
          videoRef.current.load();
        } else {
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        }
      }
    }
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomVideoUrl(url);
      setSelectedVideoId('custom-video');
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.load();
      }
    }
  };

  const activeVideo =
    selectedVideoId === 'custom-video'
      ? {
          id: 'custom-video',
          title: 'Uploaded Local Video',
          url: customVideoUrl || '',
          width: 1920,
          height: 1080,
          duration: 120,
          thumbnail: ''
        }
      : PRESET_VIDEOS.find((v) => v.id === selectedVideoId) || PRESET_VIDEOS[0];

  const handlePopout = (deviceIndex: number) => {
    const targetDevice = devices.find((d) => d.index === deviceIndex);
    const row = targetDevice ? targetDevice.assignedSegment.row : 0;
    const col = targetDevice ? targetDevice.assignedSegment.col : deviceIndex;

    const url = `${window.location.origin}${window.location.pathname}?popoutScreen=${deviceIndex}&total=${totalDevices}&orient=${orientation}&row=${row}&col=${col}&totalRows=${effectiveRows}&totalCols=${effectiveCols}&aspect=${aspectRatioMode}&scale=${scaleMode}`;
    window.open(url, `screen_popout_${deviceIndex}`, 'width=800,height=500,menubar=no,toolbar=no,location=no,status=no');
  };

  // Build grid of physical slots for rendering on wall canvas
  // Sort devices or position them visually according to their assigned (row, col)
  const sortedDevices = [...devices].sort((a, b) => {
    if (a.assignedSegment.row !== b.assignedSegment.row) {
      return a.assignedSegment.row - b.assignedSegment.row;
    }
    return a.assignedSegment.col - b.assignedSegment.col;
  });

  return (
    <div className="space-y-6">
      {/* Hidden Master Video Element for HTML5 video playback source */}
      <video
        ref={videoRef}
        src={activeVideo.url || undefined}
        playsInline
        muted
        loop
        preload="auto"
        className="hidden"
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || 60);
          }
        }}
        onTimeUpdate={() => {
          if (videoRef.current && selectedVideoId !== 'test-pattern') {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
      />

      {/* Hidden Calibration Canvas generator */}
      <canvas ref={canvasPatternRef} width={1920} height={1080} className="hidden" />

      {/* Mode View Switcher */}
      {pageMode === 'select_role' && (
        <RoleSelectionScreen
          onSelectHost={() => setPageMode('host_settings')}
          onSelectJoin={() => setPageMode('join_settings')}
        />
      )}

      {pageMode === 'host_settings' && (
        <HostSettingsPage
          orientation={orientation}
          setOrientation={setOrientation}
          totalDevices={totalDevices}
          setTotalDevices={setTotalDevices}
          gridRows={gridRows}
          setGridRows={setGridRows}
          gridCols={gridCols}
          setGridCols={setGridCols}
          aspectRatioMode={aspectRatioMode}
          setAspectRatioMode={setAspectRatioMode}
          customAspectRatioValue={customAspectRatioValue}
          setCustomAspectRatioValue={setCustomAspectRatioValue}
          scaleMode={scaleMode}
          setScaleMode={setScaleMode}
          devices={devices}
          onUpdateDevicePosition={handleUpdateDevicePosition}
          onUpdateDeviceRotation={handleUpdateDeviceRotation}
          onToggleDeviceEnabled={handleToggleDeviceEnabled}
          onBatchAssignLayout={handleBatchAssignLayout}
          isIdentifying={isIdentifying}
          onTriggerIdentify={handleTriggerIdentify}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onRestart={handleRestart}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          videoOptions={PRESET_VIDEOS}
          selectedVideoId={selectedVideoId}
          onSelectVideo={handleSelectVideo}
          onCustomFileUpload={handleCustomFileUpload}
          activeVideo={activeVideo}
          showBezels={showBezels}
          setShowBezels={setShowBezels}
          showOverlayStats={showOverlayStats}
          setShowOverlayStats={setShowOverlayStats}
          preserveAspectRatio={preserveAspectRatio}
          setPreserveAspectRatio={setPreserveAspectRatio}
          bezelCompensation={bezelCompensation}
          setBezelCompensation={setBezelCompensation}
          simulatedPing={simulatedPing}
          setSimulatedPing={setSimulatedPing}
          videoRef={videoRef}
          canvasPatternRef={canvasPatternRef}
          onBackToRoles={() => setPageMode('select_role')}
          onPopoutWindow={handlePopout}
        />
      )}

      {pageMode === 'join_settings' && (
        <JoinSettingsPage
          onBackToRoles={() => setPageMode('select_role')}
          onLaunchClient={(ip, screenIdx, rot) => {
            handlePopout(screenIdx);
          }}
          totalDevices={totalDevices}
          orientation={orientation}
          scaleMode={scaleMode}
          onPopoutWindow={handlePopout}
        />
      )}

      {/* Host Setup & Screen Arranger Wizard Modal */}
      <HostSetupWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        totalDevices={totalDevices}
        setTotalDevices={setTotalDevices}
        orientation={orientation}
        setOrientation={setOrientation}
        gridRows={gridRows}
        setGridRows={setGridRows}
        gridCols={gridCols}
        setGridCols={setGridCols}
        aspectRatioMode={aspectRatioMode}
        setAspectRatioMode={setAspectRatioMode}
        scaleMode={scaleMode}
        setScaleMode={setScaleMode}
        clients={devices}
        onUpdateDevicePosition={handleUpdateDevicePosition}
        onBatchAssignLayout={handleBatchAssignLayout}
        onTriggerIdentifyScreens={handleTriggerIdentify}
      />
    </div>
  );
};
