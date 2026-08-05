import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Preset } from "../../hooks/usePresets";
import type { BatchFile } from "../BatchSignList";
import { StepDocument }   from "./StepDocument";
import { StepAppearance } from "./StepAppearance";
import { StepReview }     from "./StepReview";
import { StepResult }     from "./StepResult";
import type { FirmarResponse } from "../../lib/api";

export interface StampPos { pagina: number; puntoX: number; puntoY: number; }

type WizardStep = "document" | "appearance" | "review" | "result";

const slideVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export function SignWizard({ profile, onBack }: {
  profile: Preset;
  onBack: () => void;
}) {
  const hasStamp = !!profile.estampado;
  const steps: WizardStep[] = hasStamp
    ? ["document", "appearance", "review", "result"]
    : ["document", "review", "result"];

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex];

  const [doc,        setDoc]        = useState("");
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
  const [batchMode,  setBatchMode]  = useState(false);
  const [stampPos,   setStampPos]   = useState<StampPos | null>(null);
  const [result,     setResult]     = useState<FirmarResponse | null>(null);

  function goNext() { setStepIndex((i) => Math.min(i + 1, steps.length - 1)); }
  function goBack() {
    if (stepIndex === 0) { onBack(); return; }
    setStepIndex((i) => i - 1);
  }

  function restart() {
    setDoc(""); setBatchFiles([]); setStampPos(null); setResult(null);
    setStepIndex(0);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          variants={slideVariants}
          initial="enter" animate="center" exit="exit"
          transition={{ duration: 0.2 }}
        >
          {currentStep === "document" && (
            <StepDocument
              profile={profile}
              doc={doc} setDoc={setDoc}
              batchMode={batchMode} setBatchMode={setBatchMode}
              batchFiles={batchFiles} setBatchFiles={setBatchFiles}
              onBack={goBack} onNext={goNext}
            />
          )}
          {currentStep === "appearance" && (
            <StepAppearance
              profile={profile}
              doc={doc}
              stampPos={stampPos} setStampPos={setStampPos}
              onBack={goBack} onNext={goNext}
            />
          )}
          {currentStep === "review" && (
            <StepReview
              profile={profile}
              doc={doc}
              batchMode={batchMode}
              batchFiles={batchFiles} setBatchFiles={setBatchFiles}
              stampPos={stampPos}
              onBack={goBack}
              onDone={(res) => { setResult(res); goNext(); }}
            />
          )}
          {currentStep === "result" && result && (
            <StepResult
              result={result}
              onSignAnother={restart}
              onBack={onBack}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
