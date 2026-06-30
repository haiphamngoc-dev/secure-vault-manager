use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use serde::{Deserialize, Serialize};
use super::storage::write_atomic;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultProfile {
    pub id: String,
    pub name: String,
    pub file_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VaultRegistry {
    pub default_vault_id: Option<String>,
    pub vaults: Vec<VaultProfile>,
}

pub fn get_registry_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .local_data_dir()
        .map_err(|e| format!("Failed to get local data directory: {}", e))?
        .join("secure-vault-manager");
    Ok(app_dir.join("vaults.json"))
}

pub fn load_registry(app: &tauri::AppHandle) -> Result<VaultRegistry, String> {
    let path = get_registry_path(app)?;
    if !path.exists() {
        return Ok(VaultRegistry::default());
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read vaults registry: {}", e))?;
    let registry: VaultRegistry = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse vaults JSON: {}", e))?;
    Ok(registry)
}

pub fn save_registry(app: &tauri::AppHandle, registry: &VaultRegistry) -> Result<(), String> {
    let path = get_registry_path(app)?;
    let json_bytes = serde_json::to_vec(registry)
        .map_err(|e| format!("Failed to serialize vaults registry: {}", e))?;
    write_atomic(&path, &json_bytes)?;
    Ok(())
}
