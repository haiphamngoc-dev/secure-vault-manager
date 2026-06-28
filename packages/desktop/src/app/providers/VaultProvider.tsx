import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { LoadingOverlay, Box } from "@mantine/core";

export interface VaultItem {
  id: string;
  title: string;
  category: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  updatedAt: number;
  customFields?: { id: string; label: string; value: string; type: string }[];
  tags?: string[];
}

export type VaultStatus = "loading" | "uninitialized" | "locked" | "unlocked";

interface VaultContextType {
  status: VaultStatus;
  checkVaultStatus: () => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => Promise<void>;
  initialize: (password: string) => Promise<void>;
  items: VaultItem[];
  addItem: (item: Omit<VaultItem, "id" | "updatedAt">) => void;
  deleteItem: (id: string) => void;
}

const VaultContext = createContext<VaultContextType | null>(null);

export function VaultProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [items, setItems] = useState<VaultItem[]>([]);

  const addItem = useCallback(
    (newItem: Omit<VaultItem, "id" | "updatedAt">) => {
      const item: VaultItem = {
        ...newItem,
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 9),
        updatedAt: Date.now(),
      };
      setItems((prev) => [item, ...prev]);
    },
    []
  );
  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);
  const checkVaultStatus = useCallback(async () => {
    try {
      const initialized = await invoke<boolean>("check_vault_initialized");
      if (!initialized) {
        setStatus("uninitialized");
        return;
      }
      const unlocked = await invoke<boolean>("check_is_unlocked");
      setStatus(unlocked ? "unlocked" : "locked");
    } catch (err) {
      console.error("Failed to check vault status:", err);
      setStatus("locked"); // Lock by default on failure for safety
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initCheck = async () => {
      try {
        const initialized = await invoke<boolean>("check_vault_initialized");
        if (!active) return;
        if (!initialized) {
          setStatus("uninitialized");
          return;
        }
        const unlocked = await invoke<boolean>("check_is_unlocked");
        if (!active) return;
        setStatus(unlocked ? "unlocked" : "locked");
      } catch (err) {
        console.error("Failed to check vault status on mount:", err);
        if (active) {
          setStatus("locked");
        }
      }
    };
    initCheck();

    // Listen to native vault-locked event
    const unlistenLocked = listen("vault-locked", () => {
      if (active) {
        setStatus("locked");
      }
    });

    return () => {
      active = false;
      unlistenLocked.then((fn) => fn());
    };
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      await invoke("unlock_vault", { password });
      await checkVaultStatus();
    },
    [checkVaultStatus]
  );

  const lock = useCallback(async () => {
    await invoke("lock_vault");
    setItems([]);
    await checkVaultStatus();
  }, [checkVaultStatus]);

  const initialize = useCallback(
    async (password: string) => {
      await invoke("initialize_vault", { password });
      await checkVaultStatus();
    },
    [checkVaultStatus]
  );

  const value = useMemo(
    () => ({
      status,
      checkVaultStatus,
      unlock,
      lock,
      initialize,
      items,
      addItem,
      deleteItem,
    }),
    [
      status,
      checkVaultStatus,
      unlock,
      lock,
      initialize,
      items,
      addItem,
      deleteItem,
    ]
  );

  if (status === "loading") {
    return (
      <Box style={{ width: "100vw", height: "100vh", position: "relative" }}>
        <LoadingOverlay
          visible
          overlayProps={{ blur: 2, backgroundOpacity: 0.8 }}
          loaderProps={{ size: "lg", color: "indigo", type: "bars" }}
        />
      </Box>
    );
  }

  return (
    <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
  );
}

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
};
