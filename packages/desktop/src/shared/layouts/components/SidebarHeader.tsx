import { useState } from "react";
import {
  Box,
  Group,
  Avatar,
  Text,
  ActionIcon,
  Menu,
  Modal,
  TextInput,
  Button,
  Stack,
  PasswordInput,
  Switch,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconDotsVertical,
  IconEdit,
  IconReplace,
} from "@tabler/icons-react";
import classes from "./SidebarHeader.module.css";
import { useTranslation } from "react-i18next";
import { useVault } from "@/app/providers/VaultProvider";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLock: () => void;
}

export function SidebarHeader({
  isCollapsed,
  onToggleCollapse,
  onLock,
}: Readonly<SidebarHeaderProps>) {
  const { t } = useTranslation();
  const { vaults, currentVaultId, renameVault } = useVault();

  const currentVault = vaults.find((v) => v.id === currentVaultId);
  const vaultName = currentVault ? currentVault.name : t("vaultTitle");
  const avatarInitials = vaultName
    ? vaultName.substring(0, 2).toUpperCase()
    : "PW";

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newVaultName, setNewVaultName] = useState(vaultName);
  const [changePassword, setChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [oldPasswordError, setOldPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let isValid = true;
    if (!newVaultName.trim()) {
      isValid = false;
    }
    if (changePassword) {
      if (!oldPassword) {
        setOldPasswordError(
          t("oldPasswordRequired", "Vui lòng nhập mật khẩu hiện tại")
        );
        isValid = false;
      } else {
        setOldPasswordError("");
      }

      if (newPassword.length < 8) {
        setNewPasswordError(
          t("passwordLengthError", "Mật khẩu phải dài ít nhất 8 ký tự")
        );
        isValid = false;
      } else {
        setNewPasswordError("");
      }

      if (confirmNewPassword !== newPassword) {
        setConfirmPasswordError(
          t("passwordsDoNotMatch", "Mật khẩu xác nhận không khớp")
        );
        isValid = false;
      } else {
        setConfirmPasswordError("");
      }
    }
    return isValid;
  };

  const handleSave = async () => {
    if (!currentVaultId || !validate()) return;
    setLoading(true);

    try {
      let isNameUpdated = false;
      let isPasswordUpdated = false;

      // 1. Rename vault if modified
      if (newVaultName.trim() !== vaultName) {
        await renameVault(currentVaultId, newVaultName.trim());
        isNameUpdated = true;
      }

      // 2. Change password if switch is active
      if (changePassword) {
        await invoke("change_vault_password", {
          vaultId: currentVaultId,
          oldPassword,
          newPassword,
        });
        isPasswordUpdated = true;
      }

      // Show success notification based on what changed
      if (isNameUpdated && isPasswordUpdated) {
        notifications.show({
          title: t("successEditVault", "Cập nhật Vault thành công!"),
          message: "",
          color: "green",
          autoClose: 2000,
        });
      } else if (isNameUpdated) {
        notifications.show({
          title: t("successRenameVault", "Đổi tên vault thành công!"),
          message: "",
          color: "green",
          autoClose: 2000,
        });
      } else if (isPasswordUpdated) {
        notifications.show({
          title: t(
            "changePasswordSuccess",
            "Thay đổi mật khẩu chính thành công!"
          ),
          message: "",
          color: "green",
          autoClose: 2000,
        });
      }

      setEditModalOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setChangePassword(false);
    } catch (err: unknown) {
      console.error("Failed to edit vault:", err);
      const errMsg = typeof err === "string" ? err : String(err);
      notifications.show({
        title: t("error", "Lỗi"),
        message: errMsg.includes("Incorrect old password")
          ? t(
              "changePasswordError",
              "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại."
            )
          : errMsg,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditModalOpen(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setOldPasswordError("");
    setNewPasswordError("");
    setConfirmPasswordError("");
    setChangePassword(false);
  };

  return (
    <>
      <Box px="md" className={classes.headerContainer}>
        <Group justify={isCollapsed ? "center" : "space-between"} wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
            <Avatar color="blue" style={{ fontWeight: 800 }}>
              {avatarInitials}
            </Avatar>
            {!isCollapsed && (
              <Box style={{ whiteSpace: "nowrap" }}>
                <Text
                  size="sm"
                  fw={700}
                  className={classes.logoText}
                  style={{ marginBottom: "2px" }}
                >
                  {vaultName}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("offlineFirst")}
                </Text>
              </Box>
            )}
          </Group>
          {!isCollapsed && (
            <Group gap={4} wrap="nowrap">
              <Menu position="bottom-end" shadow="md" radius="md">
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" radius="md">
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconEdit size={14} />}
                    onClick={() => {
                      setNewVaultName(vaultName);
                      setChangePassword(false);
                      setOldPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                      setOldPasswordError("");
                      setNewPasswordError("");
                      setConfirmPasswordError("");
                      setEditModalOpen(true);
                    }}
                  >
                    {t("editVault", "Chỉnh sửa Vault")}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconReplace size={14} />}
                    onClick={onLock}
                  >
                    {t("switchVault", "Chuyển vault")}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>

              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={onToggleCollapse}
                radius="md"
              >
                <IconChevronLeft size={18} />
              </ActionIcon>
            </Group>
          )}
        </Group>
      </Box>

      <Modal
        opened={editModalOpen}
        onClose={handleCancel}
        title={t("editVaultTitle", "Chỉnh sửa Vault")}
        centered
        radius="lg"
        size="md"
        classNames={{
          content: classes.modalContent,
          header: classes.modalHeader,
          title: classes.modalTitle,
        }}
      >
        <Stack gap="md" mt="md">
          <TextInput
            label={t("vaultNameLabel", "Tên Vault")}
            value={newVaultName}
            onChange={(e) => setNewVaultName(e.currentTarget.value)}
            required
            radius="md"
          />

          <Switch
            label={t("changeVaultPasswordLabel", "Thay đổi mật khẩu Vault")}
            description={t(
              "changeVaultPasswordDesc",
              "Kích hoạt để thay đổi mật khẩu mở khóa cho Vault này."
            )}
            checked={changePassword}
            onChange={(e) => setChangePassword(e.currentTarget.checked)}
            color="blue"
            mt="xs"
          />

          {changePassword && (
            <Stack gap="sm" mt="xs">
              <PasswordInput
                label={t("oldPasswordLabel", "Mật khẩu hiện tại")}
                placeholder={t(
                  "pairingKeyPlaceholder",
                  "Nhập mật khẩu hiện tại"
                )}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.currentTarget.value)}
                error={oldPasswordError}
                required
                radius="md"
              />
              <PasswordInput
                label={t("newPasswordLabel", "Mật khẩu mới")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.currentTarget.value)}
                error={newPasswordError}
                required
                radius="md"
              />
              <PasswordInput
                label={t("confirmNewPasswordLabel", "Xác nhận mật khẩu mới")}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.currentTarget.value)}
                error={confirmPasswordError}
                required
                radius="md"
              />
            </Stack>
          )}

          <Group justify="flex-end" gap="xs" mt="md">
            <Button
              variant="default"
              size="xs"
              radius="md"
              onClick={handleCancel}
              disabled={loading}
            >
              {t("cancelBtn", "Hủy")}
            </Button>
            <Button
              color="blue"
              size="xs"
              radius="md"
              onClick={handleSave}
              loading={loading}
              disabled={
                !newVaultName.trim() ||
                (newVaultName === vaultName && !changePassword)
              }
            >
              {t("saveBtn", "Lưu")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

export default SidebarHeader;
