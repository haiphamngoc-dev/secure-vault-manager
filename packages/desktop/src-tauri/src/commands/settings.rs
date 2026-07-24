use crate::core::storage::write_atomic;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

pub const DEFAULT_CHROME_EXTENSION_ID: &str = "pnahlaohpcfkgjkdhhfdkapdbgjchdfe";

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub lang: String,
    pub auto_lock_interval: String,
    pub chrome_extension_id: Option<String>,
    #[serde(alias = "extension_id")]
    pub extension_id: Option<String>,
    #[serde(default = "default_true")]
    pub minimize_to_tray: bool,
    #[serde(default)]
    pub autostart: bool,
    pub pairing_token: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            lang: "vi".to_string(),
            auto_lock_interval: "15m".to_string(),
            chrome_extension_id: Some(DEFAULT_CHROME_EXTENSION_ID.to_string()),
            extension_id: Some(DEFAULT_CHROME_EXTENSION_ID.to_string()),
            minimize_to_tray: true,
            autostart: false,
            pairing_token: None,
        }
    }
}

pub fn get_settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .local_data_dir()
        .map_err(|e| format!("Failed to get local data directory: {}", e))?
        .join("secure-vault-manager");
    Ok(app_dir.join("settings.json"))
}

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let path = get_settings_path(&app)?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read settings file: {}", e))?;
    let mut settings: AppSettings = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings JSON: {}", e))?;

    if settings.chrome_extension_id.as_deref().unwrap_or("").trim().is_empty() {
        settings.chrome_extension_id = Some(DEFAULT_CHROME_EXTENSION_ID.to_string());
    }

    Ok(settings)
}

#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = get_settings_path(&app)?;
    let json_bytes = serde_json::to_vec(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    write_atomic(&path, &json_bytes)?;

    // Synchronize language with tray menu dynamically
    crate::sync_tray_menu_lang(&app, &settings.lang);

    // Synchronize autostart configuration with system
    use tauri_plugin_autostart::ManagerExt;
    let autostart_manager = app.autolaunch();
    if settings.autostart {
        let _ = autostart_manager.enable();
    } else {
        let _ = autostart_manager.disable();
    }

    Ok(())
}


