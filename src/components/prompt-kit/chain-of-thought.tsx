"use client";

import React, { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, CheckCircle2 } from "lucide-react";

// Context to share state between Trigger and Content
interface StepContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  status?: "pending" | "thinking" | "completed";
}

const StepContext = createContext<StepContextType | null>(null);

export function ChainOfThought({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3 pl-1 relative border-l border-slate-100/80 ml-2">
      {children}
    </div>
  );
}

interface ChainOfThoughtStepProps {
  children: React.ReactNode;
  initialOpen?: boolean;
  status?: "pending" | "thinking" | "completed";
}

export function ChainOfThoughtStep({
  children,
  initialOpen = false,
  status = "completed",
}: ChainOfThoughtStepProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <StepContext.Provider value={{ isOpen, setIsOpen, status }}>
      <div className="relative group">{children}</div>
    </StepContext.Provider>
  );
}

export function ChainOfThoughtTrigger({ children }: { children: React.ReactNode }) {
  const context = useContext(StepContext);
  if (!context) throw new Error("ChainOfThoughtTrigger must be used inside ChainOfThoughtStep");

  const { isOpen, setIsOpen, status } = context;

  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className="flex items-center gap-2.5 w-full text-left py-1.5 px-2.5 hover:bg-slate-50 rounded-lg transition-colors group/btn text-xs font-semibold text-slate-700"
    >
      <div className="flex-shrink-0 flex items-center justify-center w-4 h-4">
        {status === "thinking" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
        ) : status === "pending" ? (
          <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 fill-purple-50" />
        )}
      </div>

      <span className="flex-1 truncate">{children}</span>

      <ChevronDown
        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
          isOpen ? "rotate-180 text-slate-600" : ""
        }`}
      />
    </button>
  );
}

export function ChainOfThoughtContent({ children }: { children: React.ReactNode }) {
  const context = useContext(StepContext);
  if (!context) throw new Error("ChainOfThoughtContent must be used inside ChainOfThoughtStep");

  const { isOpen } = context;

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="pl-6.5 pr-2.5 pb-2 pt-0.5 space-y-1.5 ml-6 border-l border-slate-100">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ChainOfThoughtItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed font-medium">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-1.5" />
      <span>{children}</span>
    </div>
  );
}
