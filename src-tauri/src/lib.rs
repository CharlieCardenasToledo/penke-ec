#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, State};

// ── Almacén seguro: genera/recupera la clave maestra del vault Stronghold ─────

/// Devuelve una clave hex de 64 chars (256 bits) estable por dispositivo/usuario.
///
/// Orden de búsqueda:
///   1. Keychain del SO (Windows Credential Manager / macOS Keychain / Linux Secret Service)
///   2. Archivo legado `.vault-key` → migra al keychain y borra el archivo
///   3. Genera nueva clave, la guarda en el keychain; si falla, la persiste en archivo
#[tauri::command]
fn get_vault_key(app_handle: tauri::AppHandle) -> Result<String, String> {
    const SERVICE: &str = "penke-ec";
    const ACCOUNT: &str = "vault-key";

    // 1. Intentar recuperar del keychain del SO
    if let Ok(entry) = keyring::Entry::new(SERVICE, ACCOUNT) {
        if let Ok(key) = entry.get_password() {
            if !key.is_empty() {
                return Ok(key);
            }
        }
    }

    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;

    let key_path = data_dir.join(".vault-key");

    // 2. Migrar desde archivo legado al keychain
    if key_path.exists() {
        let legacy = std::fs::read_to_string(&key_path)
            .map_err(|e| format!("leer vault-key: {e}"))?
            .trim()
            .to_string();

        if let Ok(entry) = keyring::Entry::new(SERVICE, ACCOUNT) {
            if entry.set_password(&legacy).is_ok() {
                let _ = std::fs::remove_file(&key_path); // ya está en el keychain
                return Ok(legacy);
            }
        }
        return Err("No se pudo migrar la clave al almacén seguro del sistema".to_string());
    }

    // 3. Primera ejecución: generar clave aleatoria
    use rand::Rng;
    let bytes: Vec<u8> = rand::thread_rng()
        .sample_iter(&rand::distributions::Standard)
        .take(32)
        .collect();
    let key: String = bytes.iter().map(|b| format!("{b:02x}")).collect();

    // No guardar la clave maestra en texto plano como fallback.
    let in_keychain = keyring::Entry::new(SERVICE, ACCOUNT)
        .map(|e| e.set_password(&key).is_ok())
        .unwrap_or(false);

    if !in_keychain {
        return Err(
            "Windows Credential Manager no está disponible; no se guardará la clave en texto plano"
                .to_string(),
        );
    }

    Ok(key)
}

struct BackendSessionToken(Mutex<String>);

#[tauri::command]
fn backend_session_token(state: State<BackendSessionToken>) -> Result<String, String> {
    state
        .0
        .lock()
        .map(|token| token.clone())
        .map_err(|_| "No se pudo acceder al token de sesión".to_string())
}

const BACKEND_VERSION: &str = "1.0.5";
const BACKEND_BUILD_ID: &str = "2026-09-08";
const BACKEND_API_VERSION: u32 = 2;

#[tauri::command]
fn verificar_archivo(ruta: String) -> bool {
    let p = std::path::Path::new(&ruta);
    p.exists() && p.is_file()
}

#[tauri::command]
fn carpeta_penke_defecto() -> Result<String, String> {
    let docs = dirs::document_dir()
        .ok_or_else(|| "No se pudo obtener la carpeta Documentos".to_string())?;
    Ok(docs.to_string_lossy().to_string())
}

#[tauri::command]
fn leer_archivo_base64(ruta: String) -> Result<String, String> {
    use std::io::Read;
    let mut file = std::fs::File::open(&ruta).map_err(|e| e.to_string())?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
    Ok(base64_encode(&bytes))
}

fn base64_encode(data: &[u8]) -> String {
    use std::fmt::Write;
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 {
            chunk[1] as usize
        } else {
            0
        };
        let b2 = if chunk.len() > 2 {
            chunk[2] as usize
        } else {
            0
        };
        let _ = write!(
            out,
            "{}{}{}{}",
            CHARS[b0 >> 2] as char,
            CHARS[((b0 & 3) << 4) | (b1 >> 4)] as char,
            if chunk.len() > 1 {
                CHARS[((b1 & 0xf) << 2) | (b2 >> 6)] as char
            } else {
                '='
            },
            if chunk.len() > 2 {
                CHARS[b2 & 0x3f] as char
            } else {
                '='
            },
        );
    }
    out
}

struct JavaProcess(Mutex<Option<Child>>);

fn find_java(app: &tauri::App) -> String {
    let java_name = if cfg!(target_os = "windows") { "java.exe" } else { "java" };

    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("runtime").join("bin").join(java_name);
        if bundled.exists() {
            return bundled.to_string_lossy().to_string();
        }
    }

    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let path = std::path::Path::new(&java_home).join("bin").join(java_name);
        if path.exists() {
            return path.to_string_lossy().to_string();
        }
    }
    "java".to_string()
}

fn resolve_jar(app: &tauri::App) -> Result<std::path::PathBuf, String> {
    // 1. Variable explícita para desarrollo/CI
    if let Ok(override_path) = std::env::var("PENKE_BACKEND_JAR") {
        let p = std::path::PathBuf::from(&override_path);
        if p.exists() {
            return Ok(p);
        }
        return Err(format!("PENKE_BACKEND_JAR={} no existe", override_path));
    }

    // 2. Junto al ejecutable (prod: directorio de instalación; dev: target/debug/)
    if let Ok(exe) = std::env::current_exe() {
        let candidate = exe
            .parent()
            .unwrap_or(std::path::Path::new("."))
            .join("firmaec-backend.jar");
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    // 3. resource_dir de Tauri (fallback dev y algunas configuraciones de prod)
    if let Ok(res_dir) = app.path().resource_dir() {
        let candidate = res_dir.join("firmaec-backend.jar");
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    Err("firmaec-backend.jar no encontrado. Reinstala la aplicación o ejecuta npm run build:backend.".to_string())
}

#[derive(Debug)]
struct BackendInfo {
    version: String,
    build_id: String,
    api_version: u32,
}

fn version_backend_actual(token: &str) -> Option<BackendInfo> {
    let text = reqwest::blocking::Client::builder()
        .timeout(Duration::from_millis(800))
        .build()
        .ok()?
        .get("http://127.0.0.1:8765/version")
        .bearer_auth(token)
        .send()
        .ok()?
        .text()
        .ok()?;

    let text = text.trim();

    // Formato JSON (backend >= 1.0.1)
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(text) {
        let version = val.get("version")?.as_str()?.to_string();
        let build_id = val
            .get("buildId")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let api_version = val.get("apiVersion").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
        return Some(BackendInfo {
            version,
            build_id,
            api_version,
        });
    }

    // Formato texto plano (backend antiguo 1.0.0)
    Some(BackendInfo {
        version: text.to_string(),
        build_id: String::new(),
        api_version: 0,
    })
}

fn backend_responde(token: &str) -> bool {
    reqwest::blocking::Client::builder()
        .timeout(Duration::from_millis(800))
        .build()
        .ok()
        .and_then(|c| {
            c.get("http://127.0.0.1:8765/health")
                .bearer_auth(token)
                .send()
                .ok()
        })
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

fn wait_for_backend(token: &str, timeout_ms: u64) -> bool {
    let deadline = std::time::Instant::now() + Duration::from_millis(timeout_ms);
    while std::time::Instant::now() < deadline {
        if backend_responde(token) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let token = {
        use rand::RngCore;
        let mut bytes = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut bytes);
        bytes.iter().map(|b| format!("{b:02x}")).collect::<String>()
    };
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
                use sha2::{Digest, Sha256};
                let mut h = Sha256::new();
                h.update(password);
                h.finalize().to_vec()
            })
            .build(),
        )
        .invoke_handler(tauri::generate_handler![
            leer_archivo_base64,
            carpeta_penke_defecto,
            verificar_archivo,
            get_vault_key,
            backend_session_token,
        ])
        .manage(BackendSessionToken(Mutex::new(token.clone())))
        .manage(JavaProcess(Mutex::new(None)))
        .setup(|app| {
            let app_handle = app.handle().clone();

            let jar_path = match resolve_jar(app) {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("ERROR CRÍTICO: {}", e);
                    panic!("{}", e);
                }
            };

            let java = find_java(app);
            let jar_size = std::fs::metadata(&jar_path).map(|m| m.len()).unwrap_or(0);

            println!(
                "Backend JAR: {:?} ({:.1} MB)",
                jar_path,
                jar_size as f64 / 1_048_576.0
            );
            println!(
                "Lanzando backend v{}: {} -jar {:?}",
                BACKEND_VERSION, java, jar_path
            );

            let mut backend_command = Command::new(&java);
            backend_command
                .arg("-jar")
                .arg(&jar_path)
                .env("PENKE_API_TOKEN", &token);

            // Algunas instalaciones de Windows exponen TEMP/TMP con una ruta
            // corta (por ejemplo, `C:\\Users\\CHARLI~1`). Java NIO puede fallar
            // al crear el canal interno de Jetty con ese formato. Entregamos
            // una ruta larga y válida al proceso Java, sin modificar el entorno
            // de la aplicación principal.
            #[cfg(target_os = "windows")]
            {
                let java_temp = std::path::Path::new(r"C:\Windows\Temp");
                if java_temp.is_dir() {
                    backend_command.env("TEMP", java_temp).env("TMP", java_temp);
                }
            }

            // java.exe es un proceso de consola. CREATE_NO_WINDOW evita que
            // Windows abra una ventana CMD al iniciar la aplicación empaquetada.
            #[cfg(target_os = "windows")]
            backend_command.creation_flags(0x08000000);

            let child = backend_command
                .spawn()
                .expect("No se pudo iniciar el backend Java incluido con Penké.");

            let state: State<JavaProcess> = app.state();
            *state.0.lock().unwrap() = Some(child);

            std::thread::spawn(move || {
                if !wait_for_backend(&token, 20000) {
                    eprintln!("CRÍTICO: backend no respondió en 20s");
                    return;
                }
                println!("Backend listo en :8765");
                match version_backend_actual(&token) {
                    Some(ref info)
                        if info.version == BACKEND_VERSION
                            && info.build_id == BACKEND_BUILD_ID
                            && info.api_version == BACKEND_API_VERSION =>
                    {
                        println!(
                            "Versión verificada: v{} buildId={} apiVersion={}",
                            info.version, info.build_id, info.api_version
                        );
                    }
                    Some(info) => {
                        eprintln!(
                            "CRÍTICO: backend incompatible — v{} buildId={} apiVersion={} \
                             (se esperaba v{} buildId={} apiVersion={}). Terminando proceso.",
                            info.version,
                            info.build_id,
                            info.api_version,
                            BACKEND_VERSION,
                            BACKEND_BUILD_ID,
                            BACKEND_API_VERSION
                        );
                        let state: tauri::State<JavaProcess> = app_handle.state();
                        if let Some(mut child) = state.0.lock().unwrap().take() {
                            let _ = child.kill();
                        };
                    }
                    None => {
                        eprintln!(
                            "ADVERTENCIA: backend arrancó pero no respondió al check de versión"
                        );
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state: State<JavaProcess> = window.state();
                let child = state.0.lock().unwrap().take();
                if let Some(mut c) = child {
                    let _ = c.kill();
                };
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
