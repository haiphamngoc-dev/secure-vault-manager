import {
  Box,
  Group,
  Tooltip,
  ActionIcon,
  Button,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconLock,
  IconChevronRight,
  IconReplace,
  IconFolder,
} from "@tabler/icons-react";
import classes from "./SidebarFooter.module.css";
import { useTranslation } from "react-i18next";
import { useVault } from "@/app/providers/VaultProvider";

interface SidebarFooterProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLock: () => void;
}

export function SidebarFooter({
  isCollapsed,
  onToggleCollapse,
  onLock,
}: Readonly<SidebarFooterProps>) {
  const { t } = useTranslation();
  const { vaults, currentVaultId } = useVault();

  const currentVault = vaults.find((v) => v.id === currentVaultId);
  const vaultName = currentVault ? currentVault.name : "";

  return (
    <Box p="md" className={classes.footerContainer}>
      {/* Expand Action (only when collapsed) */}
      {isCollapsed && (
        <Group
          justify="center"
          onClick={onToggleCollapse}
          className={classes.collapseAction}
          mb="xs"
        >
          <IconChevronRight size={18} />
        </Group>
      )}

      {/* Active Vault Display */}
      {!isCollapsed && vaultName && (
        <Box
          mb="xs"
          style={{
            textAlign: "center",
            borderBottom: "1px solid var(--color-neutral-light)",
            paddingBottom: "8px",
          }}
        >
          <Group gap="xs" justify="center" wrap="nowrap">
            <IconFolder size={14} color="var(--color-brand-primary)" />
            <Text
              size="xs"
              fw={700}
              c="dimmed"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "160px",
              }}
            >
              {vaultName}
            </Text>
          </Group>
        </Box>
      )}

      {/* Action buttons */}
      <Stack gap="xs">
        {isCollapsed ? (
          <Stack gap="xs" align="center">
            <Tooltip
              label={t("switchVault", "Chuyển Vault")}
              position="right"
              withArrow
            >
              <ActionIcon
                variant="light"
                color="blue"
                size="md"
                onClick={onLock}
              >
                <IconReplace size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("lockApp")} position="right" withArrow>
              <ActionIcon
                variant="light"
                color="red"
                size="md"
                onClick={onLock}
              >
                <IconLock size={16} />
              </ActionIcon>
            </Tooltip>
          </Stack>
        ) : (
          <Group gap="xs" wrap="nowrap">
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<IconReplace size={12} />}
              onClick={onLock}
              style={{ flex: 1 }}
            >
              {t("switchVault", "Chuyển Vault")}
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconLock size={12} />}
              onClick={onLock}
              style={{ flex: 1 }}
            >
              {t("lockApp")}
            </Button>
          </Group>
        )}
      </Stack>
    </Box>
  );
}

export default SidebarFooter;
