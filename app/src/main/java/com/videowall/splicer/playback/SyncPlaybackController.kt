package com.videowall.splicer.playback

import android.content.Context
import android.net.Uri
import android.os.SystemClock
import android.util.Log
import android.view.TextureView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.VideoSize
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.*

class SyncPlaybackController(
    private val context: Context,
    private val textureView: TextureView,
    private val onVideoSizeChanged: (width: Int, height: Int) -> Unit
) {
    private val tag = "SyncPlaybackCtrl"
    private var exoPlayer: ExoPlayer? = null
    private val controllerScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var scheduledPlayJob: Job? = null
    private var currentUri: Uri? = null

    init {
        initExoPlayer()
    }

    private fun initExoPlayer() {
        // True 0-latency playback renderer & buffer configuration:
        // setAllowedVideoJoiningTimeMs(0L) disables video renderer grace delay so first frame renders immediately
        val renderersFactory = androidx.media3.exoplayer.DefaultRenderersFactory(context).apply {
            setExtensionRendererMode(androidx.media3.exoplayer.DefaultRenderersFactory.EXTENSION_RENDERER_MODE_OFF)
            setAllowedVideoJoiningTimeMs(0L)
            setEnableDecoderFallback(true)
        }

        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                200,  // minBufferMs (0.2s - instant startup)
                1500, // maxBufferMs (1.5s)
                0,    // bufferForPlaybackMs (0ms - zero latency instant start)
                25    // bufferForPlaybackAfterRebufferMs (25ms)
            )
            .setPrioritizeTimeOverSizeThresholds(true)
            .setBackBuffer(200, false)
            .build()

        exoPlayer = ExoPlayer.Builder(context, renderersFactory)
            .setLoadControl(loadControl)
            .setSeekParameters(androidx.media3.exoplayer.SeekParameters.CLOSEST_SYNC)
            .build()
            .apply {
                setVideoTextureView(textureView)
                videoScalingMode = androidx.media3.common.C.VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING
                addListener(object : Player.Listener {
                    override fun onVideoSizeChanged(videoSize: VideoSize) {
                        val rotation = videoSize.unappliedRotationDegrees
                        val realW = if (rotation == 90 || rotation == 270) videoSize.height else videoSize.width
                        val realH = if (rotation == 90 || rotation == 270) videoSize.width else videoSize.height
                        Log.d(tag, "VideoSize changed: raw=${videoSize.width}x${videoSize.height}, rot=$rotation -> effective=${realW}x${realH}")
                        this@SyncPlaybackController.onVideoSizeChanged(realW, realH)
                    }

                    override fun onPlaybackStateChanged(playbackState: Int) {
                        val stateStr = when (playbackState) {
                            Player.STATE_IDLE -> "IDLE"
                            Player.STATE_BUFFERING -> "BUFFERING"
                            Player.STATE_READY -> "READY"
                            Player.STATE_ENDED -> "ENDED"
                            else -> "UNKNOWN($playbackState)"
                        }
                        Log.d(tag, "Playback state: $stateStr (playWhenReady=${exoPlayer?.playWhenReady})")
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        Log.e(tag, "ExoPlayer error: ${error.message} (code: ${error.errorCodeName})", error)
                        // Auto-retry once on network or transient error
                        currentUri?.let { uri ->
                            controllerScope.launch {
                                delay(400L)
                                Log.d(tag, "Retrying media preparation after error: $uri")
                                prepareMedia(uri, force = true)
                            }
                        }
                    }
                })
            }
    }

    fun hasMedia(): Boolean = currentUri != null

    fun prepareMedia(uri: Uri, force: Boolean = false) {
        if (!force && currentUri == uri && exoPlayer?.playbackState != Player.STATE_IDLE) {
            Log.d(tag, "Media already preparing/prepared: $uri (state=${exoPlayer?.playbackState})")
            return
        }
        currentUri = uri
        Log.d(tag, "Setting ExoPlayer media source: $uri (force=$force)")
        val mediaItem = MediaItem.fromUri(uri)
        exoPlayer?.apply {
            setMediaItem(mediaItem)
            prepare()
            playWhenReady = false
        }
    }

    /**
     * Schedules playback with 0 latency. Executes immediately on the current UI frame without coroutine delays.
     */
    fun schedulePlay(startPositionMs: Long, localExecutionTimeMs: Long = 0L) {
        scheduledPlayJob?.cancel()
        
        // If player is idle or unbuffered, prepare it immediately
        if (exoPlayer?.playbackState == Player.STATE_IDLE) {
            currentUri?.let { prepareMedia(it) } ?: exoPlayer?.prepare()
        }

        // Only seek if deviation is substantial (> 1000ms) to avoid clearing decoded video frame buffers
        val curPos = exoPlayer?.currentPosition ?: 0L
        if (Math.abs(curPos - startPositionMs) > 1000L) {
            exoPlayer?.seekTo(startPositionMs)
        }

        // True 0-latency execution: immediately unpause ExoPlayer
        exoPlayer?.playWhenReady = true
        exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
    }

    /**
     * Instantaneous zero-latency resume without seeking or buffer pipeline flush.
     */
    fun resumeFast(targetPositionMs: Long? = null) {
        scheduledPlayJob?.cancel()
        if (exoPlayer?.playbackState == Player.STATE_IDLE) {
            currentUri?.let { prepareMedia(it) } ?: exoPlayer?.prepare()
        }
        if (targetPositionMs != null) {
            val cur = exoPlayer?.currentPosition ?: 0L
            if (Math.abs(cur - targetPositionMs) > 1000L) {
                exoPlayer?.seekTo(targetPositionMs)
            }
        }
        exoPlayer?.playWhenReady = true
        exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
    }

    fun pause() {
        scheduledPlayJob?.cancel()
        exoPlayer?.playWhenReady = false
        exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
    }

    /**
     * Pauses playback and only seeks if target differs significantly.
     */
    fun pauseAndSeek(positionMs: Long) {
        scheduledPlayJob?.cancel()
        exoPlayer?.playWhenReady = false
        if (positionMs >= 0) {
            val cur = exoPlayer?.currentPosition ?: 0L
            if (Math.abs(cur - positionMs) > 1000L) {
                exoPlayer?.seekTo(positionMs)
            }
        }
    }

    fun seekTo(positionMs: Long) {
        exoPlayer?.seekTo(positionMs)
    }

    fun seekRelative(deltaMs: Long): Long {
        val cur = currentPositionMs
        val dur = durationMs
        val target = if (dur > 0) {
            (cur + deltaMs).coerceIn(0L, dur)
        } else {
            (cur + deltaMs).coerceAtLeast(0L)
        }
        seekTo(target)
        return target
    }

    /**
     * Micro-drift watchdog: Adjusts playback speed smoothly without stuttering seeks.
     * Uses micro-tempo adjustments (0.95x - 1.05x) for deviations under 1000ms.
     * Hard seeks are strictly avoided unless deviation is catastrophic (>1000ms).
     */
    fun correctDrift(masterPositionMs: Long) {
        val current = exoPlayer?.currentPosition ?: return
        val driftMs = current - masterPositionMs

        when {
            driftMs > 1000 || driftMs < -1000 -> {
                // Catastrophic drift only: Hard seek
                exoPlayer?.seekTo(masterPositionMs)
                exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
            }
            driftMs > 80 -> {
                // Client is noticeably ahead: gently slow down to 0.95x
                exoPlayer?.playbackParameters = PlaybackParameters(0.95f)
            }
            driftMs > 25 -> {
                // Client is slightly ahead: micro-slowdown to 0.98x
                exoPlayer?.playbackParameters = PlaybackParameters(0.98f)
            }
            driftMs < -80 -> {
                // Client is noticeably behind: gently speed up to 1.05x
                exoPlayer?.playbackParameters = PlaybackParameters(1.05f)
            }
            driftMs < -25 -> {
                // Client is slightly behind: micro-speedup to 1.02x
                exoPlayer?.playbackParameters = PlaybackParameters(1.02f)
            }
            else -> {
                // Tight sync within tight ±25ms tolerance: run normal 1.0x
                if (exoPlayer?.playbackParameters?.speed != 1.0f) {
                    exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
                }
            }
        }
    }

    fun setVolume(volume: Float) {
        exoPlayer?.volume = volume
    }

    fun isPlaying(): Boolean {
        return exoPlayer?.isPlaying == true || exoPlayer?.playWhenReady == true
    }

    val currentPositionMs: Long
        get() = exoPlayer?.currentPosition?.coerceAtLeast(0L) ?: 0L

    val durationMs: Long
        get() = exoPlayer?.duration?.takeIf { it > 0 } ?: 0L

    fun getCurrentPosition(): Long {
        return currentPositionMs
    }

    fun release() {
        scheduledPlayJob?.cancel()
        controllerScope.cancel()
        exoPlayer?.release()
        exoPlayer = null
    }
}
