use tauri::Manager;
use tokio::net::UnixListener;
use super::{read_msg, write_msg, process_request, ProxyRequest};

pub fn get_socket_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_dir = app
        .path()
        .local_data_dir()
        .map_err(|e| format!("Failed to get local data directory: {}", e))?
        .join("secure-vault-manager");
    Ok(app_dir.join("secure-vault-manager.sock"))
}

/// Starts the Unix Domain Socket listener on Linux/macOS.
pub fn start_unix_socket_listener(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let socket_path = match get_socket_path(&app) {
            Ok(path) => path,
            Err(e) => {
                eprintln!("UDS IPC listener error getting socket path: {}", e);
                return;
            }
        };

        if let Some(parent) = socket_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        if socket_path.exists() {
            let _ = std::fs::remove_file(&socket_path);
        }

        let listener = match UnixListener::bind(&socket_path) {
            Ok(l) => l,
            Err(e) => {
                eprintln!("UDS IPC listener failed to bind to {:?}: {}", socket_path, e);
                return;
            }
        };

        println!("UDS IPC listener started at {:?}", socket_path);

        loop {
            match listener.accept().await {
                Ok((mut stream, _)) => {
                    let app_clone = app.clone();
                    tauri::async_runtime::spawn(async move {
                        loop {
                            match read_msg(&mut stream).await {
                                Ok(Some(buf)) => {
                                    let req: ProxyRequest = match serde_json::from_slice(&buf) {
                                        Ok(r) => r,
                                        Err(e) => {
                                            let resp = super::ProxyResponse {
                                                status: "error".to_string(),
                                                data: None,
                                                message: Some(format!("Invalid request JSON: {}", e)),
                                                locked: None,
                                                paired: None,
                                            };
                                            let _ = write_msg(&mut stream, &serde_json::to_vec(&resp).unwrap()).await;
                                            continue;
                                        }
                                    };

                                    let resp = process_request(&app_clone, req).await;
                                    let resp_bytes = serde_json::to_vec(&resp).unwrap();
                                    if write_msg(&mut stream, &resp_bytes).await.is_err() {
                                        break;
                                    }
                                }
                                Ok(None) => break, // EOF
                                Err(e) => {
                                    eprintln!("UDS IPC stream error: {}", e);
                                    break;
                                }
                            }
                        }
                    });
                }
                Err(e) => {
                    eprintln!("UDS IPC listener accept error: {}", e);
                }
            }
        }
    });
}
