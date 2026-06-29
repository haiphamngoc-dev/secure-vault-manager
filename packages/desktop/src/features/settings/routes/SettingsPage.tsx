import { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Text,
  SegmentedControl,
  Select,
  TextInput,
  Button,
  Group,
  ActionIcon,
  Badge,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { useMediaQuery, useClipboard } from "@mantine/hooks";
import {
  IconLanguage,
  IconLock,
  IconLink,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { MainHeader } from "@/shared/layouts/components/MainHeader";
import classes from "./SettingsPage.module.css";

interface AppSettings {
  lang: string;
  auto_lock_interval: string;
  extension_id: string | null;
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const clipboard = useClipboard();
  const { openMobileSidebar } = useOutletContext<{
    openMobileSidebar: () => void;
  }>();

  const [settings, setSettings] = useState<AppSettings>({
    lang: "vi",
    auto_lock_interval: "15m",
    extension_id: "",
  });

  const [pairingKey, setPairingKey] = useState<string>("");
  const [isPairing, setIsPairing] = useState<boolean>(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await invoke<AppSettings>("get_settings");
        setSettings({
          ...res,
          extension_id: res.extension_id || "",
        });
      } catch (err) {
        console.error("Failed to load settings from Rust:", err);
      }
    };
    loadSettings();
  }, []);

  // Update settings in state and save to Rust config file
  const updateSetting = async (
    key: keyof AppSettings,
    value: string | null
  ) => {
    const newSettings = {
      ...settings,
      [key]: value,
    };
    setSettings(newSettings);

    try {
      await invoke("save_settings", { settings: newSettings });

      if (key === "lang" && value) {
        i18n.changeLanguage(value);
      }

      globalThis.dispatchEvent(
        new CustomEvent("settings-changed", { detail: newSettings })
      );

      notifications.show({
        title: t("saveSuccess", "Cập nhật cài đặt thành công!"),
        message: "",
        color: "indigo",
        autoClose: 2000,
      });
    } catch (err) {
      console.error("Failed to save settings to Rust:", err);
      notifications.show({
        title: "Lỗi",
        message: "Không thể lưu cấu hình cài đặt.",
        color: "red",
      });
    }
  };

  const handlePair = async () => {
    setIsPairing(true);
    try {
      const token = await invoke<string>("start_pairing");
      setPairingKey(token);
      clipboard.copy(token);

      notifications.show({
        title: t("pairSuccess"),
        message: t("pairingKeyDesc"),
        color: "indigo",
        autoClose: 5000,
      });
    } catch (err) {
      console.error("Pairing failed:", err);
      notifications.show({
        title: "Lỗi",
        message: "Không thể bắt đầu kết nối pairing.",
        color: "red",
      });
    } finally {
      setIsPairing(false);
    }
  };

  const autoLockOptions = [
    { value: "immediate", label: t("autoLockImmediate") },
    { value: "1m", label: t("autoLockMinutes", { count: 1 }) },
    { value: "5m", label: t("autoLockMinutes", { count: 5 }) },
    { value: "15m", label: t("autoLockMinutes", { count: 15 }) },
    { value: "30m", label: t("autoLockMinutes", { count: 30 }) },
    { value: "1h", label: t("autoLockHours", { count: 1 }) },
    { value: "never", label: t("autoLockNever") },
  ];

  return (
    <>
      <MainHeader
        title={t("settingsSync")}
        description={t("settingsSyncDesc")}
        showMenuButton={isMobile}
        onMenuClick={openMobileSidebar}
      />
      <Box className={classes.scrollContainer}>
        <Stack gap="md" className={classes.settingsContainer} p="md">
          {/* General Section */}
          <Box className={classes.sectionCard}>
            <div className={classes.sectionTitle}>
              <span className={classes.sectionIcon}>
                <IconLanguage size={20} />
              </span>
              <Text>{t("generalSection")}</Text>
            </div>
            <Stack gap="sm">
              <Text size="sm" fw={600}>
                {t("languageLabel")}
              </Text>
              <SegmentedControl
                value={settings.lang}
                onChange={(val) => updateSetting("lang", val)}
                data={[
                  { label: "Tiếng Việt", value: "vi" },
                  { label: "English", value: "en" },
                ]}
                color="indigo"
                style={{ alignSelf: "flex-start" }}
              />
            </Stack>
          </Box>

          {/* Security Section */}
          <Box className={classes.sectionCard}>
            <div className={classes.sectionTitle}>
              <span className={classes.sectionIcon}>
                <IconLock size={20} />
              </span>
              <Text>{t("securitySection")}</Text>
            </div>
            <Stack gap="sm" style={{ maxWidth: "400px" }}>
              <Select
                label={t("autoLockLabel")}
                value={settings.auto_lock_interval}
                onChange={(val) => updateSetting("auto_lock_interval", val)}
                data={autoLockOptions}
                allowDeselect={false}
                styles={{
                  dropdown: {
                    backgroundColor: "rgba(26, 27, 30, 0.98)",
                    border: "1px solid var(--mantine-color-dark-4)",
                    color: "white",
                  },
                  option: {
                    color: "white",
                    "&[data-hovered]": {
                      backgroundColor: "var(--mantine-color-indigo-9)",
                    },
                    "&[data-selected]": {
                      backgroundColor: "var(--mantine-color-indigo-6)",
                    },
                  },
                }}
              />
            </Stack>
          </Box>

          {/* Extension Section */}
          <Box className={classes.sectionCard}>
            <div className={classes.sectionTitle}>
              <span className={classes.sectionIcon}>
                <IconLink size={20} />
              </span>
              <Text>{t("extensionSection")}</Text>
            </div>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  {t("statusLabel")}:
                </Text>
                <Badge
                  color={settings.extension_id ? "green" : "gray"}
                  variant="dot"
                >
                  {settings.extension_id
                    ? t("statusConnected")
                    : t("statusDisconnected")}
                </Badge>
              </Group>

              <TextInput
                label={t("extensionIdLabel")}
                placeholder={t("extensionIdPlaceholder")}
                value={settings.extension_id || ""}
                onChange={(e) => updateSetting("extension_id", e.target.value)}
                styles={{
                  input: {
                    backgroundColor: "rgba(30, 31, 33, 0.45)",
                    color: "white",
                    borderColor: "var(--mantine-color-dark-5)",
                  },
                }}
              />

              <Button
                color="indigo"
                radius="md"
                onClick={handlePair}
                loading={isPairing}
                style={{ alignSelf: "flex-start" }}
              >
                {t("pairBtn")}
              </Button>

              {pairingKey && (
                <Stack gap="xs" mt="xs">
                  <Text size="sm" fw={600}>
                    {t("pairingKeyLabel")}
                  </Text>
                  <Group gap="xs" wrap="nowrap">
                    <TextInput
                      readOnly
                      value={pairingKey}
                      styles={{
                        input: {
                          backgroundColor: "rgba(26, 27, 30, 0.98)",
                          color: "white",
                          borderColor: "var(--mantine-color-dark-4)",
                          fontFamily: "var(--mantine-font-family-monospace)",
                        },
                      }}
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      variant="light"
                      color="indigo"
                      size="lg"
                      onClick={() => {
                        clipboard.copy(pairingKey);
                        notifications.show({
                          message: "Copied!",
                          autoClose: 1000,
                        });
                      }}
                    >
                      {clipboard.copied ? (
                        <IconCheck size={18} />
                      ) : (
                        <IconCopy size={18} />
                      )}
                    </ActionIcon>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {t("pairingKeyDesc")}
                  </Text>
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </>
  );
}

export default SettingsPage;
