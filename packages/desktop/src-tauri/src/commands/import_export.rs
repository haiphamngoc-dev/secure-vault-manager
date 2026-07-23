use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use tauri::State;
use zip::ZipArchive;

use crate::core::vault::{CustomField, VaultItem};
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreview {
    pub total_items: usize,
    pub categories_summary: HashMap<String, usize>,
    pub items: Vec<VaultItem>,
    pub duplicate_count: usize,
    pub duplicate_indices: Vec<usize>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResultSummary {
    pub added_count: usize,
    pub overwritten_count: usize,
    pub skipped_count: usize,
    pub total_processed: usize,
}

/// Helper to check if two items are duplicates (matching title and username/url)
fn is_duplicate(item: &VaultItem, existing: &[VaultItem]) -> bool {
    let title_lower = item.title.trim().to_lowercase();
    let user_lower = item.username.as_deref().unwrap_or("").trim().to_lowercase();
    let url_lower = item.url.as_deref().unwrap_or("").trim().to_lowercase();

    existing.iter().any(|ex| {
        let ex_title = ex.title.trim().to_lowercase();
        if ex_title != title_lower {
            return false;
        }

        let ex_user = ex.username.as_deref().unwrap_or("").trim().to_lowercase();
        let ex_url = ex.url.as_deref().unwrap_or("").trim().to_lowercase();

        if !user_lower.is_empty() && !ex_user.is_empty() {
            return user_lower == ex_user;
        }
        if !url_lower.is_empty() && !ex_url.is_empty() {
            return url_lower == ex_url;
        }

        // If title matches and both username/url are empty in one or both
        user_lower == ex_user && url_lower == ex_url
    })
}

/// Helper to build `ImportPreview` from parsed items and existing vault items
fn build_import_preview(items: Vec<VaultItem>, existing: &[VaultItem]) -> ImportPreview {
    let mut categories_summary: HashMap<String, usize> = HashMap::new();
    let mut duplicate_count = 0;
    let mut duplicate_indices = Vec::new();
    let mut warnings = Vec::new();

    for (idx, item) in items.iter().enumerate() {
        let cat = item
            .category
            .clone()
            .unwrap_or_else(|| "Login".to_string());
        *categories_summary.entry(cat).or_insert(0) += 1;

        if is_duplicate(item, existing) {
            duplicate_count += 1;
            duplicate_indices.push(idx);
        }
    }

    if duplicate_count > 0 {
        warnings.push(format!(
            "Phát hiện {} mục có vẻ trùng lặp với dữ liệu hiện tại trong Vault.",
            duplicate_count
        ));
    }

    ImportPreview {
        total_items: items.len(),
        categories_summary,
        items,
        duplicate_count,
        duplicate_indices,
        warnings,
    }
}

/// Parse a 1Password `.1pux` file from byte array
#[tauri::command]
pub fn parse_1pux_bytes(
    bytes: Vec<u8>,
    existing_items: Option<Vec<VaultItem>>,
) -> Result<ImportPreview, String> {
    let cursor = std::io::Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor).map_err(|e| format!("File .1pux không đúng định dạng nén ZIP: {}", e))?;

    let mut export_data_content = String::new();
    let mut found = false;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Lỗi đọc mục trong zip: {}", e))?;
        if entry.name() == "export.data" {
            entry
                .read_to_string(&mut export_data_content)
                .map_err(|e| format!("Lỗi đọc file export.data trong zip: {}", e))?;
            found = true;
            break;
        }
    }

    if !found {
        return Err("Không tìm thấy dữ liệu export.data trong file .1pux.".to_string());
    }

    let json_val: serde_json::Value = serde_json::from_str(&export_data_content)
        .map_err(|e| format!("Lỗi phân tích cú pháp JSON export.data: {}", e))?;

    let mut parsed_items = Vec::new();
    let current_timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    if let Some(accounts) = json_val.get("accounts").and_then(|a| a.as_array()) {
        for acc in accounts {
            if let Some(vaults) = acc.get("vaults").and_then(|v| v.as_array()) {
                for vault in vaults {
                    if let Some(items) = vault.get("items").and_then(|i| i.as_array()) {
                        for item in items {
                            let item_uuid = item
                                .get("uuid")
                                .and_then(|u| u.as_str())
                                .unwrap_or("")
                                .to_string();
                            let item_id = if item_uuid.is_empty() {
                                format!("1pux-{}", rand::random::<u32>())
                            } else {
                                item_uuid
                            };

                            let overview = item.get("overview");
                            let details = item.get("details");

                            let title = overview
                                .and_then(|o| o.get("title"))
                                .and_then(|t| t.as_str())
                                .unwrap_or("Untitled")
                                .to_string();

                            let mut url = overview
                                .and_then(|o| o.get("url"))
                                .and_then(|u| u.as_str())
                                .map(|s| s.to_string());

                            if url.is_none() {
                                if let Some(urls) = overview
                                    .and_then(|o| o.get("urls"))
                                    .and_then(|u| u.as_array())
                                {
                                    if let Some(first_url) = urls.first() {
                                        url = first_url
                                            .get("url")
                                            .or_else(|| first_url.get("u"))
                                            .and_then(|s| s.as_str())
                                            .map(|s| s.to_string());
                                    }
                                }
                            }

                            let tags = overview
                                .and_then(|o| o.get("tags"))
                                .and_then(|t| t.as_array())
                                .map(|arr| {
                                    arr.iter()
                                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                        .collect::<Vec<String>>()
                                });

                            let updated_at = overview
                                .and_then(|o| o.get("updatedAt"))
                                .and_then(|u| u.as_u64())
                                .unwrap_or(current_timestamp);

                            // Category mapping
                            let cat_uuid = item
                                .get("categoryUuid")
                                .and_then(|c| c.as_str())
                                .unwrap_or("001");

                            let category = match cat_uuid {
                                "001" | "login" => "Login",
                                "002" | "credit_card" | "card" => "Card",
                                "003" | "secure_note" | "note" => "Note",
                                "100" | "database" => "Database",
                                _ => "Login",
                            }
                            .to_string();

                            // Details & Fields
                            let notes = details
                                .and_then(|d| d.get("notesPlain"))
                                .and_then(|n| n.as_str())
                                .map(|s| s.to_string());

                            let mut username: Option<String> = None;
                            let mut password: Option<String> = None;
                            let mut custom_fields: Vec<CustomField> = Vec::new();

                            // Process loginFields
                            if let Some(login_fields) = details
                                .and_then(|d| d.get("loginFields"))
                                .and_then(|l| l.as_array())
                            {
                                for lf in login_fields {
                                    let designation = lf
                                        .get("designation")
                                        .and_then(|d| d.as_str())
                                        .unwrap_or("");
                                    let name = lf
                                        .get("name")
                                        .and_then(|d| d.as_str())
                                        .unwrap_or("");
                                    let val = lf
                                        .get("value")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("");

                                    if (designation == "username" || name == "username") && username.is_none() {
                                        username = Some(val.to_string());
                                    } else if (designation == "password" || name == "password") && password.is_none() {
                                        password = Some(val.to_string());
                                    }
                                }
                            }

                            let mut f_counter = 0;

                            // Helper lambda to process a field object from 1PUX
                            let mut extract_field = |field: &serde_json::Value, sec_name: Option<&str>| {
                                let field_title = field
                                    .get("title")
                                    .or_else(|| field.get("t"))
                                    .or_else(|| field.get("name"))
                                    .or_else(|| field.get("n"))
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("");

                                let field_id = field
                                    .get("id")
                                    .or_else(|| field.get("n"))
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("");

                                let k_type = field
                                    .get("k")
                                    .or_else(|| field.get("fieldType"))
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("string");

                                let mut val_str = String::new();
                                let mut detected_type = k_type.to_string();

                                if let Some(val_node) = field.get("value").or_else(|| field.get("v")) {
                                    if let Some(s) = val_node.as_str() {
                                        val_str = s.to_string();
                                    } else if let Some(obj) = val_node.as_object() {
                                        if let Some(totp) = obj.get("totp").and_then(|v| v.as_str()) {
                                            val_str = totp.to_string();
                                            detected_type = "totp".to_string();
                                        } else if let Some(concealed) = obj.get("concealed").and_then(|v| v.as_str()) {
                                            val_str = concealed.to_string();
                                            detected_type = "concealed".to_string();
                                        } else if let Some(string_val) = obj.get("string").and_then(|v| v.as_str()) {
                                            val_str = string_val.to_string();
                                            detected_type = "string".to_string();
                                        } else {
                                            for (key, val) in obj {
                                                if let Some(s) = val.as_str() {
                                                    val_str = s.to_string();
                                                    detected_type = key.clone();
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }

                                if val_str.is_empty() {
                                    return;
                                }

                                let is_totp = detected_type == "totp"
                                    || k_type.eq_ignore_ascii_case("OTP")
                                    || val_str.starts_with("otpauth://")
                                    || field_id.starts_with("TOTP_")
                                    || field_title.to_lowercase().contains("one-time")
                                    || field_title.to_lowercase().contains("totp");

                                if username.is_none()
                                    && (field_title.eq_ignore_ascii_case("username")
                                        || field_title.to_lowercase().contains("username"))
                                    && !is_totp
                                {
                                    username = Some(val_str.clone());
                                } else if password.is_none()
                                    && (field_title.eq_ignore_ascii_case("password")
                                        || field_title.to_lowercase().contains("password"))
                                    && !is_totp
                                {
                                    password = Some(val_str.clone());
                                } else if !field_title.eq_ignore_ascii_case("notesPlain") {
                                    let label = if is_totp {
                                        if field_title.is_empty() {
                                            "One-Time Password (TOTP)".to_string()
                                        } else {
                                            field_title.to_string()
                                        }
                                    } else if !field_title.is_empty() {
                                        field_title.to_string()
                                    } else {
                                        format!("Field {}", f_counter + 1)
                                    };

                                    let field_type = if is_totp || detected_type == "concealed" {
                                        "concealed".to_string()
                                    } else {
                                        detected_type
                                    };

                                    custom_fields.push(CustomField {
                                        id: format!("cf-{}", f_counter),
                                        label,
                                        value: val_str,
                                        r#type: field_type,
                                        section: sec_name.map(|s| s.to_string()),
                                    });
                                    f_counter += 1;
                                }
                            };

                            // Process top-level fields array
                            if let Some(fields) = details
                                .and_then(|d| d.get("fields"))
                                .and_then(|f| f.as_array())
                            {
                                for field in fields {
                                    extract_field(field, None);
                                }
                            }

                            // Process sections[].fields array
                            if let Some(sections) = details
                                .and_then(|d| d.get("sections"))
                                .and_then(|s| s.as_array())
                            {
                                for section in sections {
                                    let section_title = section
                                        .get("title")
                                        .or_else(|| section.get("t"))
                                        .and_then(|v| v.as_str());

                                    if let Some(fields) = section.get("fields").and_then(|f| f.as_array()) {
                                        for field in fields {
                                            extract_field(field, section_title);
                                        }
                                    }
                                }
                            }


                            parsed_items.push(VaultItem {
                                id: item_id,
                                title,
                                username,
                                password,
                                url,
                                notes,
                                category: Some(category),
                                updated_at,
                                custom_fields: if custom_fields.is_empty() {
                                    None
                                } else {
                                    Some(custom_fields)
                                },
                                tags,
                                icon: None,
                            });
                        }
                    }
                }
            }
        }
    }


    let existing = existing_items.unwrap_or_default();
    Ok(build_import_preview(parsed_items, &existing))
}

/// Parse a 1Password `.1pux` file at the given file path
#[tauri::command]
pub fn parse_1pux_file(
    file_path: String,
    existing_items: Option<Vec<VaultItem>>,
) -> Result<ImportPreview, String> {
    let bytes = std::fs::read(&file_path).map_err(|e| format!("Không thể mở file .1pux: {}", e))?;
    parse_1pux_bytes(bytes, existing_items)
}


/// Parse a JSON string containing exported vault items
#[tauri::command]
pub fn parse_json_import(
    content: String,
    existing_items: Option<Vec<VaultItem>>,
) -> Result<ImportPreview, String> {
    let json_val: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Cú pháp tệp JSON không hợp lệ: {}", e))?;

    let items_array = if json_val.is_array() {
        json_val
    } else if let Some(items) = json_val.get("items") {
        items.clone()
    } else {
        return Err("Tệp JSON không chứa danh sách items hợp lệ.".to_string());
    };

    let items: Vec<VaultItem> = serde_json::from_value(items_array)
        .map_err(|e| format!("Dữ liệu items trong JSON không khớp cấu trúc VaultItem: {}", e))?;

    let existing = existing_items.unwrap_or_default();
    Ok(build_import_preview(items, &existing))
}

/// Parse a CSV string containing exported items
#[tauri::command]
pub fn parse_csv_import(
    content: String,
    existing_items: Option<Vec<VaultItem>>,
) -> Result<ImportPreview, String> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(content.as_bytes());

    let headers = reader
        .headers()
        .map_err(|e| format!("Lỗi đọc dòng tiêu đề CSV: {}", e))?
        .clone();

    // Map column indices
    let mut title_idx: Option<usize> = None;
    let mut url_idx: Option<usize> = None;
    let mut username_idx: Option<usize> = None;
    let mut password_idx: Option<usize> = None;
    let mut notes_idx: Option<usize> = None;
    let mut category_idx: Option<usize> = None;
    let mut tags_idx: Option<usize> = None;

    for (idx, name) in headers.iter().enumerate() {
        let name_lower = name.trim().to_lowercase();
        match name_lower.as_str() {
            "title" | "name" | "tên" | "tieu de" => title_idx = Some(idx),
            "url" | "website" | "link" | "trang web" => url_idx = Some(idx),
            "username" | "user" | "login" | "tên đăng nhập" | "email" => username_idx = Some(idx),
            "password" | "pass" | "mật khẩu" | "mat khau" => password_idx = Some(idx),
            "notes" | "note" | "comment" | "ghi chú" => notes_idx = Some(idx),
            "category" | "type" | "loại" | "danh mục" => category_idx = Some(idx),
            "tags" | "tag" | "thẻ" => tags_idx = Some(idx),
            _ => {}
        }
    }

    let current_timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let mut items = Vec::new();

    for (row_num, result) in reader.records().enumerate() {
        let record = result.map_err(|e| format!("Lỗi đọc dòng {} trong CSV: {}", row_num + 1, e))?;

        let get_val = |idx_opt: Option<usize>| -> Option<String> {
            idx_opt
                .and_then(|i| record.get(i))
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
        };

        let title = get_val(title_idx).unwrap_or_else(|| format!("Item CSV {}", row_num + 1));
        let url = get_val(url_idx);
        let username = get_val(username_idx);
        let password = get_val(password_idx);
        let notes = get_val(notes_idx);
        let category = get_val(category_idx).unwrap_or_else(|| "Login".to_string());
        let tags = get_val(tags_idx).map(|t_str| {
            t_str
                .split(&[',', ';'][..])
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        });

        items.push(VaultItem {
            id: format!("csv-{}-{}", row_num, rand::random::<u32>()),
            title,
            username,
            password,
            url,
            notes,
            category: Some(category),
            updated_at: current_timestamp,
            custom_fields: None,
            tags,
            icon: None,
        });
    }

    let existing = existing_items.unwrap_or_default();
    Ok(build_import_preview(items, &existing))
}

/// Execute import of items into current active vault with specified conflict strategy
#[tauri::command]
pub fn execute_import(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    items: Vec<VaultItem>,
    conflict_strategy: String,
) -> Result<ImportResultSummary, String> {
    let key_guard = state.vault_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or("Vault đang bị khóa.")?;

    let salt_guard = state.vault_salt.lock().unwrap();
    let salt = salt_guard.as_ref().ok_or("Vault đang bị khóa.")?;

    let file_guard = state.current_vault_file.lock().unwrap();
    let file_name = file_guard.as_ref().ok_or("Vault đang bị khóa.")?;

    let mut current_vault = crate::core::storage::load_vault_with_key(&app, key, file_name)?;

    let mut added_count = 0;
    let mut overwritten_count = 0;
    let mut skipped_count = 0;
    let total_processed = items.len();

    for mut new_item in items {
        let is_dup = is_duplicate(&new_item, &current_vault.items);

        if is_dup {
            match conflict_strategy.as_str() {
                "skip" => {
                    skipped_count += 1;
                    continue;
                }
                "overwrite" => {
                    // Replace existing matching item
                    let title_lower = new_item.title.trim().to_lowercase();
                    if let Some(pos) = current_vault.items.iter().position(|ex| {
                        ex.title.trim().to_lowercase() == title_lower
                    }) {
                        current_vault.items[pos] = new_item;
                        overwritten_count += 1;
                    } else {
                        current_vault.items.push(new_item);
                        added_count += 1;
                    }
                }
                "keep_both" | _ => {
                    // Assign new ID and push
                    new_item.id = format!("{}-copy-{}", new_item.id, rand::random::<u16>());
                    current_vault.items.push(new_item);
                    added_count += 1;
                }
            }
        } else {
            current_vault.items.push(new_item);
            added_count += 1;
        }
    }

    crate::core::storage::save_existing_vault(&app, key, salt, &current_vault, file_name)?;

    Ok(ImportResultSummary {
        added_count,
        overwritten_count,
        skipped_count,
        total_processed,
    })
}

/// Export vault items to string in specified format (json, csv)
#[tauri::command]
pub fn export_vault_data(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    item_ids: Option<Vec<String>>,
    format: String,
) -> Result<String, String> {
    let key_guard = state.vault_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or("Vault đang bị khóa.")?;

    let file_guard = state.current_vault_file.lock().unwrap();
    let file_name = file_guard.as_ref().ok_or("Vault đang bị khóa.")?;

    let vault = crate::core::storage::load_vault_with_key(&app, key, file_name)?;

    let export_items: Vec<&VaultItem> = match &item_ids {
        Some(ids) => vault
            .items
            .iter()
            .filter(|i| ids.contains(&i.id))
            .collect(),
        None => vault.items.iter().collect(),
    };

    match format.to_lowercase().as_str() {
        "json" => {
            serde_json::to_string_pretty(&export_items)
                .map_err(|e| format!("Lỗi định dạng dữ liệu JSON: {}", e))
        }
        "csv" => {
            let mut wtr = csv::Writer::from_writer(Vec::new());
            wtr.write_record(&["title", "username", "password", "url", "notes", "category", "tags"])
                .map_err(|e| format!("Lỗi ghi tiêu đề CSV: {}", e))?;

            for item in export_items {
                let tags_str = item.tags.as_ref().map(|t| t.join(", ")).unwrap_or_default();
                wtr.write_record(&[
                    &item.title,
                    item.username.as_deref().unwrap_or(""),
                    item.password.as_deref().unwrap_or(""),
                    item.url.as_deref().unwrap_or(""),
                    item.notes.as_deref().unwrap_or(""),
                    item.category.as_deref().unwrap_or("Login"),
                    &tags_str,
                ])
                .map_err(|e| format!("Lỗi ghi dòng CSV: {}", e))?;
            }

            let bytes = wtr.into_inner().map_err(|e| format!("Lỗi xuất dữ liệu CSV: {}", e))?;
            String::from_utf8(bytes).map_err(|e| format!("Lỗi UTF-8 CSV: {}", e))
        }
        _ => Err("Định dạng xuất không được hỗ trợ. Sử dụng 'json' hoặc 'csv'.".to_string()),
    }
}

/// Export vault items as encrypted `.svm` binary file bytes
#[tauri::command]
pub fn export_svm_bytes(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    item_ids: Option<Vec<String>>,
    password: String,
    master_password: Option<String>,
) -> Result<Vec<u8>, String> {
    if password.trim().is_empty() {
        return Err("Mật khẩu mã hóa tệp .svm không được để trống.".to_string());
    }

    let file_guard = state.current_vault_file.lock().unwrap();
    let file_name = file_guard.as_ref().ok_or("Vault đang bị khóa.")?;

    if let Some(mp) = master_password {
        if mp.trim().is_empty() {
            return Err("Master Password của Vault không được để trống.".to_string());
        }
        crate::core::storage::unlock_and_load_vault(&app, &mp, file_name)
            .map_err(|_| "Master Password của Vault không chính xác.".to_string())?;
    }

    let key_guard = state.vault_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or("Vault đang bị khóa.")?;

    let vault = crate::core::storage::load_vault_with_key(&app, key, file_name)?;

    let export_items: Vec<VaultItem> = match &item_ids {
        Some(ids) => vault
            .items
            .into_iter()
            .filter(|i| ids.contains(&i.id))
            .collect(),
        None => vault.items,
    };

    let export_vault = crate::core::vault::Vault {
        version: 1,
        items: export_items,
    };

    let json_bytes = serde_json::to_vec(&export_vault)
        .map_err(|e| format!("Lỗi mã hóa dữ liệu Vault: {}", e))?;

    let mut salt = [0u8; 16];
    use rand::RngCore;
    rand::thread_rng().fill_bytes(&mut salt);

    let derived_key = crate::core::crypto::derive_key(&password, &salt)?;
    let (ciphertext, actual_nonce) = crate::core::crypto::encrypt(&derived_key, &json_bytes)?;

    let mut payload = Vec::new();
    payload.extend_from_slice(b"SVM1");
    payload.extend_from_slice(&salt);
    payload.extend_from_slice(&actual_nonce);
    payload.extend_from_slice(&ciphertext);

    Ok(payload)
}

/// Parse and decrypt an encrypted `.svm` binary file bytes
#[tauri::command]
pub fn parse_svm_bytes(
    bytes: Vec<u8>,
    password: String,
    existing_items: Option<Vec<VaultItem>>,
) -> Result<ImportPreview, String> {
    const MIN_SIZE: usize = 4 + 16 + 12;
    if bytes.len() < MIN_SIZE {
        return Err("Tệp .svm bị hỏng hoặc không đúng dung lượng tối thiểu.".to_string());
    }

    if &bytes[0..4] != b"SVM1" {
        return Err("Tệp không đúng định dạng Secure Vault Manager (.svm).".to_string());
    }

    let mut salt = [0u8; 16];
    salt.copy_from_slice(&bytes[4..20]);

    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&bytes[20..32]);

    let ciphertext = &bytes[32..];

    let derived_key = crate::core::crypto::derive_key(&password, &salt)
        .map_err(|e| format!("Lỗi sinh khóa giải mã: {}", e))?;

    let plaintext = crate::core::crypto::decrypt(&derived_key, ciphertext, &nonce)
        .map_err(|_| "Mật khẩu giải mã tệp .svm không chính xác.".to_string())?;

    let parsed_vault: crate::core::vault::Vault = serde_json::from_slice(&plaintext)
        .map_err(|e| format!("Dữ liệu tệp .svm không hợp lệ: {}", e))?;

    let existing = existing_items.unwrap_or_default();
    Ok(build_import_preview(parsed_vault.items, &existing))
}

/// Parse and decrypt an encrypted `.svm` file at given file path
#[tauri::command]
pub fn parse_svm_file(
    file_path: String,
    password: String,
    existing_items: Option<Vec<VaultItem>>,
) -> Result<ImportPreview, String> {
    let bytes = std::fs::read(&file_path)
        .map_err(|e| format!("Không thể đọc tệp .svm: {}", e))?;
    parse_svm_bytes(bytes, password, existing_items)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_json_import() {
        let json_data = r#"[
            {
                "id": "item-1",
                "title": "Google Account",
                "username": "user@gmail.com",
                "password": "mypassword123",
                "url": "https://google.com",
                "category": "Login",
                "updatedAt": 1700000000
            }
        ]"#;

        let preview = parse_json_import(json_data.to_string(), None).unwrap();
        assert_eq!(preview.total_items, 1);
        assert_eq!(preview.items[0].title, "Google Account");
        assert_eq!(preview.items[0].username.as_deref(), Some("user@gmail.com"));
        assert_eq!(preview.duplicate_count, 0);
    }

    #[test]
    fn test_parse_csv_import() {
        let csv_data = "title,username,password,url,notes,category\nGitHub,octocat,supersecret,https://github.com,Work account,Login";
        let preview = parse_csv_import(csv_data.to_string(), None).unwrap();
        assert_eq!(preview.total_items, 1);
        assert_eq!(preview.items[0].title, "GitHub");
        assert_eq!(preview.items[0].username.as_deref(), Some("octocat"));
        assert_eq!(preview.items[0].password.as_deref(), Some("supersecret"));
        assert_eq!(preview.items[0].url.as_deref(), Some("https://github.com"));
    }

    #[test]
    fn test_duplicate_detection() {
        let existing = vec![VaultItem {
            id: "existing-1".to_string(),
            title: "Google Account".to_string(),
            username: Some("user@gmail.com".to_string()),
            password: Some("oldpass".to_string()),
            url: Some("https://google.com".to_string()),
            notes: None,
            category: Some("Login".to_string()),
            updated_at: 1600000000,
            custom_fields: None,
            tags: None,
            icon: None,
        }];

        let json_data = r#"[
            {
                "id": "new-1",
                "title": "Google Account",
                "username": "user@gmail.com",
                "password": "newpassword456",
                "url": "https://google.com",
                "category": "Login",
                "updatedAt": 1700000000
            }
        ]"#;

        let preview = parse_json_import(json_data.to_string(), Some(existing)).unwrap();
        assert_eq!(preview.total_items, 1);
        assert_eq!(preview.duplicate_count, 1);
        assert_eq!(preview.duplicate_indices, vec![0]);
    }

    #[test]
    fn test_parse_1pux_sample() {
        let sample_1pux_json = r#"{
            "accounts": [
                {
                    "vaults": [
                        {
                            "items": [
                                {
                                    "uuid": "g6hnzlm5q6ekyq2phv2qf5wtgy",
                                    "categoryUuid": "001",
                                    "overview": {
                                        "title": "Google Account Personal",
                                        "url": "https://accounts.google.com",
                                        "urls": [
                                            { "label": "", "url": "https://accounts.google.com" }
                                        ],
                                        "tags": ["Imported July 13 2025 19:11:14", "Personal"]
                                    },
                                    "details": {
                                        "loginFields": [
                                            { "value": "ngochai285nd@gmail.com", "name": "username", "designation": "username" },
                                            { "value": "secretpass123", "name": "password", "designation": "password" }
                                        ],
                                        "sections": [
                                            {
                                                "title": "Security",
                                                "fields": [
                                                    {
                                                        "title": "one-time password",
                                                        "id": "TOTP_kuo6rwrydnpknhxj42dcqyk6va",
                                                        "value": {
                                                            "totp": "otpauth://totp/Google%20Account%20Personal:ngochai285nd%40gmail.com?secret=VN25UXMVWN&period=30&digits=6&issuer=Google"
                                                        }
                                                    }
                                                ]
                                            },
                                            {
                                                "title": "Nexus360 OAuth2 Client",
                                                "fields": [
                                                    {
                                                        "title": "Client ID",
                                                        "value": { "string": "658865054233-j48kiqjbpmfklq4aa" }
                                                    },
                                                    {
                                                        "title": "Client Secret",
                                                        "value": { "concealed": "GOCSPX-I1TO..." }
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }"#;

        // Zip buffer creation for memory parsing test
        let mut zip_bytes = Vec::new();
        {
            let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut zip_bytes));
            let options = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Stored);
            zip.start_file("export.data", options).unwrap();
            use std::io::Write;
            zip.write_all(sample_1pux_json.as_bytes()).unwrap();
            zip.finish().unwrap();
        }

        let preview = parse_1pux_bytes(zip_bytes, None).unwrap();
        assert_eq!(preview.total_items, 1);
        let item = &preview.items[0];
        assert_eq!(item.title, "Google Account Personal");
        assert_eq!(item.username.as_deref(), Some("ngochai285nd@gmail.com"));
        assert_eq!(item.password.as_deref(), Some("secretpass123"));
        assert_eq!(item.url.as_deref(), Some("https://accounts.google.com"));

        let custom_fields = item.custom_fields.as_ref().unwrap();
        assert_eq!(custom_fields.len(), 3);

        // Check TOTP field
        let totp_cf = &custom_fields[0];
        assert_eq!(totp_cf.label, "one-time password");
        assert!(totp_cf.value.starts_with("otpauth://totp/"));
        assert_eq!(totp_cf.r#type, "concealed");
        assert_eq!(totp_cf.section.as_deref(), Some("Security"));

        // Check Client ID field
        let client_id_cf = &custom_fields[1];
        assert_eq!(client_id_cf.label, "Client ID");
        assert_eq!(client_id_cf.value, "658865054233-j48kiqjbpmfklq4aa");
        assert_eq!(client_id_cf.section.as_deref(), Some("Nexus360 OAuth2 Client"));

        // Check Client Secret field
        let client_sec_cf = &custom_fields[2];
        assert_eq!(client_sec_cf.label, "Client Secret");
        assert_eq!(client_sec_cf.value, "GOCSPX-I1TO...");
        assert_eq!(client_sec_cf.r#type, "concealed");
        assert_eq!(client_sec_cf.section.as_deref(), Some("Nexus360 OAuth2 Client"));
    }

    #[test]
    fn test_svm_export_and_parse() {
        let items = vec![VaultItem {
            id: "svm-test-1".to_string(),
            title: "SVM Test Account".to_string(),
            username: Some("testuser".to_string()),
            password: Some("secret123".to_string()),
            url: Some("https://example.com".to_string()),
            notes: Some("SVM Note".to_string()),
            category: Some("Login".to_string()),
            updated_at: 1700000000,
            custom_fields: None,
            tags: Some(vec!["Test".to_string()]),
            icon: None,
        }];

        let vault = crate::core::vault::Vault {
            version: 1,
            items,
        };

        let json_bytes = serde_json::to_vec(&vault).unwrap();
        let password = "MySecretSvmPassword123!";

        let mut salt = [0u8; 16];
        use rand::RngCore;
        rand::thread_rng().fill_bytes(&mut salt);

        let derived_key = crate::core::crypto::derive_key(password, &salt).unwrap();
        let (ciphertext, actual_nonce) = crate::core::crypto::encrypt(&derived_key, &json_bytes).unwrap();

        let mut svm_payload = Vec::new();
        svm_payload.extend_from_slice(b"SVM1");
        svm_payload.extend_from_slice(&salt);
        svm_payload.extend_from_slice(&actual_nonce);
        svm_payload.extend_from_slice(&ciphertext);

        // Test parsing with correct password
        let preview = parse_svm_bytes(svm_payload.clone(), password.to_string(), None).unwrap();
        assert_eq!(preview.total_items, 1);
        assert_eq!(preview.items[0].title, "SVM Test Account");
        assert_eq!(preview.items[0].username.as_deref(), Some("testuser"));

        // Test parsing with wrong password
        let wrong_err = parse_svm_bytes(svm_payload, "WrongPassword".to_string(), None);
        assert!(wrong_err.is_err());
        assert_eq!(
            wrong_err.unwrap_err(),
            "Mật khẩu giải mã tệp .svm không chính xác."
        );
    }
}



