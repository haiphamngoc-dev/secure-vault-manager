import { ActionIcon, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  const toggleLanguage = () => {
    const nextLang = currentLang.startsWith("vi") ? "en" : "vi";
    i18n.changeLanguage(nextLang);
  };

  const tooltipLabel = currentLang.startsWith("vi")
    ? "Switch to English"
    : "Chuyển sang Tiếng Việt";

  return (
    <Tooltip label={tooltipLabel} position="bottom" withArrow>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="md"
        onClick={toggleLanguage}
        radius="md"
        style={{ fontWeight: 700, fontSize: "11px" }}
      >
        {currentLang.startsWith("vi") ? "EN" : "VI"}
      </ActionIcon>
    </Tooltip>
  );
}

export default LanguageToggle;
