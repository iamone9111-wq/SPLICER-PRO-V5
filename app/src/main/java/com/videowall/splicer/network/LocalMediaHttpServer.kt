package com.videowall.splicer.network

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
                val notFound = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n"
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

    fun stop() {
        serverScope.cancel()
        try {
            serverSocket?.close()
        } catch (e: Exception) {
            // Ignore
        }
    }
}
