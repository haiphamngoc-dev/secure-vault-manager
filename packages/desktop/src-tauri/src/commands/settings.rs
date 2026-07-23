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

    let possible_filenames = vec![
        format!("proxy{}", ext),
        format!("proxy-{}{}", triple, ext),
        format!("secure-vault-manager-proxy{}", ext),
        format!("secure-vault-manager-proxy-{}{}", triple, ext),
    ];

    let mut search_dirs = Vec::new();

    // 1. Directory containing the currently running application executable (e.g. /usr/bin or target/release)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            search_dirs.push(exe_dir.to_path_buf());
        }
    }

    // 2. Executable dir from Tauri path resolver (if available)
    if let Ok(exe_dir) = app.path().executable_dir() {
        if !search_dirs.contains(&exe_dir) {
            search_dirs.push(exe_dir);
        }
    }

    // 3. Linux / System standard binary directories
    #[cfg(target_os = "linux")]
    {
        let usr_bin = PathBuf::from("/usr/bin");
        if !search_dirs.contains(&usr_bin) {
            search_dirs.push(usr_bin);
        }
        let usr_local_bin = PathBuf::from("/usr/local/bin");
        if !search_dirs.contains(&usr_local_bin) {
            search_dirs.push(usr_local_bin);
        }
    }

    // 4. Tauri Resource Directory
    search_dirs.push(resource_dir.clone());
    search_dirs.push(resource_dir.join("binaries"));

    // 5. Current working directory and workspace dev paths
    if let Ok(curr) = std::env::current_dir() {
        search_dirs.push(curr.clone());
        search_dirs.push(curr.join("binaries"));
        search_dirs.push(
            curr.join("packages")
                .join("desktop")
                .join("src-tauri")
                .join("binaries"),
        );
        search_dirs.push(curr.join("src-tauri").join("binaries"));
    }

    let mut source_path = None;
    'outer: for dir in &search_dirs {
        for filename in &possible_filenames {
            let candidate = dir.join(filename);
            if candidate.exists() && candidate.is_file() {
                source_path = Some(candidate);
                break 'outer;
            }
        }
    }

    let source_path = match source_path {
        Some(p) => p,
        None => {
            return Err(format!(
                "Proxy binary sidecar not found. Checked directories: {:?}",
                search_dirs
            ));
        }
    };

    // Ensure executable permissions on Unix systems
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&source_path) {
            let mut permissions = metadata.permissions();
            let mode = permissions.mode();
            if mode & 0o111 != 0o111 {
                permissions.set_mode(mode | 0o755);
                let _ = std::fs::set_permissions(&source_path, permissions);
            }
        }
    }

    // Determine home directory for config file output on Unix systems
    #[cfg(not(target_os = "windows"))]
    let home_dir = std::env::var_os("HOME")
        .map(PathBuf::from)
        .ok_or_else(|| "Could not determine user home directory".to_string())?;

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
            let linux_dirs = vec![
                // Standard Chromium-based browser paths
                home_dir
                    .join(".config")
                    .join("google-chrome")
                    .join("NativeMessagingHosts"),
                home_dir
                    .join(".config")
                    .join("chromium")
                    .join("NativeMessagingHosts"),
                home_dir
                    .join(".config")
                    .join("BraveSoftware")
                    .join("Brave-Browser")
                    .join("NativeMessagingHosts"),
                home_dir
                    .join(".config")
                    .join("microsoft-edge")
                    .join("NativeMessagingHosts"),
                home_dir
                    .join(".config")
                    .join("vivaldi")
                    .join("NativeMessagingHosts"),
                // Flatpak browser paths
                home_dir
                    .join(".var")
                    .join("app")
                    .join("com.google.Chrome")
                    .join("config")
                    .join("google-chrome")
                    .join("NativeMessagingHosts"),
                home_dir
                    .join(".var")
                    .join("app")
                    .join("org.chromium.Chromium")
                    .join("config")
                    .join("chromium")
                    .join("NativeMessagingHosts"),
                home_dir
                    .join(".var")
                    .join("app")
                    .join("com.brave.Browser")
                    .join("config")
                    .join("BraveSoftware")
                    .join("Brave-Browser")
                    .join("NativeMessagingHosts"),
                // Snap Chrome path
                home_dir
                    .join("snap")
                    .join("google-chrome")
                    .join("current")
                    .join(".config")
                    .join("google-chrome")
                    .join("NativeMessagingHosts"),
            ];

            for dir in linux_dirs {
                if std::fs::create_dir_all(&dir).is_ok() {
                    #[cfg(unix)]
                    {
                        use std::os::unix::fs::PermissionsExt;
                        let _ = std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o755));
                    }
                    let file_path = dir.join(host_name);
                    if std::fs::write(&file_path, &manifest_json).is_ok() {
                        #[cfg(unix)]
                        {
                            use std::os::unix::fs::PermissionsExt;
                            let _ = std::fs::set_permissions(&file_path, std::fs::Permissions::from_mode(0o644));
                        }
                    }
                }
            }
        }

        #[cfg(target_os = "macos")]
        {
            let chrome_dir = home_dir
                .join("Library")
                .join("Application Support")
                .join("Google")
                .join("Chrome")
                .join("NativeMessagingHosts");
            std::fs::create_dir_all(&chrome_dir).map_err(|e| e.to_string())?;
            std::fs::write(chrome_dir.join(host_name), &manifest_json)
                .map_err(|e| e.to_string())?;
        }

        #[cfg(target_os = "windows")]
        {
            let registry_json_path = source_path.parent().unwrap().join(host_name);
            std::fs::write(&registry_json_path, &manifest_json).map_err(|e| e.to_string())?;

            let reg_key = r"HKCU\Software\Google\Chrome\NativeMessagingHosts\com.haiphamngoc_dev.secure_vault_manager_proxy";
            let status = std::process::Command::new("reg")
                .args(&[
                    "add",
                    reg_key,
                    "/ve",
                    "/t",
                    "REG_SZ",
                    "/d",
                    &registry_json_path.to_string_lossy(),
                    "/f",
                ])
                .status()
                .map_err(|e| {
                    format!("Failed to register Windows registry key for Chrome: {}", e)
                })?;
            if !status.success() {
                return Err("Failed to execute registry add command for Chrome".to_string());
            }
        }
    } else if browser_lower == "firefox" {
        let mut allowed = vec!["secure-vault-manager-ext@haiphamngoc.dev".to_string()];
        if !extension_id.trim().is_empty() && !allowed.contains(&extension_id) {
            allowed.push(extension_id.trim().to_string());
        }

        let manifest = serde_json::json!({
            "name": "com.haiphamngoc_dev.secure_vault_manager_proxy",
            "description": "Secure Vault Manager Native Messaging Proxy Host",
            "path": source_path.to_string_lossy(),
            "type": "stdio",
            "allowed_extensions": allowed
        });
        let manifest_json = serde_json::to_string_pretty(&manifest).unwrap();

        #[cfg(target_os = "linux")]
        {
            let firefox_dirs = vec![
                home_dir.join(".mozilla").join("native-messaging-hosts"),
                home_dir.join(".mozilla").join("NativeMessagingHosts"),
                home_dir
                    .join(".var")
                    .join("app")
                    .join("org.mozilla.firefox")
                    .join(".mozilla")
                    .join("native-messaging-hosts"),
                home_dir
                    .join(".var")
                    .join("app")
                    .join("org.mozilla.firefox")
                    .join(".mozilla")
                    .join("NativeMessagingHosts"),
                home_dir
                    .join("snap")
                    .join("firefox")
                    .join("common")
                    .join(".mozilla")
                    .join("native-messaging-hosts"),
                home_dir
                    .join("snap")
                    .join("firefox")
                    .join("common")
                    .join(".mozilla")
                    .join("NativeMessagingHosts"),
                home_dir
                    .join("snap")
                    .join("firefox")
                    .join("current")
                    .join(".mozilla")
                    .join("native-messaging-hosts"),
                home_dir
                    .join("snap")
                    .join("firefox")
                    .join("current")
                    .join(".mozilla")
                    .join("NativeMessagingHosts"),
            ];

            for dir in firefox_dirs {
                if std::fs::create_dir_all(&dir).is_ok() {
                    #[cfg(unix)]
                    {
                        use std::os::unix::fs::PermissionsExt;
                        let _ = std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o755));
                    }
                    let file_path = dir.join(host_name);
                    if std::fs::write(&file_path, &manifest_json).is_ok() {
                        #[cfg(unix)]
                        {
                            use std::os::unix::fs::PermissionsExt;
                            let _ = std::fs::set_permissions(&file_path, std::fs::Permissions::from_mode(0o644));
                        }
                    }
                }
            }
        }

        #[cfg(target_os = "macos")]
        {
            let firefox_dir = home_dir
                .join("Library")
                .join("Application Support")
                .join("Mozilla")
                .join("NativeMessagingHosts");
            std::fs::create_dir_all(&firefox_dir).map_err(|e| e.to_string())?;
            std::fs::write(firefox_dir.join(host_name), &manifest_json)
                .map_err(|e| e.to_string())?;
        }

        #[cfg(target_os = "windows")]
        {
            let registry_json_path = source_path
                .parent()
                .unwrap()
                .join("com.haiphamngoc_dev.secure_vault_manager_proxy_firefox.json");
            std::fs::write(&registry_json_path, &manifest_json).map_err(|e| e.to_string())?;

            let reg_key = r"HKCU\Software\Mozilla\NativeMessagingHosts\com.haiphamngoc_dev.secure_vault_manager_proxy";
            let status = std::process::Command::new("reg")
                .args(&[
                    "add",
                    reg_key,
                    "/ve",
                    "/t",
                    "REG_SZ",
                    "/d",
                    &registry_json_path.to_string_lossy(),
                    "/f",
                ])
                .status()
                .map_err(|e| {
                    format!("Failed to register Windows registry key for Firefox: {}", e)
                })?;
            if !status.success() {
                return Err("Failed to execute registry add command for Firefox".to_string());
            }
        }
    } else {
        return Err(format!("Unsupported browser: {}", browser));
    }

    Ok(())
}
