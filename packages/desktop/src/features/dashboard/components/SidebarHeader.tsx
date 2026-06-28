import { Box, Group, Avatar, Text, ActionIcon, Badge } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";
import classes from "./SidebarHeader.module.css";
import { useTranslation } from "react-i18next";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function SidebarHeader({
  isCollapsed,
  onToggleCollapse,
}: Readonly<SidebarHeaderProps>) {
  const { t } = useTranslation();

  return (
    <Box p="md" className={classes.headerContainer}>
      <Group justify={isCollapsed ? "center" : "space-between"} wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
          <Avatar radius="md" color="indigo" style={{ fontWeight: 800 }}>
            PW
          </Avatar>
          {!isCollapsed && (
            <Box style={{ whiteSpace: "nowrap" }}>
              <Group
                gap="xs"
                align="center"
                wrap="nowrap"
                style={{ marginBottom: "2px" }}
              >
                <Text size="sm" fw={700} className={classes.logoText}>
                  {t("vaultTitle")}
                </Text>
                <Badge
                  variant="outline"
                  color="gray"
                  size="xs"
                  style={{ fontSize: "9px", height: "16px", padding: "0 4px" }}
                >
                  v1.0.0
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {t("offlineFirst")}
              </Text>
            </Box>
          )}
        </Group>
        {!isCollapsed && (
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={onToggleCollapse}
            radius="md"
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
        )}
      </Group>
    </Box>
  );
}

export default SidebarHeader;
