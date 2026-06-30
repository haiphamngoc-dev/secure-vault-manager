use argon2::Argon2;
use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    ChaCha20Poly1305, Key, Nonce,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct EncryptionResult {
    pub ciphertext: Vec<u8>,
    pub nonce: Vec<u8>,
}

/// A placeholder function compiled to WebAssembly.
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! This is from Rust WebAssembly.", name)
}

/// Derives a 256-bit (32 bytes) key from password and a 16-byte salt using Argon2id.
#[wasm_bindgen]
pub fn derive_key(password: &str, salt: &[u8]) -> Result<Vec<u8>, JsValue> {
    if salt.len() != 16 {
        return Err(JsValue::from_str("Salt must be exactly 16 bytes."));
    }
    let mut salt_arr = [0u8; 16];
    salt_arr.copy_from_slice(salt);

    let argon2 = Argon2::default();
    let mut derived_key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), &salt_arr, &mut derived_key)
        .map_err(|e| JsValue::from_str(&format!("Key derivation failed: {}", e)))?;

    Ok(derived_key.to_vec())
}

/// Encrypts plaintext bytes using ChaCha20-Poly1305 with a 32-byte key.
/// Returns a plain JS object { ciphertext: Uint8Array, nonce: Uint8Array }.
#[wasm_bindgen]
pub fn encrypt(key: &[u8], plaintext: &[u8]) -> Result<JsValue, JsValue> {
    if key.len() != 32 {
        return Err(JsValue::from_str("Key must be exactly 32 bytes."));
    }
    let mut key_arr = [0u8; 32];
    key_arr.copy_from_slice(key);

    let cipher = ChaCha20Poly1305::new(Key::from_slice(&key_arr));
    let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| JsValue::from_str(&format!("Encryption failed: {}", e)))?;

    let nonce_bytes: [u8; 12] = nonce.into();

    let result = EncryptionResult {
        ciphertext,
        nonce: nonce_bytes.to_vec(),
    };

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization failed: {}", e)))
}

/// Decrypts ciphertext bytes using ChaCha20-Poly1305 with a 32-byte key and 12-byte nonce.
#[wasm_bindgen]
pub fn decrypt(key: &[u8], ciphertext: &[u8], nonce: &[u8]) -> Result<Vec<u8>, JsValue> {
    if key.len() != 32 {
        return Err(JsValue::from_str("Key must be exactly 32 bytes."));
    }
    let mut key_arr = [0u8; 32];
    key_arr.copy_from_slice(key);

    if nonce.len() != 12 {
        return Err(JsValue::from_str("Nonce must be exactly 12 bytes."));
    }
    let mut nonce_arr = [0u8; 12];
    nonce_arr.copy_from_slice(nonce);

    let cipher = ChaCha20Poly1305::new(Key::from_slice(&key_arr));
    let nonce_ref = Nonce::from_slice(&nonce_arr);

    let plaintext = cipher
        .decrypt(nonce_ref, ciphertext)
        .map_err(|e| JsValue::from_str(&format!("Decryption failed: {}", e)))?;

    Ok(plaintext)
}

/// Utility function to securely generate random bytes (for generating salt or pairing tokens).
#[wasm_bindgen]
pub fn generate_random_bytes(length: usize) -> Vec<u8> {
    let mut bytes = vec![0u8; length];
    use rand::RngCore;
    OsRng.fill_bytes(&mut bytes);
    bytes
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wasm_crypto_flow() {
        let password = "my_super_secure_master_password";
        let salt = [1u8; 16];

        let key = derive_key(password, &salt).unwrap();
        assert_eq!(key.len(), 32);

        let plaintext = b"secure items list content";
        let generated = generate_random_bytes(12);
        assert_eq!(generated.len(), 12);

        let cipher = ChaCha20Poly1305::new(Key::from_slice(&key));
        let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng);
        let ciphertext = cipher.encrypt(&nonce, plaintext.as_slice()).unwrap();

        let nonce_bytes: [u8; 12] = nonce.into();
        let decrypted = decrypt(&key, &ciphertext, &nonce_bytes).unwrap();
        assert_eq!(plaintext.to_vec(), decrypted);
    }
}
