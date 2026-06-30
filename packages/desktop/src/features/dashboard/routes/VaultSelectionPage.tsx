import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Title,
  Text,
  PasswordInput,
  Button,
  Stack,
  Alert,
  ThemeIcon,
  Box,
  Group,
  Card,
  Badge,
  Menu,
  ActionIcon,
  Modal,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconLock,
  IconAlertTriangle,
  IconDotsVertical,
  IconStar,
  IconTrash,
  IconEdit,
  IconPlus,
  IconArrowLeft,
  IconFolder,
} from "@tabler/icons-react";
import { useVault, VaultProfile } from "@/app/providers/VaultProvider";
import { useTranslation } from "react-i18next";
import classes from "./VaultSelectionPage.module.css";

export function VaultSelectionPage() {
  const { t } = useTranslation();
  const {
    vaults,
    defaultVaultId,
    unlock,
    initialize,
    renameVault,
    setDefaultVault,
    deleteVault,
  } = useVault();

  // Selection & UI States
  const [selectedVault, setSelectedVault] = useState<VaultProfile | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Vault Modal States
  const [newVaultOpened, setNewVaultOpened] = useState(false);
  const [newVaultId, setNewVaultId] = useState("");
  const [newVaultName, setNewVaultName] = useState("");
  const [newVaultPassword, setNewVaultPassword] = useState("");
  const [newVaultConfirm, setNewVaultConfirm] = useState("");
  const [newVaultError, setNewVaultError] = useState<string | null>(null);

  // Rename Modal States
  const [renameOpened, setRenameOpened] = useState(false);
  const [vaultToRename, setVaultToRename] = useState<VaultProfile | null>(null);
  const [renamedName, setRenamedName] = useState("");

  // Delete Modal States
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [vaultToDelete, setVaultToDelete] = useState<VaultProfile | null>(null);
  const [deleteFile, setDeleteFile] = useState(false);

  // Autoload default vault on mount
  useEffect(() => {
    if (defaultVaultId && vaults.length > 0 && !selectedVault) {
      const defVault = vaults.find((v) => v.id === defaultVaultId);
      if (defVault) {
        const timer = setTimeout(() => {
          setSelectedVault(defVault);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [defaultVaultId, vaults, selectedVault]);

  const handleUnlock = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!selectedVault) return;
    setLoading(true);
    setError(null);

    try {
      await unlock(selectedVault.id, password);
    } catch (err) {
      let message = t("unlockErrorInvalid", "Mật khẩu không chính xác.");
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVault = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newVaultId.trim() || !newVaultName.trim()) {
      setNewVaultError(
        t("pleaseFillRequired", "Vui lòng điền đầy đủ thông tin.")
      );
      return;
    }
    if (newVaultPassword.length < 8) {
      setNewVaultError(
        t("passwordTooShort", "Mật khẩu phải từ 8 ký tự trở lên.")
      );
      return;
    }
    if (newVaultPassword !== newVaultConfirm) {
      setNewVaultError(t("passwordMismatch", "Xác nhận mật khẩu không khớp."));
      return;
    }

    setLoading(true);
    setNewVaultError(null);

    try {
      await initialize(
        newVaultId.trim(),
        newVaultName.trim(),
        newVaultPassword
      );
      setNewVaultOpened(false);
      // Reset form
      setNewVaultId("");
      setNewVaultName("");
      setNewVaultPassword("");
      setNewVaultConfirm("");
    } catch (err) {
      setNewVaultError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRenameSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!vaultToRename || !renamedName.trim()) return;
    try {
      await renameVault(vaultToRename.id, renamedName.trim());
      setRenameOpened(false);
      setVaultToRename(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!vaultToDelete) return;
    try {
      await deleteVault(vaultToDelete.id, deleteFile);
      setDeleteOpened(false);
      setVaultToDelete(null);
      if (selectedVault?.id === vaultToDelete.id) {
        setSelectedVault(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={classes.container}>
      <Container size="sm" py="xl">
        {selectedVault ? (
          /* UNLOCK SPECIFIC VAULT VIEW */
          <Paper radius="lg" p="xl" withBorder className={classes.card}>
            <Stack gap="md" align="center">
              <ThemeIcon
                size={64}
                radius="xl"
                variant="gradient"
                gradient={{ from: "indigo", to: "cyan", deg: 45 }}
                className={classes.iconContainer}
              >
                <IconLock size={36} />
              </ThemeIcon>

              <Box style={{ textAlign: "center" }}>
                <Title order={2} className={classes.titleText}>
                  {selectedVault.name}
                </Title>
                <Text size="sm" c="dimmed" mt="xs">
                  {t("unlockDesc", "Nhập Master Password để mở khoá.")}
                </Text>
              </Box>
            </Stack>

            <form
              onSubmit={handleUnlock}
              className={classes.form}
              style={{ marginTop: "24px" }}
            >
              <Stack gap="md">
                {error && (
                  <Alert
                    icon={<IconAlertTriangle size={16} />}
                    title={t("unlockErrorTitle", "Lỗi mở khóa")}
                    color="red"
                    radius="md"
                  >
                    {error}
                  </Alert>
                )}

                <PasswordInput
                  required
                  label={t("unlockPasswordLabel", "Master Password")}
                  placeholder={t(
                    "unlockPasswordPlaceholder",
                    "Nhập mật khẩu của bạn..."
                  )}
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  disabled={loading}
                  radius="md"
                  autoFocus
                />

                <Group gap="sm" mt="md" wrap="nowrap">
                  <Button
                    variant="subtle"
                    color="gray"
                    radius="md"
                    size="md"
                    onClick={() => {
                      setSelectedVault(null);
                      setPassword("");
                      setError(null);
                    }}
                    disabled={loading}
                    leftSection={<IconArrowLeft size={16} />}
                    style={{ flex: 1 }}
                  >
                    {t("back", "Quay lại")}
                  </Button>
                  <Button
                    type="submit"
                    loading={loading}
                    gradient={{ from: "indigo", to: "cyan", deg: 45 }}
                    variant="gradient"
                    radius="md"
                    size="md"
                    style={{ flex: 2 }}
                  >
                    {t("unlockSubmitBtn", "Mở khóa")}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Paper>
        ) : (
          /* VAULT LIST VIEW */
          <Paper radius="lg" p="xl" withBorder className={classes.card}>
            <Stack gap="xs" align="center" mb="lg">
              <ThemeIcon size={54} radius="md" variant="light" color="indigo">
                <IconFolder size={28} />
              </ThemeIcon>
              <Title order={2} className={classes.titleText}>
                {t("selectVaultTitle", "Chọn kho bảo mật")}
              </Title>
              <Text size="sm" c="dimmed">
                {t(
                  "selectVaultDesc",
                  "Chọn một Vault đã có để mở khoá hoặc tạo mới."
                )}
              </Text>
            </Stack>

            <Stack gap="sm">
              {vaults.map((vault) => (
                <Card
                  key={vault.id}
                  withBorder
                  padding="md"
                  radius="md"
                  className={classes.vaultItemCard}
                  onClick={() => setSelectedVault(vault)}
                >
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="md" style={{ flex: 1, overflow: "hidden" }}>
                      <ThemeIcon
                        variant="light"
                        color="indigo"
                        radius="md"
                        size="md"
                      >
                        <IconLock size={16} />
                      </ThemeIcon>
                      <Box style={{ flex: 1, overflow: "hidden" }}>
                        <Group gap="xs" wrap="nowrap">
                          <Text
                            fw={700}
                            c="white"
                            size="sm"
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {vault.name}
                          </Text>
                          {defaultVaultId === vault.id && (
                            <Tooltip label={t("defaultVault", "Mặc định")}>
                              <Badge
                                size="xs"
                                variant="light"
                                color="indigo"
                                radius="sm"
                              >
                                {t("defaultBadge", "Mặc định")}
                              </Badge>
                            </Tooltip>
                          )}
                        </Group>
                        <Text
                          size="xs"
                          c="dimmed"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {vault.file_name}
                        </Text>
                      </Box>
                    </Group>

                    <Menu position="bottom-end" shadow="md" radius="md">
                      <Menu.Target>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>

                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconStar size={14} />}
                          onClick={() =>
                            setDefaultVault(
                              defaultVaultId === vault.id ? null : vault.id
                            )
                          }
                        >
                          {defaultVaultId === vault.id
                            ? t("removeDefault", "Bỏ mặc định")
                            : t("setAsDefault", "Đặt làm mặc định")}
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          onClick={() => {
                            setVaultToRename(vault);
                            setRenamedName(vault.name);
                            setRenameOpened(true);
                          }}
                        >
                          {t("rename", "Đổi tên")}
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => {
                            setVaultToDelete(vault);
                            setDeleteFile(false);
                            setDeleteOpened(true);
                          }}
                        >
                          {t("delete", "Xóa")}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Card>
              ))}

              <Card
                withBorder
                padding="md"
                radius="md"
                className={classes.createVaultCard}
                onClick={() => setNewVaultOpened(true)}
              >
                <Group justify="center" gap="xs">
                  <IconPlus size={16} color="var(--mantine-color-indigo-4)" />
                  <Text fw={600} size="sm" c="indigo.4">
                    {t("createNewVaultBtn", "Tạo Vault mới")}
                  </Text>
                </Group>
              </Card>
            </Stack>
          </Paper>
        )}
      </Container>

      {/* CREATE NEW VAULT MODAL */}
      <Modal
        opened={newVaultOpened}
        onClose={() => setNewVaultOpened(false)}
        title={t("createNewVaultTitle", "Tạo Vault mới")}
        radius="md"
        centered
        styles={{
          content: {
            backgroundColor: "rgba(26, 27, 30, 0.98)",
            border: "1px solid var(--mantine-color-dark-4)",
            color: "white",
          },
          header: {
            backgroundColor: "transparent",
            color: "white",
            borderBottom: "1px solid var(--mantine-color-dark-5)",
            paddingBottom: "12px",
          },
        }}
      >
        <form onSubmit={handleCreateVault}>
          <Stack gap="md" mt="xs">
            {newVaultError && (
              <Alert
                icon={<IconAlertTriangle size={16} />}
                color="red"
                radius="md"
              >
                {newVaultError}
              </Alert>
            )}

            <TextInput
              required
              label={t("vaultIdLabel", "Mã định danh Vault")}
              placeholder="Ví dụ: work_vault, personal (chỉ ký tự và số)"
              value={newVaultId}
              onChange={(e) =>
                setNewVaultId(
                  e.currentTarget.value.replace(/[^A-Za-z0-9_-]/g, "")
                )
              }
              radius="md"
            />

            <TextInput
              required
              label={t("vaultNameLabel", "Tên hiển thị")}
              placeholder="Ví dụ: Kho công việc, Kho cá nhân"
              value={newVaultName}
              onChange={(e) => setNewVaultName(e.currentTarget.value)}
              radius="md"
            />

            <PasswordInput
              required
              label={t("vaultPasswordLabel", "Master Password")}
              placeholder="Nhập mật khẩu cho Vault này (tối thiểu 8 ký tự)"
              value={newVaultPassword}
              onChange={(e) => setNewVaultPassword(e.currentTarget.value)}
              radius="md"
            />

            <PasswordInput
              required
              label={t("vaultConfirmLabel", "Xác nhận mật khẩu")}
              placeholder="Nhập lại mật khẩu..."
              value={newVaultConfirm}
              onChange={(e) => setNewVaultConfirm(e.currentTarget.value)}
              radius="md"
            />

            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="default"
                radius="md"
                size="xs"
                onClick={() => setNewVaultOpened(false)}
              >
                {t("cancelBtn", "Hủy")}
              </Button>
              <Button type="submit" color="indigo" radius="md" size="xs">
                {t("createBtn", "Tạo mới")}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* RENAME VAULT MODAL */}
      <Modal
        opened={renameOpened}
        onClose={() => setRenameOpened(false)}
        title={t("renameVaultTitle", "Đổi tên Vault")}
        radius="md"
        centered
        size="sm"
        styles={{
          content: {
            backgroundColor: "rgba(26, 27, 30, 0.98)",
            border: "1px solid var(--mantine-color-dark-4)",
            color: "white",
          },
          header: {
            backgroundColor: "transparent",
            color: "white",
            borderBottom: "1px solid var(--mantine-color-dark-5)",
            paddingBottom: "12px",
          },
        }}
      >
        <form onSubmit={handleRenameSubmit}>
          <Stack gap="md" mt="xs">
            <TextInput
              required
              label={t("newVaultNameLabel", "Tên hiển thị mới")}
              value={renamedName}
              onChange={(e) => setRenamedName(e.currentTarget.value)}
              radius="md"
              autoFocus
            />

            <Group justify="flex-end" gap="sm">
              <Button
                variant="default"
                radius="md"
                size="xs"
                onClick={() => setRenameOpened(false)}
              >
                {t("cancelBtn", "Hủy")}
              </Button>
              <Button type="submit" color="indigo" radius="md" size="xs">
                {t("saveBtn", "Lưu")}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* DELETE VAULT CONFIRM MODAL */}
      <Modal
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        title={t("deleteVaultTitle", "Xóa Vault")}
        radius="md"
        centered
        size="sm"
        styles={{
          content: {
            backgroundColor: "rgba(26, 27, 30, 0.98)",
            border: "1px solid var(--mantine-color-dark-4)",
            color: "white",
          },
          header: {
            backgroundColor: "transparent",
            color: "white",
            borderBottom: "1px solid var(--mantine-color-dark-5)",
            paddingBottom: "12px",
          },
        }}
      >
        <Stack gap="md" mt="xs">
          <Text size="sm">
            {t(
              "deleteVaultDesc",
              "Bạn có chắc chắn muốn xóa Vault này khỏi danh sách quản lý không?"
            )}
          </Text>

          <Alert color="red" icon={<IconAlertTriangle size={16} />} radius="md">
            <Group gap="xs" align="flex-start" wrap="nowrap">
              <input
                type="checkbox"
                id="deleteFileCheckbox"
                checked={deleteFile}
                onChange={(e) => setDeleteFile(e.target.checked)}
                style={{ marginTop: "4px" }}
              />
              <label
                htmlFor="deleteFileCheckbox"
                style={{ fontSize: "13px", cursor: "pointer", color: "white" }}
              >
                <strong>
                  {t("deletePhysicalFile", "Xóa cả file dữ liệu vật lý (.enc)")}
                </strong>
                <br />
                <Text size="xs" c="dimmed">
                  {t(
                    "deletePhysicalFileWarn",
                    "Chú ý: File mã hóa của Vault này trên ổ đĩa sẽ bị xóa vĩnh viễn và không thể khôi phục lại."
                  )}
                </Text>
              </label>
            </Group>
          </Alert>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              radius="md"
              size="xs"
              onClick={() => setDeleteOpened(false)}
            >
              {t("cancelBtn", "Hủy")}
            </Button>
            <Button
              color="red"
              radius="md"
              size="xs"
              onClick={handleDeleteSubmit}
            >
              {t("deleteSubmitBtn", "Xóa")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

export default VaultSelectionPage;
