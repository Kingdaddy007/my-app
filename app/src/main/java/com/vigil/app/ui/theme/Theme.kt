package com.vigil.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

data class VigilExtraColors(
    val canvas: Color,
    val surface: Color,
    val raisedSurface: Color,
    val warmGapSurface: Color,
    val warmGapText: Color,
    val border: Color,
    val mintAccent: Color,
    val amberAccent: Color
)

val LocalVigilColors = staticCompositionLocalOf {
    VigilExtraColors(
        canvas = DarkCanvas,
        surface = DarkSurface,
        raisedSurface = DarkRaisedSurface,
        warmGapSurface = DarkWarmGapSurface,
        warmGapText = DarkWarmGapText,
        border = DarkBorder,
        mintAccent = MintAccent,
        amberAccent = AmberAccent
    )
}

private val DarkColorScheme = darkColorScheme(
    primary = DarkPrimaryAction,
    onPrimary = DarkOnPrimaryAction,
    primaryContainer = DarkRaisedSurface,
    onPrimaryContainer = DarkPrimaryText,
    secondary = MintAccent,
    onSecondary = DarkCanvas,
    background = DarkCanvas,
    onBackground = DarkPrimaryText,
    surface = DarkSurface,
    onSurface = DarkPrimaryText,
    surfaceVariant = DarkRaisedSurface,
    onSurfaceVariant = DarkSecondaryText,
    outline = DarkBorder
)

private val LightColorScheme = lightColorScheme(
    primary = LightPrimaryAction,
    onPrimary = LightOnPrimaryAction,
    primaryContainer = LightRaisedSurface,
    onPrimaryContainer = LightPrimaryText,
    secondary = EmeraldDeep,
    onSecondary = Color.White,
    background = LightCanvas,
    onBackground = LightPrimaryText,
    surface = LightSurface,
    onSurface = LightPrimaryText,
    surfaceVariant = LightRaisedSurface,
    onSurfaceVariant = LightSecondaryText,
    outline = LightBorder
)

@Composable
fun VigilTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val extraColors = if (darkTheme) {
        VigilExtraColors(
            canvas = DarkCanvas,
            surface = DarkSurface,
            raisedSurface = DarkRaisedSurface,
            warmGapSurface = DarkWarmGapSurface,
            warmGapText = DarkWarmGapText,
            border = DarkBorder,
            mintAccent = MintAccent,
            amberAccent = AmberAccent
        )
    } else {
        VigilExtraColors(
            canvas = LightCanvas,
            surface = LightSurface,
            raisedSurface = LightRaisedSurface,
            warmGapSurface = LightWarmGapSurface,
            warmGapText = LightWarmGapText,
            border = LightBorder,
            mintAccent = EmeraldDeep,
            amberAccent = AmberAccent
        )
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            WindowCompat.setDecorFitsSystemWindows(window, false)
            val insetsController = WindowCompat.getInsetsController(window, view)
            insetsController.isAppearanceLightStatusBars = !darkTheme
            insetsController.isAppearanceLightNavigationBars = !darkTheme
        }
    }

    CompositionLocalProvider(LocalVigilColors provides extraColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}

object VigilThemeExtensions {
    val colors: VigilExtraColors
        @Composable
        get() = LocalVigilColors.current
}
