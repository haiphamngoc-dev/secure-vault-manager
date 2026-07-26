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
  IconBrandChrome,
  IconBrandFirefox,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ImportModal } from "@/features/dashboard/components/ImportModal";
import { ExportModal } from "@/features/dashboard/components/ExportModal";
import { useOutletContext } from "react-router-dom";
import { MainHeader } from "@/shared/layouts/components/MainHeader";
import classes from "./SettingsPage.module.css";

const DEFAULT_CHROME_EXTENSION_ID = "pnahlaohpcfkgjkdhhfdkapdbgjchdfe";

export interface AppSettings {
  lang: string;
  auto_lock_interval: string;
  chrome_extension_id: string | null;
  extension_id?: string | null;
  minimize_to_tray: boolean;
  autostart: boolean;
  pairing_token?: string | null;

  // New settings
  unlock_with_biometrics: boolean;
  confirm_password_interval: string;
  lock_on_sleep: boolean;
  prevent_sleep: boolean;
  clear_clipboard: boolean;
  clear_clipboard_interval: number;
  always_show_passwords: boolean;
  hold_shortcut_to_reveal: boolean;
  always_show_wifi_qr: boolean;
  last_password_auth?: number | null;
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
    unlock_with_biometrics: false,
    confirm_password_interval: "14d",
    lock_on_sleep: true,
    prevent_sleep: false,
    clear_clipboard: true,
    clear_clipboard_interval: 30,
    always_show_passwords: false,
    hold_shortcut_to_reveal: false,
    always_show_wifi_qr: true,
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
          unlock_with_biometrics: res.unlock_with_biometrics === true,
          confirm_password_interval: res.confirm_password_interval || "14d",
          lock_on_sleep: res.lock_on_sleep !== false,
          prevent_sleep: res.prevent_sleep === true,
          clear_clipboard: res.clear_clipboard !== false,
          clear_clipboard_interval: res.clear_clipboard_interval ?? 30,
          always_show_passwords: res.always_show_passwords === true,
          hold_shortcut_to_reveal: res.hold_shortcut_to_reveal === true,
          always_show_wifi_qr: res.always_show_wifi_qr !== false,
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
    value: string | boolean | number | null
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

  const confirmPasswordOptions = [
    {
      value: "restart",
      label: t("confirmPasswordRestart", "Sau mỗi lần khởi động ứng dụng"),
    },
    { value: "14d", label: t("confirmPassword14Days", "Mỗi 14 ngày") },
    { value: "30d", label: t("confirmPassword30Days", "Mỗi 30 ngày") },
    { value: "never", label: t("confirmPasswordNever", "Không bao giờ") },
  ];

  const clipboardClearOptions = [
    {
      value: "15",
      label: t("secondsCount", { count: 15, defaultValue: "15 giây" }),
    },
    {
      value: "30",
      label: t("secondsCount", { count: 30, defaultValue: "30 giây" }),
    },
    {
      value: "60",
      label: t("secondsCount", { count: 60, defaultValue: "60 giây" }),
    },
    {
      value: "90",
      label: t("secondsCount", { count: 90, defaultValue: "90 giây" }),
    },
    {
      value: "120",
      label: t("secondsCount", { count: 120, defaultValue: "2 phút" }),
    },
    {
      value: "300",
      label: t("secondsCount", { count: 300, defaultValue: "5 phút" }),
    },
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

            <Stack gap="xl">
              {/* 1. Unlock Group */}
              <Box>
                <Text
                  fw={600}
                  size="sm"
                  c="blue"
                  mb="sm"
                  style={{
                    borderBottom: "1px solid var(--color-neutral-light)",
                    paddingBottom: "4px",
                  }}
                >
                  {t("unlockGroup", "Unlock")}
                </Text>
                <Stack gap="sm">
                  <Switch
                    label={t(
                      "unlockWithBiometricsLabel",
                      "Mở khóa bằng dịch vụ sinh trắc học hệ thống"
                    )}
                    description={t(
                      "unlockWithBiometricsDesc",
                      "Bạn vẫn sẽ cần nhập mật khẩu tài khoản sau khi khởi động lại."
                    )}
                    checked={settings.unlock_with_biometrics}
                    onChange={(event) =>
                      updateSetting(
                        "unlock_with_biometrics",
                        event.currentTarget.checked
                      )
                    }
                    color="blue"
                  />
                  <Select
                    label={t(
                      "confirmPasswordLabel",
                      "Yêu cầu xác nhận mật khẩu chính:"
                    )}
                    value={settings.confirm_password_interval}
                    onChange={(val) =>
                      updateSetting("confirm_password_interval", val)
                    }
                    data={confirmPasswordOptions}
                    allowDeselect={false}
                    mt="xs"
                    styles={{
                      dropdown: {
                        backgroundColor: "var(--color-neutral-card)",
                        border: "1px solid var(--color-neutral-light)",
                        color: "var(--color-neutral-dark)",
                      },
                      option: {
                        color: "var(--color-neutral-dark)",
                        "&[data-hovered]": {
                          backgroundColor:
                            "var(--color-brand-primary-highlight)",
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

              {/* 2. Auto-lock Group */}
              <Box>
                <Text
                  fw={600}
                  size="sm"
                  c="blue"
                  mb="sm"
                  style={{
                    borderBottom: "1px solid var(--color-neutral-light)",
                    paddingBottom: "4px",
                  }}
                >
                  {t("autoLockGroup", "Auto-lock")}
                </Text>
                <Stack gap="sm">
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
                          backgroundColor:
                            "var(--color-brand-primary-highlight)",
                        },
                        "&[data-selected]": {
                          backgroundColor: "var(--color-brand-primary)",
                          color: "white",
                        },
                      },
                    }}
                  />
                  <Switch
                    label={t(
                      "lockOnSleepLabel",
                      "Khóa ứng dụng khi máy tính chuyển sang chế độ khóa hoặc ngủ"
                    )}
                    description={t(
                      "lockOnSleepDesc",
                      "Bao gồm chế độ sleep, bảo vệ màn hình và chuyển đổi nhanh người dùng."
                    )}
                    checked={settings.lock_on_sleep}
                    onChange={(event) =>
                      updateSetting(
                        "lock_on_sleep",
                        event.currentTarget.checked
                      )
                    }
                    color="blue"
                    mt="xs"
                  />
                  <Switch
                    label={t(
                      "preventSleepLabel",
                      "Ngăn thiết bị của bạn đi ngủ"
                    )}
                    description={t(
                      "preventSleepDesc",
                      "Ngăn hệ thống chuyển sang chế độ ngủ (sleep) khi ứng dụng đang mở."
                    )}
                    checked={settings.prevent_sleep}
                    onChange={(event) =>
                      updateSetting(
                        "prevent_sleep",
                        event.currentTarget.checked
                      )
                    }
                    color="blue"
                    mt="xs"
                  />
                </Stack>
              </Box>

              {/* 3. Clipboard Group */}
              <Box>
                <Text
                  fw={600}
                  size="sm"
                  c="blue"
                  mb="sm"
                  style={{
                    borderBottom: "1px solid var(--color-neutral-light)",
                    paddingBottom: "4px",
                  }}
                >
                  {t("clipboardGroup", "Clipboard")}
                </Text>
                <Stack gap="sm">
                  <Switch
                    label={t(
                      "clearClipboardLabel",
                      "Tự động xóa thông tin mật khẩu đã sao chép"
                    )}
                    description={t(
                      "clearClipboardDesc",
                      "Xóa bộ nhớ tạm của hệ thống để giảm thiểu rủi ro rò rỉ dữ liệu."
                    )}
                    checked={settings.clear_clipboard}
                    onChange={(event) =>
                      updateSetting(
                        "clear_clipboard",
                        event.currentTarget.checked
                      )
                    }
                    color="blue"
                  />
                  {settings.clear_clipboard && (
                    <Select
                      label={t(
                        "clearClipboardIntervalLabel",
                        "Thời gian tự động xóa:"
                      )}
                      value={String(settings.clear_clipboard_interval)}
                      onChange={(val) => {
                        if (val)
                          updateSetting(
                            "clear_clipboard_interval",
                            parseInt(val, 10)
                          );
                      }}
                      data={clipboardClearOptions}
                      allowDeselect={false}
                      mt="xs"
                      styles={{
                        dropdown: {
                          backgroundColor: "var(--color-neutral-card)",
                          border: "1px solid var(--color-neutral-light)",
                          color: "var(--color-neutral-dark)",
                        },
                        option: {
                          color: "var(--color-neutral-dark)",
                          "&[data-hovered]": {
                            backgroundColor:
                              "var(--color-brand-primary-highlight)",
                          },
                          "&[data-selected]": {
                            backgroundColor: "var(--color-brand-primary)",
                            color: "white",
                          },
                        },
                      }}
                    />
                  )}
                </Stack>
              </Box>

              {/* 4. Concealed Fields Group */}
              <Box>
                <Text
                  fw={600}
                  size="sm"
                  c="blue"
                  mb="sm"
                  style={{
                    borderBottom: "1px solid var(--color-neutral-light)",
                    paddingBottom: "4px",
                  }}
                >
                  {t("concealedFieldsGroup", "Concealed Fields")}
                </Text>
                <Stack gap="sm">
                  <Switch
                    label={t(
                      "alwaysShowPasswordsLabel",
                      "Luôn hiển thị mật khẩu và thông tin thẻ"
                    )}
                    description={t(
                      "alwaysShowPasswordsDesc",
                      "Mặc định hiển thị đầy đủ thông tin thay vì ẩn dấu hoa thị (*)."
                    )}
                    checked={settings.always_show_passwords}
                    onChange={(event) =>
                      updateSetting(
                        "always_show_passwords",
                        event.currentTarget.checked
                      )
                    }
                    color="blue"
                  />
                  <Switch
                    label={t(
                      "holdShortcutToRevealLabel",
                      "Nhấn giữ Ctrl+Alt để hiển thị nhanh các trường ẩn"
                    )}
                    description={t(
                      "holdShortcutToRevealDesc",
                      "Mở ẩn các trường nhạy cảm khi đang đè tổ hợp phím này."
                    )}
                    checked={settings.hold_shortcut_to_reveal}
                    onChange={(event) =>
                      updateSetting(
                        "hold_shortcut_to_reveal",
                        event.currentTarget.checked
                      )
                    }
                    color="blue"
                    mt="xs"
                  />
                  <Switch
                    label={t(
                      "alwaysShowWifiQrLabel",
                      "Luôn hiển thị mã QR kết nối Wi-Fi"
                    )}
                    description={t(
                      "alwaysShowWifiQrDesc",
                      "Tự động tạo mã QR kết nối nhanh cho các item Wi-Fi."
                    )}
                    checked={settings.always_show_wifi_qr}
                    onChange={(event) =>
                      updateSetting(
                        "always_show_wifi_qr",
                        event.currentTarget.checked
                      )
                    }
                    color="blue"
                    mt="xs"
                  />
                </Stack>
              </Box>
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

              <Group
                justify="space-between"
                align="center"
                wrap="wrap"
                gap="md"
              >
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

                <Group gap="xs" align="center" wrap="wrap">
                  <Text size="xs" c="dimmed" fw={500}>
                    {t("downloadExtensionLabel", "Tải Browser Extension:")}
                  </Text>
                  <Button
                    variant="light"
                    color="blue"
                    size="xs"
                    radius="md"
                    leftSection={<IconBrandChrome size={14} />}
                    onClick={() =>
                      openUrl(
                        "https://chromewebstore.google.com/detail/secure-vault-manager-exte/pnahlaohpcfkgjkdhhfdkapdbgjchdfe"
                      ).catch(console.error)
                    }
                  >
                    {t("chromeExtensionBtn", "Chrome Web Store")}
                  </Button>
                  <Button
                    variant="light"
                    color="orange"
                    size="xs"
                    radius="md"
                    leftSection={<IconBrandFirefox size={14} />}
                    onClick={() =>
                      openUrl(
                        "https://addons.mozilla.org/en-US/firefox/addon/secure-vault-manager-extension/"
                      ).catch(console.error)
                    }
                  >
                    {t("firefoxExtensionBtn", "Firefox Add-ons")}
                  </Button>
                </Group>
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
