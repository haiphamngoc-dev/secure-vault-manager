/// Stub command for browser extension pairing and token exchange logic.
#[tauri::command]
pub fn start_pairing() -> Result<String, String> {
    Ok("Pairing stub".to_string())
}
