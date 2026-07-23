import { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Text,
  SegmentedControl,
  Select,
  PasswordInput,
  Button,
  Group,
  ActionIcon,
  Switch,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useClipboard } from "@mantine/hooks";
import {
  IconLanguage,
  IconLock,
  IconLink,
  IconCopy,
  IconCheck,
  IconDeviceDesktop,
  IconDatabase,
  IconUpload,
  IconDownload,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { ImportModal } from "@/features/dashboard/components/ImportModal";
import { ExportModal } from "@/features/dashboard/components/ExportModal";
import { useOutletContext } from "react-router-dom";
import { MainHeader } from "@/shared/layouts/components/MainHeader";
import classes from "./SettingsPage.module.css";

const DEFAULT_CHROME_EXTENSION_ID = "pnahlaohpcfkgjkdhhfdkapdbgjchdfe";

interface AppSettings {
  lang: string;
  auto_lock_interval: string;
  chrome_extension_id: string | null;
  extension_id?: string | null;
  minimize_to_tray: boolean;
  autostart: boolean;
  pairing_token?: string | null;
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const clipboard = useClipboard();

  const [settings, setSettings] = useState<AppSettings>({
    lang: "vi",
    auto_lock_interval: "15m",
    chrome_extension_id: DEFAULT_CHROME_EXTENSION_ID,
    minimize_to_tray: true,
    autostart: false,
  });

  const [pairingKey, setPairingKey] = useState<string>("");
  const [isPairing, setIsPairing] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await invoke<AppSettings>("get_settings");
        setSettings({
          ...res,
          chrome_extension_id:
            res.chrome_extension_id ||
            res.extension_id ||
            DEFAULT_CHROME_EXTENSION_ID,
          minimize_to_tray: res.minimize_to_tray !== false,
          autostart: res.autostart === true,
        });

        if (res.pairing_token) {
          setPairingKey(res.pairing_token);
        } else {
          // If no pairing token exists yet, automatically create one so key is always available
          const token = await invoke<string>("start_pairing");
          setPairingKey(token);
        }
      } catch (err) {
        console.error("Failed to load settings from Rust:", err);
      }
    };
    loadSettings();
  }, []);

  // Update settings in state and save to Rust config file
  const updateSetting = async (
    key: keyof AppSettings,
    value: string | boolean | null
  ) => {
    const newSettings = {
      ...settings,
      [key]: value,
    };
    setSettings(newSettings);

    try {
      await invoke("save_settings", { settings: newSettings });

      if (key === "lang" && typeof value === "string") {
        i18n.changeLanguage(value);
      }

      globalThis.dispatchEvent(
        new CustomEvent("settings-changed", { detail: newSettings })
      );

      notifications.show({
        title: t("saveSuccess", "Cập nhật cài đặt thành công!"),
        message: "",
        color: "green",
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
        color: "green",
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

  const { headerTitle } = useOutletContext<{ headerTitle?: string }>() || {};

  return (
    <Box
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {headerTitle && <MainHeader title={headerTitle} />}
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
                color="blue"
                className={classes.alignStart}
              />
            </Stack>
          </Box>

          {/* System Section */}
          <Box className={classes.sectionCard}>
            <div className={classes.sectionTitle}>
              <span className={classes.sectionIcon}>
                <IconDeviceDesktop size={20} />
              </span>
              <Text>{t("systemSection")}</Text>
            </div>
            <Stack gap="xs">
              <Switch
                label={t("minimizeToTrayLabel")}
                description={t("minimizeToTrayDesc")}
                checked={settings.minimize_to_tray}
                onChange={(event) =>
                  updateSetting("minimize_to_tray", event.currentTarget.checked)
                }
                color="blue"
              />
              <Switch
                label={t("autostartLabel")}
                description={t("autostartDesc")}
                checked={settings.autostart}
                onChange={(event) =>
                  updateSetting("autostart", event.currentTarget.checked)
                }
                color="blue"
                mt="xs"
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
            <Stack gap="sm" className={classes.securityStack}>
              <Select
                label={t("autoLockLabel")}
                value={settings.auto_lock_interval}
                onChange={(val) => updateSetting("auto_lock_interval", val)}
                data={autoLockOptions}
                allowDeselect={false}
                styles={{
                  dropdown: {
                    backgroundColor: "var(--color-neutral-card)",
                    border: "1px solid var(--color-neutral-light)",
                    color: "var(--color-neutral-dark)",
                  },
                  option: {
                    color: "var(--color-neutral-dark)",
                    "&[data-hovered]": {
                      backgroundColor: "var(--color-brand-primary-highlight)",
                    },
                    "&[data-selected]": {
                      backgroundColor: "var(--color-brand-primary)",
                      color: "white",
                    },
                  },
                }}
              />
            </Stack>
          </Box>

          {/* Data Management Section */}
          <Box className={classes.sectionCard}>
            <div className={classes.sectionTitle}>
              <span className={classes.sectionIcon}>
                <IconDatabase size={20} />
              </span>
              <Text>
                {t("dataSection", "Quản lý dữ liệu Vault (Import & Export)")}
              </Text>
            </div>
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <Stack gap={2} style={{ flex: 1, minWidth: "240px" }}>
                <Text size="sm" fw={600}>
                  {t("importDataLabel", "Nhập dữ liệu (Import)")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t(
                    "importDataDesc",
                    "Hỗ trợ tệp xuất từ 1Password (.1pux), tệp JSON và tệp CSV."
                  )}
                </Text>
              </Stack>
              <Button
                variant="light"
                color="blue"
                leftSection={<IconUpload size={16} />}
                onClick={() => setIsImportModalOpen(true)}
              >
                {t("importBtn", "Nhập dữ liệu (Import)")}
              </Button>
            </Group>

            <hr className={classes.divider} style={{ margin: "16px 0" }} />

            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <Stack gap={2} style={{ flex: 1, minWidth: "240px" }}>
                <Text size="sm" fw={600}>
                  {t("exportDataLabel", "Xuất dữ liệu (Export)")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t(
                    "exportDataDesc",
                    "Xuất dữ liệu Vault thành tệp JSON hoặc CSV."
                  )}
                </Text>
              </Stack>
              <Button
                variant="outline"
                color="blue"
                leftSection={<IconDownload size={16} />}
                onClick={() => setIsExportModalOpen(true)}
              >
                {t("exportBtn", "Xuất dữ liệu (Export)")}
              </Button>
            </Group>
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
              <Text size="sm" c="dimmed">
                {t(
                  "extensionPairingDesc",
                  "Mã kết nối (Pairing Key) được sử dụng để ghép đôi ứng dụng Desktop với tiện ích trình duyệt. Mã này luôn được giữ nguyên trừ khi bạn chủ động sinh lại mã mới."
                )}
              </Text>

              {pairingKey && (
                <Stack gap="xs" p="xs" className={classes.pairingKeyBox}>
                  <Text size="sm" fw={600}>
                    {t("pairingKeyLabel", "Mã kết nối (Pairing Key)")}
                  </Text>
                  <Group gap="xs" wrap="nowrap">
                    <PasswordInput
                      readOnly
                      value={pairingKey}
                      radius="md"
                      size="sm"
                      styles={{
                        input: {
                          fontFamily: "var(--mantine-font-family-monospace)",
                        },
                      }}
                      className={classes.flex1}
                    />
                    <ActionIcon
                      variant="light"
                      color="blue"
                      size="lg"
                      radius="md"
                      onClick={() => {
                        clipboard.copy(pairingKey);
                        notifications.show({
                          message: t(
                            "copiedPairingKey",
                            "Đã sao chép mã kết nối vào Clipboard!"
                          ),
                          color: "green",
                          autoClose: 1500,
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
                    {t(
                      "pairingKeyMaskDesc",
                      "Mã được ẩn mặc định. Nhấn biểu tượng mắt để xem mã hoặc bấm nút sao chép để dán vào Extension."
                    )}
                  </Text>
                </Stack>
              )}

              <Group justify="flex-start">
                <Button
                  variant="outline"
                  color="blue"
                  size="xs"
                  radius="md"
                  onClick={handlePair}
                  loading={isPairing}
                >
                  {t("regeneratePairKeyBtn", "Sinh lại mã kết nối mới")}
                </Button>
              </Group>
            </Stack>
          </Box>
        </Stack>

        {/* Import & Export Modals */}
        <ImportModal
          opened={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />
        <ExportModal
          opened={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      </Box>
    </Box>
  );
}

export default SettingsPage;
