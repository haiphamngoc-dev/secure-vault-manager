import { useState } from "react";
import {
  Box,
  Group,
  Title,
  ActionIcon,
  Tooltip,
  Stack,
  Text,
  TextInput,
  Modal,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconMenu2,
  IconSearch,
  IconKey,
} from "@tabler/icons-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslation } from "react-i18next";
import classes from "./MainHeader.module.css";
import { LanguageToggle } from "./LanguageToggle";
import { useVault } from "@/app/providers/VaultProvider";
import { ITEM_TYPES } from "@/features/dashboard/components/AddItemModal";

interface MainHeaderProps {
  title: string;
  description: string;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onItemClick?: (id: string) => void;
}

export function MainHeader({
  title,
  description,
  showMenuButton = false,
  onMenuClick,
  searchQuery = "",
  onSearchChange,
  onItemClick,
}: Readonly<MainHeaderProps>) {
  const { t } = useTranslation();
  const { items } = useVault();
  const [searchOpened, setSearchOpened] = useState(false);

  const getCategoryIcon = (category: string) => {
    const type = ITEM_TYPES.find((t) => t.id === category);
    const IconComponent = type?.icon || IconKey;
    return <IconComponent size={18} />;
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();

    const fieldsMatch =
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.username?.toLowerCase().includes(query) ||
      item.url?.toLowerCase().includes(query) ||
      item.notes?.toLowerCase().includes(query);

    const customFieldsMatch = item.customFields?.some(
      (cf) =>
        cf.label.toLowerCase().includes(query) ||
        cf.value.toLowerCase().includes(query)
    );

    return fieldsMatch || customFieldsMatch;
  });

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
          <>
            {/* Desktop searchbar: visible only on desktop */}
            <Box className={classes.desktopSearch}>
              <TextInput
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.currentTarget.value)}
                leftSection={<IconSearch size={16} />}
                radius="md"
                size="sm"
              />
            </Box>

            {/* Mobile search icon: visible only on mobile/tablet */}
            <Box className={classes.mobileSearch}>
              <Tooltip
                label={t("searchPlaceholder")}
                position="bottom"
                withArrow
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="md"
                  radius="md"
                  onClick={() => setSearchOpened(true)}
                >
                  <IconSearch size={18} />
                </ActionIcon>
              </Tooltip>
            </Box>
          </>
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

      <Modal
        opened={searchOpened}
        onClose={() => setSearchOpened(false)}
        title={t("searchPlaceholder", "Tìm kiếm")}
        size="md"
        radius="md"
        centered
        styles={{
          content: {
            backgroundColor: "rgba(26, 27, 30, 0.98)",
            border: "1px solid var(--mantine-color-dark-4)",
            color: "white",
            minHeight: "400px",
          },
          header: {
            backgroundColor: "transparent",
            color: "white",
            borderBottom: "1px solid var(--mantine-color-dark-5)",
            paddingBottom: "12px",
          },
        }}
      >
        <Stack gap="md" mt="xs">
          <TextInput
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            radius="md"
            size="md"
            autoFocus
            rightSection={
              searchQuery && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => onSearchChange?.("")}
                >
                  <Text size="xs" fw={700}>
                    ✕
                  </Text>
                </ActionIcon>
              )
            }
          />

          <Text size="xs" c="dimmed" fw={600} mt="xs">
            {searchQuery.trim()
              ? t("searchResults", "Kết quả tìm kiếm")
              : t("allVaultItems", "Tất cả mục trong kho")}
          </Text>

          <Stack gap="xs" style={{ maxHeight: "350px", overflowY: "auto" }}>
            {filteredItems.length === 0 ? (
              <Box style={{ textAlign: "center", padding: "32px 0" }}>
                <Text size="sm" c="dimmed">
                  {t("noItemsFound")}
                </Text>
              </Box>
            ) : (
              filteredItems.map((item) => (
                <Group
                  key={item.id}
                  justify="space-between"
                  align="center"
                  wrap="nowrap"
                  style={{
                    padding: "12px",
                    borderRadius: "var(--mantine-radius-md)",
                    cursor: "pointer",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--mantine-color-dark-6)",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => {
                    onItemClick?.(item.id);
                    setSearchOpened(false);
                  }}
                  className={classes.searchResultItem}
                >
                  <Group
                    gap="md"
                    wrap="nowrap"
                    style={{ flex: 1, overflow: "hidden" }}
                  >
                    <Box
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        backgroundColor: "var(--mantine-color-dark-4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--mantine-color-indigo-4)",
                        flexShrink: 0,
                      }}
                    >
                      {getCategoryIcon(item.category)}
                    </Box>
                    <Stack gap={2} style={{ flex: 1, overflow: "hidden" }}>
                      <Text
                        fw={600}
                        size="sm"
                        c="white"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.username ||
                          t(`types.${item.category}`, item.category)}
                      </Text>
                    </Stack>
                  </Group>
                </Group>
              ))
            )}
          </Stack>
        </Stack>
      </Modal>
    </Box>
  );
}

export default MainHeader;
