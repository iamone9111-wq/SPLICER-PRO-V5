package com.videowall.splicer.ui

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
import com.videowall.splicer.databinding.ActivityClientBinding
import com.videowall.splicer.databinding.ActivityHostBinding
import com.videowall.splicer.databinding.ActivityMainBinding
import com.videowall.splicer.network.*
import com.videowall.splicer.playback.SyncPlaybackController
import com.videowall.splicer.transform.MatrixTransformHelper
import kotlinx.coroutines.Job

// ==========================================
// 1. HOME SCREEN / ROLE SELECTION
// ==========================================
class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private var discoveryJob: Job? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Pre-fill Gateway if connected to Wi-Fi / Hotspot
        val gateway = NetworkUtils.getGatewayIpAddress(this)
        if (binding.inputHostIp.text.isNullOrEmpty()) {
            binding.inputHostIp.setText(gateway)
        }

        // Host option clicked
        val onHostClicked = {
            val intent = Intent(this, HostActivity::class.java)
            startActivity(intent)
        }
        binding.btnHost.setOnClickListener { onHostClicked() }
        binding.btnHostCard.setOnClickListener { onHostClicked() }

        // Preset Hotspot IP button
        binding.btnUseHotspotIp.setOnClickListener {
            binding.inputHostIp.setText("192.168.43.1")
            Toast.makeText(this, "Set to standard Android Hotspot Gateway (192.168.43.1)", Toast.LENGTH_SHORT).show()
        }

        // Join option clicked
        val onJoinClicked = {
            val hostIp = binding.inputHostIp.text.toString().trim()
            if (hostIp.isEmpty()) {
                Toast.makeText(this, "Please enter the Host IP Address shown on the Host screen", Toast.LENGTH_LONG).show()
            } else if (hostIp == "0.0.0.0" || hostIp == "127.0.0.1") {
                Toast.makeText(this, "⚠️ 0.0.0.0 is not a valid remote IP. Please check the Host IP displayed on the Host phone screen (e.g. 192.168.43.1)", Toast.LENGTH_LONG).show()
            } else {
                val intent = Intent(this, ClientActivity::class.java).apply {
                    putExtra("HOST_IP", hostIp)
                }
                startActivity(intent)
            }
        }

        binding.btnJoin.setOnClickListener { onJoinClicked() }
        binding.btnJoinCard.setOnClickListener { onJoinClicked() }

        // Start local UDP network discovery for Host beacons
        startAutoDiscovery()
    }

    private fun startAutoDiscovery() {
        discoveryJob = DiscoveryService.startListening(this, lifecycleScope) { hostIp, _ ->
            binding.tvAutoDiscoveryStatus.text = "✨ Discovered Host at: $hostIp"
            binding.tvAutoDiscoveryStatus.setTextColor(0xFF34D399.toInt()) // Emerald Green
            if (binding.inputHostIp.text.toString() == "192.168.43.1" || binding.inputHostIp.text.toString().isEmpty()) {
                binding.inputHostIp.setText(hostIp)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        discoveryJob?.cancel()
    }
}

// ==========================================
// 2. HOST / MASTER CONTROL SCREEN
// ==========================================
class HostActivity : AppCompatActivity() {
    private lateinit var binding: ActivityHostBinding
    private var server: VideoWallServer? = null
    private var mediaServer: LocalMediaHttpServer? = null
    private var beaconJob: Job? = null
    private var syncController: SyncPlaybackController? = null
    private var selectedVideoUri: Uri? = null
    private var videoWidth: Int = 1920
    private var videoHeight: Int = 1080
    
    // Dynamic Geometry State (Starts at 1 Screen for Host only, expands automatically as clients connect)
    private var screenCount: Int = 1
    private var gridRows: Int = 1
    private var gridCols: Int = 1
    private var scaleMode: ScaleMode = ScaleMode.COVER
    private var currentAspectRatioIndex: Int = 0
    private val aspectRatios = listOf("16:9 Landscape", "9:16 Portrait", "4:3 Standard", "1:1 Square", "Auto")

    private val videoPickerLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let {
            selectedVideoUri = it
            mediaServer?.setMediaUri(it)
            binding.tvSelectedVideo.text = it.lastPathSegment ?: "Video Selected"
            syncController?.prepareMedia(it)
            broadcastConfiguration()
            Toast.makeText(this, "🎬 Video loaded & ready to stream to all screens", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHostBinding.inflate(layoutInflater)
        setContentView(binding.root)
        hideSystemUI()

        val hostIp = getLocalIpAddress()
        binding.tvHostIp.text = "$hostIp:8988"
        binding.tvConnectedScreensCount.text = "1 Screen Active (Host only)"
        updateLayoutUI()

        // Start UDP Discovery Beacon so Client phones discover Host automatically
        beaconJob = DiscoveryService.startBroadcasting(lifecycleScope, hostIp, 8988)

        // Start embedded HTTP media server on port 8990 to stream video to all client phones
        mediaServer = LocalMediaHttpServer(this, 8990).apply { start() }

        syncController = SyncPlaybackController(this, binding.hostTextureView) { width, height ->
            videoWidth = width
            videoHeight = height
            updateMatrix()
            broadcastConfiguration()
        }

        server = VideoWallServer(
            port = 8988,
            onClientConnected = { count, clientIp ->
                runOnUiThread {
                    val totalScreens = count + 1 // 1 Host + count Clients
                    screenCount = totalScreens
                    if (gridRows == 1) gridCols = totalScreens
                    binding.tvConnectedScreensCount.text = "$totalScreens Screens Active (Host + $count Clients)"
                    updateLayoutUI()
                    updateMatrix()
                    broadcastConfiguration()
                    Toast.makeText(this@HostActivity, "📱 Client #$count joined ($clientIp)! Total Screens: $totalScreens", Toast.LENGTH_LONG).show()
                }
            },
            onClientDisconnected = { count ->
                runOnUiThread {
                    val totalScreens = count + 1
                    screenCount = totalScreens
                    if (gridRows == 1) gridCols = totalScreens
                    binding.tvConnectedScreensCount.text = "$totalScreens Screens Active (Host + $count Clients)"
                    updateLayoutUI()
                    updateMatrix()
                    broadcastConfiguration()
                    Toast.makeText(this@HostActivity, "📱 Client disconnected. Active screens: $totalScreens", Toast.LENGTH_SHORT).show()
                }
            },
            onHeartbeatReceived = { /* no-op */ }
        ).apply { start() }

        setupControls()
    }

    private fun setupControls() {
        binding.btnChangeRole.setOnClickListener {
            finish()
        }

        binding.btnSelectVideo.setOnClickListener {
            videoPickerLauncher.launch("video/*")
        }

        binding.btnPlayImmersion.setOnClickListener {
            startImmersionPlayback()
        }

        binding.btnPauseImmersion.setOnClickListener {
            syncController?.pause()
            server?.broadcastPause(syncController?.currentPositionMs ?: 0L)
            Toast.makeText(this, "⏸ Paused all screens", Toast.LENGTH_SHORT).show()
        }

        // Screen Count controls
        binding.btnDecreaseScreens.setOnClickListener {
            if (screenCount > 1) {
                screenCount--
                if (gridRows == 1) gridCols = screenCount
                updateLayoutUI()
                updateMatrix()
                broadcastConfiguration()
            }
        }
        binding.btnIncreaseScreens.setOnClickListener {
            if (screenCount < 16) {
                screenCount++
                if (gridRows == 1) gridCols = screenCount
                updateLayoutUI()
                updateMatrix()
                broadcastConfiguration()
            }
        }

        // Row Controls
        binding.btnDecreaseRows.setOnClickListener {
            if (gridRows > 1) {
                gridRows--
                screenCount = gridRows * gridCols
                updateLayoutUI()
                updateMatrix()
                broadcastConfiguration()
            }
        }
        binding.btnIncreaseRows.setOnClickListener {
            if (gridRows < 6) {
                gridRows++
                screenCount = gridRows * gridCols
                updateLayoutUI()
                updateMatrix()
                broadcastConfiguration()
            }
        }

        // Col Controls
        binding.btnDecreaseCols.setOnClickListener {
            if (gridCols > 1) {
                gridCols--
                screenCount = gridRows * gridCols
                updateLayoutUI()
                updateMatrix()
                broadcastConfiguration()
            }
        }
        binding.btnIncreaseCols.setOnClickListener {
            if (gridCols < 6) {
                gridCols++
                screenCount = gridRows * gridCols
                updateLayoutUI()
                updateMatrix()
                broadcastConfiguration()
            }
        }

        // Aspect Ratio Toggle
        binding.btnAspectRatio.setOnClickListener {
            currentAspectRatioIndex = (currentAspectRatioIndex + 1) % aspectRatios.size
            binding.tvAspectRatio.text = aspectRatios[currentAspectRatioIndex]
            updateMatrix()
            broadcastConfiguration()
        }

        // Scale Mode Toggle (Cover / Fit)
        binding.btnAppearance.setOnClickListener {
            scaleMode = if (scaleMode == ScaleMode.COVER) ScaleMode.FIT else ScaleMode.COVER
            binding.tvAppearance.text = if (scaleMode == ScaleMode.COVER) "COVER (Full)" else "FIT (Letterbox)"
            updateMatrix()
            broadcastConfiguration()
        }

        // Floating immersion controls
        binding.btnFloatingPause.setOnClickListener {
            val isPlaying = syncController?.isPlaying() == true
            if (isPlaying) {
                syncController?.pause()
                server?.broadcastPause(syncController?.currentPositionMs ?: 0L)
                binding.btnFloatingPause.text = "▶ Play"
            } else {
                val execTime = SystemClock.elapsedRealtime() + 300L
                syncController?.schedulePlay(syncController?.currentPositionMs ?: 0L, execTime)
                server?.broadcastPlay(syncController?.currentPositionMs ?: 0L, execTime)
                binding.btnFloatingPause.text = "⏸ Pause"
            }
        }

        binding.btnExitImmersion.setOnClickListener {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            binding.immersionOverlayControls.visibility = View.GONE
            binding.hostSettingsScrollView.visibility = View.VISIBLE
            hideSystemUI()
        }
    }

    private fun startImmersionPlayback() {
        if (selectedVideoUri == null) {
            Toast.makeText(this, "Please select a video file first", Toast.LENGTH_SHORT).show()
            return
        }

        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        binding.hostSettingsScrollView.visibility = View.GONE
        binding.immersionOverlayControls.visibility = View.VISIBLE
        hideSystemUI()

        val executionEpoch = SystemClock.elapsedRealtime() + 400L
        syncController?.schedulePlay(0L, executionEpoch)
        server?.broadcastPlay(0L, executionEpoch)
        Toast.makeText(this, "🚀 Synchronized playback started on $screenCount screens!", Toast.LENGTH_SHORT).show()
    }

    private fun updateLayoutUI() {
        binding.tvTotalScreensValue.text = screenCount.toString()
        binding.tvRowsValue.text = gridRows.toString()
        binding.tvColsValue.text = gridCols.toString()
        binding.tvLiveWallDimensions.text = "${gridRows}R × ${gridCols}C ($screenCount SCREENS)"

        // Update visual wall preview tiles
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
                val tile = inflater.inflate(com.videowall.splicer.R.layout.item_screen_preview_tile, rowLayout, false)
                val tvTitle = tile.findViewById<android.widget.TextView>(com.videowall.splicer.R.id.tvTileTitle)
                val tvCoord = tile.findViewById<android.widget.TextView>(com.videowall.splicer.R.id.tvTileCoords)

                val displayScreenNum = index + 1
                if (index == 0) {
                    tvTitle.text = "Screen 1 (Host)"
                    tile.setBackgroundColor(0xFF4F46E5.toInt()) // Indigo
                } else {
                    tvTitle.text = "Screen $displayScreenNum"
                    tile.setBackgroundColor(0xFF1E293B.toInt()) // Slate
                }
                tvCoord.text = "[R$r:C$c]"
                
                val params = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 1.0f).apply {
                    setMargins(3, 3, 3, 3)
                }
                tile.layoutParams = params
                rowLayout.addView(tile)
            }
            binding.liveWallGridContainer.addView(rowLayout)
        }
    }

    private fun updateMatrix() {
        val viewW = binding.hostTextureView.width.toFloat()
        val viewH = binding.hostTextureView.height.toFloat()
        if (viewW > 0 && viewH > 0) {
            MatrixTransformHelper.applySpliceTransform(
                textureView = binding.hostTextureView,
                row = 0,
                col = 0,
                totalRows = gridRows,
                totalCols = gridCols,
                scaleMode = scaleMode,
                videoWidth = videoWidth,
                videoHeight = videoHeight,
                viewWidth = viewW,
                viewHeight = viewH,
                rotationDeg = 0
            )
        }
    }

    private fun broadcastConfiguration() {
        val hostIp = getLocalIpAddress()
        val httpStreamUrl = "http://$hostIp:8990/video.mp4"
        server?.broadcastConfiguration(
            rows = gridRows,
            cols = gridCols,
            scaleMode = scaleMode,
            mediaUri = httpStreamUrl,
            videoWidth = videoWidth,
            videoHeight = videoHeight
        )
    }

    private fun getLocalIpAddress(): String {
        return NetworkUtils.getLocalIpAddress(this)
    }

    private fun hideSystemUI() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        beaconJob?.cancel()
        syncController?.release()
        server?.stop()
        mediaServer?.stop()
    }
}

// ==========================================
// 3. CLIENT / SLAVE DISPLAY SCREEN
// ==========================================
class ClientActivity : AppCompatActivity() {
    private lateinit var binding: ActivityClientBinding
    private var client: VideoWallClient? = null
    private var syncController: SyncPlaybackController? = null
    private var videoWidth: Int = 1920
    private var videoHeight: Int = 1080
    private var currentRole: SyncMessage.AssignRole? = null
    private var currentHostIp: String = "192.168.43.1"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityClientBinding.inflate(layoutInflater)
        setContentView(binding.root)
        hideSystemUI()

        currentHostIp = intent.getStringExtra("HOST_IP") ?: "192.168.43.1"

        syncController = SyncPlaybackController(this, binding.clientTextureView) { width, height ->
            videoWidth = width
            videoHeight = height
            currentRole?.let { applyMatrix(it) }
        }

        setupErrorCardButtons()
        startConnection(currentHostIp)
    }

    private fun setupErrorCardButtons() {
        binding.btnRetryHotspot.setOnClickListener {
            binding.cardConnectionError.visibility = View.GONE
            startConnection("192.168.43.1")
        }

        binding.btnRetryOriginal.setOnClickListener {
            binding.cardConnectionError.visibility = View.GONE
            startConnection(currentHostIp)
        }

        binding.btnBackToEnterIp.setOnClickListener {
            finish()
        }
    }

    private fun startConnection(targetIp: String) {
        currentHostIp = targetIp
        binding.cardConnectionError.visibility = View.GONE
        binding.tvScreenIndex.text = "Connecting to $targetIp:8988..."

        client?.disconnect()
        client = VideoWallClient(
            hostIp = targetIp,
            port = 8988,
            fallbackIp = "192.168.43.1",
            onConnected = { connectedHost ->
                runOnUiThread {
                    currentHostIp = connectedHost
                    binding.cardConnectionError.visibility = View.GONE
                    Toast.makeText(this@ClientActivity, "✅ Successfully connected to Host at $connectedHost!", Toast.LENGTH_LONG).show()
                }
            },
            onConnectionFailed = { errorMsg, attemptedIp ->
                runOnUiThread {
                    binding.cardConnectionError.visibility = View.VISIBLE
                    binding.tvErrorMessage.text = "Could not connect to Host ($attemptedIp:8988).\nError: $errorMsg"
                    Toast.makeText(this@ClientActivity, "❌ Connection failed to $attemptedIp:8988", Toast.LENGTH_LONG).show()
                }
            },
            onRoleAssigned = { role ->
                currentRole = role
                val screenNum = role.deviceIndex + 1
                runOnUiThread {
                    binding.tvScreenIndex.text = "Screen #$screenNum of ${role.totalDevices} (Row ${role.row + 1}, Col ${role.col + 1})"
                    binding.tvIdentifyBigNumber.text = "$screenNum"
                    Toast.makeText(this@ClientActivity, "📱 Configured as Screen #$screenNum of ${role.totalDevices}", Toast.LENGTH_SHORT).show()
                }
                applyMatrix(role)
            },
            onMediaPrepared = { media ->
                runOnUiThread {
                    Toast.makeText(this@ClientActivity, "🎬 Media stream buffered from Host", Toast.LENGTH_SHORT).show()
                    syncController?.prepareMedia(Uri.parse(media.mediaUri))
                }
            },
            onPlayScheduled = { startPositionMs, localExecutionTimeMs ->
                runOnUiThread {
                    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                    syncController?.schedulePlay(startPositionMs, localExecutionTimeMs)
                    binding.layoutClientStatus.visibility = View.GONE
                }
            },
            onPause = { positionMs ->
                runOnUiThread {
                    syncController?.pause()
                    binding.layoutClientStatus.visibility = View.VISIBLE
                }
            },
            onSeekScheduled = { targetPositionMs, localExecutionTimeMs ->
                syncController?.seekTo(targetPositionMs)
            },
            onSyncOffsetUpdated = { offsetMs, rttMs ->
                runOnUiThread {
                    binding.tvSyncTelemetry.text = "Offset: ${offsetMs}ms | RTT: ${rttMs}ms"
                }
            },
            onIdentify = { displayIndex, durationMs ->
                runOnUiThread {
                    binding.tvIdentifyBigNumber.text = displayIndex.toString()
                    binding.identifyOverlay.visibility = View.VISIBLE
                    binding.identifyOverlay.postDelayed({
                        binding.identifyOverlay.visibility = View.GONE
                    }, durationMs)
                }
            }
        ).apply { connect() }
    }

    private fun applyMatrix(role: SyncMessage.AssignRole) {
        val viewW = binding.clientTextureView.width.toFloat()
        val viewH = binding.clientTextureView.height.toFloat()
        if (viewW > 0 && viewH > 0) {
            MatrixTransformHelper.applySpliceTransform(
                textureView = binding.clientTextureView,
                row = role.row,
                col = role.col,
                totalRows = role.totalRows,
                totalCols = role.totalCols,
                scaleMode = role.scaleMode,
                videoWidth = videoWidth,
                videoHeight = videoHeight,
                viewWidth = viewW,
                viewHeight = viewH,
                rotationDeg = role.rotationDeg
            )
        }
    }

    private fun hideSystemUI() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        syncController?.release()
        client?.disconnect()
    }
}
