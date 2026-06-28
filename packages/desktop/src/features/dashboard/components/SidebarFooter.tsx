import { Box, Group, Tooltip, ActionIcon, Button } from "@mantine/core";
import {
  IconLock,
  IconBrandGithub,
  IconWorld,
  IconChevronRight,
} from "@tabler/icons-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import classes from "./SidebarFooter.module.css";
import { useTranslation } from "react-i18next";

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

  const handleOpenUrl = (url: string) => {
    openUrl(url).catch((err) => console.error("Failed to open URL:", err));
  };

  return (
    <Box p="md" className={classes.footerContainer}>
      {/* Expand Action (only when collapsed) */}
      {isCollapsed && (
        <Group
          justify="center"
          onClick={onToggleCollapse}
          className={classes.collapseAction}
        >
          <IconChevronRight size={18} />
        </Group>
      )}

      {/* Social icons / locking */}
      <Group justify={isCollapsed ? "center" : "space-between"} gap="xs">
        {isCollapsed ? (
          <Tooltip label={t("lockApp")} position="right" withArrow>
            <ActionIcon
              variant="light"
              color="red"
              size="md"
              onClick={onLock}
              radius="md"
            >
              <IconLock size={16} />
            </ActionIcon>
          </Tooltip>
        ) : (
          <>
            <Group gap="xs">
              <Tooltip label={t("githubLabel")}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="md"
                  onClick={() =>
                    handleOpenUrl(
                      "https://github.com/haiphamngoc-dev/secure-vault-manager"
                    )
                  }
                  radius="md"
                >
                  <IconBrandGithub size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t("websiteLabel")}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="md"
                  onClick={() =>
                    handleOpenUrl(
                      "https://github.com/haiphamngoc-dev/secure-vault-manager"
                    )
                  }
                  radius="md"
                >
                  <IconWorld size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconLock size={12} />}
              onClick={onLock}
              radius="md"
            >
              {t("lockApp")}
            </Button>
          </>
        )}
      </Group>
    </Box>
  );
}

export default SidebarFooter;
