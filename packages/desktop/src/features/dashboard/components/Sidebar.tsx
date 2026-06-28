import React, { useEffect, useRef } from "react";
import {
  Box,
  Tooltip,
  ActionIcon,
  ScrollArea,
  Stack,
  NavLink,
  Button,
  Drawer,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconShield,
  IconDatabase,
  IconKey,
  IconFileText,
  IconCreditCard,
  IconSettings,
  IconPlus,
} from "@tabler/icons-react";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarFooter } from "./SidebarFooter";
import classes from "./Sidebar.module.css";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: "vault" | "settings";
  setActiveTab: (tab: "vault" | "settings") => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  setSelectedItemId: (id: string | null) => void;
  onOpenAdd: () => void;
  onLock: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  setActiveTab,
  activeCategory,
  setActiveCategory,
  setSelectedItemId,
  onOpenAdd,
  onLock,
  mobileOpen,
  onMobileClose,
}: Readonly<SidebarProps>) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(max-width: 991px) and (min-width: 768px)");
  const wasTabletRef = useRef(false);

  // Handle auto-collapse on tablet transition if not already collapsed
  useEffect(() => {
    if (isTablet && !wasTabletRef.current) {
      if (!isCollapsed) {
        onToggleCollapse();
      }
    }
    wasTabletRef.current = !!isTablet;
  }, [isTablet, isCollapsed, onToggleCollapse]);

  const handleOpenAdd = () => {
    onOpenAdd();
    if (isMobile) {
      onMobileClose();
    }
  };

  const handleTabChange = (tab: "vault" | "settings") => {
    setActiveTab(tab);
    setSelectedItemId(null);
    if (isMobile) {
      onMobileClose();
    }
  };

  const handleCategoryChange = (category: string) => {
    setActiveTab("vault");
    setActiveCategory(category);
    setSelectedItemId(null);
    if (isMobile) {
      onMobileClose();
    }
  };

  // Determine actual collapsed state (forced false on mobile drawer)
  const effectiveCollapsed = isMobile ? false : isCollapsed;

  const sidebarContent = (
    <Box
      className={`${classes.sidebar} ${effectiveCollapsed ? classes.collapsed : ""}`}
    >
      {/* Sidebar Header */}
      <SidebarHeader
        isCollapsed={effectiveCollapsed}
        onToggleCollapse={isMobile ? onMobileClose : onToggleCollapse}
      />

      {/* Sidebar Navigation */}
      <ScrollArea style={{ flex: 1 }} p="xs">
        <Stack gap="xs">
          {/* Nút Thêm Mới Item */}
          {effectiveCollapsed ? (
            <Tooltip label={t("newItemBtn")} position="right" withArrow>
              <ActionIcon
                size="xl"
                color="indigo"
                radius="md"
                onClick={handleOpenAdd}
                style={{ alignSelf: "center", marginBottom: "8px" }}
              >
                <IconPlus size={22} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleOpenAdd}
              radius="md"
              color="indigo"
              style={{ marginBottom: "8px" }}
            >
              {t("newItemBtn")}
            </Button>
          )}

          {effectiveCollapsed ? (
            <Tooltip label={t("vaultItems")} position="right" withArrow>
              <ActionIcon
                size="xl"
                variant={activeTab === "vault" ? "light" : "subtle"}
                color={activeTab === "vault" ? "indigo" : "gray"}
                radius="md"
                onClick={() => handleTabChange("vault")}
                style={{ alignSelf: "center" }}
              >
                <IconShield size={22} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <NavLink
              label={t("vaultItems")}
              leftSection={<IconShield size={18} />}
              className={`${classes.sidebarNavlink} ${
                activeTab === "vault" ? classes.sidebarNavlinkActive : ""
              }`}
              active={activeTab === "vault"}
              onClick={() => handleTabChange("vault")}
              defaultOpened
            >
              <NavLink
                label={t("allSub")}
                leftSection={<IconShield size={16} />}
                active={activeTab === "vault" && activeCategory === "all"}
                onClick={() => handleCategoryChange("all")}
                className={classes.sidebarSubNavlink}
              />
              <NavLink
                label={t("logins")}
                leftSection={<IconKey size={16} />}
                active={activeTab === "vault" && activeCategory === "Login"}
                onClick={() => handleCategoryChange("Login")}
                className={classes.sidebarSubNavlink}
              />
              <NavLink
                label={t("notes")}
                leftSection={<IconFileText size={16} />}
                active={activeTab === "vault" && activeCategory === "Note"}
                onClick={() => handleCategoryChange("Note")}
                className={classes.sidebarSubNavlink}
              />
              <NavLink
                label={t("cards")}
                leftSection={<IconCreditCard size={16} />}
                active={activeTab === "vault" && activeCategory === "Card"}
                onClick={() => handleCategoryChange("Card")}
                className={classes.sidebarSubNavlink}
              />
              <NavLink
                label={t("databases")}
                leftSection={<IconDatabase size={16} />}
                active={activeTab === "vault" && activeCategory === "Database"}
                onClick={() => handleCategoryChange("Database")}
                className={classes.sidebarSubNavlink}
              />
            </NavLink>
          )}

          {effectiveCollapsed ? (
            <Tooltip label={t("settingsSync")} position="right" withArrow>
              <ActionIcon
                size="xl"
                variant={activeTab === "settings" ? "light" : "subtle"}
                color={activeTab === "settings" ? "indigo" : "gray"}
                radius="md"
                onClick={() => handleTabChange("settings")}
                style={{ alignSelf: "center" }}
              >
                <IconSettings size={22} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <NavLink
              label={t("settingsSync")}
              leftSection={<IconSettings size={18} />}
              className={`${classes.sidebarNavlink} ${
                activeTab === "settings" ? classes.sidebarNavlinkActive : ""
              }`}
              active={activeTab === "settings"}
              onClick={() => handleTabChange("settings")}
            />
          )}
        </Stack>
      </ScrollArea>

      {/* Sidebar Footer */}
      <SidebarFooter
        isCollapsed={effectiveCollapsed}
        onToggleCollapse={onToggleCollapse}
        onLock={onLock}
      />
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        opened={mobileOpen}
        onClose={onMobileClose}
        size="270px"
        withCloseButton={false}
        classNames={{
          inner: classes.drawerInner,
          content: classes.drawerContent,
          overlay: classes.drawerOverlay,
        }}
        styles={{
          body: { padding: 0, height: "100%" },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return sidebarContent;
}

export default Sidebar;
