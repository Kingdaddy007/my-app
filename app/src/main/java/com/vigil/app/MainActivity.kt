package com.vigil.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.vigil.app.domain.NotificationHelper
import com.vigil.app.ui.components.NavTab
import com.vigil.app.ui.components.VigilBottomNavBar
import com.vigil.app.ui.screens.onboarding.OnboardingScreen
import com.vigil.app.ui.screens.review.ReviewScreen
import com.vigil.app.ui.screens.settings.SettingsScreen
import com.vigil.app.ui.screens.timeline.TimelineScreen
import com.vigil.app.ui.screens.today.TodayScreen
import com.vigil.app.ui.theme.VigilTheme
import com.vigil.app.ui.theme.VigilThemeExtensions
import com.vigil.app.ui.viewmodel.FocusTimerViewModel
import com.vigil.app.ui.viewmodel.VigilViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: VigilViewModel by viewModels()
    private val focusTimerViewModel: FocusTimerViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        NotificationHelper.createNotificationChannels(this)

        setContent {
            val settings by viewModel.settings.collectAsState()

            val isSystemDark = isSystemInDarkTheme()
            val useDarkTheme = when (settings.themePreference) {
                "light" -> false
                "dark" -> true
                else -> isSystemDark
            }

            VigilTheme(darkTheme = useDarkTheme) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = VigilThemeExtensions.colors.canvas
                ) {
                    val hasCompletedOnboarding = settings.hasCompletedOnboarding

                    if (!hasCompletedOnboarding) {
                        OnboardingScreen(
                            onComplete = { displayName ->
                                viewModel.completeOnboarding(displayName)
                            }
                        )
                    } else {
                        MainAppContent(
                            viewModel = viewModel,
                            focusTimerViewModel = focusTimerViewModel
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun MainAppContent(
    viewModel: VigilViewModel,
    focusTimerViewModel: FocusTimerViewModel
) {
    var currentTab by remember { mutableStateOf(NavTab.TODAY) }
    var showSettings by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
        if (showSettings) {
            SettingsScreen(
                viewModel = viewModel,
                onBackClick = { showSettings = false }
            )
        } else {
            Crossfade(
                targetState = currentTab,
                animationSpec = tween(durationMillis = 200),
                label = "tabCrossfade"
            ) { tab ->
                when (tab) {
                    NavTab.TODAY -> TodayScreen(
                        viewModel = viewModel,
                        focusTimerViewModel = focusTimerViewModel,
                        onNavigateToTimeline = { currentTab = NavTab.TIMELINE }
                    )
                    NavTab.TIMELINE -> TimelineScreen(viewModel = viewModel)
                    NavTab.REVIEW -> ReviewScreen(viewModel = viewModel)
                }
            }

            // Translucent Floating Bottom Navigation Bar
            VigilBottomNavBar(
                selectedTab = currentTab,
                onTabSelected = { currentTab = it },
                onOpenSettings = { showSettings = true },
                modifier = Modifier.align(Alignment.BottomCenter)
            )
        }
    }
}
