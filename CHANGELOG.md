# Changelog

## [1.0.3] — 2026-09-08

> Describe los cambios de esta versión aquí antes de hacer el release.

## [1.0.2] — 2026-09-07

### Correcciones
- Corregida la configuración CORS del backend para permitir las peticiones desde Tauri durante la firma.

## [1.0.0] — 2025

### Primera versión pública

#### Funcionalidades
- Onboarding guiado en 6 pasos para configurar certificado digital
- Soporte para certificados `.p12` / `.pfx` y Token USB (HSM)
- Visor de PDF integrado con posicionamiento de firma por clic
- Firma en lote — múltiples PDFs en una sola operación
- Perfiles de firma guardados con nombre personalizado
- Opción de recordar contraseña localmente (cifrada en disco)
- Autocomplete de localización con provincias, cantones y parroquias del Ecuador
- Selección de carpeta de destino para documentos firmados
- Historial de documentos firmados en el sidebar
- Verificación de firmas existentes en documentos PDF
- Validación de certificados digitales contra MINTEL

#### Técnico
- Tauri 2 (Rust) + React 19 + TypeScript + Tailwind CSS v4
- Backend Java 17 + Javalin bundleado — sin dependencias externas
- Usa FirmaDigital GPL v3 (MINTEL) para el proceso criptográfico
- Animaciones con Framer Motion
- Visor PDF con pdfjs-dist
