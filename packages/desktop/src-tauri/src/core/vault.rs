use serde::{Deserialize, Serialize};

/// Represents a custom field associated with a vault item.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CustomField {
    pub id: String,
    pub label: String,
    pub value: String,
    pub r#type: String,
}

/// Represents a single credential item stored in the secure vault.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VaultItem {
    /// Unique identifier (usually UUID v4).
    pub id: String,
    /// Human-readable title for the entry (e.g. "Google Account").
    pub title: String,
    /// Associated login username.
    pub username: Option<String>,
    /// Associated login password.
    pub password: Option<String>,
    /// Target URL (e.g. "https://accounts.google.com").
    pub url: Option<String>,
    /// Custom textual notes or description.
    pub notes: Option<String>,
    /// Grouping category (e.g. "Work", "Personal").
    pub category: Option<String>,
    /// Last modification timestamp.
    pub updated_at: u64,
    /// Custom metadata fields.
    pub custom_fields: Option<Vec<CustomField>>,
    /// Multi-tag groups.
    pub tags: Option<Vec<String>>,
    /// Custom base64 icon data.
    pub icon: Option<String>,
}

/// Represents the complete structure of the decrypted vault database file.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Vault {
    /// Schema version for future-proofing migrations.
    pub version: u32,
    /// The collection of all saved credential items.
    pub items: Vec<VaultItem>,
}
