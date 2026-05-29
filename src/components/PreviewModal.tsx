"use client";

import { useState } from "react";
import { Monitor, Smartphone, X } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { Tooltip } from "./UI/Tooltip";

interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    html: string;
    title?: string;
}

export function PreviewModal({ isOpen, onClose, html, title = "Email Preview" }: PreviewModalProps) {
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-w-5xl w-full h-[90vh] border border-slate-200"
            >
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 leading-tight">{title}</h2>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Clean viewport simulation</p>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg gap-0.5">
                        {(["desktop", "mobile"] as const).map((mode) => (
                            <Tooltip key={mode} content={mode === "desktop" ? "Desktop preview" : "Mobile preview"} position="bottom">
                                <button
                                    onClick={() => setViewMode(mode)}
                                    className={clsx(
                                        "p-1.5 rounded-md transition-all",
                                        viewMode === mode
                                            ? "bg-white shadow-sm text-violet-600 font-semibold"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {mode === "desktop" ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                                </button>
                            </Tooltip>
                        ))}
                    </div>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                        title="Close preview"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Frame */}
                <div className="flex-1 bg-slate-100 p-6 flex justify-center items-center overflow-auto min-h-0">
                    <div
                        className={clsx(
                            "h-full transition-all duration-300 ease-in-out flex justify-center items-center",
                            viewMode === "desktop" ? "w-full" : "w-[375px]"
                        )}
                    >
                        <div
                            className={clsx(
                                "w-full h-full bg-white overflow-hidden shadow-md transition-all duration-300",
                                viewMode === "mobile" && "border-[8px] border-slate-800 rounded-[32px] shadow-xl relative"
                            )}
                        >
                            {/* Mobile camera notch simulation */}
                            {viewMode === "mobile" && (
                                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 mr-2" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-700" />
                                </div>
                            )}

                            <iframe
                                srcDoc={html}
                                title="Clean Email Preview"
                                className={clsx(
                                    "w-full h-full border-0 bg-white",
                                    viewMode === "mobile" && "pt-6"
                                )}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
