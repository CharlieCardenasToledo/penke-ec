# Contribuir a Penké EC

¡Gracias por tu interés en mejorar Penké EC! Aquí encontrarás todo lo que necesitas para empezar.

## Entorno de desarrollo

### Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18+ |
| Rust | stable (instalar con [rustup](https://rustup.rs)) |
| Java JDK | 17+ (solo para recompilar el backend) |

### Primeros pasos

```bash
git clone https://github.com/CharlieCardenasToledo/penke-ec.git
cd penke-ec
npm install
npm run tauri dev
```

La aplicación abrirá en modo desarrollo con hot-reload para el frontend. Los cambios en Rust requieren recompilación.

## Estructura del proyecto

```
penke-ec/
├── src/                    # Frontend React + TypeScript
│   ├── components/         # Componentes reutilizables
│   ├── pages/              # Páginas principales
│   ├── hooks/              # React hooks personalizados
│   ├── lib/                # Utilidades y API
│   └── data/               # Datos estáticos (geo Ecuador, etc.)
├── src-tauri/              # Backend Rust (Tauri)
│   ├── src/                # Código Rust
│   └── capabilities/       # Permisos de Tauri
└── firmaec-backend/        # Backend Java (Javalin)
    └── src/                # Código Java
```

## Flujo de trabajo

1. Crea un fork del repositorio
2. Crea una rama desde `master`: `git checkout -b feat/mi-mejora`
3. Haz tus cambios y verifica que TypeScript compile: `npx tsc --noEmit`
4. Prueba el flujo completo de firma en Windows
5. Abre un Pull Request describiendo los cambios

## Convenciones

- **Commits**: usa prefijos convencionales — `feat:`, `fix:`, `docs:`, `refactor:`, `ci:`
- **Idioma**: código y nombres de variables en inglés; UI y comentarios en español
- **Tailwind**: usa clases de Tailwind v4, no estilos en línea
- **Componentes**: un componente por archivo, nombre en PascalCase

## Reportar errores

Usa las plantillas de issues en GitHub. Incluye siempre la versión de Penké EC y el tipo de certificado que usas.

## Aviso legal

Al contribuir, aceptas que tu código se distribuya bajo la misma licencia del proyecto (MIT, con la nota sobre GPL v3 por el uso de FirmaDigital). No incluyas código con licencias incompatibles.
