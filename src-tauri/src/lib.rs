use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, State};

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

fn backend_ya_corre() -> bool {
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
        if backend_ya_corre() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![leer_archivo_base64])
        .manage(JavaProcess(Mutex::new(None)))
        .setup(|app| {
            // Si el backend ya responde (hot-reload), no lanzar otro
            if backend_ya_corre() {
                println!("Backend ya estaba corriendo en :8765");
                return Ok(());
            }

            let jar_path = resolve_jar(app);
            let java = find_java();

            println!("Lanzando backend: {} -jar {:?}", java, jar_path);

            let child = Command::new(&java)
                .arg("-jar")
                .arg(&jar_path)
                .spawn()
                .expect("No se pudo iniciar el backend Java. Verifica que Java esté instalado.");

            let state: State<JavaProcess> = app.state();
            *state.0.lock().unwrap() = Some(child);

            // Health-check en background, no bloquea la UI
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
                };
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
