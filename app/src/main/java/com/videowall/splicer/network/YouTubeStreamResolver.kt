package com.videowall.splicer.network

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
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
 * - Shortened YouTube links: https://youtu.be/VIDEO_ID or tu.be/VIDEO_ID
 * - YouTube Shorts links: https://youtube.com/shorts/VIDEO_ID
 * - YouTube Live links: https://youtube.com/live/VIDEO_ID
 * - YouTube Mobile links: https://m.youtube.com/watch?v=VIDEO_ID
 * - YouTube Embed links: https://www.youtube.com/embed/VIDEO_ID
 * - Direct raw Video IDs: e.g. wuTj2td73sk or dQw4w9WgXcQ
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

    // Regex to extract 11-character YouTube video ID (handles youtu.be, tu.be, watch?v=, shorts, embed, live)
    private val YOUTUBE_ID_PATTERN = Pattern.compile(
        "(?:https?:\\/\\/)?(?:www\\.|m\\.)?(?:youtu\\.be\\/|tu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|watch\\?v=|watch\\?.+&v=|shorts\\/|live\\/))([a-zA-Z0-9_-]{11})",
        Pattern.CASE_INSENSITIVE
    )

    // Curated Invidious instances as secondary fallback
    private val INVIDIOUS_INSTANCES = listOf(
        "https://inv.nadeko.net",
        "https://invidious.nerdvpn.de",
        "https://inv.tux.pizza",
        "https://invidious.protokolla.fi",
        "https://yewtu.be"
    )

    /**
     * Extracts YouTube 11-char Video ID if present, or null if direct video URL.
     */
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

    /**
     * Resolves a YouTube URL or direct video URL into a playable stream descriptor.
     */
    suspend fun resolveStream(
        urlOrInput: String,
        onStatusUpdate: ((String) -> Unit)? = null
    ): Result<ResolvedVideo> = withContext(Dispatchers.IO) {
        val trimmed = urlOrInput.trim()
        val videoId = extractVideoId(trimmed)

        if (videoId == null) {
            // Direct video link (MP4 / WebM / HLS)
            val normalizedUrl = when {
                trimmed.startsWith("http://", ignoreCase = true) || trimmed.startsWith("https://", ignoreCase = true) -> trimmed
                trimmed.contains(".") && !trimmed.contains(" ") -> "https://$trimmed"
                else -> null
            }

            if (normalizedUrl != null) {
                onStatusUpdate?.invoke("Connecting to direct video stream...")
                return@withContext resolveDirectVideoUrl(normalizedUrl)
            } else {
                return@withContext Result.failure(
                    IllegalArgumentException("Invalid YouTube URL or video link: '$urlOrInput'")
                )
            }
        }

        Log.d(TAG, "Resolving YouTube stream for Video ID: $videoId")
        onStatusUpdate?.invoke("Connecting to YouTube stream converter for ID: $videoId...")

        // 1. Primary Strategy: High-speed stream conversion via Loader API (720p HD)
        try {
            val resolved720 = resolveViaLoader(videoId, format = "720", onStatusUpdate)
            if (resolved720 != null) {
                Log.d(TAG, "Successfully resolved 720p stream: ${resolved720.title}")
                return@withContext Result.success(resolved720)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Loader 720p attempt failed: ${e.message}")
        }

        // 2. Fast Fallback: 360p (faster conversion, handles older or standard resolution videos)
        try {
            onStatusUpdate?.invoke("Trying standard-definition stream (360p)...")
            val resolved360 = resolveViaLoader(videoId, format = "360", onStatusUpdate)
            if (resolved360 != null) {
                Log.d(TAG, "Successfully resolved 360p stream: ${resolved360.title}")
                return@withContext Result.success(resolved360)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Loader 360p attempt failed: ${e.message}")
        }

        // 3. Mirror API Fallback (savenow mirror)
        try {
            onStatusUpdate?.invoke("Trying backup stream mirror...")
            val resolvedMirror = resolveViaSaveNowMirror(videoId, onStatusUpdate)
            if (resolvedMirror != null) {
                return@withContext Result.success(resolvedMirror)
            }
        } catch (e: Exception) {
            Log.w(TAG, "SaveNow mirror attempt failed: ${e.message}")
        }

        // 4. Invidious API instances fallback (with short timeouts)
        for (instance in INVIDIOUS_INSTANCES) {
            try {
                onStatusUpdate?.invoke("Checking stream source (${instance.substringAfter("://")})...")
                val resolved = fetchFromInvidious(instance, videoId)
                if (resolved != null) {
                    Log.d(TAG, "Resolved stream via Invidious: $instance")
                    return@withContext Result.success(resolved)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Invidious instance $instance failed: ${e.message}")
            }
        }

        // 5. Piped API fallback
        try {
            onStatusUpdate?.invoke("Checking Piped stream source...")
            val piped = fetchFromPiped("https://pipedapi.kavin.rocks", videoId)
                ?: fetchFromPiped("https://api.piped.privacydev.net", videoId)
            if (piped != null) {
                return@withContext Result.success(piped)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Piped failed: ${e.message}")
        }

        Result.failure(
            Exception(
                "Could not resolve video stream for YouTube ID: $videoId. " +
                "Please verify the Host device has active internet access, or use 'Select Video File' to play a local video."
            )
        )
    }

    /**
     * Resolves YouTube video to direct MP4 stream using Loader streaming converter.
     */
    private suspend fun resolveViaLoader(
        videoId: String,
        format: String,
        onStatusUpdate: ((String) -> Unit)?
    ): ResolvedVideo? {
        val watchUrl = "https://www.youtube.com/watch?v=$videoId"
        val initUrl = "https://loader.to/ajax/download.php?format=$format&url=$watchUrl"

        val initConn = (URL(initUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 8000
            requestMethod = "GET"
            setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36")
            setRequestProperty("Accept", "application/json")
        }

        if (initConn.responseCode != 200) {
            initConn.disconnect()
            return null
        }

        val initBody = initConn.inputStream.bufferedReader().use { it.readText() }
        initConn.disconnect()

        val initJson = JSONObject(initBody)
        if (!initJson.optBoolean("success", false)) {
            return null
        }

        val rawTitle = initJson.optString("title", "").ifEmpty {
            initJson.optJSONObject("info")?.optString("title", "") ?: "YouTube Video ($videoId)"
        }
        val streamId = initJson.optString("id", "")
        var progressUrl = initJson.optString("progress_url", "")
        if (progressUrl.isEmpty() && streamId.isNotEmpty()) {
            progressUrl = "https://lto2.affadaffa.com/api/progress?id=$streamId"
        }
        if (progressUrl.isEmpty()) return null

        val expectedWidth = if (format == "720") 1280 else if (format == "1080") 1920 else 640
        val expectedHeight = if (format == "720") 720 else if (format == "1080") 1080 else 360

        // Poll progress endpoint (up to 16 attempts, 1.2s each ~19 seconds max)
        val maxAttempts = if (format == "720") 16 else 10
        for (attempt in 1..maxAttempts) {
            delay(1200)
            try {
                val pollConn = (URL(progressUrl).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 5000
                    readTimeout = 5000
                    requestMethod = "GET"
                    setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile)")
                    setRequestProperty("Accept", "application/json")
                }

                if (pollConn.responseCode == 200) {
                    val pollBody = pollConn.inputStream.bufferedReader().use { it.readText() }
                    pollConn.disconnect()

                    val pollJson = JSONObject(pollBody)
                    val downloadUrl = pollJson.optString("download_url", "")
                    val progressVal = pollJson.optInt("progress", 0)

                    if (downloadUrl.isNotEmpty() && downloadUrl.startsWith("http")) {
                        onStatusUpdate?.invoke("Stream ready: $rawTitle")
                        val videoDuration = pollJson.optLong("video_duration", 0L).let {
                            if (it > 0) it else 180L
                        }
                        return ResolvedVideo(
                            videoId = videoId,
                            title = rawTitle,
                            streamUrl = downloadUrl,
                            width = expectedWidth,
                            height = expectedHeight,
                            durationSec = videoDuration,
                            isDirectUrl = false
                        )
                    }

                    if (attempt % 3 == 0) {
                        onStatusUpdate?.invoke("Preparing stream chunks... ($progressVal%)")
                    }
                } else {
                    pollConn.disconnect()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Polling progress exception on attempt $attempt: ${e.message}")
            }
        }
        return null
    }

    /**
     * Mirror fallback via saveNow API endpoint.
     */
    private suspend fun resolveViaSaveNowMirror(
        videoId: String,
        onStatusUpdate: ((String) -> Unit)?
    ): ResolvedVideo? {
        val watchUrl = "https://www.youtube.com/watch?v=$videoId"
        val initUrl = "https://p.savenow.to/ajax/download.php?format=720&url=$watchUrl"

        val initConn = (URL(initUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 8000
            requestMethod = "GET"
            setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile)")
            setRequestProperty("Accept", "application/json")
        }

        if (initConn.responseCode != 200) {
            initConn.disconnect()
            return null
        }

        val initBody = initConn.inputStream.bufferedReader().use { it.readText() }
        initConn.disconnect()

        val initJson = JSONObject(initBody)
        if (!initJson.optBoolean("success", false)) return null

        val rawTitle = initJson.optString("title", "YouTube Video ($videoId)")
        val streamId = initJson.optString("id", "")
        val progressUrl = initJson.optString("progress_url", "").ifEmpty {
            "https://p.savenow.to/api/progress?id=$streamId"
        }
        if (progressUrl.isEmpty()) return null

        for (attempt in 1..12) {
            delay(1300)
            try {
                val pollConn = (URL(progressUrl).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 5000
                    readTimeout = 5000
                    requestMethod = "GET"
                    setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile)")
                }

                if (pollConn.responseCode == 200) {
                    val pollBody = pollConn.inputStream.bufferedReader().use { it.readText() }
                    pollConn.disconnect()

                    val pollJson = JSONObject(pollBody)
                    val downloadUrl = pollJson.optString("download_url", "")
                    if (downloadUrl.isNotEmpty() && downloadUrl.startsWith("http")) {
                        onStatusUpdate?.invoke("Stream ready: $rawTitle")
                        return ResolvedVideo(
                            videoId = videoId,
                            title = rawTitle,
                            streamUrl = downloadUrl,
                            width = 1280,
                            height = 720,
                            durationSec = pollJson.optLong("video_duration", 180L),
                            isDirectUrl = false
                        )
                    }
                } else {
                    pollConn.disconnect()
                }
            } catch (e: Exception) {
                // Ignore and retry
            }
        }
        return null
    }

    private fun fetchFromInvidious(baseUrl: String, videoId: String): ResolvedVideo? {
        val apiUrl = "$baseUrl/api/v1/videos/$videoId"
        val connection = (URL(apiUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 3500
            readTimeout = 4000
            requestMethod = "GET"
            setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile; rv:124.0)")
            setRequestProperty("Accept", "application/json")
        }

        if (connection.responseCode != 200) {
            connection.disconnect()
            return null
        }

        val jsonString = connection.inputStream.bufferedReader().use { it.readText() }
        connection.disconnect()

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

        if (bestUrl != null) {
            return ResolvedVideo(
                videoId = videoId,
                title = title,
                streamUrl = bestUrl,
                width = bestWidth,
                height = bestHeight,
                durationSec = lengthSeconds,
                isDirectUrl = false
            )
        }
        return null
    }

    private fun fetchFromPiped(baseUrl: String, videoId: String): ResolvedVideo? {
        val apiUrl = "$baseUrl/streams/$videoId"
        val connection = (URL(apiUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 3500
            readTimeout = 4000
            requestMethod = "GET"
            setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile; rv:124.0)")
            setRequestProperty("Accept", "application/json")
        }

        if (connection.responseCode != 200) {
            connection.disconnect()
            return null
        }

        val jsonString = connection.inputStream.bufferedReader().use { it.readText() }
        connection.disconnect()

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

    private fun resolveDirectVideoUrl(url: String): Result<ResolvedVideo> {
        return try {
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                connectTimeout = 6000
                readTimeout = 6000
                requestMethod = "HEAD"
                setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile)")
            }
            connection.connect()

            val filename = url.substringAfterLast("/").substringBefore("?").ifEmpty { "Online Video Stream" }
            connection.disconnect()

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
}
