import { useState } from "react";
import {
  Box,
  Card,
  Group,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Stack,
  Code,
  Button,
} from "@mantine/core";
import {
  IconCopy,
  IconEye,
  IconEyeOff,
  IconTrash,
  IconShield,
  IconKey,
  IconFileText,
  IconCreditCard,
  IconDatabase,
  IconPlus,
} from "@tabler/icons-react";
import { Sidebar } from "../components/Sidebar";
import { DashboardHeader } from "../components/DashboardHeader";
import { AddItemModal } from "../components/AddItemModal";
import { useVault } from "@/app/providers/VaultProvider";
import { useTranslation } from "react-i18next";
import { useMediaQuery, useClipboard } from "@mantine/hooks";
import classes from "./DashboardPage.module.css";

export function DashboardPage() {
  const { lock, items, deleteItem } = useVault();
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const clipboard = useClipboard();

  // State controls
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"vault" | "settings">("vault");
  const [activeCategory, setActiveCategory] = useState("all");
  const [, setSelectedItemId] = useState<string | null>(null);

  // Password reveal trackers
  const [revealPasswords, setRevealPasswords] = useState<
    Record<string, boolean>
  >({});

  const onOpenAdd = () => {
    setIsAddModalOpen(true);
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

  const togglePasswordReveal = (id: string) => {
    setRevealPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filter items matching active tab and category
  const filteredItems = items.filter((item) => {
    if (activeTab === "settings") {
      return false;
    }
    if (activeCategory === "all") {
      return true;
    }
    if (activeCategory === "Login" && item.category === "Login") {
      return true;
    }
    if (activeCategory === "Card" && item.category === "Credit Card") {
      return true;
    }
    if (activeCategory === "Note" && item.category === "Secure Note") {
      return true;
    }
    if (activeCategory === "Database" && item.category === "Database") {
      return true;
    }
    return false;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Login":
        return <IconKey size={16} />;
      case "Credit Card":
        return <IconCreditCard size={16} />;
      case "Secure Note":
        return <IconFileText size={16} />;
      case "Database":
        return <IconDatabase size={16} />;
      default:
        return <IconKey size={16} />;
    }
  };

  const renderContent = () => {
    if (activeTab === "settings") {
      return (
        <Stack gap="xs" p="md">
          <Text c="dimmed">
            Configure auto-lock intervals, language, and proxy settings.
          </Text>
        </Stack>
      );
    }

    if (filteredItems.length === 0) {
      // Premium Empty State
      return (
        <Box
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "350px",
            textAlign: "center",
          }}
          px="md"
        >
          <IconShield
            size={64}
            color="var(--mantine-color-indigo-5)"
            style={{ marginBottom: "16px", opacity: 0.8 }}
          />
          <Text fw={700} size="lg" c="white" mb={4}>
            No secure items found
          </Text>
          <Text size="sm" c="dimmed" mb="lg" style={{ maxWidth: 350 }}>
            There are no items created under this category. Click the add button
            to get started.
          </Text>
          <Button
            leftSection={<IconPlus size={16} />}
            color="indigo"
            radius="md"
            onClick={onOpenAdd}
          >
            Create Item
          </Button>
        </Box>
      );
    }

    return (
      <Stack gap="md" p="xs">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            withBorder
            radius="md"
            style={{
              backgroundColor: "rgba(30, 31, 33, 0.4)",
              borderColor: "var(--mantine-color-dark-5)",
              color: "white",
            }}
          >
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                {getCategoryIcon(item.category)}
                <Text fw={700} size="md">
                  {item.title}
                </Text>
                <Badge size="xs" variant="light" color="indigo">
                  {item.category}
                </Badge>
              </Group>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={() => deleteItem(item.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>

            <Stack gap="xs" mt="xs">
              {item.username && (
                <Group gap="xs" wrap="nowrap">
                  <Text size="xs" c="dimmed" w={100} style={{ flexShrink: 0 }}>
                    Username:
                  </Text>
                  <Text size="sm" style={{ flex: 1 }}>
                    {item.username}
                  </Text>
                  <Tooltip label="Copy Username" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => clipboard.copy(item.username)}
                    >
                      <IconCopy size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}

              {item.password && (
                <Group gap="xs" wrap="nowrap">
                  <Text size="xs" c="dimmed" w={100} style={{ flexShrink: 0 }}>
                    Password:
                  </Text>
                  <Text size="sm" style={{ flex: 1 }}>
                    {revealPasswords[item.id] ? item.password : "••••••••"}
                  </Text>
                  <Group gap="xs" style={{ flexShrink: 0 }}>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => togglePasswordReveal(item.id)}
                    >
                      {revealPasswords[item.id] ? (
                        <IconEyeOff size={14} />
                      ) : (
                        <IconEye size={14} />
                      )}
                    </ActionIcon>
                    <Tooltip label="Copy Password" withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => clipboard.copy(item.password)}
                      >
                        <IconCopy size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              )}

              {item.url && (
                <Group gap="xs" wrap="nowrap">
                  <Text size="xs" c="dimmed" w={100} style={{ flexShrink: 0 }}>
                    Url/Host:
                  </Text>
                  <Text
                    size="sm"
                    c="indigo.4"
                    style={{
                      flex: 1,
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(item.url, "_blank")}
                  >
                    {item.url}
                  </Text>
                </Group>
              )}

              {/* Dynamic custom fields */}
              {item.customFields?.map((field) => (
                <Group key={field.id} gap="xs" wrap="nowrap">
                  <Text size="xs" c="dimmed" w={100} style={{ flexShrink: 0 }}>
                    {field.label || "Custom field"}:
                  </Text>
                  <Text size="sm" style={{ flex: 1 }}>
                    {field.type === "password" && !revealPasswords[field.id]
                      ? "••••••••"
                      : field.value}
                  </Text>
                  <Group gap="xs" style={{ flexShrink: 0 }}>
                    {field.type === "password" && (
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => togglePasswordReveal(field.id)}
                      >
                        {revealPasswords[field.id] ? (
                          <IconEyeOff size={14} />
                        ) : (
                          <IconEye size={14} />
                        )}
                      </ActionIcon>
                    )}
                    <Tooltip label="Copy Value" withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => clipboard.copy(field.value)}
                      >
                        <IconCopy size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              ))}

              {item.notes && (
                <Box mt="xs">
                  <Text size="xs" c="dimmed" mb={4}>
                    Notes:
                  </Text>
                  <Code
                    block
                    style={{
                      backgroundColor: "rgba(20, 21, 23, 0.4)",
                      color: "var(--mantine-color-dark-2)",
                    }}
                  >
                    {item.notes}
                  </Code>
                </Box>
              )}

              {item.tags && (
                <Group gap="xs" mt="xs">
                  {item.tags.map((tag) => (
                    <Badge key={tag} size="xs" variant="outline" color="indigo">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              )}
            </Stack>
          </Card>
        ))}
      </Stack>
    );
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

      {/* Item Creator Modal */}
      <AddItemModal
        opened={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </Box>
  );
}

export default DashboardPage;
