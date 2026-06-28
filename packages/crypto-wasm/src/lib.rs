use wasm_bindgen::prelude::*;

/// A placeholder function compiled to WebAssembly.
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! This is from Rust WebAssembly.", name)
}
