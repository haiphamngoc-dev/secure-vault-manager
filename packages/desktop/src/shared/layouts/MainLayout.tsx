import { useEffect, useState } from "react";
import { Box } from "@mantine/core";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useVault } from "@/app/providers/VaultProvider";
import { Sidebar } from "./components/Sidebar";
import { MainHeader } from "./components/MainHeader";
import { AddItemModal } from "@/features/dashboard/components/AddItemModal";
import { useAutoLock } from "@/features/settings/hooks/useAutoLock";
import classes from "./MainLayout.module.css";

export function MainLayout() {
  useAutoLock();
  const { lock } = useVault();
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setMobileOpen(true);
    window.addEventListener("open-mobile-sidebar", handleOpen);
    return () => window.removeEventListener("open-mobile-sidebar", handleOpen);
  }, []);

  // Compute page title dynamically
  let headerTitle = "";

  if (location.pathname === "/") {
    const activeCategory = searchParams.get("category") || "all";
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
        {headerTitle && <MainHeader title={headerTitle} />}
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
            }}
          />
        </Box>
      </Box>

      {/* Shared Item Creator Modal */}
      <AddItemModal
        opened={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </Box>
  );
}

export default MainLayout;
