package com.videowall.splicer.ui

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import androidx.fragment.app.DialogFragment
import com.videowall.splicer.R
import com.videowall.splicer.network.ScaleMode
import com.videowall.splicer.network.VideoWallServer
import com.videowall.splicer.network.WallOrientation

class HostSetupWizardDialog(
    private val server: VideoWallServer,
    private val connectedClientsCount: Int,
    private val onConfigurationApplied: (screenCount: Int, orientation: WallOrientation, rows: Int, cols: Int, scaleMode: ScaleMode) -> Unit
) : DialogFragment() {

    private var currentStep = 1
    private var screenCount = maxOf(connectedClientsCount + 1, 3)
    private var orientation = WallOrientation.HORIZONTAL
    private var gridRows = 1
    private var gridCols = screenCount
    private var scaleMode = ScaleMode.COVER

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val root = inflater.inflate(R.layout.dialog_host_setup_wizard, container, false)
        setupViews(root)
        return root
    }

    private fun setupViews(root: View) {
        val tvStepTitle = root.findViewById<TextView>(R.id.tvStepTitle)
        val tvStepDesc = root.findViewById<TextView>(R.id.tvStepDesc)
        val tvStepCounter = root.findViewById<TextView>(R.id.tvStepCounter)

        val step1 = root.findViewById<ViewGroup>(R.id.step1Container)
        val step2 = root.findViewById<ViewGroup>(R.id.step2Container)
        val step3 = root.findViewById<ViewGroup>(R.id.step3Container)
        val step4 = root.findViewById<ViewGroup>(R.id.step4Container)

        val tvScreenCount = root.findViewById<TextView>(R.id.tvScreenCount)
        val tvDetected = root.findViewById<TextView>(R.id.tvDetectedClientsNotice)
        val btnAdd = root.findViewById<Button>(R.id.btnAddScreen)
        val btnRemove = root.findViewById<Button>(R.id.btnRemoveScreen)

        val rgOrientation = root.findViewById<RadioGroup>(R.id.rgOrientation)
        val tvArrangement = root.findViewById<TextView>(R.id.tvArrangementSummary)
        val btnIdentify = root.findViewById<Button>(R.id.btnIdentifyScreens)

        val rgScaleMode = root.findViewById<RadioGroup>(R.id.rgScaleMode)

        val btnBack = root.findViewById<Button>(R.id.btnBack)
        val btnNext = root.findViewById<Button>(R.id.btnNext)

        // Step 1 logic
        tvDetected.text = "🟢 Connected Client Devices: $connectedClientsCount found (${connectedClientsCount + 1} total with Host)"
        tvScreenCount.text = "$screenCount Screens"

        btnAdd.setOnClickListener {
            if (screenCount < 16) {
                screenCount++
                tvScreenCount.text = "$screenCount Screens"
                updateGeometry()
            }
        }

        btnRemove.setOnClickListener {
            if (screenCount > 1) {
                screenCount--
                tvScreenCount.text = "$screenCount Screens"
                updateGeometry()
            }
        }

        // Step 2 logic
        rgOrientation.setOnCheckedChangeListener { _, checkedId ->
            orientation = when (checkedId) {
                R.id.rbVertical -> WallOrientation.VERTICAL
                R.id.rbGrid -> WallOrientation.GRID
                else -> WallOrientation.HORIZONTAL
            }
            updateGeometry()
        }

        // Step 3 logic
        btnIdentify.setOnClickListener {
            server.broadcastIdentify(-1, 3000L)
        }

        // Step 4 logic
        rgScaleMode.setOnCheckedChangeListener { _, checkedId ->
            scaleMode = when (checkedId) {
                R.id.rbContain -> ScaleMode.CONTAIN
                R.id.rbStretch -> ScaleMode.STRETCH
                else -> ScaleMode.COVER
            }
        }

        // Navigation
        btnNext.setOnClickListener {
            if (currentStep < 4) {
                currentStep++
                updateStepUI(tvStepTitle, tvStepDesc, tvStepCounter, step1, step2, step3, step4, btnNext, btnBack, tvArrangement)
            } else {
                applyAndDismiss()
            }
        }

        btnBack.setOnClickListener {
            if (currentStep > 1) {
                currentStep--
                updateStepUI(tvStepTitle, tvStepDesc, tvStepCounter, step1, step2, step3, step4, btnNext, btnBack, tvArrangement)
            } else {
                dismiss()
            }
        }
    }

    private fun updateGeometry() {
        when (orientation) {
            WallOrientation.HORIZONTAL -> {
                gridRows = 1
                gridCols = screenCount
            }
            WallOrientation.VERTICAL -> {
                gridRows = screenCount
                gridCols = 1
            }
            WallOrientation.GRID -> {
                gridCols = kotlin.math.ceil(kotlin.math.sqrt(screenCount.toDouble())).toInt().coerceAtLeast(1)
                gridRows = kotlin.math.ceil(screenCount.toDouble() / gridCols).toInt().coerceAtLeast(1)
            }
        }
    }

    private fun updateStepUI(
        title: TextView,
        desc: TextView,
        counter: TextView,
        s1: ViewGroup,
        s2: ViewGroup,
        s3: ViewGroup,
        s4: ViewGroup,
        btnNext: Button,
        btnBack: Button,
        tvArrangement: TextView
    ) {
        s1.visibility = if (currentStep == 1) View.VISIBLE else View.GONE
        s2.visibility = if (currentStep == 2) View.VISIBLE else View.GONE
        s3.visibility = if (currentStep == 3) View.VISIBLE else View.GONE
        s4.visibility = if (currentStep == 4) View.VISIBLE else View.GONE

        counter.text = "$currentStep / 4"
        btnBack.text = if (currentStep == 1) "Cancel" else "Back"

        when (currentStep) {
            1 -> {
                title.text = "Step 1: Screen Count"
                desc.text = "How many screens are connected to this video wall?"
                btnNext.text = "Continue"
            }
            2 -> {
                title.text = "Step 2: Video Playback & Division"
                desc.text = "How would you like to divide & slice the video?"
                btnNext.text = "Continue"
            }
            3 -> {
                title.text = "Step 3: Screen Arrangement"
                desc.text = "Map which physical phone is on the Left, Center, Right or Top/Bottom."
                btnNext.text = "Continue"
                updateGeometry()
                val summary = StringBuilder()
                for (i in 0 until screenCount) {
                    val label = if (i == 0) "Host (Master)" else "Client $i"
                    val (r, c) = when (orientation) {
                        WallOrientation.HORIZONTAL -> Pair(0, i)
                        WallOrientation.VERTICAL -> Pair(i, 0)
                        WallOrientation.GRID -> Pair(i / gridCols, i % gridCols)
                    }
                    summary.append("Slot ${i + 1} [Row $r, Col $c] ➔ $label\n")
                }
                tvArrangement.text = summary.toString().trim()
            }
            4 -> {
                title.text = "Step 4: Aspect Ratio & Fit Mode"
                desc.text = "Select Cover (full bleed), Contain (letterbox), or Stretch."
                btnNext.text = "Apply & Divide Video"
            }
        }
    }

    private fun applyAndDismiss() {
        updateGeometry()
        server.configureWall(
            screenCount = screenCount,
            orientation = orientation,
            rows = gridRows,
            cols = gridCols,
            scaleMode = scaleMode
        )
        onConfigurationApplied(screenCount, orientation, gridRows, gridCols, scaleMode)
        dismiss()
    }
}
