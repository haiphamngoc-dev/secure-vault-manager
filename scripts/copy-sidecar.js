import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Retrieve target triple using rustc
function getTargetTriple() {
  try {
    const stdout = execSync("rustc -vV").toString();
    const match = stdout.match(/^host:\s+(.+)$/m);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (err) {
    console.error(
      "Failed to get target triple via rustc, falling back to node platform detection:",
      err
    );
  }

  // Fallback map
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "win32") {
    return arch === "x64" ? "x86_64-pc-windows-msvc" : "i686-pc-windows-msvc";
  } else if (platform === "darwin") {
    return arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
  } else if (platform === "linux") {
    return arch === "x64"
      ? "x86_64-unknown-linux-gnu"
      : "aarch64-unknown-linux-gnu";
  }
  throw new Error(`Unsupported platform/architecture: ${platform}/${arch}`);
}

const triple = getTargetTriple();
const ext = process.platform === "win32" ? ".exe" : "";

const proxyBinaryName = "secure-vault-manager-proxy" + ext;
const sourcePath = path.join(rootDir, "target", "release", proxyBinaryName);
const destDir = path.join(
  rootDir,
  "packages",
  "desktop",
  "src-tauri",
  "binaries"
);
const destPath = path.join(destDir, `proxy-${triple}${ext}`);

console.log(`Locating proxy binary at: ${sourcePath}`);
console.log(`Destination path: ${destPath}`);

if (!fs.existsSync(sourcePath)) {
  console.error(
    `Error: Compiled proxy binary not found at ${sourcePath}. Make sure to build it first.`
  );
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(sourcePath, destPath);
console.log(`Successfully copied sidecar to ${destPath}`);
