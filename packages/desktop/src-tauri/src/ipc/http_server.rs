use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::Manager;
use tower_http::cors::{Any, CorsLayer};

use super::{process_request, ProxyRequest, ProxyResponse};

#[derive(Clone)]
struct ServerState {
    app: tauri::AppHandle,
}

#[derive(Debug, Deserialize)]
struct EncryptedHttpRequest {
    ciphertext: String,
    nonce: String,
    pairing_token: Option<String>,
}

#[derive(Debug, Serialize)]
struct EncryptedHttpResponse {
    ciphertext: String,
    nonce: String,
}

/// Derives a 32-byte symmetric key from pairing_token string using SHA-256.
fn derive_pairing_key(pairing_token: &str) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(pairing_token.as_bytes());
    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

/// Encrypts bytes using AES-256-GCM (compatible with WebCrypto API `crypto.subtle`).
fn encrypt_aes_gcm(key: &[u8; 32], plaintext: &[u8]) -> Result<(Vec<u8>, [u8; 12]), String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| format!("AES-GCM encryption failed: {}", e))?;
    let nonce_bytes: [u8; 12] = nonce.into();
    Ok((ciphertext, nonce_bytes))
}

/// Decrypts bytes using AES-256-GCM (compatible with WebCrypto API `crypto.subtle`).
fn decrypt_aes_gcm(key: &[u8; 32], ciphertext: &[u8], nonce: &[u8; 12]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Nonce::from_slice(nonce);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("AES-GCM decryption failed: {}", e))?;
    Ok(plaintext)
}

/// Starts the Local Loopback HTTP Server on 127.0.0.1:12519 (with fallback to 12520, 12521).
pub fn start_local_http_server(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let state = Arc::new(ServerState { app: app.clone() });

        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);

        let router = Router::new()
            .route("/status", get(handle_status))
            .route("/rpc", post(handle_rpc))
            .layer(cors)
            .with_state(state);

        let ports = [12519, 12520, 12521];
        for port in ports {
            let addr = SocketAddr::from(([127, 0, 0, 1], port));
            match tokio::net::TcpListener::bind(addr).await {
                Ok(listener) => {
                    println!("Local HTTP Server listening on http://{}", addr);
                    if let Err(e) = axum::serve(listener, router).await {
                        eprintln!("Local HTTP Server error: {}", e);
                    }
                    return;
                }
                Err(e) => {
                    println!(
                        "Port {} occupied ({}), trying next port...",
                        port, e
                    );
                }
            }
        }
        eprintln!("Failed to bind Local HTTP Server on any fallback port (12519-12521).");
    });
}

/// Public status endpoint (unencrypted)
async fn handle_status(
    State(state): State<Arc<ServerState>>,
) -> impl IntoResponse {
    let app = &state.app;
    let app_state = app.state::<crate::AppState>();

    let locked = app_state.vault_key.lock().unwrap().is_none();
    let paired = true; // Registered system check

    let resp = serde_json::json!({
        "status": "success",
        "locked": locked,
        "paired": paired
    });

    Json(resp)
}

/// Protected RPC endpoint (Encrypted AES-256-GCM Payloads)
async fn handle_rpc(
    State(state): State<Arc<ServerState>>,
    Json(body): Json<EncryptedHttpRequest>,
) -> impl IntoResponse {
    let pairing_token = match body.pairing_token {
        Some(ref t) if !t.is_empty() => t.clone(),
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "status": "error", "message": "Missing pairing_token" })),
            )
                .into_response();
        }
    };

    let key = derive_pairing_key(&pairing_token);

    // Decode base64 ciphertext and nonce
    let ciphertext_bytes = match BASE64.decode(&body.ciphertext) {
        Ok(b) => b,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "status": "error", "message": format!("Invalid ciphertext base64: {}", e) })),
            )
                .into_response();
        }
    };

    let nonce_vec = match BASE64.decode(&body.nonce) {
        Ok(b) if b.len() == 12 => b,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "status": "error", "message": "Invalid nonce base64 or length" })),
            )
                .into_response();
        }
    };

    let mut nonce_bytes = [0u8; 12];
    nonce_bytes.copy_from_slice(&nonce_vec);

    // Decrypt request payload using AES-256-GCM
    let plaintext_bytes = match decrypt_aes_gcm(&key, &ciphertext_bytes, &nonce_bytes) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("AES-GCM Decryption failed for RPC request: {}", e);
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "status": "error", "message": format!("Decryption failed: {}", e) })),
            )
                .into_response();
        }
    };

    // Parse ProxyRequest JSON
    let mut req: ProxyRequest = match serde_json::from_slice(&plaintext_bytes) {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "status": "error", "message": format!("Invalid request payload: {}", e) })),
            )
                .into_response();
        }
    };

    // Ensure pairing_token is present in req
    if req.pairing_token.is_none() {
        req.pairing_token = Some(pairing_token.clone());
    }

    // Handle Proxy Request
    let proxy_resp: ProxyResponse = process_request(&state.app, req).await;

    // Serialize ProxyResponse JSON
    let resp_bytes = match serde_json::to_vec(&proxy_resp) {
        Ok(b) => b,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "status": "error", "message": format!("Response serialization failed: {}", e) })),
            )
                .into_response();
        }
    };

    // Encrypt response payload using AES-256-GCM
    let (enc_resp_bytes, resp_nonce_bytes) = match encrypt_aes_gcm(&key, &resp_bytes) {
        Ok(res) => res,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "status": "error", "message": format!("Response encryption failed: {}", e) })),
            )
                .into_response();
        }
    };

    let enc_http_resp = EncryptedHttpResponse {
        ciphertext: BASE64.encode(enc_resp_bytes),
        nonce: BASE64.encode(resp_nonce_bytes),
    };

    (StatusCode::OK, Json(enc_http_resp)).into_response()
}
