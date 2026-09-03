package com.videowall.splicer.network

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
        "(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|watch\\?v=|watch\\?.+&v=|shorts\\/))([a-zA-Z0-9_-]{11})"
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
    suspend fun resolveStream(urlOrInput: String): Result<ResolvedVideo> = withContext(Dispatchers.IO) {
        val trimmed = urlOrInput.trim()
        val videoId = extractVideoId(trimmed)

        if (videoId == null) {
            // Direct video link (MP4 / WebM / HLS)
            if (trimmed.startsWith("http://", ignoreCase = true) || trimmed.startsWith("https://", ignoreCase = true)) {
                return@withContext resolveDirectVideoUrl(trimmed)
            } else {
                return@withContext Result.failure(IllegalArgumentException("Invalid YouTube URL or video link: '$urlOrInput'"))
            }
        }

        // Try Invidious API instances
        for (instance in INVIDIOUS_INSTANCES) {
            try {
                val resolved = fetchFromInvidious(instance, videoId)
                if (resolved != null) {
                    Log.d(TAG, "Successfully resolved YouTube stream via $instance: ${resolved.title}")
                    return@withContext Result.success(resolved)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed resolving via $instance: ${e.message}")
            }
        }

        // Try Piped API as secondary fallback
        try {
            val pipedResolved = fetchFromPiped("https://pipedapi.kavin.rocks", videoId)
                ?: fetchFromPiped("https://api.piped.privacydev.net", videoId)
            if (pipedResolved != null) {
                return@withContext Result.success(pipedResolved)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed resolving via Piped: ${e.message}")
        }

        // Direct web scrape fallback
        try {
            val scraped = scrapeYouTubePage(videoId)
            if (scraped != null) {
                return@withContext Result.success(scraped)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed resolving via direct scrape: ${e.message}")
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

        if (connection.responseCode != 200) {
            return null
        }

        val jsonString = connection.inputStream.bufferedReader().use { it.readText() }
        val root = JSONObject(jsonString)
        val title = root.optString("title", "YouTube Video ($videoId)")
        val lengthSeconds = root.optLong("lengthSeconds", 120L)

        val formatStreams = root.optJSONArray("formatStreams") ?: return null
        if (formatStreams.length() == 0) return null

        // Find best MP4 stream (prefer 720p, fallback to 360p or first available)
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
            val quality = item.optString("quality", "")
            val videoOnly = item.optBoolean("videoOnly", false)

            // Prefer muxed audio+video mp4
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

        val regex = Pattern.compile("ytInitialPlayerResponse\\s*=\\s*(\\{.+?\\});")
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
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                connectTimeout = 5000
                readTimeout = 5000
                requestMethod = "HEAD"
                setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile)")
            }
            connection.connect()

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
            // Even if HEAD fails, return direct URL with fallback dimensions
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
