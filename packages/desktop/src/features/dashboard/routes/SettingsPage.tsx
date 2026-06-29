import { Box, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
import { MainHeader } from "@/shared/layouts/components/MainHeader";
import classes from "./DashboardPage.module.css";

export function SettingsPage() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { openMobileSidebar } = useOutletContext<{
    openMobileSidebar: () => void;
  }>();

  return (
    <>
      <MainHeader
        title={t("settingsSync")}
        description={t("settingsSyncDesc")}
        showMenuButton={isMobile}
        onMenuClick={openMobileSidebar}
      />
      <Box className={classes.scrollContainer}>
        <Stack gap="xs" p="md">
          <Text c="dimmed">
            Configure auto-lock intervals, language, and proxy settings.
          </Text>
        </Stack>
      </Box>
    </>
  );
}

export default SettingsPage;
