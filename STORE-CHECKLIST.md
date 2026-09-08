# Checklist de publicación en Microsoft Store

Estado de preparación de Penké EC para la modalidad MSI/EXE.

## Resuelto en el repositorio

- [x] Aplicación Tauri 2 con instalador MSI/EXE.
- [x] Backend FirmaEC incluido en el instalador.
- [x] Runtime Java 17 mínimo generado con `jlink` y empaquetado como `runtime/`.
- [x] La aplicación usa primero el Java embebido; `JAVA_HOME` queda como fallback para desarrollo.
- [x] Instaladores y artefactos del updater se generan en GitHub Actions.
- [x] Política de privacidad local: [PRIVACY.md](./PRIVACY.md).
- [x] Política pública disponible en `https://penke.ec/privacidad`.

## Pendiente fuera del código

- [ ] Obtener un certificado Authenticode o contratar un servicio de firma confiable.
- [ ] Firmar el ejecutable principal, cualquier otro PE incluido y el MSI con timestamp.
- [ ] Guardar el certificado y contraseña en secretos de GitHub; nunca en el repositorio.
- [ ] Probar instalación y desinstalación silenciosas en una VM Windows 11 sin Java.
- [ ] Verificar la firma con `signtool verify /pa`.
- [ ] Crear la cuenta Partner Center y reservar el nombre de la aplicación.
- [ ] Configurar el dominio personalizado `penke.ec` en Firebase App Hosting.

La firma `TAURI_SIGNING_PRIVATE_KEY` protege las actualizaciones de Tauri, pero no reemplaza Authenticode. No se debe presentar el MSI en Store hasta completar esa firma y las pruebas en una máquina limpia.
