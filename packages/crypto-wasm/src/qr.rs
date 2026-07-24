use rqrr::PreparedImage;
use wasm_bindgen::prelude::*;

/// Decodes a QR code from a raw RGBA image pixel buffer.
/// `rgba_bytes`: Uint8Array of RGBA values (length must be width * height * 4).
/// `width`: Image width in pixels.
/// `height`: Image height in pixels.
#[wasm_bindgen]
pub fn decode_qr_code_rgba(rgba_bytes: &[u8], width: usize, height: usize) -> Result<String, JsValue> {
    if rgba_bytes.len() != width * height * 4 {
        return Err(JsValue::from_str(&format!(
            "Invalid RGBA buffer size. Expected {}, got {}",
            width * height * 4,
            rgba_bytes.len()
        )));
    }

    // Convert RGBA pixels to grayscale byte vector
    let mut grayscale = Vec::with_capacity(width * height);
    for chunk in rgba_bytes.chunks_exact(4) {
        let r = u32::from(chunk[0]);
        let g = u32::from(chunk[1]);
        let b = u32::from(chunk[2]);
        let gray = ((r * 299 + g * 587 + b * 114) / 1000) as u8;
        grayscale.push(gray);
    }

    let mut img = PreparedImage::prepare_from_greyscale(width, height, |x, y| {
        grayscale[y * width + x]
    });

    let grids = img.detect_grids();
    if grids.is_empty() {
        return Err(JsValue::from_str("No QR code grid found in image."));
    }

    for grid in grids {
        if let Ok((_meta, content)) = grid.decode() {
            return Ok(content);
        }
    }

    Err(JsValue::from_str("Found QR pattern but failed to decode content."))
}
