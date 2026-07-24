import {
  decode_qr_code_rgba,
  parse_otpauth_uri,
} from "@secure-vault/crypto-wasm";

export interface QrScanResult {
  rawText: string;
  otpauth?: {
    secret: string;
    issuer: string;
    account: string;
    digits: number;
    period: number;
    algorithm: string;
  };
}

/**
 * Scans the current active browser tab image for QR codes and extracts 2FA/TOTP secret.
 */
export async function scanVisibleTabForQr(): Promise<QrScanResult> {
  // 1. Capture current visible tab screenshot
  const dataUrl = await new Promise<string>((resolve, reject) => {
    chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!dataUrl) {
        reject(new Error("Failed to capture tab screenshot"));
      } else {
        resolve(dataUrl);
      }
    });
  });

  // 2. Load dataUrl into Image element
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () =>
      reject(new Error("Failed to load captured screenshot image"));
    img.src = dataUrl;
  });

  // 3. Draw on Canvas to extract RGBA pixel data
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2d canvas context");
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);

  // 4. Decode QR code using Rust WebAssembly (rqrr)
  const decodedText = decode_qr_code_rgba(
    new Uint8Array(imageData.data.buffer),
    imageData.width,
    imageData.height
  );

  let otpauth: QrScanResult["otpauth"] | undefined;

  // 5. Try parsing as otpauth URI
  if (decodedText.startsWith("otpauth://")) {
    try {
      otpauth = parse_otpauth_uri(decodedText) as QrScanResult["otpauth"];
    } catch (e) {
      console.warn("[SVM Extension] Decoded QR is not a valid otpauth URI:", e);
    }
  }

  return {
    rawText: decodedText,
    otpauth,
  };
}
