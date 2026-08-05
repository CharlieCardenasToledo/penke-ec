import { useLocalStorage } from "./useLocalStorage";

export interface Preset {
  id: string;
  nombre: string;
  tipoFirma?: "archivo" | "token";
  cert: string;
  tokenAlias?: string;
  tokenNombre?: string;
  razon: string;
  lugar: string;
  estampado: string;
  certTitular?: string;
  certCedula?: string;
  certValidoHasta?: string;
  recordarClave?: boolean;
  carpetaDestino?: string;
}

export const claveStoreKey = (cert: string) => `firmaec.clave.${cert}`;

export function usePresets() {
  const [presets, setPresets] = useLocalStorage<Preset[]>("firmaec.presets", []);

  function savePreset(p: Omit<Preset, "id">) {
    const id = Date.now().toString();
    setPresets((prev) => [...prev, { ...p, id }].slice(-8));
  }

  function deletePreset(id: string) {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }

  return { presets, savePreset, deletePreset };
}
