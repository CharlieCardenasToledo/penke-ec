const BASE = "http://localhost:8765";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new Error(text || `Error HTTP ${res.status}`); }
  if (!res.ok) throw new Error((data.error as string) ?? "Error desconocido");
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new Error(text || `Error HTTP ${res.status}`); }
  if (!res.ok) throw new Error((data.error as string) ?? "Error desconocido");
  return data as T;
}

export interface FirmarRequest {
  rutaDocumento: string;
  rutaCertificado?: string;
  alias?: string;
  clave: string;
  tipoFirma: "archivo" | "token";
  estampado?: "QR" | "Simple" | "Avanzada";
  razonFirma?: string;
  localizacion?: string;
  pagina?: number;
  puntoX?: number;
  puntoY?: number;
  /** Carpeta base donde se creará {carpetaBaseUsuario}/Penké Firmas/{nombre}_penke.pdf */
  carpetaBaseUsuario?: string;
}

export interface FirmarResponse {
  rutaFirmado: string;
  carpetaSalida?: string;
  nombreFirmado?: string;
  firmante: string;
  cedula: string;
  backendBuildId?: string;
}

export interface Firma {
  cedula: string; firmante: string; entidad: string;
  fecha: string; estado: "valida" | "invalida"; razon: string;
}
export interface VerificarResponse { firmas: Firma[]; docValido: boolean; }

export interface ValidarResponse {
  valido: boolean; cedula: string; nombre: string; apellido: string;
  cargo: string; institucion: string; validoDesde: string; validoHasta: string;
  emisor: string; caducado: boolean; revocado: boolean;
}

export interface TokenInfo {
  alias: string; nombre: string; cedula: string;
  cargo: string; institucion: string; validoHasta: string;
}
export interface TokensResponse { tokens: TokenInfo[]; }

export const api = {
  firmar:    (req: FirmarRequest) => post<FirmarResponse>("/firmar", req),
  verificar: (rutaDocumento: string) => post<VerificarResponse>("/verificar", { rutaDocumento }),
  validar:   (rutaCertificado: string, clave: string) => post<ValidarResponse>("/validar", { rutaCertificado, clave }),
  tokens:    () => get<TokensResponse>("/tokens"),
};
