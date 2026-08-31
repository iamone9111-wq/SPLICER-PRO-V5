import { AspectRatioMode, MatrixTransformResult, OrientationMode, ScaleMode } from '../types';

export interface MatrixCalculationParams {
  deviceIndex: number;
  totalDevices: number;
  orientation: OrientationMode;
  viewWidth: number;
  viewHeight: number;
  videoWidth?: number;
  videoHeight?: number;
  // Manual Grid & Coordinates
  customRow?: number;
  customCol?: number;
  gridRows?: number;
  gridCols?: number;
  // Aspect ratio & Scaling
  aspectRatioMode?: AspectRatioMode | string;
  customAspectRatioValue?: number; // e.g. 16/9, 21/9, 1.0, 0.5625
  scaleMode?: ScaleMode | string;
  rotation?: 0 | 90 | 180 | 270 | number;
  bezelCompensationPercent?: number;
  preserveAspectRatio?: boolean; // legacy compatibility
}

/**
 * Calculates the exact android.graphics.Matrix values for TextureView screen slicing.
 * Supports arbitrary N-screen horizontal/vertical walls, NxM custom grid matrices,
 * manual per-screen (row, col) mapping, aspect ratio presets, custom ratios, and bezel compensation.
 */
export function calculateScreenMatrix(
  deviceIndexOrParams: number | MatrixCalculationParams,
  totalDevices: number = 3,
  orientation: OrientationMode = 'horizontal',
  viewWidth: number = 320,
  viewHeight: number = 180,
  videoWidth: number = 1920,
  videoHeight: number = 1080,
  preserveAspectRatio: boolean = true,
  bezelCompensationPercent: number = 0
): MatrixTransformResult {
  let params: MatrixCalculationParams;

  if (typeof deviceIndexOrParams === 'object') {
    params = deviceIndexOrParams;
  } else {
    params = {
      deviceIndex: deviceIndexOrParams,
      totalDevices,
      orientation,
      viewWidth,
      viewHeight,
      videoWidth,
      videoHeight,
      preserveAspectRatio,
      bezelCompensationPercent
    };
  }

  const {
    deviceIndex,
    orientation: wallOrientation,
    viewWidth: rawVw,
    viewHeight: rawVh,
    videoWidth: rawSrcW = 1920,
    videoHeight: rawSrcH = 1080,
    customRow,
    customCol,
    gridRows,
    gridCols,
    aspectRatioMode = 'auto',
    customAspectRatioValue,
    scaleMode = 'cover',
    rotation = 0,
    bezelCompensationPercent: bezel = 0,
    preserveAspectRatio: legacyPreserve = true
  } = params;

  const total = Math.max(1, params.totalDevices);
  const vW = Math.max(rawVw, 10);
  const vH = Math.max(rawVh, 10);
  const srcW = Math.max(rawSrcW, 10);
  const srcH = Math.max(rawSrcH, 10);

  // 1. Determine Effective Grid Dimensions (Rows and Cols)
  let effectiveCols = 1;
  let effectiveRows = 1;
  let colIndex = 0;
  let rowIndex = 0;

  if (wallOrientation === 'horizontal') {
    effectiveCols = total;
    effectiveRows = 1;
    colIndex = customCol !== undefined ? customCol : Math.min(deviceIndex, total - 1);
    rowIndex = customRow !== undefined ? customRow : 0;
  } else if (wallOrientation === 'vertical') {
    effectiveCols = 1;
    effectiveRows = total;
    colIndex = customCol !== undefined ? customCol : 0;
    rowIndex = customRow !== undefined ? customRow : Math.min(deviceIndex, total - 1);
  } else if (wallOrientation === 'grid_2x2') {
    effectiveCols = 2;
    effectiveRows = Math.ceil(total / 2);
    colIndex = customCol !== undefined ? customCol : deviceIndex % effectiveCols;
    rowIndex = customRow !== undefined ? customRow : Math.floor(deviceIndex / effectiveCols);
  } else if (wallOrientation === 'grid_auto') {
    // Auto-calculate best balanced grid based on device count
    if (total <= 3) {
      effectiveCols = total;
      effectiveRows = 1;
    } else if (total === 4) {
      effectiveCols = 2;
      effectiveRows = 2;
    } else if (total <= 6) {
      effectiveCols = 3;
      effectiveRows = Math.ceil(total / 3);
    } else if (total <= 8) {
      effectiveCols = 4;
      effectiveRows = 2;
    } else if (total <= 9) {
      effectiveCols = 3;
      effectiveRows = 3;
    } else {
      effectiveCols = 4;
      effectiveRows = Math.ceil(total / 4);
    }
    colIndex = customCol !== undefined ? customCol : deviceIndex % effectiveCols;
    rowIndex = customRow !== undefined ? customRow : Math.floor(deviceIndex / effectiveCols);
  } else {
    // 'custom_grid'
    effectiveCols = Math.max(1, gridCols || 2);
    effectiveRows = Math.max(1, gridRows || Math.ceil(total / effectiveCols));
    colIndex = customCol !== undefined ? customCol : deviceIndex % effectiveCols;
    rowIndex = customRow !== undefined ? customRow : Math.floor(deviceIndex / effectiveCols);
  }

  // 2. Base Splicing Scale and Offsets
  let scaleX = effectiveCols;
  let scaleY = effectiveRows;
  let translateX = -colIndex * vW;
  let translateY = -rowIndex * vH;

  // 3. Aspect Ratio and Fitting Math
  const virtualWallWidth = vW * effectiveCols;
  const virtualWallHeight = vH * effectiveRows;
  const wallPhysicalRatio = virtualWallWidth / virtualWallHeight;

  // Determine Target Content Aspect Ratio
  let targetAspect = srcW / srcH;
  if (aspectRatioMode === '16:9') targetAspect = 16 / 9;
  else if (aspectRatioMode === '9:16') targetAspect = 9 / 16;
  else if (aspectRatioMode === '4:3') targetAspect = 4 / 3;
  else if (aspectRatioMode === '1:1') targetAspect = 1.0;
  else if (aspectRatioMode === '21:9') targetAspect = 21 / 9;
  else if (aspectRatioMode === '32:9') targetAspect = 32 / 9;
  else if (aspectRatioMode === 'custom' && customAspectRatioValue && customAspectRatioValue > 0) {
    targetAspect = customAspectRatioValue;
  }

  let fittedWidth = virtualWallWidth;
  let fittedHeight = virtualWallHeight;
  let fitOffsetX = 0;
  let fitOffsetY = 0;
  let fitScale = 1.0;

  const shouldFitPreserve = legacyPreserve && (scaleMode === 'contain' || (scaleMode === 'cover' && aspectRatioMode !== 'auto'));

  if (shouldFitPreserve || scaleMode === 'contain') {
    if (scaleMode === 'contain') {
      // Letterbox or pillarbox to fit inside whole wall
      if (targetAspect > wallPhysicalRatio) {
        // Video wider than wall: letterbox top/bottom
        fittedWidth = virtualWallWidth;
        fittedHeight = virtualWallWidth / targetAspect;
        fitOffsetY = (virtualWallHeight - fittedHeight) / 2;
        fitScale = virtualWallWidth / srcW;
      } else {
        // Video taller than wall: pillarbox left/right
        fittedHeight = virtualWallHeight;
        fittedWidth = virtualWallHeight * targetAspect;
        fitOffsetX = (virtualWallWidth - fittedWidth) / 2;
        fitScale = virtualWallHeight / srcH;
      }

      // Adjust scale and translate for containment
      const contentRatioX = fittedWidth / virtualWallWidth;
      const contentRatioY = fittedHeight / virtualWallHeight;
      scaleX *= contentRatioX;
      scaleY *= contentRatioY;
      translateX = -(colIndex * vW) * contentRatioX + (fitOffsetX / effectiveCols);
      translateY = -(rowIndex * vH) * contentRatioY + (fitOffsetY / effectiveRows);
    } else if (scaleMode === 'cover' && aspectRatioMode !== 'auto') {
      // Zoom & crop to fill target aspect ratio
      if (targetAspect > wallPhysicalRatio) {
        // Target is wider: scale height to fill, crop horizontal sides
        const stretchFactor = targetAspect / wallPhysicalRatio;
        scaleX *= stretchFactor;
        translateX = -(colIndex * vW) * stretchFactor - ((virtualWallWidth * (stretchFactor - 1)) / (2 * effectiveCols));
      } else {
        // Target is taller: scale width to fill, crop vertical sides
        const stretchFactor = wallPhysicalRatio / targetAspect;
        scaleY *= stretchFactor;
        translateY = -(rowIndex * vH) * stretchFactor - ((virtualWallHeight * (stretchFactor - 1)) / (2 * effectiveRows));
      }
    }
  }

  // 4. Bezel Compensation (expansion factor between display gaps)
  if (bezel > 0) {
    const bezelFactor = 1 + (bezel / 100);
    scaleX *= bezelFactor;
    scaleY *= bezelFactor;
    // Bezel center-anchored adjustment
    const centerCol = (effectiveCols - 1) / 2;
    const centerRow = (effectiveRows - 1) / 2;
    translateX -= (colIndex - centerCol) * (vW * (bezel / 100));
    translateY -= (rowIndex - centerRow) * (vH * (bezel / 100));
  }

  // 5. Construct 3x3 Matrix equivalent to android.graphics.Matrix:
  const matrixValues: [number, number, number, number, number, number, number, number, number] = [
    scaleX, 0, translateX,
    0, scaleY, translateY,
    0, 0, 1
  ];

  const cssTransform = `matrix(${scaleX}, 0, 0, ${scaleY}, ${translateX}, ${translateY})`;

  // 6. Generate Clean Kotlin Code Snippet for Android Studio TextureView
  const matrixCodeKotlin = `// --- Manual Wall Splice: Screen [Row ${rowIndex}, Col ${colIndex}] in [${effectiveRows}x${effectiveCols} Grid] ---
// Wall Layout: ${wallOrientation.toUpperCase()} | Aspect Ratio: ${aspectRatioMode.toUpperCase()} | Scale: ${scaleMode.toUpperCase()}
val matrix = Matrix()
val viewWidth = textureView.width.toFloat()
val viewHeight = textureView.height.toFloat()

val totalCols = ${effectiveCols}f
val totalRows = ${effectiveRows}f
val colIndex = ${colIndex}f
val rowIndex = ${rowIndex}f

val scaleX = totalCols * ${(scaleX / effectiveCols).toFixed(4)}f
val scaleY = totalRows * ${(scaleY / effectiveRows).toFixed(4)}f
val translateX = -(colIndex * viewWidth) + ${translateX >= 0 ? '+' : ''}${translateX.toFixed(1)}f
val translateY = -(rowIndex * viewHeight) + ${translateY >= 0 ? '+' : ''}${translateY.toFixed(1)}f

matrix.setScale(scaleX, scaleY, 0f, 0f)
matrix.postTranslate(translateX, translateY)
${rotation !== 0 ? `matrix.postRotate(${rotation}f, viewWidth / 2f, viewHeight / 2f)\n` : ''}textureView.setTransform(matrix)`;

  return {
    scaleX,
    scaleY,
    translateX,
    translateY,
    pivotX: 0,
    pivotY: 0,
    rotation,
    matrixValues,
    aspectRatioFitting: {
      fittedWidth,
      fittedHeight,
      fitOffsetX,
      fitOffsetY,
      fitScale
    },
    cssTransform,
    matrixCodeKotlin
  };
}
