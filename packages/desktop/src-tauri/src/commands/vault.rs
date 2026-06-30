use tauri::State;
use std::fs;

use crate::core::storage::{
    initialize_new_vault, load_vault_with_key, save_existing_vault, unlock_and_load_vault,
    vault_exists, get_vault_path,
};
use crate::core::vault::{Vault, VaultItem};
use crate::core::vault_registry::{
    load_registry, save_registry, VaultRegistry, VaultProfile
};
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
    vault_id: String,
    name: String,
    password: String,
) -> Result<(), String> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters long.".to_string());
    }

    // Alphanumeric file name safety check
    let sanitized_id: String = vault_id
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
        .collect();
    if sanitized_id.is_empty() {
        return Err("Invalid Vault ID.".to_string());
    }

    let file_name = format!("vault_{}.enc", sanitized_id);

    // 1. Initialize new vault file
    let (key, salt) = initialize_new_vault(&app, &password, &file_name)?;

    // 2. Load registry and add profile
    let mut registry = load_registry(&app)?;

    // Check if this vault ID already exists
    if registry.vaults.iter().any(|v| v.id == vault_id) {
        return Err("Vault ID already exists.".to_string());
    }

    // Set as default if it's the first vault
    if registry.vaults.is_empty() {
        registry.default_vault_id = Some(vault_id.clone());
    }

    registry.vaults.push(VaultProfile {
        id: vault_id.clone(),
        name,
        file_name: file_name.clone(),
    });

    save_registry(&app, &registry)?;

    // 3. Keep in AppState memory as unlocked
    *state.vault_key.lock().unwrap() = Some(key);
    *state.vault_salt.lock().unwrap() = Some(salt);
    *state.current_vault_file.lock().unwrap() = Some(file_name);

    Ok(())
}

/// Command to unlock the existing vault database and load its decryption key into memory.
#[tauri::command]
pub fn unlock_vault(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    vault_id: String,
    password: String,
) -> Result<(), String> {
    // Load registry to find filename
    let registry = load_registry(&app)?;
    let profile = registry
        .vaults
        .iter()
        .find(|v| v.id == vault_id)
        .ok_or_else(|| "Vault profile not found.".to_string())?;

    let (_vault, key, salt) = unlock_and_load_vault(&app, &password, &profile.file_name)?;
    *state.vault_key.lock().unwrap() = Some(key);
    *state.vault_salt.lock().unwrap() = Some(salt);
    *state.current_vault_file.lock().unwrap() = Some(profile.file_name.clone());
    Ok(())
}

/// Command to lock the vault by wiping the decryption key and salt from memory.
#[tauri::command]
pub fn lock_vault(state: State<'_, AppState>) -> Result<(), String> {
    *state.vault_key.lock().unwrap() = None;
    *state.vault_salt.lock().unwrap() = None;
    *state.current_vault_file.lock().unwrap() = None;
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

    let file_guard = state.current_vault_file.lock().unwrap();
    let file_name = file_guard.as_ref().ok_or("Vault is locked.")?;

    let vault = load_vault_with_key(&app, key, file_name)?;
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

    let file_guard = state.current_vault_file.lock().unwrap();
    let file_name = file_guard.as_ref().ok_or("Vault is locked.")?;

    let vault = Vault {
        version: 1,
        items,
    };

    save_existing_vault(&app, key, salt, &vault, file_name)?;
    Ok(())
}

/// Command to get the list of registered vaults.
#[tauri::command]
pub fn get_vaults(app: tauri::AppHandle) -> Result<VaultRegistry, String> {
    load_registry(&app)
}

/// Command to rename a vault profile.
#[tauri::command]
pub fn rename_vault(
    app: tauri::AppHandle,
    vault_id: String,
    new_name: String,
) -> Result<(), String> {
    let mut registry = load_registry(&app)?;
    if let Some(profile) = registry.vaults.iter_mut().find(|v| v.id == vault_id) {
        profile.name = new_name;
        save_registry(&app, &registry)?;
        Ok(())
    } else {
        Err("Vault not found.".to_string())
    }
}

/// Command to set a vault as the default.
#[tauri::command]
pub fn set_default_vault(
    app: tauri::AppHandle,
    vault_id: Option<String>,
) -> Result<(), String> {
    let mut registry = load_registry(&app)?;
    if let Some(ref id) = vault_id {
        if !registry.vaults.iter().any(|v| v.id == *id) {
            return Err("Vault ID does not exist in registry.".to_string());
        }
    }
    registry.default_vault_id = vault_id;
    save_registry(&app, &registry)?;
    Ok(())
}

/// Command to delete a vault profile.
#[tauri::command]
pub fn delete_vault(
    app: tauri::AppHandle,
    vault_id: String,
    delete_file: bool,
) -> Result<(), String> {
    let mut registry = load_registry(&app)?;

    let index = registry
        .vaults
        .iter()
        .position(|v| v.id == vault_id)
        .ok_or_else(|| "Vault profile not found.".to_string())?;

    let profile = registry.vaults.remove(index);

    if registry.default_vault_id.as_deref() == Some(&vault_id) {
        registry.default_vault_id = registry.vaults.first().map(|v| v.id.clone());
    }

    save_registry(&app, &registry)?;

    if delete_file {
        if let Ok(file_path) = get_vault_path(&app, &profile.file_name) {
            if file_path.exists() {
                let _ = fs::remove_file(file_path);
            }
        }
    }

    Ok(())
}

/// Command to get the currently unlocked vault ID, if any.
#[tauri::command]
pub fn get_current_vault_id(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let file_guard = state.current_vault_file.lock().unwrap();
    let file_name = match file_guard.as_ref() {
        Some(f) => f,
        None => return Ok(None),
    };
    let registry = load_registry(&app)?;
    let profile = registry.vaults.iter().find(|v| v.file_name == *file_name);
    Ok(profile.map(|p| p.id.clone()))
}
