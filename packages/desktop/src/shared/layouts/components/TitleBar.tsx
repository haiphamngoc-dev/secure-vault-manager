/**
 * @file TitleBar.tsx
 * @description Integrated custom header bar for borderless windows.
 * Combines Tauri window controls, page titles, global search, and utility toggles.
 */

import {
  Group,
  UnstyledButton,
  Image,
  Text,
  TextInput,
  Box,
  ActionIcon,
  Tooltip,
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
} from "@tabler/icons-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";
import { useVault } from "@/app/providers/VaultProvider";
import { openUrl } from "@tauri-apps/plugin-opener";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
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
  const { status } = useVault();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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

    const unlistenMaximized = appWindow.onResized(() => {
      checkMaximizedState();
    });

    return () => {
      unlistenMaximized.then((fn) => fn);
    };
  }, []);

  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = () => {
    appWindow.toggleMaximize();
  };

  const handleClose = () => {
    appWindow.close();
  };

  const handleOpenGithub = () => {
    openUrl("https://github.com/haiphamngoc-dev/secure-vault-manager").catch(
      (err) => console.error("Failed to open GitHub:", err)
    );
  };

  const searchQuery = searchParams.get("q") || "";
  const handleSearchChange = (val: string) => {
    setSearchParams((prev) => {
      if (val) {
        prev.set("q", val);
      } else {
        prev.delete("q");
      }
      return prev;
    });
  };

  const showSearch = location.pathname === "/" && status === "unlocked";

  return (
    <Group
      justify="space-between"
      align="center"
      className={classes.titlebar}
      wrap="nowrap"
      data-tauri-drag-region
    >
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
            size="lg"
            onClick={() => setIsMobileSearchOpen(false)}
          >
            <IconChevronLeft size={20} />
          </ActionIcon>
          <TextInput
            placeholder={t("searchPlaceholder", "Tìm kiếm dữ liệu...")}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            rightSection={
              searchQuery ? (
                <ActionIcon
                  variant="transparent"
                  color="gray"
                  onClick={() => handleSearchChange("")}
                >
                  <IconX size={16} />
                </ActionIcon>
              ) : null
            }
            size="sm"
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
            <Text className={classes.title} data-tauri-drag-region>
              Secure Vault Manager
            </Text>
          </Group>

          {/* Central Searchbar (visible only on Dashboard when unlocked) */}
          <Box className={classes.searchContainer} data-tauri-drag-region>
            {showSearch && (
              <>
                <TextInput
                  placeholder={t("searchPlaceholder", "Tìm kiếm dữ liệu...")}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.currentTarget.value)}
                  leftSection={<IconSearch size={16} />}
                  size="sm"
                  className={`${classes.searchInput} ${classes.desktopSearch}`}
                />
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  onClick={() => setIsMobileSearchOpen(true)}
                  className={classes.mobileSearchIcon}
                >
                  <IconSearch size={18} />
                </ActionIcon>
              </>
            )}
          </Box>

          {/* Action utility buttons and window controls on the right */}
          <Group
            gap={0}
            className={classes.controls}
            wrap="nowrap"
            style={{ flexShrink: 0 }}
          >
            {status === "unlocked" && (
              <Group gap="xs" mr="xs" wrap="nowrap">
                <Box className={classes.langToggle}>
                  <LanguageToggle />
                </Box>
                <ThemeToggle />
                <Box className={classes.githubToggle}>
                  <Tooltip
                    label={t("githubLabel", "GitHub Project")}
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
            )}

            {/* Tauri Native Window Controls */}
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
                {isMaximized ? (
                  <IconCopy size={14} />
                ) : (
                  <IconSquare size={14} />
                )}
              </UnstyledButton>
              <UnstyledButton
                className={`${classes.button} ${classes.closeButton}`}
                onClick={handleClose}
                title={t("titlebar.close", "Close")}
              >
                <IconX size={14} />
              </UnstyledButton>
            </Group>
          </Group>
        </>
      )}
    </Group>
  );
}

export default TitleBar;
