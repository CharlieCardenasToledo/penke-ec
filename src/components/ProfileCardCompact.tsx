import { useState, useRef, useEffect } from "react";
import { KeyRound, HardDrive, FolderOpen, MoreHorizontal, Pencil, Trash2, Copy } from "lucide-react";
import { certStatus } from "../lib/certUtils";
import type { Preset } from "../hooks/usePresets";
import { Button, IconButton, StatusBadge, Dialog } from "./ui";

interface Props {
  profile: Preset;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export function ProfileCardCompact({ profile, onSelect, onEdit, onDelete, onDuplicate }: Props) {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status  = certStatus(profile.certValidoHasta);

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
    <>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Eliminar "${profile.nombre}"`}
      >
        <p className="text-sm text-slate-500 mb-6">Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirming(false)}>Cancelar</Button>
          <Button variant="danger" onClick={() => { setConfirming(false); onDelete(); }}>Sí, eliminar</Button>
        </div>
      </Dialog>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        {/* Icono */}
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          {(profile.tipoFirma ?? "archivo") === "token"
            ? <HardDrive size={15} className="text-blue-600" />
            : <KeyRound  size={15} className="text-blue-600" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-800 truncate">{profile.nombre}</p>
            <StatusBadge variant={status.variant} label={status.label} />
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
          <Button variant="primary" size="sm" onClick={onSelect}>Usar</Button>

          {/* Menú contextual ⋯ */}
          <div className="relative" ref={menuRef}>
            <IconButton
              aria-label="Más opciones del perfil"
              size="sm"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreHorizontal size={15} />
            </IconButton>

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
                <button onClick={() => { setMenuOpen(false); setConfirming(true); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5">
                  <Trash2 size={13} className="text-red-400" /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
