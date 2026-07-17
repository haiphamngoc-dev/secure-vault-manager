import React, { useState } from "react";
import {
  Paper,
  Title,
  Text,
  PasswordInput,
  Button,
  Stack,
  Alert,
  ThemeIcon,
  Box,
  Progress,
  Group,
  TextInput,
} from "@mantine/core";
import { IconLock, IconAlertTriangle } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import classes from "./OnboardingPage.module.css";

interface OnboardingPageProps {
  onSuccess: () => void;
}

export function OnboardingPage({ onSuccess }: Readonly<OnboardingPageProps>) {
  const { t } = useTranslation();
  const [vaultName, setVaultName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { value: 0, color: "gray", label: "" };
    let score = 0;
    if (pass.length >= 8) score += 30;
    if (pass.length >= 12) score += 10;
    if (/[A-Z]/.test(pass)) score += 20;
    if (/\d/.test(pass)) score += 20;
    if (/[^A-Za-z0-9]/.test(pass)) score += 20;

    if (score < 40)
      return { value: score, color: "red", label: t("strengthWeak", "Weak") };
    if (score < 80)
      return {
        value: score,
        color: "orange",
        label: t("strengthMedium", "Medium"),
      };
    return {
      value: score,
      color: "teal",
      label: t("strengthStrong", "Strong"),
    };
  };

  const strength = getPasswordStrength(password);

  const handleInit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(t("onboardingErrorMinLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("onboardingErrorMismatch"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const vaultId = "default";
      const name = vaultName.trim() || t("defaultVaultName", "Kho cá nhân");
      await invoke("initialize_vault", { vaultId, name, password });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.container}>
      <Paper radius="lg" p="xl" withBorder className={classes.card}>
        <Stack gap="md" align="center">
          <ThemeIcon
            size={64}
            radius="xl"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan", deg: 45 }}
            className={classes.iconContainer}
          >
            <IconLock size={36} />
          </ThemeIcon>

          <Box style={{ textAlign: "center" }}>
            <Title order={2} className={classes.titleText}>
              {t("onboardingTitle")}
            </Title>
            <Text size="sm" c="dimmed" mt="xs">
              {t("onboardingDesc")}
            </Text>
          </Box>
        </Stack>

        <form onSubmit={handleInit} className={classes.form}>
          <Stack gap="md">
            {error && (
              <Alert
                icon={<IconAlertTriangle size={16} />}
                title={t("onboardingErrorTitle")}
                color="red"
                radius="md"
              >
                {error}
              </Alert>
            )}

            <TextInput
              required
              label={t("vaultNameLabel", "Tên hiển thị")}
              placeholder={t(
                "vaultNamePlaceholder",
                "Ví dụ: Kho cá nhân, Kho công việc"
              )}
              value={vaultName}
              onChange={(e) => setVaultName(e.currentTarget.value)}
              disabled={loading}
            />

            <PasswordInput
              required
              label={t("onboardingMasterLabel")}
              placeholder={t("onboardingMasterPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              disabled={loading}
            />

            {password && (
              <Box>
                <Group justify="space-between" mb={5}>
                  <Text size="xs" c="dimmed">
                    {t("passwordStrength", "Password Strength")}
                  </Text>
                  <Text size="xs" color={strength.color} fw={700}>
                    {strength.label}
                  </Text>
                </Group>
                <Progress
                  value={strength.value}
                  color={strength.color}
                  size="xs"
                  radius="xs"
                />
              </Box>
            )}

            <PasswordInput
              required
              label={t("onboardingConfirmLabel")}
              placeholder={t("onboardingConfirmPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              disabled={loading}
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              gradient={{ from: "blue", to: "cyan", deg: 45 }}
              variant="gradient"
              size="sm"
              mt="md"
              className={classes.button}
            >
              {t("onboardingSubmitBtn")}
            </Button>
          </Stack>
        </form>
      </Paper>
    </div>
  );
}

export default OnboardingPage;
