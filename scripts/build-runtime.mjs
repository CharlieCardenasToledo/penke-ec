import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const javaHome = process.env.JAVA_HOME;
if (!javaHome) throw new Error("JAVA_HOME es necesario para generar el runtime Java embebido.");

const jlink = join(javaHome, "bin", process.platform === "win32" ? "jlink.exe" : "jlink");
if (!existsSync(jlink)) throw new Error(`No se encontró jlink en ${jlink}`);

const output = join(process.cwd(), "src-tauri", "resources", "runtime");
rmSync(output, { recursive: true, force: true });
mkdirSync(dirname(output), { recursive: true });

const modules = [
  "java.base", "java.compiler", "java.desktop", "java.instrument", "java.logging",
  "java.management", "java.naming", "java.net.http", "java.security.jgss",
  "java.security.sasl", "java.sql", "java.transaction.xa", "java.xml",
  "jdk.crypto.cryptoki", "jdk.crypto.ec", "jdk.httpserver", "jdk.management",
  "jdk.unsupported",
];

// Proveedor nativo requerido por Windows-MY y certificados/token del sistema.
if (process.platform === "win32") modules.push("jdk.crypto.mscapi");

const result = spawnSync(jlink, [
  "--add-modules", modules.join(","),
  "--bind-services",
  "--strip-debug",
  "--no-man-pages",
  "--no-header-files",
  "--compress=2",
  "--output", output,
], { stdio: "inherit" });

if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Runtime Java embebido generado en ${output}`);
