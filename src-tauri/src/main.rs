#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{Manager, RunEvent};

struct ApiProcess(Mutex<Option<Child>>);

fn server_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("server")
            .join("src")
            .join("app.js"))
    } else {
        Ok(app
            .path()
            .resource_dir()
            .map_err(|error| error.to_string())?
            .join("server")
            .join("src")
            .join("app.js"))
    }
}

fn start_api(app: &tauri::AppHandle) -> Result<Child, String> {
    let script = server_path(app)?;
    let working_directory = script
        .parent()
        .and_then(|path| path.parent())
        .and_then(|path| path.parent())
        .ok_or_else(|| "Could not determine API working directory".to_string())?;

    let mut child = Command::new(if cfg!(windows) { "node.exe" } else { "node" })
        .arg(&script)
        .current_dir(working_directory)
        .env("NODE_ENV", "production")
        .spawn()
        .map_err(|error| format!("Failed to start language API: {error}"))?;

    for _ in 0..30 {
        if child.try_wait().map_err(|error| error.to_string())?.is_some() {
            return Err("Language API stopped during startup".to_string());
        }

        if std::net::TcpStream::connect("127.0.0.1:8787").is_ok() {
            return Ok(child);
        }

        thread::sleep(Duration::from_millis(200));
    }

    let _ = child.kill();
    Err("Language API did not start listening on port 8787".to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let child = start_api(app.handle()).map_err(std::io::Error::other)?;
            app.manage(ApiProcess(Mutex::new(Some(child))));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running Language Learning")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                if let Some(state) = app.try_state::<ApiProcess>() {
                    if let Ok(mut process) = state.0.lock() {
                        if let Some(child) = process.as_mut() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
