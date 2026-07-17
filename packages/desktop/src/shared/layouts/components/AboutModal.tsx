import { Modal, Stack, Title, Text, Button, Image } from "@mantine/core";
import { useTranslation } from "react-i18next";
import classes from "./AboutModal.module.css";

interface AboutModalProps {
  opened: boolean;
  onClose: () => void;
}

export function AboutModal({ opened, onClose }: Readonly<AboutModalProps>) {
  const { t } = useTranslation();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("titlebar.about", "About")}
      centered
      radius="lg"
      overlayProps={{
        backgroundOpacity: 0.35,
        blur: 8,
      }}
      styles={{
        content: {
          backgroundColor: "var(--color-neutral-card)",
          border: "1px solid var(--color-neutral-light)",
          color: "var(--color-neutral-dark)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        },
        header: {
          backgroundColor: "transparent",
        },
        body: {
          backgroundColor: "transparent",
        },
      }}
    >
      <Stack align="center" gap="md" p="md">
        <Image src="/logo.svg" w={48} h={48} alt="Secure Vault Manager logo" />
        <Title order={3} className={classes.titleGradient}>
          Secure Vault Manager
        </Title>
        <Text size="sm" c="dimmed">
          Version 1.0.0 (Tauri v2 + Mantine v9)
        </Text>
        <Text size="sm" ta="center">
          {t(
            "titlebar.aboutDescription",
            "A premium, high-performance desktop application interface built with React and Rust."
          )}
        </Text>
        <Button variant="default" size="xs" onClick={onClose} mt="md">
          {t("titlebar.close", "Close")}
        </Button>
      </Stack>
    </Modal>
  );
}

export default AboutModal;
