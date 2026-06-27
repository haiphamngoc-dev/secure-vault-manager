// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Secure Vault Manager Desktop Application Launcher
//!
//! This is the entrypoint crate for launching the Tauri application.

/// Launcher entrypoint.
///
/// Delegates control to `secure_vault_manager_lib::run()` to build and run the application.
fn main() {
    secure_vault_manager_lib::run()
}
