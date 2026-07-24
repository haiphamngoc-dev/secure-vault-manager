import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.resolve(__dirname, "..");
const distChromeDir = path.join(extensionDir, "dist", "chrome");
const distFirefoxDir = path.join(extensionDir, "dist", "firefox");

// Copy folder helper recursively
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  if (!fs.existsSync(distChromeDir)) {
    console.error(
      "Error: dist/chrome directory does not exist. Run build first."
    );
    process.exit(1);
  }

  // 1. Clean and Copy dist/chrome to dist/firefox
  if (fs.existsSync(distFirefoxDir)) {
    fs.rmSync(distFirefoxDir, { recursive: true, force: true });
  }
  copyDir(distChromeDir, distFirefoxDir);
  console.log("Copied dist/chrome to dist/firefox successfully.");

  // 2. Modify dist-firefox/manifest.json for Firefox compatibility
  const firefoxManifestPath = path.join(distFirefoxDir, "manifest.json");
  if (fs.existsSync(firefoxManifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(firefoxManifestPath, "utf8"));

    // Filter out Chrome-only permissions unsupported by Firefox
    if (Array.isArray(manifest.permissions)) {
      manifest.permissions = manifest.permissions.filter(
        (p) => p !== "offscreen"
      );
    }

    if (manifest.background && manifest.background.service_worker) {
      // Convert service_worker to scripts array for Firefox MV3 compatibility
      manifest.background.scripts = [manifest.background.service_worker];
      delete manifest.background.service_worker;
    }

    fs.writeFileSync(firefoxManifestPath, JSON.stringify(manifest, null, 2));
    console.log(
      "Successfully updated manifest.json for Firefox compatibility."
    );
  }
}

main();
