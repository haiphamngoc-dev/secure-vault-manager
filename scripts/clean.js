import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const pathsToClean = [
  "packages/desktop/dist",
  "packages/extension/dist",
  "packages/crypto-wasm/pkg",
  "packages/desktop/src-tauri/binaries",
];

console.log("Cleaning build directories...");

// Clean Cargo/Rust target
try {
  console.log("Running cargo clean...");
  execSync("cargo clean", { stdio: "inherit", cwd: rootDir });
} catch (err) {
  console.warn("Warning: Could not run cargo clean:", err.message);
}

// Clean JS/WASM build folders
for (const relPath of pathsToClean) {
  const absPath = path.join(rootDir, relPath);
  if (fs.existsSync(absPath)) {
    try {
      fs.rmSync(absPath, { recursive: true, force: true });
      console.log(`Deleted: ${relPath}`);
    } catch (err) {
      console.error(`Error deleting ${relPath}:`, err.message);
    }
  }
}

console.log("Cleanup complete!");
