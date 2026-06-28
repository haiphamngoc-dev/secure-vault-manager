import React, { useState } from "react";
import { Box } from "@mantine/core";
import { Sidebar } from "../components/Sidebar";
import { DashboardHeader } from "../components/DashboardHeader";
import { useVault } from "@/app/providers/VaultProvider";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@mantine/hooks";
import classes from "./DashboardPage.module.css";

export function DashboardPage() {
  const { lock } = useVault();
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"vault" | "settings">("vault");
  const [activeCategory, setActiveCategory] = useState("all");
  const [, setSelectedItemId] = useState<string | null>(null);

  const onOpenAdd = () => {
    console.log("Open add new item modal");
  };

  const getHeaderTitle = () => {
    if (activeTab === "settings") {
      return t("settingsSync");
    }
    switch (activeCategory) {
      case "all":
        return t("allSub");
      case "Login":
        return t("logins");
      case "Card":
        return t("cards");
      case "Note":
        return t("notes");
      case "Database":
        return t("databases");
      default:
        return "";
    }
  };

  const getHeaderDescription = () => {
    if (activeTab === "settings") {
      return t("settingsSyncDesc");
    }
    switch (activeCategory) {
      case "all":
        return t("allSubDesc");
      case "Login":
        return t("loginsDesc");
      case "Card":
        return t("cardsDesc");
      case "Note":
        return t("notesDesc");
      case "Database":
        return t("databasesDesc");
      default:
        return "";
    }
  };

  const renderContent = () => {
    // Content body will render items lists/settings controls here later.
    return null;
  };

  return (
    <Box className={classes.dashboardContainer}>
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        setSelectedItemId={setSelectedItemId}
        onOpenAdd={onOpenAdd}
        onLock={lock}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box className={classes.mainContent}>
        <DashboardHeader
          title={getHeaderTitle()}
          description={getHeaderDescription()}
          showMenuButton={isMobile}
          onMenuClick={() => setMobileOpen(true)}
        />
        <Box className={classes.scrollContainer}>{renderContent()}</Box>
      </Box>
    </Box>
  );
}

export default DashboardPage;
