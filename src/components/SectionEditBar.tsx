"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SectionEditBarProps {
    position: { top: number; left: number; width: number };
    sectionIndex: number;
    onSubmit: (instruction: string, sectionIndex: number) => void;
    onClose: () => void;
    isLoading: boolean;
}

export function SectionEditBar({ position, sectionIndex, onSubmit, onClose, isLoading }: SectionEditBarProps) {
    const [instruction, setInstruction] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto-focus on mount
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (instruction.trim() && !isLoading) {
            onSubmit(instruction.trim(), sectionIndex);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="fixed z-[9999]"
                style={{
                    top: position.top,
                    left: position.left,
                    width: Math.min(position.width, 480),
                }}
            >
                <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white rounded-xl border border-violet-200 shadow-lg shadow-violet-100/50 px-3 py-2">
                    <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder={`Edit section ${sectionIndex + 1}...`}
                        className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none"
                        disabled={isLoading}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") onClose();
                        }}
                    />

                    {isLoading ? (
                        <Loader2 className="w-4 h-4 text-violet-500 animate-spin shrink-0" />
                    ) : (
                        <>
                            <button
                                type="submit"
                                disabled={!instruction.trim()}
                                className="p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                </form>
            </motion.div>
        </AnimatePresence>
    );
}
