import React, { useState } from "react";
import { Box, Text, Stack } from "@mantine/core";
import { Sidebar } from "../components/Sidebar";
import { DashboardHeader } from "../components/DashboardHeader";
import { useVault } from "@/app/providers/VaultProvider";
import { useTranslation } from "react-i18next";
import classes from "./DashboardPage.module.css";

export function DashboardPage() {
  const { lock } = useVault();
  const { t } = useTranslation();
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

  const renderContent = () => {
    if (activeTab === "settings") {
      return (
        <Stack gap="xs">
          <Text c="dimmed">
            Configure auto-lock intervals, language, and proxy settings.
          </Text>
        </Stack>
      );
    }

    switch (activeCategory) {
      case "all":
        return (
          <Stack gap="xs">
            <Text c="dimmed">
              Manage all your secure credentials and notes here.
            </Text>
          </Stack>
        );
      case "Login":
        return (
          <Stack gap="xs">
            <Text c="dimmed">Your encrypted login credentials.</Text>
          </Stack>
        );
      case "Card":
        return (
          <Stack gap="xs">
            <Text c="dimmed">Secure credit and debit card information.</Text>
          </Stack>
        );
      case "Note":
        return (
          <Stack gap="xs">
            <Text c="dimmed">Encrypted personal notes and keys.</Text>
          </Stack>
        );
      case "Database":
        return (
          <Stack gap="xs">
            <Text c="dimmed">
              Encrypted database keys and connection settings.
            </Text>
          </Stack>
        );
      default:
        return null;
    }
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
      />
      <Box className={classes.mainContent}>
        <DashboardHeader title={getHeaderTitle()} />
        <Box className={classes.scrollContainer}>{renderContent()}</Box>
      </Box>
    </Box>
  );
}

export default DashboardPage;
