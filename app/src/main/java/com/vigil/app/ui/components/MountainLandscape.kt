package com.vigil.app.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import com.vigil.app.ui.theme.MintAccent
import com.vigil.app.ui.theme.SunGlow

@Composable
fun MountainLandscape(
    modifier: Modifier = Modifier,
    isRunning: Boolean = false,
    reducedMotion: Boolean = false,
    darkTheme: Boolean = isSystemInDarkTheme()
) {
    val infiniteTransition = rememberInfiniteTransition(label = "mountain_atmosphere")

    val sunPulse by if (isRunning && !reducedMotion) {
        infiniteTransition.animateFloat(
            initialValue = 0.85f,
            targetValue = 1.15f,
            animationSpec = infiniteRepeatable(
                animation = tween(4000, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "sun_pulse"
        )
    } else {
        androidx.compose.runtime.remember { androidx.compose.runtime.mutableFloatStateOf(1.0f) }
    }

    val skyColors = if (darkTheme) {
        listOf(
            Color(0xFF0A1218),
            Color(0xFF13222B),
            Color(0xFF1E3542)
        )
    } else {
        listOf(
            Color(0xFFD6E2DD),
            Color(0xFFE4EDE9),
            Color(0xFFF4F6F5)
        )
    }

    val sunColor = if (darkTheme) SunGlow else Color(0xFFF59E0B)
    val sunGlowColor = if (darkTheme) SunGlow.copy(alpha = 0.25f) else Color(0xFFFCD34D).copy(alpha = 0.35f)

    // Ridge colors layered front-to-back
    val farRidgeColor = if (darkTheme) Color(0xFF182A34) else Color(0xFFBACCC3)
    val midRidgeColor = if (darkTheme) Color(0xFF122028) else Color(0xFFA5BBB1)
    val nearRidgeColor = if (darkTheme) Color(0xFF0C161C) else Color(0xFF8DA69B)
    val mistColor = if (darkTheme) Color(0xFF101B22).copy(alpha = 0.6f) else Color(0xFFF4F6F5).copy(alpha = 0.5f)

    Box(modifier = modifier) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height

            // 1. Atmospheric Sky Gradient
            drawRect(
                brush = Brush.verticalGradient(
                    colors = skyColors,
                    startY = 0f,
                    endY = h
                )
            )

            // 2. Rising Sun Disc with luminous ambient glow
            val sunCenterX = w * 0.5f
            val sunCenterY = h * 0.46f
            val baseSunRadius = h * 0.16f
            val dynamicRadius = baseSunRadius * sunPulse

            // Soft radial glow aura
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        sunGlowColor,
                        sunGlowColor.copy(alpha = 0.08f),
                        Color.Transparent
                    ),
                    center = Offset(sunCenterX, sunCenterY),
                    radius = dynamicRadius * 2.2f
                ),
                radius = dynamicRadius * 2.2f,
                center = Offset(sunCenterX, sunCenterY)
            )

            // Sun Core
            drawCircle(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        sunColor.copy(alpha = if (darkTheme) 0.95f else 0.85f),
                        sunColor.copy(alpha = 0.65f)
                    ),
                    startY = sunCenterY - dynamicRadius,
                    endY = sunCenterY + dynamicRadius
                ),
                radius = dynamicRadius,
                center = Offset(sunCenterX, sunCenterY)
            )

            // 3. Far Mountain Ridge (Silhouettes behind the sun)
            val farPath = Path().apply {
                moveTo(0f, h * 0.58f)
                cubicTo(w * 0.2f, h * 0.52f, w * 0.35f, h * 0.44f, w * 0.52f, h * 0.50f)
                cubicTo(w * 0.68f, h * 0.55f, w * 0.82f, h * 0.47f, w, h * 0.54f)
                lineTo(w, h)
                lineTo(0f, h)
                close()
            }
            drawPath(path = farPath, color = farRidgeColor, style = Fill)

            // 4. Soft valley mist
            drawRect(
                brush = Brush.verticalGradient(
                    colors = listOf(Color.Transparent, mistColor, Color.Transparent),
                    startY = h * 0.50f,
                    endY = h * 0.68f
                )
            )

            // 5. Mid Mountain Ridge (Layered depth with sharper peaks)
            val midPath = Path().apply {
                moveTo(0f, h * 0.68f)
                lineTo(w * 0.18f, h * 0.58f)
                lineTo(w * 0.36f, h * 0.66f)
                lineTo(w * 0.58f, h * 0.55f)
                lineTo(w * 0.78f, h * 0.67f)
                lineTo(w, h * 0.60f)
                lineTo(w, h)
                lineTo(0f, h)
                close()
            }
            drawPath(path = midPath, color = midRidgeColor, style = Fill)

            // 6. Near Mountain Ridge (Foreground grounding)
            val nearPath = Path().apply {
                moveTo(0f, h * 0.76f)
                cubicTo(w * 0.22f, h * 0.68f, w * 0.42f, h * 0.74f, w * 0.64f, h * 0.67f)
                cubicTo(w * 0.82f, h * 0.62f, w * 0.92f, h * 0.70f, w, h * 0.72f)
                lineTo(w, h)
                lineTo(0f, h)
                close()
            }
            drawPath(path = nearPath, color = nearRidgeColor, style = Fill)

            // 7. Base fade into surface color
            val baseFadeColor = if (darkTheme) Color(0xFF0C141A) else Color(0xFFF4F6F5)
            drawRect(
                brush = Brush.verticalGradient(
                    colors = listOf(Color.Transparent, baseFadeColor.copy(alpha = 0.85f), baseFadeColor),
                    startY = h * 0.75f,
                    endY = h
                )
            )
        }
    }
}
