use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, State};

const BACKEND_VERSION: &str = "1.0.1";
const BACKEND_BUILD_ID: &str = "2026-08-05";
const BACKEND_API_VERSION: u32 = 2;

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
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };
        let _ = write!(out, "{}{}{}{}",
            CHARS[b0 >> 2] as char,
            CHARS[((b0 & 3) << 4) | (b1 >> 4)] as char,
            if chunk.len() > 1 { CHARS[((b1 & 0xf) << 2) | (b2 >> 6)] as char } else { '=' },
            if chunk.len() > 2 { CHARS[b2 & 0x3f] as char } else { '=' },
        );
    }
    out
}

struct JavaProcess(Mutex<Option<Child>>);

fn find_java() -> String {
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let path = format!("{}\\bin\\java.exe", java_home);
        if std::path::Path::new(&path).exists() {
            return path;
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

fn pid_file() -> std::path::PathBuf {
    std::env::temp_dir().join("penke-backend.pid")
}

fn guardar_pid(pid: u32) {
    let _ = std::fs::write(pid_file(), pid.to_string());
}

fn matar_backend_anterior() {
    // Capa 1: matar por PID guardado
    let file = pid_file();
    if let Ok(content) = std::fs::read_to_string(&file) {
        if let Ok(pid) = content.trim().parse::<u32>() {
            println!("Terminando backend anterior (PID {})...", pid);
            #[cfg(target_os = "windows")]
            let _ = Command::new("taskkill").args(["/F", "/PID", &pid.to_string()]).output();
            #[cfg(not(target_os = "windows"))]
            let _ = Command::new("kill").args(["-9", &pid.to_string()]).output();
        }
        let _ = std::fs::remove_file(&file);
    }

    // Capa 2: fallback por puerto (primera ejecución o proceso huérfano)
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("powershell")
            .args([
                "-NoProfile", "-NonInteractive", "-Command",
                "Get-Process -Id (Get-NetTCPConnection -LocalPort 8765 -State Listen \
                 -ErrorAction SilentlyContinue).OwningProcess \
                 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue",
            ])
            .output();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = Command::new("sh")
            .args(["-c", "lsof -ti:8765 | xargs kill -9 2>/dev/null || true"])
            .output();
    }

    std::thread::sleep(Duration::from_millis(600));
}

#[derive(Debug)]
struct BackendInfo {
    version: String,
    build_id: String,
    api_version: u32,
}

fn version_backend_actual() -> Option<BackendInfo> {
    let text = reqwest::blocking::Client::builder()
        .timeout(Duration::from_millis(800))
        .build()
        .ok()?
        .get("http://localhost:8765/version")
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
        let api_version = val
            .get("apiVersion")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;
        return Some(BackendInfo { version, build_id, api_version });
    }

    // Formato texto plano (backend antiguo 1.0.0)
    Some(BackendInfo {
        version: text.to_string(),
        build_id: String::new(),
        api_version: 0,
    })
}

fn backend_responde() -> bool {
    reqwest::blocking::Client::builder()
        .timeout(Duration::from_millis(800))
        .build()
        .ok()
        .and_then(|c| c.get("http://localhost:8765/health").send().ok())
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

fn wait_for_backend(timeout_ms: u64) -> bool {
    let deadline = std::time::Instant::now() + Duration::from_millis(timeout_ms);
    while std::time::Instant::now() < deadline {
        if backend_responde() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    false
}

fn necesita_reiniciar() -> bool {
    match version_backend_actual() {
        Some(info) => {
            let version_ok  = info.version    == BACKEND_VERSION;
            let build_ok    = info.build_id   == BACKEND_BUILD_ID;
            let api_ok      = info.api_version == BACKEND_API_VERSION;
            if version_ok && build_ok && api_ok {
                println!(
                    "Backend v{} (buildId={}, apiVersion={}) ya corriendo y actualizado.",
                    info.version, info.build_id, info.api_version
                );
                false
            } else {
                println!(
                    "Backend activo (v{}, buildId={}, apiVersion={}) != esperado (v{}, buildId={}, apiVersion={}). Reiniciando.",
                    info.version, info.build_id, info.api_version,
                    BACKEND_VERSION, BACKEND_BUILD_ID, BACKEND_API_VERSION
                );
                true
            }
        }
        None => {
            println!("Backend no responde a /version. Reiniciando.");
            true
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![leer_archivo_base64, carpeta_penke_defecto])
        .manage(JavaProcess(Mutex::new(None)))
        .setup(|app| {
            if backend_responde() && !necesita_reiniciar() {
                return Ok(());
            }

            matar_backend_anterior();

            let jar_path = match resolve_jar(app) {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("ERROR CRÍTICO: {}", e);
                    panic!("{}", e);
                }
            };

            let java = find_java();
            let jar_size = std::fs::metadata(&jar_path)
                .map(|m| m.len())
                .unwrap_or(0);

            println!(
                "Backend JAR: {:?} ({:.1} MB)",
                jar_path,
                jar_size as f64 / 1_048_576.0
            );
            println!("Lanzando backend v{}: {} -jar {:?}", BACKEND_VERSION, java, jar_path);

            let child = Command::new(&java)
                .arg("-jar")
                .arg(&jar_path)
                .spawn()
                .expect("No se pudo iniciar el backend Java. Verifica que Java esté instalado.");

            guardar_pid(child.id());

            let state: State<JavaProcess> = app.state();
            *state.0.lock().unwrap() = Some(child);

            std::thread::spawn(|| {
                if !wait_for_backend(20000) {
                    eprintln!("ADVERTENCIA: backend no respondió en 20s");
                    return;
                }
                println!("Backend listo en :8765");
                match version_backend_actual() {
                    Some(info)
                        if info.version    == BACKEND_VERSION
                        && info.build_id   == BACKEND_BUILD_ID
                        && info.api_version == BACKEND_API_VERSION =>
                    {
                        println!(
                            "Versión verificada: v{} buildId={} apiVersion={}",
                            info.version, info.build_id, info.api_version
                        );
                    }
                    Some(info) => {
                        eprintln!(
                            "ADVERTENCIA: backend arrancó pero con versión incorrecta: \
                             v{} buildId={} apiVersion={}. Se esperaba v{} buildId={} apiVersion={}.",
                            info.version, info.build_id, info.api_version,
                            BACKEND_VERSION, BACKEND_BUILD_ID, BACKEND_API_VERSION
                        );
                    }
                    None => {
                        eprintln!("ADVERTENCIA: backend arrancó pero no respondió al check de versión");
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
                    let _ = std::fs::remove_file(pid_file());
                };
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
