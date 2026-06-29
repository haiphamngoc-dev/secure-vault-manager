import { useState } from "react";
import {
  Box,
  Card,
  Group,
  Text,
  Badge,
  ActionIcon,
  Stack,
  Button,
  Pagination,
  Modal,
} from "@mantine/core";
import {
  IconCopy,
  IconTrash,
  IconShield,
  IconKey,
  IconPlus,
} from "@tabler/icons-react";
import { Sidebar } from "../components/Sidebar";
import { DashboardHeader } from "../components/DashboardHeader";
import { AddItemModal, ITEM_TYPES } from "../components/AddItemModal";
import { ItemDrawer } from "../components/ItemDrawer";
import { useVault, VaultItem } from "@/app/providers/VaultProvider";
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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

  const onOpenAdd = () => {
    setIsAddModalOpen(true);
  };

  const handleSelectCategory = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
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

  // Filter items matching active tab, category, and search query
  const filteredItems = items.filter((item) => {
    if (activeTab === "settings") {
      return false;
    }

    // Category check
    let categoryMatch = false;
    if (activeCategory === "all") {
      categoryMatch = true;
    } else if (activeCategory === "Login" && item.category === "Login") {
      categoryMatch = true;
    } else if (activeCategory === "Card" && item.category === "Credit Card") {
      categoryMatch = true;
    } else if (activeCategory === "Note" && item.category === "Secure Note") {
      categoryMatch = true;
    } else if (activeCategory === "Database" && item.category === "Database") {
      categoryMatch = true;
    }

    if (!categoryMatch) return false;

    // Search query check
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();

    const fieldsMatch =
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      (item.username && item.username.toLowerCase().includes(query)) ||
      (item.url && item.url.toLowerCase().includes(query)) ||
      (item.notes && item.notes.toLowerCase().includes(query));

    const customFieldsMatch = item.customFields?.some(
      (cf) =>
        cf.label.toLowerCase().includes(query) ||
        cf.value.toLowerCase().includes(query)
    );

    return fieldsMatch || customFieldsMatch;
  });

  const getCategoryIcon = (category: string) => {
    const type = ITEM_TYPES.find((t) => t.id === category);
    const IconComponent = type?.icon || IconKey;
    return <IconComponent size={18} />;
  };

  const renderCardFields = (item: VaultItem) => {
    const fields: {
      label: string;
      value: string;
      isMasked: boolean;
      rawValue: string;
    }[] = [];

    if (item.username) {
      fields.push({
        label: t("usernameLabel", "Username"),
        value: item.username,
        isMasked: false,
        rawValue: item.username,
      });
    }

    if (item.password) {
      fields.push({
        label: t("passwordLabel", "Password"),
        value: "••••••••",
        isMasked: true,
        rawValue: item.password,
      });
    }

    if (item.url) {
      fields.push({
        label: "URL",
        value: item.url,
        isMasked: false,
        rawValue: item.url,
      });
    }

    // Capture specific custom template fields for summary cards
    if (item.customFields) {
      item.customFields.forEach((cf) => {
        const labelLower = cf.label.toLowerCase();
        const idLower = cf.id.toLowerCase();

        const isSensitive =
          cf.type === "password" ||
          idLower.includes("password") ||
          idLower.includes("secret") ||
          idLower.includes("cvv") ||
          idLower.includes("pin") ||
          idLower.includes("passphrase") ||
          labelLower.includes("mật khẩu") ||
          labelLower.includes("pin") ||
          labelLower.includes("cvv");

        const isCardNumber =
          idLower.includes("cardnumber") ||
          labelLower.includes("card number") ||
          labelLower.includes("số thẻ");

        if (isSensitive) {
          fields.push({
            label: cf.label,
            value: "••••••••",
            isMasked: true,
            rawValue: cf.value,
          });
        } else if (isCardNumber) {
          const clean = cf.value.replace(/\s+/g, "");
          const maskedValue =
            clean.length >= 4
              ? `•••• •••• •••• ${clean.slice(-4)}`
              : "••••••••";
          fields.push({
            label: cf.label,
            value: maskedValue,
            isMasked: true,
            rawValue: cf.value,
          });
        } else if (
          [
            "cardholder",
            "hostname",
            "bankname",
            "fullname",
            "emailaddress",
            "ipaddress",
          ].some((k) => idLower.includes(k))
        ) {
          fields.push({
            label: cf.label,
            value: cf.value,
            isMasked: false,
            rawValue: cf.value,
          });
        }
      });
    }

    const visibleFields = fields.slice(0, 3);

    return (
      <Stack gap={4} mt="xs">
        {visibleFields.map((f, index) => (
          <Group
            key={index}
            justify="space-between"
            align="center"
            wrap="nowrap"
          >
            <Text
              size="xs"
              c="dimmed"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {f.label}:
            </Text>
            <Group
              gap="xs"
              style={{ flex: 1, minWidth: 0, justifyContent: "flex-end" }}
            >
              <Text
                size="xs"
                c="white"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: "var(--mantine-font-family-monospace)",
                }}
              >
                {f.value}
              </Text>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                style={{ flexShrink: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  clipboard.copy(f.rawValue);
                }}
              >
                <IconCopy size={12} />
              </ActionIcon>
            </Group>
          </Group>
        ))}
      </Stack>
    );
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
            flex: 1,
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
            {t("noItemsFound")}
          </Text>
          <Text size="sm" c="dimmed" mb="lg" style={{ maxWidth: 350 }}>
            {t("noItemsDesc")}
          </Text>
          <Button
            leftSection={<IconPlus size={16} />}
            color="indigo"
            radius="md"
            onClick={onOpenAdd}
          >
            {t("createItem")}
          </Button>
        </Box>
      );
    }

    const itemsPerPage = 9;
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    return (
      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
          justifyContent: "space-between",
        }}
      >
        <Box className={classes.itemsGrid}>
          {paginatedItems.map((item) => (
            <Card
              key={item.id}
              withBorder
              radius="md"
              className={classes.itemCard}
              onClick={() => setSelectedItemId(item.id)}
            >
              <Group
                justify="space-between"
                align="center"
                mb="xs"
                wrap="nowrap"
              >
                <Group
                  gap="xs"
                  style={{ overflow: "hidden", flex: 1 }}
                  wrap="nowrap"
                >
                  <div className={classes.cardIconWrapper}>
                    {getCategoryIcon(item.category)}
                  </div>
                  <Text
                    fw={700}
                    size="sm"
                    style={{
                      color: "white",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.title}
                  </Text>
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemToDeleteId(item.id);
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>

              <Badge size="xs" variant="light" color="indigo" mb="xs">
                {t(`types.${item.category}`, item.category)}
              </Badge>

              {renderCardFields(item)}
            </Card>
          ))}
        </Box>

        {totalPages > 1 && (
          <Group justify="center" mt="xl" pb="md">
            <Pagination
              total={totalPages}
              value={currentPage}
              onChange={setCurrentPage}
              color="indigo"
              radius="md"
              size="sm"
            />
          </Group>
        )}
      </Box>
    );
  };

  const selectedItem = items.find((item) => item.id === selectedItemId);

  return (
    <Box className={classes.dashboardContainer}>
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCategory={activeCategory}
        setActiveCategory={handleSelectCategory}
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
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
        <Box className={classes.scrollContainer}>{renderContent()}</Box>
      </Box>

      {/* Item Details and Edit Drawer */}
      {selectedItem && (
        <>
          <Box
            className={classes.drawerOverlay}
            onClick={() => setSelectedItemId(null)}
          />
          <ItemDrawer
            item={selectedItem}
            onClose={() => setSelectedItemId(null)}
          />
        </>
      )}

      {/* Item Creator Modal */}
      <AddItemModal
        opened={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        opened={itemToDeleteId !== null}
        onClose={() => setItemToDeleteId(null)}
        title={t("confirmDeleteTitle", "Xác nhận xóa")}
        centered
        radius="md"
        size="sm"
        styles={{
          content: {
            backgroundColor: "rgba(26, 27, 30, 0.98)",
            border: "1px solid var(--mantine-color-dark-4)",
            color: "white",
          },
        }}
      >
        <Stack gap="md">
          <Text size="sm">
            {t(
              "confirmDeleteDesc",
              "Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác."
            )}
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              radius="md"
              size="xs"
              onClick={() => setItemToDeleteId(null)}
            >
              {t("cancelBtn")}
            </Button>
            <Button
              color="red"
              radius="md"
              size="xs"
              onClick={() => {
                if (itemToDeleteId) {
                  deleteItem(itemToDeleteId);
                  if (selectedItemId === itemToDeleteId) {
                    setSelectedItemId(null);
                  }
                  setItemToDeleteId(null);
                }
              }}
            >
              {t("delete", "Xóa")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

export default DashboardPage;
