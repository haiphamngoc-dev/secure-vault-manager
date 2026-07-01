/**
 * @file AppLayout.tsx
 * @description Application layout wrapper.
 * Provides a borderless shell container for custom titlebars, resizers, and client views.
 */

import { Box } from "@mantine/core";
import classes from "./AppLayout.module.css";
import { Outlet } from "react-router-dom";
import { TitleBar } from "./components/TitleBar";
import ResizeHandles from "./components/ResizeHandles";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { useVault } from "@/app/providers/VaultProvider";
import { OnboardingPage } from "@/features/onboarding";
import { VaultSelectionPage } from "@/features/dashboard/routes/VaultSelectionPage";

/**
 * Reference to the current Tauri window instance.
 */
const appWindow = getCurrentWindow();

/**
 * AppLayout component serves as the wrapper shell for the Tauri application.
 * Manages maximization checks to conditionally render window resizing handles.
 *
 * @returns {JSX.Element} The layout wrapper React element.
 */
export function AppLayout() {
  const [isMaximized, setIsMaximized] = useState(false);
  const { status, checkVaultStatus } = useVault();

  useEffect(() => {
    // Check if window is maximized initially
    const checkMaximizedState = async () => {
      const state = await appWindow.isMaximized();
      setIsMaximized(state);
    };

    checkMaximizedState();

    // Listen to resize events to sync maximization state
    const unlistenMaximized = appWindow.onResized(() => {
      checkMaximizedState();
    });

    // Clean up event listener on unmount
    return () => {
      unlistenMaximized.then((fn) => fn());
    };
  }, []);

  return (
    <Box
      className={`${classes.wrapper} ${isMaximized ? classes.maximized : ""}`}
    >
      {/* Resizing borders are only active when the window is not maximized */}
      {!isMaximized && <ResizeHandles />}

      {/* Render the application custom title bar */}
      <TitleBar
        onMenuClick={() =>
          window.dispatchEvent(new CustomEvent("open-mobile-sidebar"))
        }
      />

      {/* Route Outlet child view container */}
      <Box className={classes.content}>
        {status === "uninitialized" && (
          <OnboardingPage onSuccess={checkVaultStatus} />
        )}
        {status === "locked" && <VaultSelectionPage />}
        {status === "unlocked" && <Outlet />}
      </Box>
    </Box>
  );
}

export default AppLayout;
