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

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [newVaultName, setNewVaultName] = useState(vaultName);

  const handleRename = async () => {
    if (currentVaultId && newVaultName.trim()) {
      try {
        await renameVault(currentVaultId, newVaultName.trim());
        setRenameModalOpen(false);
        notifications.show({
          title: t("successRenameVault", "Đổi tên vault thành công!"),
          message: "",
          color: "green",
          autoClose: 2000,
        });
      } catch (err) {
        console.error("Failed to rename vault:", err);
      }
    }
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
                      setRenameModalOpen(true);
                    }}
                  >
                    {t("renameVault", "Đổi tên vault")}
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
        opened={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title={t("renameVault", "Đổi tên vault")}
        centered
        radius="md"
        size="sm"
        styles={{
          content: {
            backgroundColor: "var(--color-neutral-card)",
            border: "1px solid var(--color-neutral-light)",
          },
        }}
      >
        <Stack gap="md">
          <TextInput
            label={t("vaultNameLabel", "Tên Vault")}
            value={newVaultName}
            onChange={(e) => setNewVaultName(e.currentTarget.value)}
            required
          />
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              size="xs"
              radius="md"
              onClick={() => setRenameModalOpen(false)}
            >
              {t("cancelBtn", "Hủy")}
            </Button>
            <Button
              color="blue"
              size="xs"
              radius="md"
              onClick={handleRename}
              disabled={!newVaultName.trim() || newVaultName === vaultName}
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
