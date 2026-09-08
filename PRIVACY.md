# Política de privacidad de Penké EC

**Última actualización:** 8 de septiembre de 2026

Penké EC es una aplicación independiente para firmar, verificar y validar documentos PDF con certificados digitales compatibles con Ecuador. Esta política explica qué información trata la aplicación.

## Tratamiento local

Los documentos PDF, certificados `.p12`/`.pfx`, contraseñas y datos introducidos para la firma se procesan localmente en el equipo del usuario. Penké no sube esos archivos ni las claves privadas a servidores propios.

El backend funciona únicamente en `127.0.0.1` y se comunica con la interfaz mediante un token de sesión local. La clave maestra de los datos protegidos se guarda en el almacén seguro del sistema operativo, como Windows Credential Manager.

## Comunicaciones externas

La aplicación puede consultar servicios oficiales necesarios para comprobar la vigencia o revocación de un certificado. También consulta GitHub Releases para detectar actualizaciones. Las actualizaciones se verifican mediante la firma criptográfica de Penké antes de instalarse.

Penké no utiliza publicidad, perfiles de seguimiento ni venta de datos personales.

## Historial y almacenamiento

Los perfiles de firma, preferencias e historial se almacenan localmente. El usuario puede eliminarlos desde el equipo y conserva control sobre los documentos generados.

## Terceros y licencia

Penké es software independiente y no es un producto oficial ni está afiliado a MINTEL Ecuador. Utiliza la librería FirmaDigital, distribuida por MINTEL bajo GPL v3, para el proceso criptográfico.

## Contacto

Para consultas sobre privacidad o seguridad, abre un issue en el [repositorio de Penké](https://github.com/CharlieCardenasToledo/penke-ec).
