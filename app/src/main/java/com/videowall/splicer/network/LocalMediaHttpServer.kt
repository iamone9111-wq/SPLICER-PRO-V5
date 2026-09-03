package com.videowall.splicer.network

import android.content.Context
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.*
import java.io.*
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.Socket
import java.net.URL
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
                if (isActive) Log.e(tag, "HTTP Server error: ${e.message}", e)
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
            if (tokenizer.hasMoreTokens()) tokenizer.nextToken() // URL path

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
                val notFound = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n"
                output.write(notFound.toByteArray())
                output.flush()
                return
            }

            // If the URI is a remote HTTP or HTTPS stream (such as a YouTube stream or web video),
            // proxy the byte-range request seamlessly so all client phones can play it over local Wi-Fi.
            val scheme = uri.scheme?.lowercase()
            if (scheme == "http" || scheme == "https") {
                proxyRemoteStream(uri.toString(), rangeHeader, method, output)
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

            val statusLine = if (isPartial) "HTTP/1.1 206 Partial Content\r\n" else "HTTP/1.1 200 OK\r\n"
            val headers = StringBuilder().apply {
                append(statusLine)
                append("Content-Type: video/mp4\r\n")
                append("Accept-Ranges: bytes\r\n")
                if (totalLength > 0) {
                    append("Content-Length: $contentLength\r\n")
                    if (isPartial) {
                        append("Content-Range: bytes $startByte-$endByte/$totalLength\r\n")
                    }
                }
                append("Connection: close\r\n")
                append("\r\n")
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
            // Connection closed or client disconnected
        } finally {
            try {
                socket.close()
            } catch (e: Exception) {
                // Ignore
            }
        }
    }

    /**
     * Proxies remote HTTP/HTTPS video streams (e.g. YouTube stream URLs) to client sockets
     * with transparent Byte-Range passing. This allows the Host phone's cellular connection
     * to download the YouTube chunks and feed all client phones over the local hotspot LAN.
     */
    private fun proxyRemoteStream(
        remoteUrl: String,
        rangeHeader: String?,
        method: String,
        output: OutputStream
    ) {
        var remoteConn: HttpURLConnection? = null
        try {
            remoteConn = (URL(remoteUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 10000
                readTimeout = 15000
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile; rv:124.0)")
                if (!rangeHeader.isNullOrEmpty()) {
                    setRequestProperty("Range", rangeHeader)
                }
            }

            val responseCode = remoteConn.responseCode
            val statusLine = "HTTP/1.1 $responseCode ${remoteConn.responseMessage ?: "OK"}\r\n"
            val headers = StringBuilder().apply {
                append(statusLine)
                append("Content-Type: ${remoteConn.contentType ?: "video/mp4"}\r\n")
                append("Accept-Ranges: bytes\r\n")
                val cl = remoteConn.contentLengthLong
                if (cl > 0) {
                    append("Content-Length: $cl\r\n")
                }
                val cr = remoteConn.getHeaderField("Content-Range")
                if (!cr.isNullOrEmpty()) {
                    append("Content-Range: $cr\r\n")
                }
                append("Connection: close\r\n\r\n")
            }.toString()

            output.write(headers.toByteArray())
            output.flush()

            if (method.equals("HEAD", ignoreCase = true)) return

            remoteConn.inputStream.use { inStream ->
                val buffer = ByteArray(64 * 1024)
                var bytesRead: Int
                while (inStream.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                }
                output.flush()
            }
        } catch (e: Exception) {
            // Client closed connection or remote stream finished
        } finally {
            try {
                remoteConn?.disconnect()
            } catch (e: Exception) {}
        }
    }

    fun stop() {
        serverScope.cancel()
        try {
            serverSocket?.close()
        } catch (e: Exception) {
            // Ignore
        }
    }
}
