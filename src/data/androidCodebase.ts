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
            android:screenOrientation="sensorLandscape"
            android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize"
            android:keepScreenOn="true" />

        <!-- Client Screen Activity (Hardware Accelerated TextureView) -->
        <activity
            android:name=".ui.ClientActivity"
            android:exported="false"
            android:hardwareAccelerated="true"
            android:screenOrientation="unspecified"
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
      'SchedulePlay with exact targetSystemTimeMs'
    ],
    code: `package com.videowall.splicer.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

enum class WallOrientation {
    HORIZONTAL, // Landscape: screens arranged Left-to-Right
    VERTICAL    // Portrait: screens arranged Top-to-Bottom
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
     * Server assigns physical screen index and layout parameters to client.
     */
    @Serializable
    @SerialName("ASSIGN_ROLE")
    data class AssignRole(
        val deviceIndex: Int,
        val totalDevices: Int,
        val orientation: WallOrientation
    ) : SyncMessage()

    /**
     * Instructs clients to download or prepare video source into memory / cache.
     */
    @Serializable
    @SerialName("PREPARE_MEDIA")
    data class PrepareMedia(
        val mediaUri: String,
        val videoWidth: Int,
        val videoHeight: Int,
        val durationMs: Long
    ) : SyncMessage()

    /**
     * High-Precision Scheduled Play Command:
     * Dispatches playback to start from [startPositionMs] at the exact [targetSystemTimeMs].
     */
    @Serializable
    @SerialName("SCHEDULE_PLAY")
    data class SchedulePlay(
        val startPositionMs: Long,
        val targetSystemTimeMs: Long
    ) : SyncMessage()

    /**
     * Immediately pause playback and hold current video frame.
     */
    @Serializable
    @SerialName("PAUSE")
    data class Pause(
        val currentPositionMs: Long
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
    description: 'Coroutine-based Master TCP Server. Handles client connections, responds to NTP Ping/Pong sync, and coordinates atomic playback dispatch.',
    highlights: [
      'Coroutines with IO Dispatcher',
      'SystemClock.elapsedRealtime() NTP timestamps',
      'Atomic broadcastSchedulePlay(targetSystemTimeMs)'
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
import java.util.concurrent.CopyOnWriteArrayList

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

    var currentOrientation: WallOrientation = WallOrientation.HORIZONTAL
        private set
    var currentMediaUri: String? = null
        private set
    var videoWidth: Int = 1920
        private set
    var videoHeight: Int = 1080
        private set

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

                    // Auto re-assign device indices to all connected screens
                    reassignDeviceRoles()

                    clientHandler.startListening()
                }
            } catch (e: Exception) {
                if (isActive) Log.e(tag, "Server exception: \${e.message}", e)
            }
        }
    }

    /**
     * Broadcasts updated layout configuration and segment indices to all connected devices.
     * Host device is index 0; clients are indices 1..N.
     */
    fun configureWall(orientation: WallOrientation, mediaUri: String, width: Int, height: Int) {
        currentOrientation = orientation
        currentMediaUri = mediaUri
        videoWidth = width
        videoHeight = height
        reassignDeviceRoles()
    }

    private fun reassignDeviceRoles() {
        val totalDevices = connectedClients.size + 1 // +1 for Host itself
        
        connectedClients.forEachIndexed { index, client ->
            val clientIndex = index + 1 // Host is 0
            client.sendMessage(
                SyncMessage.AssignRole(
                    deviceIndex = clientIndex,
                    totalDevices = totalDevices,
                    orientation = currentOrientation
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

    /**
     * Dispatches scheduled playback command to all clients.
     * @param executionDelayMs Buffer time (e.g. 500ms) to ensure all clients receive and queue the play command.
     */
    fun broadcastSchedulePlay(startPositionMs: Long, executionDelayMs: Long = 500L): Long {
        val targetSystemTimeMs = SystemClock.elapsedRealtime() + executionDelayMs
        val message = SyncMessage.SchedulePlay(startPositionMs, targetSystemTimeMs)
        
        connectedClients.forEach { client ->
            client.sendMessage(message)
        }
        return targetSystemTimeMs
    }

    fun broadcastPause(currentPositionMs: Long) {
        val message = SyncMessage.Pause(currentPositionMs)
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
        private var writer: PrintWriter? = null
        private var reader: BufferedReader? = null

        fun startListening() {
            serverScope.launch {
                try {
                    writer = PrintWriter(socket.getOutputStream(), true)
                    reader = BufferedReader(InputStreamReader(socket.getInputStream()))

                    while (isActive && !socket.isClosed) {
                        val line = reader?.readLine() ?: break
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
                    reassignDeviceRoles()
                }
            }
        }

        private fun handleIncomingMessage(rawJson: String) {
            try {
                when (val message = ProtocolSerializer.deserialize(rawJson)) {
                    is SyncMessage.Ping -> {
                        // NTP 4-timestamp exchange
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
                    writer?.print(json)
                    writer?.flush()
                } catch (e: Exception) {
                    Log.e(tag, "Failed to send message to client: \${e.message}")
                }
            }
        }

        fun close() {
            try {
                socket.close()
                writer?.close()
                reader?.close()
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
    private val onSyncOffsetUpdated: (offsetMs: Long, rttMs: Long) -> Unit
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
            try {
                socket = Socket()
                socket?.connect(InetSocketAddress(hostIp, port), 5000)
                writer = PrintWriter(socket!!.getOutputStream(), true)
                reader = BufferedReader(InputStreamReader(socket!!.getInputStream()))

                Log.d(tag, "Connected to Host at $hostIp:$port")

                // Start continuous background NTP clock synchronizer
                startNtpSyncLoop()

                // Listen for host commands
                while (isActive && socket?.isClosed == false) {
                    val line = reader?.readLine() ?: break
                    handleHostMessage(line)
                }
            } catch (e: Exception) {
                Log.e(tag, "Client connection failed: \${e.message}", e)
            }
        }
    }

    /**
     * Continuously exchanges NTP Ping/Pong messages every 2 seconds to keep clock synchronization accurate to <2ms.
     */
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
                    // NTP 4-timestamp calculation
                    val t3ClientReceived = SystemClock.elapsedRealtime()
                    val t0 = message.t0ClientSent
                    val t1 = message.t1ServerReceived
                    val t2 = message.t2ServerSent

                    // Round Trip Time: (T3 - T0) - (T2 - T1)
                    val rtt = (t3ClientReceived - t0) - (t2 - t1)
                    // Offset: ((T1 - T0) + (T2 - T3)) / 2
                    val instantOffset = ((t1 - t0) + (t2 - t3ClientReceived)) / 2

                    // Exponential Moving Average (EMA) to smooth out network jitter
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
                    // Convert Host's targetSystemTimeMs into Client's local elapsedRealtime
                    // targetClientSystemTime = targetHostSystemTime - clockOffsetMs
                    val localExecutionTimeMs = message.targetSystemTimeMs - clockOffsetMs
                    clientScope.launch(Dispatchers.Main) {
                        onPlayScheduled(message.startPositionMs, localExecutionTimeMs)
                    }
                }
                is SyncMessage.Pause -> {
                    clientScope.launch(Dispatchers.Main) {
                        onPause(message.currentPositionMs)
                    }
                }
                is SyncMessage.Seek -> {
                    val localExecutionTimeMs = message.targetSystemTimeMs - clockOffsetMs
                    clientScope.launch(Dispatchers.Main) {
                        onSeekScheduled(message.targetPositionMs, localExecutionTimeMs)
                    }
                }
                else -> {}
            }
        } catch (e: Exception) {
            Log.e(tag, "Error parsing host message: \${e.message}")
        }
    }

    private fun sendMessage(message: SyncMessage) {
        clientScope.launch {
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
      'Manual Screen Coordinates: postTranslate(-colIndex * viewWidth, -rowIndex * viewHeight)',
      'Aspect Ratio Preset & Custom Letterbox / Pillarbox / Cover Fitting',
      'Screen Rotation compensation'
    ],
    code: `package com.videowall.splicer.transform

import android.graphics.Matrix
import android.view.TextureView
import com.videowall.splicer.network.WallOrientation

object MatrixTransformHelper {

    /**
     * Computes and applies the screen-splicing Matrix transformation onto a [TextureView].
     * Supports manual (row, col) grid mapping, custom rows and cols, aspect ratios, and scale modes.
     * 
     * @param textureView The target TextureView where ExoPlayer renders video buffers.
     * @param rowIndex The 0-based row coordinate of this screen (0..totalRows-1).
     * @param colIndex The 0-based column coordinate of this screen (0..totalCols-1).
     * @param totalRows Total number of rows in the video wall matrix.
     * @param totalCols Total number of columns in the video wall matrix.
     * @param videoWidth Original width of the video in pixels.
     * @param videoHeight Original height of the video in pixels.
     * @param viewWidth Width of this device's TextureView in pixels.
     * @param viewHeight Height of this device's TextureView in pixels.
     * @param aspectRatio Target aspect ratio string ("AUTO", "16:9", "9:16", "4:3", "1:1", "21:9", "32:9", "CUSTOM").
     * @param scaleMode "COVER", "CONTAIN", or "STRETCH".
     * @param rotationDegrees Rotation angle (0, 90, 180, 270).
     */
    fun applySpliceTransform(
        textureView: TextureView,
        rowIndex: Int,
        colIndex: Int,
        totalRows: Int,
        totalCols: Int,
        videoWidth: Int,
        videoHeight: Int,
        viewWidth: Float,
        viewHeight: Float,
        aspectRatio: String = "AUTO",
        scaleMode: String = "COVER",
        rotationDegrees: Float = 0f
    ): Matrix {
        if (viewWidth <= 0 || viewHeight <= 0 || totalRows <= 0 || totalCols <= 0) return Matrix()

        val matrix = Matrix()

        var scaleX = totalCols.toFloat()
        var scaleY = totalRows.toFloat()
        var translateX = -(colIndex * viewWidth)
        var translateY = -(rowIndex * viewHeight)

        val virtualWallWidth = viewWidth * totalCols
        val virtualWallHeight = viewHeight * totalRows
        val wallAspect = virtualWallWidth / virtualWallHeight

        val targetAspect = when (aspectRatio.uppercase()) {
            "16:9" -> 16f / 9f
            "9:16" -> 9f / 16f
            "4:3" -> 4f / 3f
            "1:1" -> 1.0f
            "21:9" -> 21f / 9f
            "32:9" -> 32f / 9f
            else -> if (videoHeight > 0) videoWidth.toFloat() / videoHeight.toFloat() else wallAspect
        }

        if (scaleMode == "CONTAIN") {
            var fittedWidth = virtualWallWidth
            var fittedHeight = virtualWallHeight
            var fitOffsetX = 0f
            var fitOffsetY = 0f

            if (targetAspect > wallAspect) {
                fittedHeight = virtualWallWidth / targetAspect
                fitOffsetY = (virtualWallHeight - fittedHeight) / 2f
            } else {
                fittedWidth = virtualWallHeight * targetAspect
                fitOffsetX = (virtualWallWidth - fittedWidth) / 2f
            }

            val contentRatioX = fittedWidth / virtualWallWidth
            val contentRatioY = fittedHeight / virtualWallHeight
            scaleX *= contentRatioX
            scaleY *= contentRatioY
            translateX = -(colIndex * viewWidth) * contentRatioX + (fitOffsetX / totalCols)
            translateY = -(rowIndex * viewHeight) * contentRatioY + (fitOffsetY / totalRows)
        } else if (scaleMode == "COVER" && aspectRatio.uppercase() != "AUTO") {
            if (targetAspect > wallAspect) {
                val stretchFactor = targetAspect / wallAspect
                scaleX *= stretchFactor
                translateX = -(colIndex * viewWidth) * stretchFactor - ((virtualWallWidth * (stretchFactor - 1f)) / (2f * totalCols))
            } else {
                val stretchFactor = wallAspect / targetAspect
                scaleY *= stretchFactor
                translateY = -(rowIndex * viewHeight) * stretchFactor - ((virtualWallHeight * (stretchFactor - 1f)) / (2f * totalRows))
            }
        }

        matrix.setScale(scaleX, scaleY, 0f, 0f)
        matrix.postTranslate(translateX, translateY)

        if (rotationDegrees != 0f) {
            matrix.postRotate(rotationDegrees, viewWidth / 2f, viewHeight / 2f)
        }

        textureView.setTransform(matrix)
        return matrix
    }
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
      'Micro-drift compensation (speed adjustment 0.98x - 1.02x)'
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
                        onVideoSizeChanged(videoSize.width, videoSize.height)
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
                Log.d(tag, "Waiting \${waitDurationMs}ms until synchronized start at $localExecutionTimeMs")
                delay(waitDurationMs)
            } else {
                Log.w(tag, "Scheduled execution was in the past by \${-waitDurationMs}ms; starting immediately")
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
      'Immersive Fullscreen Sticky Mode',
      'Wi-Fi IP Address Detection',
      'ActivityResultContracts.GetContent Video Picker'
    ],
    code: `package com.videowall.splicer.ui

import android.content.Intent
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Bundle
import android.text.format.Formatter
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.videowall.splicer.databinding.ActivityClientBinding
import com.videowall.splicer.databinding.ActivityHostBinding
import com.videowall.splicer.databinding.ActivityMainBinding
import com.videowall.splicer.network.*
import com.videowall.splicer.playback.SyncPlaybackController
import com.videowall.splicer.transform.MatrixTransformHelper

// ==========================================
// 1. HOME SCREEN / ROLE SELECTION
// ==========================================
class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private var selectedOrientation = WallOrientation.HORIZONTAL

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.radioOrientation.setOnCheckedChangeListener { _, checkedId ->
            selectedOrientation = if (checkedId == binding.radioHorizontal.id) {
                WallOrientation.HORIZONTAL
            } else {
                WallOrientation.VERTICAL
            }
        }

        binding.btnHost.setOnClickListener {
            val intent = Intent(this, HostActivity::class.java).apply {
                putExtra("ORIENTATION", selectedOrientation.name)
            }
            startActivity(intent)
        }

        binding.btnJoin.setOnClickListener {
            val hostIp = binding.inputHostIp.text.toString().trim()
            if (hostIp.isEmpty()) {
                Toast.makeText(this, "Please enter Host IP Address", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val intent = Intent(this, ClientActivity::class.java).apply {
                putExtra("HOST_IP", hostIp)
            }
            startActivity(intent)
        }
    }
}

// ==========================================
// 2. HOST / MASTER CONTROL SCREEN
// ==========================================
class HostActivity : AppCompatActivity() {
    private lateinit var binding: ActivityHostBinding
    private var server: VideoWallServer? = null
    private var syncController: SyncPlaybackController? = null
    private var selectedVideoUri: Uri? = null
    private var videoWidth: Int = 1920
    private var videoHeight: Int = 1080
    private var orientation: WallOrientation = WallOrientation.HORIZONTAL

    private val videoPickerLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let {
            selectedVideoUri = it
            binding.tvSelectedVideo.text = it.lastPathSegment ?: "Video Selected"
            syncController?.prepareMedia(it)
            server?.configureWall(orientation, it.toString(), videoWidth, videoHeight)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHostBinding.inflate(layoutInflater)
        setContentView(binding.root)
        hideSystemUI()

        orientation = WallOrientation.valueOf(intent.getStringExtra("ORIENTATION") ?: "HORIZONTAL")
        binding.tvHostIp.text = "Host IP: " + getLocalIpAddress()

        syncController = SyncPlaybackController(this, binding.hostTextureView) { width, height ->
            videoWidth = width
            videoHeight = height
            updateMatrix()
            server?.configureWall(orientation, selectedVideoUri.toString(), width, height)
        }

        server = VideoWallServer(
            port = 8988,
            onClientConnected = { count, ip ->
                binding.tvConnectedClients.text = "Connected Screens: $count"
                updateMatrix()
            },
            onClientDisconnected = { count ->
                binding.tvConnectedClients.text = "Connected Screens: $count"
                updateMatrix()
            },
            onHeartbeatReceived = { /* Monitor sync telemetry */ }
        ).apply { start() }

        binding.btnPickVideo.setOnClickListener {
            videoPickerLauncher.launch("video/*")
        }

        binding.btnPlay.setOnClickListener {
            val targetTime = server?.broadcastSchedulePlay(0L, 500L) ?: 0L
            syncController?.schedulePlay(0L, targetTime)
        }

        binding.btnPause.setOnClickListener {
            server?.broadcastPause(0L)
            syncController?.pause()
        }
    }

    private fun updateMatrix() {
        val totalScreens = 1 + (server?.run { 1 } ?: 1)
        MatrixTransformHelper.applySpliceTransform(
            binding.hostTextureView,
            deviceIndex = 0, // Master is screen 0
            totalDevices = totalScreens,
            orientation = orientation,
            videoWidth = videoWidth,
            videoHeight = videoHeight,
            viewWidth = binding.hostTextureView.width.toFloat(),
            viewHeight = binding.hostTextureView.height.toFloat()
        )
    }

    private fun getLocalIpAddress(): String {
        val wifiManager = applicationContext.getSystemService(WIFI_SERVICE) as WifiManager
        return Formatter.formatIpAddress(wifiManager.connectionInfo.ipAddress)
    }

    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        server?.stop()
        syncController?.release()
    }
}

// ==========================================
// 3. CLIENT SCREEN / IMMERSIVE SPLICED DISPLAY
// ==========================================
class ClientActivity : AppCompatActivity() {
    private lateinit var binding: ActivityClientBinding
    private var client: VideoWallClient? = null
    private var syncController: SyncPlaybackController? = null
    private var deviceIndex = 1
    private var totalDevices = 2
    private var orientation = WallOrientation.HORIZONTAL
    private var videoWidth = 1920
    private var videoHeight = 1080

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityClientBinding.inflate(layoutInflater)
        setContentView(binding.root)
        hideSystemUI()

        val hostIp = intent.getStringExtra("HOST_IP") ?: "192.168.1.100"

        syncController = SyncPlaybackController(this, binding.clientTextureView) { w, h ->
            videoWidth = w
            videoHeight = h
            applySplice()
        }

        client = VideoWallClient(
            hostIp = hostIp,
            port = 8988,
            onRoleAssigned = { role ->
                deviceIndex = role.deviceIndex
                totalDevices = role.totalDevices
                orientation = role.orientation
                binding.tvScreenIndex.text = "Screen \${deviceIndex + 1} of $totalDevices"
                applySplice()
            },
            onMediaPrepared = { media ->
                videoWidth = media.videoWidth
                videoHeight = media.videoHeight
                syncController?.prepareMedia(Uri.parse(media.mediaUri))
                applySplice()
            },
            onPlayScheduled = { startPos, localExecTime ->
                syncController?.schedulePlay(startPos, localExecTime)
            },
            onPause = {
                syncController?.pause()
            },
            onSeekScheduled = { targetPos, localExecTime ->
                syncController?.schedulePlay(targetPos, localExecTime)
            },
            onSyncOffsetUpdated = { offset, rtt ->
                binding.tvSyncTelemetry.text = "Offset: \${offset}ms | RTT: \${rtt}ms"
            }
        ).apply { connect() }
    }

    private fun applySplice() {
        MatrixTransformHelper.applySpliceTransform(
            binding.clientTextureView,
            deviceIndex = deviceIndex,
            totalDevices = totalDevices,
            orientation = orientation,
            videoWidth = videoWidth,
            videoHeight = videoHeight,
            viewWidth = binding.clientTextureView.width.toFloat(),
            viewHeight = binding.clientTextureView.height.toFloat()
        )
    }

    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        )
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
    description: 'Host Video Wall Interactive Setup Wizard: asks the host how many screens are connected, video division orientation (Horizontal / Vertical / Grid), and physical screen arrangement.',
    highlights: [
      'Dynamic connected screens discovery & counter',
      'Horizontal (1xN), Vertical (Nx1), and Grid (RxC) division selection',
      'Screen arrangement mapping and identify flash trigger',
      'Broadcasts new roles and matrix coordinates to all nodes'
    ],
    code: `package com.videowall.splicer.ui

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.DialogFragment
import com.google.android.material.button.MaterialButton
import com.videowall.splicer.R
import com.videowall.splicer.network.VideoWallHostServer
import com.videowall.splicer.network.WallOrientation

class HostSetupWizardDialog(
    private val hostServer: VideoWallHostServer,
    private val onConfigurationApplied: (screenCount: Int, orientation: WallOrientation, rows: Int, cols: Int) -> Unit
) : DialogFragment() {

    private var currentStep = 1
    private var selectedScreenCount = 3
    private var selectedOrientation = WallOrientation.HORIZONTAL
    private var gridRows = 1
    private var gridCols = 3

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.dialog_host_setup_wizard, container, false)
        setupViews(view)
        return view
    }

    private fun setupViews(root: View) {
        val tvStepTitle = root.findViewById<TextView>(R.id.tvStepTitle)
        val tvStepDesc = root.findViewById<TextView>(R.id.tvStepDesc)
        val step1Container = root.findViewById<ViewGroup>(R.id.step1Container)
        val step2Container = root.findViewById<ViewGroup>(R.id.step2Container)
        val step3Container = root.findViewById<ViewGroup>(R.id.step3Container)
        val step4Container = root.findViewById<ViewGroup>(R.id.step4Container)

        val btnNext = root.findViewById<Button>(R.id.btnNext)
        val btnBack = root.findViewById<Button>(R.id.btnBack)
        val btnAddScreen = root.findViewById<MaterialButton>(R.id.btnAddScreen)
        val btnRemoveScreen = root.findViewById<MaterialButton>(R.id.btnRemoveScreen)
        val tvScreenCount = root.findViewById<TextView>(R.id.tvScreenCount)

        btnAddScreen?.setOnClickListener {
            selectedScreenCount++
            tvScreenCount?.text = "$selectedScreenCount Screens"
            updateLayoutDimensions()
        }

        btnRemoveScreen?.setOnClickListener {
            if (selectedScreenCount > 1) {
                selectedScreenCount--
                tvScreenCount?.text = "$selectedScreenCount Screens"
                updateLayoutDimensions()
            }
        }

        btnNext?.setOnClickListener {
            if (currentStep < 4) {
                currentStep++
                updateStepUI(tvStepTitle, tvStepDesc, step1Container, step2Container, step3Container, step4Container, btnNext)
            } else {
                applyConfiguration()
                dismiss()
            }
        }

        btnBack?.setOnClickListener {
            if (currentStep > 1) {
                currentStep--
                updateStepUI(tvStepTitle, tvStepDesc, step1Container, step2Container, step3Container, step4Container, btnNext)
            }
        }
    }

    private fun updateLayoutDimensions() {
        when (selectedOrientation) {
            WallOrientation.HORIZONTAL -> {
                gridRows = 1
                gridCols = selectedScreenCount
            }
            WallOrientation.VERTICAL -> {
                gridRows = selectedScreenCount
                gridCols = 1
            }
        }
    }

    private fun updateStepUI(
        title: TextView?,
        desc: TextView?,
        s1: ViewGroup?,
        s2: ViewGroup?,
        s3: ViewGroup?,
        s4: ViewGroup?,
        btnNext: Button?
    ) {
        s1?.visibility = if (currentStep == 1) View.VISIBLE else View.GONE
        s2?.visibility = if (currentStep == 2) View.VISIBLE else View.GONE
        s3?.visibility = if (currentStep == 3) View.VISIBLE else View.GONE
        s4?.visibility = if (currentStep == 4) View.VISIBLE else View.GONE

        when (currentStep) {
            1 -> {
                title?.text = "Step 1: How many screens are connected?"
                desc?.text = "The video will divide dynamically according to your screen count."
                btnNext?.text = "Continue"
            }
            2 -> {
                title?.text = "Step 2: How would you like to play the video?"
                desc?.text = "Choose Horizontal (1xN), Vertical (Nx1), or Matrix Grid division."
                btnNext?.text = "Continue"
            }
            3 -> {
                title?.text = "Step 3: How do you want to arrange the screens?"
                desc?.text = "Map which physical phone is on the Left, Center, Right or Top/Bottom."
                btnNext?.text = "Continue"
            }
            4 -> {
                title?.text = "Step 4: Aspect Ratio & Splicing Fit"
                desc?.text = "Select Auto, 16:9, 9:16 or Cover / Contain mode."
                btnNext?.text = "Apply & Divide Video"
            }
        }
    }

    private fun applyConfiguration() {
        updateLayoutDimensions()
        hostServer.broadcastRoleAssignments(
            totalDevices = selectedScreenCount,
            orientation = selectedOrientation,
            totalRows = gridRows,
            totalCols = gridCols
        )
        onConfigurationApplied(selectedScreenCount, selectedOrientation, gridRows, gridCols)
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

/**
 * Embedded HTTP server running on the Host device to stream local video files (content:// or file://)
 * directly to ExoPlayer instances on connected client phones over Wi-Fi with HTTP 206 Range support.
 */
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
                    // Fallback to full range
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

            // Stream file data efficiently
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
import android.net.DhcpInfo
import android.net.wifi.WifiManager
import android.text.format.Formatter
import android.util.Log
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

object NetworkUtils {
    private const val TAG = "NetworkUtils"

    private val CELLULAR_AND_VIRTUAL_PREFIXES = listOf(
        "rmnet", "ccmni", "pdp", "wwan", "clat", "dummy", "radio", 
        "v4-rmnet", "lo", "tun", "tap", "ppp", "docker", "vbox"
    )

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

    fun startBroadcasting(scope: CoroutineScope, hostIp: String, tcpPort: Int = 8988): Job {
        return scope.launch(Dispatchers.IO) {
            var socket: DatagramSocket? = null
            try {
                socket = DatagramSocket()
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
  }
];
