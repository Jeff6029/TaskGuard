# TaskGuard

TaskGuard is a desktop app (Angular + Tauri + Rust) that uses your camera to detect absence and automatically lock the session.

## Requirements

- Node.js 22 LTS (recommended)
- npm
- Rust (stable) + Cargo
- Tauri prerequisites for your operating system

## Run in development

From the project root:

```bash
npm install
npm run tauri dev
```

## Build

Frontend:

```bash
npm run build
```

Rust backend (check):

```bash
cd src-tauri
cargo check
```

## How to use TaskGuard

1. Open the app and click **Start monitor**.
2. Allow camera permissions when prompted by the OS.
3. Set the absence threshold (1 to 5 seconds).
4. If no face is detected for the configured threshold, the app will attempt to lock the session.
5. You can test manually with **Lock session now**.

## Lock behavior by operating system

- **macOS**: tries multiple compatible lock methods (including the system lock shortcut).
- **Windows**: uses the equivalent of `Win + L`.
- **Linux**: tries common lock commands depending on the desktop environment.

## Important notes

- On macOS, you may need to grant Accessibility/Automation permissions for script-based locking.
- If you use a non-LTS Node version, Angular may show warnings.
