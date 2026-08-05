export function certStatus(validoHasta?: string) {
  if (!validoHasta) return { dot: "bg-slate-300", text: "Sin validar",          label: "?",      variant: "unknown"  as const };
  const days = Math.ceil((new Date(validoHasta).getTime() - Date.now()) / 86400000);
  if (days <= 0) return  { dot: "bg-red-500",    text: "Certificado vencido",   label: "Vencido", variant: "expired"  as const };
  if (days < 30) return  { dot: "bg-yellow-400", text: `Vence en ${days} días`, label: `${days}d`, variant: "expiring" as const };
  return                 { dot: "bg-green-500",  text: `Válido · ${validoHasta}`, label: "Vigente", variant: "valid"   as const };
}

export function certDaysRemaining(validoHasta?: string): number {
  if (!validoHasta) return 0;
  return Math.ceil((new Date(validoHasta).getTime() - Date.now()) / 86400000);
}
