package com.videowall.splicer.network

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log
import kotlinx.coroutines.*
import java.io.*
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.Socket
import java.net.URL
import java.util.StringTokenizer

/**
 * High-performance, low-latency embedded HTTP server running on the Host device.
 * Streams local video files (content://, file://, or cached File) directly to ExoPlayer instances
 * on connected client phones over Wi-Fi with full HTTP 206 Partial Content (Byte-Range) support.
 */
class LocalMediaHttpServer(
    private val context: Context,
    private val port: Int = 8990
) {
    private val tag = "LocalMediaHttpServer"
    private var serverSocket: ServerSocket? = null
    private val serverScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var currentUri: Uri? = null
    private var currentFile: File? = null

    fun setMediaUri(uri: Uri?) {
        this.currentUri = uri
        Log.d(tag, "Media URI registered for streaming: $uri")
    }

    fun setMediaFile(file: File?) {
        this.currentFile = file
        Log.d(tag, "Media cached file registered for streaming: ${file?.absolutePath} (${file?.length()} bytes)")
    }

    fun start() {
        serverScope.launch {
            try {
                serverSocket = ServerSocket(port).apply {
                    reuseAddress = true
                }
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
        var pfd: android.os.ParcelFileDescriptor? = null
        var raf: RandomAccessFile? = null
        try {
            socket.tcpNoDelay = true
            socket.soTimeout = 15000

            val input = BufferedReader(InputStreamReader(socket.getInputStream()))
            val output = BufferedOutputStream(socket.getOutputStream())

            val requestLine = input.readLine() ?: return
            val tokenizer = StringTokenizer(requestLine)
            if (!tokenizer.hasMoreTokens()) return
            val method = tokenizer.nextToken()
            val requestPath = if (tokenizer.hasMoreTokens()) tokenizer.nextToken() else "/"

            var rangeHeader: String? = null
            var line: String?
            while (input.readLine().also { line = it } != null) {
                if (line.isNullOrEmpty()) break
                if (line!!.startsWith("Range:", ignoreCase = true)) {
                    rangeHeader = line!!.substring(6).trim()
                }
            }

            Log.d(tag, "Request: $method $requestPath, Range: $rangeHeader")

            // If a cached physical file is available, prioritize RandomAccessFile streaming
            val file = currentFile
            if (file != null && file.exists() && file.length() > 0) {
                streamFromFile(file, rangeHeader, method, output)
                return
            }

            val uri = currentUri
            if (uri == null) {
                val notFound = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                output.write(notFound.toByteArray())
                output.flush()
                return
            }

            // If the URI is a remote HTTP or HTTPS stream (e.g. YouTube resolved URL), proxy it
            val scheme = uri.scheme?.lowercase()
            if (scheme == "http" || scheme == "https") {
                proxyRemoteStream(uri.toString(), rangeHeader, method, output)
                return
            }

            // Determine MIME type
            val mimeType = try {
                context.contentResolver.getType(uri) ?: "video/mp4"
            } catch (e: Exception) {
                "video/mp4"
            }

            // Open ParcelFileDescriptor for direct channel seeking
            pfd = try {
                context.contentResolver.openFileDescriptor(uri, "r")
            } catch (e: Exception) {
                Log.e(tag, "Error opening PFD for $uri: ${e.message}")
                null
            }

            if (pfd == null) {
                val notFound = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                output.write(notFound.toByteArray())
                output.flush()
                return
            }

            val fis = FileInputStream(pfd.fileDescriptor)
            val channel = fis.channel
            val totalLength = channel.size().coerceAtLeast(1L)

            var startByte = 0L
            var endByte = totalLength - 1

            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                val rangeVal = rangeHeader.substring(6).trim()
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

            if (startByte >= totalLength) {
                val invalidRange = "HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */$totalLength\r\n\r\n"
                output.write(invalidRange.toByteArray())
                output.flush()
                return
            }

            if (endByte >= totalLength) {
                endByte = totalLength - 1
            }

            val contentLength = (endByte - startByte + 1).coerceAtLeast(0L)
            val isPartial = rangeHeader != null

            val statusLine = if (isPartial) "HTTP/1.1 206 Partial Content\r\n" else "HTTP/1.1 200 OK\r\n"
            val headers = StringBuilder().apply {
                append(statusLine)
                append("Content-Type: $mimeType\r\n")
                append("Accept-Ranges: bytes\r\n")
                append("Content-Length: $contentLength\r\n")
                if (isPartial) {
                    append("Content-Range: bytes $startByte-$endByte/$totalLength\r\n")
                }
                append("Connection: close\r\n\r\n")
            }.toString()

            output.write(headers.toByteArray())
            output.flush()

            if (method.equals("HEAD", ignoreCase = true)) {
                return
            }

            // Seek directly to start byte with hardware channel
            channel.position(startByte)
            val buffer = ByteArray(64 * 1024)
            var bytesRemaining = contentLength

            while (bytesRemaining > 0) {
                val toRead = minOf(buffer.size.toLong(), bytesRemaining).toInt()
                val bytesRead = fis.read(buffer, 0, toRead)
                if (bytesRead <= 0) break
                output.write(buffer, 0, bytesRead)
                bytesRemaining -= bytesRead
            }
            output.flush()
        } catch (e: Exception) {
            // Client disconnected or seek completed
        } finally {
            try {
                raf?.close()
            } catch (e: Exception) {}
            try {
                pfd?.close()
            } catch (e: Exception) {}
            try {
                socket.close()
            } catch (e: Exception) {}
        }
    }

    private fun streamFromFile(
        file: File,
        rangeHeader: String?,
        method: String,
        output: OutputStream
    ) {
        var raf: RandomAccessFile? = null
        try {
            raf = RandomAccessFile(file, "r")
            val totalLength = file.length().coerceAtLeast(1L)

            var startByte = 0L
            var endByte = totalLength - 1

            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                val rangeVal = rangeHeader.substring(6).trim()
                val parts = rangeVal.split("-")
                try {
                    if (parts[0].isNotEmpty()) {
                        startByte = parts[0].toLong()
                    }
                    if (parts.size > 1 && parts[1].isNotEmpty()) {
                        endByte = parts[1].toLong()
                    }
                } catch (e: Exception) {}
            }

            if (startByte >= totalLength) {
                val invalidRange = "HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */$totalLength\r\n\r\n"
                output.write(invalidRange.toByteArray())
                output.flush()
                return
            }

            if (endByte >= totalLength) {
                endByte = totalLength - 1
            }

            val contentLength = (endByte - startByte + 1).coerceAtLeast(0L)
            val isPartial = rangeHeader != null

            val statusLine = if (isPartial) "HTTP/1.1 206 Partial Content\r\n" else "HTTP/1.1 200 OK\r\n"
            val headers = StringBuilder().apply {
                append(statusLine)
                append("Content-Type: video/mp4\r\n")
                append("Accept-Ranges: bytes\r\n")
                append("Content-Length: $contentLength\r\n")
                if (isPartial) {
                    append("Content-Range: bytes $startByte-$endByte/$totalLength\r\n")
                }
                append("Connection: close\r\n\r\n")
            }.toString()

            output.write(headers.toByteArray())
            output.flush()

            if (method.equals("HEAD", ignoreCase = true)) return

            raf.seek(startByte)
            val buffer = ByteArray(64 * 1024)
            var bytesRemaining = contentLength
            while (bytesRemaining > 0) {
                val toRead = minOf(buffer.size.toLong(), bytesRemaining).toInt()
                val bytesRead = raf.read(buffer, 0, toRead)
                if (bytesRead <= 0) break
                output.write(buffer, 0, bytesRead)
                bytesRemaining -= bytesRead
            }
            output.flush()
        } catch (e: Exception) {
            // Client closed connection
        } finally {
            try {
                raf?.close()
            } catch (e: Exception) {}
        }
    }

    /**
     * Proxies remote HTTP/HTTPS video streams (e.g. YouTube stream URLs) to client sockets
     * with transparent Byte-Range passing.
     */
    private fun proxyRemoteStream(
        remoteUrl: String,
        rangeHeader: String?,
        method: String,
        output: OutputStream
    ) {
        var remoteConn: HttpURLConnection? = null
        try {
            var currentUrl = remoteUrl
            var redirectCount = 0

            while (redirectCount < 6) {
                val conn = (URL(currentUrl).openConnection() as HttpURLConnection).apply {
                    requestMethod = method
                    connectTimeout = 10000
                    readTimeout = 15000
                    instanceFollowRedirects = true
                    setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile; rv:124.0)")
                    if (!rangeHeader.isNullOrEmpty()) {
                        setRequestProperty("Range", rangeHeader)
                    }
                }

                val responseCode = conn.responseCode
                if (responseCode == 301 || responseCode == 302 || responseCode == 303 || responseCode == 307 || responseCode == 308) {
                    val location = conn.getHeaderField("Location")
                    conn.disconnect()
                    if (!location.isNullOrEmpty()) {
                        currentUrl = if (location.startsWith("http://", ignoreCase = true) || location.startsWith("https://", ignoreCase = true)) {
                            location
                        } else {
                            URL(URL(currentUrl), location).toString()
                        }
                        redirectCount++
                        continue
                    }
                }

                remoteConn = conn
                break
            }

            if (remoteConn == null) return

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
        } catch (e: Exception) {}
    }
}
