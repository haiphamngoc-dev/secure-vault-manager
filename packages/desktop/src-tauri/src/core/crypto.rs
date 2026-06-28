use argon2::Argon2;
use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    ChaCha20Poly1305, Key, Nonce,
};

/// Derives a 256-bit (32 bytes) secret key from a master password and salt using Argon2id.
///
/// # Arguments
///
/// * `password` - The master password string.
/// * `salt` - A 16-byte random salt.
pub fn derive_key(password: &str, salt: &[u8; 16]) -> Result<[u8; 32], String> {
    let argon2 = Argon2::default();
    let mut derived_key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut derived_key)
        .map_err(|e| format!("Key derivation failed: {}", e))?;
    Ok(derived_key)
}

/// Encrypts bytes using ChaCha20-Poly1305 with a 256-bit key and random 96-bit nonce.
///
/// # Arguments
///
/// * `key` - The 32-byte derived symmetric key.
/// * `plaintext` - The plain raw bytes to encrypt.
pub fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> Result<(Vec<u8>, [u8; 12]), String> {
    let cipher = ChaCha20Poly1305::new(Key::from_slice(key));
    let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;
    let nonce_bytes: [u8; 12] = nonce.into();
    Ok((ciphertext, nonce_bytes))
}

/// Decrypts bytes using ChaCha20-Poly1305 with a 256-bit key and 96-bit nonce.
///
/// # Arguments
///
/// * `key` - The 32-byte derived symmetric key.
/// * `ciphertext` - The encrypted data bytes.
/// * `nonce` - The 12-byte nonce used during encryption.
pub fn decrypt(key: &[u8; 32], ciphertext: &[u8], nonce: &[u8; 12]) -> Result<Vec<u8>, String> {
    let cipher = ChaCha20Poly1305::new(Key::from_slice(key));
    let nonce = Nonce::from_slice(nonce);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;
    Ok(plaintext)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_key_and_encrypt_decrypt() {
        let password = "my_secure_master_password";
        let salt = [42u8; 16];

        let key = derive_key(password, &salt).unwrap();
        assert_ne!(key, [0u8; 32]);

        let secret_data = b"secret credentials list";
        let (ciphertext, nonce) = encrypt(&key, secret_data).unwrap();
        assert_ne!(secret_data.to_vec(), ciphertext);

        let decrypted = decrypt(&key, &ciphertext, &nonce).unwrap();
        assert_eq!(secret_data.to_vec(), decrypted);
    }
}
