package com.vigil.app.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.vigil.app.ui.theme.AmberAccent
import com.vigil.app.ui.theme.MintAccent

enum class TimerStatus {
    IDLE,
    RUNNING,
    PAUSED,
    TARGET_REACHED
}

@Composable
fun TimerHalo(
    status: TimerStatus,
    targetProgress: Float? = null,
    reducedMotion: Boolean = false,
    size: Dp = 260.dp,
    content: @Composable () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "halo_transition")

    val haloAlpha by if (status == TimerStatus.RUNNING && !reducedMotion) {
        infiniteTransition.animateFloat(
            initialValue = 0.35f,
            targetValue = 0.85f,
            animationSpec = infiniteRepeatable(
                animation = tween(3000, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "halo_breath"
        )
    } else {
        androidx.compose.runtime.remember(status) {
            androidx.compose.runtime.mutableFloatStateOf(
                when (status) {
                    TimerStatus.RUNNING -> 0.7f
                    TimerStatus.PAUSED -> 0.4f
                    TimerStatus.TARGET_REACHED -> 0.9f
                    TimerStatus.IDLE -> 0.15f
                }
            )
        }
    }

    val haloColor = when (status) {
        TimerStatus.RUNNING -> MintAccent
        TimerStatus.PAUSED -> AmberAccent
        TimerStatus.TARGET_REACHED -> AmberAccent
        TimerStatus.IDLE -> Color.Gray
    }

    Box(
        modifier = Modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(size)) {
            val strokeWidth = 3.dp.toPx()
            val outerGlowRadius = this.size.minDimension / 2 - strokeWidth

            // Subtle luminous back ring
            drawCircle(
                color = haloColor.copy(alpha = 0.12f),
                radius = outerGlowRadius,
                style = Stroke(width = strokeWidth * 2)
            )

            // Dynamic halo arc or progress
            if (targetProgress != null && targetProgress > 0f) {
                // If user set an optional target, show actual progress ring
                val sweep = (targetProgress.coerceIn(0f, 1f)) * 360f
                drawArc(
                    color = haloColor.copy(alpha = haloAlpha),
                    startAngle = -90f,
                    sweepAngle = sweep,
                    useCenter = false,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                )
            } else {
                // Unlimited stopwatch state halo
                drawCircle(
                    color = haloColor.copy(alpha = haloAlpha),
                    radius = outerGlowRadius,
                    style = Stroke(width = strokeWidth)
                )
            }
        }

        content()
    }
}
