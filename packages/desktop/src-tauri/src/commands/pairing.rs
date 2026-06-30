/// Command for browser extension pairing and token exchange logic.
#[tauri::command]
pub fn start_pairing(app: tauri::AppHandle) -> Result<String, String> {
    use rand::distributions::Alphanumeric;
    use rand::{thread_rng, Rng};
    let token: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();

    let mut settings = super::settings::get_settings(app.clone()).unwrap_or_default();
    settings.pairing_token = Some(token.clone());
    super::settings::save_settings(app, settings)?;

    Ok(token)
}
