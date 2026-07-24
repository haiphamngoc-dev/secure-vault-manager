use data_encoding::BASE32_NOPAD;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use url::Url;
use wasm_bindgen::prelude::*;

type HmacSha1 = Hmac<Sha1>;

#[derive(Serialize, Deserialize)]
pub struct OtpAuthDetails {
    pub secret: String,
    pub issuer: String,
    pub account: String,
    pub digits: usize,
    pub period: u64,
    pub algorithm: String,
}

/// Generates a TOTP code (RFC 6238) for a given base32 secret and timestamp.
/// Default time period is 30 seconds, digits is 6.
#[wasm_bindgen]
pub fn generate_totp(secret: &str, timestamp_secs: u64, period_opt: Option<u64>, digits_opt: Option<usize>) -> Result<String, JsValue> {
    let clean_secret = secret.replace([' ', '-'], "").to_uppercase();
    let secret_bytes = BASE32_NOPAD
        .decode(clean_secret.trim_end_matches('=').as_bytes())
        .map_err(|e| JsValue::from_str(&format!("Invalid base32 secret: {}", e)))?;

    let period = period_opt.unwrap_or(30);
    let digits = digits_opt.unwrap_or(6);

    if period == 0 {
        return Err(JsValue::from_str("Period must be greater than 0"));
    }

    let counter = timestamp_secs / period;
    let counter_bytes = counter.to_be_bytes();

    let mut mac = HmacSha1::new_from_slice(&secret_bytes)
        .map_err(|e| JsValue::from_str(&format!("HMAC init failed: {}", e)))?;
    mac.update(&counter_bytes);
    let result = mac.finalize().into_bytes();

    let offset = (result[19] & 0x0f) as usize;
    let code_binary = ((u32::from(result[offset] & 0x7f) << 24)
        | (u32::from(result[offset + 1]) << 16)
        | (u32::from(result[offset + 2]) << 8)
        | u32::from(result[offset + 3])) as u64;

    let modulo = 10u64.pow(digits as u32);
    let otp = code_binary % modulo;

    Ok(format!("{:01$}", otp as usize, digits))
}

/// Parses an otpauth://totp/ URI and extracts secret, issuer, account, etc.
#[wasm_bindgen]
pub fn parse_otpauth_uri(uri_str: &str) -> Result<JsValue, JsValue> {
    let url = Url::parse(uri_str).map_err(|e| JsValue::from_str(&format!("Invalid URI: {}", e)))?;

    if url.scheme() != "otpauth" {
        return Err(JsValue::from_str("URI scheme must be 'otpauth'"));
    }

    let mode = url.host_str().unwrap_or("");
    if mode != "totp" {
        return Err(JsValue::from_str("Only 'totp' scheme is supported"));
    }

    let raw_path = url.path().trim_start_matches('/');
    let decoded_path = raw_path.to_string();

    let mut issuer = String::new();
    let mut account = decoded_path.to_string();

    if let Some((iss, acc)) = decoded_path.split_once(':') {
        issuer = iss.trim().to_string();
        account = acc.trim().to_string();
    }

    let mut secret = String::new();
    let mut digits = 6;
    let mut period = 30;
    let mut algorithm = "SHA1".to_string();

    for (key, val) in url.query_pairs() {
        match key.as_ref() {
            "secret" => secret = val.to_string(),
            "issuer" => {
                if issuer.is_empty() {
                    issuer = val.to_string();
                }
            }
            "digits" => {
                if let Ok(d) = val.parse::<usize>() {
                    digits = d;
                }
            }
            "period" => {
                if let Ok(p) = val.parse::<u64>() {
                    period = p;
                }
            }
            "algorithm" => algorithm = val.to_uppercase(),
            _ => {}
        }
    }

    if secret.is_empty() {
        return Err(JsValue::from_str("Missing 'secret' parameter in otpauth URI"));
    }

    let details = OtpAuthDetails {
        secret,
        issuer,
        account,
        digits,
        period,
        algorithm,
    };

    serde_wasm_bindgen::to_value(&details)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rfc6238_totp_generation() {
        let secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // 12345678901234567890 in base32

        // Timestamp 59 => counter = 1 => 287082
        let totp1 = generate_totp(secret, 59, Some(30), Some(6)).unwrap();
        assert_eq!(totp1, "287082");

        // Timestamp 1111111109 => counter = 37037036 => 081804
        let totp2 = generate_totp(secret, 1111111109, Some(30), Some(6)).unwrap();
        assert_eq!(totp2, "081804");
    }
}

