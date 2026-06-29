use tauri::State;

use crate::core::storage::{
    initialize_new_vault, load_vault_with_key, save_existing_vault, unlock_and_load_vault,
    vault_exists,
};
use crate::core::vault::{Vault, VaultItem};
use crate::AppState;

/// Command to check if the vault database has been initialized on the system.
#[tauri::command]
pub fn check_vault_initialized(app: tauri::AppHandle) -> bool {
    vault_exists(&app)
}

/// Command to check if the vault is currently unlocked and the key is loaded in memory.
#[tauri::command]
pub fn check_is_unlocked(state: State<'_, AppState>) -> bool {
    state.vault_key.lock().unwrap().is_some()
}

/// Command to initialize a new vault database using the provided Master Password.
#[tauri::command]
pub fn initialize_vault(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    password: String,
) -> Result<(), String> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters long.".to_string());
    }
    let (key, salt) = initialize_new_vault(&app, &password)?;
    *state.vault_key.lock().unwrap() = Some(key);
    *state.vault_salt.lock().unwrap() = Some(salt);
    Ok(())
}

/// Command to unlock the existing vault database and load its decryption key into memory.
#[tauri::command]
pub fn unlock_vault(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    password: String,
) -> Result<(), String> {
    let (_vault, key, salt) = unlock_and_load_vault(&app, &password)?;
    *state.vault_key.lock().unwrap() = Some(key);
    *state.vault_salt.lock().unwrap() = Some(salt);
    Ok(())
}

/// Command to lock the vault by wiping the decryption key and salt from memory.
#[tauri::command]
pub fn lock_vault(state: State<'_, AppState>) -> Result<(), String> {
    *state.vault_key.lock().unwrap() = None;
    *state.vault_salt.lock().unwrap() = None;
    Ok(())
}

/// Command to load all items from the decrypted vault database.
#[tauri::command]
pub fn load_items(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<VaultItem>, String> {
    let key_guard = state.vault_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or("Vault is locked.")?;

    let vault = load_vault_with_key(&app, key)?;
    Ok(vault.items)
}

/// Command to encrypt and save the vault items.
#[tauri::command]
pub fn save_items(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    items: Vec<VaultItem>,
) -> Result<(), String> {
    let key_guard = state.vault_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or("Vault is locked.")?;

    let salt_guard = state.vault_salt.lock().unwrap();
    let salt = salt_guard.as_ref().ok_or("Vault is locked.")?;

    let vault = Vault {
        version: 1,
        items,
    };

    save_existing_vault(&app, key, salt, &vault)?;
    Ok(())
}
