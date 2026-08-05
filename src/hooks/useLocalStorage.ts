import { useState } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  function set(newValue: T | ((prev: T) => T)) {
    setValue((prev) => {
      const next =
        typeof newValue === "function"
          ? (newValue as (p: T) => T)(prev)
          : newValue;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignorar errores de cuota
      }
      return next;
    });
  }

  return [value, set] as const;
}
