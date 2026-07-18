import { useEffect, useState } from "react";
import { Box, Modal, Stack, Text, Group, Button } from "@mantine/core";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useVault } from "@/app/providers/VaultProvider";
import { Sidebar } from "./components/Sidebar";
import { MainHeader } from "./components/MainHeader";
import { AddItemModal } from "@/features/dashboard/components/AddItemModal";
import { useAutoLock } from "@/features/settings/hooks/useAutoLock";
import { notifications } from "@mantine/notifications";
import classes from "./MainLayout.module.css";

export function MainLayout() {
  useAutoLock();
  const { lock, deleteItem } = useVault();
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  useEffect(() => {
    const handleOpen = () => setMobileOpen(true);
    window.addEventListener("open-mobile-sidebar", handleOpen);
    return () => window.removeEventListener("open-mobile-sidebar", handleOpen);
  }, []);

  const activeCategory = searchParams.get("category") || "all";

  // Reset selection on category change or page navigation
  const [prevCategory, setPrevCategory] = useState(activeCategory);
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (activeCategory !== prevCategory || location.pathname !== prevPath) {
    setPrevCategory(activeCategory);
    setPrevPath(location.pathname);
    setSelectedIds(new Set());
  }

  // Compute page title dynamically
  let headerTitle = "";

  if (location.pathname === "/") {
    if (activeCategory === "all") {
      headerTitle = t("allSub", "All Items");
    } else if (activeCategory === "Login") {
      headerTitle = t("logins", "Logins");
    } else if (activeCategory === "Note") {
      headerTitle = t("notes", "Secure Notes");
    } else if (activeCategory === "Card") {
      headerTitle = t("cards", "Payment Cards");
    } else if (activeCategory === "Database") {
      headerTitle = t("databases", "Databases");
    }
  } else if (location.pathname === "/settings") {
    headerTitle = t("settingsSync", "Settings & Sync");
  }

  return (
    <Box className={classes.dashboardContainer}>
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        onOpenAdd={() => setIsAddModalOpen(true)}
        onLock={lock}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box className={classes.mainContent}>
        {headerTitle && (
          <MainHeader
            title={headerTitle}
            selectedCount={location.pathname === "/" ? selectedIds.size : 0}
            onExport={() => {
              notifications.show({
                title: t("exportSelected", "Xuất dữ liệu"),
                message: t(
                  "exportNotImplemented",
                  "Tính năng xuất dữ liệu sẽ được cập nhật sau."
                ),
                color: "blue",
                autoClose: 2500,
              });
            }}
            onDelete={() => setConfirmBulkDelete(true)}
          />
        )}
        <Box
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Outlet
            context={{
              openMobileSidebar: () => setMobileOpen(true),
              onOpenAdd: () => setIsAddModalOpen(true),
              selectedIds,
              setSelectedIds,
            }}
          />
        </Box>
      </Box>

      {/* Shared Item Creator Modal */}
      <AddItemModal
        opened={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

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
                notifications.show({
                  title: t("deleteSuccess", "Xóa thành công"),
                  message: t("bulkDeleteSuccessDesc", {
                    count: selectedIds.size,
                  }),
                  color: "green",
                });
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

export default MainLayout;
