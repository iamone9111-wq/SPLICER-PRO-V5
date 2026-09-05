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
        // Configure low buffer delay for fast seeking and tight synchronized response
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                500,  // minBufferMs
                1500, // maxBufferMs
                250,  // bufferForPlaybackMs
                500   // bufferForPlaybackAfterRebufferMs
            )
            .build()

        exoPlayer = ExoPlayer.Builder(context)
            .setLoadControl(loadControl)
            .build()
            .apply {
                setVideoTextureView(textureView)
                addListener(object : Player.Listener {
                    override fun onVideoSizeChanged(videoSize: VideoSize) {
                        val rotation = videoSize.unappliedRotationDegrees
                        val realW = if (rotation == 90 || rotation == 270) videoSize.height else videoSize.width
                        val realH = if (rotation == 90 || rotation == 270) videoSize.width else videoSize.height
                        Log.d(tag, "VideoSize changed: raw=${videoSize.width}x${videoSize.height}, rot=$rotation -> effective=${realW}x${realH}")
                        this@SyncPlaybackController.onVideoSizeChanged(realW, realH)
                    }

                    override fun onPlaybackStateChanged(playbackState: Int) {
                        Log.d(tag, "Playback state changed: $playbackState (ready=${playbackState == Player.STATE_READY})")
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        Log.e(tag, "ExoPlayer error: ${error.message} (code: ${error.errorCodeName})", error)
                        // Auto-retry once on network or transient error
                        currentUri?.let { uri ->
                            controllerScope.launch {
                                delay(600L)
                                Log.d(tag, "Retrying media preparation after error: $uri")
                                prepareMedia(uri)
                            }
                        }
                    }
                })
            }
    }

    fun prepareMedia(uri: Uri) {
        currentUri = uri
        val mediaItem = MediaItem.fromUri(uri)
        exoPlayer?.apply {
            setMediaItem(mediaItem)
            prepare()
            playWhenReady = false
        }
    }

    /**
     * Schedules the player to begin playback from [startPositionMs] at [localExecutionTimeMs].
     * Uses Coroutine delay with SystemClock.elapsedRealtime() for sub-millisecond precision.
     * Skips redundant seek if already at the target position to guarantee instantaneous playback.
     */
    fun schedulePlay(startPositionMs: Long, localExecutionTimeMs: Long) {
        scheduledPlayJob?.cancel()
        
        scheduledPlayJob = controllerScope.launch {
            val now = SystemClock.elapsedRealtime()
            val waitDurationMs = localExecutionTimeMs - now

            // If player is idle or unbuffered, prepare it
            if (exoPlayer?.playbackState == Player.STATE_IDLE) {
                currentUri?.let { prepareMedia(it) } ?: exoPlayer?.prepare()
            }

            // Avoid redundant seeks which flush ExoPlayer decoder buffers and cause 1-2s lag
            val curPos = exoPlayer?.currentPosition ?: 0L
            if (Math.abs(curPos - startPositionMs) > 250L) {
                exoPlayer?.seekTo(startPositionMs)
            }

            if (waitDurationMs > 0) {
                Log.d(tag, "Waiting ${waitDurationMs}ms until synchronized start at $localExecutionTimeMs")
                delay(waitDurationMs)
            } else {
                Log.w(tag, "Scheduled execution was in the past by ${-waitDurationMs}ms; starting immediately")
            }

            exoPlayer?.playWhenReady = true
            exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
        }
    }

    fun pause() {
        scheduledPlayJob?.cancel()
        exoPlayer?.playWhenReady = false
    }

    /**
     * Pauses playback and pre-buffers the exact frame timestamp.
     */
    fun pauseAndSeek(positionMs: Long) {
        scheduledPlayJob?.cancel()
        exoPlayer?.playWhenReady = false
        if (positionMs >= 0) {
            val cur = exoPlayer?.currentPosition ?: 0L
            if (Math.abs(cur - positionMs) > 200L) {
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
     * Micro-drift watchdog: Adjusts playback speed smoothly if drift is small (<50ms)
     * or performs a hard seek if drift is large (>100ms).
     */
    fun correctDrift(masterPositionMs: Long) {
        val current = exoPlayer?.currentPosition ?: return
        val driftMs = current - masterPositionMs

        when {
            driftMs > 100 || driftMs < -100 -> {
                // Large drift: Hard seek
                exoPlayer?.seekTo(masterPositionMs)
                exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
            }
            driftMs > 15 -> {
                // Client is slightly ahead: slow down to 0.98x
                exoPlayer?.playbackParameters = PlaybackParameters(0.98f)
            }
            driftMs < -15 -> {
                // Client is slightly behind: speed up to 1.02x
                exoPlayer?.playbackParameters = PlaybackParameters(1.02f)
            }
            else -> {
                // Synchronized within tolerance
                exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
            }
        }
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
