import { Box, Group, Tooltip, ActionIcon, Button, Stack } from "@mantine/core";
import { IconLock, IconChevronRight } from "@tabler/icons-react";
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
        )}
      </Stack>
    </Box>
  );
}

export default SidebarFooter;
