import React from "react";
import { Box, Group, Title, ActionIcon, Tooltip } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslation } from "react-i18next";
import classes from "./DashboardHeader.module.css";

interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: Readonly<DashboardHeaderProps>) {
  const { t } = useTranslation();

  const handleOpenGithub = () => {
    openUrl("https://github.com/haiphamngoc-dev/secure-vault-manager").catch(
      (err) => console.error("Failed to open GitHub:", err)
    );
  };

  return (
    <Box className={classes.headerContainer} px="xl">
      <Group justify="space-between" align="center" style={{ height: "100%" }}>
        <Title order={3} className={classes.title}>
          {title}
        </Title>
        <Tooltip label={t("githubLabel")} position="left" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            onClick={handleOpenGithub}
            radius="md"
          >
            <IconBrandGithub size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
}

export default DashboardHeader;
