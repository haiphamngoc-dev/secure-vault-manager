/**
 * @file App.tsx
 * @description Main root application component.
 * Integrates the application providers with the router outlet tree.
 */

import { useEffect } from "react";
import { AppProvider } from "@/app/providers/AppProvider";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/routes/AppRoutes";
import { invoke } from "@tauri-apps/api/core";
import { AppSettings } from "@/features/settings/routes/SettingsPage";

export function App() {
  useEffect(() => {
    let settingsCache = { hold_shortcut_to_reveal: false };

    // Load settings initially
    invoke<AppSettings>("get_settings")
      .then((res) => {
        if (res) {
          settingsCache = res;
        }
      })
      .catch(console.error);

    // Listen to settings-changed to update cache dynamically
    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        settingsCache = customEvent.detail;
      }
    };
    globalThis.addEventListener("settings-changed", handleSettingsChanged);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (settingsCache.hold_shortcut_to_reveal && e.ctrlKey && e.altKey) {
        globalThis.dispatchEvent(
          new CustomEvent("reveal-concealed-fields", { detail: true })
        );
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.altKey) {
        globalThis.dispatchEvent(
          new CustomEvent("reveal-concealed-fields", { detail: false })
        );
      }
    };

    const handleBlur = () => {
      globalThis.dispatchEvent(
        new CustomEvent("reveal-concealed-fields", { detail: false })
      );
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      globalThis.removeEventListener("settings-changed", handleSettingsChanged);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}

export default App;
