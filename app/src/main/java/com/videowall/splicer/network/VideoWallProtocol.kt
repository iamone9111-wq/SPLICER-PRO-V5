package com.videowall.splicer.network

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
enum class DeviceOrientation {
    VERTICAL,   // 📱 Devices physically placed Vertically (Standing upright / Portrait mode)
    HORIZONTAL  // 📱 Devices physically placed Horizontally (Lying sideways / Landscape mode)
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
        val videoHeight: Int = 1080,
        val bezelPercent: Float = 3.5f
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
        val hostExecutionEpochMs: Long = 0L,
        val deviceOrientation: DeviceOrientation = DeviceOrientation.HORIZONTAL,
        val bezelPercent: Float = 3.5f
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

    fun serialize(message: SyncMessage): String = json.encodeToString(message) + "\n"

    fun deserialize(payload: String): SyncMessage = json.decodeFromString(payload.trim())
}
