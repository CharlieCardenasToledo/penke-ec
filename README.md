# Penké EC

**Tu firma digital, auténtica.**

Cliente de escritorio moderno para firmar documentos PDF con certificados digitales emitidos por entidades certificadoras acreditadas por ARCOTEL/MINTEL en Ecuador.

> *Penké* significa **"auténtico"** en idioma Shuar, lengua ancestral del pueblo Shuar del Ecuador.

---

## ¿Qué es Penké EC?

Penké EC es una interfaz de escritorio construida con [Tauri 2](https://tauri.app) + React que mejora la experiencia de uso del servidor local oficial de FirmaEC (distribuido por MINTEL). Ofrece:

- **Onboarding guiado** paso a paso para configurar tu certificado
- **Visor de PDF integrado** — revisa y ubica tu firma antes de firmar
- **Soporte para Token USB** físico (HSM)
- **Firma en lote** — firma múltiples PDFs de una sola vez
- **Perfiles de firma** — guarda y reutiliza tus configuraciones
- **Contraseña recordada** — evita ingresar tu clave cada vez
- **Localización con autocomplete** — todas las provincias, cantones y parroquias del Ecuador

## Requisito previo

> **Penké EC requiere que la aplicación oficial FirmaEC del MINTEL esté instalada en tu equipo.**

Descarga FirmaEC oficial: [https://www.firmadigital.gob.ec/descargar-firmaec/](https://www.firmadigital.gob.ec/descargar-firmaec/)

Penké EC se comunica únicamente con el servidor local oficial (`localhost:8765`) que FirmaEC instala en tu máquina. No realiza comunicaciones externas ni reemplaza ningún componente del sistema oficial.

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run tauri dev

# Build de producción
npm run tauri build
```

### Requisitos del sistema
- Windows 10/11 (64-bit)
- FirmaEC oficial instalado y en ejecución
- Node.js 18+
- Rust (para compilar desde fuente)

## Tecnologías

| Capa | Tecnología |
|---|---|
| Escritorio | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript |
| Estilos | Tailwind CSS v4 |
| Animaciones | Framer Motion |
| Visor PDF | pdfjs-dist |

## Aviso Legal / Legal Notice

Este proyecto es software independiente de terceros y **NO es un producto oficial** del Ministerio de Telecomunicaciones y de la Sociedad de la Información (MINTEL) del Ecuador, ni está afiliado, respaldado ni autorizado por MINTEL.

"FirmaEC" y los logos asociados son marcas del MINTEL Ecuador. Penké EC no redistribuye, modifica ni incluye ningún componente del servidor FirmaEC oficial.

La integración con el servidor local de FirmaEC fue desarrollada mediante inspección del tráfico de red HTTP (no decompilación de binarios), de conformidad con el principio de interoperabilidad del **Código Orgánico de la Economía Social de los Conocimientos, Creatividad e Innovación (INGENIOS)** de Ecuador. El servidor FirmaEC es software libre distribuido bajo GNU GPLv3 por MINTEL.

Los documentos firmados con Penké EC tienen la misma validez legal que los firmados con la aplicación oficial, ya que el proceso criptográfico lo realiza el servidor oficial de MINTEL en tu equipo.

**Este software se proporciona "tal cual" sin garantía de ningún tipo. El uso es responsabilidad exclusiva del usuario.**

## Licencia

MIT © 2025 Charlie Cárdenas Toledo

---

*Penké — auténtico en Shuar, lengua del pueblo Shuar del Ecuador.*
