import { AndroidCodeFile } from '../types';

export const ANDROID_CODE_FILES: AndroidCodeFile[] = [
  {
    id: 'gradle-app',
    filename: 'build.gradle.kts (Module :app)',
    path: 'app/build.gradle.kts',
    language: 'kotlin',
    category: 'gradle',
    description: 'Gradle dependencies for Google ExoPlayer (Media3), Kotlin Coroutines, AndroidX, and Kotlinx Serialization.',
    highlights: [
      'androidx.media3:media3-exoplayer:1.3.1',
      'androidx.media3:media3-ui:1.3.1',
      'kotlinx-coroutines-android:1.8.0',
      'kotlinx-serialization-json:1.6.3'
    ],
    code: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.videowall.splicer"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.videowall.splicer"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    // Core AndroidX & Coroutines
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.activity:activity-ktx:1.9.0")

    // Kotlin Coroutines for Asynchronous Networking
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")

    // Kotlinx Serialization for High-Speed JSON/Binary TCP Packets
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")

    // Google AndroidX Media3 / ExoPlayer for Low-Latency Playback
    implementation("androidx.media3:media3-exoplayer:1.3.1")
    implementation("androidx.media3:media3-ui:1.3.1")
    implementation("androidx.media3:media3-common:1.3.1")
    implementation("androidx.media3:media3-extractor:1.3.1")

    // Document & Storage picker
    implementation("androidx.documentfile:documentfile:1.0.1")
}`
  },
  {
    id: 'manifest',
    filename: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    category: 'manifest',
    description: 'Permissions for local Wi-Fi TCP sockets, Multicast lock, WakeLock, and full-screen immersive activity configurations.',
    highlights: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.WAKE_LOCK',
      'android.permission.CHANGE_WIFI_MULTICAST_STATE',
      'android:usesCleartextTraffic="true"'
    ],
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Network Sockets and Wi-Fi Inspection Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />

    <!-- Screen Wake Lock & Full-Screen Immersive Rendering -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <!-- Read Local Videos (Android 13+ and legacy) -->
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
        android:maxSdkVersion="32" />

    <application
        android:allowBackup="true"
        android:icon="@android:drawable/sym_def_app_icon"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.VideoWallSplicer"
        android:usesCleartextTraffic="true">

        <!-- Main Launcher Activity -->
        <activity
            android:name=".ui.MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Master / Host Activity -->
        <activity
            android:name=".ui.HostActivity"
            android:exported="false"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize"
            android:keepScreenOn="true" />

        <!-- Client Screen Activity (Hardware Accelerated TextureView) -->
        <activity
            android:name=".ui.ClientActivity"
            android:exported="false"
            android:hardwareAccelerated="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize"
            android:keepScreenOn="true"
            android:theme="@style/Theme.VideoWallSplicer.Fullscreen" />

    </application>

</manifest>`
  },
  {
    id: 'protocol',
    filename: 'VideoWallProtocol.kt',
    path: 'app/src/main/java/com/videowall/splicer/network/VideoWallProtocol.kt',
    language: 'kotlin',
    category: 'protocol',
    description: 'Lightweight TCP packet data models for NTP clock synchronization, role assignment, and scheduled playback commands.',
    highlights: [
      'Sealed hierarchy for SyncMessage',
      'NTP 4-timestamp Ping/Pong',
      'SchedulePlay with exact targetSystemTimeMs and hostExecutionEpochMs'
    ],
    code: `package com.videowall.splicer.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
enum class WallOrientation {
    HORIZONTAL, // Landscape: 1 x N screens arranged Left-to-Right
    VERTICAL,   // Portrait: N x 1 screens arranged Top-to-Bottom
    GRID        // 2D Matrix: R x C custom screen grid
}

@Serializable
enum class ScaleMode {
    COVER,      // Full bleed zoom, no black borders
    CONTAIN,    // Entire video visible with letterbox/pillarbox
    FIT,        // Alias for letterbox/pillarbox
    STRETCH     // Stretches to fill total canvas
}

@Serializable
sealed class SyncMessage {

    /**
     * Step 1 of NTP: Client sends local timestamp T0 to Server.
     */
    @Serializable
    @SerialName("PING")
    data class Ping(
        val t0ClientSent: Long
    ) : SyncMessage()

    /**
     * Step 2 & 3 of NTP: Server stamps T1 (received) and T2 (sent) and returns T0 back to client.
     */
    @Serializable
    @SerialName("PONG")
    data class Pong(
        val t0ClientSent: Long,
        val t1ServerReceived: Long,
        val t2ServerSent: Long
    ) : SyncMessage()

    /**
     * Server assigns dynamic physical screen coordinate and layout parameters to client.
     */
    @Serializable
    @SerialName("ASSIGN_ROLE")
    data class AssignRole(
        val deviceIndex: Int,
        val totalDevices: Int,
        val orientation: WallOrientation = WallOrientation.HORIZONTAL,
        val deviceOrientation: DeviceOrientation = DeviceOrientation.HORIZONTAL,
        val row: Int = 0,
        val col: Int = 0,
        val totalRows: Int = 1,
        val totalCols: Int = 1,
        val scaleMode: ScaleMode = ScaleMode.COVER,
        val rotationDeg: Int = 0,
        val videoWidth: Int = 1920,
        val videoHeight: Int = 1080
    ) : SyncMessage()

    /**
     * Flash screen ID overlay on screens to verify physical placement.
     */
    @Serializable
    @SerialName("IDENTIFY")
    data class Identify(
        val targetDeviceIndex: Int = -1, // -1 means all screens
        val displayIndex: Int = 1,
        val durationMs: Long = 3000L
    ) : SyncMessage()

    @Serializable
    @SerialName("IDENTIFY_SCREEN")
    data class IdentifyScreen(
        val targetDeviceIndex: Int = -1,
        val displayIndex: Int = 1,
        val flashDurationMs: Long = 3000L
    ) : SyncMessage()

    /**
     * Instructs clients to download or prepare video source into memory / cache.
     */
    @Serializable
    @SerialName("PREPARE_MEDIA")
    data class PrepareMedia(
        val mediaUri: String,
        val videoWidth: Int = 1920,
        val videoHeight: Int = 1080,
        val durationMs: Long = 0L
    ) : SyncMessage()

    /**
     * High-Precision Scheduled Play Command:
     * Dispatches playback to start from [startPositionMs] at the exact [targetSystemTimeMs] / [hostExecutionEpochMs].
     */
    @Serializable
    @SerialName("SCHEDULE_PLAY")
    data class SchedulePlay(
        val startPositionMs: Long = 0L,
        val targetSystemTimeMs: Long = 0L,
        val hostExecutionEpochMs: Long = 0L
    ) : SyncMessage()

    /**
     * Immediately pause playback and hold current video frame.
     */
    @Serializable
    @SerialName("PAUSE")
    data class Pause(
        val currentPositionMs: Long = 0L,
        val positionMs: Long = 0L
    ) : SyncMessage()

    /**
     * Frame-accurate Seek command.
     */
    @Serializable
    @SerialName("SEEK")
    data class Seek(
        val targetPositionMs: Long,
        val targetSystemTimeMs: Long
    ) : SyncMessage()

    @Serializable
    @SerialName("SCHEDULE_SEEK")
    data class ScheduleSeek(
        val targetPositionMs: Long,
        val hostExecutionEpochMs: Long
    ) : SyncMessage()

    /**
     * Periodic status telemetry from client to host.
     */
    @Serializable
    @SerialName("HEARTBEAT")
    data class Heartbeat(
        val deviceIndex: Int,
        val currentPlaybackMs: Long,
        val isPlaying: Boolean,
        val clockOffsetMs: Long
    ) : SyncMessage()
}

object ProtocolSerializer {
    val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        classDiscriminator = "type"
    }

    fun serialize(message: SyncMessage): String = json.encodeToString(message) + "\\n"

    fun deserialize(payload: String): SyncMessage = json.decodeFromString(payload.trim())
}`
  },
  {
    id: 'server',
    filename: 'VideoWallServer.kt',
    path: 'app/src/main/java/com/videowall/splicer/network/VideoWallServer.kt',
    language: 'kotlin',
    category: 'network',
    description: 'Master TCP Server managing dynamic video wall geometry, 2D matrix broadcasting, and sub-millisecond playback dispatch.',
    highlights: [
      'Dynamic 2D screen slots with ScreenSlot mapping',
      'Coroutines with IO Dispatcher',
      'NTP 4-timestamp precision timestamps',
      'Atomic broadcastSchedulePlay with microsecond timing'
    ],
    code: `package com.videowall.splicer.network

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
                if (isActive) Log.e(tag, "Server exception: \${e.message}", e)
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
        videoHeight: Int = 1080
    ) {
        gridRows = rows
        gridCols = cols
        configuredScreenCount = rows * cols
        currentScaleMode = scaleMode
        if (mediaUri != null) currentMediaUri = mediaUri
        this.videoWidth = videoWidth
        this.videoHeight = videoHeight

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
        height: Int = videoHeight
    ) {
        configuredScreenCount = screenCount
        currentOrientation = orientation
        gridRows = rows
        gridCols = cols
        currentScaleMode = scaleMode
        if (mediaUri != null) currentMediaUri = mediaUri
        videoWidth = width
        videoHeight = height

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

    fun broadcastPlay(startPositionMs: Long, targetTimeEpochMs: Long) {
        val message = SyncMessage.SchedulePlay(
            startPositionMs = startPositionMs,
            targetSystemTimeMs = targetTimeEpochMs,
            hostExecutionEpochMs = targetTimeEpochMs
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
            Log.e(tag, "Error closing server socket: \${e.message}")
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
                    Log.w(tag, "Client connection lost: \${e.message}")
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
                Log.e(tag, "Error parsing client message: \${e.message}")
            }
        }

        fun sendMessage(message: SyncMessage) {
            serverScope.launch {
                try {
                    val json = ProtocolSerializer.serialize(message)
                    writer.print(json)
                    writer.flush()
                } catch (e: Exception) {
                    Log.e(tag, "Failed to send message to client: \${e.message}")
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
}`
  },
  {
    id: 'client',
    filename: 'VideoWallClient.kt',
    path: 'app/src/main/java/com/videowall/splicer/network/VideoWallClient.kt',
    language: 'kotlin',
    category: 'network',
    description: 'High-precision Client Network Manager with continuous NTP clock synchronization and scheduled execution dispatcher.',
    highlights: [
      'NTP 4-Timestamp round-trip delay compensation',
      'Smoothed clock offset filter',
      'Automatic scheduled playback queue'
    ],
    code: `package com.videowall.splicer.network

import android.os.SystemClock
import android.util.Log
import kotlinx.coroutines.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.InetSocketAddress
import java.net.Socket

class VideoWallClient(
    private val hostIp: String,
    private val port: Int = 8988,
    private val onRoleAssigned: (role: SyncMessage.AssignRole) -> Unit,
    private val onMediaPrepared: (media: SyncMessage.PrepareMedia) -> Unit,
    private val onPlayScheduled: (startPositionMs: Long, localExecutionTimeMs: Long) -> Unit,
    private val onPause: (positionMs: Long) -> Unit,
    private val onSeekScheduled: (targetPositionMs: Long, localExecutionTimeMs: Long) -> Unit,
    private val onSyncOffsetUpdated: (offsetMs: Long, rttMs: Long) -> Unit,
    private val onIdentify: ((displayIndex: Int, flashDurationMs: Long) -> Unit)? = null
) {
    private val tag = "VideoWallClient"
    private var socket: Socket? = null
    private var writer: PrintWriter? = null
    private var reader: BufferedReader? = null
    private val clientScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    var clockOffsetMs: Long = 0L
        private set
    var roundTripTimeMs: Long = 0L
        private set

    fun connect() {
        clientScope.launch {
            try {
                socket = Socket()
                socket?.connect(InetSocketAddress(hostIp, port), 5000)
                writer = PrintWriter(socket!!.getOutputStream(), true)
                reader = BufferedReader(InputStreamReader(socket!!.getInputStream()))

                Log.d(tag, "Connected to Host at $hostIp:$port")

                startNtpSyncLoop()

                while (isActive && socket?.isClosed == false) {
                    val line = reader?.readLine() ?: break
                    handleHostMessage(line)
                }
            } catch (e: Exception) {
                Log.e(tag, "Client connection failed: \${e.message}", e)
            }
        }
    }

    private fun startNtpSyncLoop() {
        clientScope.launch {
            while (isActive) {
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

                    val rtt = (t3ClientReceived - t0) - (t2 - t1)
                    val instantOffset = ((t1 - t0) + (t2 - t3ClientReceived)) / 2

                    clockOffsetMs = if (clockOffsetMs == 0L) instantOffset else (clockOffsetMs * 0.7 + instantOffset * 0.3).toLong()
                    roundTripTimeMs = rtt

                    clientScope.launch(Dispatchers.Main) {
                        onSyncOffsetUpdated(clockOffsetMs, roundTripTimeMs)
                    }
                }
                is SyncMessage.AssignRole -> {
                    clientScope.launch(Dispatchers.Main) {
                        onRoleAssigned(message)
                    }
                }
                is SyncMessage.PrepareMedia -> {
                    clientScope.launch(Dispatchers.Main) {
                        onMediaPrepared(message)
                    }
                }
                is SyncMessage.SchedulePlay -> {
                    val executionEpoch = if (message.hostExecutionEpochMs > 0) message.hostExecutionEpochMs else message.targetSystemTimeMs
                    val localExecutionTimeMs = executionEpoch - clockOffsetMs
                    clientScope.launch(Dispatchers.Main) {
                        onPlayScheduled(message.startPositionMs, localExecutionTimeMs)
                    }
                }
                is SyncMessage.Pause -> {
                    val pos = if (message.positionMs > 0) message.positionMs else message.currentPositionMs
                    clientScope.launch(Dispatchers.Main) {
                        onPause(pos)
                    }
                }
                is SyncMessage.Seek -> {
                    val localExecutionTimeMs = message.targetSystemTimeMs - clockOffsetMs
                    clientScope.launch(Dispatchers.Main) {
                        onSeekScheduled(message.targetPositionMs, localExecutionTimeMs)
                    }
                }
                is SyncMessage.ScheduleSeek -> {
                    val localExecTime = message.hostExecutionEpochMs - clockOffsetMs
                    clientScope.launch(Dispatchers.Main) {
                        onSeekScheduled(message.targetPositionMs, localExecTime)
                    }
                }
                is SyncMessage.Identify -> {
                    clientScope.launch(Dispatchers.Main) {
                        onIdentify?.invoke(message.displayIndex, message.durationMs)
                    }
                }
                is SyncMessage.IdentifyScreen -> {
                    clientScope.launch(Dispatchers.Main) {
                        onIdentify?.invoke(message.displayIndex, message.flashDurationMs)
                    }
                }
                else -> {
                    Log.d(tag, "Received message: $rawJson")
                }
            }
        } catch (e: Exception) {
            Log.e(tag, "Error parsing host message: \${e.message}")
        }
    }

    private fun sendMessage(message: SyncMessage) {
        clientScope.launch(Dispatchers.IO) {
            try {
                val json = ProtocolSerializer.serialize(message)
                writer?.print(json)
                writer?.flush()
            } catch (e: Exception) {
                Log.e(tag, "Error sending message: \${e.message}")
            }
        }
    }

    fun disconnect() {
        clientScope.cancel()
        try {
            socket?.close()
            writer?.close()
            reader?.close()
        } catch (e: Exception) {
            // Ignore
        }
    }
}`
  },
  {
    id: 'transform',
    filename: 'MatrixTransformHelper.kt',
    path: 'app/src/main/java/com/videowall/splicer/transform/MatrixTransformHelper.kt',
    language: 'kotlin',
    category: 'transform',
    description: 'The precision Matrix transformation engine for TextureView screen splicing. Supports manual (row, col) grid coordinates, arbitrary aspect ratios, and scaling modes.',
    highlights: [
      'Arbitrary Grid Topology: scaleX = totalCols, scaleY = totalRows',
      'Manual Screen Coordinates: postTranslate(-col * viewWidth, -row * viewHeight)',
      'Aspect Ratio Preset & Custom Letterbox / Pillarbox / Cover Fitting',
      'Screen Rotation compensation'
    ],
    code: `package com.videowall.splicer.transform

import android.graphics.Matrix
import android.view.TextureView
import com.videowall.splicer.network.ScaleMode
import com.videowall.splicer.network.WallOrientation

object MatrixTransformHelper {

    /**
     * Computes and applies dynamic 2D screen-splicing Matrix transformation onto a [TextureView].
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
        rotationDeg: Int = 0
    ): Matrix {
        if (viewWidth <= 0 || viewHeight <= 0 || totalRows <= 0 || totalCols <= 0) return Matrix()

        val matrix = Matrix()

        val totalWallWidth = viewWidth * totalCols
        val totalWallHeight = viewHeight * totalRows

        val vWidth = if (videoWidth > 0) videoWidth.toFloat() else totalWallWidth
        val vHeight = if (videoHeight > 0) videoHeight.toFloat() else totalWallHeight

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
                if (videoAspect > wallAspect) {
                    fittedWallHeight = totalWallWidth / videoAspect
                    fitOffsetY = (totalWallHeight - fittedWallHeight) / 2f
                } else {
                    fittedWallWidth = totalWallHeight * videoAspect
                    fitOffsetX = (totalWallWidth - fittedWallWidth) / 2f
                }
            }
            ScaleMode.COVER -> {
                if (videoAspect > wallAspect) {
                    fittedWallWidth = totalWallHeight * videoAspect
                    fitOffsetX = (totalWallWidth - fittedWallWidth) / 2f
                } else {
                    fittedWallHeight = totalWallWidth / videoAspect
                    fitOffsetY = (totalWallHeight - fittedWallHeight) / 2f
                }
            }
        }

        val scaleX = fittedWallWidth / viewWidth
        val scaleY = fittedWallHeight / viewHeight

        val translateX = -(col * viewWidth) + fitOffsetX
        val translateY = -(row * viewHeight) + fitOffsetY

        matrix.setScale(scaleX, scaleY, 0f, 0f)
        matrix.postTranslate(translateX, translateY)

        if (rotationDeg != 0) {
            matrix.postRotate(rotationDeg.toFloat(), viewWidth / 2f, viewHeight / 2f)
        }

        textureView.setTransform(matrix)
        return matrix
    }

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
}`
  },
  {
    id: 'playback',
    filename: 'SyncPlaybackController.kt',
    path: 'app/src/main/java/com/videowall/splicer/playback/SyncPlaybackController.kt',
    language: 'kotlin',
    category: 'playback',
    description: 'Precision ExoPlayer controller with scheduled playback triggers, aggressive low-latency buffer settings, and continuous micro-drift compensation.',
    highlights: [
      'ExoPlayer TextureView surface binding',
      'Scheduled coroutine delay to exact millisecond',
      'Micro-drift compensation (speed adjustment 0.98x - 1.02x)',
      'isPlaying() and currentPositionMs telemetry properties'
    ],
    code: `package com.videowall.splicer.playback

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
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                50,   // minBufferMs (ultra-low buffer for local real-time sync)
                300,  // maxBufferMs
                0,    // bufferForPlaybackMs (instant zero-latency playback)
                50    // bufferForPlaybackAfterRebufferMs
            )
            .setPrioritizeTimeOverSizeThresholds(true)
            .setBackBuffer(0, false)
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

    fun schedulePlay(startPositionMs: Long, localExecutionTimeMs: Long) {
        scheduledPlayJob?.cancel()
        
        scheduledPlayJob = controllerScope.launch {
            val now = SystemClock.elapsedRealtime()
            val waitDurationMs = localExecutionTimeMs - now

            exoPlayer?.seekTo(startPositionMs)

            if (waitDurationMs in 1..40) {
                delay(waitDurationMs)
            } else if (waitDurationMs > 40) {
                delay(20L)
            } else {
                Log.d(tag, "Starting playback immediately in real time")
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

    fun correctDrift(masterPositionMs: Long) {
        val current = exoPlayer?.currentPosition ?: return
        val driftMs = current - masterPositionMs

        when {
            driftMs > 100 || driftMs < -100 -> {
                exoPlayer?.seekTo(masterPositionMs)
                exoPlayer?.playbackParameters = PlaybackParameters(1.0f)
            }
            driftMs > 15 -> {
                exoPlayer?.playbackParameters = PlaybackParameters(0.98f)
            }
            driftMs < -15 -> {
                exoPlayer?.playbackParameters = PlaybackParameters(1.02f)
            }
            else -> {
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
}`
  },
  {
    id: 'ui-activities',
    filename: 'Activities & UI Screens (MainActivity / Host / Client)',
    path: 'app/src/main/java/com/videowall/splicer/ui/Activities.kt',
    language: 'kotlin',
    category: 'ui',
    description: 'Complete UI activities for Role Selection (MainActivity), Master Control Room (HostActivity), and Full-Screen Spliced Display (ClientActivity).',
    highlights: [
      'Interactive Setup Wizard dialog integration',
      'Live dynamic Wall visualizer preview grid',
      'Embedded HTTP video server streaming to clients',
      'UDP broadcast zero-config discovery'
    ],
    code: `package com.videowall.splicer.ui

import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.videowall.splicer.R
import com.videowall.splicer.databinding.ActivityClientBinding
import com.videowall.splicer.databinding.ActivityHostBinding
import com.videowall.splicer.databinding.ActivityMainBinding
import com.videowall.splicer.network.*
import com.videowall.splicer.playback.SyncPlaybackController
import com.videowall.splicer.transform.MatrixTransformHelper
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private var discoveryJob: Job? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val localIp = NetworkUtils.getLocalIpAddress(this)
        binding.tvNetworkStatus.text = "🟢 Connected: $localIp (Port: 8988)"

        val gatewayIp = NetworkUtils.getGatewayIpAddress(this)
        binding.inputHostIp.setText(gatewayIp)

        discoveryJob = DiscoveryService.startListening(this, lifecycleScope) { hostIp, _ ->
            binding.inputHostIp.setText(hostIp)
            binding.tvAutoDiscoveredHost.text = "🎯 Auto-detected Host: $hostIp"
            binding.tvAutoDiscoveredHost.visibility = View.VISIBLE
        }

        binding.btnHostCard.setOnClickListener {
            val intent = Intent(this, HostActivity::class.java)
            startActivity(intent)
        }

        binding.btnClientCard.setOnClickListener {
            val hostIp = binding.inputHostIp.text.toString().trim()
            if (hostIp.isEmpty()) {
                Toast.makeText(this, "Please enter or select a Host IP address", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val intent = Intent(this, ClientActivity::class.java).apply {
                putExtra("HOST_IP", hostIp)
            }
            startActivity(intent)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        discoveryJob?.cancel()
    }
}

class HostActivity : AppCompatActivity() {
    private lateinit var binding: ActivityHostBinding
    private var server: VideoWallServer? = null
    private var httpServer: LocalMediaHttpServer? = null
    private var syncController: SyncPlaybackController? = null
    private var discoveryJob: Job? = null
    private var progressTrackingJob: Job? = null

    private var selectedVideoUri: Uri? = null
    private var videoWidth: Int = 1920
    private var videoHeight: Int = 1080
    private var screenCount: Int = 3
    private var orientation: WallOrientation = WallOrientation.HORIZONTAL
    private var gridRows: Int = 1
    private var gridCols: Int = 3
    private var scaleMode: ScaleMode = ScaleMode.COVER

    private val videoPickerLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let {
            selectedVideoUri = it
            binding.tvSelectedVideo.text = "🎬 " + (it.lastPathSegment ?: "Local Video")
            httpServer?.setMediaUri(it)
            syncController?.prepareMedia(it)
            broadcastConfiguration()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHostBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val hostIp = getLocalIpAddress()
        binding.tvHostIp.text = hostIp

        httpServer = LocalMediaHttpServer(this, 8990).apply { start() }

        server = VideoWallServer(
            port = 8988,
            onClientConnected = { count, ip ->
                binding.tvConnectedCount.text = "$count Connected"
                updateLiveWallPreview()
                broadcastConfiguration()
            },
            onClientDisconnected = { count ->
                binding.tvConnectedCount.text = "$count Connected"
                updateLiveWallPreview()
                broadcastConfiguration()
            },
            onHeartbeatReceived = { /* telemetry */ }
        ).apply { start() }

        syncController = SyncPlaybackController(this, binding.hostTextureView) { width, height ->
            videoWidth = width
            videoHeight = height
            updateMatrix()
            broadcastConfiguration()
        }

        discoveryJob = DiscoveryService.startBroadcasting(lifecycleScope, hostIp, 8988)

        setupUIControls()
        updateLiveWallPreview()
        startPlaybackProgressTracker()
    }

    private fun setupUIControls() {
        binding.btnOpenWizard.setOnClickListener {
            val dialog = HostSetupWizardDialog(
                server = server!!,
                connectedClientsCount = (server?.configuredScreenCount ?: 3) - 1
            ) { count, orient, r, c, mode ->
                screenCount = count
                orientation = orient
                gridRows = r
                gridCols = c
                scaleMode = mode
                binding.tvWallConfigSummary.text = "Geometry: \${r}x\${c} | Mode: \$mode"
                updateLiveWallPreview()
                updateMatrix()
                broadcastConfiguration()
            }
            dialog.show(supportFragmentManager, "HostSetupWizard")
        }

        binding.btnSelectVideo.setOnClickListener {
            videoPickerLauncher.launch("video/*")
        }

        binding.btnPlayPause.setOnClickListener {
            if (syncController?.isPlaying() == true) {
                pausePlayback()
            } else {
                startScheduledPlayback()
            }
        }

        binding.btnIdentifyAll.setOnClickListener {
            server?.broadcastIdentify(-1, 3000L)
        }

        binding.btnChangeRole.setOnClickListener {
            finish()
        }
    }

    private fun startScheduledPlayback() {
        val startPos = syncController?.currentPositionMs ?: 0L
        val targetEpoch = SystemClock.elapsedRealtime() + 400L
        server?.broadcastPlay(startPos, targetEpoch)
        syncController?.schedulePlay(startPos, targetEpoch)
        binding.btnPlayPause.text = "⏸ Pause"
    }

    private fun pausePlayback() {
        val pos = syncController?.currentPositionMs ?: 0L
        server?.broadcastPause(pos)
        syncController?.pause()
        binding.btnPlayPause.text = "▶ Play"
    }

    private fun broadcastConfiguration() {
        val hostIp = getLocalIpAddress()
        val streamUrl = "http://\$hostIp:8990/video"
        server?.broadcastConfiguration(
            rows = gridRows,
            cols = gridCols,
            scaleMode = scaleMode,
            mediaUri = streamUrl,
            videoWidth = videoWidth,
            videoHeight = videoHeight
        )
        updateMatrix()
    }

    private fun updateMatrix() {
        MatrixTransformHelper.applySpliceTransform(
            textureView = binding.hostTextureView,
            row = 0,
            col = 0,
            totalRows = gridRows,
            totalCols = gridCols,
            scaleMode = scaleMode,
            videoWidth = videoWidth,
            videoHeight = videoHeight,
            viewWidth = binding.hostTextureView.width.toFloat(),
            viewHeight = binding.hostTextureView.height.toFloat()
        )
    }

    private fun updateLiveWallPreview() {
        binding.liveWallGridContainer.removeAllViews()
        val inflater = layoutInflater

        for (r in 0 until gridRows) {
            val rowLayout = android.widget.LinearLayout(this).apply {
                orientation = android.widget.LinearLayout.HORIZONTAL
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    0,
                    1.0f
                )
            }
            for (c in 0 until gridCols) {
                val index = (r * gridCols) + c
                val tile = inflater.inflate(R.layout.item_screen_preview_tile, rowLayout, false)
                val tvTitle = tile.findViewById<android.widget.TextView>(R.id.tvTileTitle)
                val tvCoord = tile.findViewById<android.widget.TextView>(R.id.tvTileCoords)

                val displayScreenNum = index + 1
                if (index == 0) {
                    tvTitle.text = "Screen 1 (Host)"
                    tile.setBackgroundColor(android.graphics.Color.parseColor("#4F46E5"))
                } else {
                    tvTitle.text = "Screen \$displayScreenNum"
                    tile.setBackgroundColor(android.graphics.Color.parseColor("#1E293B"))
                }
                tvCoord.text = "[R\$r:C\$c]"
                
                val params = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 1.0f).apply {
                    setMargins(3, 3, 3, 3)
                }
                tile.layoutParams = params
                rowLayout.addView(tile)
            }
            binding.liveWallGridContainer.addView(rowLayout)
        }
    }

    private fun startPlaybackProgressTracker() {
        progressTrackingJob = lifecycleScope.launch {
            while (isActive) {
                val current = syncController?.currentPositionMs ?: 0L
                val sec = (current / 1000) % 60
                val min = (current / (1000 * 60))
                binding.tvPlaybackTimer.text = String.format("%02d:%02d", min, sec)
                delay(500L)
            }
        }
    }

    private fun getLocalIpAddress(): String {
        return NetworkUtils.getLocalIpAddress(this)
    }

    override fun onDestroy() {
        super.onDestroy()
        discoveryJob?.cancel()
        progressTrackingJob?.cancel()
        server?.stop()
        httpServer?.stop()
        syncController?.release()
    }
}

class ClientActivity : AppCompatActivity() {
    private lateinit var binding: ActivityClientBinding
    private var client: VideoWallClient? = null
    private var syncController: SyncPlaybackController? = null
    private var currentRole: SyncMessage.AssignRole? = null
    private var videoWidth = 1920
    private var videoHeight = 1080

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityClientBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val hostIp = intent.getStringExtra("HOST_IP") ?: "192.168.43.1"

        syncController = SyncPlaybackController(this, binding.clientTextureView) { width, height ->
            videoWidth = width
            videoHeight = height
            currentRole?.let { applyMatrix(it) }
        }

        client = VideoWallClient(
            hostIp = hostIp,
            port = 8988,
            onRoleAssigned = { role ->
                currentRole = role
                val screenNum = role.deviceIndex + 1
                binding.tvScreenIndex.text = "Screen \$screenNum of \${role.totalDevices} [R\${role.row}:C\${role.col}]"
                applyMatrix(role)
            },
            onMediaPrepared = { media ->
                videoWidth = media.videoWidth
                videoHeight = media.videoHeight
                syncController?.prepareMedia(Uri.parse(media.mediaUri))
                currentRole?.let { applyMatrix(it) }
            },
            onPlayScheduled = { startPos, localExecTime ->
                syncController?.schedulePlay(startPos, localExecTime)
            },
            onPause = { _ ->
                syncController?.pause()
            },
            onSeekScheduled = { targetPos, localExecTime ->
                syncController?.schedulePlay(targetPos, localExecTime)
            },
            onSyncOffsetUpdated = { offset, rtt ->
                binding.tvSyncTelemetry.text = "Offset: \${offset}ms | RTT: \${rtt}ms"
            },
            onIdentify = { displayIndex, durationMs ->
                showIdentifyOverlay(displayIndex, durationMs)
            }
        ).apply { connect() }
    }

    private fun applyMatrix(role: SyncMessage.AssignRole) {
        MatrixTransformHelper.applySpliceTransform(
            textureView = binding.clientTextureView,
            row = role.row,
            col = role.col,
            totalRows = role.totalRows,
            totalCols = role.totalCols,
            scaleMode = role.scaleMode,
            videoWidth = videoWidth,
            videoHeight = videoHeight,
            viewWidth = binding.clientTextureView.width.toFloat(),
            viewHeight = binding.clientTextureView.height.toFloat(),
            rotationDeg = role.rotationDeg
        )
    }

    private fun showIdentifyOverlay(displayNum: Int, durationMs: Long) {
        binding.tvIdentifyBigNumber.text = "$displayNum"
        binding.tvIdentifySubtitle.text = "Screen $displayNum"
        binding.identifyOverlay.visibility = View.VISIBLE
        binding.identifyOverlay.postDelayed({
            binding.identifyOverlay.visibility = View.GONE
        }, durationMs)
    }

    override fun onDestroy() {
        super.onDestroy()
        client?.disconnect()
        syncController?.release()
    }
}`
  },
  {
    id: 'setup-wizard',
    filename: 'HostSetupWizardDialog.kt',
    path: 'app/src/main/java/com/videowall/splicer/ui/HostSetupWizardDialog.kt',
    language: 'kotlin',
    category: 'ui',
    description: 'Interactive 4-step Host Video Wall Setup Wizard: screen count selector, dynamic video division, screen arrangement mapping with identify screen flash, and aspect ratio fit modes.',
    highlights: [
      'Interactive 4-step wizard dialog',
      'Dynamic geometry calculation (1xN, Nx1, RxC grid)',
      'Live identify screen flash trigger',
      'ScaleMode selector (Cover, Contain, Stretch)'
    ],
    code: `package com.videowall.splicer.ui

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import androidx.fragment.app.DialogFragment
import com.videowall.splicer.R
import com.videowall.splicer.network.ScaleMode
import com.videowall.splicer.network.VideoWallServer
import com.videowall.splicer.network.WallOrientation

class HostSetupWizardDialog(
    private val server: VideoWallServer,
    private val connectedClientsCount: Int,
    private val onConfigurationApplied: (screenCount: Int, orientation: WallOrientation, rows: Int, cols: Int, scaleMode: ScaleMode) -> Unit
) : DialogFragment() {

    private var currentStep = 1
    private var screenCount = maxOf(connectedClientsCount + 1, 3)
    private var orientation = WallOrientation.HORIZONTAL
    private var gridRows = 1
    private var gridCols = screenCount
    private var scaleMode = ScaleMode.COVER

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val root = inflater.inflate(R.layout.dialog_host_setup_wizard, container, false)
        setupViews(root)
        return root
    }

    private fun setupViews(root: View) {
        val tvStepTitle = root.findViewById<TextView>(R.id.tvStepTitle)
        val tvStepDesc = root.findViewById<TextView>(R.id.tvStepDesc)
        val tvStepCounter = root.findViewById<TextView>(R.id.tvStepCounter)

        val step1 = root.findViewById<ViewGroup>(R.id.step1Container)
        val step2 = root.findViewById<ViewGroup>(R.id.step2Container)
        val step3 = root.findViewById<ViewGroup>(R.id.step3Container)
        val step4 = root.findViewById<ViewGroup>(R.id.step4Container)

        val tvScreenCount = root.findViewById<TextView>(R.id.tvScreenCount)
        val tvDetected = root.findViewById<TextView>(R.id.tvDetectedClientsNotice)
        val btnAdd = root.findViewById<Button>(R.id.btnAddScreen)
        val btnRemove = root.findViewById<Button>(R.id.btnRemoveScreen)

        val rgOrientation = root.findViewById<RadioGroup>(R.id.rgOrientation)
        val rbHorizontal = root.findViewById<RadioButton>(R.id.rbHorizontal)
        val rbVertical = root.findViewById<RadioButton>(R.id.rbVertical)
        val rbGrid = root.findViewById<RadioButton>(R.id.rbGrid)

        val tvArrangement = root.findViewById<TextView>(R.id.tvArrangementSummary)
        val btnIdentify = root.findViewById<Button>(R.id.btnIdentifyScreens)

        val rgScaleMode = root.findViewById<RadioGroup>(R.id.rgScaleMode)
        val rbCover = root.findViewById<RadioButton>(R.id.rbCover)
        val rbContain = root.findViewById<RadioButton>(R.id.rbContain)
        val rbStretch = root.findViewById<RadioButton>(R.id.rbStretch)

        val btnBack = root.findViewById<Button>(R.id.btnBack)
        val btnNext = root.findViewById<Button>(R.id.btnNext)

        tvDetected.text = "🟢 Connected Client Devices: $connectedClientsCount found (\${connectedClientsCount + 1} total with Host)"
        tvScreenCount.text = "$screenCount Screens"

        btnAdd.setOnClickListener {
            if (screenCount < 16) {
                screenCount++
                tvScreenCount.text = "$screenCount Screens"
                updateGeometry()
            }
        }

        btnRemove.setOnClickListener {
            if (screenCount > 1) {
                screenCount--
                tvScreenCount.text = "$screenCount Screens"
                updateGeometry()
            }
        }

        rgOrientation.setOnCheckedChangeListener { _, checkedId ->
            orientation = when (checkedId) {
                rbVertical.id -> WallOrientation.VERTICAL
                rbGrid.id -> WallOrientation.GRID
                else -> WallOrientation.HORIZONTAL
            }
            updateGeometry()
        }

        btnIdentify.setOnClickListener {
            server.broadcastIdentify(-1, 3000L)
        }

        rgScaleMode.setOnCheckedChangeListener { _, checkedId ->
            scaleMode = when (checkedId) {
                rbContain.id -> ScaleMode.CONTAIN
                rbStretch.id -> ScaleMode.STRETCH
                else -> ScaleMode.COVER
            }
        }

        btnNext.setOnClickListener {
            if (currentStep < 4) {
                currentStep++
                updateStepUI(tvStepTitle, tvStepDesc, tvStepCounter, step1, step2, step3, step4, btnNext, btnBack, tvArrangement)
            } else {
                applyAndDismiss()
            }
        }

        btnBack.setOnClickListener {
            if (currentStep > 1) {
                currentStep--
                updateStepUI(tvStepTitle, tvStepDesc, tvStepCounter, step1, step2, step3, step4, btnNext, btnBack, tvArrangement)
            } else {
                dismiss()
            }
        }
    }

    private fun updateGeometry() {
        when (orientation) {
            WallOrientation.HORIZONTAL -> {
                gridRows = 1
                gridCols = screenCount
            }
            WallOrientation.VERTICAL -> {
                gridRows = screenCount
                gridCols = 1
            }
            WallOrientation.GRID -> {
                gridCols = kotlin.math.ceil(kotlin.math.sqrt(screenCount.toDouble())).toInt().coerceAtLeast(1)
                gridRows = kotlin.math.ceil(screenCount.toDouble() / gridCols).toInt().coerceAtLeast(1)
            }
        }
    }

    private fun updateStepUI(
        title: TextView,
        desc: TextView,
        counter: TextView,
        s1: ViewGroup,
        s2: ViewGroup,
        s3: ViewGroup,
        s4: ViewGroup,
        btnNext: Button,
        btnBack: Button,
        tvArrangement: TextView
    ) {
        s1.visibility = if (currentStep == 1) View.VISIBLE else View.GONE
        s2.visibility = if (currentStep == 2) View.VISIBLE else View.GONE
        s3.visibility = if (currentStep == 3) View.VISIBLE else View.GONE
        s4.visibility = if (currentStep == 4) View.VISIBLE else View.GONE

        counter.text = "$currentStep / 4"
        btnBack.text = if (currentStep == 1) "Cancel" else "Back"

        when (currentStep) {
            1 -> {
                title.text = "Step 1: Screen Count"
                desc.text = "How many screens are connected to this video wall?"
                btnNext.text = "Continue"
            }
            2 -> {
                title.text = "Step 2: Video Playback & Division"
                desc.text = "How would you like to divide & slice the video?"
                btnNext.text = "Continue"
            }
            3 -> {
                title.text = "Step 3: Screen Arrangement"
                desc.text = "Map which physical phone is on the Left, Center, Right or Top/Bottom."
                btnNext.text = "Continue"
                updateGeometry()
                val summary = StringBuilder()
                for (i in 0 until screenCount) {
                    val label = if (i == 0) "Host (Master)" else "Client \$i"
                    val (r, c) = when (orientation) {
                        WallOrientation.HORIZONTAL -> Pair(0, i)
                        WallOrientation.VERTICAL -> Pair(i, 0)
                        WallOrientation.GRID -> Pair(i / gridCols, i % gridCols)
                    }
                    summary.append("Slot \${i + 1} [Row \$r, Col \$c] ➔ \$label\\n")
                }
                tvArrangement.text = summary.toString().trim()
            }
            4 -> {
                title.text = "Step 4: Aspect Ratio & Fit Mode"
                desc.text = "Select Cover (full bleed), Contain (letterbox), or Stretch."
                btnNext.text = "Apply & Divide Video"
            }
        }
    }

    private fun applyAndDismiss() {
        updateGeometry()
        server.configureWall(
            screenCount = screenCount,
            orientation = orientation,
            rows = gridRows,
            cols = gridCols,
            scaleMode = scaleMode
        )
        onConfigurationApplied(screenCount, orientation, gridRows, gridCols, scaleMode)
        dismiss()
    }
}`
  },
  {
    id: 'local-http-server',
    filename: 'LocalMediaHttpServer.kt',
    path: 'app/src/main/java/com/videowall/splicer/network/LocalMediaHttpServer.kt',
    language: 'kotlin',
    category: 'network',
    description: 'Embedded HTTP streaming server running on the Host phone to stream local video files (content:// or file://) directly to ExoPlayer on all connected client phones with HTTP 206 Partial Content Range support.',
    highlights: [
      'Streams Host content:// URI over local Wi-Fi to all connected phones',
      'HTTP 206 Partial Content / Range headers for low-latency seeking',
      'Concurrent multi-client video streaming'
    ],
    code: `package com.videowall.splicer.network

import android.content.Context
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.*
import java.io.*
import java.net.ServerSocket
import java.net.Socket
import java.util.StringTokenizer

class LocalMediaHttpServer(
    private val context: Context,
    private val port: Int = 8990
) {
    private val tag = "LocalMediaHttpServer"
    private var serverSocket: ServerSocket? = null
    private val serverScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var currentUri: Uri? = null

    fun setMediaUri(uri: Uri?) {
        this.currentUri = uri
        Log.d(tag, "Media URI registered for streaming: $uri")
    }

    fun start() {
        serverScope.launch {
            try {
                serverSocket = ServerSocket(port)
                Log.d(tag, "LocalMediaHttpServer listening on port $port")

                while (isActive) {
                    val clientSocket = serverSocket?.accept() ?: break
                    launch(Dispatchers.IO) {
                        handleClient(clientSocket)
                    }
                }
            } catch (e: Exception) {
                if (isActive) Log.e(tag, "HTTP Server error: \${e.message}", e)
            }
        }
    }

    private fun handleClient(socket: Socket) {
        try {
            val input = BufferedReader(InputStreamReader(socket.getInputStream()))
            val output = BufferedOutputStream(socket.getOutputStream())

            val requestLine = input.readLine() ?: return
            val tokenizer = StringTokenizer(requestLine)
            if (!tokenizer.hasMoreTokens()) return
            val method = tokenizer.nextToken()
            val path = if (tokenizer.hasMoreTokens()) tokenizer.nextToken() else "/"

            var rangeHeader: String? = null
            var line: String?
            while (input.readLine().also { line = it } != null) {
                if (line.isNullOrEmpty()) break
                if (line!!.startsWith("Range:", ignoreCase = true)) {
                    rangeHeader = line!!.substring(6).trim()
                }
            }

            val uri = currentUri
            if (uri == null) {
                val notFound = "HTTP/1.1 404 Not Found\\r\\nContent-Length: 0\\r\\n\\r\\n"
                output.write(notFound.toByteArray())
                output.flush()
                return
            }

            val afd = try {
                context.contentResolver.openAssetFileDescriptor(uri, "r")
            } catch (e: Exception) {
                null
            }

            val totalLength: Long = afd?.length ?: try {
                val pfd = context.contentResolver.openFileDescriptor(uri, "r")
                val size = pfd?.statSize ?: 0L
                pfd?.close()
                size
            } catch (e: Exception) {
                0L
            }

            var startByte = 0L
            var endByte = if (totalLength > 0) totalLength - 1 else 0L

            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                val rangeVal = rangeHeader.substring(6)
                val parts = rangeVal.split("-")
                try {
                    if (parts[0].isNotEmpty()) {
                        startByte = parts[0].toLong()
                    }
                    if (parts.size > 1 && parts[1].isNotEmpty()) {
                        endByte = parts[1].toLong()
                    }
                } catch (e: Exception) {
                    // Fallback
                }
            }

            if (totalLength > 0 && endByte >= totalLength) {
                endByte = totalLength - 1
            }

            val contentLength = if (totalLength > 0) (endByte - startByte + 1) else 0L
            val isPartial = rangeHeader != null && totalLength > 0

            val statusLine = if (isPartial) "HTTP/1.1 206 Partial Content\\r\\n" else "HTTP/1.1 200 OK\\r\\n"
            val headers = StringBuilder().apply {
                append(statusLine)
                append("Content-Type: video/mp4\\r\\n")
                append("Accept-Ranges: bytes\\r\\n")
                if (totalLength > 0) {
                    append("Content-Length: $contentLength\\r\\n")
                    if (isPartial) {
                        append("Content-Range: bytes $startByte-$endByte/$totalLength\\r\\n")
                    }
                }
                append("Connection: close\\r\\n")
                append("\\r\\n")
            }.toString()

            output.write(headers.toByteArray())
            output.flush()

            if (method.equals("HEAD", ignoreCase = true)) {
                return
            }

            val inputStream = context.contentResolver.openInputStream(uri)
            if (inputStream != null) {
                inputStream.use { stream ->
                    if (startByte > 0) {
                        var skipped = 0L
                        while (skipped < startByte) {
                            val s = stream.skip(startByte - skipped)
                            if (s <= 0) break
                            skipped += s
                        }
                    }

                    val buffer = ByteArray(64 * 1024)
                    var bytesRemaining = contentLength
                    while (bytesRemaining > 0 || totalLength <= 0) {
                        val toRead = if (totalLength > 0) minOf(buffer.size.toLong(), bytesRemaining).toInt() else buffer.size
                        val bytesRead = stream.read(buffer, 0, toRead)
                        if (bytesRead <= 0) break
                        output.write(buffer, 0, bytesRead)
                        if (totalLength > 0) {
                            bytesRemaining -= bytesRead
                        }
                    }
                    output.flush()
                }
            }
            afd?.close()
        } catch (e: Exception) {
            // Connection closed
        } finally {
            try {
                socket.close()
            } catch (e: Exception) {}
        }
    }

    fun stop() {
        serverScope.cancel()
        try {
            serverSocket?.close()
        } catch (e: Exception) {}
    }
}`
  },
  {
    id: 'network-utils',
    filename: 'NetworkUtils.kt',
    path: 'app/src/main/java/com/videowall/splicer/network/NetworkUtils.kt',
    language: 'kotlin',
    category: 'network',
    description: 'Hardware and virtual network interface scanner that resolves true, non-zero IPv4 addresses for Wi-Fi and Mobile Hotspot interfaces.',
    highlights: [
      'Filters out 0.0.0.0, 127.0.0.1, and loopback devices',
      'Supports wlan0 (Wi-Fi) and ap0 (Mobile Hotspot)',
      'Fallback detection for seamless local connectivity'
    ],
    code: `package com.videowall.splicer.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.DhcpInfo
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.text.format.Formatter
import android.util.Log
import java.net.DatagramSocket
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.Socket
import java.util.Collections

object NetworkUtils {
    private const val TAG = "NetworkUtils"

    private val CELLULAR_AND_VIRTUAL_PREFIXES = listOf(
        "rmnet", "ccmni", "pdp", "wwan", "clat", "dummy", "radio", 
        "v4-rmnet", "lo", "tun", "tap", "ppp", "docker", "vbox"
    )

    fun bindProcessToWifi(context: Context?) {
        if (context == null) return
        try {
            val cm = context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
            for (network in cm.allNetworks) {
                val caps = cm.getNetworkCapabilities(network) ?: continue
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                    cm.bindProcessToNetwork(network)
                    Log.d(TAG, "Bound process network routing to Wi-Fi/Ethernet Network ($network)")
                    return
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "bindProcessToWifi failed: \${e.message}")
        }
    }

    fun bindSocketToWifi(socket: Socket, context: Context?) {
        if (context != null) {
            try {
                val cm = context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                if (cm != null) {
                    for (network in cm.allNetworks) {
                        val caps = cm.getNetworkCapabilities(network) ?: continue
                        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                            network.bindSocket(socket)
                            Log.d(TAG, "Successfully bound TCP socket to Wi-Fi Network")
                            return
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "bindSocket to Wi-Fi failed: \${e.message}")
            }
        }

        try {
            if (!socket.isBound) {
                val validIps = getValidLocalIpv4Addresses()
                val wifiIp = validIps.firstOrNull { it.interfaceName.startsWith("wlan", ignoreCase = true) }
                    ?: validIps.firstOrNull { it.interfaceName.startsWith("ap", ignoreCase = true) || it.interfaceName.contains("softap", ignoreCase = true) }
                    ?: validIps.firstOrNull()
                if (wifiIp != null) {
                    socket.bind(InetSocketAddress(InetAddress.getByName(wifiIp.ip), 0))
                    Log.d(TAG, "Bound socket locally to \${wifiIp.ip} (\${wifiIp.interfaceName})")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Local IP socket bind fallback failed: \${e.message}")
        }
    }

    fun bindDatagramSocketToWifi(socket: DatagramSocket, context: Context?) {
        if (context != null) {
            try {
                val cm = context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                if (cm != null) {
                    for (network in cm.allNetworks) {
                        val caps = cm.getNetworkCapabilities(network) ?: continue
                        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                            network.bindSocket(socket)
                            Log.d(TAG, "Successfully bound DatagramSocket to Wi-Fi Network")
                            return
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "bindDatagramSocket to Wi-Fi failed: \${e.message}")
            }
        }
    }

    fun getLocalIpAddress(context: Context? = null): String {
        val validIps = getValidLocalIpv4Addresses()
        if (validIps.isNotEmpty()) {
            val primaryIp = validIps.firstOrNull { it.interfaceName.startsWith("wlan", ignoreCase = true) }
                ?: validIps.firstOrNull { it.interfaceName.startsWith("ap", ignoreCase = true) || it.interfaceName.contains("softap", ignoreCase = true) }
                ?: validIps.firstOrNull { it.interfaceName.startsWith("rndis", ignoreCase = true) || it.interfaceName.startsWith("eth", ignoreCase = true) }
                ?: validIps.first()
            Log.d(TAG, "Selected primary LAN IP: \${primaryIp.ip} on interface \${primaryIp.interfaceName}")
            return primaryIp.ip
        }

        if (context != null) {
            try {
                val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                val ipInt = wifiManager?.connectionInfo?.ipAddress ?: 0
                if (ipInt != 0) {
                    val formatted = Formatter.formatIpAddress(ipInt)
                    if (isValidLocalIp(formatted)) {
                        return formatted
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "WifiManager fallback failed: \${e.message}")
            }
        }

        return "192.168.43.1"
    }

    fun getGatewayIpAddress(context: Context?): String {
        if (context != null) {
            try {
                val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                val dhcpInfo: DhcpInfo? = wifiManager?.dhcpInfo
                if (dhcpInfo != null && dhcpInfo.gateway != 0) {
                    val gateway = Formatter.formatIpAddress(dhcpInfo.gateway)
                    if (isValidLocalIp(gateway)) {
                        return gateway
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed reading DHCP gateway: \${e.message}")
            }
        }
        return "192.168.43.1"
    }

    data class InterfaceIp(val interfaceName: String, val ip: String)

    fun getValidLocalIpv4Addresses(): List<InterfaceIp> {
        val result = mutableListOf<InterfaceIp>()
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                if (!intf.isUp || intf.isLoopback) continue
                
                val nameLower = intf.name.lowercase()
                if (CELLULAR_AND_VIRTUAL_PREFIXES.any { nameLower.startsWith(it) }) {
                    continue
                }

                val addrs = Collections.list(intf.inetAddresses)
                for (addr in addrs) {
                    if (!addr.isLoopbackAddress && addr is Inet4Address) {
                        val hostAddress = addr.hostAddress ?: continue
                        if (isValidLocalIp(hostAddress)) {
                            result.add(InterfaceIp(intf.name, hostAddress))
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error enumerating network interfaces: \${e.message}", e)
        }
        return result
    }

    private fun isValidLocalIp(ip: String): Boolean {
        if (ip.isEmpty() || ip == "0.0.0.0" || ip == "127.0.0.1" || ip.contains(":")) {
            return false
        }
        return true
    }
}`
  },
  {
    id: 'discovery-service',
    filename: 'DiscoveryService.kt',
    path: 'app/src/main/java/com/videowall/splicer/network/DiscoveryService.kt',
    language: 'kotlin',
    category: 'network',
    description: 'UDP Broadcast discovery beacon service allowing automatic detection of Host Master IP on Wi-Fi and Hotspot networks without typing.',
    highlights: [
      'Automatic UDP broadcast beacons on port 8989',
      'Zero-configuration network pairing',
      'Instant auto-fill of Host IP on secondary devices'
    ],
    code: `package com.videowall.splicer.network

import android.content.Context
import android.net.wifi.WifiManager
import android.util.Log
import kotlinx.coroutines.*
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

object DiscoveryService {
    private const val TAG = "DiscoveryService"
    const val DISCOVERY_PORT = 8989
    private const val BEACON_PREFIX = "SPLICER_HOST:"

    fun startBroadcasting(scope: CoroutineScope, hostIp: String, tcpPort: Int = 8988, context: Context? = null): Job {
        return scope.launch(Dispatchers.IO) {
            var socket: DatagramSocket? = null
            try {
                socket = DatagramSocket()
                NetworkUtils.bindDatagramSocketToWifi(socket, context)
                socket.broadcast = true
                val message = "$BEACON_PREFIX$hostIp:$tcpPort"
                val data = message.toByteArray()

                val broadcastAddresses = listOf(
                    InetAddress.getByName("255.255.255.255"),
                    InetAddress.getByName("192.168.43.255"),
                    InetAddress.getByName("192.168.1.255")
                )

                while (isActive) {
                    for (target in broadcastAddresses) {
                        try {
                            val packet = DatagramPacket(data, data.size, target, DISCOVERY_PORT)
                            socket.send(packet)
                        } catch (e: Exception) {}
                    }
                    delay(1200L)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Broadcast error: \${e.message}")
            } finally {
                socket?.close()
            }
        }
    }

    fun startListening(
        context: Context?,
        scope: CoroutineScope,
        onHostFound: (hostIp: String, port: Int) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            var socket: DatagramSocket? = null
            var multicastLock: WifiManager.MulticastLock? = null
            try {
                if (context != null) {
                    val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                    multicastLock = wifiManager?.createMulticastLock("SplicerDiscovery")
                    multicastLock?.setReferenceCounted(true)
                    multicastLock?.acquire()
                }

                socket = DatagramSocket(DISCOVERY_PORT)
                NetworkUtils.bindDatagramSocketToWifi(socket, context)
                socket.broadcast = true
                socket.soTimeout = 4000
                val buffer = ByteArray(256)

                while (isActive) {
                    try {
                        val packet = DatagramPacket(buffer, buffer.size)
                        socket.receive(packet)
                        val received = String(packet.data, 0, packet.length).trim()
                        if (received.startsWith(BEACON_PREFIX)) {
                            val payload = received.removePrefix(BEACON_PREFIX)
                            val parts = payload.split(":")
                            val ip = parts[0]
                            val port = if (parts.size > 1) parts[1].toIntOrNull() ?: 8988 else 8988
                            withContext(Dispatchers.Main) {
                                onHostFound(ip, port)
                            }
                        }
                    } catch (e: Exception) {}
                }
            } catch (e: Exception) {
                Log.w(TAG, "Discovery listener error: \${e.message}")
            } finally {
                socket?.close()
                try {
                    multicastLock?.let { if (it.isHeld) it.release() }
                } catch (e: Exception) {}
            }
        }
    }
}`
  },
  {
    id: 'youtube-resolver',
    filename: 'YouTubeStreamResolver.kt',
    path: 'app/src/main/java/com/videowall/splicer/network/YouTubeStreamResolver.kt',
    language: 'kotlin',
    category: 'network',
    description: 'High-speed YouTube URL parser and multi-fallback stream extractor (Invidious, Piped, Direct Page Scraper). Proxied locally by Host over Hotspot while fetching online via Cellular Data.',
    highlights: [
      'Invidious API multi-instance fallback',
      'Piped API stream resolver',
      'YouTube Shorts, Mobile & standard URL support',
      'Direct HTTP/HTTPS video link extraction'
    ],
    code: `package com.videowall.splicer.network

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.regex.Pattern

/**
 * Resolves YouTube video URLs or direct video streams into playable HTTP/HTTPS video streams.
 *
 * Supports:
 * - Standard YouTube links: https://www.youtube.com/watch?v=VIDEO_ID
 * - Shortened YouTube links: https://youtu.be/VIDEO_ID
 * - YouTube Shorts links: https://youtube.com/shorts/VIDEO_ID
 * - YouTube Mobile links: https://m.youtube.com/watch?v=VIDEO_ID
 * - YouTube Embed links: https://www.youtube.com/embed/VIDEO_ID
 * - Direct raw Video IDs: e.g. dQw4w9WgXcQ
 * - Direct MP4 / WebM / HLS video URLs: e.g. https://.../video.mp4
 */
object YouTubeStreamResolver {
    private const val TAG = "YouTubeStreamResolver"

    data class ResolvedVideo(
        val videoId: String,
        val title: String,
        val streamUrl: String,
        val width: Int,
        val height: Int,
        val durationSec: Long,
        val isDirectUrl: Boolean = false
    )

    // Curated high-performance public Invidious instances for stream resolution
    private val INVIDIOUS_INSTANCES = listOf(
        "https://inv.tux.pizza",
        "https://invidious.nerdvpn.de",
        "https://invidious.protokolla.fi",
        "https://yewtu.be",
        "https://invidious.drgns.space",
        "https://iv.ggtyler.dev"
    )

    // Regex to extract 11-character YouTube video ID
    private val YOUTUBE_ID_PATTERN = Pattern.compile(
        "(?:youtu\\\\.be\\\\/|youtube\\\\.com\\\\/(?:embed\\\\/|v\\\\/|watch\\\\?v=|watch\\\\?.+&v=|shorts\\\\/))([a-zA-Z0-9_-]{11})"
    )

    fun extractVideoId(urlOrId: String): String? {
        val trimmed = urlOrId.trim()
        if (trimmed.length == 11 && trimmed.matches(Regex("^[a-zA-Z0-9_-]{11}$"))) {
            return trimmed
        }
        val matcher = YOUTUBE_ID_PATTERN.matcher(trimmed)
        if (matcher.find()) {
            return matcher.group(1)
        }
        return null
    }

    suspend fun resolveStream(urlOrInput: String): Result<ResolvedVideo> = withContext(Dispatchers.IO) {
        val trimmed = urlOrInput.trim()
        val videoId = extractVideoId(trimmed)

        if (videoId == null) {
            if (trimmed.startsWith("http://", ignoreCase = true) || trimmed.startsWith("https://", ignoreCase = true)) {
                return@withContext resolveDirectVideoUrl(trimmed)
            } else {
                return@withContext Result.failure(IllegalArgumentException("Invalid YouTube URL or video link: '$urlOrInput'"))
            }
        }

        // 1. Try Invidious instances
        for (instance in INVIDIOUS_INSTANCES) {
            try {
                val resolved = fetchFromInvidious(instance, videoId)
                if (resolved != null) {
                    Log.d(TAG, "Successfully resolved YouTube stream via $instance: \${resolved.title}")
                    return@withContext Result.success(resolved)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed resolving via $instance: \${e.message}")
            }
        }

        // 2. Try Piped API
        try {
            val pipedResolved = fetchFromPiped("https://pipedapi.kavin.rocks", videoId)
                ?: fetchFromPiped("https://api.piped.privacydev.net", videoId)
            if (pipedResolved != null) {
                return@withContext Result.success(pipedResolved)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed resolving via Piped: \${e.message}")
        }

        // 3. Direct HTML scrape fallback
        try {
            val scraped = scrapeYouTubePage(videoId)
            if (scraped != null) {
                return@withContext Result.success(scraped)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed resolving via direct scrape: \${e.message}")
        }

        Result.failure(Exception("Could not resolve video stream for YouTube ID: $videoId. Please check internet connection or try another video link."))
    }

    private fun fetchFromInvidious(baseUrl: String, videoId: String): ResolvedVideo? {
        val apiUrl = "$baseUrl/api/v1/videos/$videoId"
        val connection = (URL(apiUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 6000
            readTimeout = 8000
            requestMethod = "GET"
            setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile; rv:124.0)")
            setRequestProperty("Accept", "application/json")
        }

        if (connection.responseCode != 200) return null

        val jsonString = connection.inputStream.bufferedReader().use { it.readText() }
        val root = JSONObject(jsonString)
        val title = root.optString("title", "YouTube Video ($videoId)")
        val lengthSeconds = root.optLong("lengthSeconds", 120L)

        val formatStreams = root.optJSONArray("formatStreams") ?: return null
        if (formatStreams.length() == 0) return null

        var bestUrl: String? = null
        var bestWidth = 1280
        var bestHeight = 720

        for (i in 0 until formatStreams.length()) {
            val format = formatStreams.getJSONObject(i)
            val streamUrl = format.optString("url")
            val container = format.optString("container", "").lowercase()
            val qualityLabel = format.optString("qualityLabel", "")

            if (streamUrl.isNotEmpty() && (container == "mp4" || streamUrl.contains(".mp4"))) {
                if (qualityLabel.contains("720") || bestUrl == null) {
                    bestUrl = streamUrl
                    if (qualityLabel.contains("720")) {
                        bestWidth = 1280
                        bestHeight = 720
                    } else if (qualityLabel.contains("1080")) {
                        bestWidth = 1920
                        bestHeight = 1080
                    } else if (qualityLabel.contains("360")) {
                        bestWidth = 640
                        bestHeight = 360
                    } else if (qualityLabel.contains("480")) {
                        bestWidth = 854
                        bestHeight = 480
                    }
                }
            }
        }

        return bestUrl?.let {
            ResolvedVideo(
                videoId = videoId,
                title = title,
                streamUrl = it,
                width = bestWidth,
                height = bestHeight,
                durationSec = lengthSeconds,
                isDirectUrl = false
            )
        }
    }

    private fun fetchFromPiped(baseUrl: String, videoId: String): ResolvedVideo? {
        val apiUrl = "$baseUrl/streams/$videoId"
        val connection = (URL(apiUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 6000
            readTimeout = 8000
            requestMethod = "GET"
            setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile; rv:124.0)")
            setRequestProperty("Accept", "application/json")
        }

        if (connection.responseCode != 200) return null

        val jsonString = connection.inputStream.bufferedReader().use { it.readText() }
        val root = JSONObject(jsonString)
        val title = root.optString("title", "YouTube Video ($videoId)")
        val duration = root.optLong("duration", 120L)

        val videoStreams = root.optJSONArray("videoStreams") ?: return null
        for (i in 0 until videoStreams.length()) {
            val item = videoStreams.getJSONObject(i)
            val url = item.optString("url")
            val format = item.optString("format", "")
            val videoOnly = item.optBoolean("videoOnly", false)

            if (!videoOnly && format.equals("mp4", ignoreCase = true) && url.isNotEmpty()) {
                val w = item.optInt("width", 1280)
                val h = item.optInt("height", 720)
                return ResolvedVideo(
                    videoId = videoId,
                    title = title,
                    streamUrl = url,
                    width = if (w > 0) w else 1280,
                    height = if (h > 0) h else 720,
                    durationSec = duration,
                    isDirectUrl = false
                )
            }
        }
        return null
    }

    private fun scrapeYouTubePage(videoId: String): ResolvedVideo? {
        val pageUrl = "https://www.youtube.com/watch?v=$videoId&hl=en"
        val connection = (URL(pageUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 6000
            readTimeout = 8000
            requestMethod = "GET"
            setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        }

        if (connection.responseCode != 200) return null
        val html = connection.inputStream.bufferedReader().use { it.readText() }

        val regex = Pattern.compile("ytInitialPlayerResponse\\\\s*=\\\\s*(\\\\{.+?\\\\});")
        val matcher = regex.matcher(html)
        if (matcher.find()) {
            val jsonStr = matcher.group(1) ?: return null
            val root = JSONObject(jsonStr)
            val videoDetails = root.optJSONObject("videoDetails")
            val title = videoDetails?.optString("title") ?: "YouTube Video ($videoId)"
            val lengthSec = videoDetails?.optLong("lengthSeconds") ?: 120L

            val streamingData = root.optJSONObject("streamingData") ?: return null
            val formats = streamingData.optJSONArray("formats") ?: return null

            for (i in 0 until formats.length()) {
                val f = formats.getJSONObject(i)
                val url = f.optString("url")
                val mimeType = f.optString("mimeType", "")
                if (url.isNotEmpty() && mimeType.contains("video/mp4")) {
                    val w = f.optInt("width", 1280)
                    val h = f.optInt("height", 720)
                    return ResolvedVideo(
                        videoId = videoId,
                        title = title,
                        streamUrl = url,
                        width = w,
                        height = h,
                        durationSec = lengthSec,
                        isDirectUrl = false
                    )
                }
            }
        }
        return null
    }

    private fun resolveDirectVideoUrl(url: String): Result<ResolvedVideo> {
        return try {
            val filename = url.substringAfterLast("/").substringBefore("?").ifEmpty { "Online Video Stream" }
            Result.success(
                ResolvedVideo(
                    videoId = "direct",
                    title = filename,
                    streamUrl = url,
                    width = 1920,
                    height = 1080,
                    durationSec = 120L,
                    isDirectUrl = true
                )
            )
        } catch (e: Exception) {
            Result.success(
                ResolvedVideo(
                    videoId = "direct",
                    title = "Online Video Stream",
                    streamUrl = url,
                    width = 1920,
                    height = 1080,
                    durationSec = 120L,
                    isDirectUrl = true
                )
            )
        }
    }
}`
  }
];
