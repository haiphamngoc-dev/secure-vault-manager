/**
 * @file i18n config.ts
 * @description Internationalization configuration for the application.
 * Integrates i18next with React and handles language synchronization with the Tauri system tray.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import sharedEn from "@/shared/i18n/en.json";
import sharedVi from "@/shared/i18n/vi.json";
import { invoke } from "@tauri-apps/api/core";

/**
 * Translation resource dictionaries for English (en) and Vietnamese (vi).
 */
const resources = {
  en: {
    translation: {
      ...sharedEn,
    },
  },
  vi: {
    translation: {
      ...sharedVi,
    },
  },
};

// Initialize i18next with React integration and English/Vietnamese defaults
i18n.use(initReactI18next).init({
  resources,
  lng: "vi", // Default to Vietnamese for tauri-password-manager
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes values to prevent XSS
  },
});

/**
 * Checks if the current environment is running inside the Tauri shell window container.
 */
const isTauri =
  globalThis.window !== undefined && "__TAURI_INTERNALS__" in globalThis.window;

// If running in Tauri, synchronize language updates to native tray menu items
if (isTauri) {
  /**
   * Helper function to notify Tauri backend to update tray menu text based on current language.
   * @param lng The language code (e.g., 'en', 'vi')
   */
  const syncTrayLang = (lng: string) => {
    if (!lng) {
      return;
    }
    const normalized = lng.split("-")[0].toLowerCase();
    if (normalized === "vi" || normalized === "en") {
      invoke("set_tray_menu_lang", { lang: normalized }).catch(console.error);
    }
  };

  // Initial sync delay on startup to ensure backend tray system is fully ready
  setTimeout(() => {
    const currentLang = i18n.language || "vi";
    syncTrayLang(currentLang);
  }, 250);

  // Synchronize language updates on future language changes
  i18n.on("languageChanged", (lng) => {
    syncTrayLang(lng);
  });
}

export default i18n;
