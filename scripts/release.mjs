#!/usr/bin/env node
/**
 * Script de release para Penké EC.
 *
 * Uso:
 *   npm run release patch    → 1.0.0 → 1.0.1  (correcciones)
 *   npm run release minor    → 1.0.0 → 1.1.0  (nuevas funcionalidades)
 *   npm run release major    → 1.0.0 → 2.0.0  (cambios incompatibles)
 *
 * Qué hace:
 *   1. Bumpa la versión en package.json, tauri.conf.json y Cargo.toml
 *   2. Actualiza CHANGELOG.md con la fecha y versión
 *   3. Crea un commit y un tag v{version}
 *   4. Imprime el comando para hacer push (no lo hace solo)
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

// ── Argumentos ──────────────────────────────────────────────────────────────
const bump = process.argv[2];
if (!["patch", "minor", "major"].includes(bump)) {
  console.error("Uso: npm run release <patch|minor|major>");
  process.exit(1);
}

// ── Leer versión actual ──────────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);

let nextVersion;
if (bump === "major") nextVersion = `${major + 1}.0.0`;
else if (bump === "minor") nextVersion = `${major}.${minor + 1}.0`;
else nextVersion = `${major}.${minor}.${patch + 1}`;

console.log(`\n  Penké EC  ${pkg.version}  →  ${nextVersion}\n`);

// ── 1. package.json ──────────────────────────────────────────────────────────
pkg.version = nextVersion;
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
console.log("  ✓ package.json");

// ── 2. tauri.conf.json ──────────────────────────────────────────────────────
const tauriPath = "src-tauri/tauri.conf.json";
const tauri = JSON.parse(readFileSync(tauriPath, "utf8"));
tauri.version = nextVersion;
writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + "\n");
console.log("  ✓ src-tauri/tauri.conf.json");

// ── 3. Cargo.toml ───────────────────────────────────────────────────────────
const cargoPath = "src-tauri/Cargo.toml";
let cargo = readFileSync(cargoPath, "utf8");
cargo = cargo.replace(
  /^version\s*=\s*"[\d.]+"/m,
  `version = "${nextVersion}"`
);
writeFileSync(cargoPath, cargo);
console.log("  ✓ src-tauri/Cargo.toml");

// ── 4. lib.rs — BACKEND_VERSION ─────────────────────────────────────────────
const libPath = "src-tauri/src/lib.rs";
let lib = readFileSync(libPath, "utf8");
lib = lib.replace(
  /const BACKEND_VERSION:\s*&str\s*=\s*"[\d.]+";/,
  `const BACKEND_VERSION: &str = "${nextVersion}";`
);
writeFileSync(libPath, lib);
console.log("  ✓ src-tauri/src/lib.rs (BACKEND_VERSION)");

// ── 5. BackendServer.java — /version endpoint ────────────────────────────────
const javaPath = "firmaec-backend/src/main/java/ec/gob/firmadigital/api/BackendServer.java";
let java = readFileSync(javaPath, "utf8");
java = java.replace(
  /ctx\.result\("[\d.]+"\)\)/,
  `ctx.result("${nextVersion}"))`
);
writeFileSync(javaPath, java);
console.log("  ✓ BackendServer.java (/version endpoint)");

// ── 6. CHANGELOG.md ─────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const changelogPath = "CHANGELOG.md";
let changelog = readFileSync(changelogPath, "utf8");
const newEntry = `## [${nextVersion}] — ${today}\n\n> Describe los cambios de esta versión aquí antes de hacer el release.\n\n`;
changelog = changelog.replace("# Changelog\n\n", `# Changelog\n\n${newEntry}`);
writeFileSync(changelogPath, changelog);
console.log("  ✓ CHANGELOG.md (edita la entrada antes del push)\n");

// ── 7. Git commit + tag ──────────────────────────────────────────────────────
execSync(`git add package.json ${tauriPath} ${cargoPath} ${libPath} ${javaPath} ${changelogPath}`);
execSync(`git commit -m "chore: release v${nextVersion}"`);
execSync(`git tag v${nextVersion}`);
console.log(`  ✓ commit + tag v${nextVersion} creados\n`);

console.log("  Próximo paso — edita CHANGELOG.md y luego ejecuta:");
console.log(`  git push && git push origin v${nextVersion}`);
console.log("  → GitHub Actions compilará el instalador .msi automáticamente\n");
