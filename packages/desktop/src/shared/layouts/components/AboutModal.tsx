import {
  Modal,
  Stack,
  Title,
  Text,
  Button,
  Image,
  Badge,
  SimpleGrid,
  Group,
  ThemeIcon,
  Box,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  IconShieldCheck,
  IconLock,
  IconWorld,
  IconKey,
} from "@tabler/icons-react";
import classes from "./AboutModal.module.css";

interface AboutModalProps {
  opened: boolean;
  onClose: () => void;
}

export function AboutModal({ opened, onClose }: Readonly<AboutModalProps>) {
  const { t } = useTranslation();

  const features = [
    {
      icon: IconShieldCheck,
      title: t("titlebar.featureE2EE", "Mã hóa cao cấp AES-256 & Argon2id"),
    },
    {
      icon: IconLock,
      title: t("titlebar.featureOffline", "Bảo mật & Lưu trữ cục bộ 100%"),
    },
    {
      icon: IconWorld,
      title: t("titlebar.featureExtension", "Tích hợp Tiện ích Trình duyệt"),
    },
    {
      icon: IconKey,
      title: t("titlebar.featureTotp", "Trình tạo OTP & 2FA tích hợp"),
    },
  ];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("titlebar.about", "Giới thiệu")}
      centered
      size="md"
      radius="lg"
      overlayProps={{
        backgroundOpacity: 0.4,
        blur: 10,
      }}
      classNames={{
        content: classes.modalContent,
        header: classes.modalHeader,
        body: classes.modalBody,
      }}
    >
      <Stack align="center" gap="md" py="xs" px="xs">
        <Box className={classes.logoWrapper}>
          <Image
            src="/logo.svg"
            w={56}
            h={56}
            alt="Secure Vault Manager logo"
          />
        </Box>

        <Stack gap={4} align="center">
          <Title order={3} className={classes.titleGradient}>
            Secure Vault Manager
          </Title>
          <Group gap="xs">
            <Badge variant="light" color="blue" size="sm" radius="xl">
              {t("titlebar.aboutVersion", "Phiên bản 0.1.1")}
            </Badge>
          </Group>
        </Stack>

        <Text
          size="sm"
          c="dimmed"
          ta="center"
          className={classes.descriptionText}
        >
          {t(
            "titlebar.aboutDescription",
            "Secure Vault Manager là ứng dụng quản lý mật khẩu và thông tin cá nhân bảo mật cao. Giúp bạn lưu trữ an toàn, tự động điền và bảo vệ dữ liệu tuyệt đối trên thiết bị của mình."
          )}
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" w="100%" mt="xs">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Group
                key={feat.title}
                gap="xs"
                className={classes.featureCard}
                p="xs"
              >
                <ThemeIcon variant="light" color="blue" size="md" radius="md">
                  <Icon size={16} />
                </ThemeIcon>
                <Text size="xs" fw={500} style={{ flex: 1 }}>
                  {feat.title}
                </Text>
              </Group>
            );
          })}
        </SimpleGrid>

        <Text size="xs" c="dimmed" ta="center" mt="xs">
          {t(
            "titlebar.copyright",
            "© 2026 Secure Vault Manager. Bảo lưu mọi quyền."
          )}
        </Text>

        <Button
          variant="default"
          size="xs"
          onClick={onClose}
          mt="xs"
          px="xl"
          radius="md"
        >
          {t("titlebar.close", "Đóng")}
        </Button>
      </Stack>
    </Modal>
  );
}

export default AboutModal;
