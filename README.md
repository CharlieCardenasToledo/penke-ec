<p align="center">
  <img src="./brand/master/penke-imagotipo.svg" alt="Penké" width="360" />
</p>

<p align="center"><strong>Tu firma digital, auténtica.</strong></p>

<p align="center">
  <a href="https://github.com/CharlieCardenasToledo/penke-ec/actions/workflows/ci.yml"><img src="https://github.com/CharlieCardenasToledo/penke-ec/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/CharlieCardenasToledo/penke-ec/releases/latest"><img src="https://img.shields.io/github/v/release/CharlieCardenasToledo/penke-ec?display_name=tag&sort=semver" alt="Última versión" /></a>
  <img src="https://img.shields.io/badge/plataformas-Windows%20%7C%20macOS%20%7C%20Linux-2563eb" alt="Plataformas" />
  <img src="https://img.shields.io/badge/licencia-MIT-16a34a" alt="Licencia MIT" />
</p>

Penké es una aplicación de escritorio para firmar, verificar y validar documentos PDF con certificados digitales acreditados en Ecuador. Funciona de forma local y no requiere instalar Java ni componentes adicionales para utilizarla.

> El nombre *Penké* se inspira en una expresión de la lengua Shuar asociada con lo auténtico y verdadero.

## Descargas

Versión estable actual: **[v1.0.2](https://github.com/CharlieCardenasToledo/penke-ec/releases/tag/v1.0.2)**

### Windows

| Instalador | Recomendado para | Enlace |
|---|---|---|
| `.exe` | Instalación sencilla para la mayoría de usuarios | [Descargar instalador Windows](https://github.com/CharlieCardenasToledo/penke-ec/releases/download/v1.0.2/Penke.EC_1.0.2_x64-setup.exe) |
| `.msi` | Despliegues administrados y empresariales | [Descargar paquete MSI](https://github.com/CharlieCardenasToledo/penke-ec/releases/download/v1.0.2/Penke.EC_1.0.2_x64_en-US.msi) |

### macOS

| Paquete | Arquitectura | Enlace |
|---|---|---|
| `.dmg` | Universal — Intel y Apple Silicon | [Descargar instalador macOS](https://github.com/CharlieCardenasToledo/penke-ec/releases/download/v1.0.2/Penke.EC_1.0.2_universal.dmg) |
| `.tar.gz` | Universal — distribución alternativa | [Descargar paquete macOS](https://github.com/CharlieCardenasToledo/penke-ec/releases/download/v1.0.2/Penke.EC_universal.app.tar.gz) |

### Linux

| Paquete | Distribuciones | Enlace |
|---|---|---|
| `.AppImage` | Portátil; compatible con la mayoría de distribuciones | [Descargar AppImage](https://github.com/CharlieCardenasToledo/penke-ec/releases/download/v1.0.2/Penke.EC_1.0.2_amd64.AppImage) |
| `.deb` | Debian, Ubuntu y derivadas | [Descargar paquete DEB](https://github.com/CharlieCardenasToledo/penke-ec/releases/download/v1.0.2/Penke.EC_1.0.2_amd64.deb) |
| `.rpm` | Fedora, RHEL, openSUSE y derivadas | [Descargar paquete RPM](https://github.com/CharlieCardenasToledo/penke-ec/releases/download/v1.0.2/Penke.EC-1.0.2-1.x86_64.rpm) |

Consulta la [página completa de releases](https://github.com/CharlieCardenasToledo/penke-ec/releases) para ver el historial y las notas de cada versión.

## Funcionalidades

- Configuración guiada de la identidad digital.
- Compatibilidad con certificados `.p12` / `.pfx` y tokens USB (HSM).
- Visor PDF integrado con posicionamiento de firma por clic.
- Firma individual y firma en lote de múltiples documentos.
- Perfiles de firma guardados para reutilizar configuraciones.
- Contraseña local protegida mediante almacenamiento seguro.
- Autocomplete de provincias, cantones y parroquias del Ecuador.
- Selección de carpeta de destino e historial de documentos firmados.
- Validación e inspección de firmas digitales existentes.

## Requisitos de uso

Los instaladores incluyen el backend y no requieren Java, Maven, Rust ni Node.js. Solo necesitas:

- Windows, macOS o Linux compatible.
- Un certificado digital `.p12` / `.pfx` válido o un token USB compatible.
- Un documento PDF que deseas firmar.

## Desarrollo local

### Requisitos

- Node.js 22.13 o superior (recomendado: Node.js 24).
- Java 17 o superior.
- Maven 3.9 o superior.
- Rust con el toolchain estable.

### Comandos

```bash
# Instalar dependencias del frontend
npm install

# Ejecutar la aplicación completa en modo desarrollo
npm run dev:desktop

# Ejecutar pruebas del frontend
npm test

# Crear el build de producción para escritorio
npm run build:desktop
```

`npm run dev:desktop` compila el backend Java, inicia el servicio local y abre la aplicación Tauri. En Windows, Maven debe estar disponible en el `PATH` o definirse mediante `MAVEN_HOME`.

## Arquitectura

```text
Penké EC
├── Frontend: React 19 + TypeScript + Tailwind CSS v4
├── Desktop:  Tauri 2 (Rust) — ventana nativa y acceso al sistema
└── Backend:  Java 17 + Javalin — servicio local en 127.0.0.1:8765
              └── FirmaDigital — lógica criptográfica de FirmaEC
```

El backend Java se inicia y se cierra junto con la aplicación. El instalador incluye el backend empaquetado, por lo que el usuario final no necesita instalar software adicional.

| Capa | Tecnología |
|---|---|
| Escritorio | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript |
| Estilos | Tailwind CSS v4 |
| Animaciones | Framer Motion |
| Visor PDF | pdfjs-dist |
| Backend | Java 17 + Javalin |
| Criptografía | FirmaDigital — GPL v3 |

## Releases

Para crear una nueva versión desde un entorno autorizado:

```bash
npm run release patch   # Correcciones
npm run release minor   # Nuevas funcionalidades compatibles
npm run release major   # Cambios incompatibles
```

El workflow de GitHub Actions genera automáticamente los instaladores para Windows, macOS y Linux al publicar un tag `v*`. El pipeline incluye la compilación y verificación del backend Java, además del empaquetado Tauri.

## Recursos de marca

Los assets maestros de identidad están en [`brand/master/`](./brand/master/):

| Archivo | Uso |
|---|---|
| `penke-isotipo.svg` | Símbolo para iconos, avatares e indicadores |
| `penke-logotipo.svg` | Nombre tipográfico para encabezados y documentos |
| `penke-imagotipo.svg` | Símbolo + nombre para uso principal |
| `penke-imagotipo-descriptor.svg` | Imagotipo con descriptor institucional |
| `penke-app-icon.svg/png` | Fuente maestra del icono de escritorio |

## Aviso legal

Este proyecto es software independiente y **no es un producto oficial** del Ministerio de Telecomunicaciones y de la Sociedad de la Información (MINTEL) del Ecuador, ni está afiliado, respaldado ni autorizado por MINTEL.

“FirmaEC” y los logos asociados son marcas de MINTEL Ecuador.

Este proyecto utiliza la librería **FirmaDigital**, distribuida por MINTEL bajo licencia **GNU GPL v3**, para realizar el proceso criptográfico de firma. La librería está disponible en [minka.gob.ec/mintel](https://minka.gob.ec/mintel/ge/firmaec/firmadigital-libreria).

La validez de cada firma depende del certificado utilizado, su vigencia, la integridad del documento y la normativa aplicable. El software se proporciona “tal cual”, sin garantía de ningún tipo; su uso es responsabilidad exclusiva del usuario.

## Licencia

MIT © 2025 Charlie Cárdenas Toledo

> Debido al uso de componentes distribuidos bajo GPL v3, cualquier redistribución modificada debe cumplir también con los términos de dicha licencia.
