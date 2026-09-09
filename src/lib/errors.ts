import { ApiError } from "./api";

export function traducirErrorFirma(e: unknown): string {
  if (e instanceof ApiError && e.code) {
    switch (e.code) {
      case "CERT_LOAD_FAILED":               return "Contraseña incorrecta. Verifica la clave de tu certificado.";
      case "DOCUMENT_NOT_FOUND":             return "No se encontró el archivo. Verifica que siga en la misma ubicación.";
      case "OUTPUT_DIRECTORY_NOT_WRITABLE":  return "No se puede escribir en la carpeta de destino. Verifica los permisos.";
      case "OUTPUT_DIRECTORY_CREATE_FAILED": return "No se pudo crear la carpeta de destino. Verifica los permisos.";
      case "OUTPUT_WRITE_FAILED":            return "Error al guardar el archivo firmado. El disco podría estar lleno.";
      case "SIGNED_BYTES_EMPTY":             return "El proceso de firma no generó datos. Verifica el certificado y el PDF.";
      case "STAMP_OUT_OF_BOUNDS":
        return "La firma quedaría parcialmente fuera de la página. Vuelve a elegir su posición.";
      case "INVALID_PAGE":
        return "La página seleccionada no existe en este documento.";
      case "MISSING_FIELD":
        return e.message;
    }
  }
  const raw = e instanceof Error ? e.message : String(e);
  const r = raw.toLowerCase();
  if (r.includes("sesión no autorizada") || r.includes("unauthorized"))
    return "El motor de firma quedó desincronizado después de una actualización. Reinicia Penké e inténtalo de nuevo.";
  if (r.includes("password") || r.includes("mac check") || r.includes("wrong password") || r.includes("incorrect"))
    return "Contraseña incorrecta. Verifica la clave de tu certificado.";
  if (r.includes("ocsp") || r.includes("revoc") || r.includes("revoked"))
    return "Tu certificado fue revocado. Contacta a tu entidad certificadora.";
  if (r.includes("expired") || r.includes("caducado") || r.includes("not valid"))
    return "Tu certificado está vencido. Renuévalo en tu entidad certificadora.";
  if (r.includes("no encontrado") || r.includes("not found") || r.includes("no such file"))
    return "No se encontró el archivo. Verifica que siga en la misma ubicación.";
  if (r.includes("token") || r.includes("keystore") || r.includes("pkcs11"))
    return "No se pudo acceder al Token USB. Verifica que esté conectado y desbloqueado.";
  if (r.includes("network") || r.includes("connect") || r.includes("timeout"))
    return "Sin conexión a internet. Penké necesita validar tu certificado en línea.";
  if (r.includes("pdf") || r.includes("invalid") || r.includes("corrupt"))
    return "El PDF parece estar dañado o protegido. Prueba con otro archivo.";
  return "Ocurrió un error al firmar. Intenta de nuevo o reinicia la aplicación.";
}
