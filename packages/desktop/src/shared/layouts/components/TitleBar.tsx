/**
 * @file TitleBar.tsx
 * @description Custom desktop-like title bar component for borderless windows.
 * Integrates Tauri window commands (minimize, maximize, close) and language locales.
 */

import { Group, UnstyledButton, Image, Text } from "@mantine/core";
import { IconMinus, IconCopy, IconSquare, IconX } from "@tabler/icons-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import classes from "./TitleBar.module.css";

/**
 * Tauri window instance for window controls.
 */
const appWindow = getCurrentWindow();

/**
 * Props for the TitleBar component.
 */
interface TitleBarProps {
  /** Optional window title text shown in the header. */
  title?: string;
}

/**
 * Custom window titlebar.
 * Implements customized OS titlebar controls (Minimize, Maximize/Restore, Close).
 *
 * @param {TitleBarProps} props - The component props.
 * @returns {JSX.Element} The custom titlebar React element.
 */
export function TitleBar({ title }: Readonly<TitleBarProps>) {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Keep track of maximized state
    const checkMaximizedState = async () => {
      const state = await appWindow.isMaximized();
      setIsMaximized(state);
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

  return (
    <Group
      justify="space-between"
      align="center"
      className={classes.titlebar}
      wrap="nowrap"
      data-tauri-drag-region
    >
      {/* Brand logo and Title section on the left */}
      <Group
        gap="xs"
        className={classes.logoSection}
        wrap="nowrap"
        style={{ overflow: "hidden", flex: 1 }}
        data-tauri-drag-region
      >
        <Image
          src="/logo.svg"
          className={classes.logo}
          alt="logo"
          data-tauri-drag-region
        />
        <Text className={classes.title} data-tauri-drag-region>
          {title}
        </Text>
      </Group>

      {/* Action window buttons (Minimize, Maximize, Close) */}
      <Group
        gap={0}
        className={classes.controls}
        wrap="nowrap"
        style={{ flexShrink: 0 }}
      >
        <UnstyledButton
          className={classes.button}
          onClick={handleMinimize}
          title={t("titlebar.minimize") ?? "Minimize"}
        >
          <IconMinus size={14} />
        </UnstyledButton>
        <UnstyledButton
          className={classes.button}
          onClick={handleMaximize}
          title={
            (isMaximized ? t("titlebar.restore") : t("titlebar.maximize")) ??
            "Maximize"
          }
        >
          {isMaximized ? <IconCopy size={14} /> : <IconSquare size={14} />}
        </UnstyledButton>
        <UnstyledButton
          className={`${classes.button} ${classes.closeButton}`}
          onClick={handleClose}
          title={t("titlebar.close") ?? "Close"}
        >
          <IconX size={14} />
        </UnstyledButton>
      </Group>
    </Group>
  );
}

export default TitleBar;
