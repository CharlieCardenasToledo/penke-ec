use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, State};

const BACKEND_VERSION: &str = "1.0.0";

#[tauri::command]
fn carpeta_penke_defecto() -> Result<String, String> {
    let docs = dirs::document_dir()
        .ok_or_else(|| "No se pudo obtener la carpeta Documentos".to_string())?;
    let destino = docs.join("Firmas Penké");
    std::fs::create_dir_all(&destino).map_err(|e| e.to_string())?;
    Ok(destino.to_string_lossy().to_string())
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

fn resolve_jar(app: &tauri::App) -> std::path::PathBuf {
    // 1. Junto al ejecutable (dev: target/debug/, prod: install dir)
    if let Ok(exe) = std::env::current_exe() {
        let candidate = exe.parent().unwrap_or(std::path::Path::new(".")).join("firmaec-backend.jar");
        if candidate.exists() {
            return candidate;
        }
    }
    // 2. resource_dir de Tauri (producción bundleada)
    if let Ok(res_dir) = app.path().resource_dir() {
        let candidate = res_dir.join("firmaec-backend.jar");
        if candidate.exists() {
            return candidate;
        }
    }
    std::path::PathBuf::from("firmaec-backend.jar")
}

fn pid_file() -> std::path::PathBuf {
    std::env::temp_dir().join("penke-backend.pid")
}

fn guardar_pid(pid: u32) {
    let _ = std::fs::write(pid_file(), pid.to_string());
}

fn matar_backend_anterior() {
    // Capa 1: matar por PID guardado (preciso, funciona en runs subsiguientes)
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

    // Capa 2: fallback por puerto (primera ejecución o proceso huérfano sin PID file)
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

    // Dar tiempo al SO para liberar el puerto
    std::thread::sleep(Duration::from_millis(600));
}

fn version_backend_actual() -> Option<String> {
    reqwest::blocking::Client::builder()
        .timeout(Duration::from_millis(800))
        .build()
        .ok()?
        .get("http://localhost:8765/version")
        .send()
        .ok()?
        .text()
        .ok()
        .map(|s| s.trim().to_string())
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
        Some(v) => {
            if v != BACKEND_VERSION {
                println!("Versión del backend activo ({}) != esperada ({}). Reiniciando.", v, BACKEND_VERSION);
                true
            } else {
                println!("Backend v{} ya corriendo y actualizado.", v);
                false
            }
        }
        // Si no responde /version (backend viejo sin ese endpoint), reiniciar también
        None => true,
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
            // Si hay un backend corriendo, comprobar si su versión coincide
            if backend_responde() && !necesita_reiniciar() {
                return Ok(());
            }

            // Matar el backend anterior por PID guardado
            matar_backend_anterior();

            let jar_path = resolve_jar(app);
            let java = find_java();

            println!("Lanzando backend v{}: {} -jar {:?}", BACKEND_VERSION, java, jar_path);

            let child = Command::new(&java)
                .arg("-jar")
                .arg(&jar_path)
                .spawn()
                .expect("No se pudo iniciar el backend Java. Verifica que Java esté instalado.");

            // Guardar PID para poder matarlo en la próxima sesión
            guardar_pid(child.id());

            let state: State<JavaProcess> = app.state();
            *state.0.lock().unwrap() = Some(child);

            std::thread::spawn(|| {
                if wait_for_backend(20000) {
                    println!("Backend listo en :8765");
                } else {
                    eprintln!("Advertencia: backend no respondió en 20s");
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
