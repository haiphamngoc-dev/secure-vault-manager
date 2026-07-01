import React, { useState } from "react";
import {
  Container,
  Paper,
  Title,
  Text,
  PasswordInput,
  Button,
  Stack,
  Alert,
  ThemeIcon,
  Box,
} from "@mantine/core";
import { IconLock, IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "./UnlockPage.module.css";

interface UnlockPageProps {
  onSuccess: () => void;
  onUnlock: (password: string) => Promise<void>;
}

export function UnlockPage({ onSuccess, onUnlock }: Readonly<UnlockPageProps>) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onUnlock(password);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : t("unlockErrorInvalid")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.container}>
      <Container size="xs" py="xl">
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
                {t("unlockTitle")}
              </Title>
              <Text size="sm" c="dimmed" mt="xs">
                {t("unlockDesc")}
              </Text>
            </Box>
          </Stack>

          <form onSubmit={handleUnlock} className={classes.form}>
            <Stack gap="md">
              {error && (
                <Alert
                  icon={<IconAlertTriangle size={16} />}
                  title={t("unlockErrorTitle")}
                  color="red"
                  radius="md"
                >
                  {error}
                </Alert>
              )}

              <PasswordInput
                required
                label={t("unlockPasswordLabel")}
                placeholder={t("unlockPasswordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                disabled={loading}
                radius="md"
              />

              <Button
                type="submit"
                fullWidth
                loading={loading}
                gradient={{ from: "blue", to: "cyan", deg: 45 }}
                variant="gradient"
                radius="md"
                size="md"
                mt="md"
                className={classes.button}
              >
                {t("unlockSubmitBtn")}
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </div>
  );
}

export default UnlockPage;
