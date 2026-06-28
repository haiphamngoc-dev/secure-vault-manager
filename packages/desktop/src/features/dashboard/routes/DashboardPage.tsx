import React, { useState } from "react";
import { Box, Title, Text, Stack } from "@mantine/core";
import { Sidebar } from "../components/Sidebar";
import classes from "./DashboardPage.module.css";

export function DashboardPage() {
  const [activeSection, setActiveSection] = useState("all");

  const renderContent = () => {
    switch (activeSection) {
      case "all":
        return (
          <Stack gap="xs">
            <Title order={2}>All Items</Title>
            <Text c="dimmed">
              Manage all your secure credentials and notes here.
            </Text>
          </Stack>
        );
      case "logins":
        return (
          <Stack gap="xs">
            <Title order={2}>Logins</Title>
            <Text c="dimmed">Your encrypted login credentials.</Text>
          </Stack>
        );
      case "cards":
        return (
          <Stack gap="xs">
            <Title order={2}>Payment Cards</Title>
            <Text c="dimmed">Secure credit and debit card information.</Text>
          </Stack>
        );
      case "notes":
        return (
          <Stack gap="xs">
            <Title order={2}>Secure Notes</Title>
            <Text c="dimmed">Encrypted personal notes and keys.</Text>
          </Stack>
        );
      case "settings":
        return (
          <Stack gap="xs">
            <Title order={2}>Settings</Title>
            <Text c="dimmed">
              Configure auto-lock intervals, language, and proxy settings.
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
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <Box className={classes.mainContent}>{renderContent()}</Box>
    </Box>
  );
}

export default DashboardPage;
