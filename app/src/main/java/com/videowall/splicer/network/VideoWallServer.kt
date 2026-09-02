package com.videowall.splicer.network

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

data class ScreenSlot(
    val deviceIndex: Int,
    val row: Int,
    val col: Int,
    val rotationDeg: Int = 0
)

class VideoWallServer(
    private val port: Int = 8988,
    private val onClientConnected: (clientCount: Int, clientIp: String) -> Unit,
    private val onClientDisconnected: (clientCount: Int) -> Unit,
    private val onHeartbeatReceived: (heartbeat: SyncMessage.Heartbeat) -> Unit
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

    init {
        // Default 1x3 horizontal wall
        rebuildDefaultSlots(configuredScreenCount, currentOrientation, gridRows, gridCols)
    }

    fun start() {
        serverScope.launch {
            try {
                serverSocket = ServerSocket(port)
                Log.d(tag, "Server listening on port $port")

                while (isActive) {
                    val socket = serverSocket?.accept() ?: break
                    val clientHandler = ClientHandler(socket)
                    connectedClients.add(clientHandler)

                    withContext(Dispatchers.Main) {
                        onClientConnected(connectedClients.size, socket.inetAddress.hostAddress ?: "unknown")
                    }

                    // Auto-sync roles when new device joins
                    broadcastRoleAssignments()

                    clientHandler.startListening()
                }
            } catch (e: Exception) {
                if (isActive) Log.e(tag, "Server exception: ${e.message}", e)
            }
        }
    }

    /**
     * Updates wall geometry and broadcasts to all clients.
     */
    fun broadcastConfiguration(
        rows: Int,
        cols: Int,
        scaleMode: ScaleMode = ScaleMode.COVER,
        mediaUri: String? = null,
        videoWidth: Int = 1920,
        videoHeight: Int = 1080,
        deviceOrientation: DeviceOrientation = this.deviceOrientation
    ) {
        gridRows = rows
        gridCols = cols
        configuredScreenCount = rows * cols
        currentScaleMode = scaleMode
        if (mediaUri != null) currentMediaUri = mediaUri
        this.videoWidth = videoWidth
        this.videoHeight = videoHeight
        this.deviceOrientation = deviceOrientation

        rebuildDefaultSlots(configuredScreenCount, currentOrientation, rows, cols)
        broadcastRoleAssignments()
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
        configuredScreenCount = screenCount
        currentOrientation = orientation
        gridRows = rows
        gridCols = cols
        currentScaleMode = scaleMode
        if (mediaUri != null) currentMediaUri = mediaUri
        videoWidth = width
        videoHeight = height
        this.deviceOrientation = deviceOrientation

        rebuildDefaultSlots(screenCount, orientation, rows, cols)
        broadcastRoleAssignments()
    }

    /**
     * Broadcasts identification numbers across all connected screens.
     */
    fun broadcastIdentify(targetDeviceIndex: Int = -1, durationMs: Long = 3000L) {
        connectedClients.forEachIndexed { index, client ->
            val devIdx = index + 1
            if (targetDeviceIndex == -1 || targetDeviceIndex == devIdx) {
                client.sendMessage(SyncMessage.Identify(targetDeviceIndex = devIdx, displayIndex = devIdx + 1, durationMs = durationMs))
            }
        }
    }

    private fun rebuildDefaultSlots(total: Int, orient: WallOrientation, rows: Int = gridRows, cols: Int = gridCols) {
        slotAssignments.clear()
        for (i in 0 until total) {
            val (row, col) = when (orient) {
                WallOrientation.HORIZONTAL -> Pair(0, i)
                WallOrientation.VERTICAL -> Pair(i, 0)
                WallOrientation.GRID -> Pair(i / cols.coerceAtLeast(1), i % cols.coerceAtLeast(1))
            }
            slotAssignments[i] = ScreenSlot(deviceIndex = i, row = row, col = col)
        }
    }

    fun broadcastRoleAssignments() {
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
                    videoHeight = videoHeight
                )
            )

            currentMediaUri?.let { uri ->
                client.sendMessage(
                    SyncMessage.PrepareMedia(
                        mediaUri = uri,
                        videoWidth = videoWidth,
                        videoHeight = videoHeight,
                        durationMs = 0L
                    )
                )
            }
        }
    }

    fun broadcastPlay(startPositionMs: Long, targetTimeEpochMs: Long, deviceOrientation: DeviceOrientation = this.deviceOrientation) {
        val message = SyncMessage.SchedulePlay(
            startPositionMs = startPositionMs,
            targetSystemTimeMs = targetTimeEpochMs,
            hostExecutionEpochMs = targetTimeEpochMs,
            deviceOrientation = deviceOrientation
        )
        connectedClients.forEach { it.sendMessage(message) }
    }

    fun broadcastSchedulePlay(startPositionMs: Long, executionDelayMs: Long = 500L): Long {
        val targetSystemTimeMs = SystemClock.elapsedRealtime() + executionDelayMs
        val message = SyncMessage.SchedulePlay(
            startPositionMs = startPositionMs,
            targetSystemTimeMs = targetSystemTimeMs,
            hostExecutionEpochMs = targetSystemTimeMs
        )
        connectedClients.forEach { client ->
            client.sendMessage(message)
        }
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
        } catch (e: Exception) {
            Log.e(tag, "Error closing server socket: ${e.message}")
        }
    }

    private inner class ClientHandler(private val socket: Socket) {
        private val writer: PrintWriter = PrintWriter(socket.getOutputStream(), true)
        private val reader: BufferedReader = BufferedReader(InputStreamReader(socket.getInputStream()))

        fun startListening() {
            serverScope.launch {
                try {
                    while (isActive && !socket.isClosed) {
                        val line = reader.readLine() ?: break
                        handleIncomingMessage(line)
                    }
                } catch (e: Exception) {
                    Log.w(tag, "Client connection lost: ${e.message}")
                } finally {
                    close()
                    connectedClients.remove(this@ClientHandler)
                    withContext(Dispatchers.Main) {
                        onClientDisconnected(connectedClients.size)
                    }
                    broadcastRoleAssignments()
                }
            }
        }

        private fun handleIncomingMessage(rawJson: String) {
            try {
                when (val message = ProtocolSerializer.deserialize(rawJson)) {
                    is SyncMessage.Ping -> {
                        val t1ServerReceived = SystemClock.elapsedRealtime()
                        val t2ServerSent = SystemClock.elapsedRealtime()
                        
                        val pong = SyncMessage.Pong(
                            t0ClientSent = message.t0ClientSent,
                            t1ServerReceived = t1ServerReceived,
                            t2ServerSent = t2ServerSent
                        )
                        sendMessage(pong)
                    }
                    is SyncMessage.Heartbeat -> {
                        onHeartbeatReceived(message)
                    }
                    else -> {
                        Log.d(tag, "Received message from client: $rawJson")
                    }
                }
            } catch (e: Exception) {
                Log.e(tag, "Error parsing client message: ${e.message}")
            }
        }

        fun sendMessage(message: SyncMessage) {
            serverScope.launch {
                try {
                    val json = ProtocolSerializer.serialize(message)
                    writer.print(json)
                    writer.flush()
                } catch (e: Exception) {
                    Log.e(tag, "Failed to send message to client: ${e.message}")
                }
            }
        }

        fun close() {
            try {
                socket.close()
                writer.close()
                reader.close()
            } catch (e: Exception) {
                // Ignore
            }
        }
    }
}
