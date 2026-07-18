import { Box, Group, Stack, Title, Badge, Text, Button } from "@mantine/core";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "./MainHeader.module.css";

interface MainHeaderProps {
  title: string;
  selectedCount?: number;
  onExport?: () => void;
  onDelete?: () => void;
}

export function MainHeader({
  title,
  selectedCount = 0,
  onExport,
  onDelete,
}: Readonly<MainHeaderProps>) {
  const { t } = useTranslation();

  return (
    <Box className={classes.headerContainer}>
      <Group
        justify="space-between"
        align="center"
        style={{ height: "100%" }}
        wrap="nowrap"
      >
        {selectedCount > 0 ? (
          <>
            <Group gap="xs">
              <Badge variant="filled" color="blue" radius="md">
                {selectedCount}
              </Badge>
              <Text size="sm" fw={600}>
                {t("selectedItemsCount", { count: selectedCount })}
              </Text>
            </Group>
            <Group gap="sm">
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconDownload size={14} />}
                onClick={onExport}
              >
                {t("exportSelected")}
              </Button>
              <Button
                color="red"
                variant="light"
                size="xs"
                radius="md"
                leftSection={<IconTrash size={14} />}
                onClick={onDelete}
              >
                {t("deleteSelected")}
              </Button>
            </Group>
          </>
        ) : (
          <Stack gap={0} style={{ overflow: "hidden", flex: 1 }}>
            <Title order={2} className={classes.title}>
              {title}
            </Title>
          </Stack>
        )}
      </Group>
    </Box>
  );
}

export default MainHeader;
