import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Get extension ID from arguments or use published extension ID as default
const extId = process.argv[2] || "pnahlaohpcfkgjkdhhfdkapdbgjchdfe";

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
  throw new Error(`Unsupported platform: ${platform}`);
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
    `Error: Proxy binary not found at ${binaryPath}. Please run 'pnpm run build:proxy && pnpm run copy:sidecar' first.`
  );
  process.exit(1);
}

const chromeManifest = {
  name: "com.haiphamngoc_dev.secure_vault_manager_proxy",
  description: "Secure Vault Manager Native Messaging Proxy Host",
  path: binaryPath,
  type: "stdio",
  allowed_origins: [`chrome-extension://${extId}/`],
};

const firefoxManifest = {
  name: "com.haiphamngoc_dev.secure_vault_manager_proxy",
  description: "Secure Vault Manager Native Messaging Proxy Host",
  path: binaryPath,
  type: "stdio",
  allowed_extensions: ["secure-vault-manager-ext@haiphamngoc.dev"],
};

const chromeManifestJson = JSON.stringify(chromeManifest, null, 2);
const firefoxManifestJson = JSON.stringify(firefoxManifest, null, 2);
const hostName = "com.haiphamngoc_dev.secure_vault_manager_proxy.json";
const firefoxHostNameWin =
  "com.haiphamngoc_dev.secure_vault_manager_proxy_firefox.json";

function register() {
  const homeDir = os.homedir();
  const platform = process.platform;

  // Ensure executable permissions on Unix
  if (platform === "linux" || platform === "darwin") {
    try {
      fs.chmodSync(binaryPath, 0o755);
    } catch {
      // Ignore if chmod fails
    }
  }

  if (platform === "linux") {
    const chromeDirs = [
      path.join(homeDir, ".config", "google-chrome", "NativeMessagingHosts"),
      path.join(homeDir, ".config", "chromium", "NativeMessagingHosts"),
      path.join(
        homeDir,
        ".config",
        "BraveSoftware",
        "Brave-Browser",
        "NativeMessagingHosts"
      ),
      path.join(homeDir, ".config", "microsoft-edge", "NativeMessagingHosts"),
      path.join(homeDir, ".config", "vivaldi", "NativeMessagingHosts"),
      path.join(
        homeDir,
        ".var",
        "app",
        "com.google.Chrome",
        "config",
        "google-chrome",
        "NativeMessagingHosts"
      ),
      path.join(
        homeDir,
        ".var",
        "app",
        "org.chromium.Chromium",
        "config",
        "chromium",
        "NativeMessagingHosts"
      ),
      path.join(
        homeDir,
        ".var",
        "app",
        "com.brave.Browser",
        "config",
        "BraveSoftware",
        "Brave-Browser",
        "NativeMessagingHosts"
      ),
      path.join(
        homeDir,
        "snap",
        "google-chrome",
        "current",
        ".config",
        "google-chrome",
        "NativeMessagingHosts"
      ),
    ];

    const firefoxDirs = [
      path.join(homeDir, ".mozilla", "native-messaging-hosts"),
      path.join(
        homeDir,
        ".var",
        "app",
        "org.mozilla.firefox",
        ".mozilla",
        "native-messaging-hosts"
      ),
      path.join(
        homeDir,
        "snap",
        "firefox",
        "common",
        ".mozilla",
        "native-messaging-hosts"
      ),
    ];

    // Register Chromium-based browsers
    for (const chromeDir of chromeDirs) {
      try {
        fs.mkdirSync(chromeDir, { recursive: true });
        fs.writeFileSync(path.join(chromeDir, hostName), chromeManifestJson);
        console.log(
          `Registered Chrome Native Messaging Host at: ${path.join(chromeDir, hostName)}`
        );
      } catch {
        // Ignore individual browser dir errors
      }
    }

    // Register Firefox browsers
    for (const firefoxDir of firefoxDirs) {
      try {
        fs.mkdirSync(firefoxDir, { recursive: true });
        fs.writeFileSync(path.join(firefoxDir, hostName), firefoxManifestJson);
        console.log(
          `Registered Firefox Native Messaging Host at: ${path.join(firefoxDir, hostName)}`
        );
      } catch {
        // Ignore individual browser dir errors
      }
    }
  } else if (platform === "darwin") {
    const chromeDir = path.join(
      homeDir,
      "Library",
      "Application Support",
      "Google",
      "Chrome",
      "NativeMessagingHosts"
    );
    const firefoxDir = path.join(
      homeDir,
      "Library",
      "Application Support",
      "Mozilla",
      "NativeMessagingHosts"
    );

    // Chrome macOS
    fs.mkdirSync(chromeDir, { recursive: true });
    fs.writeFileSync(path.join(chromeDir, hostName), chromeManifestJson);
    console.log(
      `Registered macOS Chrome Native Messaging Host at: ${path.join(chromeDir, hostName)}`
    );

    // Firefox macOS
    fs.mkdirSync(firefoxDir, { recursive: true });
    fs.writeFileSync(path.join(firefoxDir, hostName), firefoxManifestJson);
    console.log(
      `Registered macOS Firefox Native Messaging Host at: ${path.join(firefoxDir, hostName)}`
    );
  } else if (platform === "win32") {
    // Save Chrome JSON
    const chromeJsonPath = path.join(
      rootDir,
      "packages",
      "desktop",
      "src-tauri",
      "binaries",
      hostName
    );
    fs.writeFileSync(chromeJsonPath, chromeManifestJson);
    console.log(`Created Chrome JSON configuration file at: ${chromeJsonPath}`);

    // Save Firefox JSON
    const firefoxJsonPath = path.join(
      rootDir,
      "packages",
      "desktop",
      "src-tauri",
      "binaries",
      firefoxHostNameWin
    );
    fs.writeFileSync(firefoxJsonPath, firefoxManifestJson);
    console.log(
      `Created Firefox JSON configuration file at: ${firefoxJsonPath}`
    );

    // Create Registry keys
    const chromeRegKey = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.haiphamngoc_dev.secure_vault_manager_proxy`;
    const firefoxRegKey = `HKCU\\Software\\Mozilla\\NativeMessagingHosts\\com.haiphamngoc_dev.secure_vault_manager_proxy`;

    try {
      execSync(
        `reg add "${chromeRegKey}" /ve /t REG_SZ /d "${chromeJsonPath}" /f`
      );
      console.log(`Registered Windows Registry key (Chrome): ${chromeRegKey}`);
    } catch (err) {
      console.error("Error adding Chrome Registry key:", err.message);
    }

    try {
      execSync(
        `reg add "${firefoxRegKey}" /ve /t REG_SZ /d "${firefoxJsonPath}" /f`
      );
      console.log(
        `Registered Windows Registry key (Firefox): ${firefoxRegKey}`
      );
    } catch (err) {
      console.error("Error adding Firefox Registry key:", err.message);
    }
  } else {
    console.error(
      `OS platform ${platform} is not supported for auto-registration.`
    );
  }
}

register();
