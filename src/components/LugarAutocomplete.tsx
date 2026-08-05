import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, X } from "lucide-react";
import { LUGARES_EC } from "../data/ecuador-geo";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MAX_SUGGESTIONS = 8;

export function LugarAutocomplete({ value, onChange, placeholder = "Cuenca, Azuay, Ecuador", className }: Props) {
  const [query,    setQuery]    = useState(value);
  const [open,     setOpen]     = useState(false);
  const [cursor,   setCursor]   = useState(-1);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLUListElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sincronizar query cuando el valor externo cambia (ej. reset)
  useEffect(() => { setQuery(value); }, [value]);

  const suggestions = useCallback((): string[] => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return LUGARES_EC.filter((l) => l.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [query]);

  const items = suggestions();

  function select(item: string) {
    setQuery(item);
    onChange(item);
    setOpen(false);
    setCursor(-1);
    inputRef.current?.blur();
  }

  function handleInput(v: string) {
    setQuery(v);
    onChange(v);
    setCursor(-1);
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && cursor >= 0) {
      e.preventDefault();
      select(items[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Scroll item activo a la vista
  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const li = listRef.current.children[cursor] as HTMLElement;
      li?.scrollIntoView({ block: "nearest" });
    }
  }, [cursor]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = open && items.length > 0;

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-9 pr-8 rounded-lg border border-slate-200 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow bg-white"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); onChange(""); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto max-h-52 py-1"
        >
          {items.map((item, i) => {
            const parts = item.split(", ");
            return (
              <li key={item}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); select(item); }}
                  className={[
                    "w-full text-left px-3.5 py-2 flex items-baseline gap-2 transition-colors",
                    i === cursor ? "bg-blue-50" : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span className="text-sm font-medium text-slate-800 shrink-0">{parts[0]}</span>
                  {parts.length > 1 && (
                    <span className="text-xs text-slate-400 truncate">
                      {parts.slice(1).join(", ")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
