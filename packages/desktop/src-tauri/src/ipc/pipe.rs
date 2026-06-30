#![cfg(windows)]

use tokio::net::windows::named_pipe::ServerOptions;

/// Starts the Windows Named Pipe listener.
pub fn start_named_pipe_listener(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let pipe_name = r"\\.\pipe\secure-vault-manager-ipc";
        let mut is_first = true;

        loop {
            let mut server = match ServerOptions::new()
                .first_pipe_instance(is_first)
                .create(pipe_name)
            {
                Ok(s) => {
                    is_first = false;
                    s
                }
                Err(e) => {
                    eprintln!("Named pipe creation failed: {}", e);
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                    continue;
                }
            };

            // Wait for a client to connect.
            if server.connect().await.is_err() {
                continue;
            }

            // Handle the connection in a separate task.
            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    match super::read_msg(&mut server).await {
                        Ok(Some(buf)) => {
                            let req: super::ProxyRequest = match serde_json::from_slice(&buf) {
                                Ok(r) => r,
                                Err(e) => {
                                    let resp = super::ProxyResponse {
                                        status: "error".to_string(),
                                        data: None,
                                        message: Some(format!("Invalid request JSON: {}", e)),
                                        locked: None,
                                        paired: None,
                                    };
                                    let _ = super::write_msg(&mut server, &serde_json::to_vec(&resp).unwrap()).await;
                                    continue;
                                }
                            };

                            let resp = super::process_request(&app_clone, req).await;
                            let resp_bytes = serde_json::to_vec(&resp).unwrap();
                            if super::write_msg(&mut server, &resp_bytes).await.is_err() {
                                break;
                            }
                        }
                        Ok(None) => break, // EOF
                        Err(e) => {
                            eprintln!("Named pipe stream error: {}", e);
                            break;
                        }
                    }
                }
            });
        }
    });
}
