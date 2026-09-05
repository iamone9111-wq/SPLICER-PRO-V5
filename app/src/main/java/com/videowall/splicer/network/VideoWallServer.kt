package com.videowall.splicer.network

import android.content.Context
import android.os.SystemClock
import android.util.Log
import kotlinx.coroutines.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Physical/matrix slot assigned to a screen device in the video wall.
 */
data class ScreenSlot(
    val deviceIndex: Int,
    val row: Int,
    val col: Int,
    val rotationDeg: Int = 0
)

/**
 * High-performance TCP master server running on the Host device.
 * Manages WebSocket/TCP connections to client phones, synchronizes system clocks via NTP-like ping-pong,
 * assigns screen slots (rows, columns, orientation, bezel compensation), and broadcasts lockstep playback commands.
 */
class VideoWallServer(
    private val context: Context? = null,
    private val port: Int = 8988,
    private val onClientConnected: (clientCount: Int, clientIp: String) -> Unit,
    private val onClientDisconnected: (clientCount: Int) -> Unit,
    private val onHeartbeatReceived: ((heartbeat: SyncMessage.Heartbeat) -> Unit)? = null
) {
    private val tag = "VideoWallServer"
    private var serverSocket: ServerSocket? = null
    private val serverScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val connectedClients = CopyOnWriteArrayList<ClientHandler>()
    
    // Slot mapping: deviceIndex -> ScreenSlot (0 is Host, 1..N are Clients)
    private val slotAssignments = ConcurrentHashMap<Int, ScreenSlot>()

    var configuredScreenCount: Int = 3
        private set
    var currentOrientation: WallOrientation = WallOrientation.HORIZONTAL
        private set
    var gridRows: Int = 1
        private set
    var gridCols: Int = 3
        private set
    var currentScaleMode: ScaleMode = ScaleMode.COVER
        private set
    var deviceOrientation: DeviceOrientation = DeviceOrientation.HORIZONTAL
        private set
    var currentMediaUri: String? = null
        private set
    var videoWidth: Int = 1920
        private set
    var videoHeight: Int = 1080
        private set
    var bezelPercent: Float = 3.5f
        private set

    init {
        rebuildDefaultSlots(configuredScreenCount, currentOrientation, gridRows, gridCols)
    }

    fun start() {
        serverScope.launch {
            try {
                serverSocket = ServerSocket(port).apply {
                    reuseAddress = true
                }
                Log.d(tag, "VideoWallServer listening on port $port")

                while (isActive) {
                    val socket = serverSocket?.accept() ?: break
                    val clientHandler = ClientHandler(socket)
                    connectedClients.add(clientHandler)

                    val clientIp = socket.inetAddress?.hostAddress ?: "unknown"
                    Log.d(tag, "New client connected: $clientIp (total: ${connectedClients.size})")

                    withContext(Dispatchers.Main) {
                        onClientConnected(connectedClients.size, clientIp)
                    }

                    // Auto-sync roles and media to newly joined device immediately
                    broadcastRoleAssignments(forceResendMedia = true)

                    clientHandler.startListening()
                }
            } catch (e: Exception) {
                if (isActive) Log.e(tag, "Server exception: ${e.message}", e)
            }
        }
    }

    /**
     * Updates wall geometry and broadcasts configuration and media to all clients.
     */
    fun broadcastConfiguration(
        rows: Int,
        cols: Int,
        scaleMode: ScaleMode = ScaleMode.COVER,
        mediaUri: String? = null,
        videoWidth: Int = 1920,
        videoHeight: Int = 1080,
        deviceOrientation: DeviceOrientation = this.deviceOrientation,
        bezelPercent: Float = this.bezelPercent
    ) {
        gridRows = rows.coerceAtLeast(1)
        gridCols = cols.coerceAtLeast(1)
        configuredScreenCount = gridRows * gridCols
        currentScaleMode = scaleMode
        if (mediaUri != null) currentMediaUri = mediaUri
        this.videoWidth = videoWidth
        this.videoHeight = videoHeight
        this.deviceOrientation = deviceOrientation
        this.bezelPercent = bezelPercent
        currentOrientation = if (gridRows > 1 && gridCols > 1) {
            WallOrientation.GRID
        } else if (gridRows > 1) {
            WallOrientation.VERTICAL
        } else {
            WallOrientation.HORIZONTAL
        }

        rebuildDefaultSlots(configuredScreenCount, currentOrientation, gridRows, gridCols)
        broadcastRoleAssignments(forceResendMedia = true)
    }

    fun configureWall(
        screenCount: Int,
        orientation: WallOrientation,
        rows: Int = 1,
        cols: Int = 1,
        scaleMode: ScaleMode = ScaleMode.COVER,
        mediaUri: String? = null,
        width: Int = videoWidth,
        height: Int = videoHeight,
        deviceOrientation: DeviceOrientation = this.deviceOrientation
    ) {
        configuredScreenCount = screenCount.coerceAtLeast(1)
        currentOrientation = orientation
        gridRows = rows.coerceAtLeast(1)
        gridCols = cols.coerceAtLeast(1)
        currentScaleMode = scaleMode
        if (mediaUri != null) currentMediaUri = mediaUri
        videoWidth = width
        videoHeight = height
        this.deviceOrientation = deviceOrientation

        rebuildDefaultSlots(configuredScreenCount, orientation, gridRows, gridCols)
        broadcastRoleAssignments(forceResendMedia = true)
    }

    /**
     * Broadcasts identification screen numbers to all connected screens.
     * Host is Screen 1, Client 0 is Screen 2, Client 1 is Screen 3, etc.
     */
    fun broadcastIdentify(targetDeviceIndex: Int = -1, durationMs: Long = 3000L) {
        connectedClients.forEachIndexed { index, client ->
            val devIdx = index + 1 // 1..N
            val displayIndex = devIdx + 1 // Screen 2, 3, 4...
            if (targetDeviceIndex == -1 || targetDeviceIndex == devIdx) {
                client.sendMessage(
                    SyncMessage.Identify(
                        targetDeviceIndex = devIdx,
                        displayIndex = displayIndex,
                        durationMs = durationMs
                    )
                )
            }
        }
    }

    private fun rebuildDefaultSlots(total: Int, orient: WallOrientation, rows: Int = gridRows, cols: Int = gridCols) {
        slotAssignments.clear()
        val c = cols.coerceAtLeast(1)
        for (i in 0 until total) {
            val row = i / c
            val col = i % c
            slotAssignments[i] = ScreenSlot(deviceIndex = i, row = row, col = col)
        }
    }

    fun broadcastRoleAssignments(forceResendMedia: Boolean = true) {
        val totalScreens = maxOf(configuredScreenCount, connectedClients.size + 1)
        rebuildDefaultSlots(totalScreens, currentOrientation, gridRows, gridCols)

        connectedClients.forEachIndexed { index, client ->
            val clientIndex = index + 1 // Host is 0 (Screen 1), Clients are 1..N (Screens 2..N+1)
            val slot = slotAssignments[clientIndex] ?: ScreenSlot(
                deviceIndex = clientIndex,
                row = clientIndex / gridCols.coerceAtLeast(1),
                col = clientIndex % gridCols.coerceAtLeast(1)
            )

            client.sendMessage(
                SyncMessage.AssignRole(
                    deviceIndex = clientIndex,
                    totalDevices = totalScreens,
                    orientation = currentOrientation,
                    deviceOrientation = deviceOrientation,
                    row = slot.row,
                    col = slot.col,
                    totalRows = gridRows,
                    totalCols = gridCols,
                    scaleMode = currentScaleMode,
                    rotationDeg = slot.rotationDeg,
                    videoWidth = videoWidth,
                    videoHeight = videoHeight,
                    bezelPercent = bezelPercent
                )
            )

            // ALWAYS send media preparation if media is configured
            if (forceResendMedia && currentMediaUri != null) {
                val clientLocalIp = client.socket.localAddress?.hostAddress ?: ""
                val streamUri = if (clientLocalIp.isNotEmpty() && currentMediaUri!!.contains(":8990/")) {
                    "http://$clientLocalIp:8990/video.mp4"
                } else {
                    currentMediaUri!!
                }
                client.sendMessage(
                    SyncMessage.PrepareMedia(
                        mediaUri = streamUri,
                        videoWidth = videoWidth,
                        videoHeight = videoHeight,
                        durationMs = 0L
                    )
                )
            }
        }
    }

    fun broadcastPlay(
        startPositionMs: Long,
        targetTimeEpochMs: Long,
        deviceOrientation: DeviceOrientation = this.deviceOrientation,
        bezelPercent: Float = this.bezelPercent,
        scaleMode: ScaleMode = this.currentScaleMode
    ) {
        // Ensure every client has media prepared before scheduling play
        currentMediaUri?.let { uri ->
            connectedClients.forEach { client ->
                val clientLocalIp = client.socket.localAddress?.hostAddress ?: ""
                val streamUri = if (clientLocalIp.isNotEmpty() && uri.contains(":8990/")) {
                    "http://$clientLocalIp:8990/video.mp4"
                } else {
                    uri
                }
                client.sendMessage(
                    SyncMessage.PrepareMedia(
                        mediaUri = streamUri,
                        videoWidth = videoWidth,
                        videoHeight = videoHeight,
                        durationMs = 0L
                    )
                )
            }
        }

        val message = SyncMessage.SchedulePlay(
            startPositionMs = startPositionMs,
            targetSystemTimeMs = targetTimeEpochMs,
            hostExecutionEpochMs = targetTimeEpochMs,
            deviceOrientation = deviceOrientation,
            bezelPercent = bezelPercent,
            scaleMode = scaleMode
        )
        connectedClients.forEach { it.sendMessage(message) }
    }

    fun broadcastSchedulePlay(
        startPositionMs: Long,
        executionDelayMs: Long = 200L,
        deviceOrientation: DeviceOrientation = this.deviceOrientation,
        bezelPercent: Float = this.bezelPercent,
        scaleMode: ScaleMode = this.currentScaleMode
    ): Long {
        val targetSystemTimeMs = SystemClock.elapsedRealtime() + executionDelayMs
        broadcastPlay(startPositionMs, targetSystemTimeMs, deviceOrientation, bezelPercent, scaleMode)
        return targetSystemTimeMs
    }

    fun broadcastPause(currentPositionMs: Long) {
        val message = SyncMessage.Pause(
            currentPositionMs = currentPositionMs,
            positionMs = currentPositionMs
        )
        connectedClients.forEach { it.sendMessage(message) }
    }

    fun broadcastSeek(targetPositionMs: Long, executionDelayMs: Long = 300L): Long {
        val targetSystemTimeMs = SystemClock.elapsedRealtime() + executionDelayMs
        val message = SyncMessage.Seek(targetPositionMs, targetSystemTimeMs)
        connectedClients.forEach { it.sendMessage(message) }
        return targetSystemTimeMs
    }

    fun stop() {
        serverScope.cancel()
        connectedClients.forEach { it.close() }
        connectedClients.clear()
        try {
            serverSocket?.close()
        } catch (e: Exception) {}
    }

    inner class ClientHandler(val socket: Socket) {
        private var writer: PrintWriter? = null
        private var reader: BufferedReader? = null
        private var clientJob: Job? = null

        fun startListening() {
            clientJob = serverScope.launch {
                try {
                    socket.tcpNoDelay = true
                    writer = PrintWriter(socket.getOutputStream(), true)
                    reader = BufferedReader(InputStreamReader(socket.getInputStream()))

                    // Immediate initial NTP clock sync handshake
                    sendPing()

                    while (isActive && !socket.isClosed) {
                        val line = reader?.readLine() ?: break
                        handleMessage(line)
                    }
                } catch (e: Exception) {
                    Log.d(tag, "Client connection ended: ${e.message}")
                } finally {
                    close()
                    connectedClients.remove(this@ClientHandler)
                    withContext(Dispatchers.Main) {
                        onClientDisconnected(connectedClients.size)
                    }
                    broadcastRoleAssignments(forceResendMedia = false)
                }
            }
        }

        private fun sendPing() {
            val ping = SyncMessage.Ping(t0ClientSent = SystemClock.elapsedRealtime())
            sendMessage(ping)
        }

        private fun handleMessage(rawJson: String) {
            try {
                when (val message = ProtocolSerializer.deserialize(rawJson)) {
                    is SyncMessage.Ping -> {
                        val t1 = SystemClock.elapsedRealtime()
                        val pong = SyncMessage.Pong(
                            t0ClientSent = message.t0ClientSent,
                            t1ServerReceived = t1,
                            t2ServerSent = SystemClock.elapsedRealtime()
                        )
                        sendMessage(pong)
                    }
                    is SyncMessage.Heartbeat -> {
                        onHeartbeatReceived?.invoke(message)
                    }
                    else -> {
                        Log.d(tag, "Received from client: $rawJson")
                    }
                }
            } catch (e: Exception) {
                Log.e(tag, "Error handling message from client: ${e.message}")
            }
        }

        fun sendMessage(message: SyncMessage) {
            serverScope.launch(Dispatchers.IO) {
                try {
                    val json = ProtocolSerializer.serialize(message)
                    writer?.print(json)
                    writer?.flush()
                } catch (e: Exception) {
                    Log.e(tag, "Failed to send message: ${e.message}")
                }
            }
        }

        fun close() {
            clientJob?.cancel()
            try {
                writer?.close()
                reader?.close()
                socket.close()
            } catch (e: Exception) {}
        }
    }
}
