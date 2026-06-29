/// Command for browser extension pairing and token exchange logic.
#[tauri::command]
pub fn start_pairing() -> Result<String, String> {
    use rand::distributions::Alphanumeric;
    use rand::{thread_rng, Rng};
    let token: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();
    Ok(token)
}
