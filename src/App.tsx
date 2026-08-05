import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar }          from "./components/Sidebar";
import { ToastProvider }    from "./components/Toast";
import { OnboardingFlow }   from "./components/OnboardingFlow";
import { HomePage }         from "./pages/HomePage";
import { FirmarPage }       from "./pages/FirmarPage";
import { VerificarPage }    from "./pages/VerificarPage";
import { ValidarPage }      from "./pages/ValidarPage";
import { usePresets }       from "./hooks/usePresets";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.16 }}
      >
        <Routes location={location}>
          <Route path="/"          element={<HomePage />} />
          <Route path="/firmar"    element={<FirmarPage />} />
          <Route path="/verificar" element={<VerificarPage />} />
          <Route path="/validar"   element={<ValidarPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppShell() {
  const { presets, savePreset } = usePresets();
  const [onboarding, setOnboarding] = useState(presets.length === 0);

  // Si el usuario borra todos los perfiles, vuelve al onboarding
  useEffect(() => {
    if (presets.length === 0) setOnboarding(true);
  }, [presets.length]);

  if (onboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-8">
        <OnboardingFlow
          onComplete={(p) => { savePreset(p); setOnboarding(false); }}
          onAddAnother={(p) => savePreset(p)}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatedRoutes />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider />
      <AppShell />
    </BrowserRouter>
  );
}
