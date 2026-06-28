//! Build script for the secure-vault-manager Tauri application.
//!
//! This script compiles resource files and handles application metadata configuration.

/// Build script entrypoint.
///
/// Triggers the Tauri build system to compile resources.
fn main() {
    tauri_build::build()
}
