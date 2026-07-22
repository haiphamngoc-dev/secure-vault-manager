/**
 * RFC 6238 TOTP (Time-Based One-Time Password) & Base32 Utility
 * Uses native Web Crypto API (window.crypto.subtle) for zero-dependency HMAC-SHA1 computation.
 */

export interface OtpAuthParams {
  secret: string;
  issuer?: string;
  account?: string;
  digits: number;
  period: number;
  algorithm: string;
}

/**
 * Decodes a Base32 string into a Uint8Array.
 * Ignores spaces, hyphens, and handles RFC 4648 Base32 alphabet.
 */
export function base32ToBytes(base32: string): Uint8Array {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");

  const bits: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const val = ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue;
    for (let b = 4; b >= 0; b--) {
      bits.push((val >> b) & 1);
    }
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i * 8 + b];
    }
    bytes[i] = byteVal;
  }

  return bytes;
}

/**
 * Parses an otpauth://totp/ URI or raw secret key string.
 */
export function parseOtpAuthUri(secretOrUri: string): OtpAuthParams {
  const trimmed = secretOrUri.trim();

  if (trimmed.startsWith("otpauth://")) {
    try {
      const url = new URL(trimmed);
      const secret = url.searchParams.get("secret") || "";
      const issuer = url.searchParams.get("issuer") || undefined;
      const period = parseInt(url.searchParams.get("period") || "30", 10);
      const digits = parseInt(url.searchParams.get("digits") || "6", 10);
      const algorithm = (
        url.searchParams.get("algorithm") || "SHA-1"
      ).toUpperCase();

      // Account name from pathname
      let account: string | undefined = undefined;
      const pathname = decodeURIComponent(
        url.pathname.replace(/^\/\/?totp\//i, "")
      );
      if (pathname) {
        account = pathname.includes(":") ? pathname.split(":")[1] : pathname;
      }

      return {
        secret,
        issuer,
        account,
        digits: isNaN(digits) ? 6 : digits,
        period: isNaN(period) ? 30 : period,
        algorithm: algorithm === "SHA1" ? "SHA-1" : algorithm,
      };
    } catch {
      // Fallback if URL parsing fails
    }
  }

  // Raw secret string
  return {
    secret: trimmed.replace(/\s+/g, ""),
    digits: 6,
    period: 30,
    algorithm: "SHA-1",
  };
}

/**
 * Generates an RFC 6238 TOTP code using Web Crypto API.
 */
export async function generateTotpCode(
  secretOrUri: string,
  timestampMs: number = Date.now()
): Promise<{ code: string; remainingSeconds: number; period: number }> {
  const params = parseOtpAuthUri(secretOrUri);

  if (!params.secret) {
    return { code: "------", remainingSeconds: 0, period: 30 };
  }

  const period = params.period || 30;
  const digits = params.digits || 6;

  const currentSeconds = Math.floor(timestampMs / 1000);
  const counter = Math.floor(currentSeconds / period);
  const remainingSeconds = period - (currentSeconds % period);

  try {
    const keyBytes = base32ToBytes(params.secret);
    if (keyBytes.length === 0) {
      return { code: "------", remainingSeconds, period };
    }

    // Convert counter to 8-byte big-endian ArrayBuffer
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    // Counter is 64-bit integer, upper 32 bits are 0 for current unix timestamps
    view.setUint32(0, 0, false);
    view.setUint32(4, counter, false);

    // Import HMAC Key
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes as BufferSource,
      { name: "HMAC", hash: { name: params.algorithm || "SHA-1" } },
      false,
      ["sign"]
    );

    // Compute HMAC
    const signature = await crypto.subtle.sign("HMAC", key, buffer);
    const hmac = new Uint8Array(signature);

    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = (binary % Math.pow(10, digits))
      .toString()
      .padStart(digits, "0");

    return { code: otp, remainingSeconds, period };
  } catch (err) {
    console.error("Lỗi khi sinh mã TOTP:", err);
    return { code: "------", remainingSeconds, period };
  }
}
