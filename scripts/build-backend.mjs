#!/usr/bin/env node
import { execSync } from "child_process";
import { copyFileSync, existsSync, statSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const firmadorJar = join(projectRoot, "firmaec-backend", "libs", "firmador-5.1.0.jar");
const targetJar   = join(projectRoot, "firmaec-backend", "target", "firmaec-backend.jar");
const destJar     = join(projectRoot, "src-tauri", "resources", "firmaec-backend.jar");

// En Windows mvn puede no estar en PATH — buscamos en ubicaciones conocidas
function resolveMvn() {
  if (process.platform !== "win32") return "mvn";
  const candidates = [
    join("C:", "tools", "apache-maven-3.9.6", "bin", "mvn.cmd"),
    join(process.env.M2_HOME   ?? "C:\\nonexistent", "bin", "mvn.cmd"),
    join(process.env.MAVEN_HOME ?? "C:\\nonexistent", "bin", "mvn.cmd"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "mvn"; // asumir que está en PATH (CI con setup-java lo pone ahí)
}
const mvn = resolveMvn();

// Instalar firmador en el repo Maven local si no está disponible
// (necesario en CI y en máquinas sin el JAR previo en ~/.m2)
console.log("Instalando dependencia firmador:5.1.0 en repo Maven local...");
if (!existsSync(firmadorJar)) {
  console.error(`ERROR: ${firmadorJar} no existe. El JAR de FirmaEC debe estar en firmaec-backend/libs/`);
  process.exit(1);
}
execSync(
  [
    `"${mvn}" install:install-file`,
    `-Dfile="${firmadorJar}"`,
    "-DgroupId=ec.gob.firmadigital",
    "-DartifactId=firmador",
    "-Dversion=5.1.0",
    "-Dpackaging=jar",
    "-q",
  ].join(" "),
  { cwd: projectRoot, stdio: "inherit", shell: true }
);

console.log("Compilando backend Java...");
execSync(`"${mvn}" -f firmaec-backend/pom.xml clean package -q`, {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
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
