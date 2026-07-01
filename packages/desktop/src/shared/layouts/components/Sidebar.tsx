import { useEffect, useRef } from "react";
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
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarFooter } from "./SidebarFooter";
import classes from "./Sidebar.module.css";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenAdd: () => void;
  onLock: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NewItemButtonProps {
  isCollapsed: boolean;
  onClick: () => void;
}

function NewItemButton({ isCollapsed, onClick }: Readonly<NewItemButtonProps>) {
  const { t } = useTranslation();

  if (isCollapsed) {
    return (
      <Tooltip label={t("newItemBtn")} position="right" withArrow>
        <ActionIcon
          size="lg"
          color="blue"
          onClick={onClick}
          style={{ alignSelf: "center", marginBottom: "8px" }}
        >
          <IconPlus size={18} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Button
      leftSection={<IconPlus size={16} />}
      onClick={onClick}
      color="blue"
      style={{ marginBottom: "8px" }}
    >
      {t("newItemBtn")}
    </Button>
  );
}

interface VaultNavLinkProps {
  isCollapsed: boolean;
  activeTab: string;
  activeCategory: string;
  onTabChange: (tab: "vault" | "settings") => void;
  onCategoryChange: (category: string) => void;
}

function VaultNavLink({
  isCollapsed,
  activeTab,
  activeCategory,
  onTabChange,
  onCategoryChange,
}: Readonly<VaultNavLinkProps>) {
  const { t } = useTranslation();
  const isActive = activeTab === "vault";

  if (isCollapsed) {
    return (
      <Tooltip label={t("vaultItems")} position="right" withArrow>
        <ActionIcon
          size="lg"
          variant={isActive ? "light" : "subtle"}
          color={isActive ? "blue" : "gray"}
          onClick={() => onTabChange("vault")}
          style={{ alignSelf: "center" }}
        >
          <IconShield size={18} />
        </ActionIcon>
      </Tooltip>
    );
  }

  const isCategoryActive = (category: string) =>
    isActive && activeCategory === category;

  return (
    <NavLink
      label={t("vaultItems")}
      leftSection={<IconShield size={18} />}
      className={`${classes.sidebarNavlink} ${
        isActive ? classes.sidebarNavlinkActive : ""
      }`}
      active={isActive}
      onClick={() => onTabChange("vault")}
      defaultOpened
    >
      <NavLink
        label={t("allSub")}
        leftSection={<IconShield size={16} />}
        active={isCategoryActive("all")}
        onClick={() => onCategoryChange("all")}
        className={classes.sidebarSubNavlink}
      />
      <NavLink
        label={t("logins")}
        leftSection={<IconKey size={16} />}
        active={isCategoryActive("Login")}
        onClick={() => onCategoryChange("Login")}
        className={classes.sidebarSubNavlink}
      />
      <NavLink
        label={t("notes")}
        leftSection={<IconFileText size={16} />}
        active={isCategoryActive("Note")}
        onClick={() => onCategoryChange("Note")}
        className={classes.sidebarSubNavlink}
      />
      <NavLink
        label={t("cards")}
        leftSection={<IconCreditCard size={16} />}
        active={isCategoryActive("Card")}
        onClick={() => onCategoryChange("Card")}
        className={classes.sidebarSubNavlink}
      />
      <NavLink
        label={t("databases")}
        leftSection={<IconDatabase size={16} />}
        active={isCategoryActive("Database")}
        onClick={() => onCategoryChange("Database")}
        className={classes.sidebarSubNavlink}
      />
    </NavLink>
  );
}

interface SettingsNavLinkProps {
  isCollapsed: boolean;
  activeTab: string;
  onTabChange: (tab: "vault" | "settings") => void;
}

function SettingsNavLink({
  isCollapsed,
  activeTab,
  onTabChange,
}: Readonly<SettingsNavLinkProps>) {
  const { t } = useTranslation();
  const isActive = activeTab === "settings";

  if (isCollapsed) {
    return (
      <Tooltip label={t("settingsSync")} position="right" withArrow>
        <ActionIcon
          size="lg"
          variant={isActive ? "light" : "subtle"}
          color={isActive ? "blue" : "gray"}
          onClick={() => onTabChange("settings")}
          style={{ alignSelf: "center" }}
        >
          <IconSettings size={18} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <NavLink
      label={t("settingsSync")}
      leftSection={<IconSettings size={18} />}
      className={`${classes.sidebarNavlink} ${
        isActive ? classes.sidebarNavlinkActive : ""
      }`}
      active={isActive}
      onClick={() => onTabChange("settings")}
    />
  );
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  onOpenAdd,
  onLock,
  mobileOpen,
  onMobileClose,
}: Readonly<SidebarProps>) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(max-width: 991px) and (min-width: 768px)");
  const wasTabletRef = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const activeTab = location.pathname === "/settings" ? "settings" : "vault";
  const activeCategory = searchParams.get("category") || "all";

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
    if (tab === "settings") {
      navigate("/settings");
    } else {
      navigate("/");
    }
    if (isMobile) {
      onMobileClose();
    }
  };

  const handleCategoryChange = (category: string) => {
    navigate(`/?category=${category}`);
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
          <NewItemButton
            isCollapsed={effectiveCollapsed}
            onClick={handleOpenAdd}
          />

          <VaultNavLink
            isCollapsed={effectiveCollapsed}
            activeTab={activeTab}
            activeCategory={activeCategory}
            onTabChange={handleTabChange}
            onCategoryChange={handleCategoryChange}
          />

          <SettingsNavLink
            isCollapsed={effectiveCollapsed}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
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
