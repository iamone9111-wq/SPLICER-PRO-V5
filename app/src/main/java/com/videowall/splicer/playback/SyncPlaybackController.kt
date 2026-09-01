package com.videowall.splicer.playback

import android.content.Context
import android.net.Uri
import android.os.SystemClock
import android.util.Log
import android.view.TextureView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
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

    init {
        initExoPlayer()
    }

    private fun initExoPlayer() {
        // Configure low buffer delay for fast seeking and sync response
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
                    override fun onVideoSizeChanged(videoSize: androidx.media3.common.VideoSize) {
                        this@SyncPlaybackController.onVideoSizeChanged(videoSize.width, videoSize.height)
                    }

                    override fun onPlaybackStateChanged(playbackState: Int) {
                        Log.d(tag, "Playback state changed: $playbackState")
                    }
                })
            }
    }

    fun prepareMedia(uri: Uri) {
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
     */
    fun schedulePlay(startPositionMs: Long, localExecutionTimeMs: Long) {
        scheduledPlayJob?.cancel()
        
        scheduledPlayJob = controllerScope.launch {
            val now = SystemClock.elapsedRealtime()
            val waitDurationMs = localExecutionTimeMs - now

            exoPlayer?.seekTo(startPositionMs)

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

    fun seekTo(positionMs: Long) {
        exoPlayer?.seekTo(positionMs)
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
        get() = exoPlayer?.currentPosition ?: 0L

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