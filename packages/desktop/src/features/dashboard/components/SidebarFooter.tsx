import React from "react";
import { Stack, Tooltip, UnstyledButton, Group, Text } from "@mantine/core";
import { IconSettings, IconLock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "./SidebarFooter.module.css";

interface SidebarFooterProps {
  collapsed: boolean;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLock: () => void;
  isMobile: boolean;
}

export function SidebarFooter({
  collapsed,
  activeSection,
  onSectionChange,
  onLock,
  isMobile,
}: Readonly<SidebarFooterProps>) {
  const { t } = useTranslation();
  const isSettingsActive = activeSection === "settings";

  const settingsBtn = (
    <UnstyledButton
      className={`${classes.link} ${isSettingsActive ? classes.activeLink : ""}`}
      onClick={() => onSectionChange("settings")}
    >
      <Group gap="xs" wrap="nowrap">
        <IconSettings size={20} className={classes.linkIcon} />
        {(!collapsed || isMobile) && (
          <Text size="sm" className={classes.linkLabel}>
            {t("navSettings", "Settings")}
          </Text>
        )}
      </Group>
    </UnstyledButton>
  );

  const lockBtn = (
    <UnstyledButton
      className={`${classes.link} ${classes.lockLink}`}
      onClick={onLock}
    >
      <Group gap="xs" wrap="nowrap">
        <IconLock size={20} className={classes.linkIcon} />
        {(!collapsed || isMobile) && (
          <Text size="sm" className={classes.linkLabel}>
            {t("navLock", "Lock Vault")}
          </Text>
        )}
      </Group>
    </UnstyledButton>
  );

  return (
    <Stack gap="xs" className={classes.footer} mt="auto">
      {collapsed && !isMobile ? (
        <Tooltip
          label={t("navSettings", "Settings")}
          position="right"
          transitionProps={{ duration: 150 }}
        >
          {settingsBtn}
        </Tooltip>
      ) : (
        settingsBtn
      )}

      {collapsed && !isMobile ? (
        <Tooltip
          label={t("navLock", "Lock Vault")}
          position="right"
          transitionProps={{ duration: 150 }}
        >
          {lockBtn}
        </Tooltip>
      ) : (
        lockBtn
      )}
    </Stack>
  );
}

export default SidebarFooter;
