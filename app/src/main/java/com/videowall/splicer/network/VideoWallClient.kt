package com.videowall.splicer.network

import android.os.SystemClock
import android.util.Log
import kotlinx.coroutines.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.InetSocketAddress
import java.net.Socket

class VideoWallClient(
    private var hostIp: String,
    private val port: Int = 8988,
    private val fallbackIp: String? = "192.168.43.1",
    private val onConnected: ((hostIp: String) -> Unit)? = null,
    private val onConnectionFailed: ((error: String, attemptedIp: String) -> Unit)? = null,
    private val onRoleAssigned: (role: SyncMessage.AssignRole) -> Unit,
    private val onMediaPrepared: (media: SyncMessage.PrepareMedia) -> Unit,
    private val onPlayScheduled: (startPositionMs: Long, localExecutionTimeMs: Long) -> Unit,
    private val onPause: (positionMs: Long) -> Unit,
    private val onSeekScheduled: (targetPositionMs: Long, localExecutionTimeMs: Long) -> Unit,
    private val onSyncOffsetUpdated: (offsetMs: Long, rttMs: Long) -> Unit,
    private val onIdentify: ((displayIndex: Int, durationMs: Long) -> Unit)? = null
) {
    private val tag = "VideoWallClient"
    private var socket: Socket? = null
    private var writer: PrintWriter? = null
    private var reader: BufferedReader? = null
    private val clientScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

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
            launch(Dispatchers.IO) {
                try {
                    while (isActive && socket?.isClosed == false) {
                        val line = reader?.readLine() ?: break
                        handleHostMessage(line)
                    }
                } catch (e: Exception) {}
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
     * Continuously exchanges NTP Ping/Pong messages every 2 seconds to keep clock synchronization accurate to <2ms.
     */
    private fun startNtpSyncLoop() {
        clientScope.launch {
            while (isActive && socket?.isClosed == false) {
                sendPing()
                delay(2000L)
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
                    val localExecTime = message.hostExecutionEpochMs - clockOffsetMs
                    onPlayScheduled(message.startPositionMs, localExecTime)
                }
                is SyncMessage.Pause -> {
                    onPause(message.positionMs)
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
