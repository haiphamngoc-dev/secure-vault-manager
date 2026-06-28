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
 * Invokes the WebAssembly-compiled greet function.
 */
export async function getWasmGreet(name: string): Promise<string> {
  const wasm = await import("@secure-vault/crypto-wasm");
  return wasm.greet(name);
}
