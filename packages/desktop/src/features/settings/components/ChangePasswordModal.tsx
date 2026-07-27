import { Modal, Button, PasswordInput, Stack, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import classes from "./ChangePasswordModal.module.css";

interface ChangePasswordModalProps {
  opened: boolean;
  onClose: () => void;
  vaultId: string | null;
}

export function ChangePasswordModal({
  opened,
  onClose,
  vaultId,
}: Readonly<ChangePasswordModalProps>) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [oldPasswordError, setOldPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const validate = () => {
    let isValid = true;
    if (!oldPassword) {
      setOldPasswordError(t("oldPasswordRequired"));
      isValid = false;
    } else {
      setOldPasswordError("");
    }

    if (newPassword.length < 8) {
      setNewPasswordError(t("passwordLengthError"));
      isValid = false;
    } else {
      setNewPasswordError("");
    }

    if (confirmNewPassword !== newPassword) {
      setConfirmPasswordError(t("passwordsDoNotMatch"));
      isValid = false;
    } else {
      setConfirmPasswordError("");
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (!vaultId) {
      notifications.show({
        title: t("error"),
        message: "No active vault detected.",
        color: "red",
      });
      return;
    }

    setLoading(true);
    try {
      await invoke("change_vault_password", {
        vaultId,
        oldPassword,
        newPassword,
      });

      notifications.show({
        title: t("success"),
        message: t("changePasswordSuccess"),
        color: "green",
        autoClose: 3000,
      });
      resetForm();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to change password:", err);
      const errMsg = typeof err === "string" ? err : String(err);
      notifications.show({
        title: t("error"),
        message: errMsg.includes("Incorrect old password")
          ? t("changePasswordError")
          : errMsg,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setOldPasswordError("");
    setNewPasswordError("");
    setConfirmPasswordError("");
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleCancel}
      title={t("changePasswordModalTitle")}
      centered
      classNames={{
        content: classes.modalContent,
        header: classes.modalHeader,
        title: classes.modalTitle,
      }}
      styles={{
        content: {
          backgroundColor: "var(--color-neutral-card)",
          color: "var(--color-neutral-dark)",
          border: "1px solid var(--color-neutral-light)",
        },
        header: {
          backgroundColor: "var(--color-neutral-card)",
          color: "var(--color-neutral-dark)",
          borderBottom: "1px solid var(--color-neutral-light)",
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md" mt="md">
          <PasswordInput
            label={t("oldPasswordLabel")}
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            error={oldPasswordError}
            styles={{
              input: {
                backgroundColor: "var(--color-neutral-background)",
                color: "var(--color-neutral-dark)",
                border: "1px solid var(--color-neutral-light)",
              },
            }}
          />
          <PasswordInput
            label={t("newPasswordLabel")}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={newPasswordError}
            styles={{
              input: {
                backgroundColor: "var(--color-neutral-background)",
                color: "var(--color-neutral-dark)",
                border: "1px solid var(--color-neutral-light)",
              },
            }}
          />
          <PasswordInput
            label={t("confirmNewPasswordLabel")}
            required
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            error={confirmPasswordError}
            styles={{
              input: {
                backgroundColor: "var(--color-neutral-background)",
                color: "var(--color-neutral-dark)",
                border: "1px solid var(--color-neutral-light)",
              },
            }}
          />

          <Group justify="flex-end" mt="xl">
            <Button
              variant="subtle"
              color="gray"
              onClick={handleCancel}
              disabled={loading}
            >
              {t("cancelBtn")}
            </Button>
            <Button type="submit" color="blue" loading={loading}>
              {t("changePasswordBtn")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
