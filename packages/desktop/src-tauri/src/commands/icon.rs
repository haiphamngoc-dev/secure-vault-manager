use base64::{engine::general_purpose, Engine as _};
use reqwest::header::CONTENT_TYPE;

/// Downloads a website favicon based on the domain name using Google Favicon API
/// and returns it as a base64 encoded data URL.
#[tauri::command]
pub async fn download_favicon(domain: String) -> Result<String, String> {
    let url = format!("https://www.google.com/s2/favicons?domain={}&sz=128", domain);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to download favicon: HTTP {}", response.status()));
    }

    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|val| val.to_str().ok())
        .unwrap_or("image/png")
        .to_string();

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    
    let base64_data = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", content_type, base64_data))
}
