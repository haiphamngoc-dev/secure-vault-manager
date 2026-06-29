use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::Manager;

use super::crypto::{decrypt, derive_key, encrypt};
use super::vault::Vault;

const VAULT_FILENAME: &str = "vault.enc";
const SALT_SIZE: usize = 16;
const NONCE_SIZE: usize = 12;

/// Resolves the absolute path to the encrypted vault database in OS AppData directory.
pub fn get_vault_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    Ok(app_dir.join(VAULT_FILENAME))
}

/// Checks if the encrypted vault database file exists.
pub fn vault_exists(app: &tauri::AppHandle) -> bool {
    if let Ok(path) = get_vault_path(app) {
        path.exists()
    } else {
        false
    }
}

/// Helper function to write a file atomically by writing to a temporary file first,
/// syncing it to disk, and then renaming/replacing the original file.
pub fn write_atomic(path: &Path, data: &[u8]) -> Result<(), String> {
    let dir = path
        .parent()
        .ok_or_else(|| "Invalid vault path: no parent directory".to_string())?;
    fs::create_dir_all(dir)
        .map_err(|e| format!("Failed to create directories: {}", e))?;

    let tmp_path = path.with_extension("tmp");
    {
        let mut file = File::create(&tmp_path)
            .map_err(|e| format!("Failed to create temp file: {}", e))?;
        file.write_all(data)
            .map_err(|e| format!("Failed to write to temp file: {}", e))?;
        file.sync_all()
            .map_err(|e| format!("Failed to sync temp file to disk: {}", e))?;
    }

    fs::rename(&tmp_path, path)
        .map_err(|e| format!("Failed to rename temp file to destination: {}", e))?;
    Ok(())
}

/// Initializes a new secure vault database by deriving a key and writing an empty vault structure.
pub fn initialize_new_vault(
    app: &tauri::AppHandle,
    password: &str,
) -> Result<([u8; 32], [u8; 16]), String> {
    let path = get_vault_path(app)?;

    // 1. Generate random 16-byte salt
    let mut salt = [0u8; SALT_SIZE];
    use rand::RngCore;
    rand::thread_rng().fill_bytes(&mut salt);

    // 2. Derive key from password and salt
    let key = derive_key(password, &salt)?;

    // 3. Create blank vault structure
    let vault = Vault {
        version: 1,
        items: Vec::new(),
    };
    let json_bytes = serde_json::to_vec(&vault)
        .map_err(|e| format!("Serialization failed: {}", e))?;

    // 4. Encrypt empty vault with derived key and random nonce
    let (ciphertext, nonce) = encrypt(&key, &json_bytes)?;

    // 5. Build physical binary content: [Salt (16B)] + [Nonce (12B)] + [Ciphertext]
    let mut file_payload = Vec::new();
    file_payload.extend_from_slice(&salt);
    file_payload.extend_from_slice(&nonce);
    file_payload.extend_from_slice(&ciphertext);

    // 6. Write file atomically
    write_atomic(&path, &file_payload)?;

    Ok((key, salt))
}

/// Reads the vault file, derives the key using the file's salt, and attempts to decrypt it.
/// If successful, returns the decrypted Vault and the derived key & salt.
pub fn unlock_and_load_vault(
    app: &tauri::AppHandle,
    password: &str,
) -> Result<(Vault, [u8; 32], [u8; 16]), String> {
    let path = get_vault_path(app)?;
    if !path.exists() {
        return Err("Vault database does not exist.".to_string());
    }

    // 1. Read entire binary file
    let mut file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    if buffer.len() < SALT_SIZE + NONCE_SIZE {
        return Err("Vault database is corrupted or incomplete.".to_string());
    }

    // 2. Split salt, nonce and ciphertext
    let mut salt = [0u8; SALT_SIZE];
    salt.copy_from_slice(&buffer[..SALT_SIZE]);

    let mut nonce = [0u8; NONCE_SIZE];
    nonce.copy_from_slice(&buffer[SALT_SIZE..SALT_SIZE + NONCE_SIZE]);

    let ciphertext = &buffer[SALT_SIZE + NONCE_SIZE..];

    // 3. Derive key using the read salt
    let key = derive_key(password, &salt)?;

    // 4. Decrypt ciphertext
    let plaintext = decrypt(&key, ciphertext, &nonce)?;

    // 5. Parse decrypted JSON
    let vault: Vault = serde_json::from_slice(&plaintext)
        .map_err(|e| format!("Failed to parse decrypted database: {}", e))?;

    Ok((vault, key, salt))
}

/// Encrypts and writes the vault structure using the existing key and salt.
pub fn save_existing_vault(
    app: &tauri::AppHandle,
    key: &[u8; 32],
    salt: &[u8; 16],
    vault: &Vault,
) -> Result<(), String> {
    let path = get_vault_path(app)?;

    // 1. Serialize vault JSON
    let json_bytes = serde_json::to_vec(vault)
        .map_err(|e| format!("Serialization failed: {}", e))?;

    // 2. Encrypt with existing key and a new random nonce
    let (ciphertext, nonce) = encrypt(key, &json_bytes)?;

    // 3. Build physical binary content: [Salt (16B)] + [Nonce (12B)] + [Ciphertext]
    let mut file_payload = Vec::new();
    file_payload.extend_from_slice(salt);
    file_payload.extend_from_slice(&nonce);
    file_payload.extend_from_slice(&ciphertext);

    // 4. Save file atomically
    write_atomic(&path, &file_payload)?;

    Ok(())
}

/// Loads and decrypts the vault database using the in-memory derived key.
pub fn load_vault_with_key(
    app: &tauri::AppHandle,
    key: &[u8; 32],
) -> Result<Vault, String> {
    let path = get_vault_path(app)?;
    if !path.exists() {
        return Err("Vault database does not exist.".to_string());
    }

    let mut file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    if buffer.len() < SALT_SIZE + NONCE_SIZE {
        return Err("Vault database is corrupted or incomplete.".to_string());
    }

    let mut nonce = [0u8; NONCE_SIZE];
    nonce.copy_from_slice(&buffer[SALT_SIZE..SALT_SIZE + NONCE_SIZE]);

    let ciphertext = &buffer[SALT_SIZE + NONCE_SIZE..];

    let plaintext = decrypt(key, ciphertext, &nonce)?;

    let vault: Vault = serde_json::from_slice(&plaintext)
        .map_err(|e| format!("Failed to parse decrypted database: {}", e))?;

    Ok(vault)
}
