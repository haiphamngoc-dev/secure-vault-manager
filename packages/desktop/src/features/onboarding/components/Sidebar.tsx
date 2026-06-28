import React, { useState } from "react";
import {
  Stack,
  Tooltip,
  UnstyledButton,
  Group,
  Text,
  Drawer,
  ActionIcon,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconLock,
  IconShieldLock,
  IconCreditCard,
  IconNote,
  IconMenu2,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useVault } from "@/app/providers/VaultProvider";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarFooter } from "./SidebarFooter";
import classes from "./Sidebar.module.css";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({
  activeSection,
  onSectionChange,
}: Readonly<SidebarProps>) {
  const { t } = useTranslation();
  const { lock } = useVault();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(max-width: 991px) and (min-width: 768px)");

  // Derive collapsed state based on manual toggle or tablet layout
  const isCollapsed = collapsed || !!isTablet;

  const navItems = [
    { id: "all", label: t("navAll", "All Items"), icon: IconShieldLock },
    { id: "logins", label: t("navLogins", "Logins"), icon: IconLock },
    { id: "cards", label: t("navCards", "Cards"), icon: IconCreditCard },
    { id: "notes", label: t("navNotes", "Secure Notes"), icon: IconNote },
  ];

  const handleNavClick = (id: string) => {
    onSectionChange(id);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const renderNavLinks = () => {
    return navItems.map((item) => {
      const Icon = item.icon;
      const isActive = activeSection === item.id;

      const buttonEl = (
        <UnstyledButton
          key={item.id}
          className={`${classes.link} ${isActive ? classes.activeLink : ""}`}
          onClick={() => handleNavClick(item.id)}
        >
          <Group gap="xs" wrap="nowrap">
            <Icon size={20} className={classes.linkIcon} />
            {(!isCollapsed || isMobile) && (
              <Text size="sm" className={classes.linkLabel}>
                {item.label}
              </Text>
            )}
          </Group>
        </UnstyledButton>
      );

      if (isCollapsed && !isMobile) {
        return (
          <Tooltip
            key={item.id}
            label={item.label}
            position="right"
            transitionProps={{ duration: 150 }}
          >
            {buttonEl}
          </Tooltip>
        );
      }

      return buttonEl;
    });
  };

  const sidebarContent = (
    <div
      className={`${classes.sidebar} ${isCollapsed ? classes.collapsed : ""}`}
    >
      <SidebarHeader
        collapsed={isCollapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        isMobile={!!isMobile}
        isTablet={!!isTablet}
      />

      <Stack gap="xs" className={classes.linksContainer} mt="xl">
        {renderNavLinks()}
      </Stack>

      <SidebarFooter
        collapsed={isCollapsed}
        activeSection={activeSection}
        onSectionChange={handleNavClick}
        onLock={lock}
        isMobile={!!isMobile}
      />
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile top floating bar to toggle drawer */}
        <Group className={classes.mobileHeader} justify="space-between" px="md">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => setMobileOpen(true)}
          >
            <IconMenu2 size={24} />
          </ActionIcon>
          <Text fw={800} size="sm">
            Secure Vault
          </Text>
          <div style={{ width: 24 }} /> {/* Spacer */}
        </Group>

        <Drawer
          opened={mobileOpen}
          onClose={() => setMobileOpen(false)}
          size="260px"
          withCloseButton={false}
          styles={{
            body: { padding: 0, height: "100%" },
            content: { background: "var(--mantine-color-dark-8)" },
          }}
        >
          {sidebarContent}
        </Drawer>
      </>
    );
  }

  return sidebarContent;
}

export default Sidebar;
