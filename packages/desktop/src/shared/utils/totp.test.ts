import { parseOtpAuthUri, base32ToBytes, generateTotpCode } from "./totp";

// Standalone verification helper
export async function verifyTotpModule(): Promise<boolean> {
  const bytes = base32ToBytes("JBSWY3DPEHPK3PXP");
  const text = new TextDecoder().decode(bytes);
  if (text !== "Hello!") return false;

  const uri =
    "otpauth://totp/Google%3Auser%40gmail.com?secret=JBSWY3DPEHPK3PXP&issuer=Google&period=30&digits=6";
  const parsed = parseOtpAuthUri(uri);
  if (parsed.secret !== "JBSWY3DPEHPK3PXP" || parsed.issuer !== "Google")
    return false;

  const result = await generateTotpCode("JBSWY3DPEHPK3PXP", 1600000000000);
  return result.code.length === 6 && /^\d{6}$/.test(result.code);
}
