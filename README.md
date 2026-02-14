# TaskGuard

TaskGuard es una app de escritorio (Angular + Tauri + Rust) que usa la cámara para detectar ausencia y bloquear la sesión automáticamente.

## Requisitos

- Node.js 22 LTS (recomendado)
- npm
- Rust (stable) + Cargo
- Dependencias de Tauri para tu sistema operativo

## Levantar la app en desarrollo

Desde la raíz del proyecto:

```bash
npm install
npm run tauri dev
```

## Compilar

Frontend:

```bash
npm run build
```

Backend Rust (verificación):

```bash
cd src-tauri
cargo check
```

## Cómo usar TaskGuard

1. Abre la app y pulsa **Iniciar monitor**.
2. Acepta permisos de cámara cuando el sistema lo pida.
3. Ajusta el umbral de ausencia (1 a 5 segundos).
4. Si no se detecta rostro durante el umbral, la app intentará bloquear la sesión.
5. Puedes probar manualmente con **Bloquear sesión ahora**.

## Comportamiento de bloqueo por sistema

- **macOS**: intenta varios métodos de bloqueo compatibles (incluyendo atajo de bloqueo del sistema).
- **Windows**: usa el equivalente a `Win + L`.
- **Linux**: intenta comandos comunes según el entorno de escritorio.

## Notas importantes

- En macOS puede ser necesario conceder permisos de Accesibilidad/Automatización para el bloqueo por script.
- Si usas una versión no LTS de Node, Angular puede mostrar advertencias.
