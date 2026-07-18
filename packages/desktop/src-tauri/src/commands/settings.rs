use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use serde::{Deserialize, Serialize};
use crate::core::storage::write_atomic;

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
            chrome_extension_id: None,
            extension_id: None,
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
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read settings file: {}", e))?;
    let settings: AppSettings = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings JSON: {}", e))?;
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

fn get_target_triple() -> &'static str {
    if cfg!(all(target_os = "linux", target_arch = "x86_64")) {
        "x86_64-unknown-linux-gnu"
    } else if cfg!(all(target_os = "linux", target_arch = "aarch64")) {
        "aarch64-unknown-linux-gnu"
    } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
        "x86_64-apple-darwin"
    } else if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        "aarch64-apple-darwin"
    } else if cfg!(all(target_os = "windows", target_arch = "x86_64")) {
        "x86_64-pc-windows-msvc"
    } else if cfg!(all(target_os = "windows", target_arch = "x86")) {
        "i686-pc-windows-msvc"
    } else {
        "unknown"
    }
}

#[tauri::command]
pub fn register_extension_proxy(
    app: tauri::AppHandle,
    browser: String,
    extension_id: String,
) -> Result<(), String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;

    let triple = get_target_triple();
    let ext = if cfg!(windows) { ".exe" } else { "" };
    let proxy_filename = format!("proxy-{}{}", triple, ext);

    // Find source proxy binary path by checking multiple dev/prod candidates
    let candidate_paths = vec![
        // 1. Production / Tauri Resource Dir
        resource_dir.join("binaries").join(&proxy_filename),
        
        // 2. Dev mode: Running from src-tauri folder
        if let Ok(curr) = std::env::current_dir() {
            curr.join("binaries").join(&proxy_filename)
        } else {
            PathBuf::new()
        },
        
        // 3. Dev mode: Running from root workspace
        if let Ok(curr) = std::env::current_dir() {
            curr.join("packages").join("desktop").join("src-tauri").join("binaries").join(&proxy_filename)
        } else {
            PathBuf::new()
        },
        
        // 4. Dev mode: Running from packages/desktop
        if let Ok(curr) = std::env::current_dir() {
            curr.join("src-tauri").join("binaries").join(&proxy_filename)
        } else {
            PathBuf::new()
        },
    ];

    let mut source_path = None;
    for path in candidate_paths {
        if path.exists() && path.is_file() {
            source_path = Some(path);
            break;
        }
    }

    let source_path = match source_path {
        Some(p) => p,
        None => {
            return Err(format!(
                "Proxy binary sidecar not found. Looked at resource dir: {}",
                resource_dir.join("binaries").join(&proxy_filename).display()
            ));
        }
    };

    // Determine home directory for config file output
    let home_dir = std::env::var("HOME")
        .map(PathBuf::from)
        .or_else(|_| {
            #[cfg(windows)]
            {
                std::env::var("USERPROFILE").map(PathBuf::from)
            }
            #[cfg(not(windows))]
            {
                Err(std::env::VarError::NotPresent)
            }
        })
        .map_err(|_| "Could not determine user home directory".to_string())?;

    let browser_lower = browser.to_lowercase();
    let host_name = "com.haiphamngoc_dev.secure_vault_manager_proxy.json";

    if browser_lower == "chrome" || browser_lower == "chromium" {
        let manifest = serde_json::json!({
            "name": "com.haiphamngoc_dev.secure_vault_manager_proxy",
            "description": "Secure Vault Manager Native Messaging Proxy Host",
            "path": source_path.to_string_lossy(),
            "type": "stdio",
            "allowed_origins": [format!("chrome-extension://{}/", extension_id)]
        });
        let manifest_json = serde_json::to_string_pretty(&manifest).unwrap();

        #[cfg(target_os = "linux")]
        {
            let chrome_dir = home_dir.join(".config").join("google-chrome").join("NativeMessagingHosts");
            let chromium_dir = home_dir.join(".config").join("chromium").join("NativeMessagingHosts");

            std::fs::create_dir_all(&chrome_dir).map_err(|e| e.to_string())?;
            std::fs::write(chrome_dir.join(host_name), &manifest_json).map_err(|e| e.to_string())?;

            std::fs::create_dir_all(&chromium_dir).map_err(|e| e.to_string())?;
            std::fs::write(chromium_dir.join(host_name), &manifest_json).map_err(|e| e.to_string())?;
        }

        #[cfg(target_os = "macos")]
        {
            let chrome_dir = home_dir.join("Library").join("Application Support").join("Google").join("Chrome").join("NativeMessagingHosts");
            std::fs::create_dir_all(&chrome_dir).map_err(|e| e.to_string())?;
            std::fs::write(chrome_dir.join(host_name), &manifest_json).map_err(|e| e.to_string())?;
        }

        #[cfg(target_os = "windows")]
        {
            let registry_json_path = source_path.parent().unwrap().join(host_name);
            std::fs::write(&registry_json_path, &manifest_json).map_err(|e| e.to_string())?;
            
            let reg_key = r"HKCU\Software\Google\Chrome\NativeMessagingHosts\com.haiphamngoc_dev.secure_vault_manager_proxy";
            let status = std::process::Command::new("reg")
                .args(&["add", reg_key, "/ve", "/t", "REG_SZ", "/d", &registry_json_path.to_string_lossy(), "/f"])
                .status()
                .map_err(|e| format!("Failed to register Windows registry key for Chrome: {}", e))?;
            if !status.success() {
                return Err("Failed to execute registry add command for Chrome".to_string());
            }
        }
    } else if browser_lower == "firefox" {
        let manifest = serde_json::json!({
            "name": "com.haiphamngoc_dev.secure_vault_manager_proxy",
            "description": "Secure Vault Manager Native Messaging Proxy Host",
            "path": source_path.to_string_lossy(),
            "type": "stdio",
            "allowed_extensions": ["secure-vault-manager-ext@haiphamngoc.dev"]
        });
        let manifest_json = serde_json::to_string_pretty(&manifest).unwrap();

        #[cfg(target_os = "linux")]
        {
            let firefox_dir = home_dir.join(".mozilla").join("native-messaging-hosts");
            std::fs::create_dir_all(&firefox_dir).map_err(|e| e.to_string())?;
            std::fs::write(firefox_dir.join(host_name), &manifest_json).map_err(|e| e.to_string())?;
        }

        #[cfg(target_os = "macos")]
        {
            let firefox_dir = home_dir.join("Library").join("Application Support").join("Mozilla").join("NativeMessagingHosts");
            std::fs::create_dir_all(&firefox_dir).map_err(|e| e.to_string())?;
            std::fs::write(firefox_dir.join(host_name), &manifest_json).map_err(|e| e.to_string())?;
        }

        #[cfg(target_os = "windows")]
        {
            let registry_json_path = source_path.parent().unwrap().join("com.haiphamngoc_dev.secure_vault_manager_proxy_firefox.json");
            std::fs::write(&registry_json_path, &manifest_json).map_err(|e| e.to_string())?;
            
            let reg_key = r"HKCU\Software\Mozilla\NativeMessagingHosts\com.haiphamngoc_dev.secure_vault_manager_proxy";
            let status = std::process::Command::new("reg")
                .args(&["add", reg_key, "/ve", "/t", "REG_SZ", "/d", &registry_json_path.to_string_lossy(), "/f"])
                .status()
                .map_err(|e| format!("Failed to register Windows registry key for Firefox: {}", e))?;
            if !status.success() {
                return Err("Failed to execute registry add command for Firefox".to_string());
            }
        }
    } else {
        return Err(format!("Unsupported browser: {}", browser));
    }

    Ok(())
}
