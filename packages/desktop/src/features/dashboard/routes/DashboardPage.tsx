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
  Table,
  Tooltip,
  Checkbox,
  Menu,
} from "@mantine/core";
import {
  IconCopy,
  IconTrash,
  IconShield,
  IconKey,
  IconPlus,
  IconDotsVertical,
} from "@tabler/icons-react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { ITEM_TYPES } from "../components/AddItemModal";
import { ItemDrawer } from "../components/ItemDrawer";
import { useVault, VaultItem } from "@/app/providers/VaultProvider";
import { useTranslation } from "react-i18next";
import { useMediaQuery, useClipboard } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";

import classes from "./DashboardPage.module.css";

export function DashboardPage() {
  const { items, deleteItem, addItem } = useVault();
  const { t } = useTranslation();
  const showCards = useMediaQuery("(max-width: 1024px)");
  const clipboard = useClipboard();

  const [searchParams] = useSearchParams();
  const { onOpenAdd, selectedIds, setSelectedIds } = useOutletContext<{
    onOpenAdd: () => void;
    selectedIds: Set<string>;
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  }>();

  const activeCategory = searchParams.get("category") || "all";

  // State controls
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const searchQuery = searchParams.get("q") || "";
  const [currentPage, setCurrentPage] = useState(1);
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

  const itemsPerPage = showCards ? 9 : 15;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  const isAllPageSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedIds.has(item.id));
  const isSomePageSelected = paginatedItems.some((item) =>
    selectedIds.has(item.id)
  );

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        for (const item of paginatedItems) {
          next.delete(item.id);
        }
      } else {
        for (const item of paginatedItems) {
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
    <>
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
                  {paginatedItems.map((item) => (
                    <Card
                      key={item.id}
                      withBorder
                      className={classes.itemCard}
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
                          <div className={classes.cardIconWrapper}>
                            {getCategoryIcon(item.category)}
                          </div>

                          <Stack
                            gap={0}
                            style={{ overflow: "hidden", flex: 1, minWidth: 0 }}
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
                  minWidth={500}
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
                          borderBottom: "1px solid var(--color-neutral-light)",
                        }}
                      >
                        <Table.Th style={{ width: 40, textAlign: "center" }}>
                          <Checkbox
                            checked={isAllPageSelected}
                            indeterminate={
                              isSomePageSelected && !isAllPageSelected
                            }
                            onChange={toggleSelectAllPage}
                          />
                        </Table.Th>
                        <Table.Th
                          style={{
                            width: 60,
                            color: "var(--color-neutral-medium)",
                            textAlign: "center",
                          }}
                        >
                          {t("tableHeaderIndex")}
                        </Table.Th>
                        <Table.Th
                          style={{ color: "var(--color-neutral-medium)" }}
                        >
                          {t("tableHeaderTitle")}
                        </Table.Th>
                        <Table.Th
                          style={{ color: "var(--color-neutral-medium)" }}
                        >
                          {t("tableHeaderCategory")}
                        </Table.Th>
                        <Table.Th
                          style={{ color: "var(--color-neutral-medium)" }}
                        >
                          {t("tableHeaderUsername")}
                        </Table.Th>
                        <Table.Th
                          style={{
                            color: "var(--color-neutral-medium)",
                            textAlign: "right",
                          }}
                        >
                          {t("tableHeaderActions")}
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {paginatedItems.map((item, index) => (
                        <Table.Tr
                          key={item.id}
                          className={`${classes.tableRow} ${
                            selectedIds.has(item.id)
                              ? classes.tableRowSelected
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
                            style={{ textAlign: "center" }}
                          >
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onChange={() => toggleSelect(item.id)}
                            />
                          </Table.Td>
                          <Table.Td
                            style={{
                              color: "var(--mantine-color-dark-3)",
                              fontSize: "13px",
                              textAlign: "center",
                            }}
                          >
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" wrap="nowrap">
                              <div className={classes.cardIconWrapper}>
                                {getCategoryIcon(item.category)}
                              </div>
                              <Text
                                fw={700}
                                size="sm"
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.title}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" variant="light" color="green">
                              {t(`types.${item.category}`, item.category)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
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
                          <Table.Td>
                            <Group
                              gap="xs"
                              justify="flex-end"
                              wrap="nowrap"
                              className={classes.rowActions}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.username && (
                                <Tooltip
                                  label={t("copyUsername", "Copy Username")}
                                  position="top"
                                  withArrow
                                >
                                  <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="md"
                                    onClick={() => {
                                      clipboard.copy(item.username!);
                                    }}
                                  >
                                    <IconCopy size={16} />
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
                                    size="md"
                                    onClick={() => {
                                      clipboard.copy(item.password!);
                                    }}
                                  >
                                    <IconKey size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
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
        )}
      </Box>

      {/* Item Details and Edit Drawer */}
      {selectedItem && (
        <>
          <Box
            className={classes.drawerOverlay}
            onClick={() => setSelectedItemId(null)}
          />
          <ItemDrawer
            key={selectedItem.id}
            item={selectedItem}
            onClose={() => setSelectedItemId(null)}
          />
        </>
      )}

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
    </>
  );
}

export default DashboardPage;
