import { Client, Stronghold } from "@tauri-apps/plugin-stronghold";
import { appDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";

const CLIENT_NAME = "penke-ec";
const VAULT_FILE  = "penke.stronghold";

let _stronghold: Stronghold | null = null;
let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;
let _ready = false;

async function init(): Promise<void> {
  if (_ready) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const key     = await invoke<string>("get_vault_key");
      const dataDir = await appDataDir();
      _stronghold   = await Stronghold.load(`${dataDir}/${VAULT_FILE}`, key);
      try {
        _client = await _stronghold.loadClient(CLIENT_NAME);
      } catch {
        _client = await _stronghold.createClient(CLIENT_NAME);
      }
    } catch (e) {
      console.warn("[secureStore] No se pudo inicializar el almacén seguro:", e);
      _client = null;
    } finally {
      _ready = true;
    }
  })();

  return _initPromise;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export const secureStore = {
  async get(key: string): Promise<string | null> {
    await init();
    if (!_client) return null;
    try {
      const store = _client.getStore();
      const bytes = await store.get(key);
      if (!bytes || bytes.length === 0) return null;
      return dec.decode(new Uint8Array(bytes));
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    await init();
    if (!_client || !_stronghold) return;
    try {
      const store = _client.getStore();
      await store.insert(key, Array.from(enc.encode(value)));
      await _stronghold.save();
    } catch (e) {
      console.warn("[secureStore] Error al guardar:", e);
    }
  },

  async remove(key: string): Promise<void> {
    await init();
    if (!_client || !_stronghold) return;
    try {
      const store = _client.getStore();
      await store.remove(key);
      await _stronghold.save();
    } catch {
      // Ignorar si la clave no existe
    }
  },
};

/** Limpieza única: elimina contraseñas en texto plano que puedan quedar en localStorage. */
export function clearLegacyPasswords(): void {
  const toDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("firmaec.clave.")) toDelete.push(k);
  }
  toDelete.forEach((k) => localStorage.removeItem(k));
}
