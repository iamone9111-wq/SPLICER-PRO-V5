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
        // Fast start & zero-latency resume buffer configuration:
        // 200ms bufferForPlayback allows instantaneous start without waiting
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                1000, // minBufferMs (1.0s)
                4000, // maxBufferMs (4.0s)
                200,  // bufferForPlaybackMs (0.2s - instant playback start)
                400   // bufferForPlaybackAfterRebufferMs (0.4s)
            )
            .setPrioritizeTimeOverSizeThresholds(true)
            .setBackBuffer(1000, false)
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
                                delay(600L)
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
     * Schedules the player to begin playback from [startPositionMs] at [localExecutionTimeMs].
     * Zero-latency: avoid redundant seeks which flush ExoPlayer decoder buffers.
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

            // Only seek if deviation is substantial (> 800ms).
            // Avoiding redundant seek prevents discarding the decoded video frame buffer!
            val curPos = exoPlayer?.currentPosition ?: 0L
            if (Math.abs(curPos - startPositionMs) > 800L) {
                exoPlayer?.seekTo(startPositionMs)
            }

            if (waitDurationMs in 1..25) {
                delay(waitDurationMs)
            }

            exoPlayer?.playWhenReady = true
            exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
        }
    }

    /**
     * Instantaneous zero-latency resume without seeking or buffer pipeline flush.
     */
    fun resumeFast() {
        scheduledPlayJob?.cancel()
        if (exoPlayer?.playbackState == Player.STATE_IDLE) {
            currentUri?.let { prepareMedia(it) } ?: exoPlayer?.prepare()
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
            if (Math.abs(cur - positionMs) > 800L) {
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
     * Micro-drift watchdog: Adjusts playback speed smoothly if drift is small (<250ms)
     * or performs a hard seek if drift is large (>300ms).
     */
    fun correctDrift(masterPositionMs: Long) {
        val current = exoPlayer?.currentPosition ?: return
        val driftMs = current - masterPositionMs

        when {
            driftMs > 300 || driftMs < -300 -> {
                // Large drift: Hard seek
                exoPlayer?.seekTo(masterPositionMs)
                exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
            }
            driftMs > 30 -> {
                // Client is slightly ahead: gently slow down to 0.96x
                exoPlayer?.playbackParameters = PlaybackParameters(0.96f)
            }
            driftMs < -30 -> {
                // Client is slightly behind: gently speed up to 1.04x
                exoPlayer?.playbackParameters = PlaybackParameters(1.04f)
            }
            else -> {
                // Synchronized within tight tolerance (<30ms)
                if (exoPlayer?.playbackParameters?.speed != 1.0f) {
                    exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
                }
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
