import { useEffect, useRef, useState } from "react";
import { useVault } from "@/app/providers/VaultProvider";
import { invoke } from "@tauri-apps/api/core";

export function useAutoLock() {
  const { lock, status } = useVault();
  const [intervalSetting, setIntervalSetting] = useState<string>("15m");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial settings
  useEffect(() => {
    if (status !== "unlocked") return;

    const fetchSettings = async () => {
      try {
        const settings = await invoke<{ auto_lock_interval: string }>(
          "get_settings"
        );
        setIntervalSetting(settings.auto_lock_interval);
      } catch (err) {
        console.error("Failed to load settings in auto-lock hook:", err);
      }
    };

    fetchSettings();

    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.auto_lock_interval) {
        setIntervalSetting(customEvent.detail.auto_lock_interval);
      }
    };

    globalThis.addEventListener("settings-changed", handleSettingsChanged);
    return () => {
      globalThis.removeEventListener("settings-changed", handleSettingsChanged);
    };
  }, [status]);

  // Handle auto lock timer
  useEffect(() => {
    if (status !== "unlocked") return;

    // Helper to get milliseconds from interval string
    const getTimeoutMs = (val: string): number => {
      switch (val) {
        case "1m":
          return 1 * 60 * 1000;
        case "5m":
          return 5 * 60 * 1000;
        case "15m":
          return 15 * 60 * 1000;
        case "30m":
          return 30 * 60 * 1000;
        case "1h":
          return 60 * 60 * 1000;
        default:
          return 0; // 'never' or 'immediate'
      }
    };

    const timeoutMs = getTimeoutMs(intervalSetting);

    // Setup window blur listener for 'immediate'
    const handleBlur = () => {
      if (intervalSetting === "immediate") {
        lock().catch(console.error);
      }
    };

    globalThis.addEventListener("blur", handleBlur);

    // If never or immediate, don't setup activity timer
    if (timeoutMs <= 0) {
      return () => {
        globalThis.removeEventListener("blur", handleBlur);
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lock().catch(console.error);
      }, timeoutMs);
    };

    // Initialize timer
    resetTimer();

    // Listen to user interaction events to reset timer
    const events = [
      "mousemove",
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
    ];
    events.forEach((evt) => globalThis.addEventListener(evt, resetTimer));

    return () => {
      globalThis.removeEventListener("blur", handleBlur);
      events.forEach((evt) => globalThis.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [intervalSetting, lock, status]);
}
