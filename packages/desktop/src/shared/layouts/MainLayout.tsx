import { useEffect, useState } from "react";
import { Box } from "@mantine/core";
import { Outlet } from "react-router-dom";
import { useVault } from "@/app/providers/VaultProvider";
import { Sidebar } from "./components/Sidebar";
import { AddItemModal } from "@/features/dashboard/components/AddItemModal";
import { useAutoLock } from "@/features/settings/hooks/useAutoLock";
import classes from "./MainLayout.module.css";

export function MainLayout() {
  useAutoLock();
  const { lock } = useVault();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setMobileOpen(true);
    window.addEventListener("open-mobile-sidebar", handleOpen);
    return () => window.removeEventListener("open-mobile-sidebar", handleOpen);
  }, []);

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
        <Outlet
          context={{
            openMobileSidebar: () => setMobileOpen(true),
            onOpenAdd: () => setIsAddModalOpen(true),
          }}
        />
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
