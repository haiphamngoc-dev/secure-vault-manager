import { useState } from "react";
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Radio,
  Alert,
  Badge,
  PasswordInput,
  SegmentedControl,
} from "@mantine/core";
import {
  IconDownload,
  IconAlertTriangle,
  IconFileCode,
  IconFileTypeCsv,
  IconLock,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { useVault } from "@/app/providers/VaultProvider";
import classes from "./ExportModal.module.css";

interface ExportModalProps {
  opened: boolean;
  onClose: () => void;
  selectedIds?: string[];
}

export function ExportModal({
  opened,
  onClose,
  selectedIds = [],
}: Readonly<ExportModalProps>) {
  const { t } = useTranslation();
  const { items } = useVault();
  const [format, setFormat] = useState<"json" | "csv" | "svm">("json");
  const [passwordMode, setPasswordMode] = useState<"master" | "custom">(
    "master"
  );
  const [svmPassword, setSvmPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const exportCount =
    selectedIds.length > 0 ? selectedIds.length : items.length;

  const handleExport = async () => {
    setPasswordError(null);

    if (format === "svm") {
      if (!svmPassword.trim()) {
        setPasswordError(
          t(
            "passwordRequiredError",
            "Vui lòng nhập mật khẩu mã hóa cho tệp .svm."
          )
        );
        return;
      }

      if (passwordMode === "custom" && svmPassword !== confirmPassword) {
        setPasswordError(
          t("passwordMismatchError", "Mật khẩu xác nhận không trùng khớp.")
        );
        return;
      }
    }

    setLoading(true);
    try {
      const itemIdsArg = selectedIds.length > 0 ? selectedIds : null;
      let filename: string;

      if (format === "svm") {
        const resultBytes = await invoke<number[]>("export_svm_bytes", {
          itemIds: itemIdsArg,
          password: svmPassword,
        });

        filename = `vault-backup-${new Date().toISOString().slice(0, 10)}.svm`;
        const uint8 = new Uint8Array(resultBytes);
        const blob = new Blob([uint8], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const content = await invoke<string>("export_vault_data", {
          itemIds: itemIdsArg,
          format,
        });

        const mimeType = format === "json" ? "application/json" : "text/csv";
        filename = `vault-export-${new Date().toISOString().slice(0, 10)}.${format}`;
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      notifications.show({
        title: t("exportSuccessNotification", "Xuất dữ liệu thành công"),
        message: t("exportSuccessMsg", {
          filename,
          count: exportCount,
          defaultValue: `Đã tải tệp ${filename} với ${exportCount} mục.`,
        }),
        color: "green",
      });

      // Reset password state
      setSvmPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err: unknown) {
      console.error("Lỗi khi xuất dữ liệu Vault:", err);
      const message = err instanceof Error ? err.message : String(err);
      notifications.show({
        title: t("exportErrorNotification", "Lỗi xuất dữ liệu"),
        message:
          message || t("exportErrorMsg", "Không thể khởi tạo dữ liệu xuất."),
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setSvmPassword("");
        setConfirmPassword("");
        setPasswordError(null);
        onClose();
      }}
      title={t("exportModalTitle", "Xuất dữ liệu Vault (Export)")}
      centered
      size="md"
      radius="lg"
      overlayProps={{
        blur: 8,
        backgroundOpacity: 0.35,
      }}
      classNames={{
        content: classes.modalContent,
        header: classes.modalHeader,
        title: classes.modalTitle,
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            {t("exportScopeLabel", "Phạm vi xuất:")}
          </Text>
          <Badge
            color="blue"
            variant="light"
            size="lg"
            className={classes.scopeBadge}
          >
            {selectedIds.length > 0
              ? t("exportSelectedScope", {
                  count: selectedIds.length,
                  defaultValue: `${selectedIds.length} mục đã chọn`,
                })
              : t("exportAllScope", {
                  count: items.length,
                  defaultValue: `Toàn bộ Vault (${items.length} mục)`,
                })}
          </Badge>
        </Group>

        {format !== "svm" && (
          <Alert
            icon={<IconAlertTriangle size={20} />}
            title={t("securityWarningTitle", "Cảnh báo bảo mật")}
            color="yellow"
            className={classes.warningCard}
          >
            {t(
              "securityWarningDesc",
              "Tệp xuất JSON/CSV không được mã hóa và chứa toàn bộ thông tin ở dạng văn bản thuần. Để lưu trữ an toàn, khuyên dùng định dạng tệp mã hóa .svm."
            )}
          </Alert>
        )}

        <Stack gap="xs">
          <Text size="sm" fw={600}>
            {t("selectExportFormat", "Chọn định dạng tệp xuất:")}
          </Text>
          <Radio.Group
            value={format}
            onChange={(val) => {
              setFormat(val as "json" | "csv" | "svm");
              setPasswordError(null);
            }}
            className={classes.formatRadioGroup}
          >
            <Stack gap="sm">
              <Radio
                value="svm"
                label={
                  <Group gap="xs">
                    <IconLock size={18} color="var(--mantine-color-indigo-4)" />
                    <Text fw={500}>
                      {t("svmFormatLabel", "Tệp mã hóa Secure Vault (.svm)")}
                    </Text>
                  </Group>
                }
                description={t(
                  "svmFormatDesc",
                  "Mã hóa nhị phân an toàn với mật khẩu (AES-256-GCM). Thích hợp để khôi phục & sao lưu bảo mật."
                )}
              />
              <Radio
                value="json"
                label={
                  <Group gap="xs">
                    <IconFileCode
                      size={18}
                      color="var(--mantine-color-blue-4)"
                    />
                    <Text fw={500}>
                      {t("jsonFormatLabel", "Tệp JSON (.json)")}
                    </Text>
                  </Group>
                }
                description={t(
                  "jsonFormatDesc",
                  "Định dạng tiêu chuẩn chứa đầy đủ các trường dữ liệu, custom fields và tags."
                )}
              />
              <Radio
                value="csv"
                label={
                  <Group gap="xs">
                    <IconFileTypeCsv
                      size={18}
                      color="var(--mantine-color-teal-4)"
                    />
                    <Text fw={500}>
                      {t("csvFormatLabel", "Tệp CSV (.csv)")}
                    </Text>
                  </Group>
                }
                description={t(
                  "csvFormatDesc",
                  "Định dạng bảng tính phù hợp để xem trong Microsoft Excel, Google Sheets hoặc nhập vào ứng dụng khác."
                )}
              />
            </Stack>
          </Radio.Group>
        </Stack>

        {format === "svm" && (
          <Stack
            gap="xs"
            p="sm"
            style={{
              background: "var(--mantine-color-dark-6)",
              borderRadius: "var(--mantine-radius-md)",
            }}
          >
            <Text size="sm" fw={600}>
              {t(
                "svmPasswordOptionTitle",
                "Tùy chọn mật khẩu mã hóa tệp .svm:"
              )}
            </Text>
            <SegmentedControl
              value={passwordMode}
              onChange={(val) => {
                setPasswordMode(val as "master" | "custom");
                setPasswordError(null);
              }}
              data={[
                {
                  label: t("useMasterPasswordOption", "Dùng Master Password"),
                  value: "master",
                },
                {
                  label: t("useCustomPasswordOption", "Mật khẩu tùy chỉnh"),
                  value: "custom",
                },
              ]}
              fullWidth
              size="xs"
              color="indigo"
            />

            <PasswordInput
              label={
                passwordMode === "master"
                  ? t(
                      "masterPasswordInputLabel",
                      "Nhập Master Password của Vault"
                    )
                  : t(
                      "customPasswordInputLabel",
                      "Nhập mật khẩu mã hóa cho tệp .svm"
                    )
              }
              placeholder={t("enterPasswordPlaceholder", "Nhập mật khẩu...")}
              value={svmPassword}
              onChange={(e) => setSvmPassword(e.currentTarget.value)}
              radius="md"
              size="sm"
            />

            {passwordMode === "custom" && (
              <PasswordInput
                label={t("confirmCustomPasswordLabel", "Xác nhận mật khẩu")}
                placeholder={t(
                  "confirmPasswordPlaceholder",
                  "Nhập lại mật khẩu..."
                )}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                radius="md"
                size="sm"
              />
            )}

            {passwordError && (
              <Text size="xs" c="red.4">
                {passwordError}
              </Text>
            )}
          </Stack>
        )}

        <Group justify="flex-end" gap="sm" mt="md">
          <Button variant="default" onClick={onClose}>
            {t("cancelBtn", "Hủy")}
          </Button>
          <Button
            color={format === "svm" ? "indigo" : "blue"}
            leftSection={<IconDownload size={16} />}
            onClick={handleExport}
            loading={loading}
          >
            {t("exportFileBtn", {
              count: exportCount,
              defaultValue: `Xuất file (${exportCount} mục)`,
            })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ExportModal;
