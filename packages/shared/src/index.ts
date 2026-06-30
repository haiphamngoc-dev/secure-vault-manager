// Shared TypeScript Interfaces based on SRS Logical Data Model

export interface VaultMetadata {
  salt: string;
  vault_key_envelope: string;
  pairing_token: string;
}

export interface VaultItemPayload {
  title: string;
  url: string;
  fields: Record<string, string>;
  notes?: string;
}

export interface VaultItem {
  id: string;
  category: string;
  encrypted_payload: string;
  created_at: string;
  updated_at: string;
}

export interface VaultFile {
  metadata: VaultMetadata;
  items: VaultItem[];
}

/**
 * Helper to convert a Hex string to Uint8Array
 */
export function fromHex(hex: string): Uint8Array {
  const normalized = hex.replace(/[^0-9a-fA-F]/g, "");
  const len = normalized.length;
  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(normalized.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Helper to convert a Uint8Array to a Hex string
 */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Invokes the WebAssembly-compiled greet function.
 */
export async function getWasmGreet(name: string): Promise<string> {
  const wasm = await import("@secure-vault/crypto-wasm");
  return wasm.greet(name);
}

/**
 * Derives a 32-byte key from password and a hex salt.
 */
export async function deriveVaultKey(
  password: string,
  saltHex: string
): Promise<Uint8Array> {
  const wasm = await import("@secure-vault/crypto-wasm");
  const saltBytes = fromHex(saltHex);
  return wasm.derive_key(password, saltBytes);
}

/**
 * Encrypts a string payload with a 32-byte key.
 * Returns the ciphertext and nonce in Hex format.
 */
export async function encryptVaultData(
  key: Uint8Array,
  plaintext: string
): Promise<{ ciphertextHex: string; nonceHex: string }> {
  const wasm = await import("@secure-vault/crypto-wasm");
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  const result = wasm.encrypt(key, plaintextBytes) as {
    ciphertext: Uint8Array;
    nonce: Uint8Array;
  };

  return {
    ciphertextHex: toHex(result.ciphertext),
    nonceHex: toHex(result.nonce),
  };
}

/**
 * Decrypts a Hex ciphertext with a 32-byte key and a Hex nonce.
 * Returns the decrypted string payload.
 */
export async function decryptVaultData(
  key: Uint8Array,
  ciphertextHex: string,
  nonceHex: string
): Promise<string> {
  const wasm = await import("@secure-vault/crypto-wasm");
  const ciphertextBytes = fromHex(ciphertextHex);
  const nonceBytes = fromHex(nonceHex);

  const decryptedBytes = wasm.decrypt(key, ciphertextBytes, nonceBytes);
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBytes);
}

/**
 * Securely generates random bytes of a specified length via WebAssembly.
 */
export async function generateWasmRandomBytes(
  length: number
): Promise<Uint8Array> {
  const wasm = await import("@secure-vault/crypto-wasm");
  return wasm.generate_random_bytes(length);
}
