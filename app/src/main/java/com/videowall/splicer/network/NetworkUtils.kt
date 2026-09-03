package com.videowall.splicer.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.DhcpInfo
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.text.format.Formatter
import android.util.Log
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.Socket
import java.util.Collections

object NetworkUtils {
    private const val TAG = "NetworkUtils"

    // Disallowed / non-routable interface prefixes (Cellular data, loopback, virtual containers)
    private val CELLULAR_AND_VIRTUAL_PREFIXES = listOf(
        "rmnet", "ccmni", "pdp", "wwan", "clat", "dummy", "radio", 
        "v4-rmnet", "seth", "cellular", "mobile", "data", "epdg", "rev_rmnet",
        "lo", "tun", "tap", "ppp", "docker", "vbox"
    )

    /**
     * Binds the application process to the active Wi-Fi or Hotspot network interface.
     * Use on CLIENT devices to ensure their socket connection targets the local Hotspot/Wi-Fi,
     * even if the client has mobile data enabled.
     * Do NOT call this on the HOST when host needs cellular internet to fetch YouTube videos.
     */
    fun bindProcessToWifi(context: Context?) {
        if (context == null) return
        try {
            val cm = context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
            for (network in cm.allNetworks) {
                val caps = cm.getNetworkCapabilities(network) ?: continue
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                    cm.bindProcessToNetwork(network)
                    Log.d(TAG, "Bound process network routing directly to Wi-Fi/Ethernet Network ($network)")
                    return
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "bindProcessToWifi failed: ${e.message}")
        }
    }

    /**
     * Clears any active process-wide network binding so the default Android routing rules apply.
     * Crucial on the HOST device so cellular internet traffic (for YouTube streaming) flows freely
     * while local sockets bind to 0.0.0.0 for LAN clients.
     */
    fun clearProcessNetworkBinding(context: Context?) {
        if (context == null) return
        try {
            val cm = context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            cm?.bindProcessToNetwork(null)
            Log.d(TAG, "Cleared process network binding (default multi-network routing enabled)")
        } catch (e: Exception) {
            Log.w(TAG, "clearProcessNetworkBinding failed: ${e.message}")
        }
    }

    /**
     * Explicitly binds a TCP Socket to the Wi-Fi Network or local Wi-Fi interface address,
     * ensuring it connects to local IPs (like 192.168.43.1) even when Mobile Data is ON.
     */
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
                Log.w(TAG, "bindSocket to Wi-Fi failed: ${e.message}")
            }
        }

        // Secondary fallback: Bind locally to Wi-Fi / Hotspot interface IP
        try {
            if (!socket.isBound) {
                val validIps = getValidLocalIpv4Addresses()
                val wifiIp = validIps.firstOrNull { it.interfaceName.startsWith("wlan", ignoreCase = true) }
                    ?: validIps.firstOrNull { it.interfaceName.startsWith("ap", ignoreCase = true) || it.interfaceName.contains("softap", ignoreCase = true) }
                    ?: validIps.firstOrNull()
                if (wifiIp != null) {
                    socket.bind(InetSocketAddress(InetAddress.getByName(wifiIp.ip), 0))
                    Log.d(TAG, "Bound socket locally to ${wifiIp.ip} (${wifiIp.interfaceName})")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Local IP socket bind fallback failed: ${e.message}")
        }
    }

    /**
     * Explicitly binds a UDP DatagramSocket to the Wi-Fi Network.
     */
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
                Log.w(TAG, "bindDatagramSocket to Wi-Fi failed: ${e.message}")
            }
        }
    }

    /**
     * Resolves the true local IPv4 address of the Android device.
     * Strictly filters out cellular/carrier CGNAT interfaces (like rmnet_data0: 10.x.x.x or 100.x.x.x)
     * so devices always use the Wi-Fi or Hotspot interface for local networking.
     */
    @Suppress("DEPRECATION")
    fun getLocalIpAddress(context: Context? = null): String {
        val validIps = getValidLocalIpv4Addresses()
        if (validIps.isNotEmpty()) {
            // Prioritize Android Mobile Hotspot (192.168.43.1) or AP interface first so clients can connect immediately
            val hotspotIp = validIps.firstOrNull { it.ip == "192.168.43.1" }
                ?: validIps.firstOrNull { it.interfaceName.startsWith("ap", ignoreCase = true) || it.interfaceName.contains("softap", ignoreCase = true) || it.interfaceName.contains("swlan", ignoreCase = true) }
                ?: validIps.firstOrNull { it.interfaceName.startsWith("wlan", ignoreCase = true) }
                ?: validIps.firstOrNull { it.interfaceName.startsWith("rndis", ignoreCase = true) || it.interfaceName.startsWith("eth", ignoreCase = true) }
                ?: validIps.first()
            Log.d(TAG, "Selected primary LAN IP: ${hotspotIp.ip} on interface ${hotspotIp.interfaceName}")
            return hotspotIp.ip
        }

        // Fallback to legacy WifiManager if available and valid
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
                Log.w(TAG, "WifiManager fallback failed: ${e.message}")
            }
        }

        // Standard Android Tethering / Mobile Hotspot default gateway IP
        return "192.168.43.1"
    }

    /**
     * Resolves the gateway IP when this device is a client connected to a Wi-Fi Hotspot.
     * Typically "192.168.43.1" when connected to another Android phone's hotspot.
     */
    @Suppress("DEPRECATION")
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
                Log.w(TAG, "Failed reading DHCP gateway: ${e.message}")
            }
        }
        return "192.168.43.1"
    }

    data class InterfaceIp(val interfaceName: String, val ip: String)

    /**
     * Returns all active non-cellular, non-loopback local IPv4 addresses.
     */
    fun getValidLocalIpv4Addresses(): List<InterfaceIp> {
        val result = mutableListOf<InterfaceIp>()
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                if (!intf.isUp || intf.isLoopback) continue
                
                // Exclude cellular data interfaces
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
            Log.e(TAG, "Error enumerating network interfaces: ${e.message}", e)
        }
        return result
    }

    private fun isValidLocalIp(ip: String): Boolean {
        if (ip.isEmpty() || ip == "0.0.0.0" || ip == "127.0.0.1" || ip.contains(":")) {
            return false
        }
        // Exclude loopback and link-local (169.254.x.x)
        if (ip.startsWith("127.") || ip.startsWith("169.254.")) {
            return false
        }
        // Exclude carrier CGNAT ranges (100.64.0.0/10: 100.64.x.x - 100.127.x.x) commonly used by mobile data
        if (ip.startsWith("100.")) {
            val parts = ip.split(".")
            if (parts.size >= 2) {
                val secondOctet = parts[1].toIntOrNull() ?: 0
                if (secondOctet in 64..127) {
                    return false
                }
            }
        }
        return true
    }
}
