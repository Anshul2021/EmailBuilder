"use client";

import { useState, useRef, useCallback } from "react";
import { Monitor, Smartphone, MailOpen, PanelRight, AlignLeft, AlignCenter, AlignRight, Bold, Type, Copy, Download, PencilLine, Check } from "lucide-react";
import { clsx } from "clsx";
import { Tooltip } from "./UI/Tooltip";
import { motion, AnimatePresence } from "framer-motion";

interface LivePreviewProps {
    html: string;
    mjml: string;
    isLoading: boolean;
    onMjmlChange?: (newMjml: string, newHtml: string) => void;
    onCopyMjml: () => void;
    onExportHtml: () => void;
}

interface TextProperties {
    fontSize: number;
    fontWeight: "normal" | "bold";
    color: string;
    align: "left" | "center" | "right";
    content: string;
    elementTag: string;
}

const DEFAULT_PROPS: TextProperties = {
    fontSize: 16,
    fontWeight: "normal",
    color: "#1e293b",
    align: "left",
    content: "",
    elementTag: "",
};

function rgbToHex(rgb: string): string {
    if (rgb.startsWith("#")) return rgb;
    const m = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!m) return "#1e293b";
    return "#" + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("");
}

export function LivePreview({ html, mjml, isLoading, onMjmlChange, onCopyMjml, onExportHtml }: LivePreviewProps) {
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
    const [showEditPanel, setShowEditPanel] = useState(false);
    const [selectedProps, setSelectedProps] = useState<TextProperties>(DEFAULT_PROPS);
    const [hasSelection, setHasSelection] = useState(false);
    const [copied, setCopied] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    // Keep a ref to the currently selected DOM element inside the iframe
    const selectedElementRef = useRef<HTMLElement | null>(null);

    const handleIframeLoad = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe?.contentDocument || !iframe.contentWindow) return;

        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;

        // Inject interaction styles
        const style = doc.createElement("style");
        style.textContent = `
            p, h1, h2, h3, h4, h5, h6, td, span, a {
                cursor: pointer !important;
                transition: outline 0.15s ease;
            }
            .ag-selected {
                outline: 2px solid #7c3aed !important;
                outline-offset: 3px;
                border-radius: 2px;
            }
            [contenteditable="true"] {
                cursor: text !important;
                outline: 2px solid #7c3aed !important;
                outline-offset: 3px;
                border-radius: 2px;
                white-space: pre-wrap;
            }
        `;
        doc.head.appendChild(style);

        const EDITABLE_TAGS = ["P", "H1", "H2", "H3", "H4", "H5", "H6", "TD", "SPAN", "A"];

        doc.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            if (!EDITABLE_TAGS.includes(target.tagName)) return;

            // Deselect old
            if (selectedElementRef.current && selectedElementRef.current !== target) {
                selectedElementRef.current.classList.remove("ag-selected");
                selectedElementRef.current.removeAttribute("contenteditable");
            }

            selectedElementRef.current = target;
            target.classList.add("ag-selected");

            // Use iframe's own window for getComputedStyle
            const cs = win.getComputedStyle(target);
            const align = cs.textAlign as "left" | "center" | "right";

            const props: TextProperties = {
                fontSize: parseInt(cs.fontSize) || 16,
                fontWeight: cs.fontWeight === "700" || cs.fontWeight === "bold" ? "bold" : "normal",
                color: rgbToHex(cs.color) || "#1e293b",
                align: (["left", "center", "right"].includes(align) ? align : "left") as "left" | "center" | "right",
                content: target.innerText || target.textContent || "",
                elementTag: target.tagName.toLowerCase(),
            };

            setSelectedProps(props);
            setHasSelection(true);
            setShowEditPanel(true);
        });

        // When user finishes typing inside an editable element, capture the new HTML
        doc.addEventListener("input", (e) => {
            const target = e.target as HTMLElement;
            if (target.contentEditable === "true") {
                const newContent = target.innerText || target.textContent || "";
                setSelectedProps(prev => ({ ...prev, content: newContent }));
                // Propagate updated HTML upstream
                const updatedHtml = doc.documentElement.outerHTML;
                onMjmlChange?.(mjml, updatedHtml);
            }
        });
    }, [mjml, onMjmlChange]);

    // Apply style changes to the selected iframe element
    const applyStyle = useCallback((prop: Partial<TextProperties>) => {
        setSelectedProps(prev => {
            const next = { ...prev, ...prop };
            const el = selectedElementRef.current;
            if (el) {
                if (prop.fontSize !== undefined) el.style.fontSize = `${next.fontSize}px`;
                if (prop.fontWeight !== undefined) el.style.fontWeight = next.fontWeight;
                if (prop.color !== undefined) el.style.color = next.color;
                if (prop.align !== undefined) el.style.textAlign = next.align;
            }
            // Propagate updated HTML
            const doc = iframeRef.current?.contentDocument;
            if (doc) onMjmlChange?.(mjml, doc.documentElement.outerHTML);
            return next;
        });
    }, [mjml, onMjmlChange]);

    // Enable contentEditable on selected element
    const enableTextEdit = () => {
        const el = selectedElementRef.current;
        if (!el) return;
        el.setAttribute("contenteditable", "true");
        el.focus();
        // Move cursor to end
        const range = el.ownerDocument!.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = el.ownerDocument!.defaultView?.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
    };

    const handleCopyMjml = () => {
        onCopyMjml();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const ALIGN_ICONS = { left: AlignLeft, center: AlignCenter, right: AlignRight };

    return (
        <div className="flex flex-col h-full w-full bg-[#f5f7fa]">

            {/* ── Toolbar ── */}
            <div className="border-b border-slate-200 bg-white flex items-center justify-between px-5 shrink-0 shadow-sm" style={{ height: 52 }}>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MailOpen className="w-4 h-4 text-violet-500" />
                    <span>Live Preview</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Desktop / Mobile toggle */}
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

                    {/* Edit panel toggle */}
                    {html && (
                        <Tooltip content="Text Properties Panel">
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
                                Edit Text
                            </button>
                        </Tooltip>
                    )}

                    <div className="w-px h-5 bg-slate-200" />

                    {/* Copy & Export */}
                    <Tooltip content="Copy MJML">
                        <button onClick={handleCopyMjml} disabled={!html} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40">
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </Tooltip>
                    <Tooltip content="Export HTML file">
                        <button onClick={onExportHtml} disabled={!html} className="flex items-center gap-1.5 text-xs font-semibold bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* ── Content row ── */}
            <div className="flex flex-1 min-h-0">

                {/* ── Preview canvas ── */}
                <div className="flex-1 overflow-auto p-6 flex items-start justify-center relative">

                    {/* Loading overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#f5f7fa]/90 backdrop-blur-sm animate-fade-in">
                            <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="w-2.5 h-2.5 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                    ))}
                                </div>
                                <p className="text-sm font-semibold text-slate-600">Generating Template...</p>
                                <p className="text-xs text-slate-400">Gemini is crafting your email</p>
                            </div>
                        </div>
                    )}

                    {/* Email frame */}
                    <div
                        className={clsx(
                            "bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 transition-all duration-500 ease-out",
                            viewMode === "desktop" ? "w-full max-w-3xl min-h-[600px]" : "w-[390px] min-h-[700px]"
                        )}
                        style={{ height: "calc(100vh - 200px)", maxHeight: 900 }}
                    >
                        {html ? (
                            <iframe
                                ref={iframeRef}
                                title="Email Preview"
                                srcDoc={html}
                                onLoad={handleIframeLoad}
                                className="w-full h-full border-0 bg-white"
                                sandbox="allow-same-origin allow-scripts"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <MailOpen className="w-7 h-7 text-slate-300" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-slate-500">Your email preview will appear here</p>
                                    <p className="text-xs text-slate-400 mt-1">Describe your email in the prompt bar to get started</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Text Properties Panel ── */}
                <AnimatePresence>
                    {showEditPanel && html && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 272, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="shrink-0 overflow-hidden border-l border-slate-200 bg-white h-full"
                        >
                            <div className="w-[272px] h-full flex flex-col">
                                <div className="p-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <PanelRight className="w-4 h-4 text-violet-500" />
                                        <h3 className="text-sm font-bold text-slate-800">Text Properties</h3>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Click any text in the preview</p>
                                </div>

                                {!hasSelection ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                                            <Type className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">Click any text element in the preview to select and edit it</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto p-4 space-y-5">

                                        {/* Element info */}
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                            <Type className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                            <span className="text-xs font-mono text-slate-600">&lt;{selectedProps.elementTag}&gt;</span>
                                        </div>

                                        {/* Text Content editing */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Content</label>
                                                <button
                                                    onClick={enableTextEdit}
                                                    className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-700 px-1.5 py-0.5 bg-violet-50 rounded"
                                                >
                                                    <PencilLine className="w-3 h-3" />
                                                    Edit inline
                                                </button>
                                            </div>
                                            <textarea
                                                value={selectedProps.content}
                                                onChange={e => {
                                                    const newContent = e.target.value;
                                                    setSelectedProps(prev => ({ ...prev, content: newContent }));
                                                    // Also update the selected element live
                                                    const el = selectedElementRef.current;
                                                    if (el) {
                                                        el.innerText = newContent;
                                                        const doc = iframeRef.current?.contentDocument;
                                                        if (doc) onMjmlChange?.(mjml, doc.documentElement.outerHTML);
                                                    }
                                                }}
                                                rows={3}
                                                className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 bg-white leading-relaxed"
                                                placeholder="Select an element to edit its text..."
                                            />
                                        </div>

                                        {/* Font Size */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Font Size</label>
                                                <span className="text-xs font-bold text-violet-600">{selectedProps.fontSize}px</span>
                                            </div>
                                            <input
                                                type="range" min={8} max={72} step={1}
                                                value={selectedProps.fontSize}
                                                onChange={e => applyStyle({ fontSize: Number(e.target.value) })}
                                                className="w-full accent-violet-600"
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-300 mt-0.5">
                                                <span>8px</span><span>72px</span>
                                            </div>
                                        </div>

                                        {/* Font Weight */}
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Weight</label>
                                            <div className="flex gap-2">
                                                {(["normal", "bold"] as const).map(w => (
                                                    <button
                                                        key={w}
                                                        onClick={() => applyStyle({ fontWeight: w })}
                                                        className={clsx(
                                                            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-all",
                                                            selectedProps.fontWeight === w
                                                                ? "bg-violet-600 text-white shadow-sm"
                                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                        )}
                                                    >
                                                        <Bold className="w-3.5 h-3.5" />
                                                        {w === "bold" ? "Bold" : "Regular"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Alignment */}
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Alignment</label>
                                            <div className="flex gap-1.5">
                                                {(["left", "center", "right"] as const).map(align => {
                                                    const Icon = ALIGN_ICONS[align];
                                                    return (
                                                        <button
                                                            key={align}
                                                            onClick={() => applyStyle({ align })}
                                                            className={clsx(
                                                                "flex-1 flex items-center justify-center py-2 rounded-lg transition-all",
                                                                selectedProps.align === align
                                                                    ? "bg-violet-600 text-white shadow-sm"
                                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                            )}
                                                        >
                                                            <Icon className="w-3.5 h-3.5" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Text Color */}
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Color</label>
                                            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                <div className="w-8 h-8 rounded-lg border border-slate-300 overflow-hidden shrink-0">
                                                    <input
                                                        type="color"
                                                        value={selectedProps.color}
                                                        onChange={e => applyStyle({ color: e.target.value })}
                                                        className="w-12 h-12 -m-2 cursor-pointer border-0 p-0"
                                                    />
                                                </div>
                                                <span className="text-xs font-mono text-slate-600">{selectedProps.color}</span>
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
