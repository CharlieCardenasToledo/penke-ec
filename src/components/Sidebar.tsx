import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { PenLine, ShieldCheck, BadgeCheck, Clock, KeyRound } from "lucide-react";
import { useHistory } from "../hooks/useHistory";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { PdfViewerModal } from "./PdfViewerModal";
import isotipo from "../assets/penke-isotipo.svg";

const links = [
  { to: "/firmar",    Icon: PenLine,     label: "Firmar" },
  { to: "/verificar", Icon: ShieldCheck,  label: "Verificar" },
  { to: "/validar",   Icon: BadgeCheck,   label: "Validar cert." },
];

export function Sidebar() {
  const { entries } = useHistory();
  const [cert]      = useLocalStorage("firmaec.cert", "");
  const certName = cert ? cert.split(/[\\/]/).pop()?.replace(/\.(p12|pfx)$/i, "") ?? "" : "";
  const [viewingRuta, setViewingRuta] = useState<string | null>(null);

  return (
    <>
    {viewingRuta && <PdfViewerModal ruta={viewingRuta} onClose={() => setViewingRuta(null)} />}
    <aside className="flex flex-col w-60 min-h-screen bg-[#0f172a] text-white flex-shrink-0">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={isotipo} alt="Penké" className="w-9 h-9 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm leading-tight">Penké</p>
            <p className="text-xs text-slate-400 leading-tight">v1.0.0</p>
          </div>
        </div>
      </div>

      {certName && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-1.5 mb-0.5">
            <KeyRound size={11} className="text-slate-500" />
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Certificado activo</p>
          </div>
          <p className="text-xs text-slate-200 font-medium truncate">{certName}</p>
        </div>
      )}

      <nav className="px-3 py-4 space-y-1">
        {links.map(({ to, Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => [
              "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              isActive ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {entries.length > 0 && <div className="mx-3 border-t border-white/10" />}

      {entries.length > 0 && (
        <div className="px-3 py-2 flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-center gap-1.5 px-2 py-2">
            <Clock size={11} className="text-slate-500" />
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Recientes</p>
          </div>
          <div className="space-y-0.5">
            {entries.map((e, i) => (
              <motion.button
                key={e.ruta}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setViewingRuta(e.ruta)}
                title={e.ruta}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
              >
                <p className="text-xs font-medium text-slate-300 truncate group-hover:text-white leading-tight">{e.nombre}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{e.fecha}</p>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-t border-white/10 mt-auto">
        <p className="text-[10px] text-slate-600 leading-tight">Compatible con certificados digitales acreditados en Ecuador</p>
      </div>
    </aside>
    </>
  );
}
