import {
  Box,
  Group,
  Title,
  ActionIcon,
  Tooltip,
  Stack,
  Text,
} from "@mantine/core";
import { IconBrandGithub, IconMenu2 } from "@tabler/icons-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslation } from "react-i18next";
import classes from "./DashboardHeader.module.css";
import { LanguageToggle } from "./LanguageToggle";

interface DashboardHeaderProps {
  title: string;
  description: string;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}

export function DashboardHeader({
  title,
  description,
  showMenuButton = false,
  onMenuClick,
}: Readonly<DashboardHeaderProps>) {
  const { t } = useTranslation();

  const handleOpenGithub = () => {
    openUrl("https://github.com/haiphamngoc-dev/secure-vault-manager").catch(
      (err) => console.error("Failed to open GitHub:", err)
    );
  };

  return (
    <Box className={classes.headerContainer} px="xl">
      <Group justify="space-between" align="center" style={{ height: "100%" }}>
        <Group gap="md" align="center">
          {showMenuButton && (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onMenuClick}
              size="md"
            >
              <IconMenu2 size={22} />
            </ActionIcon>
          )}
          <Stack gap={2}>
            <Title order={3} className={classes.title}>
              {title}
            </Title>
            {description && (
              <Text className={classes.description}>{description}</Text>
            )}
          </Stack>
        </Group>
        <Group gap="xs">
          <LanguageToggle />
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
      </Group>
    </Box>
  );
}

export default DashboardHeader;
