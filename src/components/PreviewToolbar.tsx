"use client";

import { Monitor, Smartphone, MailOpen, PencilLine, Undo2, Redo2, RotateCcw, Check, Copy, History, Save, Download } from "lucide-react";
import { clsx } from "clsx";
import { Tooltip } from "./UI/Tooltip";

interface PreviewToolbarProps {
    viewMode: "desktop" | "mobile";
    setViewMode: (mode: "desktop" | "mobile") => void;
    showEditPanel: boolean;
    setShowEditPanel: React.Dispatch<React.SetStateAction<boolean>>;
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
    onExportHtml: () => void;
    onAddText: () => void;
}

export function PreviewToolbar({
    viewMode,
    setViewMode,
    showEditPanel,
    setShowEditPanel,
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
    onExportHtml,
    onAddText
}: PreviewToolbarProps) {
    return (
        <div className="border-b border-slate-200 bg-white flex items-center justify-between px-5 shrink-0 shadow-sm" style={{ height: 52 }}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MailOpen className="w-4 h-4 text-violet-500" />
                <span>Live Preview</span>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-0.5">
                    {(["desktop", "mobile"] as const).map((mode) => (
                        <Tooltip key={mode} content={mode === "desktop" ? "Desktop view" : "Mobile view"}>
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

                {html && (
                    <Tooltip content="Show Properties Panel">
                        <button
                            onClick={() => setShowEditPanel(v => !v)}
                            className={clsx(
                                "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
                                showEditPanel
                                    ? "bg-violet-100 text-violet-700 border border-violet-200"
                                    : "text-slate-500 hover:bg-slate-100 border border-transparent"
                            )}
                        >
                            <PencilLine className="w-3.5 h-3.5" />
                            Properties
                        </button>
                    </Tooltip>
                )}

                <div className="w-px h-5 bg-slate-200" />

                <Tooltip content="Add New Text Block">
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
                    <Tooltip content="Undo (Ctrl+Z)">
                        <button 
                            onClick={undo} 
                            disabled={undoStackLength === 0} 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-30"
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <Tooltip content="Redo (Ctrl+Shift+Z)">
                        <button 
                            onClick={redo} 
                            disabled={redoStackLength === 0} 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-30"
                        >
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <Tooltip content="Reset All">
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

                <Tooltip content="Copy MJML">
                    <button 
                        onClick={onCopyMjml} 
                        disabled={!html} 
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                </Tooltip>
                
                <div className="w-px h-5 bg-slate-200" />
                
                <Tooltip content="View History">
                    <button 
                        onClick={onOpenHistory} 
                        className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors shadow-sm"
                    >
                        <History className="w-3.5 h-3.5" />
                        History
                    </button>
                </Tooltip>
                
                <Tooltip content="Save to Supabase">
                    <button 
                        onClick={onSaveTemplate} 
                        disabled={!html} 
                        className="flex items-center gap-1.5 text-xs font-semibold bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-3.5 h-3.5" />
                        Save
                    </button>
                </Tooltip>

                <Tooltip content="Export HTML file">
                    <button 
                        onClick={onExportHtml} 
                        disabled={!html} 
                        className="flex items-center gap-1.5 text-xs font-semibold bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}
