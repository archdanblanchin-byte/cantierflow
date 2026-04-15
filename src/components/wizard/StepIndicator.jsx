import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  "Dati Cantiere",
  "Collaboratori",
  "Lav. Extra",
  "Lav. Normali",
  "Materiali",
  "Riepilogo",
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="w-full px-2">
      <div className="flex items-center justify-between">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",
                    isCompleted && "bg-primary text-primary-foreground shadow-md shadow-primary/30",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg shadow-primary/20",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step}
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1.5 font-medium text-center leading-tight hidden sm:block",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}