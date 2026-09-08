# Changelog

## [1.0.5] — 2026-09-08

### Correcciones de interfaz
- Fijado el sidebar a la ventana para que no desaparezca al desplazarse por el contenido.
- Separado el desplazamiento interno de los enlaces del pie de la barra lateral.
- La acción «Buscar actualizaciones» permanece visible en todo momento.

## [1.0.4] — 2026-09-08

### Nuevas funcionalidades
- Añadido actualizador integrado para comprobar nuevas versiones desde la aplicación.
- Se muestran la versión disponible y las notas de la release antes de instalar.
- Descarga e instalación de paquetes firmados con indicador de progreso y reinicio seguro.
- Disponible la comprobación manual desde la barra lateral.

### Distribución
- Configurados artefactos firmados para Windows, macOS y Linux.
- El workflow valida la clave de firmado antes de publicar cualquier release.

## [1.0.3] — 2026-09-08

### Mejoras
- Añadida la leyenda visible «Firmado mediante Penke» en los documentos con sello.
- La leyenda se incorpora antes de la firma PAdES para preservar la validez criptográfica.
- Actualizada la vista previa del posicionamiento para reflejar el sello final.

### Verificación
- Backend Java compilado correctamente en Windows.
- 18 pruebas Maven y 24 pruebas frontend aprobadas.

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
