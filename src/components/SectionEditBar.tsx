"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Zap, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GEMINI_MODELS } from "@/lib/prompts";

interface SectionEditBarProps {
    position: { top: number; left: number; width: number };
    sectionIndex: number;
    onSubmit: (instruction: string, sectionIndex: number, model: string) => void;
    onClose: () => void;
    isLoading: boolean;
}

export function SectionEditBar({ position, sectionIndex, onSubmit, onClose, isLoading }: SectionEditBarProps) {
    const [instruction, setInstruction] = useState("");
    const [selectedModel, setSelectedModel] = useState("gemini-3.1-flash-lite");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Auto-focus on mount
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // Click outside to close SectionEditBar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    // Click outside to close dropdown
    useEffect(() => {
        const handleDropdownClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleDropdownClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleDropdownClickOutside);
        };
    }, [isDropdownOpen]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (instruction.trim() && !isLoading) {
            onSubmit(instruction.trim(), sectionIndex, selectedModel);
        }
    };

    // Helper to get short labels for models so they fit nicely
    const getShortLabel = (modelValue: string) => {
        switch (modelValue) {
            case "gemini-3.1-flash-lite": return "3.1 Lite";
            case "gemini-2.5-flash": return "2.5 Flash";
            case "gemini-3.5-flash": return "3.5 Flash";
            case "gemini-3-flash": return "3.0 Flash";
            case "gemini-2.5-flash-lite": return "2.5 Lite";
            default: return "Model";
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                ref={containerRef}
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="fixed z-[9999]"
                style={{
                    top: position.top,
                    left: position.left,
                    width: Math.max(Math.min(position.width, 520), 400),
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
                        <div className="h-7 flex items-center justify-center px-2 shrink-0">
                            <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* Model Selector Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(prev => !prev)}
                                    className="h-7 px-2 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors select-none shrink-0"
                                >
                                    <Zap className="w-3 h-3 text-violet-500 shrink-0" />
                                    <span className="truncate max-w-[70px]">{getShortLabel(selectedModel)}</span>
                                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-[10000] p-1.5 overflow-hidden">
                                        {GEMINI_MODELS.map((model) => (
                                            <button
                                                key={model.value}
                                                type="button"
                                                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between text-[11px] ${
                                                    model.value === selectedModel 
                                                        ? "bg-violet-50 text-violet-700 font-semibold" 
                                                        : "hover:bg-slate-50 text-slate-700 font-medium"
                                                }`}
                                                onClick={() => {
                                                    setSelectedModel(model.value);
                                                    setIsDropdownOpen(false);
                                                }}
                                            >
                                                <span>{model.label}</span>
                                                {model.badge && (
                                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border scale-90 ${
                                                        model.value === "gemini-3.1-flash-lite" 
                                                            ? "bg-amber-50 text-amber-700 border-amber-200" 
                                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    }`}>
                                                        {model.badge.split(" · ")[0] || model.badge}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={!instruction.trim()}
                                className="h-7 w-7 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </form>
            </motion.div>
        </AnimatePresence>
    );
}
