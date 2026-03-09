"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Monitor, Smartphone, MailOpen, AlignLeft, AlignCenter, AlignRight, Bold, Copy, Download, PencilLine, Check, ImageIcon, X, Upload } from "lucide-react";
import { clsx } from "clsx";
import { Tooltip } from "./UI/Tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { TextPropertiesPanel } from "./TextPropertiesPanel";
import type { TextProperties } from "./TextPropertiesPanel";
import { Skeleton } from "primereact/skeleton";

interface LivePreviewProps {
    html: string;
    mjml: string;
    isLoading: boolean;
    onMjmlChange?: (newMjml: string, newHtml: string) => void;
    onCopyMjml: () => void;
    onExportHtml: () => void;
}

const DEFAULT_PROPS: TextProperties = {
    fontSize: 16,
    fontWeight: "normal",
    color: "#1e293b",
    align: "left",
    fontFamily: "",
    content: "",
    elementTag: "",
};

function rgbToHex(rgb: string): string {
    if (!rgb || rgb === "rgba(0, 0, 0, 0)") return "#1e293b";
    if (rgb.startsWith("#")) return rgb;
    const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return "#1e293b";
    return "#" + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("");
}

// ── Drag-to-resize constants ────────────────────────────────────────────────
const PANEL_MIN_WIDTH = 240;
const PANEL_MAX_WIDTH = 520;
const PANEL_DEFAULT_WIDTH = 320;

export function LivePreview({ html, mjml, isLoading, onMjmlChange, onCopyMjml, onExportHtml }: LivePreviewProps) {
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
    const [showEditPanel, setShowEditPanel] = useState(false);
    const [selectedProps, setSelectedProps] = useState<TextProperties>(DEFAULT_PROPS);
    const [hasSelection, setHasSelection] = useState(false);
    const [copied, setCopied] = useState(false);

    // Right-panel draggable width
    const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
    const dragStartWidthRef = useRef(PANEL_DEFAULT_WIDTH);

    // Image upload modal state
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const clickedImageRef = useRef<HTMLImageElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const selectedElementRef = useRef<HTMLElement | null>(null);

    // Refs to avoid stale closures in iframe event listeners
    const onMjmlChangeRef = useRef(onMjmlChange);
    const mjmlRef = useRef(mjml);
    useEffect(() => { onMjmlChangeRef.current = onMjmlChange; }, [onMjmlChange]);
    useEffect(() => { mjmlRef.current = mjml; }, [mjml]);

    // Helper to propagate iframe DOM changes to parent
    const propagateChanges = useCallback(() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) onMjmlChangeRef.current?.(mjmlRef.current, doc.documentElement.outerHTML);
    }, []);

    // Re-apply all current style properties to the element (prevents style loss after content edits)
    const reapplyStyles = useCallback((el: HTMLElement, props: TextProperties) => {
        if (props.fontSize) el.style.fontSize = `${props.fontSize}px`;
        if (props.fontWeight) el.style.fontWeight = props.fontWeight;
        if (props.color) el.style.color = props.color;
        if (props.align) el.style.textAlign = props.align;
        if (props.fontFamily) el.style.fontFamily = props.fontFamily;
    }, []);

    // Helper to inject styles into the iframe
    const injectIframeStyles = useCallback((doc: Document) => {
        const styleId = "ag-preview-styles";
        if (doc.getElementById(styleId)) return;

        const style = doc.createElement("style");
        style.id = styleId;
        style.innerHTML = `
            p, h1, h2, h3, h4, h5, h6, td, span, a {
                cursor: pointer !important;
                transition: outline 0.15s ease;
            }
            img {
                cursor: pointer !important;
                transition: outline 0.15s ease, filter 0.15s ease;
            }
            p:hover, h1:hover, h2:hover, h3:hover, h4:hover, h5:hover, h6:hover, td:hover, span:hover, a:hover {
                outline: 1px dashed #c4b5fd !important;
                outline-offset: 2px;
            }
            img:hover {
                outline: 2px dashed #7c3aed !important;
                outline-offset: 3px;
                filter: brightness(0.92);
            }
            .ag-selected {
                outline: 2px solid #7c3aed !important;
                outline-offset: 3px;
                border-radius: 2px;
            }
            .ag-selected:hover { outline: 2px solid #7c3aed !important; }
            .ag-img-selected {
                outline: 3px solid #7c3aed !important;
                outline-offset: 2px;
                filter: brightness(0.88);
            }
            [contenteditable="true"] {
                cursor: text !important;
                outline: 2px solid #7c3aed !important;
                outline-offset: 3px;
                border-radius: 2px;
                white-space: pre-wrap;
            }
            html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar { 
                display: none !important; width: 0 !important; height: 0 !important;
            }
            html, body, * {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
                scroll-behavior: smooth !important;
            }
        `;
        doc.head.appendChild(style);
    }, []);

    // Handle iframe load
    const handleIframeLoad = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument) return;

        selectedElementRef.current = null;
        setHasSelection(false);
        setSelectedProps(DEFAULT_PROPS);

        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!win) return;

        injectIframeStyles(doc);

        const EDITABLE_TAGS = ["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "TD", "SPAN", "A", "STRONG", "B", "I", "EM"];

        doc.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;

            if (target.tagName === "IMG") {
                e.stopPropagation();
                const prevEl = selectedElementRef.current;
                if (prevEl) {
                    prevEl.classList.remove("ag-selected");
                    prevEl.removeAttribute("contenteditable");
                    selectedElementRef.current = null;
                    setHasSelection(false);
                }
                doc.querySelectorAll(".ag-img-selected").forEach(el => el.classList.remove("ag-img-selected"));
                target.classList.add("ag-img-selected");
                clickedImageRef.current = target as HTMLImageElement;
                setImageModalOpen(true);
                return;
            }

            doc.querySelectorAll(".ag-img-selected").forEach(el => el.classList.remove("ag-img-selected"));

            if (!EDITABLE_TAGS.includes(target.tagName)) {
                const el = selectedElementRef.current;
                if (el) {
                    el.classList.remove("ag-selected");
                    el.removeAttribute("contenteditable");
                    try { el.blur(); } catch { /* noop */ }
                    selectedElementRef.current = null;
                    setHasSelection(false);
                    setSelectedProps(DEFAULT_PROPS);
                    onMjmlChangeRef.current?.(mjmlRef.current, doc.documentElement.outerHTML);
                }
                return;
            }

            if (selectedElementRef.current && selectedElementRef.current !== target) {
                selectedElementRef.current.classList.remove("ag-selected");
                selectedElementRef.current.removeAttribute("contenteditable");
            }

            selectedElementRef.current = target;
            target.classList.add("ag-selected");

            const cs = win.getComputedStyle(target);
            const align = cs.textAlign as "left" | "center" | "right";

            const props: TextProperties = {
                fontSize: parseInt(cs.fontSize) || 16,
                fontWeight: cs.fontWeight === "700" || cs.fontWeight === "bold" ? "bold" : "normal",
                color: rgbToHex(cs.color) || "#1e293b",
                align: (["left", "center", "right"].includes(align) ? align : "left") as "left" | "center" | "right",
                fontFamily: cs.fontFamily || "",
                content: target.innerHTML || target.textContent || "",
                elementTag: target.tagName.toLowerCase(),
            };

            setSelectedProps(props);
            setHasSelection(true);
            setShowEditPanel(true);
        });

        doc.addEventListener("input", (e) => {
            const target = e.target as HTMLElement;
            if (target.contentEditable === "true") {
                const newContent = target.innerHTML || target.textContent || "";
                setSelectedProps(prev => {
                    const next = { ...prev, content: newContent };
                    target.style.fontSize = `${next.fontSize}px`;
                    target.style.fontWeight = next.fontWeight;
                    target.style.color = next.color;
                    target.style.textAlign = next.align;
                    if (next.fontFamily) target.style.fontFamily = next.fontFamily;
                    return next;
                });
                onMjmlChangeRef.current?.(mjmlRef.current, doc.documentElement.outerHTML);
            }
        });

        doc.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                const el = selectedElementRef.current;
                if (el) {
                    el.classList.remove("ag-selected");
                    el.removeAttribute("contenteditable");
                    try { el.blur(); } catch { /* noop */ }
                    selectedElementRef.current = null;
                    setHasSelection(false);
                    setSelectedProps(DEFAULT_PROPS);
                }
                doc.querySelectorAll(".ag-img-selected").forEach(el => el.classList.remove("ag-img-selected"));
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [injectIframeStyles]);

    // Re-inject styles when html changes
    useEffect(() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) injectIframeStyles(doc);
    }, [html, injectIframeStyles]);

    // Apply style changes to the selected iframe element
    const applyStyle = useCallback((prop: Partial<TextProperties>) => {
        setSelectedProps(prev => {
            const next = { ...prev, ...prop };
            const el = selectedElementRef.current;
            if (el) {
                if (prop.fontSize !== undefined) el.style.fontSize = `${next.fontSize}px`;
                if (prop.fontWeight !== undefined) el.style.fontWeight = next.fontWeight;
                if (prop.color !== undefined) el.style.color = next.color;
                if (prop.align !== undefined) {
                    el.style.textAlign = next.align;
                    if (el.hasAttribute("align")) el.setAttribute("align", next.align);
                    const display = el.ownerDocument.defaultView?.getComputedStyle(el).display;
                    if (display === "inline" || display === "inline-block") {
                        let parent = el.parentElement;
                        while (parent && parent.tagName !== "BODY") {
                            if (["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "TD"].includes(parent.tagName)) {
                                parent.style.textAlign = next.align;
                                if (parent.hasAttribute("align")) parent.setAttribute("align", next.align);
                                break;
                            }
                            parent = parent.parentElement;
                        }
                    }
                }
            }
            propagateChanges();
            return next;
        });
    }, [propagateChanges]);

    // Enable contentEditable on selected element
    const enableTextEdit = () => {
        const el = selectedElementRef.current;
        if (!el) return;
        el.setAttribute("contenteditable", "true");
        el.focus();
        const range = el.ownerDocument!.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = el.ownerDocument!.defaultView?.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
    };

    // Handle text content change from the sidebar
    const handleContentChange = useCallback((newContent: string | null) => {
        const contentStr = newContent || "";
        setSelectedProps(prev => {
            const next = { ...prev, content: contentStr };
            const el = selectedElementRef.current;
            if (el) {
                el.innerHTML = contentStr;
                reapplyStyles(el, next);
                propagateChanges();
            }
            return next;
        });
    }, [reapplyStyles, propagateChanges]);

    // Handle image file upload from modal
    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !clickedImageRef.current) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl && clickedImageRef.current) {
                clickedImageRef.current.src = dataUrl;
                const doc = iframeRef.current?.contentDocument;
                if (doc) doc.querySelectorAll(".ag-img-selected").forEach(el => el.classList.remove("ag-img-selected"));
                propagateChanges();
            }
        };
        reader.readAsDataURL(file);
        setImageModalOpen(false);
        clickedImageRef.current = null;
        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    const handleCopyMjml = () => {
        onCopyMjml();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Drag-to-resize logic ─────────────────────────────────────────────────
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingRef.current = true;
        dragStartXRef.current = e.clientX;
        dragStartWidthRef.current = panelWidth;

        const onMouseMove = (me: MouseEvent) => {
            if (!isDraggingRef.current) return;
            const delta = dragStartXRef.current - me.clientX; // drag left → increase width
            const newW = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, dragStartWidthRef.current + delta));
            setPanelWidth(newW);
        };

        const onMouseUp = () => {
            isDraggingRef.current = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }, [panelWidth]);

    // Toolbar alignment icons map
    const ALIGN_ICONS = { left: AlignLeft, center: AlignCenter, right: AlignRight };
    // Suppress lint on unused ALIGN_ICONS within the panel (kept for potential future use)
    void ALIGN_ICONS; void Bold;

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
                                Edit
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
                <div className="flex-1 overflow-auto p-6 flex items-start justify-center relative scrollbar-hide">

                    {/* Loading overlay */}
                    {isLoading && (
                        <div className="absolute inset-x-6 top-6 bottom-6 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] animate-fade-in rounded-xl overflow-hidden border border-slate-200/50">
                            <div className="w-full max-w-md bg-white p-8 flex flex-col gap-6 scale-95 opacity-80 pointer-events-none">
                                {/* Mock Header */}
                                <div className="flex items-center justify-between">
                                    <Skeleton width="5rem" height="1.5rem" />
                                    <div className="flex gap-2">
                                        <Skeleton width="2rem" height="0.5rem" />
                                        <Skeleton width="2rem" height="0.5rem" />
                                    </div>
                                </div>

                                {/* Mock Hero */}
                                <Skeleton width="100%" height="160px" borderRadius="12px" />

                                {/* Mock Text Content */}
                                <div className="space-y-3">
                                    <Skeleton width="100%" height="0.8rem" />
                                    <Skeleton width="90%" height="0.8rem" />
                                    <Skeleton width="95%" height="0.8rem" />
                                    <Skeleton width="40%" height="0.8rem" />
                                </div>

                                {/* Mock CTA */}
                                <div className="flex justify-center pt-2">
                                    <Skeleton width="8rem" height="2.5rem" borderRadius="8px" />
                                </div>

                                {/* Status message */}
                                <div className="flex flex-col items-center gap-1.5 pt-4">
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-violet-600 rounded-full animate-pulse" />
                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Gemini is crafting your email</p>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium">Generating MJML & optimized HTML...</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Email frame */}
                    <div
                        className={clsx(
                            "bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 transition-all duration-500 ease-out scrollbar-hide",
                            viewMode === "desktop" ? "w-full max-w-3xl min-h-[600px]" : "w-[390px] min-h-[700px]"
                        )}
                        style={{ height: "calc(100vh - 100px)", maxHeight: 800 }}
                    >
                        {html ? (
                            <iframe
                                ref={iframeRef}
                                title="Email Preview"
                                srcDoc={html}
                                onLoad={handleIframeLoad}
                                className="w-full h-full border-0 bg-white scrollbar-hide"
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

                {/* ── Properties Panel (draggable width) ── */}
                <AnimatePresence>
                    {showEditPanel && html && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: panelWidth, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="shrink-0 relative border-l border-slate-200 bg-white h-full overflow-hidden"
                            style={{ width: panelWidth }}
                        >
                            {/* ── Drag Handle ── */}
                            <div
                                onMouseDown={handleDragStart}
                                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group flex items-center justify-center hover:bg-violet-100 transition-colors"
                                title="Drag to resize"
                            >
                                <div className="w-0.5 h-8 bg-slate-300 group-hover:bg-violet-400 rounded-full transition-colors" />
                            </div>

                            {/* Panel content (offset by drag handle) */}
                            <div className="pl-1.5 h-full" style={{ width: panelWidth }}>
                                <TextPropertiesPanel
                                    hasSelection={hasSelection}
                                    selectedProps={selectedProps}
                                    onContentChange={handleContentChange}
                                    onApplyStyle={applyStyle}
                                    onEnableTextEdit={enableTextEdit}
                                    onClose={() => setShowEditPanel(false)}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Image Upload Modal ── */}
            <AnimatePresence>
                {imageModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setImageModalOpen(false);
                                const doc = iframeRef.current?.contentDocument;
                                if (doc) doc.querySelectorAll(".ag-img-selected").forEach(el => el.classList.remove("ag-img-selected"));
                            }
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 10 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 overflow-hidden"
                        >
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                                        <ImageIcon className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800">Replace Image</h3>
                                        <p className="text-[11px] text-slate-400">Upload your own image</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setImageModalOpen(false);
                                        const doc = iframeRef.current?.contentDocument;
                                        if (doc) doc.querySelectorAll(".ag-img-selected").forEach(el => el.classList.remove("ag-img-selected"));
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal body */}
                            <div className="p-5">
                                <label
                                    htmlFor="image-replace-input"
                                    className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-violet-200 hover:border-violet-400 bg-violet-50/50 hover:bg-violet-50 rounded-xl p-8 cursor-pointer transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors">
                                        <Upload className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-slate-700">Click to upload image</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, GIF, WebP supported</p>
                                    </div>
                                    <input
                                        id="image-replace-input"
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageFileChange}
                                    />
                                </label>

                                <p className="text-[11px] text-slate-400 text-center mt-3">
                                    The image will be embedded directly in the email as a data URL
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
