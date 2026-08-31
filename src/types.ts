export type OrientationMode = 'horizontal' | 'vertical' | 'grid_2x2' | 'grid_auto' | 'custom_grid';

export type AspectRatioMode = 'auto' | '16:9' | '9:16' | '4:3' | '1:1' | '21:9' | '32:9' | 'custom';

export type ScaleMode = 'cover' | 'contain' | 'stretch';

export interface VideoSourceOption {
  id: string;
  title: string;
  url: string;
  width: number;
  height: number;
  duration: number;
  thumbnail: string;
  isTestPattern?: boolean;
}

export interface ClientDevice {
  id: string;
  name: string;
  index: number;
  ip: string;
  connected: boolean;
  enabled: boolean;
  simulatedPingMs: number;
  simulatedJitterMs: number;
  clockOffsetMs: number;
  currentPlaybackMs: number;
  syncState: 'SYNCHRONIZED' | 'DRIFTING' | 'BUFFERING' | 'DISCONNECTED';
  driftMs: number;
  rotation?: 0 | 90 | 180 | 270;
  assignedSegment: {
    row: number;
    col: number;
    totalCols: number;
    totalRows: number;
    enabled?: boolean;
    rotation?: 0 | 90 | 180 | 270;
  };
}

export interface MatrixTransformResult {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  pivotX: number;
  pivotY: number;
  rotation: number;
  matrixValues: [number, number, number, number, number, number, number, number, number]; // 3x3 Matrix
  aspectRatioFitting: {
    fittedWidth: number;
    fittedHeight: number;
    fitOffsetX: number;
    fitOffsetY: number;
    fitScale: number;
  };
  cssTransform: string;
  matrixCodeKotlin: string;
}

export interface NtpExchangeTimestamps {
  t0_clientSent: number;
  t1_serverReceived: number;
  t2_serverSent: number;
  t3_clientReceived: number;
  roundTripDelay: number;
  clockOffset: number;
}

export interface AndroidCodeFile {
  id: string;
  filename: string;
  path: string;
  language: 'kotlin' | 'groovy' | 'xml' | 'json';
  category: 'manifest' | 'gradle' | 'network' | 'transform' | 'playback' | 'ui' | 'protocol';
  description: string;
  code: string;
  highlights: string[];
}

