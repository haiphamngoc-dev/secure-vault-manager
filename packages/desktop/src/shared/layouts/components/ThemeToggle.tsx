import { ActionIcon, Tooltip, useMantineColorScheme } from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { t } = useTranslation();

  const toggleTheme = () => {
    setColorScheme(colorScheme === "dark" ? "light" : "dark");
  };

  const isDark = colorScheme === "dark";
  const tooltipLabel = isDark
    ? t("switchToLight", "Chuyển sang giao diện Sáng")
    : t("switchToDark", "Chuyển sang giao diện Tối");

  return (
    <Tooltip label={tooltipLabel} position="bottom" withArrow>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="md"
        onClick={toggleTheme}
        aria-label={tooltipLabel}
      >
        {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}

export default ThemeToggle;
