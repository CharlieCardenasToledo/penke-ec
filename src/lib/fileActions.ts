import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";

export type FileErrorType =
  | "FILE_NOT_FOUND"
  | "NO_DEFAULT_APP"
  | "PERMISSION_DENIED"
  | "SYSTEM_ERROR";

export interface FileActionResult {
  ok: boolean;
  errorType?: FileErrorType;
  rawMessage?: string;
}

function classifyError(err: unknown): FileErrorType {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes("no such file") || msg.includes("not found") || msg.includes("does not exist"))
    return "FILE_NOT_FOUND";
  if (
    msg.includes("no application") ||
    msg.includes("no default") ||
    msg.includes("shellexecute") ||
    msg.includes("no handler") ||
    msg.includes("failed to open") && msg.includes("pdf")
  )
    return "NO_DEFAULT_APP";
  if (msg.includes("permission") || msg.includes("access denied") || msg.includes("forbidden"))
    return "PERMISSION_DENIED";
  return "SYSTEM_ERROR";
}

export async function openWithDefaultApp(ruta: string): Promise<FileActionResult> {
  try {
    await openPath(ruta);
    return { ok: true };
  } catch (err) {
    const errorType = classifyError(err);
    const rawMessage = err instanceof Error ? err.message : String(err);
    console.error("[fileActions] openWithDefaultApp falló:", rawMessage);
    return { ok: false, errorType, rawMessage };
  }
}

export async function revealInFolder(ruta: string): Promise<FileActionResult> {
  try {
    await revealItemInDir(ruta);
    return { ok: true };
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : String(err);
    console.error("[fileActions] revealInFolder falló:", rawMessage);
    return { ok: false, errorType: "SYSTEM_ERROR", rawMessage };
  }
}

export async function copyPath(ruta: string): Promise<FileActionResult> {
  try {
    await navigator.clipboard.writeText(ruta);
    return { ok: true };
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : String(err);
    return { ok: false, errorType: "SYSTEM_ERROR", rawMessage };
  }
}

export function viewInPenke(ruta: string, onOpen: (ruta: string) => void): void {
  onOpen(ruta);
}

export function errorMessage(errorType: FileErrorType): string {
  switch (errorType) {
    case "FILE_NOT_FOUND":
      return "El archivo ya no está en esa ubicación.";
    case "NO_DEFAULT_APP":
      return "Windows no tiene un lector de PDF predeterminado.";
    case "PERMISSION_DENIED":
      return "No tienes permiso para abrir ese archivo.";
    case "SYSTEM_ERROR":
      return "No se pudo abrir el archivo. Intenta de nuevo.";
  }
}
