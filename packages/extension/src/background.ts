const HOST_NAME = "com.haiphamngoc_dev.secure_vault_manager_proxy";

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "CHECK_STATUS") {
    getPairingToken().then((token) => {
      if (!token) {
        sendResponse({
          status: "success",
          locked: true,
          paired: false,
          message: "Please enter pairing key.",
        });
        return;
      }
      chrome.runtime.sendNativeMessage(
        HOST_NAME,
        { action: "check_status", pairing_token: token },
        (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              status: "error",
              message: chrome.runtime.lastError.message,
            });
          } else {
            sendResponse(response);
          }
        }
      );
    });
    return true; // Keep message channel open for async response
  }

  if (request.type === "GET_CREDENTIALS") {
    getPairingToken().then((token) => {
      if (!token) {
        sendResponse({
          status: "error",
          message: "Please enter pairing key.",
        });
        return;
      }
      chrome.runtime.sendNativeMessage(
        HOST_NAME,
        {
          action: "get_credentials",
          domain: request.domain,
          pairing_token: token,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              status: "error",
              message: chrome.runtime.lastError.message,
            });
          } else {
            sendResponse(response);
          }
        }
      );
    });
    return true;
  }
});

async function getPairingToken(): Promise<string | null> {
  const result = await chrome.storage.local.get("pairing_token");
  return (result.pairing_token as string) || null;
}
