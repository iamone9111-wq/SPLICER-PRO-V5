package com.videowall.splicer.transform

import android.graphics.Matrix
import android.view.TextureView
import com.videowall.splicer.network.ScaleMode
import com.videowall.splicer.network.WallOrientation

object MatrixTransformHelper {

    /**
     * Computes and applies dynamic 2D screen-splicing Matrix transformation onto a [TextureView].
     *
     * @param textureView The target TextureView where ExoPlayer renders video buffers.
     * @param row Row index of this screen (0 to totalRows - 1).
     * @param col Column index of this screen (0 to totalCols - 1).
     * @param totalRows Total rows in the wall grid.
     * @param totalCols Total columns in the wall grid.
     * @param scaleMode Splicing fit mode: COVER, CONTAIN, or STRETCH.
     * @param videoWidth Original width of the video in pixels.
     * @param videoHeight Original height of the video in pixels.
     * @param viewWidth Width of this device's TextureView in pixels.
     * @param viewHeight Height of this device's TextureView in pixels.
     * @param bezelPercent Bezel thickness percentage for seamless multi-device continuity.
     * @param rotationDeg Optional hardware rotation (0, 90, 180, 270).
     */
    fun applySpliceTransform(
        textureView: TextureView,
        row: Int,
        col: Int,
        totalRows: Int,
        totalCols: Int,
        scaleMode: ScaleMode = ScaleMode.COVER,
        videoWidth: Int,
        videoHeight: Int,
        viewWidth: Float,
        viewHeight: Float,
        bezelPercent: Float = 3.5f,
        rotationDeg: Int = 0
    ): Matrix {
        if (viewWidth <= 0 || viewHeight <= 0 || totalRows <= 0 || totalCols <= 0) return Matrix()

        val matrix = Matrix()

        // Mobile bezel compensation: treats physical bezels as part of one continuous large screen
        val safeBezel = bezelPercent.coerceAtLeast(0f)
        val bezelWidth = if (totalCols > 1) viewWidth * (safeBezel / 100f) else 0f
        val bezelHeight = if (totalRows > 1) viewHeight * (safeBezel / 100f) else 0f

        // Total virtual video wall display area across all physical screens and bezels
        val totalWallWidth = (viewWidth * totalCols) + (bezelWidth * (totalCols - 1))
        val totalWallHeight = (viewHeight * totalRows) + (bezelHeight * (totalRows - 1))

        val vWidth = if (videoWidth > 0) videoWidth.toFloat() else totalWallWidth
        val vHeight = if (videoHeight > 0) videoHeight.toFloat() else totalWallHeight

        // Play video strictly according to video's original aspect ratio onto the unified virtual screen
        val videoAspect = vWidth / vHeight
        val wallAspect = totalWallWidth / totalWallHeight

        var fittedWallWidth = totalWallWidth
        var fittedWallHeight = totalWallHeight
        var fitOffsetX = 0f
        var fitOffsetY = 0f

        when (scaleMode) {
            ScaleMode.STRETCH -> {
                fittedWallWidth = totalWallWidth
                fittedWallHeight = totalWallHeight
                fitOffsetX = 0f
                fitOffsetY = 0f
            }
            ScaleMode.CONTAIN, ScaleMode.FIT -> {
                // Entire video must be visible; letterbox or pillarbox across the unified large wall
                if (videoAspect > wallAspect) {
                    fittedWallHeight = totalWallWidth / videoAspect
                    fitOffsetY = (totalWallHeight - fittedWallHeight) / 2f
                } else {
                    fittedWallWidth = totalWallHeight * videoAspect
                    fitOffsetX = (totalWallWidth - fittedWallWidth) / 2f
                }
            }
            ScaleMode.COVER -> {
                // Video covers the entire unified wall without black bars, cropping excess symmetrically
                if (videoAspect > wallAspect) {
                    fittedWallWidth = totalWallHeight * videoAspect
                    fitOffsetX = (totalWallWidth - fittedWallWidth) / 2f
                } else {
                    fittedWallHeight = totalWallWidth / videoAspect
                    fitOffsetY = (totalWallHeight - fittedWallHeight) / 2f
                }
            }
        }

        // Scale factors relative to one individual device's viewport
        val scaleX = fittedWallWidth / viewWidth
        val scaleY = fittedWallHeight / viewHeight

        // Physical placement offset on the unified virtual wall (including bezels)
        val deviceLeftOnWall = col * (viewWidth + bezelWidth)
        val deviceTopOnWall = row * (viewHeight + bezelHeight)

        val translateX = fitOffsetX - deviceLeftOnWall
        val translateY = fitOffsetY - deviceTopOnWall

        matrix.setScale(scaleX, scaleY, 0f, 0f)
        matrix.postTranslate(translateX, translateY)

        if (rotationDeg != 0) {
            matrix.postRotate(rotationDeg.toFloat(), viewWidth / 2f, viewHeight / 2f)
        }

        textureView.setTransform(matrix)
        return matrix
    }

    /**
     * Backward-compatible helper for 1D orientation indexing.
     */
    fun applySpliceTransformLegacy(
        textureView: TextureView,
        deviceIndex: Int,
        totalDevices: Int,
        orientation: WallOrientation,
        videoWidth: Int,
        videoHeight: Int,
        viewWidth: Float,
        viewHeight: Float,
        scaleMode: ScaleMode = ScaleMode.COVER
    ): Matrix {
        val (row, col, totalRows, totalCols) = when (orientation) {
            WallOrientation.HORIZONTAL -> Quad(0, deviceIndex, 1, totalDevices)
            WallOrientation.VERTICAL -> Quad(deviceIndex, 0, totalDevices, 1)
            WallOrientation.GRID -> {
                val cols = kotlin.math.ceil(kotlin.math.sqrt(totalDevices.toDouble())).toInt().coerceAtLeast(1)
                val rows = kotlin.math.ceil(totalDevices.toDouble() / cols).toInt().coerceAtLeast(1)
                Quad(deviceIndex / cols, deviceIndex % cols, rows, cols)
            }
        }

        return applySpliceTransform(
            textureView = textureView,
            row = row,
            col = col,
            totalRows = totalRows,
            totalCols = totalCols,
            scaleMode = scaleMode,
            videoWidth = videoWidth,
            videoHeight = videoHeight,
            viewWidth = viewWidth,
            viewHeight = viewHeight
        )
    }

    private data class Quad(val row: Int, val col: Int, val totalRows: Int, val totalCols: Int)
}
