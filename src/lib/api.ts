const BASE = "http://localhost:8765";

export class ApiError extends Error {
  constructor(message: string, public readonly code?: string, public readonly path?: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new ApiError(text || `Error HTTP ${res.status}`); }
  if (!res.ok) {
    throw new ApiError(
      (data.error as string) ?? "Error desconocido",
      data.code as string | undefined,
      data.path as string | undefined
    );
  }
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new ApiError(text || `Error HTTP ${res.status}`); }
  if (!res.ok) {
    throw new ApiError(
      (data.error as string) ?? "Error desconocido",
      data.code as string | undefined
    );
  }
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
  /** Borde izquierdo del sello en coords PDF (lower-left). El backend convierte al anclaje de FirmaEC. */
  stampLeft?: number;
  /** Borde inferior del sello en coords PDF (lower-left). El backend convierte al anclaje de FirmaEC. */
  stampBottom?: number;
  /** Carpeta base donde se creará {carpetaBaseUsuario}/Penké Firmas/{nombre}_penke.pdf */
  carpetaBaseUsuario?: string;
}

export interface PlacementUsed {
  page: number;
  /** Borde izquierdo real del sello en coords PDF (del /Rect inspeccionado post-firma) */
  left: number;
  bottom: number;
  right?: number;
  top?: number;
  widthPt: number;
  heightPt: number;
}

export interface FirmarResponse {
  rutaFirmado: string;
  carpetaSalida?: string;
  nombreFirmado?: string;
  firmante: string;
  cedula: string;
  backendBuildId?: string;
  /** Posición efectiva del sello (solo cuando hay estampado visible). Útil para calibración. */
  placementUsed?: PlacementUsed;
}

export interface PlacementInfoRequest {
  rutaDocumento: string;
  pagina?: number;
  estampado?: string;
}

export interface PlacementInfoResponse {
  page: {
    left: number;
    bottom: number;
    right: number;
    top: number;
    rotation: number;
    numPages: number;
  };
  stamp: {
    widthPt: number;
    heightPt: number;
    anchor: "LOWER_LEFT";
    type: string;
  };
  defaultPosition: {
    x: number;
    y: number;
  };
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
  firmar:         (req: FirmarRequest) => post<FirmarResponse>("/firmar", req),
  placementInfo:  (req: PlacementInfoRequest) => post<PlacementInfoResponse>("/pdf/placement-info", req),
  verificar:      (rutaDocumento: string) => post<VerificarResponse>("/verificar", { rutaDocumento }),
  validar:        (rutaCertificado: string, clave: string) => post<ValidarResponse>("/validar", { rutaCertificado, clave }),
  tokens:         () => get<TokensResponse>("/tokens"),
};
