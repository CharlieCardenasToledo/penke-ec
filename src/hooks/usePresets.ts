import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

export interface Preset {
  schemaVersion?: number;
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
  /** Carpeta base donde se creará {carpetaBaseUsuario}/Penké Firmas/{nombre}_penke.pdf */
  carpetaBaseUsuario?: string;
  /** @deprecated Usar carpetaBaseUsuario */
  carpetaDestino?: string;
}

export const claveStoreKey = (cert: string) => `firmaec.clave.${cert}`;

function migratePreset(p: Preset): Preset {
  if (p.schemaVersion === 2) return p;
  const migrated: Preset = {
    ...p,
    schemaVersion: 2,
    carpetaBaseUsuario: p.carpetaBaseUsuario ?? p.carpetaDestino,
  };
  delete migrated.carpetaDestino;
  return migrated;
}

export function usePresets() {
  const [presets, setPresets] = useLocalStorage<Preset[]>("firmaec.presets", []);

  const migratedPresets = presets.map(migratePreset);

  // Persistir la migración la primera vez que se detecte un perfil con esquema antiguo
  useEffect(() => {
    if (presets.some((p) => !p.schemaVersion || p.schemaVersion < 2)) {
      setPresets((prev) => prev.map(migratePreset));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function savePreset(p: Omit<Preset, "id">) {
    const id = Date.now().toString();
    // Migrar el preset nuevo por si viene con el campo antiguo carpetaDestino
    const migrated = migratePreset({ ...p, id, schemaVersion: undefined } as Preset);
    setPresets((prev) => [...prev.map(migratePreset), { ...migrated, schemaVersion: 2 }].slice(-8));
  }

  function deletePreset(id: string) {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePreset(id: string, updates: Partial<Omit<Preset, "id">>) {
    setPresets((prev) =>
      prev.map((p) =>
        p.id === id ? { ...migratePreset(p), ...updates, schemaVersion: 2 } : p
      )
    );
  }

  return { presets: migratedPresets, savePreset, deletePreset, updatePreset };
}
