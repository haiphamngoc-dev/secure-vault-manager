import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Get extension ID from arguments
const extId = process.argv[2];
if (!extId) {
  console.error("Lỗi: Vui lòng cung cấp Extension ID.");
  console.log("Sử dụng: pnpm run register-proxy <extension_id>");
  process.exit(1);
}

// Target Triple detection
function getTargetTriple() {
  try {
    const stdout = execSync("rustc -vV").toString();
    const match = stdout.match(/^host:\s+(.+)$/m);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch {
    // Fallback to node platform detection if rustc is not available
  }

  const platform = process.platform;
  const arch = process.arch;
  if (platform === "win32")
    return arch === "x64" ? "x86_64-pc-windows-msvc" : "i686-pc-windows-msvc";
  if (platform === "darwin")
    return arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
  if (platform === "linux")
    return arch === "x64"
      ? "x86_64-unknown-linux-gnu"
      : "aarch64-unknown-linux-gnu";
  throw new Error(`Platform không hỗ trợ: ${platform}`);
}

const triple = getTargetTriple();
const ext = process.platform === "win32" ? ".exe" : "";
const binaryPath = path.join(
  rootDir,
  "packages",
  "desktop",
  "src-tauri",
  "binaries",
  `proxy-${triple}${ext}`
);

if (!fs.existsSync(binaryPath)) {
  console.error(
    `Lỗi: Không tìm thấy file proxy tại ${binaryPath}. Vui lòng chạy 'pnpm run build:proxy && pnpm run copy:sidecar' trước.`
  );
  process.exit(1);
}

const manifest = {
  name: "com.haiphamngoc_dev.secure_vault_manager_proxy",
  description: "Secure Vault Manager Native Messaging Proxy Host",
  path: binaryPath,
  type: "stdio",
  allowed_origins: [`chrome-extension://${extId}/`],
};

const manifestJson = JSON.stringify(manifest, null, 2);
const hostName = "com.haiphamngoc_dev.secure_vault_manager_proxy.json";

function register() {
  const homeDir = os.homedir();
  const platform = process.platform;

  if (platform === "linux") {
    const chromeDir = path.join(
      homeDir,
      ".config",
      "google-chrome",
      "NativeMessagingHosts"
    );
    const chromiumDir = path.join(
      homeDir,
      ".config",
      "chromium",
      "NativeMessagingHosts"
    );

    // Register for Google Chrome
    fs.mkdirSync(chromeDir, { recursive: true });
    fs.writeFileSync(path.join(chromeDir, hostName), manifestJson);
    console.log(
      `Đã đăng ký Chrome Native Messaging Host tại: ${path.join(chromeDir, hostName)}`
    );

    // Register for Chromium
    fs.mkdirSync(chromiumDir, { recursive: true });
    fs.writeFileSync(path.join(chromiumDir, hostName), manifestJson);
    console.log(
      `Đã đăng ký Chromium Native Messaging Host tại: ${path.join(chromiumDir, hostName)}`
    );
  } else if (platform === "darwin") {
    const chromeDir = path.join(
      homeDir,
      "Library",
      "Application Support",
      "Google",
      "Chrome",
      "NativeMessagingHosts"
    );
    fs.mkdirSync(chromeDir, { recursive: true });
    fs.writeFileSync(path.join(chromeDir, hostName), manifestJson);
    console.log(
      `Đã đăng ký macOS Chrome Native Messaging Host tại: ${path.join(chromeDir, hostName)}`
    );
  } else if (platform === "win32") {
    // On Windows, save the JSON in the sidecar folder
    const jsonPath = path.join(
      rootDir,
      "packages",
      "desktop",
      "src-tauri",
      "binaries",
      hostName
    );
    fs.writeFileSync(jsonPath, manifestJson);
    console.log(`Đã tạo tệp cấu hình JSON tại: ${jsonPath}`);

    // Create Registry key trashing the JSON path
    const regKey = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.haiphamngoc_dev.secure_vault_manager_proxy`;
    try {
      execSync(`reg add "${regKey}" /ve /t REG_SZ /d "${jsonPath}" /f`);
      console.log(`Đã đăng ký Windows Registry key: ${regKey}`);
    } catch (err) {
      console.error(
        "Lỗi khi thêm Registry key. Vui lòng chạy lại script này với quyền Administrator:",
        err.message
      );
    }
  } else {
    console.error(`Hệ điều hành ${platform} không được cấu hình tự động.`);
  }
}

register();
