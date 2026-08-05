import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType; }

let addToastFn: ((msg: string, type: ToastType) => void) | null = null;
let idCounter = 0;

export function toast(message: string, type: ToastType = "info") { addToastFn?.(message, type); }

const toastConfig: Record<ToastType, { Icon: typeof CheckCircle2; colors: string; role: "status" | "alert" }> = {
  success: { Icon: CheckCircle2, colors: "bg-green-900 border-green-700 text-green-100", role: "status" },
  error:   { Icon: AlertCircle,  colors: "bg-red-900 border-red-700 text-red-100",       role: "alert" },
  info:    { Icon: Info,         colors: "bg-slate-800 border-slate-600 text-slate-100", role: "status" },
};

const DURATION_MS = 4000;

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: () => void }) {
  const { Icon, colors, role } = toastConfig[item.type];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startTimer() {
    timerRef.current = setTimeout(onRemove, DURATION_MS);
  }

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  useEffect(() => { startTimer(); return clearTimer; }, []);

  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      onMouseEnter={clearTimer}
      onFocus={clearTimer}
      onMouseLeave={startTimer}
      onBlur={startTimer}
      className={["flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium pointer-events-auto animate-[slideIn_0.2s_ease-out]", colors].join(" ")}
    >
      <Icon size={16} className="flex-shrink-0" />
      <span className="flex-1">{item.message}</span>
      <button
        onClick={onRemove}
        aria-label="Cerrar notificación"
        className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
    };
    return () => { addToastFn = null; };
  }, []);

  function remove(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return createPortal(
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} onRemove={() => remove(t.id)} />
      ))}
    </div>,
    document.body
  );
}
