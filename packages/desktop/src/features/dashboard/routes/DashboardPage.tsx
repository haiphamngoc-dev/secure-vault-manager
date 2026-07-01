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
} from "@mantine/core";
import {
  IconCopy,
  IconTrash,
  IconShield,
  IconKey,
  IconPlus,
  IconDownload,
} from "@tabler/icons-react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { ITEM_TYPES } from "../components/AddItemModal";
import { ItemDrawer } from "../components/ItemDrawer";
import { useVault, VaultItem } from "@/app/providers/VaultProvider";
import { useTranslation } from "react-i18next";
import { useMediaQuery, useClipboard } from "@mantine/hooks";

import classes from "./DashboardPage.module.css";

export function DashboardPage() {
  const { items, deleteItem } = useVault();
  const { t } = useTranslation();
  const showCards = useMediaQuery("(max-width: 1024px)");
  const clipboard = useClipboard();

  const [searchParams] = useSearchParams();
  const { onOpenAdd } = useOutletContext<{
    onOpenAdd: () => void;
  }>();

  const activeCategory = searchParams.get("category") || "all";

  // State controls
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const searchQuery = searchParams.get("q") || "";
  const [currentPage, setCurrentPage] = useState(1);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

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
      for (const cf of item.customFields) {
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

        const isCommonField =
          idLower.includes("cardholder") ||
          idLower.includes("hostname") ||
          idLower.includes("bankname") ||
          idLower.includes("fullname") ||
          idLower.includes("emailaddress") ||
          idLower.includes("ipaddress");

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
        } else if (isCommonField) {
          fields.push({
            label: cf.label,
            value: cf.value,
            isMasked: false,
            rawValue: cf.value,
          });
        }
      }
    }

    const visibleFields = fields.slice(0, 3);

    return (
      <Stack gap={4} mt="xs">
        {visibleFields.map((f) => (
          <Group
            key={f.label}
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
                flexShrink: 1,
                maxWidth: "45%",
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
              {selectedIds.size > 0 && (
                <Box
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor:
                      "light-dark(rgba(240, 243, 246, 0.95), rgba(36, 37, 41, 0.85))",
                    border: "1px solid var(--color-neutral-light)",
                    borderRadius: "var(--mantine-radius-md)",
                    padding: "12px 16px",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  <Group gap="xs">
                    <Badge variant="filled" color="blue" radius="md">
                      {selectedIds.size}
                    </Badge>
                    <Text size="sm" fw={600}>
                      {t("selectedItemsCount", { count: selectedIds.size })}
                    </Text>
                  </Group>
                  <Group gap="sm">
                    <Button
                      variant="subtle"
                      color="gray"
                      size="xs"
                      leftSection={<IconDownload size={14} />}
                      onClick={() => {
                        // Export functionality will be wired here
                      }}
                    >
                      {t("exportSelected")}
                    </Button>
                    <Button
                      color="red"
                      variant="light"
                      size="xs"
                      radius="md"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => setConfirmBulkDelete(true)}
                    >
                      {t("deleteSelected")}
                    </Button>
                  </Group>
                </Box>
              )}

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
                        mb="xs"
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
                          <Text
                            fw={700}
                            size="sm"
                            style={{
                              color: "var(--color-neutral-dark)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              minWidth: 0,
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

                      <Badge size="xs" variant="light" color="green" mb="xs">
                        {t(`types.${item.category}`, item.category)}
                      </Badge>

                      {renderCardFields(item)}
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
                        <Table.Th style={{ width: 40 }}>
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
                          <Table.Td onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onChange={() => toggleSelect(item.id)}
                            />
                          </Table.Td>
                          <Table.Td
                            style={{
                              color: "var(--mantine-color-dark-3)",
                              fontSize: "13px",
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
                            <Group gap="xs" justify="flex-end" wrap="nowrap">
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clipboard.copy(item.username!);
                                    }}
                                  >
                                    <IconCopy size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              <Tooltip
                                label={t("delete", "Delete")}
                                position="top"
                                withArrow
                              >
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="md"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItemToDeleteId(item.id);
                                  }}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
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

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        opened={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title={t("confirmBulkDeleteTitle", "Xác nhận xóa hàng loạt")}
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
            {t("confirmBulkDeleteDesc", { count: selectedIds.size })}
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              radius="md"
              size="xs"
              onClick={() => setConfirmBulkDelete(false)}
            >
              {t("cancelBtn")}
            </Button>
            <Button
              color="red"
              radius="md"
              size="xs"
              onClick={() => {
                for (const id of selectedIds) {
                  deleteItem(id);
                }
                setSelectedIds(new Set());
                setConfirmBulkDelete(false);
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
