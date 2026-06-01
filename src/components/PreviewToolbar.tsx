"use client";

import { useState, useRef, useEffect } from "react";
import { Monitor, Smartphone, MailOpen, PencilLine, Undo2, Redo2, RotateCcw, Check, Copy, Library, Save, Download, Eye, Link, FileCode, Mail, ChevronDown, Menu, X, Loader2 } from "lucide-react";
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
    onSimulateLoading?: () => void;
    isLibraryHighlighted?: boolean;
    onOpenTutorial?: () => void;
}

const triggerMobileHaptic = () => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(15);
    }
};

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
    isSharing = false,
    onSimulateLoading,
    isLibraryHighlighted = false,
    onOpenTutorial
}: PreviewToolbarProps) {
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close mobile menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showMenu]);

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

    // Close menu/dropdown when sharing completes
    const prevSharingRef = useRef(isSharing);
    useEffect(() => {
        if (prevSharingRef.current && !isSharing) {
            setShowMenu(false);
            setShowExportDropdown(false);
        }
        prevSharingRef.current = isSharing;
    }, [isSharing]);

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scroll-bar::-webkit-scrollbar {
                    display: none !important;
                }
                .hide-scroll-bar {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }
            `}} />

            {/* ── MOBILE TOOLBAR (Pure CSS Responsive: visible on < md viewports) ── */}
            <div className="flex md:hidden border-b border-slate-200 bg-white items-center justify-between px-4 shrink-0 shadow-sm relative z-30 w-full select-none" style={{ height: 52 }}>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 shrink-0">
                    <div className="flex items-center gap-1.5">
                        <MailOpen className="w-4 h-4 text-violet-500" />
                        <span>Live Preview</span>
                    </div>
                    {onOpenTutorial && (
                        <button
                            onClick={() => {
                                triggerMobileHaptic();
                                onOpenTutorial();
                            }}
                            className="text-[10px] font-bold text-violet-600 hover:text-white hover:bg-violet-600 border border-violet-200 hover:border-violet-600 px-1.5 py-0.5 rounded transition-all uppercase tracking-wider bg-transparent cursor-pointer"
                        >
                            Tutorial
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Quick Undo / Redo directly on the bar for ease of editing on phone */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => {
                                triggerMobileHaptic();
                                undo();
                            }}
                            disabled={undoStackLength === 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-20 active:scale-95"
                            title="Undo"
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                triggerMobileHaptic();
                                redo();
                            }}
                            disabled={redoStackLength === 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-20 active:scale-95"
                            title="Redo"
                        >
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="w-px h-4 bg-slate-200 mx-0.5" />

                    <button
                        onClick={() => {
                            triggerMobileHaptic();
                            setShowMenu(prev => !prev);
                        }}
                        className={clsx(
                            "h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all shadow-sm active:scale-95",
                            showMenu && "bg-violet-50 text-violet-600 border-violet-200"
                        )}
                    >
                        {showMenu ? <X className="w-4 h-4 animate-in fade-in zoom-in duration-200" /> : <Menu className="w-4 h-4 animate-in fade-in zoom-in duration-200" />}
                    </button>
                </div>

                {/* Dropdown / Context Menu */}
                <AnimatePresence>
                    {showMenu && (
                        <div className="fixed inset-0 z-[110]" onClick={() => setShowMenu(false)}>
                            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px]" />
                            <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-4 top-[56px] z-[120] w-[290px] bg-white border border-slate-200 rounded-xl shadow-2xl p-4 flex flex-col gap-3.5 max-h-[80vh] overflow-y-auto"
                                style={{ boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
                            >
                                {/* Viewport Selection */}
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Viewport</p>
                                    <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-1">
                                        <button
                                            onClick={() => {
                                                triggerMobileHaptic();
                                                setViewMode("desktop");
                                                setShowMenu(false);
                                            }}
                                            className={clsx(
                                                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all",
                                                viewMode === "desktop" ? "bg-white shadow-sm text-violet-600" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <Monitor className="w-3.5 h-3.5" />
                                            <span>Desktop</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                triggerMobileHaptic();
                                                setViewMode("mobile");
                                                setShowMenu(false);
                                            }}
                                            className={clsx(
                                                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all",
                                                viewMode === "mobile" ? "bg-white shadow-sm text-violet-600" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <Smartphone className="w-3.5 h-3.5" />
                                            <span>Mobile</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 my-0.5" />

                                {/* Canvas Editing */}
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Canvas Options</p>
                                    <button
                                        onClick={() => {
                                            triggerMobileHaptic();
                                            onAddText();
                                            setShowMenu(false);
                                        }}
                                        disabled={!html}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-50 text-slate-700"
                                    >
                                        <PencilLine className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs font-semibold">Add Text Block</span>
                                    </button>
                                </div>

                                <div className="h-px bg-slate-100 my-0.5" />

                                {/* Templates & Workspace */}
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Workspace</p>
                                    <button
                                        onClick={() => {
                                            triggerMobileHaptic();
                                            onOpenHistory?.();
                                            setShowMenu(false);
                                        }}
                                        className={clsx(
                                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                                            isLibraryHighlighted ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50 text-slate-700"
                                        )}
                                    >
                                        <Library className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs font-semibold">Templates Library</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            triggerMobileHaptic();
                                            onSaveTemplate?.();
                                            setShowMenu(false);
                                        }}
                                        disabled={!html}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-50 text-slate-700"
                                    >
                                        <Save className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs font-semibold">Save Template</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            triggerMobileHaptic();
                                            onPreview();
                                            setShowMenu(false);
                                        }}
                                        disabled={!html}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-50 text-slate-700"
                                    >
                                        <Eye className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs font-semibold">Clean Preview</span>
                                    </button>
                                </div>

                                <div className="h-px bg-slate-100 my-0.5" />

                                {/* Export Options */}
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Export Options</p>
                                    <button
                                        onClick={() => {
                                            triggerMobileHaptic();
                                            onDownloadHtml();
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors text-slate-700"
                                    >
                                        <FileCode className="w-4 h-4 text-violet-500" />
                                        <span className="text-xs font-semibold">Download HTML</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            triggerMobileHaptic();
                                            onDownloadEml();
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors text-slate-700"
                                    >
                                        <Mail className="w-4 h-4 text-violet-500" />
                                        <span className="text-xs font-semibold">Download .EML</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            triggerMobileHaptic();
                                            onSharePreview();
                                        }}
                                        disabled={isSharing}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-50 text-slate-700"
                                    >
                                        {isSharing ? (
                                            <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                                        ) : (
                                            <Link className="w-4 h-4 text-violet-500" />
                                        )}
                                        <span className="text-xs font-semibold">
                                            {isSharing ? "Generating link..." : "Share Preview Link"}
                                        </span>
                                    </button>
                                </div>

                                <div className="h-px bg-slate-100 my-0.5" />

                                {/* Danger Zone */}
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Danger Zone</p>
                                    <button
                                        onClick={() => {
                                            triggerMobileHaptic();
                                            reset();
                                            setShowMenu(false);
                                        }}
                                        disabled={!html}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors disabled:opacity-40"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span className="text-xs font-semibold">Reset Workspace</span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── DESKTOP TOOLBAR (Pure CSS Responsive: visible on md and up viewports) ── */}
            <div className="hidden md:flex border-b border-slate-200 bg-white items-center justify-between px-5 shrink-0 shadow-sm relative z-30 gap-4 select-none w-full min-w-0" style={{ height: 52 }}>
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-700 shrink-0">
                    <div className="flex items-center gap-2">
                        <MailOpen className="w-4 h-4 text-violet-500" />
                        <span>Live Preview</span>
                    </div>
                    {onOpenTutorial && (
                        <button
                            onClick={onOpenTutorial}
                            className="text-[10px] font-bold text-violet-600 hover:text-white hover:bg-violet-600 border border-violet-200 hover:border-violet-600 px-2 py-0.5 rounded-md transition-all uppercase tracking-wider bg-transparent cursor-pointer"
                        >
                            Tutorial
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
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

                    <div className="relative flex items-center">
                        <Tooltip content="View Saved Templates" position="bottom">
                            <button
                                onClick={onOpenHistory}
                                className={clsx(
                                    "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm border",
                                    isLibraryHighlighted
                                        ? "library-highlight-active bg-violet-50 text-violet-700 border-violet-500"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent"
                                )}
                            >
                                <Library className="w-3.5 h-3.5" />
                                Library
                            </button>
                        </Tooltip>
                    </div>

                    <Tooltip content="Save" position="bottom">
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
                                    className="absolute right-0 top-full mt-2.5 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 min-w-[240px] overflow-hidden"
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
                                        }}
                                        disabled={isSharing}
                                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        {isSharing ? (
                                            <Loader2 className="w-4 h-4 text-violet-500 mt-0.5 shrink-0 animate-spin" />
                                        ) : (
                                            <Link className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-slate-800">
                                                {isSharing ? "Generating link..." : "Share Preview"}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {isSharing ? "Creating public preview..." : "Generate public preview link"}
                                            </span>
                                        </div>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </>
    );
}
