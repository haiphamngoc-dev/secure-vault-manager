//! Secure Vault Manager Core Library
//!
//! This library contains the core application state, Tauri commands,
//! event listeners, and tray menu configuration for the Secure Vault Manager.

use std::sync::Mutex;

pub mod commands;
pub mod core;
pub mod ipc;

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

/// Supported application language locales.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AppLang {
    /// Vietnamese locale.
    Vi,
    /// English locale.
    En,
}

impl From<&str> for AppLang {
    /// Maps a string slice locale representation to the AppLang enum.
    /// Defaults to English if unspecified or unsupported.
    fn from(s: &str) -> Self {
        match s {
            "vi" => AppLang::Vi,
            _ => AppLang::En,
        }
    }
}

/// Represents the visual visibility status of the application main window.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WindowStatus {
    /// Window is visible on screen.
    Visible,
    /// Window is hidden (minimized to system tray).
    Hidden,
}

/// Global application state managed by Tauri and accessible across commands.
pub struct AppState {
    /// The encryption key for the secure vault, wrapped in a Mutex for thread-safety.
    /// Holds `None` when locked/uninitialized.
    pub vault_key: Mutex<Option<[u8; 32]>>,
    /// The salt used to derive the encryption key, wrapped in a Mutex.
    /// Holds `None` when locked/uninitialized.
    pub vault_salt: Mutex<Option<[u8; 16]>>,
    /// The currently selected application language/locale.
    pub lang: Mutex<AppLang>,
    /// Track whether the main window is currently visible or hidden.
    pub is_visible: Mutex<bool>,
    /// Track which vault file is currently unlocked.
    pub current_vault_file: Mutex<Option<String>>,
}

/// Updates the system tray menu items dynamically.
///
/// Changes the visibility toggle text based on the current window visibility
/// state and the application language (Vietnamese or English).
///
/// # Arguments
///
/// * `app` - A reference to the Tauri application handle.
fn update_tray_menu(app: &tauri::AppHandle) {
    if let Some(tray) = app.tray_by_id("main") {
        let state = app.state::<AppState>();
        let lang = *state.lang.lock().unwrap();
        let is_visible = *state.is_visible.lock().unwrap();

        let toggle_text = if is_visible {
            if lang == AppLang::Vi {
                "Ẩn cửa sổ"
            } else {
                "Hide Window"
            }
        } else {
            if lang == AppLang::Vi {
                "Hiện cửa sổ"
            } else {
                "Show Window"
            }
        };

        let quit_text = if lang == AppLang::Vi {
            "Thoát"
        } else {
            "Exit"
        };

        let toggle_item =
            MenuItem::with_id(app, "toggle_visibility", toggle_text, true, None::<&str>).unwrap();
        let quit_item = MenuItem::with_id(app, "quit", quit_text, true, None::<&str>).unwrap();

        let menu = Menu::with_items(app, &[&toggle_item, &quit_item]).unwrap();
        let _ = tray.set_menu(Some(menu));
    }
}

/// Toggles the visibility of the main window, updates state and refreshes the tray menu.
fn toggle_window_visibility(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let state = app.state::<AppState>();
        let mut is_visible_guard = state.is_visible.lock().unwrap();
        if *is_visible_guard {
            let _ = window.hide();
            *is_visible_guard = false;

            // Lock vault and emit event on window hide
            *state.vault_key.lock().unwrap() = None;
            *state.vault_salt.lock().unwrap() = None;
            let _ = window.emit("vault-locked", ());
        } else {
            let _ = window.show();
            let _ = window.set_focus();
            *is_visible_guard = true;
        }
        drop(is_visible_guard);
        update_tray_menu(app);
    }
}

pub(crate) fn sync_tray_menu_lang(app: &tauri::AppHandle, lang: &str) {
    let state = app.state::<AppState>();
    *state.lang.lock().unwrap() = AppLang::from(lang);
    update_tray_menu(app);
}

/// Command to change the system tray menu language.
///
/// Updates the application state language preference and refreshes the tray menu.
///
/// # Arguments
///
/// * `app` - The Tauri application handle.
/// * `lang` - A string slice indicating the language locale (e.g. "vi" or "en").
#[tauri::command]
fn set_tray_menu_lang(app: tauri::AppHandle, lang: &str) {
    sync_tray_menu_lang(&app, lang);
}

/// Command to terminate the application.
///
/// Safely shuts down the Tauri app with an exit code of 0.
///
/// # Arguments
///
/// * `app` - The Tauri application handle.
#[tauri::command]
async fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// Payload emitted when a second instance of the application is launched.
/// Contains command line arguments and the working directory.
#[derive(Clone, serde::Serialize)]
struct SingleInstancePayload {
    /// Command line arguments passed to the second instance.
    args: Vec<String>,
    /// Working directory of the second instance.
    cwd: String,
}

/// The main entry point to run the Tauri application.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // Single instance plugin to prevent multiple instances from running concurrently.
        // Restores and focuses the existing window when a new instance is launched.
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            let _ = app.emit("single-instance", SingleInstancePayload { args: argv, cwd });
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();

                let state = app.state::<AppState>();
                *state.is_visible.lock().unwrap() = true;
                update_tray_menu(app);
            }
        }))
        .manage(AppState {
            vault_key: std::sync::Mutex::new(None),
            vault_salt: std::sync::Mutex::new(None),
            lang: std::sync::Mutex::new(AppLang::Vi),
            is_visible: std::sync::Mutex::new(true),
            current_vault_file: std::sync::Mutex::new(None),
        })
        .setup(|app| {
            // Load icon from default window icon
            let icon = app
                .default_window_icon()
                .cloned()
                .expect("Failed to get default window icon");

            // Build system tray icon with action menus
            let _tray = TrayIconBuilder::with_id("main")
                .icon(icon)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle_visibility" => {
                        toggle_window_visibility(app);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window_visibility(tray.app_handle());
                    }
                })
                .build(app)?;

            // Load initial settings to update tray language
            let app_handle = app.app_handle();
            if let Ok(settings) = commands::settings::get_settings(app_handle.clone()) {
                sync_tray_menu_lang(app_handle, &settings.lang);
            }

            // Populate initial tray menu
            update_tray_menu(app.app_handle());

            Ok(())
        })
        // Global listener for window events (e.g. intercepts close to minimize to tray)
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let minimize = commands::settings::get_settings(window.app_handle().clone())
                    .map(|s| s.minimize_to_tray)
                    .unwrap_or(true);

                if minimize {
                    let _ = window.hide();
                    api.prevent_close();

                    let state = window.state::<AppState>();
                    *state.is_visible.lock().unwrap() = false;

                    // Lock vault and emit event on window close
                    *state.vault_key.lock().unwrap() = None;
                    *state.vault_salt.lock().unwrap() = None;
                    *state.current_vault_file.lock().unwrap() = None;
                    let _ = window.emit("vault-locked", ());

                    update_tray_menu(window.app_handle());
                } else {
                    window.app_handle().exit(0);
                }
            }
        })
        // Custom command handlers callable from frontend React app
        .invoke_handler(tauri::generate_handler![
            set_tray_menu_lang,
            exit_app,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::vault::check_vault_initialized,
            commands::vault::check_is_unlocked,
            commands::vault::initialize_vault,
            commands::vault::unlock_vault,
            commands::vault::lock_vault,
            commands::vault::load_items,
            commands::vault::save_items,
            commands::vault::get_vaults,
            commands::vault::rename_vault,
            commands::vault::set_default_vault,
            commands::vault::delete_vault,
            commands::vault::get_current_vault_id,
            commands::pairing::start_pairing,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
