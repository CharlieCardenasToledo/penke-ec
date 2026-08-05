#!/usr/bin/env node
import { execSync } from "child_process";
import { copyFileSync, existsSync, statSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const targetJar = join(projectRoot, "firmaec-backend", "target", "firmaec-backend.jar");
const destJar   = join(projectRoot, "src-tauri", "resources", "firmaec-backend.jar");

console.log("Compilando backend Java...");

execSync("mvn -f firmaec-backend/pom.xml clean package -q", {
  cwd: projectRoot,
  stdio: "inherit",
});

if (!existsSync(targetJar)) {
  console.error(`ERROR: JAR no encontrado en ${targetJar}`);
  process.exit(1);
}

copyFileSync(targetJar, destJar);

const stats  = statSync(destJar);
const sha256 = createHash("sha256").update(readFileSync(destJar)).digest("hex");

console.log(`Backend JAR copiado a:  ${destJar}`);
console.log(`Tamaño:                 ${(stats.size / 1_048_576).toFixed(1)} MB`);
console.log(`SHA-256:                ${sha256.slice(0, 16)}...`);
