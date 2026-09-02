import { NavLink } from "react-router-dom";
import { PenLine, ShieldCheck, BadgeCheck, Home } from "lucide-react";
import imagotipoWhite from "../assets/penke-imagotipo-white.svg";

const links = [
  { to: "/",           Icon: Home,        label: "Inicio" },
  { to: "/firmar",     Icon: PenLine,     label: "Firmar documento" },
  { to: "/verificar",  Icon: ShieldCheck, label: "Comprobar firma" },
  { to: "/validar",    Icon: BadgeCheck,  label: "Comprobar certificado" },
];

const APP_VERSION = __APP_VERSION__;

export function Sidebar() {
  return (
    <aside className="flex flex-col w-56 lg:w-60 min-h-screen bg-[#0f172a] text-white flex-shrink-0">
      <div className="px-5 py-4 border-b border-white/10">
        <img src={imagotipoWhite} alt="Penké" className="w-40 mb-1.5" />
        <p className="text-xs text-slate-500">v{APP_VERSION}</p>
      </div>

      <nav className="px-3 py-4 space-y-1 flex-1">
        {links.map(({ to, Icon, label }) => (
          <NavLink key={to} to={to} end={to === "/"}
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

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[11px] text-slate-400 leading-relaxed">Compatible con certificados digitales acreditados en Ecuador</p>
      </div>
    </aside>
  );
}
