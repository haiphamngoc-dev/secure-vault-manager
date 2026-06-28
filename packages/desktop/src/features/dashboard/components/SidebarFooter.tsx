import { Box, Group, Tooltip, ActionIcon, Button } from "@mantine/core";
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
          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconLock size={12} />}
            onClick={onLock}
            radius="md"
            fullWidth
          >
            {t("lockApp")}
          </Button>
        )}
      </Group>
    </Box>
  );
}

export default SidebarFooter;
