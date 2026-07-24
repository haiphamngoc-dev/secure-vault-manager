import { generate_totp, parse_otpauth_uri } from "@secure-vault/crypto-wasm";
import {
  fetchLocalServerStatus,
  sendLocalServerRpc,
} from "./services/http-client";

interface OtpAuthParsed {
  secret: string;
  digits?: number;
  period?: number;
}

/**
 * Sends request to Desktop App via Local Loopback HTTP Server (127.0.0.1:12519).
 */
async function sendRequestToDesktop(
  actionPayload: Record<string, unknown>,
  token: string
): Promise<unknown> {
  const httpRes = await sendLocalServerRpc(actionPayload, token);
  if (httpRes) {
    return httpRes;
  }
  return {
    status: "error",
    message: "Cannot connect to desktop application.",
  };
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "VERIFY_TOKEN") {
    const testToken = request.token as string;
    sendLocalServerRpc({ action: "check_status" }, testToken)
      .then((rpcCheckRes) => {
        const rpcCheck = rpcCheckRes as {
          status: string;
          message?: string;
          locked?: boolean;
        } | null;

        if (
          !rpcCheck ||
          rpcCheck.status === "error" ||
          (rpcCheck.message &&
            rpcCheck.message.toLowerCase().includes("invalid pairing token"))
        ) {
          sendResponse({
            status: "error",
            invalidToken: true,
            message:
              "Mã kết nối không chính xác. Vui lòng kiểm tra lại trên ứng dụng Desktop.",
          });
        } else {
          sendResponse({
            status: "success",
            paired: true,
            locked: rpcCheck.locked ?? false,
          });
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        sendResponse({
          status: "error",
          message: message || "Khởi tạo kết nối thất bại.",
        });
      });
    return true;
  }

  if (request.type === "CHECK_STATUS") {
    getPairingToken().then(async (token) => {
      if (!token) {
        sendResponse({
          status: "success",
          locked: true,
          paired: false,
          message: "Please enter pairing key.",
        });
        return;
      }
      try {
        const localStatus = await fetchLocalServerStatus();
        if (!localStatus) {
          sendResponse({
            status: "error",
            paired: false,
            message: "Cannot connect to desktop application.",
          });
          return;
        }

        const rpcCheckRes = await sendLocalServerRpc(
          { action: "check_status" },
          token
        );
        const rpcCheck = rpcCheckRes as {
          status: string;
          message?: string;
          locked?: boolean;
        } | null;

        if (
          !rpcCheck ||
          rpcCheck.status === "error" ||
          (rpcCheck.message &&
            rpcCheck.message.toLowerCase().includes("invalid pairing token"))
        ) {
          await chrome.storage.local.remove("pairing_token");
          sendResponse({
            status: "error",
            invalidToken: true,
            paired: false,
            locked: true,
            message: "Mã kết nối không hợp lệ hoặc đã bị thay đổi.",
          });
          return;
        }

        sendResponse({
          status: "success",
          paired: true,
          locked: rpcCheck.locked ?? localStatus.locked,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendResponse({
          status: "error",
          message: message || "Cannot connect to desktop application.",
        });
      }
    });
    return true;
  }

  if (request.type === "GET_CREDENTIALS") {
    getPairingToken().then(async (token) => {
      if (!token) {
        sendResponse({
          status: "error",
          message: "Please enter pairing key.",
        });
        return;
      }
      try {
        const response = await sendRequestToDesktop(
          { action: "get_credentials", domain: request.domain },
          token
        );
        sendResponse(response);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendResponse({
          status: "error",
          message: message || "Failed to fetch credentials.",
        });
      }
    });
    return true;
  }

  if (request.type === "SAVE_CREDENTIAL") {
    getPairingToken().then(async (token) => {
      if (!token) {
        sendResponse({ status: "error", message: "Extension not paired." });
        return;
      }
      try {
        const response = await sendRequestToDesktop(
          {
            action: "save_credential",
            domain: request.domain,
            username: request.username,
            password: request.password,
            is_new_account: request.isNewAccount,
          },
          token
        );
        sendResponse(response);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendResponse({
          status: "error",
          message: message || "Failed to save credential.",
        });
      }
    });
    return true;
  }

  if (request.type === "UPDATE_TOTP") {
    getPairingToken().then(async (token) => {
      if (!token) {
        sendResponse({ status: "error", message: "Extension not paired." });
        return;
      }
      try {
        const response = await sendRequestToDesktop(
          {
            action: "update_totp",
            domain: request.domain,
            totp_secret: request.totpSecret,
          },
          token
        );
        sendResponse(response);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendResponse({
          status: "error",
          message: message || "Failed to update TOTP.",
        });
      }
    });
    return true;
  }

  if (request.type === "GENERATE_TOTP") {
    try {
      let secret = request.secret as string;
      let digits = 6;
      let period = 30;

      if (secret.startsWith("otpauth://")) {
        try {
          const parsed = parse_otpauth_uri(secret) as OtpAuthParsed;
          secret = parsed.secret;
          digits = parsed.digits || 6;
          period = parsed.period || 30;
        } catch (e) {
          console.warn("[SVM Extension] Failed to parse otpauth URI:", e);
        }
      }

      const nowSecs = BigInt(Math.floor(Date.now() / 1000));
      const code = generate_totp(secret, nowSecs, BigInt(period), digits);
      sendResponse({ status: "success", code });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      sendResponse({ status: "error", message });
    }
    return true;
  }

  if (request.type === "UNLOCK_VAULT") {
    getPairingToken().then(async (token) => {
      if (!token) {
        sendResponse({ status: "error", message: "Extension not paired." });
        return;
      }
      try {
        const response = await sendRequestToDesktop(
          { action: "unlock_vault", password: request.password },
          token
        );
        sendResponse(response);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendResponse({
          status: "error",
          message: message || "Failed to unlock vault.",
        });
      }
    });
    return true;
  }

  if (request.type === "TRIGGER_BIOMETRICS") {
    getPairingToken().then(async (token) => {
      if (!token) {
        sendResponse({ status: "error", message: "Extension not paired." });
        return;
      }
      try {
        const response = await sendRequestToDesktop(
          { action: "trigger_biometrics" },
          token
        );
        sendResponse(response);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendResponse({
          status: "error",
          message: message || "Biometrics authentication failed.",
        });
      }
    });
    return true;
  }
});

async function getPairingToken(): Promise<string | null> {
  const result = await chrome.storage.local.get("pairing_token");
  return (result.pairing_token as string) || null;
}
