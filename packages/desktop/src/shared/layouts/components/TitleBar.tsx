/**
 * @file TitleBar.tsx
 * @description Integrated custom header bar for borderless windows.
 * Combines Tauri window controls, page titles, global search, and utility toggles.
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useDebouncedValue } from "@mantine/hooks";
import {
  Group,
  UnstyledButton,
  Image,
  Text,
  TextInput,
  Box,
  ActionIcon,
  Tooltip,
  Badge,
  Menu,
} from "@mantine/core";
import {
  IconMinus,
  IconCopy,
  IconSquare,
  IconX,
  IconSearch,
  IconBrandGithub,
  IconMenu2,
  IconChevronLeft,
  IconLock,
  IconLogout,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconScissors,
  IconClipboard,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useVault } from "@/app/providers/VaultProvider";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { AboutModal } from "./AboutModal";
import classes from "./TitleBar.module.css";

/**
 * Tauri window instance for window controls.
 */
const appWindow = getCurrentWindow();

/**
 * Props for the TitleBar component.
 */
interface TitleBarProps {
  /** Callback to open mobile sidebar */
  onMenuClick?: () => void;
}

/**
 * Custom integrated window titlebar/header.
 * Implements window controls, routing title context, and search utility.
 */
export function TitleBar({ onMenuClick }: Readonly<TitleBarProps>) {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { status, lock } = useVault();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [aboutOpened, setAboutOpened] = useState(false);

  const isMac =
    typeof window !== "undefined" && navigator.userAgent.includes("Mac");

  useEffect(() => {
    // Keep track of maximized state
    const checkMaximizedState = async () => {
      try {
        const state = await appWindow.isMaximized();
        setIsMaximized(state);
      } catch {
        // Fallback for browser testing
        setIsMaximized(false);
      }
    };

    checkMaximizedState();

    let unlisten: (() => void) | undefined;
    appWindow
      .onResized(() => {
        checkMaximizedState();
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleMinimize = () => {
    appWindow.minimize().catch((err) => console.error("Minimize error:", err));
  };

  const handleMaximize = () => {
    appWindow
      .toggleMaximize()
      .catch((err) => console.error("Maximize error:", err));
  };

  const handleClose = () => {
    appWindow.close().catch((err) => console.error("Close error:", err));
  };

  const handleOpenGithub = () => {
    openUrl("https://github.com/haiphamngoc-dev/secure-vault-manager").catch(
      (err) => console.error("Failed to open GitHub:", err)
    );
  };

  const urlSearchQuery = searchParams.get("q") || "";
  const [localSearchQuery, setLocalSearchQuery] = useState(urlSearchQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlSearchQuery);
  const [debouncedSearchQuery] = useDebouncedValue(localSearchQuery, 200);

  // Sync state during render when URL query changes externally
  if (urlSearchQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlSearchQuery);
    setLocalSearchQuery(urlSearchQuery);
  }

  // Sync debounced search value to URL search params
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const currentQ = prev.get("q") || "";
        if (debouncedSearchQuery === currentQ) return prev;

        if (debouncedSearchQuery) {
          prev.set("q", debouncedSearchQuery);
        } else {
          prev.delete("q");
        }
        return prev;
      },
      { replace: true }
    );
  }, [debouncedSearchQuery, setSearchParams]);

  const handleClearSearch = () => {
    setLocalSearchQuery("");
    setSearchParams((prev) => {
      prev.delete("q");
      return prev;
    });
  };

  const handleUndo = () => document.execCommand("undo");
  const handleRedo = () => document.execCommand("redo");
  const handleCut = () => document.execCommand("cut");
  const handleCopyText = () => document.execCommand("copy");
  const handlePaste = () => document.execCommand("paste");

  const showSearch = location.pathname === "/" && status === "unlocked";

  // macOS window traffic lights controls
  const macOSControls = (
    <div className={classes.macOSControls}>
      <button
        onClick={handleClose}
        className={`${classes.macOSButton} ${classes.macOSClose}`}
        aria-label={t("titlebar.close", "Close")}
      />
      <button
        onClick={handleMinimize}
        className={`${classes.macOSButton} ${classes.macOSMinimize}`}
        aria-label={t("titlebar.minimize", "Minimize")}
      />
      <button
        onClick={handleMaximize}
        className={`${classes.macOSButton} ${classes.macOSMaximize}`}
        aria-label={
          isMaximized
            ? t("titlebar.restore", "Restore")
            : t("titlebar.maximize", "Maximize")
        }
      />
    </div>
  );

  // Windows/Linux native window controls
  const windowsControls = (
    <Group gap={0} wrap="nowrap" className={classes.windowButtons}>
      <UnstyledButton
        className={classes.button}
        onClick={handleMinimize}
        title={t("titlebar.minimize", "Minimize")}
      >
        <IconMinus size={14} />
      </UnstyledButton>
      <UnstyledButton
        className={classes.button}
        onClick={handleMaximize}
        title={
          isMaximized
            ? t("titlebar.restore", "Restore")
            : t("titlebar.maximize", "Maximize")
        }
      >
        {isMaximized ? <IconCopy size={14} /> : <IconSquare size={14} />}
      </UnstyledButton>
      <UnstyledButton
        className={`${classes.button} ${classes.closeButton}`}
        onClick={handleClose}
        title={t("titlebar.close", "Close")}
      >
        <IconX size={14} />
      </UnstyledButton>
    </Group>
  );

  // Custom Dropdown Menu Bar (Windows/Linux)
  const menuBar = (
    <div className={classes.menuBar}>
      {/* File Dropdown */}
      <Menu
        shadow="md"
        width={180}
        trigger="click"
        transitionProps={{ transition: "pop-top-left", duration: 150 }}
      >
        <Menu.Target>
          <button className={classes.menuTrigger}>
            {t("titlebar.file", "File")}
          </button>
        </Menu.Target>
        <Menu.Dropdown>
          {status === "unlocked" && (
            <Menu.Item leftSection={<IconLock size={14} />} onClick={lock}>
              {t("titlebar.lockVault", "Lock Vault")}
            </Menu.Item>
          )}
          {status === "unlocked" && <Menu.Divider />}
          <Menu.Item
            leftSection={<IconLogout size={14} />}
            onClick={handleClose}
          >
            {t("titlebar.exit", "Exit")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {/* Edit Dropdown */}
      <Menu
        shadow="md"
        width={180}
        trigger="click"
        transitionProps={{ transition: "pop-top-left", duration: 150 }}
      >
        <Menu.Target>
          <button className={classes.menuTrigger}>
            {t("titlebar.edit", "Edit")}
          </button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconArrowBackUp size={14} />}
            rightSection={
              <Text size="xs" c="dimmed">
                Ctrl+Z
              </Text>
            }
            onClick={handleUndo}
          >
            {t("titlebar.undo", "Undo")}
          </Menu.Item>
          <Menu.Item
            leftSection={<IconArrowForwardUp size={14} />}
            rightSection={
              <Text size="xs" c="dimmed">
                Ctrl+Y
              </Text>
            }
            onClick={handleRedo}
          >
            {t("titlebar.redo", "Redo")}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconScissors size={14} />}
            rightSection={
              <Text size="xs" c="dimmed">
                Ctrl+X
              </Text>
            }
            onClick={handleCut}
          >
            {t("titlebar.cut", "Cut")}
          </Menu.Item>
          <Menu.Item
            leftSection={<IconCopy size={14} />}
            rightSection={
              <Text size="xs" c="dimmed">
                Ctrl+C
              </Text>
            }
            onClick={handleCopyText}
          >
            {t("titlebar.copy", "Copy")}
          </Menu.Item>
          <Menu.Item
            leftSection={<IconClipboard size={14} />}
            rightSection={
              <Text size="xs" c="dimmed">
                Ctrl+V
              </Text>
            }
            onClick={handlePaste}
          >
            {t("titlebar.paste", "Paste")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {/* Help Dropdown */}
      <Menu
        shadow="md"
        width={150}
        trigger="click"
        transitionProps={{ transition: "pop-top-left", duration: 150 }}
      >
        <Menu.Target>
          <button className={classes.menuTrigger}>
            {t("titlebar.help", "Help")}
          </button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconInfoCircle size={14} />}
            onClick={() => setAboutOpened(true)}
          >
            {t("titlebar.about", "About")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );

  return (
    <>
      <Group
        justify="space-between"
        align="center"
        className={classes.titlebar}
        wrap="nowrap"
        data-tauri-drag-region
      >
        {isMac ? (
          <>
            {/* Left section: macOS Traffic Lights */}
            <Group gap="xs" style={{ flexShrink: 0 }} data-tauri-drag-region>
              {macOSControls}
            </Group>

            {/* Center section: macOS centered Title */}
            <Group
              gap="xs"
              align="center"
              justify="center"
              data-tauri-drag-region
              className={classes.centeredTitle}
            >
              <Image
                src="/logo.svg"
                className={classes.logo}
                alt="logo"
                data-tauri-drag-region
              />
              <Text className={classes.title} data-tauri-drag-region>
                Secure Vault Manager
              </Text>
              <Badge
                variant="outline"
                color="gray"
                size="xs"
                style={{
                  fontSize: "9px",
                  height: "16px",
                  padding: "0 4px",
                  alignSelf: "center",
                }}
              >
                v1.0.0
              </Badge>
            </Group>

            {/* Right section: Search input and Toggles */}
            <Group
              gap={0}
              className={classes.controls}
              wrap="nowrap"
              style={{ flexShrink: 0 }}
            >
              <Group gap="xs" mr="xs" wrap="nowrap">
                {showSearch && (
                  <>
                    <TextInput
                      placeholder={t(
                        "titlebar.searchPlaceholder",
                        "Tìm kiếm dữ liệu..."
                      )}
                      value={localSearchQuery}
                      onChange={(e) =>
                        setLocalSearchQuery(e.currentTarget.value)
                      }
                      leftSection={<IconSearch size={14} />}
                      rightSection={
                        localSearchQuery ? (
                          <ActionIcon
                            variant="transparent"
                            color="gray"
                            onClick={handleClearSearch}
                          >
                            <IconX size={14} />
                          </ActionIcon>
                        ) : null
                      }
                      size="xs"
                      className={`${classes.searchInput} ${classes.desktopSearch}`}
                    />
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="md"
                      onClick={() => setIsMobileSearchOpen(true)}
                      className={classes.mobileSearchIcon}
                    >
                      <IconSearch size={18} />
                    </ActionIcon>
                  </>
                )}
                <LanguageToggle />
                <ThemeToggle />
                <Tooltip
                  label={t("titlebar.githubLabel", "GitHub Project")}
                  position="bottom"
                  withArrow
                >
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="md"
                    onClick={handleOpenGithub}
                  >
                    <IconBrandGithub size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </>
        ) : (
          /* Windows/Linux Layout */
          <>
            {showSearch && isMobileSearchOpen ? (
              <Group
                className={classes.mobileSearchOverlay}
                align="center"
                wrap="nowrap"
                style={{ width: "100%" }}
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="md"
                  onClick={() => setIsMobileSearchOpen(false)}
                >
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <TextInput
                  placeholder={t(
                    "titlebar.searchPlaceholder",
                    "Tìm kiếm dữ liệu..."
                  )}
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.currentTarget.value)}
                  leftSection={<IconSearch size={14} />}
                  rightSection={
                    localSearchQuery ? (
                      <ActionIcon
                        variant="transparent"
                        color="gray"
                        onClick={handleClearSearch}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    ) : null
                  }
                  size="xs"
                  style={{ flex: 1 }}
                  autoFocus
                />
              </Group>
            ) : (
              <>
                {/* Brand logo, mobile menu, and Title section on the left */}
                <Group
                  gap="xs"
                  className={classes.logoSection}
                  wrap="nowrap"
                  style={{ overflow: "hidden", flex: "0 1 auto", minWidth: 0 }}
                  data-tauri-drag-region
                >
                  {onMenuClick && status === "unlocked" && (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={onMenuClick}
                      size="md"
                      className={classes.mobileMenuBtn}
                    >
                      <IconMenu2 size={20} />
                    </ActionIcon>
                  )}
                  <Image
                    src="/logo.svg"
                    className={classes.logo}
                    alt="logo"
                    data-tauri-drag-region
                  />

                  {/* Custom Menu Bar inside Custom Titlebar */}
                  {menuBar}
                </Group>

                {/* Central Searchbar */}
                {showSearch && (
                  <Box
                    className={`${classes.searchContainer} ${classes.desktopSearch}`}
                    data-tauri-drag-region
                  >
                    <TextInput
                      placeholder={t(
                        "titlebar.searchPlaceholder",
                        "Tìm kiếm dữ liệu..."
                      )}
                      value={localSearchQuery}
                      onChange={(e) =>
                        setLocalSearchQuery(e.currentTarget.value)
                      }
                      leftSection={<IconSearch size={14} />}
                      rightSection={
                        localSearchQuery ? (
                          <ActionIcon
                            variant="transparent"
                            color="gray"
                            onClick={handleClearSearch}
                          >
                            <IconX size={14} />
                          </ActionIcon>
                        ) : null
                      }
                      size="xs"
                      className={classes.searchInput}
                    />
                  </Box>
                )}

                {/* Action utility buttons and window controls on the right */}
                <Group
                  gap={0}
                  className={classes.controls}
                  wrap="nowrap"
                  style={{ flexShrink: 0 }}
                >
                  <Group gap="xs" mr="xs" wrap="nowrap">
                    {showSearch && (
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="md"
                        onClick={() => setIsMobileSearchOpen(true)}
                        className={classes.mobileSearchIcon}
                      >
                        <IconSearch size={18} />
                      </ActionIcon>
                    )}
                    <Box className={classes.langToggle}>
                      <LanguageToggle />
                    </Box>
                    <ThemeToggle />
                    <Box className={classes.githubToggle}>
                      <Tooltip
                        label={t("titlebar.githubLabel", "GitHub Project")}
                        position="bottom"
                        withArrow
                      >
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="md"
                          onClick={handleOpenGithub}
                        >
                          <IconBrandGithub size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Box>
                  </Group>

                  {windowsControls}
                </Group>
              </>
            )}
          </>
        )}
      </Group>

      {/* About App Modal */}
      <AboutModal opened={aboutOpened} onClose={() => setAboutOpened(false)} />
    </>
  );
}

export default TitleBar;
