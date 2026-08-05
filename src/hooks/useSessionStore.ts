// Almacén de sesión — persiste mientras la app esté abierta, nunca a disco
const store = new Map<string, string>();

export const sessionStore = {
  get: (key: string) => store.get(key) ?? "",
  set: (key: string, value: string) => store.set(key, value),
  clear: (key: string) => store.delete(key),
};
