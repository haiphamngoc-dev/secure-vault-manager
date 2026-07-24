const PORTS = [12519, 12520, 12521];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveAesGcmKey(pairingToken: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const tokenData = encoder.encode(pairingToken);
  const keyHash = await crypto.subtle.digest("SHA-256", tokenData);
  return await crypto.subtle.importKey(
    "raw",
    keyHash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptPayload(
  payload: object,
  pairingToken: string
): Promise<{ ciphertext: string; nonce: string; pairing_token: string }> {
  const key = await deriveAesGcmKey(pairingToken);
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(payload));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    nonce: arrayBufferToBase64(iv.buffer),
    pairing_token: pairingToken,
  };
}

async function decryptPayload<T = unknown>(
  ciphertextB64: string,
  nonceB64: string,
  pairingToken: string
): Promise<T> {
  const key = await deriveAesGcmKey(pairingToken);
  const ciphertext = base64ToArrayBuffer(ciphertextB64);
  const iv = base64ToArrayBuffer(nonceB64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonStr) as T;
}

/**
 * Checks status from Desktop Local HTTP Server across fallback ports.
 */
export async function fetchLocalServerStatus(): Promise<{
  status: string;
  locked: boolean;
  paired: boolean;
} | null> {
  for (const port of PORTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      const res = await fetch(`http://127.0.0.1:${port}/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Try next port
    }
  }
  return null;
}

/**
 * Sends an E2E AES-GCM encrypted RPC request to Desktop Local HTTP Server across fallback ports.
 */
export async function sendLocalServerRpc<T = unknown>(
  payload: object,
  pairingToken: string
): Promise<T | null> {
  const encryptedReq = await encryptPayload(payload, pairingToken);

  for (const port of PORTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`http://127.0.0.1:${port}/rpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(encryptedReq),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const encryptedRes = (await res.json()) as {
          ciphertext: string;
          nonce: string;
        };
        return await decryptPayload<T>(
          encryptedRes.ciphertext,
          encryptedRes.nonce,
          pairingToken
        );
      }

      // If server responded with error status (e.g. 401, 400), handle response directly
      const errJson = (await res.json().catch(() => null)) as T | null;
      if (errJson) {
        return errJson;
      }
    } catch {
      // Connection refused, try next port
    }
  }
  return null;
}
