package com.videowall.splicer.network

import android.content.Context
import android.net.wifi.WifiManager
import android.util.Log
import kotlinx.coroutines.*
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

/**
 * Lightweight UDP Beacon broadcaster on the Host and listener on the Client
 * allowing automatic discovery of Host IP over Wi-Fi & Hotspot networks.
 */
object DiscoveryService {
    private const val TAG = "DiscoveryService"
    const val DISCOVERY_PORT = 8989
    private const val BEACON_PREFIX = "SPLICER_HOST:"

    /**
     * Starts broadcasting the Host IP every 1 second.
     */
    fun startBroadcasting(scope: CoroutineScope, hostIp: String, tcpPort: Int = 8988, context: Context? = null): Job {
        return scope.launch(Dispatchers.IO) {
            var socket: DatagramSocket? = null
            try {
                socket = DatagramSocket()
                NetworkUtils.bindDatagramSocketToWifi(socket, context)
                socket.broadcast = true
                val message = "$BEACON_PREFIX$hostIp:$tcpPort"
                val data = message.toByteArray()

                // Target broadcast addresses
                val broadcastAddresses = listOf(
                    InetAddress.getByName("255.255.255.255"),
                    InetAddress.getByName("192.168.43.255"), // Android Hotspot broadcast
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
                Log.w(TAG, "Broadcast error: ${e.message}")
            } finally {
                socket?.close()
            }
        }
    }

    /**
     * Starts listening for Host broadcasts.
     */
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
                    } catch (e: Exception) {
                        // Timeout, loop again
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Discovery listener error: ${e.message}")
            } finally {
                socket?.close()
                try {
                    multicastLock?.let { if (it.isHeld) it.release() }
                } catch (e: Exception) {}
            }
        }
    }
}
