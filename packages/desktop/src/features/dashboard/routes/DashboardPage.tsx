import { useState } from "react";
import { Box, Title, Text, Stack } from "@mantine/core";
import { Sidebar } from "../components/Sidebar";
import { useVault } from "@/app/providers/VaultProvider";
import classes from "./DashboardPage.module.css";

export function DashboardPage() {
  const { lock } = useVault();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"vault" | "settings">("vault");
  const [activeCategory, setActiveCategory] = useState("all");
  const [, setSelectedItemId] = useState<string | null>(null);

  const onOpenAdd = () => {
    console.log("Open add new item modal");
  };

  const renderContent = () => {
    if (activeTab === "settings") {
      return (
        <Stack gap="xs">
          <Title order={2}>Settings & Sync</Title>
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
            <Title order={2}>All Items</Title>
            <Text c="dimmed">
              Manage all your secure credentials and notes here.
            </Text>
          </Stack>
        );
      case "Login":
        return (
          <Stack gap="xs">
            <Title order={2}>Logins</Title>
            <Text c="dimmed">Your encrypted login credentials.</Text>
          </Stack>
        );
      case "Card":
        return (
          <Stack gap="xs">
            <Title order={2}>Payment Cards</Title>
            <Text c="dimmed">Secure credit and debit card information.</Text>
          </Stack>
        );
      case "Note":
        return (
          <Stack gap="xs">
            <Title order={2}>Secure Notes</Title>
            <Text c="dimmed">Encrypted personal notes and keys.</Text>
          </Stack>
        );
      case "Database":
        return (
          <Stack gap="xs">
            <Title order={2}>Databases</Title>
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
        <Box className={classes.scrollContainer}>{renderContent()}</Box>
      </Box>
    </Box>
  );
}

export default DashboardPage;
