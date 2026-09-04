package com.videowall.splicer.ui

import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.graphics.Color
import android.media.MediaMetadataRetriever
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkRequest
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.SeekBar
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.videowall.splicer.R
import com.videowall.splicer.databinding.ActivityClientBinding
import com.videowall.splicer.databinding.ActivityHostBinding
import com.videowall.splicer.databinding.ActivityMainBinding
import com.videowall.splicer.network.*
import com.videowall.splicer.playback.SyncPlaybackController
import com.videowall.splicer.transform.MatrixTransformHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

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

        NetworkUtils.bindProcessToWifi(this)

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
            binding.tvAutoDiscoveryStatus.setTextColor(Color.parseColor("#34D399")) // Emerald Green
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
    private var scaleMode: ScaleMode = ScaleMode.CONTAIN
    private var deviceOrientation: DeviceOrientation = DeviceOrientation.HORIZONTAL
    private var bezelPercent: Float = 3.5f
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var activeVideoSource: String = "file"

    private val progressHandler = Handler(Looper.getMainLooper())
    private var isUserSeeking = false
    private val progressRunnable = object : Runnable {
        override fun run() {
            if (!isUserSeeking && syncController?.isPlaying() == true) {
                val current = syncController?.currentPositionMs ?: 0L
                val duration = syncController?.durationMs ?: 0L
                if (duration > 0) {
                    val progress = ((current.toDouble() / duration.toDouble()) * 1000).toInt()
                    binding.immersionSeekBar.progress = progress
                    val curStr = formatTime(current)
                    val durStr = formatTime(duration)
                    binding.tvImmersionTime.text = "$curStr / $durStr"
                }
            }
            progressHandler.postDelayed(this, 250)
        }
    }

    // Auto-dissolve timer for Immersion Playback Controls
    private val controlsDissolveHandler = Handler(Looper.getMainLooper())
    private val controlsDissolveRunnable = Runnable {
        dissolveImmersionControls()
    }

    private fun scheduleControlsDissolve(delayMs: Long = 2000L) {
        controlsDissolveHandler.removeCallbacks(controlsDissolveRunnable)
        controlsDissolveHandler.postDelayed(controlsDissolveRunnable, delayMs)
    }

    private fun dissolveImmersionControls() {
        if (binding.immersionOverlayControls.visibility == View.VISIBLE) {
            binding.immersionOverlayControls.animate()
                .alpha(0f)
                .setDuration(250)
                .withEndAction {
                    binding.immersionOverlayControls.visibility = View.GONE
                }
                .start()
        }
    }

    private fun showImmersionControls() {
        controlsDissolveHandler.removeCallbacks(controlsDissolveRunnable)
        binding.immersionOverlayControls.visibility = View.VISIBLE
        binding.immersionOverlayControls.animate()
            .alpha(1f)
            .setDuration(150)
            .start()
        scheduleControlsDissolve(2000L)
    }

    private fun toggleImmersionControls() {
        // Only active when in immersion mode
        if (binding.hostSettingsScrollView.visibility == View.GONE) {
            if (binding.immersionOverlayControls.visibility == View.VISIBLE && binding.immersionOverlayControls.alpha > 0.1f) {
                controlsDissolveHandler.removeCallbacks(controlsDissolveRunnable)
                dissolveImmersionControls()
            } else {
                showImmersionControls()
            }
        }
    }

    private fun formatTime(ms: Long): String {
        val totalSec = (ms / 1000).coerceAtLeast(0)
        val minutes = totalSec / 60
        val seconds = totalSec % 60
        return String.format("%02d:%02d", minutes, seconds)
    }

    private val videoPickerLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let {
            selectedVideoUri = it
            mediaServer?.setMediaUri(it)
            extractAndApplyVideoMetadata(it)
            syncController?.prepareMedia(it)
        }
    }

    private fun extractAndApplyVideoMetadata(uri: Uri) {
        try {
            val retriever = MediaMetadataRetriever()
            retriever.setDataSource(this, uri)
            val wStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
            val hStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)
            val rotStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)
            retriever.release()

            val rawW = wStr?.toIntOrNull() ?: 1920
            val rawH = hStr?.toIntOrNull() ?: 1080
            val rot = rotStr?.toIntOrNull() ?: 0

            val actualW = if (rot == 90 || rot == 270) rawH else rawW
            val actualH = if (rot == 90 || rot == 270) rawW else rawH

            videoWidth = actualW
            videoHeight = actualH

            val ratioText = when {
                actualW == actualH -> "1:1 Square"
                actualW * 9 == actualH * 16 -> "16:9 Landscape"
                actualW * 16 == actualH * 9 -> "9:16 Portrait"
                actualW * 3 == actualH * 4 -> "4:3 Standard"
                actualW * 4 == actualH * 3 -> "3:4 Portrait"
                actualW > actualH -> String.format("%.2f:1 Landscape", actualW.toFloat() / actualH)
                else -> String.format("1:%.2f Portrait", actualH.toFloat() / actualW)
            }

            binding.tvSelectedVideo.text = "🎬 ${actualW}×${actualH} ($ratioText) • Stream Ready"
            updateMatrix()
            broadcastConfiguration()
        } catch (e: Exception) {
            Log.e("HostActivity", "Error extracting video metadata: ${e.message}")
            binding.tvSelectedVideo.text = uri.lastPathSegment ?: "Video Selected"
            broadcastConfiguration()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHostBinding.inflate(layoutInflater)
        setContentView(binding.root)
        hideSystemUI()

        // Unbind process network restrictions so the Host can freely use Cellular Data / Internet
        // for resolving and streaming YouTube videos, while ServerSockets bind to 0.0.0.0 for LAN clients.
        NetworkUtils.clearProcessNetworkBinding(this)

        val hostIp = getLocalIpAddress()
        binding.tvHostIp.text = "$hostIp:8988"
        binding.tvHostNetworkStatus.text = if (hostIp == "192.168.43.1") {
            "Mobile Hotspot Active • Clients connect here"
        } else {
            "Local Wi-Fi Active • Port 8988"
        }
        binding.tvConnectedScreensCount.text = "1 Screen Active (Host only)"
        binding.tvAppearance.text = "🎯 REAL RATIO (Fit)"
        updateLayoutUI()

        // Register dynamic network change listener so if the host turns on Mobile Data or Hotspot,
        // the Host IP and beacon update smoothly with zero disconnection.
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        try {
            val request = NetworkRequest.Builder().build()
            networkCallback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    runOnUiThread { refreshHostNetwork(false) }
                }
                override fun onLost(network: Network) {
                    runOnUiThread { refreshHostNetwork(false) }
                }
            }
            cm?.registerNetworkCallback(request, networkCallback!!)
        } catch (e: Exception) {
            Log.w("HostActivity", "Network callback registration error: ${e.message}")
        }

        // Start UDP Discovery Beacon so Client phones discover Host automatically
        beaconJob = DiscoveryService.startBroadcasting(lifecycleScope, hostIp, 8988, this)

        // Start embedded HTTP media server on port 8990 to stream video to all client phones
        mediaServer = LocalMediaHttpServer(this, 8990).apply { start() }

        binding.hostTextureView.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ ->
            updateMatrix()
        }

        syncController = SyncPlaybackController(this, binding.hostTextureView) { width, height ->
            if (width > 0 && height > 0) {
                videoWidth = width
                videoHeight = height
                runOnUiThread {
                    val ratioText = when {
                        width == height -> "1:1 Square"
                        width * 9 == height * 16 -> "16:9 Landscape"
                        width * 16 == height * 9 -> "9:16 Portrait"
                        width * 3 == height * 4 -> "4:3 Standard"
                        width * 4 == height * 3 -> "3:4 Portrait"
                        width > height -> String.format("%.2f:1 Landscape", width.toFloat() / height)
                        else -> String.format("1:%.2f Portrait", height.toFloat() / width)
                    }
                    binding.tvSelectedVideo.text = "🎬 ${width}×${height} ($ratioText) • Stream Ready"
                    updateMatrix()
                    broadcastConfiguration()
                }
            }
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

        // Network IP manual refresh
        binding.btnRefreshHostIp.setOnClickListener {
            refreshHostNetwork(true)
        }

        // Video Source Tab Switching
        binding.btnTabDeviceVideo.setOnClickListener {
            activeVideoSource = "file"
            binding.layoutDeviceVideoSection.visibility = View.VISIBLE
            binding.layoutYoutubeSection.visibility = View.GONE
            binding.btnTabDeviceVideo.setBackgroundColor(Color.parseColor("#4F46E5"))
            binding.btnTabDeviceVideo.setTextColor(Color.WHITE)
            binding.btnTabYoutube.setBackgroundColor(Color.parseColor("#1E293B"))
            binding.btnTabYoutube.setTextColor(Color.parseColor("#94A3B8"))
        }

        binding.btnTabYoutube.setOnClickListener {
            activeVideoSource = "youtube"
            binding.layoutDeviceVideoSection.visibility = View.GONE
            binding.layoutYoutubeSection.visibility = View.VISIBLE
            binding.btnTabYoutube.setBackgroundColor(Color.parseColor("#DC2626"))
            binding.btnTabYoutube.setTextColor(Color.WHITE)
            binding.btnTabDeviceVideo.setBackgroundColor(Color.parseColor("#1E293B"))
            binding.btnTabDeviceVideo.setTextColor(Color.parseColor("#94A3B8"))
        }

        // Local Device Video Picker
        binding.btnSelectVideo.setOnClickListener {
            videoPickerLauncher.launch("video/*")
        }

        // YouTube URL Action Handlers
        binding.btnPasteYoutube.setOnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
            val clipData = clipboard?.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                val pasted = clipData.getItemAt(0).text?.toString()?.trim() ?: ""
                if (pasted.isNotEmpty()) {
                    binding.etYoutubeUrl.setText(pasted)
                }
            } else {
                Toast.makeText(this, "Clipboard is empty", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnClearYoutube.setOnClickListener {
            binding.etYoutubeUrl.setText("")
        }

        binding.btnLoadYoutube.setOnClickListener {
            val url = binding.etYoutubeUrl.text.toString().trim()
            if (url.isEmpty()) {
                Toast.makeText(this, "Please enter or paste a YouTube URL", Toast.LENGTH_SHORT).show()
            } else {
                loadRemoteVideo(url)
            }
        }

        // Preset Sample Buttons
        binding.btnPresetSample1.setOnClickListener {
            val url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            binding.etYoutubeUrl.setText(url)
            loadRemoteVideo(url)
        }

        binding.btnPresetSample2.setOnClickListener {
            val url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
            binding.etYoutubeUrl.setText(url)
            loadRemoteVideo(url)
        }

        binding.btnPresetSample3.setOnClickListener {
            val url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4"
            binding.etYoutubeUrl.setText(url)
            loadRemoteVideo(url)
        }

        binding.btnPlayImmersion.setOnClickListener {
            startImmersionPlayback()
        }

        binding.btnPauseImmersion.setOnClickListener {
            togglePlayPause()
        }

        binding.btnFloatingPause.setOnClickListener {
            togglePlayPause()
            scheduleControlsDissolve(2000L)
        }

        // Tap screen in immersion mode to toggle HUD controls
        binding.hostTextureView.setOnClickListener {
            toggleImmersionControls()
        }

        // Interacting with overlay controls keeps them active
        binding.immersionOverlayControls.setOnTouchListener { _, _ ->
            scheduleControlsDissolve(2000L)
            false
        }

        // Immersion Video Progress Scrubber
        val seekBarListener = object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser) {
                    val duration = syncController?.durationMs ?: 0L
                    val targetMs = ((progress / 1000f) * duration).toLong()
                    val curStr = formatTime(targetMs)
                    val durStr = formatTime(duration)
                    binding.tvImmersionTime.text = "$curStr / $durStr"
                }
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) {
                isUserSeeking = true
                controlsDissolveHandler.removeCallbacks(controlsDissolveRunnable)
            }

            override fun onStopTrackingTouch(seekBar: SeekBar?) {
                isUserSeeking = false
                val progress = seekBar?.progress ?: 0
                val duration = syncController?.durationMs ?: 0L
                val targetMs = ((progress / 1000f) * duration).toLong()

                val wasPlaying = syncController?.isPlaying() == true
                syncController?.seekTo(targetMs)
                server?.broadcastSeek(targetMs)

                if (wasPlaying) {
                    val execTime = SystemClock.elapsedRealtime() + 150L
                    syncController?.schedulePlay(targetMs, execTime)
                    server?.broadcastPlay(targetMs, execTime, deviceOrientation, bezelPercent, scaleMode)
                }
                scheduleControlsDissolve(2000L)
            }
        }
        binding.immersionSeekBar.setOnSeekBarChangeListener(seekBarListener)

        // 10s Rewind / Forward Controls in Immersion HUD
        binding.btnImmersionRewind10.setOnClickListener {
            val target = syncController?.seekRelative(-10000L) ?: 0L
            server?.broadcastSeek(target)
            if (syncController?.isPlaying() == true) {
                val exec = SystemClock.elapsedRealtime() + 150L
                syncController?.schedulePlay(target, exec)
                server?.broadcastPlay(target, exec, deviceOrientation, bezelPercent, scaleMode)
            }
            scheduleControlsDissolve(2000L)
        }

        binding.btnImmersionForward10.setOnClickListener {
            val target = syncController?.seekRelative(10000L) ?: 0L
            server?.broadcastSeek(target)
            if (syncController?.isPlaying() == true) {
                val exec = SystemClock.elapsedRealtime() + 150L
                syncController?.schedulePlay(target, exec)
                server?.broadcastPlay(target, exec, deviceOrientation, bezelPercent, scaleMode)
            }
            scheduleControlsDissolve(2000L)
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

        // Device Placement Toggle (Vertical / Horizontal)
        binding.btnDevicePlacement.setOnClickListener {
            deviceOrientation = if (deviceOrientation == DeviceOrientation.HORIZONTAL) {
                DeviceOrientation.VERTICAL
            } else {
                DeviceOrientation.HORIZONTAL
            }
            binding.tvDevicePlacement.text = if (deviceOrientation == DeviceOrientation.HORIZONTAL) {
                "📱 Placed Horizontally (Landscape)"
            } else {
                "📱 Placed Vertically (Portrait)"
            }
            updateLayoutUI()
            updateMatrix()
            broadcastConfiguration()
        }

        // Scale Mode Toggle (Real Ratio / Full Wall Cover / Stretch)
        binding.btnAppearance.setOnClickListener {
            scaleMode = when (scaleMode) {
                ScaleMode.CONTAIN -> ScaleMode.COVER
                ScaleMode.COVER -> ScaleMode.STRETCH
                ScaleMode.STRETCH -> ScaleMode.CONTAIN
                else -> ScaleMode.CONTAIN
            }
            binding.tvAppearance.text = when (scaleMode) {
                ScaleMode.CONTAIN -> "🎯 REAL RATIO (Fit)"
                ScaleMode.COVER -> "🖼️ FULL WALL (Cover)"
                ScaleMode.STRETCH -> "📐 STRETCH (Fill)"
                else -> "🎯 REAL RATIO (Fit)"
            }
            updateMatrix()
            broadcastConfiguration()
        }

        // Mobile Bezel Compensation Toggle (0%, 2%, 3.5%, 6%)
        binding.btnBezelCompensation.setOnClickListener {
            bezelPercent = when (bezelPercent) {
                3.5f -> 6.0f
                6.0f -> 0.0f
                0.0f -> 2.0f
                2.0f -> 3.5f
                else -> 3.5f
            }
            binding.tvBezelCompensation.text = when (bezelPercent) {
                0.0f -> "🚫 Bezel Compensation: OFF (0%)"
                2.0f -> "📱 Ultra-Slim Bezels (2.0%)"
                3.5f -> "✨ Seamless Mobile Bezels (3.5%)"
                6.0f -> "📐 Wide Phone Bezels (6.0%)"
                else -> "✨ Bezel: ${bezelPercent}%"
            }
            updateMatrix()
            broadcastConfiguration()
        }

        binding.btnExitImmersion.setOnClickListener {
            controlsDissolveHandler.removeCallbacks(controlsDissolveRunnable)
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            binding.immersionOverlayControls.visibility = View.GONE
            binding.hostSettingsScrollView.visibility = View.VISIBLE
            hideSystemUI()
        }
    }

    private fun togglePlayPause() {
        val isPlaying = syncController?.isPlaying() == true
        if (isPlaying) {
            val pausePos = syncController?.currentPositionMs ?: 0L
            syncController?.pause()
            server?.broadcastPause(pausePos)
            updatePlayPauseButtonStates(false)
        } else {
            val resumePos = syncController?.currentPositionMs ?: 0L
            val execTime = SystemClock.elapsedRealtime() + 150L
            syncController?.schedulePlay(resumePos, execTime)
            server?.broadcastPlay(resumePos, execTime, deviceOrientation, bezelPercent, scaleMode)
            updatePlayPauseButtonStates(true)
        }
    }

    private fun updatePlayPauseButtonStates(isPlaying: Boolean) {
        if (isPlaying) {
            binding.btnFloatingPause.text = "⏸ Pause"
            binding.btnFloatingPause.setBackgroundColor(Color.parseColor("#EF4444"))
            binding.btnPauseImmersion.setImageResource(R.drawable.ic_pause)
        } else {
            binding.btnFloatingPause.text = "▶ Play"
            binding.btnFloatingPause.setBackgroundColor(Color.parseColor("#2563EB"))
            binding.btnPauseImmersion.setImageResource(R.drawable.ic_play_arrow)
        }
    }

    private fun startImmersionPlayback() {
        if (selectedVideoUri == null) {
            val msg = if (activeVideoSource == "youtube") {
                "Please enter and load a YouTube video URL first"
            } else {
                "Please select a video file first"
            }
            Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
            return
        }

        // Lock strictly to the configured device placement so all screens match perfectly
        if (deviceOrientation == DeviceOrientation.VERTICAL) {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        } else {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        }

        binding.hostSettingsScrollView.visibility = View.GONE
        showImmersionControls()
        hideSystemUI()

        // Resume from current position instead of resetting to 0, with fast 150ms execution epoch
        val resumePos = syncController?.currentPositionMs ?: 0L
        val executionEpoch = SystemClock.elapsedRealtime() + 150L
        syncController?.schedulePlay(resumePos, executionEpoch)
        server?.broadcastPlay(resumePos, executionEpoch, deviceOrientation, bezelPercent, scaleMode)
        updatePlayPauseButtonStates(true)
        binding.hostTextureView.post {
            updateMatrix()
        }
        Toast.makeText(this, "🚀 Synchronized playback started on $screenCount screens!", Toast.LENGTH_SHORT).show()
    }

    private fun updateLayoutUI() {
        binding.tvTotalScreensValue.text = screenCount.toString()
        binding.tvRowsValue.text = gridRows.toString()
        binding.tvColsValue.text = gridCols.toString()
        val orientLabel = if (deviceOrientation == DeviceOrientation.HORIZONTAL) "Landscape" else "Portrait"
        binding.tvLiveWallDimensions.text = "${gridRows}R × ${gridCols}C ($screenCount SCREENS • $orientLabel)"

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
                    tile.setBackgroundColor(Color.parseColor("#4F46E5")) // Indigo
                } else {
                    tvTitle.text = "Screen $displayScreenNum"
                    tile.setBackgroundColor(Color.parseColor("#1E293B")) // Slate
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
                bezelPercent = bezelPercent,
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
            videoHeight = videoHeight,
            deviceOrientation = deviceOrientation,
            bezelPercent = bezelPercent
        )
    }

    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        binding.hostTextureView.post {
            updateMatrix()
        }
    }

    private fun loadRemoteVideo(url: String) {
        binding.btnLoadYoutube.isEnabled = false
        binding.btnLoadYoutube.text = "⏳ Resolving Video Stream..."
        binding.tvSelectedVideo.text = "🔍 Contacting stream server..."
        activeVideoSource = "youtube"

        lifecycleScope.launch(Dispatchers.Main) {
            val result = YouTubeStreamResolver.resolveStream(url) { statusMsg ->
                lifecycleScope.launch(Dispatchers.Main) {
                    binding.tvSelectedVideo.text = "⏳ $statusMsg"
                }
            }
            result.onSuccess { resolved ->
                val streamUri = Uri.parse(resolved.streamUrl)
                selectedVideoUri = streamUri
                videoWidth = resolved.width
                videoHeight = resolved.height

                mediaServer?.setMediaUri(streamUri)
                syncController?.prepareMedia(streamUri)

                val ratioText = when {
                    videoWidth == videoHeight -> "1:1 Square"
                    videoWidth * 9 == videoHeight * 16 -> "16:9 Landscape"
                    videoWidth * 16 == videoHeight * 9 -> "9:16 Portrait"
                    videoWidth * 3 == videoHeight * 4 -> "4:3 Standard"
                    videoWidth * 4 == videoHeight * 3 -> "3:4 Portrait"
                    videoWidth > videoHeight -> String.format("%.2f:1 Landscape", videoWidth.toFloat() / videoHeight)
                    else -> String.format("1:%.2f Portrait", videoHeight.toFloat() / videoWidth)
                }

                binding.tvSelectedVideo.text = "🎬 ${resolved.title} • ${resolved.width}×${resolved.height} ($ratioText) • Stream Ready"
                updateMatrix()
                broadcastConfiguration()
            }.onFailure { err ->
                Log.e("HostActivity", "Failed to resolve stream: ${err.message}", err)
                binding.tvSelectedVideo.text = "⚠️ Failed: ${err.message}"
                Toast.makeText(this@HostActivity, "Error: ${err.message}", Toast.LENGTH_LONG).show()
            }
            binding.btnLoadYoutube.isEnabled = true
            binding.btnLoadYoutube.text = "⚡ Load & Sync YouTube to All Screens"
        }
    }

    private fun refreshHostNetwork(showToast: Boolean) {
        val hostIp = getLocalIpAddress()
        binding.tvHostIp.text = "$hostIp:8988"
        binding.tvHostNetworkStatus.text = if (hostIp == "192.168.43.1") {
            "Mobile Hotspot Active • Clients connect here"
        } else {
            "Local Wi-Fi Active • Port 8988"
        }

        beaconJob?.cancel()
        beaconJob = DiscoveryService.startBroadcasting(lifecycleScope, hostIp, 8988, this)
        broadcastConfiguration()
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

    override fun onResume() {
        super.onResume()
        progressHandler.post(progressRunnable)
    }

    override fun onPause() {
        super.onPause()
        progressHandler.removeCallbacks(progressRunnable)
    }

    override fun onDestroy() {
        super.onDestroy()
        progressHandler.removeCallbacks(progressRunnable)
        try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            networkCallback?.let { cm?.unregisterNetworkCallback(it) }
        } catch (e: Exception) {
            // Ignore
        }
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
    private var currentDeviceOrientation: DeviceOrientation = DeviceOrientation.HORIZONTAL

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityClientBinding.inflate(layoutInflater)
        setContentView(binding.root)
        hideSystemUI()

        NetworkUtils.bindProcessToWifi(this)
        currentHostIp = intent.getStringExtra("HOST_IP") ?: "192.168.43.1"

        binding.clientTextureView.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ ->
            currentRole?.let { applyMatrix(it) }
        }

        syncController = SyncPlaybackController(this, binding.clientTextureView) { width, height ->
            if (width > 0 && height > 0) {
                videoWidth = width
                videoHeight = height
                runOnUiThread {
                    currentRole?.let { applyMatrix(it) }
                }
            }
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
        NetworkUtils.bindProcessToWifi(this)
        currentHostIp = targetIp
        binding.cardConnectionError.visibility = View.GONE
        binding.tvScreenIndex.text = "Connecting to $targetIp:8988..."

        client?.disconnect()
        client = VideoWallClient(
            context = this,
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
                currentDeviceOrientation = role.deviceOrientation
                if (role.videoWidth > 0 && role.videoHeight > 0) {
                    videoWidth = role.videoWidth
                    videoHeight = role.videoHeight
                }
                val screenNum = role.deviceIndex + 1
                runOnUiThread {
                    // Lock strictly to the placement orientation so screens cannot desync or drift
                    requestedOrientation = if (role.deviceOrientation == DeviceOrientation.VERTICAL) {
                        ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                    } else {
                        ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                    }
                    val orientText = if (role.deviceOrientation == DeviceOrientation.VERTICAL) "Vertical (Portrait)" else "Horizontal (Landscape)"
                    binding.tvScreenIndex.text = "Screen #$screenNum of ${role.totalDevices} (Row ${role.row + 1}, Col ${role.col + 1}) • $orientText"
                    binding.tvIdentifyBigNumber.text = "$screenNum"
                    binding.clientTextureView.post {
                        applyMatrix(role)
                    }
                }
            },
            onMediaPrepared = { media ->
                runOnUiThread {
                    syncController?.prepareMedia(Uri.parse(media.mediaUri))
                }
            },
            onPlayScheduled = { startPositionMs, localExecutionTimeMs, orientation, bezel, scaleMode ->
                runOnUiThread {
                    currentDeviceOrientation = orientation
                    // Enforce orientation synchronization across all screens
                    requestedOrientation = if (orientation == DeviceOrientation.VERTICAL) {
                        ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                    } else {
                        ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                    }
                    currentRole = currentRole?.copy(
                        scaleMode = scaleMode,
                        deviceOrientation = orientation,
                        bezelPercent = bezel
                    )
                    syncController?.schedulePlay(startPositionMs, localExecutionTimeMs)
                    binding.layoutClientStatus.visibility = View.GONE
                    binding.clientTextureView.post {
                        currentRole?.let { applyMatrix(it) }
                    }
                }
            },
            onPause = { pausePositionMs ->
                runOnUiThread {
                    syncController?.pauseAndSeek(pausePositionMs)
                    binding.layoutClientStatus.visibility = View.VISIBLE
                }
            },
            onSeekScheduled = { targetPositionMs, _ ->
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
        val vW = if (role.videoWidth > 0) role.videoWidth else videoWidth
        val vH = if (role.videoHeight > 0) role.videoHeight else videoHeight
        if (viewW > 0 && viewH > 0) {
            MatrixTransformHelper.applySpliceTransform(
                textureView = binding.clientTextureView,
                row = role.row,
                col = role.col,
                totalRows = role.totalRows,
                totalCols = role.totalCols,
                scaleMode = role.scaleMode,
                videoWidth = vW,
                videoHeight = vH,
                viewWidth = viewW,
                viewHeight = viewH,
                bezelPercent = role.bezelPercent,
                rotationDeg = role.rotationDeg
            )
        }
    }

    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        binding.clientTextureView.post {
            currentRole?.let { applyMatrix(it) }
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
