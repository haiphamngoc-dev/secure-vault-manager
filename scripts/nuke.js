import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const nodeModulesPaths = [
  "node_modules",
  "packages/desktop/node_modules",
  "packages/extension/node_modules",
  "packages/shared/node_modules",
  "packages/crypto-wasm/node_modules",
];

console.log(
  "Starting deep clean (Nuke) of all dependencies and build folders..."
);

// First run clean to delete build outputs
try {
  execSync("pnpm clean", { stdio: "inherit", cwd: rootDir });
} catch (err) {
  console.warn(
    "Warning: clean script failed, continuing to delete node_modules:",
    err.message
  );
}

// Delete node_modules folders
for (const relPath of nodeModulesPaths) {
  const absPath = path.join(rootDir, relPath);
  if (fs.existsSync(absPath)) {
    try {
      fs.rmSync(absPath, { recursive: true, force: true });
      console.log(`Deleted dependencies folder: ${relPath}`);
    } catch (err) {
      console.error(`Error deleting ${relPath}:`, err.message);
    }
  }
}

console.log(
  'Deep clean complete! Run "pnpm install" to reinstall all dependencies.'
);
