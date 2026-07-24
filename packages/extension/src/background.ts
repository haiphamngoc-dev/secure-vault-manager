import { generate_totp, parse_otpauth_uri } from "@secure-vault/crypto-wasm";
import {
  fetchLocalServerStatus,
  sendLocalServerRpc,
} from "./services/http-client";

const HOST_NAME = "com.haiphamngoc_dev.secure_vault_manager_proxy";

interface OtpAuthParsed {
  secret: string;
  digits?: number;
  period?: number;
}

// Setup periodic keep-alive alarm to prevent Service Worker cold-start drops
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("svm_keep_alive", { periodInMinutes: 0.4 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "svm_keep_alive") {
    getPairingToken().then((token) => {
      if (token) {
        // Ping HTTP status or Native Message in background
        fetchLocalServerStatus().catch(() => {
          chrome.runtime.sendNativeMessage(
            HOST_NAME,
            { action: "check_status", pairing_token: token },
            () => {
              if (chrome.runtime.lastError) {
                // Ignore background ping errors
              }
            }
          );
        });
      }
    });
  }
});

/**
 * Sends a native message to Desktop Proxy with auto-retry logic on Service Worker cold-starts.
 */
async function sendNativeMessageWithRetry(
  message: Record<string, unknown>,
  maxRetries = 2,
  delayMs = 350
): Promise<unknown> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await new Promise<unknown>((resolve, reject) => {
        chrome.runtime.sendNativeMessage(HOST_NAME, message, (resp) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(resp);
          }
        });
      });
      return response;
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/**
 * Sends request to Desktop using Local Loopback HTTP Server (127.0.0.1:12519) first,
 * with automatic fallback to Native Messaging Host.
 */
async function sendRequestToDesktop(
  actionPayload: Record<string, unknown>,
  token: string
): Promise<unknown> {
  // 1. Try Local HTTP Server via 127.0.0.1:12519 (Fastest, 100% Snap compatible)
  try {
    const httpRes = await sendLocalServerRpc(actionPayload, token);
    if (httpRes) {
      return httpRes;
    }
  } catch {
    // Fallback to Native Messaging Host if Local HTTP Server fails
  }

  // 2. Fallback to Native Messaging Host IPC
  return await sendNativeMessageWithRetry({
    ...actionPayload,
    pairing_token: token,
  });
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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
        // Try local HTTP status check first
        const localStatus = await fetchLocalServerStatus();
        if (localStatus) {
          sendResponse(localStatus);
          return;
        }

        const response = await sendRequestToDesktop(
          { action: "check_status" },
          token
        );
        sendResponse(response);
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
