"use client";

import { useState, useRef, useEffect } from "react";
import { Monitor, Smartphone, MailOpen, PencilLine, Undo2, Redo2, RotateCcw, Check, Copy, Library, Save, Download, Eye, Link, FileCode, Mail, ChevronDown, Menu } from "lucide-react";
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
    const [isMobile, setIsMobile] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

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

    if (isMobile) {
        return (
            <div className="border-b border-slate-200 bg-white flex items-center justify-between px-5 shrink-0 shadow-sm relative w-full" style={{ height: 52 }}>
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
                    <button
                        onClick={() => setShowMenu(prev => !prev)}
                        className={clsx(
                            "h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all shadow-sm active:scale-95",
                            showMenu && "bg-violet-50 text-violet-600 border-violet-200"
                        )}
                    >
                        <Menu className="w-4 h-4" />
                    </button>
                </div>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {showMenu && (
                        <div className="fixed inset-0 z-[110]" onClick={() => setShowMenu(false)}>
                            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px]" />
                            <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-4 top-[56px] z-[120] w-[280px] bg-white border border-slate-200 rounded-xl shadow-2xl p-3.5 flex flex-col gap-3 max-h-[80vh] overflow-y-auto"
                                style={{ boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
                            >
                                {/* Viewport Selection */}
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Viewport</p>
                                    <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-1">
                                        <button
                                            onClick={() => {
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

                                {/* Edit Actions */}
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Actions</p>
                                    <button
                                        onClick={() => {
                                            onAddText();
                                            setShowMenu(false);
                                        }}
                                        disabled={!html}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        <PencilLine className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs font-semibold text-slate-700">Add Text Block</span>
                                    </button>
                                    <div className="grid grid-cols-3 gap-1 px-1 pt-1">
                                        <button
                                            onClick={() => {
                                                undo();
                                            }}
                                            disabled={undoStackLength === 0}
                                            className="flex flex-col items-center justify-center py-1.5 border border-slate-100 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                                            title="Undo"
                                        >
                                            <Undo2 className="w-3.5 h-3.5 text-slate-600" />
                                            <span className="text-[9px] font-semibold text-slate-500 mt-1">Undo</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                redo();
                                            }}
                                            disabled={redoStackLength === 0}
                                            className="flex flex-col items-center justify-center py-1.5 border border-slate-100 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                                            title="Redo"
                                        >
                                            <Redo2 className="w-3.5 h-3.5 text-slate-600" />
                                            <span className="text-[9px] font-semibold text-slate-500 mt-1">Redo</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                reset();
                                                setShowMenu(false);
                                            }}
                                            disabled={!html}
                                            className="flex flex-col items-center justify-center py-1.5 border border-slate-100 rounded-lg hover:bg-red-50 hover:border-red-100 disabled:opacity-40"
                                            title="Reset All"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                                            <span className="text-[9px] font-semibold text-red-500 mt-1">Reset</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 my-0.5" />

                                {/* Templates & Saving */}
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Workspace</p>
                                    <button
                                        onClick={() => {
                                            onOpenHistory?.();
                                            setShowMenu(false);
                                        }}
                                        className={clsx(
                                            "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors",
                                            isLibraryHighlighted ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50 text-slate-700"
                                        )}
                                    >
                                        <Library className="w-4 h-4" />
                                        <span className="text-xs font-semibold">Templates Library</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            onSaveTemplate?.();
                                            setShowMenu(false);
                                        }}
                                        disabled={!html}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs font-semibold text-slate-700">Save Template</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            onPreview();
                                            setShowMenu(false);
                                        }}
                                        disabled={!html}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        <Eye className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs font-semibold text-slate-700">Clean Preview</span>
                                    </button>
                                </div>

                                <div className="h-px bg-slate-100 my-0.5" />

                                {/* Export Options */}
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Export Options</p>
                                    <button
                                        onClick={() => {
                                            onDownloadHtml();
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors"
                                    >
                                        <FileCode className="w-4 h-4 text-violet-500" />
                                        <span className="text-xs font-semibold text-slate-700">Download HTML</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            onDownloadEml();
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors"
                                    >
                                        <Mail className="w-4 h-4 text-violet-500" />
                                        <span className="text-xs font-semibold text-slate-700">Download .EML</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            onSharePreview();
                                            setShowMenu(false);
                                        }}
                                        disabled={isSharing}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        {isSharing ? (
                                            <RotateCcw className="w-4 h-4 text-violet-500 animate-spin" />
                                        ) : (
                                            <Link className="w-4 h-4 text-violet-500" />
                                        )}
                                        <span className="text-xs font-semibold text-slate-700">Share Preview Link</span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="border-b border-slate-200 bg-white flex items-center justify-between px-5 shrink-0 shadow-sm overflow-x-auto hide-scroll-bar gap-4 select-none w-full min-w-0" style={{ height: 52 }}>
            <style dangerouslySetInnerHTML={{__html: `
                .hide-scroll-bar::-webkit-scrollbar {
                    display: none !important;
                }
                .hide-scroll-bar {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }
            `}} />
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
