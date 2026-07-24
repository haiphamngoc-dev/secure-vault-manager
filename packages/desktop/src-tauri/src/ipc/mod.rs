#[cfg(windows)]
pub mod pipe;
#[cfg(not(windows))]
pub mod socket;
pub mod http_server;


use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

#[derive(Debug, Deserialize)]
pub struct ProxyRequest {
    pub action: String,
    pub domain: Option<String>,
    pub pairing_token: Option<String>,
    pub password: Option<String>,
    pub username: Option<String>,
    pub vault_id: Option<String>,
    pub totp_secret: Option<String>,
    pub is_new_account: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ProxyResponse {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Vec<ProxyCredential>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locked: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paired: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ProxyCredential {
    pub id: String,
    pub username: Option<String>,
    pub password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub totp_secret: Option<String>,
}

pub async fn read_msg<R: tokio::io::AsyncReadExt + Unpin>(
    reader: &mut R,
) -> Result<Option<Vec<u8>>, String> {
    let mut len_bytes = [0u8; 4];
    match reader.read_exact(&mut len_bytes).await {
        Ok(_) => {}
        Err(ref e) if e.kind() == std::io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e.to_string()),
    }
    let len = u32::from_ne_bytes(len_bytes) as usize;
    let mut buf = vec![0u8; len];
    reader
        .read_exact(&mut buf)
        .await
        .map_err(|e| e.to_string())?;
    Ok(Some(buf))
}

pub async fn write_msg<W: tokio::io::AsyncWriteExt + Unpin>(
    writer: &mut W,
    msg: &[u8],
) -> Result<(), String> {
    let len = msg.len() as u32;
    writer
        .write_all(&len.to_ne_bytes())
        .await
        .map_err(|e| e.to_string())?;
    writer.write_all(msg).await.map_err(|e| e.to_string())?;
    writer.flush().await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn process_request(app: &tauri::AppHandle, req: ProxyRequest) -> ProxyResponse {
    let settings = match crate::commands::settings::get_settings(app.clone()) {
        Ok(s) => s,
        Err(e) => {
            return ProxyResponse {
                status: "error".to_string(),
                data: None,
                message: Some(format!("Failed to read settings: {}", e)),
                locked: None,
                paired: None,
            }
        }
    };

    let pairing_token = match settings.pairing_token {
        Some(t) => t,
        None => {
            return ProxyResponse {
                status: "error".to_string(),
                data: None,
                message: Some("App is not paired with any extension.".to_string()),
                locked: None,
                paired: Some(false),
            }
        }
    };

    if req.pairing_token.as_deref() != Some(&pairing_token) {
        return ProxyResponse {
            status: "error".to_string(),
            data: None,
            message: Some("Invalid pairing token.".to_string()),
            locked: None,
            paired: Some(false),
        };
    }

    match req.action.as_str() {
        "check_status" => {
            let state = app.state::<crate::AppState>();
            let unlocked = state.vault_key.lock().unwrap().is_some();
            ProxyResponse {
                status: "success".to_string(),
                data: None,
                message: None,
                locked: Some(!unlocked),
                paired: Some(true),
            }
        }
        "unlock_vault" => {
            let password = match req.password.as_deref() {
                Some(p) => p,
                None => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("Password is required.".to_string()),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };

            let registry = match crate::core::vault_registry::load_registry(app) {
                Ok(r) => r,
                Err(e) => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some(format!("Failed to load registry: {}", e)),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };

            let vault_id = req
                .vault_id
                .clone()
                .or(registry.default_vault_id)
                .or_else(|| registry.vaults.first().map(|v| v.id.clone()));

            let vault_id = match vault_id {
                Some(id) => id,
                None => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("No vaults configured in desktop app.".to_string()),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };

            let profile = match registry.vaults.iter().find(|v| v.id == vault_id) {
                Some(p) => p,
                None => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("Vault profile not found.".to_string()),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };

            match crate::core::storage::unlock_and_load_vault(app, password, &profile.file_name) {
                Ok((_vault, key, salt)) => {
                    let state = app.state::<crate::AppState>();
                    *state.vault_key.lock().unwrap() = Some(key);
                    *state.vault_salt.lock().unwrap() = Some(salt);
                    *state.current_vault_file.lock().unwrap() = Some(profile.file_name.clone());

                    // Broadcast unlock event to the desktop React frontend
                    let _ = app.emit("vault-unlocked", ());

                    ProxyResponse {
                        status: "success".to_string(),
                        data: None,
                        message: Some("Vault unlocked successfully.".to_string()),
                        locked: Some(false),
                        paired: Some(true),
                    }
                }
                Err(e) => ProxyResponse {
                    status: "error".to_string(),
                    data: None,
                    message: Some(format!("Failed to unlock vault: {}", e)),
                    locked: Some(true),
                    paired: Some(true),
                },
            }
        }
        "trigger_biometrics" => {
            println!("Biometrics request received from extension. (Mocking authentication...)");
            ProxyResponse {
                status: "success".to_string(),
                data: None,
                message: Some("Biometrics authentication successful (Mock).".to_string()),
                locked: Some(false),
                paired: Some(true),
            }
        }
        "get_credentials" => {
            let state = app.state::<crate::AppState>();
            let key_guard = state.vault_key.lock().unwrap();
            let key = match key_guard.as_ref() {
                Some(k) => *k,
                None => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("Vault is locked.".to_string()),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };
            drop(key_guard);

            let file_guard = state.current_vault_file.lock().unwrap();
            let file_name = match file_guard.as_ref() {
                Some(f) => f.clone(),
                None => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("No vault selected.".to_string()),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };
            drop(file_guard);

            let vault = match crate::core::storage::load_vault_with_key(app, &key, &file_name) {
                Ok(v) => v,
                Err(e) => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some(format!("Failed to load vault: {}", e)),
                        locked: None,
                        paired: None,
                    }
                }
            };

            let domain = req.domain.unwrap_or_default().to_lowercase();
            if domain.is_empty() {
                return ProxyResponse {
                    status: "success".to_string(),
                    data: Some(Vec::new()),
                    message: None,
                    locked: Some(false),
                    paired: Some(true),
                };
            }

            let matching: Vec<ProxyCredential> = vault
                .items
                .into_iter()
                .filter(|item| {
                    if let Some(ref url) = item.url {
                        url.to_lowercase().contains(&domain)
                    } else {
                        false
                    }
                })
                .map(|item| {
                    let totp_secret = item.custom_fields.as_ref().and_then(|fields| {
                        fields.iter().find_map(|f| {
                            let label_lower = f.label.to_lowercase();
                            if label_lower.contains("totp")
                                || label_lower.contains("one-time password")
                                || f.value.starts_with("otpauth://")
                            {
                                Some(f.value.clone())
                            } else {
                                None
                            }
                        })
                    });
                    ProxyCredential {
                        id: item.id,
                        username: item.username,
                        password: item.password,
                        totp_secret,
                    }
                })
                .collect();

            ProxyResponse {
                status: "success".to_string(),
                data: Some(matching),
                message: None,
                locked: Some(false),
                paired: Some(true),
            }
        }
        "save_credential" => {
            let state = app.state::<crate::AppState>();
            let key_guard = state.vault_key.lock().unwrap();
            let key = match key_guard.as_ref() {
                Some(k) => *k,
                None => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("Vault is locked.".to_string()),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };
            drop(key_guard);

            let salt_guard = state.vault_salt.lock().unwrap();
            let salt = match salt_guard.as_ref() {
                Some(s) => *s,
                None => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("Vault salt missing.".to_string()),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };
            drop(salt_guard);

            let file_guard = state.current_vault_file.lock().unwrap();
            let file_name = match file_guard.as_ref() {
                Some(f) => f.clone(),
                None => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("No vault selected.".to_string()),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };
            drop(file_guard);

            let mut vault = match crate::core::storage::load_vault_with_key(app, &key, &file_name) {
                Ok(v) => v,
                Err(e) => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some(format!("Failed to load vault: {}", e)),
                        locked: None,
                        paired: None,
                    }
                }
            };

            let domain = req.domain.unwrap_or_default();
            let username = req.username;
            let password = req.password;

            if domain.is_empty() {
                return ProxyResponse {
                    status: "error".to_string(),
                    data: None,
                    message: Some("Domain is required to save credential.".to_string()),
                    locked: Some(false),
                    paired: Some(true),
                };
            }

            let domain_lower = domain.to_lowercase();
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();

            let existing_item = vault.items.iter_mut().find(|i| {
                let matches_url = i.url.as_ref().map(|u| u.to_lowercase().contains(&domain_lower)).unwrap_or(false);
                let matches_title = i.title.to_lowercase().contains(&domain_lower);
                let matches_user = username.is_none() || i.username == username;
                (matches_url || matches_title) && matches_user
            });

            if let Some(item) = existing_item {
                if let Some(p) = password {
                    item.password = Some(p);
                }
                item.updated_at = now;
            } else {
                let new_id = uuid::Uuid::new_v4().to_string();
                let new_item = crate::core::vault::VaultItem {
                    id: new_id,
                    title: domain.clone(),
                    username,
                    password,
                    url: Some(format!("https://{}", domain)),
                    notes: None,
                    category: Some("Web logins".to_string()),
                    updated_at: now,
                    custom_fields: None,
                    tags: None,
                    icon: None,
                };
                vault.items.push(new_item);
            }

            if let Err(e) = crate::core::storage::save_existing_vault(app, &key, &salt, &vault, &file_name) {
                return ProxyResponse {
                    status: "error".to_string(),
                    data: None,
                    message: Some(format!("Failed to save vault: {}", e)),
                    locked: Some(false),
                    paired: Some(true),
                };
            }

            let _ = app.emit("vault_updated", ());

            ProxyResponse {
                status: "success".to_string(),
                data: None,
                message: Some("Credential saved successfully.".to_string()),
                locked: Some(false),
                paired: Some(true),
            }
        }
        "update_totp" => {
            let state = app.state::<crate::AppState>();
            let key_guard = state.vault_key.lock().unwrap();
            let key = match key_guard.as_ref() {
                Some(k) => *k,
                None => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("Vault is locked.".to_string()),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };
            drop(key_guard);

            let salt_guard = state.vault_salt.lock().unwrap();
            let salt = match salt_guard.as_ref() {
                Some(s) => *s,
                None => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("Vault salt missing.".to_string()),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };
            drop(salt_guard);

            let file_guard = state.current_vault_file.lock().unwrap();
            let file_name = match file_guard.as_ref() {
                Some(f) => f.clone(),
                None => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("No vault selected.".to_string()),
                        locked: Some(true),
                        paired: Some(true),
                    }
                }
            };
            drop(file_guard);

            let mut vault = match crate::core::storage::load_vault_with_key(app, &key, &file_name) {
                Ok(v) => v,
                Err(e) => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some(format!("Failed to load vault: {}", e)),
                        locked: None,
                        paired: None,
                    }
                }
            };

            let domain = req.domain.unwrap_or_default().to_lowercase();
            let totp_secret = match req.totp_secret {
                Some(s) if !s.is_empty() => s,
                _ => {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some("TOTP secret is required.".to_string()),
                        locked: Some(false),
                        paired: Some(true),
                    }
                }
            };

            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();

            let target_item = vault.items.iter_mut().find(|i| {
                let matches_url = i.url.as_ref().map(|u| u.to_lowercase().contains(&domain)).unwrap_or(false);
                let matches_title = i.title.to_lowercase().contains(&domain);
                matches_url || matches_title
            });

            if let Some(item) = target_item {
                let fields = item.custom_fields.get_or_insert_with(Vec::new);
                if let Some(totp_field) = fields.iter_mut().find(|f| f.label.to_lowercase().contains("totp") || f.label.to_lowercase().contains("one-time password")) {
                    totp_field.value = totp_secret;
                } else {
                    fields.push(crate::core::vault::CustomField {
                        id: uuid::Uuid::new_v4().to_string(),
                        label: "one-time password".to_string(),
                        value: totp_secret,
                        r#type: "concealed".to_string(),
                        section: Some("Security".to_string()),
                    });
                }
                item.updated_at = now;

                if let Err(e) = crate::core::storage::save_existing_vault(app, &key, &salt, &vault, &file_name) {
                    return ProxyResponse {
                        status: "error".to_string(),
                        data: None,
                        message: Some(format!("Failed to save vault: {}", e)),
                        locked: Some(false),
                        paired: Some(true),
                    };
                }

                let _ = app.emit("vault_updated", ());

                ProxyResponse {
                    status: "success".to_string(),
                    data: None,
                    message: Some("TOTP secret added to item.".to_string()),
                    locked: Some(false),
                    paired: Some(true),
                }
            } else {
                ProxyResponse {
                    status: "error".to_string(),
                    data: None,
                    message: Some(format!("No credential item found for domain '{}'", domain)),
                    locked: Some(false),
                    paired: Some(true),
                }
            }
        }
        _ => ProxyResponse {
            status: "error".to_string(),
            data: None,
            message: Some(format!("Unknown action: {}", req.action)),
            locked: None,
            paired: None,
        },
    }
}
