import React from "react";
import { Group, Text, ActionIcon } from "@mantine/core";
import {
  IconShieldLock,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import classes from "./SidebarHeader.module.css";

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
  isTablet: boolean;
}

export function SidebarHeader({
  collapsed,
  onToggleCollapse,
  isMobile,
  isTablet,
}: Readonly<SidebarHeaderProps>) {
  return (
    <Group
      justify={collapsed ? "center" : "space-between"}
      className={classes.header}
      wrap="nowrap"
    >
      {(!collapsed || isMobile) && (
        <Group gap="xs" wrap="nowrap">
          <IconShieldLock size={28} className={classes.logoIcon} />
          <Text fw={800} size="md" className={classes.logoText}>
            Secure Vault
          </Text>
        </Group>
      )}

      {!isMobile && !isTablet && (
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={onToggleCollapse}
          className={classes.collapseBtn}
        >
          {collapsed ? (
            <IconChevronRight size={18} />
          ) : (
            <IconChevronLeft size={18} />
          )}
        </ActionIcon>
      )}
    </Group>
  );
}

export default SidebarHeader;
