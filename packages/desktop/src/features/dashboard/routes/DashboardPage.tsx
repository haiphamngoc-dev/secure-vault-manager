import { useState, useEffect } from "react";
import {
  Box,
  Card,
  Group,
  Text,
  Badge,
  ActionIcon,
  Stack,
  Button,
  Modal,
  Table,
  Tooltip,
  Checkbox,
  Menu,
  Avatar,
} from "@mantine/core";
import {
  IconCopy,
  IconTrash,
  IconShield,
  IconKey,
  IconPlus,
  IconDotsVertical,
  IconShieldLock,
} from "@tabler/icons-react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { ITEM_TYPES } from "../components/AddItemModal";
import { ItemDrawer } from "../components/ItemDrawer";
import { useVault, VaultItem } from "@/app/providers/VaultProvider";
import { generateTotpCode } from "@/shared/utils/totp";
import { useTranslation } from "react-i18next";
import { useMediaQuery, useClipboard } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { MainHeader } from "@/shared/layouts/components/MainHeader";

import classes from "./DashboardPage.module.css";

export function DashboardPage() {
  const { items, deleteItem, addItem } = useVault();
  const { t } = useTranslation();
  const showCards = useMediaQuery("(max-width: 1024px)");
  const clipboard = useClipboard();

  const [searchParams] = useSearchParams();
  const {
    onOpenAdd,
    onExport,
    onDelete,
    selectedIds,
    setSelectedIds,
    headerTitle,
  } = useOutletContext<{
    onOpenAdd: () => void;
    onExport?: () => void;
    onDelete?: () => void;
    selectedIds: Set<string>;
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    headerTitle?: string;
  }>();

  const activeCategory = searchParams.get("category") || "all";

  // State controls
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const searchQuery = searchParams.get("q") || "";
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

  // Sync category changes and clear selection during render
  const [prevCategory, setPrevCategory] = useState(activeCategory);
  if (activeCategory !== prevCategory) {
    setPrevCategory(activeCategory);
    setSelectedItemId(null);
    setSelectedIds(new Set());
  }

  // Filter items matching category and search query
  const filteredItems = items.filter((item) => {
    // Category check
    const categoryMatch =
      activeCategory === "all" ||
      (activeCategory === "Login" && item.category === "Login") ||
      (activeCategory === "Card" && item.category === "Credit Card") ||
      (activeCategory === "Note" && item.category === "Secure Note") ||
      (activeCategory === "Database" && item.category === "Database");

    if (!categoryMatch) return false;

    // Search query check
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

  const getCategoryIcon = (category: string) => {
    const type = ITEM_TYPES.find((t) => t.id === category);
    const IconComponent = type?.icon || IconKey;
    return <IconComponent size={18} />;
  };

  const getPrimaryIdentifier = (item: VaultItem) => {
    if (item.username) return item.username;
    if (item.category === "Credit Card") {
      const cardField = item.customFields?.find(
        (cf) =>
          cf.label.toLowerCase().includes("card number") ||
          cf.label.toLowerCase().includes("số thẻ") ||
          cf.id.toLowerCase().includes("cardnumber")
      );
      if (cardField) {
        const clean = cardField.value.replace(/\s+/g, "");
        return clean.length >= 4
          ? `•••• •••• •••• ${clean.slice(-4)}`
          : "••••••••";
      }
    }
    return "-";
  };

  const isDrawerOpen = selectedItemId !== null;

  // Keyboard ArrowUp / ArrowDown navigation between items
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = ["INPUT", "TEXTAREA"].includes(
        (document.activeElement as HTMLElement)?.tagName || ""
      );
      if (isInputFocused || filteredItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!selectedItemId) {
          setSelectedItemId(filteredItems[0].id);
        } else {
          const currentIndex = filteredItems.findIndex(
            (item) => item.id === selectedItemId
          );
          if (currentIndex < filteredItems.length - 1) {
            setSelectedItemId(filteredItems[currentIndex + 1].id);
          }
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (selectedItemId) {
          const currentIndex = filteredItems.findIndex(
            (item) => item.id === selectedItemId
          );
          if (currentIndex > 0) {
            setSelectedItemId(filteredItems[currentIndex - 1].id);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId, filteredItems]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.has(item.id));
  const isSomeSelected = filteredItems.some((item) => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllSelected) {
        for (const item of filteredItems) {
          next.delete(item.id);
        }
      } else {
        for (const item of filteredItems) {
          next.add(item.id);
        }
      }
      return next;
    });
  };

  const handleDuplicateItem = (item: VaultItem) => {
    const itemCopy = { ...item };
    delete (itemCopy as Partial<VaultItem>).id;
    delete (itemCopy as Partial<VaultItem>).updatedAt;
    addItem({
      ...itemCopy,
      title: `${itemCopy.title} (Copy)`,
    });
    notifications.show({
      title: t("successDuplicate", "Nhân bản mục thành công!"),
      message: "",
      color: "green",
      autoClose: 2000,
    });
  };

  const selectedItem = items.find((item) => item.id === selectedItemId);

  return (
    <Box className={classes.masterDetailContainer}>
      <Box className={classes.masterColumn}>
        {headerTitle && (
          <MainHeader
            title={headerTitle}
            selectedCount={selectedIds.size}
            onExport={onExport}
            onDelete={onDelete}
          />
        )}
        <Box className={classes.scrollContainer}>
          {filteredItems.length === 0 ? (
            // Premium Empty State
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
                color="var(--color-brand-primary)"
                style={{ marginBottom: "16px", opacity: 0.8 }}
              />
              <Text fw={700} size="lg" mb={4}>
                {t("noItemsFound")}
              </Text>
              <Text size="sm" c="dimmed" mb="lg" style={{ maxWidth: 350 }}>
                {t("noItemsDesc")}
              </Text>
              <Button
                leftSection={<IconPlus size={16} />}
                color="blue"
                onClick={onOpenAdd}
              >
                {t("createItem")}
              </Button>
            </Box>
          ) : (
            <Box
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100%",
              }}
            >
              <Box
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  flex: 1,
                }}
              >
                {showCards ? (
                  <Box className={classes.itemsGrid}>
                    {filteredItems.map((item) => (
                      <Card
                        key={item.id}
                        withBorder
                        className={`${classes.itemCard} ${
                          item.id === selectedItemId
                            ? classes.itemCardActive
                            : ""
                        }`}
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <Group
                          justify="space-between"
                          align="center"
                          wrap="nowrap"
                        >
                          <Group
                            gap="xs"
                            style={{ overflow: "hidden", flex: 1, minWidth: 0 }}
                            wrap="nowrap"
                          >
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onChange={() => toggleSelect(item.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {item.icon ? (
                              <Avatar src={item.icon} size={32} radius="md" />
                            ) : (
                              <div className={classes.cardIconWrapper}>
                                {getCategoryIcon(item.category)}
                              </div>
                            )}

                            <Stack
                              gap={0}
                              style={{
                                overflow: "hidden",
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <Text
                                fw={700}
                                size="sm"
                                style={{
                                  color: "var(--color-neutral-dark)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.title}
                              </Text>
                              {getPrimaryIdentifier(item) !== "-" && (
                                <Text
                                  size="xs"
                                  c="dimmed"
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontFamily:
                                      item.category === "Credit Card"
                                        ? "var(--mantine-font-family-monospace)"
                                        : "inherit",
                                  }}
                                >
                                  {getPrimaryIdentifier(item)}
                                </Text>
                              )}
                            </Stack>
                          </Group>

                          <Group
                            gap={4}
                            className={classes.cardActions}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(() => {
                              const totpField = item.customFields?.find(
                                (cf) =>
                                  cf.value?.startsWith("otpauth://") ||
                                  cf.label?.toLowerCase().includes("totp") ||
                                  cf.label?.toLowerCase().includes("one-time")
                              );
                              if (!totpField?.value) return null;
                              return (
                                <Tooltip
                                  label="Copy Mã TOTP (2FA)"
                                  position="top"
                                  withArrow
                                >
                                  <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="sm"
                                    onClick={async () => {
                                      const info = await generateTotpCode(
                                        totpField.value
                                      );
                                      if (info.code && info.code !== "------") {
                                        clipboard.copy(info.code);
                                        notifications.show({
                                          title: "Đã sao chép mã TOTP",
                                          message: `Mã ${info.code} sẽ tự động bị xóa khỏi Clipboard sau 30s.`,
                                          color: "blue",
                                          autoClose: 2000,
                                        });
                                        setTimeout(
                                          () => clipboard.copy(""),
                                          30000
                                        );
                                      }
                                    }}
                                  >
                                    <IconShieldLock size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              );
                            })()}
                            {item.username && (
                              <Tooltip
                                label={t("copyUsername", "Copy Username")}
                                position="top"
                                withArrow
                              >
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  onClick={() => clipboard.copy(item.username!)}
                                >
                                  <IconCopy size={14} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                            {item.password && (
                              <Tooltip
                                label={t("copyPassword", "Copy Password")}
                                position="top"
                                withArrow
                              >
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  onClick={() => clipboard.copy(item.password!)}
                                >
                                  <IconKey size={14} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                            <Menu position="bottom-end" shadow="md" radius="md">
                              <Menu.Target>
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                >
                                  <IconDotsVertical size={14} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  leftSection={<IconCopy size={12} />}
                                  onClick={() => handleDuplicateItem(item)}
                                >
                                  {t("duplicate", "Nhân bản")}
                                </Menu.Item>
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={12} />}
                                  onClick={() => setItemToDeleteId(item.id)}
                                >
                                  {t("delete", "Xóa")}
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Group>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Table.ScrollContainer
                    minWidth={isDrawerOpen ? 380 : 650}
                    className={classes.tableScroll}
                  >
                    <Table
                      verticalSpacing="sm"
                      striped
                      highlightOnHover
                      withTableBorder
                      withRowBorders
                    >
                      <Table.Thead>
                        <Table.Tr
                          style={{
                            borderBottom:
                              "1px solid var(--color-neutral-light)",
                          }}
                        >
                          <Table.Th
                            style={{
                              width: 44,
                              minWidth: 44,
                              maxWidth: 44,
                              textAlign: "center",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Checkbox
                              checked={isAllSelected}
                              indeterminate={isSomeSelected && !isAllSelected}
                              onChange={toggleSelectAll}
                            />
                          </Table.Th>
                          {!isDrawerOpen && (
                            <Table.Th
                              style={{
                                width: 60,
                                minWidth: 50,
                                maxWidth: 70,
                                color: "var(--color-neutral-medium)",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t("tableHeaderIndex")}
                            </Table.Th>
                          )}
                          <Table.Th
                            style={{
                              color: "var(--color-neutral-medium)",
                              minWidth: isDrawerOpen ? 140 : 160,
                              maxWidth: isDrawerOpen ? 220 : 320,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t("tableHeaderTitle")}
                          </Table.Th>
                          {!isDrawerOpen && (
                            <Table.Th
                              style={{
                                color: "var(--color-neutral-medium)",
                                minWidth: 120,
                                maxWidth: 160,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t("tableHeaderCategory")}
                            </Table.Th>
                          )}
                          <Table.Th
                            style={{
                              color: "var(--color-neutral-medium)",
                              minWidth: 160,
                              maxWidth: 350,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t("tableHeaderUsername")}
                          </Table.Th>
                          <Table.Th
                            style={{
                              color: "var(--color-neutral-medium)",
                              textAlign: "center",
                              width: 80,
                              minWidth: 70,
                              maxWidth: 90,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t("tableHeaderActions")}
                          </Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredItems.map((item, index) => (
                          <Table.Tr
                            key={item.id}
                            className={`${classes.tableRow} ${
                              selectedIds.has(item.id)
                                ? classes.tableRowSelected
                                : ""
                            } ${
                              item.id === selectedItemId
                                ? classes.tableRowActive
                                : ""
                            }`}
                            onClick={() => setSelectedItemId(item.id)}
                            style={{
                              borderBottom:
                                "1px solid var(--color-neutral-light)",
                            }}
                          >
                            <Table.Td
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: 44,
                                minWidth: 44,
                                maxWidth: 44,
                                textAlign: "center",
                              }}
                            >
                              <Checkbox
                                checked={selectedIds.has(item.id)}
                                onChange={() => toggleSelect(item.id)}
                              />
                            </Table.Td>
                            {!isDrawerOpen && (
                              <Table.Td
                                style={{
                                  width: 60,
                                  minWidth: 50,
                                  maxWidth: 70,
                                  color: "var(--mantine-color-dark-3)",
                                  fontSize: "13px",
                                  textAlign: "center",
                                }}
                              >
                                {index + 1}
                              </Table.Td>
                            )}
                            <Table.Td
                              style={{
                                minWidth: isDrawerOpen ? 140 : 160,
                                maxWidth: isDrawerOpen ? 220 : 320,
                              }}
                            >
                              <Group
                                gap="xs"
                                wrap="nowrap"
                                style={{ overflow: "hidden" }}
                              >
                                {item.icon ? (
                                  <Avatar
                                    src={item.icon}
                                    size={32}
                                    radius="md"
                                  />
                                ) : (
                                  <div className={classes.cardIconWrapper}>
                                    {getCategoryIcon(item.category)}
                                  </div>
                                )}
                                <Text
                                  fw={700}
                                  size="sm"
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    flex: 1,
                                  }}
                                >
                                  {item.title}
                                </Text>
                              </Group>
                            </Table.Td>
                            {!isDrawerOpen && (
                              <Table.Td
                                style={{
                                  minWidth: 120,
                                  maxWidth: 160,
                                }}
                              >
                                <Badge size="xs" variant="light" color="green">
                                  {t(`types.${item.category}`, item.category)}
                                </Badge>
                              </Table.Td>
                            )}
                            <Table.Td
                              style={{
                                minWidth: 160,
                                maxWidth: 350,
                              }}
                            >
                              <Text
                                size="sm"
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontFamily:
                                    "var(--mantine-font-family-monospace)",
                                }}
                              >
                                {getPrimaryIdentifier(item)}
                              </Text>
                            </Table.Td>
                            <Table.Td
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: 80,
                                minWidth: 70,
                                maxWidth: 90,
                                textAlign: "center",
                              }}
                            >
                              <Group justify="center" wrap="nowrap">
                                <Menu
                                  position="bottom-end"
                                  shadow="md"
                                  radius="md"
                                >
                                  <Menu.Target>
                                    <ActionIcon
                                      variant="subtle"
                                      color="gray"
                                      size="md"
                                    >
                                      <IconDotsVertical size={16} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    {item.username && (
                                      <Menu.Item
                                        leftSection={<IconCopy size={14} />}
                                        onClick={() => {
                                          clipboard.copy(item.username!);
                                          notifications.show({
                                            title: t(
                                              "copyUsernameSuccess",
                                              "Đã sao chép Username"
                                            ),
                                            message: "",
                                            color: "blue",
                                            autoClose: 1500,
                                          });
                                        }}
                                      >
                                        {t("copyUsername", "Sao chép Username")}
                                      </Menu.Item>
                                    )}
                                    {item.password && (
                                      <Menu.Item
                                        leftSection={<IconKey size={14} />}
                                        onClick={() => {
                                          clipboard.copy(item.password!);
                                          notifications.show({
                                            title: t(
                                              "copyPasswordSuccess",
                                              "Đã sao chép Mật khẩu"
                                            ),
                                            message: "",
                                            color: "blue",
                                            autoClose: 1500,
                                          });
                                        }}
                                      >
                                        {t("copyPassword", "Sao chép Mật khẩu")}
                                      </Menu.Item>
                                    )}
                                    {(item.username || item.password) && (
                                      <Menu.Divider />
                                    )}
                                    <Menu.Item
                                      leftSection={<IconCopy size={14} />}
                                      onClick={() => handleDuplicateItem(item)}
                                    >
                                      {t("duplicate", "Nhân bản")}
                                    </Menu.Item>
                                    <Menu.Item
                                      color="red"
                                      leftSection={<IconTrash size={14} />}
                                      onClick={() => setItemToDeleteId(item.id)}
                                    >
                                      {t("delete", "Xóa")}
                                    </Menu.Item>
                                  </Menu.Dropdown>
                                </Menu>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Item Details and Edit Drawer */}
      {selectedItem && (
        <ItemDrawer
          key={selectedItem.id}
          item={selectedItem}
          onClose={() => setSelectedItemId(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        opened={itemToDeleteId !== null}
        onClose={() => setItemToDeleteId(null)}
        title={t("confirmDeleteTitle", "Xác nhận xóa")}
        centered
        radius="md"
        size="sm"
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
