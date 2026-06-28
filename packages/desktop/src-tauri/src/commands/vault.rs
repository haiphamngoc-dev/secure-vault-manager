use tauri::State;

use crate::core::storage::{initialize_new_vault, unlock_and_load_vault, vault_exists};
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
