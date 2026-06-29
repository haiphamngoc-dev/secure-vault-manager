import {
  Box,
  Group,
  Title,
  ActionIcon,
  Tooltip,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconBrandGithub, IconMenu2, IconSearch } from "@tabler/icons-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslation } from "react-i18next";
import classes from "./MainHeader.module.css";
import { LanguageToggle } from "./LanguageToggle";

interface MainHeaderProps {
  title: string;
  description: string;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export function MainHeader({
  title,
  description,
  showMenuButton = false,
  onMenuClick,
  searchQuery = "",
  onSearchChange,
}: Readonly<MainHeaderProps>) {
  const { t } = useTranslation();

  const handleOpenGithub = () => {
    openUrl("https://github.com/haiphamngoc-dev/secure-vault-manager").catch(
      (err) => console.error("Failed to open GitHub:", err)
    );
  };

  return (
    <Box className={classes.headerContainer}>
      <Group
        justify="space-between"
        align="center"
        style={{ height: "100%" }}
        wrap="nowrap"
      >
        <Group
          gap="md"
          align="center"
          style={{ overflow: "hidden", flex: 1 }}
          wrap="nowrap"
        >
          {showMenuButton && (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onMenuClick}
              size="md"
              style={{ flexShrink: 0 }}
            >
              <IconMenu2 size={22} />
            </ActionIcon>
          )}
          <Stack gap={2} style={{ overflow: "hidden", flex: 1 }}>
            <Title order={3} className={classes.title}>
              {title}
            </Title>
            {description && (
              <Text className={classes.description}>{description}</Text>
            )}
          </Stack>
        </Group>

        {onSearchChange && (
          <Box
            style={{ flex: "0 1 400px", margin: "0 var(--mantine-spacing-md)" }}
          >
            <TextInput
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              radius="md"
              size="sm"
            />
          </Box>
        )}

        <Group gap="xs" style={{ flexShrink: 0 }}>
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

export default MainHeader;
