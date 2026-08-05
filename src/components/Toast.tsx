import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType; }

let addToastFn: ((msg: string, type: ToastType) => void) | null = null;
let idCounter = 0;

export function toast(message: string, type: ToastType = "info") { addToastFn?.(message, type); }

const toastConfig: Record<ToastType, { Icon: typeof CheckCircle2; colors: string }> = {
  success: { Icon: CheckCircle2, colors: "bg-green-900 border-green-700 text-green-100" },
  error:   { Icon: AlertCircle,  colors: "bg-red-900 border-red-700 text-red-100" },
  info:    { Icon: Info,         colors: "bg-slate-800 border-slate-600 text-slate-100" },
};

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };
    return () => { addToastFn = null; };
  }, []);

  return createPortal(
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const { Icon, colors } = toastConfig[t.type];
        return (
          <div
            key={t.id}
            className={["flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium pointer-events-auto animate-[slideIn_0.2s_ease-out]", colors].join(" ")}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
