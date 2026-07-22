import { useState, useRef } from "react";
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Radio,
  Badge,
  Alert,
  Progress,
  Box,
  Divider,
  PasswordInput,
} from "@mantine/core";
import {
  IconUpload,
  IconFileCode,
  IconCheck,
  IconAlertTriangle,
  IconArrowRight,
  IconRefresh,
  IconLock,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { useVault, VaultItem } from "@/app/providers/VaultProvider";
import classes from "./ImportModal.module.css";

interface ImportModalProps {
  opened: boolean;
  onClose: () => void;
}

interface ImportPreviewData {
  totalItems: number;
  categoriesSummary: Record<string, number>;
  items: VaultItem[];
  duplicateCount: number;
  duplicateIndices: number[];
  warnings: string[];
}

interface ImportResultSummary {
  addedCount: number;
  overwrittenCount: number;
  skippedCount: number;
  totalProcessed: number;
}

export function ImportModal({ opened, onClose }: Readonly<ImportModalProps>) {
  const { t } = useTranslation();
  const { items: existingItems, checkVaultStatus } = useVault();

  const [step, setStep] = useState<
    "select" | "preview" | "importing" | "result"
  >("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(
    null
  );
  const [conflictStrategy, setConflictStrategy] = useState<
    "skip" | "overwrite" | "keep_both"
  >("skip");
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // SVM password prompt modal state
  const [isSvmModalOpen, setIsSvmModalOpen] = useState(false);
  const [svmPassword, setSvmPassword] = useState("");
  const [svmError, setSvmError] = useState<string | null>(null);
  const [svmDecrypting, setSvmDecrypting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep("select");
    setSelectedFile(null);
    setPreviewData(null);
    setConflictStrategy("skip");
    setImportResult(null);
    setLoading(false);
    setErrorMsg(null);
    setIsSvmModalOpen(false);
    setSvmPassword("");
    setSvmError(null);
    setSvmDecrypting(false);
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setErrorMsg(null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "svm") {
      setSvmPassword("");
      setSvmError(null);
      setIsSvmModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      let preview: ImportPreviewData;

      if (ext === "1pux") {
        const buffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));

        preview = await invoke<ImportPreviewData>("parse_1pux_bytes", {
          bytes,
          existingItems,
        });
      } else if (ext === "json") {
        const text = await file.text();
        preview = await invoke<ImportPreviewData>("parse_json_import", {
          content: text,
          existingItems,
        });
      } else if (ext === "csv") {
        const text = await file.text();
        preview = await invoke<ImportPreviewData>("parse_csv_import", {
          content: text,
          existingItems,
        });
      } else {
        throw new Error(
          t(
            "unsupportedFileError",
            "Định dạng file không được hỗ trợ. Vui lòng chọn tệp .svm, .1pux, .json hoặc .csv."
          )
        );
      }

      setPreviewData(preview);
      setStep("preview");
    } catch (err: unknown) {
      console.error("Lỗi khi đọc file import:", err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        message || t("fileReadErrorTitle", "Không thể đọc và phân tích file.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSvmDecrypt = async () => {
    if (!selectedFile || !svmPassword.trim()) {
      setSvmError(t("svmPasswordRequired", "Vui lòng nhập mật khẩu giải mã."));
      return;
    }

    setSvmDecrypting(true);
    setSvmError(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));

      const preview = await invoke<ImportPreviewData>("parse_svm_bytes", {
        bytes,
        password: svmPassword,
        existingItems,
      });

      setPreviewData(preview);
      setStep("preview");
      setIsSvmModalOpen(false);
    } catch (err: unknown) {
      console.error("Lỗi giải mã tệp .svm:", err);
      const message = err instanceof Error ? err.message : String(err);
      setSvmError(
        message ||
          t("svmDecryptFailed", "Mật khẩu giải mã tệp .svm không chính xác.")
      );
    } finally {
      setSvmDecrypting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData) return;

    setStep("importing");
    setLoading(true);

    try {
      const result = await invoke<ImportResultSummary>("execute_import", {
        items: previewData.items,
        conflictStrategy,
      });

      setImportResult(result);
      await checkVaultStatus();
      setStep("result");

      notifications.show({
        title: t("importSuccessNotification", "Import thành công"),
        message: t("importSuccessMsg", {
          added: result.addedCount,
          overwritten: result.overwrittenCount,
          skipped: result.skippedCount,
          defaultValue: `Đã nhập ${result.addedCount} mục mới, ghi đè ${result.overwrittenCount} mục, bỏ qua ${result.skippedCount} mục.`,
        }),
        color: "green",
      });
    } catch (err: unknown) {
      console.error("Lỗi khi thực hiện import:", err);
      const message = err instanceof Error ? err.message : String(err);
      notifications.show({
        title: t("importErrorNotification", "Lỗi Import"),
        message:
          message ||
          t("importErrorMsg", "Không thể lưu dữ liệu nhập vào Vault."),
        color: "red",
      });
      setStep("preview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title={t("importModalTitle", "Nhập dữ liệu vào Vault (Import)")}
      centered
      size="lg"
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
        {step === "select" && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t(
                "importDesc",
                "Chọn tệp mã hóa .svm, tệp 1Password (.1pux), tệp JSON hoặc CSV để nhập các item vào Vault hiện tại."
              )}
            </Text>

            <Box
              className={classes.dropzone}
              onClick={() => fileInputRef.current?.click()}
            >
              <Stack align="center" gap="xs">
                <IconUpload size={36} color="var(--mantine-color-blue-4)" />
                <Text fw={600} size="sm">
                  {t(
                    "dropzoneText",
                    "Nhấn để chọn tệp hoặc kéo thả tệp vào đây"
                  )}
                </Text>
                <Group gap="xs">
                  <Badge
                    variant="light"
                    color="indigo"
                    className={classes.fileBadge}
                  >
                    .svm (Secure Vault)
                  </Badge>
                  <Badge
                    variant="light"
                    color="blue"
                    className={classes.fileBadge}
                  >
                    .1pux (1Password)
                  </Badge>
                  <Badge
                    variant="light"
                    color="cyan"
                    className={classes.fileBadge}
                  >
                    .json
                  </Badge>
                  <Badge
                    variant="light"
                    color="teal"
                    className={classes.fileBadge}
                  >
                    .csv
                  </Badge>
                </Group>
              </Stack>

              <input
                ref={fileInputRef}
                type="file"
                accept=".svm,.1pux,.json,.csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </Box>

            {errorMsg && (
              <Alert
                icon={<IconAlertTriangle size={18} />}
                title={t("fileReadErrorTitle", "Lỗi chọn file")}
                color="red"
              >
                {errorMsg}
              </Alert>
            )}
          </Stack>
        )}

        {step === "preview" && previewData && (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <IconFileCode size={20} color="var(--mantine-color-blue-4)" />
                <Text fw={600}>{selectedFile?.name}</Text>
              </Group>
              <Badge variant="filled" color="blue" size="lg">
                {t("itemsFoundBadge", {
                  count: previewData.totalItems,
                  defaultValue: `${previewData.totalItems} mục được tìm thấy`,
                })}
              </Badge>
            </Group>

            <Divider color="dark.4" />

            <Stack gap="xs">
              <Text size="xs" fw={600} c="dimmed">
                {t("categoriesDetected", "DANH MỤC PHÁT HIỆN")}
              </Text>
              <Group gap="xs">
                {Object.entries(previewData.categoriesSummary).map(
                  ([cat, count]) => (
                    <Badge key={cat} variant="outline" color="gray">
                      {cat}: {count}
                    </Badge>
                  )
                )}
              </Group>
            </Stack>

            {previewData.warnings.length > 0 && (
              <Alert
                icon={<IconAlertTriangle size={18} />}
                title={t("duplicateWarningTitle", "Cảnh báo trùng lặp")}
                color="yellow"
              >
                {previewData.warnings.map((w, idx) => (
                  <Text key={idx} size="xs">
                    {w}
                  </Text>
                ))}
              </Alert>
            )}

            <Stack gap="xs">
              <Text className={classes.stepTitle}>
                {t(
                  "conflictStrategyTitle",
                  "Xử lý khi phát hiện dữ liệu trùng lặp (Matching Title & Username/URL):"
                )}
              </Text>
              <Radio.Group
                value={conflictStrategy}
                onChange={(val) =>
                  setConflictStrategy(val as "skip" | "overwrite" | "keep_both")
                }
              >
                <Stack gap="xs">
                  <Radio
                    value="skip"
                    label={t(
                      "strategySkipLabel",
                      "Bỏ qua các mục trùng lặp (Khuyên dùng)"
                    )}
                    description={t(
                      "strategySkipDesc",
                      "Giữ nguyên mục hiện tại trong Vault, không thêm mục trùng"
                    )}
                  />
                  <Radio
                    value="overwrite"
                    label={t("strategyOverwriteLabel", "Ghi đè mục cũ")}
                    description={t(
                      "strategyOverwriteDesc",
                      "Cập nhật thông tin mục trong Vault bằng dữ liệu mới từ file"
                    )}
                  />
                  <Radio
                    value="keep_both"
                    label={t(
                      "strategyKeepBothLabel",
                      "Giữ cả hai (Tạo mục mới)"
                    )}
                    description={t(
                      "strategyKeepBothDesc",
                      "Tạo một bản sao mới với ID khác cho các mục trùng lặp"
                    )}
                  />
                </Stack>
              </Radio.Group>
            </Stack>

            <Group justify="space-between" mt="sm">
              <Button variant="default" onClick={() => setStep("select")}>
                {t("selectFileAgain", "Chọn lại file")}
              </Button>
              <Button
                color="blue"
                rightSection={<IconArrowRight size={16} />}
                onClick={handleExecuteImport}
                loading={loading}
              >
                {t("startImportBtn", {
                  count: previewData.totalItems,
                  defaultValue: `Bắt đầu Nhập (${previewData.totalItems} mục)`,
                })}
              </Button>
            </Group>
          </Stack>
        )}

        {step === "importing" && (
          <Stack gap="md" align="center" py="xl">
            <IconRefresh
              size={40}
              className="mantine-rotate"
              color="var(--mantine-color-blue-4)"
            />
            <Text fw={600}>
              {t(
                "importingProgress",
                "Đang giải mã và lưu dữ liệu vào Vault..."
              )}
            </Text>
            <Progress
              value={100}
              animated
              style={{ width: "100%" }}
              color="blue"
            />
          </Stack>
        )}

        {step === "result" && importResult && (
          <Stack gap="md" align="center" py="md">
            <IconCheck size={48} color="var(--mantine-color-green-5)" />
            <Text size="lg" fw={700} c="green.4">
              {t("importCompletedTitle", "Hoàn tất nhập dữ liệu!")}
            </Text>

            <Group gap="lg" justify="center">
              <Stack gap={0} align="center">
                <Text size="xl" fw={700} c="blue.4">
                  {importResult.addedCount}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("addedCountLabel", "Mục đã thêm")}
                </Text>
              </Stack>
              <Stack gap={0} align="center">
                <Text size="xl" fw={700} c="yellow.4">
                  {importResult.overwrittenCount}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("overwrittenCountLabel", "Mục ghi đè")}
                </Text>
              </Stack>
              <Stack gap={0} align="center">
                <Text size="xl" fw={700} c="gray.4">
                  {importResult.skippedCount}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("skippedCountLabel", "Mục bỏ qua")}
                </Text>
              </Stack>
            </Group>

            <Button color="blue" onClick={handleModalClose} mt="md" fullWidth>
              {t("closeAndUpdateVault", "Đóng và cập nhật Vault")}
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Modal nhập mật khẩu giải mã tệp .svm */}
      <Modal
        opened={isSvmModalOpen}
        onClose={() => {
          setIsSvmModalOpen(false);
          setSvmPassword("");
          setSvmError(null);
        }}
        title={t("svmPasswordModalTitle", "Giải mã tệp Secure Vault (.svm)")}
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
          <Text size="sm" c="dimmed">
            {t(
              "svmPasswordModalDesc",
              "Tệp này được bảo vệ bằng mật khẩu. Nhập mật khẩu mã hóa để mở tệp."
            )}
          </Text>

          {selectedFile && (
            <Group gap="xs">
              <IconLock size={16} color="var(--mantine-color-indigo-4)" />
              <Badge variant="light" color="indigo">
                {selectedFile.name}
              </Badge>
            </Group>
          )}

          <PasswordInput
            label={t("svmPasswordLabel", "Mật khẩu tệp .svm")}
            placeholder={t("enterPasswordPlaceholder", "Nhập mật khẩu...")}
            value={svmPassword}
            onChange={(e) => setSvmPassword(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSvmDecrypt();
            }}
            autoFocus
            radius="md"
          />

          {svmError && (
            <Alert icon={<IconAlertTriangle size={18} />} color="red">
              {svmError}
            </Alert>
          )}

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => {
                setIsSvmModalOpen(false);
                setSvmPassword("");
                setSvmError(null);
              }}
            >
              {t("cancelBtn", "Hủy")}
            </Button>
            <Button
              color="indigo"
              leftSection={<IconLock size={16} />}
              onClick={handleSvmDecrypt}
              loading={svmDecrypting}
            >
              {t("decryptAndPreviewBtn", "Giải mã & Xem trước")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Modal>
  );
}

export default ImportModal;
