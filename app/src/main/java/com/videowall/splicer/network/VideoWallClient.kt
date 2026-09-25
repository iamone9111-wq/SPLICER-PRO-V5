package com.videowall.splicer.network

import android.content.Context
import android.os.SystemClock
import android.util.Log
import kotlinx.coroutines.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.InetSocketAddress
import java.net.Socket

class VideoWallClient(
    private val context: Context? = null,
    private var hostIp: String,
    private val port: Int = 8988,
    private val fallbackIp: String? = "192.168.43.1",
    private val onConnected: ((hostIp: String) -> Unit)? = null,
    private val onConnectionFailed: ((error: String, attemptedIp: String) -> Unit)? = null,
    private val onDisconnected: (() -> Unit)? = null,
    private val onRoleAssigned: (role: SyncMessage.AssignRole) -> Unit,
    private val onMediaPrepared: (media: SyncMessage.PrepareMedia) -> Unit,
    private val onPlayScheduled: (startPositionMs: Long, localExecutionTimeMs: Long, orientation: DeviceOrientation, bezelPercent: Float, scaleMode: ScaleMode) -> Unit,
    private val onPause: (positionMs: Long) -> Unit,
    private val onSeekScheduled: (targetPositionMs: Long, localExecutionTimeMs: Long) -> Unit,
    private val onSyncOffsetUpdated: (offsetMs: Long, rttMs: Long) -> Unit,
    private val onIdentify: ((displayIndex: Int, durationMs: Long) -> Unit)? = null,
    private val onMasterHeartbeat: ((masterPositionMs: Long, isPlaying: Boolean) -> Unit)? = null,
    private val onHostShutdown: (() -> Unit)? = null,
    private val onFastResume: ((resumePositionMs: Long) -> Unit)? = null,
    private val onHostTimeout: (() -> Unit)? = null
) {
    private val tag = "VideoWallClient"
    private var socket: Socket? = null
    private var writer: PrintWriter? = null
    private var reader: BufferedReader? = null
    private val clientScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var lastHostActivityTimeMs: Long = SystemClock.elapsedRealtime()
    private var isHostTimedOut: Boolean = false

    /**
     * Estimated Clock Offset between Host Clock and Client Clock in milliseconds.
     * Host_Time = Client_Time + clockOffsetMs
     * Client_Time = Host_Time - clockOffsetMs
     */
    var clockOffsetMs: Long = 0L
        private set
    var roundTripTimeMs: Long = 0L
        private set

    fun connect() {
        clientScope.launch {
            val connected = tryConnect(hostIp)
            if (!connected && fallbackIp != null && fallbackIp != hostIp) {
                Log.d(tag, "Attempting fallback connection to $fallbackIp:$port...")
                val fallbackConnected = tryConnect(fallbackIp)
                if (fallbackConnected) {
                    hostIp = fallbackIp
                    return@launch
                }
            }
        }
    }

    private suspend fun tryConnect(targetIp: String): Boolean {
        return try {
            val s = Socket()
            NetworkUtils.bindSocketToWifi(s, context)
            s.connect(InetSocketAddress(targetIp, port), 4500)
            socket = s
            writer = PrintWriter(s.getOutputStream(), true)
            reader = BufferedReader(InputStreamReader(s.getInputStream()))

            Log.d(tag, "Connected successfully to Host at $targetIp:$port")

            withContext(Dispatchers.Main) {
                onConnected?.invoke(targetIp)
            }

            // Start continuous background NTP clock synchronizer
            startNtpSyncLoop()

            // Listen for host commands
            clientScope.launch(Dispatchers.IO) {
                try {
                    while (isActive && socket?.isClosed == false) {
                        val line = reader?.readLine() ?: break
                        handleHostMessage(line)
                    }
                } catch (e: Exception) {
                    Log.d(tag, "Client connection ended: ${e.message}")
                } finally {
                    withContext(Dispatchers.Main) {
                        onDisconnected?.invoke()
                    }
                }
            }
            true
        } catch (e: Exception) {
            Log.e(tag, "Connection attempt to $targetIp:$port failed: ${e.message}")
            if (targetIp == hostIp && (fallbackIp == null || fallbackIp == hostIp)) {
                withContext(Dispatchers.Main) {
                    onConnectionFailed?.invoke(e.message ?: "Connection timed out", targetIp)
                }
            } else if (targetIp == fallbackIp) {
                withContext(Dispatchers.Main) {
                    onConnectionFailed?.invoke(e.message ?: "Connection timed out", targetIp)
                }
            }
            false
        }
    }

    /**
     * Continuously exchanges NTP Ping/Pong messages every 2 seconds to keep clock synchronization accurate to <2ms,
     * and monitors Host liveness to halt client screens immediately if Host drops or closes.
     */
    private fun startNtpSyncLoop() {
        clientScope.launch {
            var counter = 0
            while (isActive && socket?.isClosed == false) {
                // Ping every 1500ms
                if (counter % 3 == 0) {
                    sendPing()
                }
                delay(500L)
                counter++

                // Host Liveness Watchdog: Check if Host has been silent for > 2.5 seconds
                val timeSinceLastHostActivity = SystemClock.elapsedRealtime() - lastHostActivityTimeMs
                if (timeSinceLastHostActivity > 2500L) {
                    if (!isHostTimedOut) {
                        isHostTimedOut = true
                        Log.w(tag, "Host silent for ${timeSinceLastHostActivity}ms - triggering onHostTimeout")
                        withContext(Dispatchers.Main) {
                            onHostTimeout?.invoke()
                        }
                    }
                } else {
                    isHostTimedOut = false
                }
            }
        }
    }

    private fun sendPing() {
        val t0ClientSent = SystemClock.elapsedRealtime()
        val ping = SyncMessage.Ping(t0ClientSent)
        sendMessage(ping)
    }

    private fun handleHostMessage(rawJson: String) {
        try {
            lastHostActivityTimeMs = SystemClock.elapsedRealtime()
            when (val message = ProtocolSerializer.deserialize(rawJson)) {
                is SyncMessage.Pong -> {
                    val t3ClientReceived = SystemClock.elapsedRealtime()
                    val t0 = message.t0ClientSent
                    val t1 = message.t1ServerReceived
                    val t2 = message.t2ServerSent

                    roundTripTimeMs = (t3ClientReceived - t0) - (t2 - t1)
                    clockOffsetMs = ((t1 - t0) + (t2 - t3ClientReceived)) / 2

                    onSyncOffsetUpdated(clockOffsetMs, roundTripTimeMs)
                }
                is SyncMessage.AssignRole -> {
                    onRoleAssigned(message)
                }
                is SyncMessage.PrepareMedia -> {
                    onMediaPrepared(message)
                }
                is SyncMessage.SchedulePlay -> {
                    val localNow = SystemClock.elapsedRealtime()
                    val hostNowEstimated = localNow + clockOffsetMs
                    val transitDelay = (hostNowEstimated - message.hostExecutionEpochMs).coerceAtLeast(0L)
                    val realStartPos = message.startPositionMs + transitDelay
                    val localExecTime = message.hostExecutionEpochMs - clockOffsetMs
                    onPlayScheduled(realStartPos, localExecTime, message.deviceOrientation, message.bezelPercent, message.scaleMode)
                }
                is SyncMessage.FastResume -> {
                    val localNow = SystemClock.elapsedRealtime()
                    val hostNowEstimated = localNow + clockOffsetMs
                    val transitDelay = (hostNowEstimated - message.hostElapsedRealtimeMs).coerceAtLeast(0L)
                    val realResumePos = message.resumePositionMs + transitDelay
                    onFastResume?.invoke(realResumePos)
                }
                is SyncMessage.MasterHeartbeat -> {
                    val localNow = SystemClock.elapsedRealtime()
                    val hostNowEstimated = localNow + clockOffsetMs
                    val transitDelay = (hostNowEstimated - message.hostElapsedRealtimeMs).coerceAtLeast(0L)
                    val realMasterPos = if (message.isPlaying) {
                        message.masterPositionMs + transitDelay
                    } else {
                        message.masterPositionMs
                    }
                    onMasterHeartbeat?.invoke(realMasterPos, message.isPlaying)
                }
                is SyncMessage.HostShutdown -> {
                    onHostShutdown?.invoke()
                }
                is SyncMessage.Pause -> {
                    val pos = if (message.currentPositionMs > 0) message.currentPositionMs else message.positionMs
                    onPause(pos)
                }
                is SyncMessage.Seek -> {
                    val localExecTime = message.targetSystemTimeMs - clockOffsetMs
                    onSeekScheduled(message.targetPositionMs, localExecTime)
                }
                is SyncMessage.ScheduleSeek -> {
                    val localExecTime = message.hostExecutionEpochMs - clockOffsetMs
                    onSeekScheduled(message.targetPositionMs, localExecTime)
                }
                is SyncMessage.Identify -> {
                    onIdentify?.invoke(message.displayIndex, message.durationMs)
                }
                is SyncMessage.IdentifyScreen -> {
                    onIdentify?.invoke(message.displayIndex, message.flashDurationMs)
                }
                else -> {
                    Log.d(tag, "Received message: $rawJson")
                }
            }
        } catch (e: Exception) {
            Log.e(tag, "Error handling message: ${e.message}", e)
        }
    }

    private fun sendMessage(msg: SyncMessage) {
        clientScope.launch(Dispatchers.IO) {
            try {
                val json = ProtocolSerializer.serialize(msg)
                writer?.println(json)
            } catch (e: Exception) {
                Log.e(tag, "Failed to send message: ${e.message}")
            }
        }
    }

    fun disconnect() {
        clientScope.cancel()
        try {
            socket?.close()
        } catch (e: Exception) {}
    }
}
