import { useLocalStorage } from "./useLocalStorage";

export interface HistoryEntry {
  ruta: string;
  nombre: string;
  firmante: string;
  fecha: string;
}

const MAX = 8;

export function useHistory() {
  const [entries, setEntries] = useLocalStorage<HistoryEntry[]>("firmaec.history", []);

  function addEntry(entry: HistoryEntry) {
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.ruta !== entry.ruta);
      return [entry, ...filtered].slice(0, MAX);
    });
  }

  function clearHistory() {
    setEntries([]);
  }

  return { entries, addEntry, clearHistory };
}
