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

export interface CustomField {
  id: string;
  label: string;
  value: string;
  type: string;
  section?: string;
}

export interface VaultItem {
  id: string;

  title: string;
  category: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  updatedAt: number;
  customFields?: CustomField[];
  tags?: string[];
  icon?: string;
}

export interface VaultProfile {
  id: string;
  name: string;
  file_name: string;
}

export type VaultStatus = "loading" | "uninitialized" | "locked" | "unlocked";

export interface VaultContextType {
  status: VaultStatus;
  checkVaultStatus: () => Promise<void>;
  unlock: (vaultId: string, password: string) => Promise<void>;
  lock: () => Promise<void>;
  initialize: (
    vaultId: string,
    name: string,
    password: string
  ) => Promise<void>;
  items: VaultItem[];
  addItem: (item: Omit<VaultItem, "id" | "updatedAt">) => void;
  addItems: (items: Array<Omit<VaultItem, "id" | "updatedAt">>) => void;
  deleteItem: (id: string) => void;
  deleteItems: (ids: string[]) => void;
  updateItem: (
    id: string,
    updatedFields: Partial<Omit<VaultItem, "id" | "updatedAt">>
  ) => void;
  vaults: VaultProfile[];
  currentVaultId: string | null;
  defaultVaultId: string | null;
  refreshVaultsList: () => Promise<VaultProfile[]>;
  renameVault: (vaultId: string, newName: string) => Promise<void>;
  setDefaultVault: (vaultId: string | null) => Promise<void>;
  deleteVault: (vaultId: string, deleteFile: boolean) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | null>(null);

export function VaultProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [vaults, setVaults] = useState<VaultProfile[]>([]);
  const [currentVaultId, setCurrentVaultId] = useState<string | null>(null);
  const [defaultVaultId, setDefaultVaultId] = useState<string | null>(null);

  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const addItems = useCallback(
    (newItems: Array<Omit<VaultItem, "id" | "updatedAt">>) => {
      const formattedItems: VaultItem[] = newItems.map((newItem) => ({
        ...newItem,
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 9),
        updatedAt: Date.now(),
      }));
      setItems((prev) => [...formattedItems, ...prev]);
    },
    []
  );

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const deleteItems = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setItems((prev) => prev.filter((item) => !idSet.has(item.id)));
  }, []);

  const updateItem = useCallback(
    (
      id: string,
      updatedFields: Partial<Omit<VaultItem, "id" | "updatedAt">>
    ) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...updatedFields, updatedAt: Date.now() }
            : item
        )
      );
    },
    []
  );

  const refreshVaultsList = useCallback(async () => {
    try {
      const registry = await invoke<{
        default_vault_id: string | null;
        vaults: VaultProfile[];
      }>("get_vaults");
      setVaults(registry.vaults);
      setDefaultVaultId(registry.default_vault_id);
      if (registry.vaults.length === 0) {
        setStatus("uninitialized");
        setCurrentVaultId(null);
        setDefaultVaultId(null);
      }
      return registry.vaults;
    } catch (err) {
      console.error("Failed to fetch vaults registry:", err);
      return [];
    }
  }, []);

  const checkVaultStatus = useCallback(async () => {
    try {
      const initialized = await invoke<boolean>("check_vault_initialized");
      if (!initialized) {
        setStatus("uninitialized");
        setVaults([]);
        setCurrentVaultId(null);
        setDefaultVaultId(null);
        return;
      }

      const fetchedVaults = await refreshVaultsList();
      if (fetchedVaults.length === 0) {
        setStatus("uninitialized");
        setVaults([]);
        setCurrentVaultId(null);
        setDefaultVaultId(null);
        return;
      }

      const unlocked = await invoke<boolean>("check_is_unlocked");
      if (unlocked) {
        const activeId = await invoke<string | null>("get_current_vault_id");
        setCurrentVaultId(activeId);
        const loaded: VaultItem[] = await invoke("load_items");
        setItems(loaded);
        setStatus("unlocked");
      } else {
        setStatus("locked");
        setCurrentVaultId(null);
      }
    } catch (err) {
      console.error("Failed to check vault status:", err);
      setStatus("locked");
    }
  }, [refreshVaultsList]);

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

        const fetchedVaults = await refreshVaultsList();
        if (!active) return;
        if (fetchedVaults.length === 0) {
          setStatus("uninitialized");
          return;
        }

        const unlocked = await invoke<boolean>("check_is_unlocked");
        if (!active) return;
        if (unlocked) {
          const activeId = await invoke<string | null>("get_current_vault_id");
          if (active) setCurrentVaultId(activeId);
          const loaded: VaultItem[] = await invoke("load_items");
          if (active) {
            setItems(loaded);
            setStatus("unlocked");
          }
        } else {
          setStatus("locked");
        }
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
        setItems([]);
        setCurrentVaultId(null);
      }
    });

    // Listen to native vault-unlocked event (for extension unlock updates)
    const unlistenUnlocked = listen("vault-unlocked", async () => {
      if (active) {
        try {
          const activeId = await invoke<string | null>("get_current_vault_id");
          setCurrentVaultId(activeId);
          const loaded: VaultItem[] = await invoke("load_items");
          setItems(loaded);
          setStatus("unlocked");
        } catch (err) {
          console.error("Failed to load vault items after remote unlock:", err);
        }
      }
    });

    return () => {
      active = false;
      unlistenLocked.then((fn) => fn());
      unlistenUnlocked.then((fn) => fn());
    };
  }, [refreshVaultsList]);

  const unlock = useCallback(async (vaultId: string, password: string) => {
    await invoke("unlock_vault", { vaultId, password });
    setCurrentVaultId(vaultId);
    const loaded: VaultItem[] = await invoke("load_items");
    setItems(loaded);
    setStatus("unlocked");
  }, []);

  const lock = useCallback(async () => {
    await invoke("lock_vault");
    setItems([]);
    setCurrentVaultId(null);
    setStatus("locked");
  }, []);

  const initialize = useCallback(
    async (vaultId: string, name: string, password: string) => {
      await invoke("initialize_vault", { vaultId, name, password });
      await refreshVaultsList();
      setCurrentVaultId(vaultId);
      setItems([]);
      setStatus("unlocked");
    },
    [refreshVaultsList]
  );

  const renameVault = useCallback(
    async (vaultId: string, newName: string) => {
      await invoke("rename_vault", { vaultId, newName });
      await refreshVaultsList();
    },
    [refreshVaultsList]
  );

  const setDefaultVault = useCallback(
    async (vaultId: string | null) => {
      await invoke("set_default_vault", { vaultId });
      await refreshVaultsList();
    },
    [refreshVaultsList]
  );

  const deleteVault = useCallback(
    async (vaultId: string, deleteFile: boolean) => {
      await invoke("delete_vault", { vaultId, deleteFile });
      if (currentVaultId === vaultId) {
        try {
          await invoke("lock");
        } catch {
          // ignore lock error if already locked
        }
      }
      await checkVaultStatus();
    },
    [currentVaultId, checkVaultStatus]
  );

  // Auto-save vault items when they change with 1000ms debounce
  useEffect(() => {
    if (status !== "unlocked") return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        await invoke("save_items", { items });
      } catch (err) {
        console.error("Failed to save items:", err);
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [items, status]);

  const value = useMemo(
    () => ({
      status,
      checkVaultStatus,
      unlock,
      lock,
      initialize,
      items,
      addItem,
      addItems,
      deleteItem,
      deleteItems,
      updateItem,
      vaults,
      currentVaultId,
      defaultVaultId,
      refreshVaultsList,
      renameVault,
      setDefaultVault,
      deleteVault,
    }),
    [
      status,
      checkVaultStatus,
      unlock,
      lock,
      initialize,
      items,
      addItem,
      addItems,
      deleteItem,
      deleteItems,
      updateItem,
      vaults,
      currentVaultId,
      defaultVaultId,
      refreshVaultsList,
      renameVault,
      setDefaultVault,
      deleteVault,
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
    <Box style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
    </Box>
  );
}

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
};
