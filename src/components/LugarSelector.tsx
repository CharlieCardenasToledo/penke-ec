import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, X, ChevronDown } from "lucide-react";
import { LUGARES_EC } from "../data/ecuador-geo";

// Derivar provincias y cantones del dataset
const PROVINCIAS: string[] = Array.from(
  new Set(
    LUGARES_EC.map((l) => {
      const parts = l.split(", ");
      return parts[parts.length - 1];
    })
  )
).sort();

function cantonesDeProvinca(provincia: string): string[] {
  return Array.from(
    new Set(
      LUGARES_EC
        .filter((l) => l.endsWith(`, ${provincia}`))
        .map((l) => {
          const parts = l.split(", ");
          return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        })
    )
  ).sort();
}

interface Props {
  value: string; // "Cantón, Provincia"
  onChange: (value: string) => void;
  className?: string;
}

interface ComboProps {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

function Combobox({ items, value, onChange, placeholder, disabled, icon }: ComboProps) {
  const [query,  setQuery]  = useState(value);
  const [open,   setOpen]   = useState(false);
  const [cursor, setCursor] = useState(-1);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLUListElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const filtered = useCallback((): string[] => {
    if (!query.trim()) return items.slice(0, 10);
    const q = query.toLowerCase();
    return items.filter((i) => i.toLowerCase().includes(q)).slice(0, 10);
  }, [query, items]);

  const list = filtered();

  function select(item: string) {
    setQuery(item);
    onChange(item);
    setOpen(false);
    setCursor(-1);
    inputRef.current?.blur();
  }

  function clear() {
    setQuery("");
    onChange("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setCursor((c) => Math.min(c + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter" && cursor >= 0) { e.preventDefault(); select(list[cursor]); }
    else if (e.key === "Escape") setOpen(false);
  }

  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const li = listRef.current.children[cursor] as HTMLElement;
      li?.scrollIntoView({ block: "nearest" });
    }
  }, [cursor]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = open && list.length > 0 && !disabled;

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>}
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setCursor(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={[
            "w-full rounded-lg border border-slate-200 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow bg-white",
            icon ? "pl-9" : "pl-3.5",
            query ? "pr-8" : "pr-3.5",
            disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "",
          ].join(" ")}
        />
        {query && !disabled && (
          <button type="button" onClick={clear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
            <X size={13} />
          </button>
        )}
        {!query && !disabled && (
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
        )}
      </div>

      {showDropdown && (
        <ul ref={listRef} className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto max-h-48 py-1">
          {list.map((item, i) => (
            <li key={item}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(item); }}
                className={["w-full text-left px-3.5 py-2 text-sm transition-colors", i === cursor ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-800"].join(" ")}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LugarSelector({ value, onChange, className }: Props) {
  // Parsear value inicial "Cantón, Provincia"
  const parseValue = (v: string): [string, string] => {
    const idx = v.lastIndexOf(", ");
    if (idx === -1) return ["", v];
    return [v.slice(0, idx), v.slice(idx + 2)];
  };

  const [initCanton, initProv] = parseValue(value);
  const [provincia, setProvincia] = useState(initProv);
  const [canton,    setCanton]    = useState(initCanton);

  // Sincronizar cuando value externo cambia (reset)
  useEffect(() => {
    const [c, p] = parseValue(value);
    setProvincia(p);
    setCanton(c);
  }, [value]);

  const cantones = provincia ? cantonesDeProvinca(provincia) : [];

  function handleProvincia(p: string) {
    setProvincia(p);
    setCanton("");
    if (p) onChange(`${p}`);
    else onChange("");
  }

  function handleCanton(c: string) {
    setCanton(c);
    if (c && provincia) onChange(`${c}, ${provincia}`);
    else if (provincia) onChange(provincia);
    else onChange(c);
  }

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <Combobox
        items={PROVINCIAS}
        value={provincia}
        onChange={handleProvincia}
        placeholder="Provincia"
        icon={<MapPin size={14} />}
      />
      <Combobox
        items={cantones}
        value={canton}
        onChange={handleCanton}
        placeholder="Ciudad"
        disabled={!provincia}
      />
    </div>
  );
}
