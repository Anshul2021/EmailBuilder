"use client";

import { useState, useRef, useEffect } from "react";
import { Monitor, Smartphone, MailOpen, PencilLine, Undo2, Redo2, RotateCcw, Check, Copy, History, Save, Download, Eye, Link, FileCode, Mail, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { Tooltip } from "./UI/Tooltip";
import { motion, AnimatePresence } from "framer-motion";

interface PreviewToolbarProps {
    viewMode: "desktop" | "mobile";
    setViewMode: (mode: "desktop" | "mobile") => void;
    undo: () => void;
    redo: () => void;
    reset: () => void;
    undoStackLength: number;
    redoStackLength: number;
    html: string;
    copied: boolean;
    onCopyMjml: () => void;
    onOpenHistory?: () => void;
    onSaveTemplate?: () => void;
    onPreview: () => void;
    onSharePreview: () => void;
    onDownloadHtml: () => void;
    onDownloadEml: () => void;
    onExportHtml: () => void;
    onAddText: () => void;
    isSharing?: boolean;
}

export function PreviewToolbar({
    viewMode,
    setViewMode,
    undo,
    redo,
    reset,
    undoStackLength,
    redoStackLength,
    html,
    copied,
    onCopyMjml,
    onOpenHistory,
    onSaveTemplate,
    onPreview,
    onSharePreview,
    onDownloadHtml,
    onDownloadEml,
    onExportHtml,
    onAddText,
    isSharing = false
}: PreviewToolbarProps) {
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowExportDropdown(false);
            }
        };

        if (showExportDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showExportDropdown]);

    return (
        <div className="border-b border-slate-200 bg-white flex items-center justify-between px-5 shrink-0 shadow-sm" style={{ height: 52 }}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MailOpen className="w-4 h-4 text-violet-500" />
                <span>Live Preview</span>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-0.5">
                    {(["desktop", "mobile"] as const).map((mode) => (
                        <Tooltip key={mode} content={mode === "desktop" ? "Desktop view" : "Mobile view"} position="bottom">
                            <button
                                onClick={() => setViewMode(mode)}
                                className={clsx(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === mode ? "bg-white shadow-sm text-violet-600" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {mode === "desktop" ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                            </button>
                        </Tooltip>
                    ))}
                </div>

                <div className="w-px h-5 bg-slate-200" />

                <Tooltip content="Add New Text Block" position="bottom">
                    <button
                        onClick={onAddText}
                        disabled={!html}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 border border-transparent transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <PencilLine className="w-3.5 h-3.5" />
                        Add Text
                    </button>
                </Tooltip>

                <div className="w-px h-5 bg-slate-200" />

                <div className="flex items-center gap-1">
                    <Tooltip content="Undo (Ctrl+Z)" position="bottom">
                        <button 
                            onClick={undo} 
                            disabled={undoStackLength === 0} 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-30"
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <Tooltip content="Redo (Ctrl+Shift+Z)" position="bottom">
                        <button 
                            onClick={redo} 
                            disabled={redoStackLength === 0} 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-30"
                        >
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <Tooltip content="Reset All" position="bottom">
                        <button 
                            onClick={reset} 
                            disabled={!html} 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </Tooltip>
                </div>

                <div className="w-px h-5 bg-slate-200" />

                <Tooltip content="Copy MJML" position="bottom">
                    <button 
                        onClick={onCopyMjml} 
                        disabled={!html} 
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                </Tooltip>
                
                <div className="w-px h-5 bg-slate-200" />
                
                <Tooltip content="View History" position="bottom">
                    <button 
                        onClick={onOpenHistory} 
                        className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors shadow-sm"
                    >
                        <History className="w-3.5 h-3.5" />
                        History
                    </button>
                </Tooltip>
                
                <Tooltip content="Save to Supabase" position="bottom">
                    <button 
                        onClick={onSaveTemplate} 
                        disabled={!html} 
                        className="flex items-center gap-1.5 text-xs font-semibold bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-3.5 h-3.5" />
                        Save
                    </button>
                </Tooltip>

                <Tooltip content="Clean viewport preview" position="bottom">
                    <button 
                        onClick={onPreview} 
                        disabled={!html} 
                        className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                    </button>
                </Tooltip>

                <div className="relative" ref={dropdownRef}>
                    <Tooltip content="Export options" position="bottom">
                        <button 
                            type="button"
                            onClick={() => setShowExportDropdown(prev => !prev)} 
                            disabled={!html} 
                            className="flex items-center gap-1.5 text-xs font-semibold bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export</span>
                            <ChevronDown className={clsx("w-3.5 h-3.5 transition-transform duration-200", showExportDropdown && "rotate-180")} />
                        </button>
                    </Tooltip>

                    <AnimatePresence>
                        {showExportDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-2.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 min-w-[240px] overflow-hidden"
                                style={{ boxShadow: "0 10px 25px -5px rgba(15,23,42,0.12), 0 8px 16px -6px rgba(15,23,42,0.08)" }}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        onDownloadHtml();
                                        setShowExportDropdown(false);
                                    }}
                                    className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors"
                                >
                                    <FileCode className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-800">Download HTML</span>
                                        <span className="text-[10px] text-slate-400">Download email as .html file</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        onDownloadEml();
                                        setShowExportDropdown(false);
                                    }}
                                    className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors"
                                >
                                    <Mail className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-800">Download .EML</span>
                                        <span className="text-[10px] text-slate-400">Download local client mail file</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        onSharePreview();
                                        setShowExportDropdown(false);
                                    }}
                                    disabled={isSharing}
                                    className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    {isSharing ? (
                                        <RotateCcw className="w-4 h-4 text-violet-500 mt-0.5 shrink-0 animate-spin" />
                                    ) : (
                                        <Link className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-800">Share Preview</span>
                                        <span className="text-[10px] text-slate-400">Generate public preview link</span>
                                    </div>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
