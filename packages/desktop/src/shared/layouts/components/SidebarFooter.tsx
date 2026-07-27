import { Box, Group, Tooltip, ActionIcon, Button, Stack } from "@mantine/core";
import { IconLock, IconChevronRight, IconCup } from "@tabler/icons-react";
import classes from "./SidebarFooter.module.css";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";

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

      {/* Action buttons */}
      <Stack gap="xs">
        {isCollapsed ? (
          <Stack gap="xs" align="center">
            <Tooltip label="Buy me a coffee" position="right" withArrow>
              <ActionIcon
                variant="light"
                color="pink"
                size="md"
                onClick={() =>
                  openUrl("https://ko-fi.com/haiphamngoc").catch(console.error)
                }
              >
                <IconCup size={16} />
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
          <>
            <Button
              size="xs"
              variant="light"
              color="pink"
              leftSection={<IconCup size={12} />}
              onClick={() =>
                openUrl("https://ko-fi.com/haiphamngoc").catch(console.error)
              }
              fullWidth
            >
              Buy me a coffee
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconLock size={12} />}
              onClick={onLock}
              fullWidth
            >
              {t("lockApp")}
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}

export default SidebarFooter;
