import { useState, useRef, useEffect } from "react";
import { KeyRound, HardDrive, FolderOpen, MoreHorizontal, Pencil, Trash2, Copy } from "lucide-react";
import { certStatus } from "../lib/certUtils";
import type { Preset } from "../hooks/usePresets";

interface Props {
  profile: Preset;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export function ProfileCardCompact({ profile, onSelect, onEdit, onDelete, onDuplicate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = certStatus(profile.certValidoHasta);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const certName = (profile.tipoFirma ?? "archivo") === "token"
    ? (profile.tokenNombre || "Token USB")
    : (profile.cert?.split(/[\\/]/).pop()?.replace(/\.(p12|pfx)$/i, "") || "Certificado");

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
      {/* Icono */}
      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
        {(profile.tipoFirma ?? "archivo") === "token"
          ? <HardDrive size={15} className="text-blue-600" />
          : <KeyRound  size={15} className="text-blue-600" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-slate-800 truncate">{profile.nombre}</p>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`} title={status.text} />
        </div>
        <p className="text-xs text-slate-400 truncate">{profile.certTitular || certName}</p>
        {profile.carpetaBaseUsuario && (
          <div className="flex items-center gap-1 mt-0.5">
            <FolderOpen size={9} className="text-slate-300 flex-shrink-0" />
            <p className="text-[10px] text-slate-400 truncate font-mono">
              {profile.carpetaBaseUsuario}/Penké Firmas
            </p>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onSelect}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all"
        >
          Usar
        </button>

        {/* Menú contextual ⋯ */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Más opciones del perfil"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <MoreHorizontal size={15} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-100 z-20 overflow-hidden">
              <button onClick={() => { setMenuOpen(false); onEdit(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5">
                <Pencil size={13} className="text-slate-400" /> Editar
              </button>
              {onDuplicate && (
                <button onClick={() => { setMenuOpen(false); onDuplicate(); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5">
                  <Copy size={13} className="text-slate-400" /> Duplicar
                </button>
              )}
              <div className="border-t border-slate-100" />
              <button onClick={() => { setMenuOpen(false); onDelete(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5">
                <Trash2 size={13} className="text-red-400" /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
