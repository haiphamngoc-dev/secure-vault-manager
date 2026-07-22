import { useEffect, useState, useRef } from "react";
import { Box, Group, Stack, Text, ActionIcon, Tooltip } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { IconCopy, IconCheck, IconShieldLock } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { generateTotpCode, parseOtpAuthUri } from "@/shared/utils/totp";
import classes from "./TotpDisplay.module.css";

interface TotpDisplayProps {
  uriOrSecret: string;
  label?: string;
  showSecretPreview?: boolean;
}

export function TotpDisplay({
  uriOrSecret,
  label,
  showSecretPreview = false,
}: Readonly<TotpDisplayProps>) {
  const { t } = useTranslation();
  const clipboard = useClipboard();
  const [totpInfo, setTotpInfo] = useState<{
    code: string;
    remainingSeconds: number;
    period: number;
  }>({
    code: "------",
    remainingSeconds: 30,
    period: 30,
  });

  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recalculate TOTP code every second
  useEffect(() => {
    let isMounted = true;

    const updateCode = async () => {
      const info = await generateTotpCode(uriOrSecret);
      if (isMounted) {
        setTotpInfo(info);
      }
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [uriOrSecret]);

  // Clean up auto-clear clipboard timer on unmount
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  const handleCopyCode = () => {
    if (!totpInfo.code || totpInfo.code === "------") return;

    const rawDigits = totpInfo.code.replace(/\s+/g, "");
    clipboard.copy(rawDigits);

    notifications.show({
      title: t("totpCopiedTitle", "Đã sao chép mã TOTP"),
      message: t("totpCopiedMsg", {
        digits: rawDigits,
        defaultValue: `Mã ${rawDigits} sẽ tự động bị xóa khỏi Bộ nhớ tạm sau 30 giây để bảo mật.`,
      }),
      color: "blue",
      autoClose: 3000,
    });

    // Auto-clear clipboard after 30 seconds
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    clearTimerRef.current = setTimeout(() => {
      clipboard.copy("");
    }, 30000);
  };

  // Format code display: e.g. "123 456"
  const formattedCode =
    totpInfo.code.length === 6
      ? `${totpInfo.code.slice(0, 3)} ${totpInfo.code.slice(3)}`
      : totpInfo.code;

  const progressPercent = Math.max(
    0,
    Math.min(100, (totpInfo.remainingSeconds / (totpInfo.period || 30)) * 100)
  );

  const progressColor =
    totpInfo.remainingSeconds <= 5
      ? "var(--mantine-color-red-6)"
      : totpInfo.remainingSeconds <= 10
        ? "var(--mantine-color-yellow-6)"
        : "var(--mantine-color-blue-5)";

  const parsed = parseOtpAuthUri(uriOrSecret);
  const displayLabel = label || t("totpDefaultLabel", "Mã xác thực 2FA (TOTP)");

  return (
    <Box className={classes.totpCard} onClick={handleCopyCode}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Stack gap={2} style={{ flex: 1 }}>
          <Group gap="xs" align="center">
            <IconShieldLock size={16} color="var(--mantine-color-blue-4)" />
            <Text size="xs" fw={600} c="dimmed">
              {displayLabel}
            </Text>
            {parsed.issuer && (
              <Text size="xs" c="blue.4" fw={500}>
                ({parsed.issuer})
              </Text>
            )}
          </Group>

          <Group gap="md" align="baseline">
            <Text className={classes.totpCode}>{formattedCode}</Text>
            <Text
              size="xs"
              c="dimmed"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {t("totpRefreshIn", {
                seconds: totpInfo.remainingSeconds,
                defaultValue: `Làm mới sau ${totpInfo.remainingSeconds}s`,
              })}
            </Text>
          </Group>
        </Stack>

        <Tooltip
          label={
            clipboard.copied
              ? t("copied", "Đã chép!")
              : t("totpCopyTooltip", "Sao chép mã 6 số")
          }
        >
          <ActionIcon
            variant="light"
            color="blue"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyCode();
            }}
          >
            {clipboard.copied ? (
              <IconCheck size={18} />
            ) : (
              <IconCopy size={18} />
            )}
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* 30-second Countdown Progress Bar */}
      <Box className={classes.progressTrack}>
        <Box
          className={classes.progressBar}
          style={{
            width: `${progressPercent}%`,
            backgroundColor: progressColor,
          }}
        />
      </Box>

      {showSecretPreview && parsed.secret && (
        <Text size="xs" className={classes.secretPreview} mt="xs">
          Secret: {parsed.secret.slice(0, 4)}...{parsed.secret.slice(-4)}
        </Text>
      )}
    </Box>
  );
}

export default TotpDisplay;
