import { generate_totp, parse_otpauth_uri } from "@secure-vault/crypto-wasm";

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
        chrome.runtime.sendNativeMessage(
          HOST_NAME,
          { action: "check_status", pairing_token: token },
          () => {
            if (chrome.runtime.lastError) {
              // Ignore background ping errors
            }
          }
        );
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
        const response = await sendNativeMessageWithRetry({
          action: "check_status",
          pairing_token: token,
        });
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
        const response = await sendNativeMessageWithRetry({
          action: "get_credentials",
          domain: request.domain,
          pairing_token: token,
        });
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
        const response = await sendNativeMessageWithRetry({
          action: "save_credential",
          domain: request.domain,
          username: request.username,
          password: request.password,
          is_new_account: request.isNewAccount,
          pairing_token: token,
        });
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
        const response = await sendNativeMessageWithRetry({
          action: "update_totp",
          domain: request.domain,
          totp_secret: request.totpSecret,
          pairing_token: token,
        });
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
        const response = await sendNativeMessageWithRetry({
          action: "unlock_vault",
          password: request.password,
          pairing_token: token,
        });
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
        const response = await sendNativeMessageWithRetry({
          action: "trigger_biometrics",
          pairing_token: token,
        });
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
