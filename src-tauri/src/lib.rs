use std::process::Command;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn run_and_check(program: &str, args: &[&str]) -> Result<(), String> {
    let output = Command::new(program)
        .args(args)
        .output()
        .map_err(|error| format!("No se pudo ejecutar '{program}': {error}"))?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let details = if stderr.is_empty() {
        format!("Código de salida: {:?}", output.status.code())
    } else {
        stderr
    };

    Err(format!(
        "El comando '{program} {}' falló. {details}",
        args.join(" ")
    ))
}

fn try_commands(attempts: &[(&str, Vec<&str>)]) -> Result<(), String> {
    let mut errors: Vec<String> = Vec::new();

    for (program, args) in attempts {
        match run_and_check(program, args) {
            Ok(()) => return Ok(()),
            Err(error) => errors.push(error),
        }
    }

    Err(errors.join(" | "))
}

#[tauri::command]
fn lock_session() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return run_and_check("rundll32.exe", &["user32.dll,LockWorkStation"]);
    }

    #[cfg(target_os = "macos")]
    {
        return try_commands(&[
            (
                "/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession",
                vec!["-suspend"],
            ),
            (
                "/usr/bin/osascript",
                vec![
                    "-e",
                    "tell application \"System Events\" to keystroke \"q\" using {control down, command down}",
                ],
            ),
            ("/usr/bin/open", vec!["-a", "ScreenSaverEngine"]),
            ("/usr/bin/pmset", vec!["displaysleepnow"]),
        ])
        .map_err(|error| format!("No se pudo bloquear la sesión en macOS. {error}"));
    }

    #[cfg(target_os = "linux")]
    {
        let attempts = [
            ("loginctl", vec!["lock-session"]),
            ("xdg-screensaver", vec!["lock"]),
            ("gnome-screensaver-command", vec!["-l"]),
        ];
        return try_commands(&attempts).map_err(|_| {
            "No se encontró un comando compatible para bloquear la sesión en Linux.".to_string()
        });
    }

    #[allow(unreachable_code)]
    Err("Sistema operativo no soportado para bloqueo de sesión.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, lock_session])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
