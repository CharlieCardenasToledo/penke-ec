# Recursos de marca — Penké

Este directorio contiene los assets maestros de la identidad de Penké.

## Estructura

```
brand/
├── master/          ← SVGs y PNGs maestros (fuente de verdad)
│   ├── penke-isotipo.svg              Símbolo solo
│   ├── penke-isotipo.png
│   ├── penke-logotipo.svg             Nombre tipográfico
│   ├── penke-logotipo.png
│   ├── penke-imagotipo.svg            Símbolo + nombre (uso principal)
│   ├── penke-imagotipo.png
│   ├── penke-imagotipo-descriptor.svg Imagotipo + "Firma digital para Ecuador"
│   ├── penke-imagotipo-descriptor.png
│   ├── penke-app-icon.svg             Icono de escritorio (fondo #0F172A)
│   └── penke-app-icon.png             PNG fuente para `tauri icon`
└── variants/        ← Variantes cromáticas (pendiente)
```

## Paleta

| Token | Hex | Uso |
|---|---|---|
| Azul Firma | `#2563EB` | Acciones primarias, isotipo, navegación activa |
| Tinta Penké | `#0F172A` | Sidebar, fondos oscuros, texto de alto énfasis |
| Verde Penké | `#0E8F79` | Check del isotipo, acento de autenticidad |
| Oro Sello | `#C89532` | Detalles editoriales — uso muy limitado |

## Variantes pendientes

- `penke-isotipo-white.svg` — sobre fondos oscuros
- `penke-isotipo-dark.svg` — monocromático oscuro
- `penke-isotipo-micro.svg` — versión simplificada para 16/24 px
- `penke-imagotipo-white.svg` — texto blanco para sidebar (generada en `src/assets/`)
- `penke-imagotipo-horizontal-white.svg`
- `penke-isologo-compacto.svg` — símbolo + nombre en unidad inseparable

## Regenerar iconos de la aplicación

```bash
npx tauri icon brand/master/penke-app-icon.png
```

## Área de protección

- Imagotipo: espacio libre mínimo de **1x** (altura de la "e" minúscula) en todos los lados.
- Isotipo: espacio libre mínimo de **0,75x**.
- Tamaño mínimo imagotipo en pantalla: **96 px de ancho**.
- Tamaño mínimo isotipo en pantalla: **16 px**.

## Usos incorrectos

- No quitar el acento de Penké.
- No usar "PENKE", "Penke" ni "PenkéEC".
- No rotar ni deformar el isotipo.
- No combinar con escudos o logos institucionales.
- No usar el texto del logotipo como isotipo en tamaños pequeños.
- No colocar la versión de texto oscuro sobre fondos oscuros sin la variante blanca.
