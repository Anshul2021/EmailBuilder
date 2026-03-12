"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Skeleton } from "primereact/skeleton";
import { PreviewToolbar } from "./PreviewToolbar";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { MailOpen } from "lucide-react";
import { PropertiesPanel } from "./PropertiesPanel";
import type { ElementProperties } from "./PropertiesPanel";
import { SectionControls } from "./SectionControls";
import { SectionEditBar } from "./SectionEditBar";
import type { MjmlNode } from "@/lib/mjmlTree";
import type { SectionEditState } from "./LayerPanel";

interface LivePreviewProps {
    html: string;
    mjml: string;
    isLoading: boolean;
    loadingType?: "generating" | "saving";
    onMjmlChange?: (newMjml: string, newHtml: string) => void;
    onCopyMjml: () => void;
    onExportHtml: () => void;
    onSaveTemplate?: () => void;
    onOpenHistory?: () => void;
    // Section editing callbacks
    onSectionEdit?: (instruction: string, sectionIndex: number) => void;
    onSectionDuplicate?: (sectionIndex: number) => void;
    onSectionDelete?: (sectionIndex: number) => void;
    onSectionMove?: (fromIndex: number, toIndex: number) => void;
    isSectionEditing?: boolean;
    // Layer panel props
    mjmlTree: MjmlNode | null;
    selectedLayerNodeId: string | null;
    sectionEditStates: Map<string, SectionEditState>;
    onLayerSelect: (nodeId: string) => void;
    onLayerToggleExpand: (nodeId: string) => void;
    onLayerToggleHidden: (nodeId: string) => void;
    onLayerDelete: (nodeId: string) => void;
    onLayerDuplicate: (nodeId: string) => void;
    onLayerRename: (nodeId: string, newName: string) => void;
    onLayerMove: (nodeId: string, targetId: string, position: "before" | "after" | "inside") => void;
    onLayerAiEdit: (nodeId: string) => void;
    // Bidirectional hover sync
    hoveredLayerNodeId: string | null;
    onLayerHover: (nodeId: string | null) => void;
}

const DEFAULT_PROPS: ElementProperties = {
    fontSize: 16,
    fontWeight: "normal",
    color: "#1e293b",
    align: "left",
    fontFamily: "",
    content: "",
    elementTag: "",
    isImage: false,
    width: 100,
    borderRadius: 0,
    backgroundColor: "#ffffff",
    letterSpacing: "normal",
    lineHeight: "normal",
    textDecoration: "none",
    fontStyle: "normal",
    verticalAlign: "baseline",
    textShadow: "",
    
    paddingTop: "0",
    paddingRight: "0",
    paddingBottom: "0",
    paddingLeft: "0",

    backgroundImage: "none",
    backgroundPosition: "auto",
    backgroundRepeat: "repeat",
    backgroundSize: "auto",
    containerBackgroundColor: "none",
    innerBackgroundColor: "none",

    borderWidth: "0",
    borderStyle: "solid",
    borderColor: "black",

    height: "",
};

function rgbToHex(rgb: string, defaultColor = "#1e293b"): string {
    if (!rgb || rgb === "rgba(0, 0, 0, 0)") return defaultColor;
    if (rgb.startsWith("#")) return rgb;
    const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return defaultColor;
    return "#" + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("");
}

// ── Drag-to-resize constants ────────────────────────────────────────────────
const PANEL_MIN_WIDTH = 240;
const PANEL_MAX_WIDTH = 520;
const PANEL_DEFAULT_WIDTH = 340;

export function LivePreview({
    html,
    mjml,
    isLoading,
    loadingType = "generating",
    onMjmlChange,
    onCopyMjml,
    onExportHtml,
    onSaveTemplate,
    onOpenHistory,
    onSectionEdit,
    onSectionDuplicate,
    onSectionDelete,
    onSectionMove,
    isSectionEditing = false,
    // Layer panel
    mjmlTree,
    selectedLayerNodeId,
    sectionEditStates,
    onLayerSelect,
    onLayerToggleExpand,
    onLayerToggleHidden,
    onLayerDelete,
    onLayerDuplicate,
    onLayerRename,
    onLayerMove,
    onLayerAiEdit,
    hoveredLayerNodeId,
    onLayerHover,
}: LivePreviewProps) {
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
    const [showEditPanel, setShowEditPanel] = useState(true);
    const [selectedProps, setSelectedProps] = useState<ElementProperties>(DEFAULT_PROPS);
    const [hasSelection, setHasSelection] = useState(false);
    const [copied, setCopied] = useState(false);

    // Right-panel draggable width
    const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
    const dragStartWidthRef = useRef(PANEL_DEFAULT_WIDTH);

    const clickedImageRef = useRef<HTMLImageElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const selectedElementRef = useRef<HTMLElement | null>(null);

    // Section editing state
    const [hoveredSectionIndex, setHoveredSectionIndex] = useState<number | null>(null);
    const [sectionControlsPos, setSectionControlsPos] = useState<{ top: number; right: number } | null>(null);
    const [showSectionEditBar, setShowSectionEditBar] = useState(false);
    const [editBarPosition, setEditBarPosition] = useState({ top: 0, left: 0, width: 400 });
    const [editingSectionIndex, setEditingSectionIndex] = useState<number>(0);
    const [sectionCount, setSectionCount] = useState(0);

    // History (Undo/Redo)
    const [undoStack, setUndoStack] = useState<string[]>([]);
    const [redoStack, setRedoStack] = useState<string[]>([]);
    const initialHtmlRef = useRef<string>(html);

    useEffect(() => {
        if (html && !initialHtmlRef.current) {
            initialHtmlRef.current = html;
        }
    }, [html]);

    const saveVersion = useCallback((newHtml: string) => {
        setUndoStack(prev => {
            if (prev.length > 0 && prev[prev.length - 1] === newHtml) return prev;
            return [...prev, newHtml].slice(-50);
        });
        setRedoStack([]);
    }, []);

    // Resizing state
    const isResizingRef = useRef(false);
    const resizeStartXRef = useRef(0);
    const resizeStartWidthRef = useRef(0);
    const resizeTargetRef = useRef<HTMLImageElement | null>(null);

    // Dragging state inside iframe (Block Reordering)
    const isBlockDraggingRef = useRef(false);
    const dragTargetRef = useRef<HTMLElement | null>(null);
    const ghostElementRef = useRef<HTMLElement | null>(null);
    const dropTargetRef = useRef<HTMLElement | null>(null);
    const dropPositionRef = useRef<"before" | "after">("before");

    // Refs to avoid stale closures in iframe event listeners
    const onMjmlChangeRef = useRef(onMjmlChange);
    const mjmlRef = useRef(mjml);
    const onLayerSelectRef = useRef(onLayerSelect);
    const mjmlTreeRef = useRef(mjmlTree);
    useEffect(() => { onMjmlChangeRef.current = onMjmlChange; }, [onMjmlChange]);
    useEffect(() => { mjmlRef.current = mjml; }, [mjml]);
    useEffect(() => { onLayerSelectRef.current = onLayerSelect; }, [onLayerSelect]);
    useEffect(() => { mjmlTreeRef.current = mjmlTree; }, [mjmlTree]);

    // ── Bidirectional layer ↔ preview highlight ──
    // When hoveredLayerNodeId or selectedLayerNodeId changes, find the matching
    // section in the iframe and highlight + scroll to it.
    const highlightSectionRef = useRef<HTMLElement | null>(null);
    useEffect(() => {
        const targetNodeId = hoveredLayerNodeId || selectedLayerNodeId;
        const iframe = iframeRef.current;
        const doc = iframe?.contentDocument;
        if (!doc) return;

        // Clear previous highlight
        if (highlightSectionRef.current) {
            highlightSectionRef.current.classList.remove("ag-section-highlight");
            highlightSectionRef.current = null;
        }

        if (!targetNodeId || !mjmlTree) return;

        // Find section index from the tree node ID
        // Walk body's children to find which section this node belongs to
        const bodyNode = mjmlTree.children.find(c => c.type === "body") || mjmlTree;
        const sections = bodyNode.children.filter(c => c.type === "section" && !c.isHidden);
        let sectionIdx = -1;

        // Check if the node IS a section
        sectionIdx = sections.findIndex(s => s.id === targetNodeId);

        // Or if the node is a child of a section
        if (sectionIdx === -1) {
            const findInChildren = (node: MjmlNode, id: string): boolean => {
                if (node.id === id) return true;
                return node.children.some(c => findInChildren(c, id));
            };
            sectionIdx = sections.findIndex(s => findInChildren(s, targetNodeId));
        }

        if (sectionIdx === -1) return;

        // Find the element in the iframe by ag-section-N class or data-section-index
        const el = doc.querySelector(`[data-section-index="${sectionIdx}"]`) as HTMLElement
            || doc.querySelector(`.ag-section-${sectionIdx}`) as HTMLElement;

        if (el) {
            el.classList.add("ag-section-highlight");
            highlightSectionRef.current = el;
            // Scroll into view on selection (not hover to avoid jitter)
            if (selectedLayerNodeId === targetNodeId) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [hoveredLayerNodeId, selectedLayerNodeId, mjmlTree]);

    // Helper to propagate iframe DOM changes to parent
    const propagateChanges = useCallback(() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) onMjmlChangeRef.current?.(mjmlRef.current, doc.documentElement.outerHTML);
    }, []);

    // Re-apply all current style properties to the element
    const reapplyStyles = useCallback((el: HTMLElement, props: ElementProperties) => {
        if (props.isImage) {
            const img = el as HTMLImageElement;
            if (props.width !== undefined) {
                img.style.width = `${props.width}%`;
                img.setAttribute("width", `${props.width}%`);
            }
            if (props.borderRadius !== undefined) img.style.borderRadius = typeof props.borderRadius === 'number' ? `${props.borderRadius}px` : (props.borderRadius || "");
        } else {
            if (props.fontSize) el.style.fontSize = typeof props.fontSize === 'number' ? `${props.fontSize}px` : props.fontSize;
            if (props.fontWeight) el.style.fontWeight = props.fontWeight;
            if (props.color) el.style.color = props.color;
            if (props.backgroundColor) el.style.backgroundColor = props.backgroundColor;
            if (props.align) el.style.textAlign = props.align;
            if (props.fontFamily) el.style.fontFamily = props.fontFamily;
            if (props.letterSpacing) el.style.letterSpacing = props.letterSpacing;
            if (props.lineHeight) el.style.lineHeight = props.lineHeight;
            if (props.textDecoration) el.style.textDecoration = props.textDecoration;
            if (props.fontStyle) el.style.fontStyle = props.fontStyle;
            if (props.verticalAlign) el.style.verticalAlign = props.verticalAlign;
            if (props.textShadow) el.style.textShadow = props.textShadow;
            
            if (props.paddingTop) el.style.paddingTop = props.paddingTop;
            if (props.paddingRight) el.style.paddingRight = props.paddingRight;
            if (props.paddingBottom) el.style.paddingBottom = props.paddingBottom;
            if (props.paddingLeft) el.style.paddingLeft = props.paddingLeft;

            if (props.backgroundImage && props.backgroundImage !== "none") el.style.backgroundImage = `url(${props.backgroundImage})`;
            else if (props.backgroundImage === "none") el.style.backgroundImage = "none";
            
            if (props.backgroundPosition) el.style.backgroundPosition = props.backgroundPosition;
            if (props.backgroundRepeat) el.style.backgroundRepeat = props.backgroundRepeat;
            if (props.backgroundSize) el.style.backgroundSize = props.backgroundSize;

            if (props.borderRadius !== undefined) el.style.borderRadius = typeof props.borderRadius === 'number' ? `${props.borderRadius}px` : (props.borderRadius || "");
            if (props.borderWidth) el.style.borderWidth = props.borderWidth;
            if (props.borderStyle) el.style.borderStyle = props.borderStyle;
            if (props.borderColor) el.style.borderColor = props.borderColor;

            if (props.height) el.style.height = props.height;
        }
    }, []);

    // Helper to inject styles and handle elements into the iframe
    const injectIframeStyles = useCallback((doc: Document) => {
        if (!doc.head || !doc.body) return;

        const styleId = "ag-preview-styles";
        if (!doc.getElementById(styleId)) {
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
                    display: inline-block;
                }
                p:hover, h1:hover, h2:hover, h3:hover, h4:hover, h5:hover, h6:hover, td:hover, span:hover, a:hover {
                    outline: 1px dashed #c4b5fd !important;
                    outline-offset: 2px;
                }
                img:hover {
                    outline: 2px dashed #7c3aed !important;
                    outline-offset: 3px;
                    filter: brightness(0.95);
                }
                .ag-selected {
                    outline: 2px solid #7c3aed !important;
                    outline-offset: 3px;
                    border-radius: 2px;
                }
                .ag-img-selected {
                    outline: 3px solid #7c3aed !important;
                    outline-offset: 2px;
                }
                [contenteditable="true"] {
                    cursor: text !important;
                    outline: 2px solid #7c3aed !important;
                    outline-offset: 3px;
                    border-radius: 2px;
                    white-space: pre-wrap;
                }

                /* Section hover highlight */
                .ag-section-highlight {
                    outline: 2px dashed #a78bfa !important;
                    outline-offset: -2px;
                    position: relative;
                }

                .ag-delete-handle {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: #ef4444;
                    color: white;
                    border: 2px solid white;
                    border-radius: 4px;
                    cursor: pointer;
                    z-index: 1000;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    display: none;
                    text-align: center;
                    line-height: 16px;
                    font-size: 14px;
                    font-weight: bold;
                    user-select: none;
                    font-family: sans-serif;
                }
                .ag-delete-handle:hover { background: #dc2626; }
                .ag-resize-handle {
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    background: #7c3aed;
                    border: 2px solid white;
                    border-radius: 50%;
                    cursor: nwse-resize;
                    z-index: 1000;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    display: none;
                }
                .ag-drag-handle {
                    position: absolute;
                    width: 24px;
                    height: 24px;
                    background: #7c3aed;
                    border: 2px solid white;
                    border-radius: 4px;
                    cursor: grab;
                    z-index: 1000;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    display: none;
                    color: white;
                    text-align: center;
                    line-height: 20px;
                    font-size: 14px;
                    user-select: none;
                    font-family: sans-serif;
                }
                .ag-drag-handle:active {
                    cursor: grabbing;
                }
                .ag-drop-indicator {
                    position: absolute;
                    height: 4px;
                    background: #3b82f6;
                    border-radius: 2px;
                    z-index: 999;
                    display: none;
                    pointer-events: none;
                    box-shadow: 0 0 4px rgba(59, 130, 246, 0.5);
                }
                .ag-ghost {
                    position: fixed !important;
                    pointer-events: none !important;
                    opacity: 0.8 !important;
                    z-index: 9999 !important;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
                    transition: none !important;
                    background: white !important;
                    margin: 0 !important;
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
        }

        // Add resize handle element if not exists
        if (!doc.getElementById("ag-resize-handle")) {
            const handle = doc.createElement("div");
            handle.id = "ag-resize-handle";
            handle.className = "ag-resize-handle";
            doc.body.appendChild(handle);
        }

        if (!doc.getElementById("ag-drag-handle")) {
            const handle = doc.createElement("div");
            handle.id = "ag-drag-handle";
            handle.className = "ag-drag-handle";
            handle.innerHTML = "⋮⋮";
            doc.body.appendChild(handle);
        }

        if (!doc.getElementById("ag-delete-handle")) {
            const handle = doc.createElement("div");
            handle.id = "ag-delete-handle";
            handle.className = "ag-delete-handle";
            handle.innerHTML = "×";
            handle.title = "Delete block";
            doc.body.appendChild(handle);
        }
        if (!doc.getElementById("ag-drop-indicator")) {
            const indicator = doc.createElement("div");
            indicator.id = "ag-drop-indicator";
            indicator.className = "ag-drop-indicator";
            doc.body.appendChild(indicator);
        }

        // ──── Section detection via css-class markers ────
        // The API route injects css-class="ag-section-N" on each <mj-section>
        // before MJML compilation. The compiled HTML carries these classes
        // on the section wrapper elements (td or div), making detection reliable.
        const allElements = doc.querySelectorAll('[class*="ag-section-"]');
        let maxIdx = -1;
        allElements.forEach((el) => {
            const classList = el.className || "";
            const match = classList.match(/ag-section-(\d+)/);
            if (match) {
                const idx = parseInt(match[1], 10);
                // Also set data-section-index for easy lookup
                el.setAttribute("data-section-index", String(idx));
                if (idx > maxIdx) maxIdx = idx;
            }
        });
        setSectionCount(maxIdx + 1);
    }, []);

    const updateResizeHandlePosition = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument) return;
        const doc = iframe.contentDocument;
        const resizeHandle = doc.getElementById("ag-resize-handle");
        const dragHandle = doc.getElementById("ag-drag-handle");
        const el = selectedElementRef.current;

        if (el) {
            const rect = el.getBoundingClientRect();
            const scrollX = iframe.contentWindow?.scrollX || 0;
            const scrollY = iframe.contentWindow?.scrollY || 0;

            const deleteHandle = doc.getElementById("ag-delete-handle");
            if (dragHandle && !isBlockDraggingRef.current) {
                dragHandle.style.left = `${rect.left + scrollX - 12}px`;
                dragHandle.style.top = `${rect.top + scrollY - 12}px`;
                dragHandle.style.display = "block";
            }
            if (deleteHandle && !isBlockDraggingRef.current) {
                deleteHandle.style.left = `${rect.right + scrollX - 8}px`;
                deleteHandle.style.top = `${rect.top + scrollY - 12}px`;
                deleteHandle.style.display = "block";
            }

            if (resizeHandle && el.tagName === "IMG") {
                resizeHandle.style.left = `${rect.right + scrollX - 6}px`;
                resizeHandle.style.top = `${rect.bottom + scrollY - 6}px`;
                resizeHandle.style.display = "block";
            } else if (resizeHandle) {
                resizeHandle.style.display = "none";
            }
        } else {
            if (resizeHandle) resizeHandle.style.display = "none";
            if (dragHandle) dragHandle.style.display = "none";
            const deleteHandle = doc.getElementById("ag-delete-handle");
            if (deleteHandle) deleteHandle.style.display = "none";
        }
    }, []);

    const applyHtmlToIframe = useCallback((newHtmlStr: string) => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(newHtmlStr, "text/html");
        doc.head.innerHTML = newDoc.head.innerHTML;
        doc.body.innerHTML = newDoc.body.innerHTML;
        injectIframeStyles(doc);
        selectedElementRef.current = null;
        setHasSelection(false);
        setSelectedProps(DEFAULT_PROPS);
        updateResizeHandlePosition();
    }, [injectIframeStyles, updateResizeHandlePosition]);

    const undo = useCallback(() => {
        if (undoStack.length === 0) return;
        const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || "";
        const previousHtml = undoStack[undoStack.length - 1];
        setRedoStack(prev => [...prev, currentHtml]);
        setUndoStack(prev => prev.slice(0, -1));
        applyHtmlToIframe(previousHtml);
        if (onMjmlChangeRef.current) onMjmlChangeRef.current(mjmlRef.current, previousHtml);
    }, [undoStack, applyHtmlToIframe]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;
        const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || "";
        const nextHtml = redoStack[redoStack.length - 1];
        setUndoStack(prev => [...prev, currentHtml]);
        setRedoStack(prev => prev.slice(0, -1));
        applyHtmlToIframe(nextHtml);
        if (onMjmlChangeRef.current) onMjmlChangeRef.current(mjmlRef.current, nextHtml);
    }, [redoStack, applyHtmlToIframe]);

    const reset = useCallback(() => {
        if (!initialHtmlRef.current) return;
        if (window.confirm("Are you sure you want to reset all changes?")) {
            const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || "";
            saveVersion(currentHtml);
            applyHtmlToIframe(initialHtmlRef.current);
            if (onMjmlChangeRef.current) onMjmlChangeRef.current(mjmlRef.current, initialHtmlRef.current);
        }
    }, [saveVersion, applyHtmlToIframe]);

    // ── Section hover detection ──
    // Walk up the DOM from the target element looking for an element
    // with ag-section-N class (set by API route during MJML compilation).
    const findSectionFromElement = useCallback((target: HTMLElement): { element: HTMLElement; index: number } | null => {
        let el: HTMLElement | null = target;
        while (el) {
            // Check data-section-index (set during injectIframeStyles)
            const idx = el.getAttribute("data-section-index");
            if (idx !== null) {
                return { element: el, index: parseInt(idx, 10) };
            }
            // Also check css-class directly in case data attribute wasn't set yet
            const classList = el.className || "";
            if (typeof classList === "string") {
                const match = classList.match(/ag-section-(\d+)/);
                if (match) {
                    return { element: el, index: parseInt(match[1], 10) };
                }
            }
            el = el.parentElement;
        }
        return null;
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

        const clearSelection = () => {
            if (selectedElementRef.current) {
                selectedElementRef.current.classList.remove("ag-selected");
                selectedElementRef.current.classList.remove("ag-img-selected");
                selectedElementRef.current.removeAttribute("contenteditable");
                try { selectedElementRef.current.blur(); } catch { /* noop */ }
            }
            selectedElementRef.current = null;
            setHasSelection(false);
            setSelectedProps(DEFAULT_PROPS);
            updateResizeHandlePosition();
        };

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "z") {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
                e.preventDefault();
                redo();
            } else if ((e.key === "Delete" || e.key === "Backspace") && selectedElementRef.current && selectedElementRef.current.contentEditable !== "true") {
                e.preventDefault();
                saveVersion(iframeRef.current?.contentDocument?.documentElement.outerHTML || "");
                selectedElementRef.current.remove();
                propagateChanges();
                clearSelection();
            }
        };
        win.addEventListener("keydown", handleGlobalKeyDown);

        // ── Section hover tracking ──
        let lastHoveredSection: HTMLElement | null = null;
        doc.addEventListener("mousemove", (e) => {
            // Handle image resizing
            if (isResizingRef.current && resizeTargetRef.current) {
                const deltaX = e.clientX - resizeStartXRef.current;
                const newWidthPx = resizeStartWidthRef.current + deltaX;
                const parentWidth = resizeTargetRef.current.parentElement?.offsetWidth || 1;
                const newWidthPercent = Math.min(100, Math.max(10, Math.round((newWidthPx / parentWidth) * 100)));

                resizeTargetRef.current.style.width = `${newWidthPercent}%`;
                resizeTargetRef.current.setAttribute("width", `${newWidthPercent}%`);

                setSelectedProps(prev => ({ ...prev, width: newWidthPercent }));
                updateResizeHandlePosition();
                return;
            }

            // Handle block dragging
            if (isBlockDraggingRef.current && ghostElementRef.current && dragTargetRef.current) {
                e.preventDefault();
                const ghost = ghostElementRef.current;
                const offsetX = (ghost as unknown as { _offsetX: number })._offsetX || 0;
                const offsetY = (ghost as unknown as { _offsetY: number })._offsetY || 0;
                ghost.style.left = `${e.clientX - offsetX}px`;
                ghost.style.top = `${e.clientY - offsetY}px`;

                ghost.style.display = 'none';
                const elUnderMouse = doc.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
                ghost.style.display = '';

                const dropIndicator = doc.getElementById("ag-drop-indicator");
                let dropTarget: HTMLElement | null = elUnderMouse;
                while (dropTarget && dropTarget !== doc.body && dropTarget !== doc.documentElement) {
                    if (EDITABLE_TAGS.includes(dropTarget.tagName) || dropTarget.tagName === "IMG") break;
                    dropTarget = dropTarget.parentElement;
                }

                if (dropTarget && dropTarget !== dragTargetRef.current && dropTarget.tagName !== "BODY" && dropTarget.tagName !== "HTML") {
                    const rect = dropTarget.getBoundingClientRect();
                    const isTopHalf = e.clientY < rect.top + rect.height / 2;
                    dropPositionRef.current = isTopHalf ? "before" : "after";
                    dropTargetRef.current = dropTarget;
                    const scrollX = win.scrollX;
                    const scrollY = win.scrollY;
                    if (dropIndicator) {
                        dropIndicator.style.width = `${rect.width}px`;
                        dropIndicator.style.left = `${rect.left + scrollX}px`;
                        dropIndicator.style.top = isTopHalf ? `${rect.top + scrollY - 2}px` : `${rect.bottom + scrollY - 2}px`;
                        dropIndicator.style.display = "block";
                    }
                } else {
                    dropTargetRef.current = null;
                    if (dropIndicator) dropIndicator.style.display = "none";
                }
                return;
            }

            // Section hover detection
            const target = e.target as HTMLElement;
            const sectionInfo = findSectionFromElement(target);

            if (sectionInfo) {
                if (lastHoveredSection !== sectionInfo.element) {
                    if (lastHoveredSection) lastHoveredSection.classList.remove("ag-section-highlight");
                    sectionInfo.element.classList.add("ag-section-highlight");
                    lastHoveredSection = sectionInfo.element;

                    // Calculate position for section controls (in page coordinates)
                    const iframeRect = iframe.getBoundingClientRect();
                    const sectionRect = sectionInfo.element.getBoundingClientRect();
                    setHoveredSectionIndex(sectionInfo.index);
                    setSectionControlsPos({
                        top: iframeRect.top + sectionRect.top + 4,
                        right: window.innerWidth - (iframeRect.left + sectionRect.right) + 4,
                    });
                }
            } else {
                if (lastHoveredSection) {
                    lastHoveredSection.classList.remove("ag-section-highlight");
                    lastHoveredSection = null;
                }
                setHoveredSectionIndex(null);
                setSectionControlsPos(null);
            }
        });

        // ── Preview click → select matching layer ──
        doc.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            const sectionInfo = findSectionFromElement(target);
            if (sectionInfo && mjmlTreeRef.current && onLayerSelectRef.current) {
                const tree = mjmlTreeRef.current;
                const bodyNode = tree.children.find(c => c.type === "body") || tree;
                const sections = bodyNode.children.filter(c => c.type === "section" && !c.isHidden);
                const sectionNode = sections[sectionInfo.index];
                if (sectionNode) {
                    onLayerSelectRef.current(sectionNode.id);
                }
            }
        });

        doc.addEventListener("mousedown", (e) => {
            const target = e.target as HTMLElement;
            const resizeHandle = doc.getElementById("ag-resize-handle");
            const deleteHandle = doc.getElementById("ag-delete-handle");
            if (target === deleteHandle && selectedElementRef.current) {
                e.preventDefault();
                e.stopPropagation();
                saveVersion(doc.documentElement.outerHTML);
                selectedElementRef.current.remove();
                propagateChanges();
                clearSelection();
                return;
            }

            const dragHandle = doc.getElementById("ag-drag-handle");

            if (target === resizeHandle && selectedElementRef.current?.tagName === "IMG") {
                e.preventDefault();
                isResizingRef.current = true;
                resizeTargetRef.current = selectedElementRef.current as HTMLImageElement;
                resizeStartXRef.current = e.clientX;
                resizeStartWidthRef.current = resizeTargetRef.current.offsetWidth;
                return;
            }

            if (target === dragHandle && selectedElementRef.current) {
                e.preventDefault();
                e.stopPropagation();

                isBlockDraggingRef.current = true;
                dragTargetRef.current = selectedElementRef.current;

                if (dragHandle) dragHandle.style.display = "none";
                if (resizeHandle) resizeHandle.style.display = "none";

                const rect = selectedElementRef.current.getBoundingClientRect();
                const ghost = selectedElementRef.current.cloneNode(true) as HTMLElement;
                ghost.removeAttribute("contenteditable");
                ghost.classList.add("ag-ghost");
                ghost.style.width = `${rect.width}px`;
                ghost.style.height = `${rect.height}px`;
                ghost.style.left = `${rect.left}px`;
                ghost.style.top = `${rect.top}px`;

                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;
                selectedElementRef.current.style.opacity = "0.3";
                ghostElementRef.current = ghost;
                (ghost as unknown as { _offsetX: number })._offsetX = offsetX;
                (ghost as unknown as { _offsetY: number })._offsetY = offsetY;
                return;
            }

            if (target.tagName === "IMG") {
                e.stopPropagation();
                if (selectedElementRef.current && selectedElementRef.current !== target) {
                    selectedElementRef.current.classList.remove("ag-selected");
                    selectedElementRef.current.classList.remove("ag-img-selected");
                }

                selectedElementRef.current = target;
                target.classList.add("ag-img-selected");
                clickedImageRef.current = target as HTMLImageElement;

                const cs = win.getComputedStyle(target);
                const attrWidth = target.getAttribute("width");
                let widthPercent = 100;
                if (attrWidth && attrWidth.endsWith("%")) {
                    widthPercent = parseInt(attrWidth);
                } else if (target.style.width && target.style.width.endsWith("%")) {
                    widthPercent = parseInt(target.style.width);
                } else {
                    const parentWidth = target.parentElement?.offsetWidth || 1;
                    widthPercent = Math.round((target.offsetWidth / parentWidth) * 100);
                }

                setSelectedProps({
                    ...DEFAULT_PROPS,
                    isImage: true,
                    elementTag: "img",
                    width: widthPercent,
                    borderRadius: parseInt(cs.borderRadius) || 0,
                    src: (target as HTMLImageElement).src
                });
                setHasSelection(true);
                setShowEditPanel(true);
                setTimeout(updateResizeHandlePosition, 0);
                return;
            }

            if (EDITABLE_TAGS.includes(target.tagName)) {
                if (selectedElementRef.current && selectedElementRef.current !== target) {
                    selectedElementRef.current.classList.remove("ag-selected");
                    selectedElementRef.current.classList.remove("ag-img-selected");
                }
                selectedElementRef.current = target;
                target.classList.add("ag-selected");

                const cs = win.getComputedStyle(target);
                const align = cs.textAlign as "left" | "center" | "right";

                setSelectedProps({
                    ...DEFAULT_PROPS,
                    isImage: false,
                    fontSize: cs.fontSize || 16,
                    fontWeight: cs.fontWeight === "700" || cs.fontWeight === "bold" ? "bold" : cs.fontWeight || "normal",
                    color: rgbToHex(cs.color),
                    backgroundColor: rgbToHex(cs.backgroundColor, "#ffffff"),
                    align: (["left", "center", "right", "justify"].includes(align) ? align : "left") as "left" | "center" | "right" | "justify",
                    fontFamily: cs.fontFamily || "",
                    letterSpacing: cs.letterSpacing || "normal",
                    lineHeight: cs.lineHeight || "normal",
                    textDecoration: cs.textDecorationLine || "none",
                    fontStyle: cs.fontStyle || "normal",
                    verticalAlign: cs.verticalAlign || "baseline",
                    textShadow: cs.textShadow || "none",
                    
                    paddingTop: cs.paddingTop || "0",
                    paddingRight: cs.paddingRight || "0",
                    paddingBottom: cs.paddingBottom || "0",
                    paddingLeft: cs.paddingLeft || "0",

                    backgroundImage: cs.backgroundImage === "none" ? "none" : cs.backgroundImage.replace(/^url\(["']?/, "").replace(/["']?\)$/, ""),
                    backgroundPosition: cs.backgroundPosition || "auto",
                    backgroundRepeat: cs.backgroundRepeat || "repeat",
                    backgroundSize: cs.backgroundSize || "auto",

                    borderWidth: cs.borderWidth || "0",
                    borderStyle: cs.borderStyle || "solid",
                    borderColor: rgbToHex(cs.borderColor) || "black",

                    height: cs.height || "",
                    content: target.innerHTML || target.textContent || "",
                    elementTag: target.tagName.toLowerCase(),
                });
                setHasSelection(true);
                setShowEditPanel(true);
                updateResizeHandlePosition();
                return;
            }

            // Clicked outside any editable element
            if (target === doc.body || target === doc.documentElement) {
                clearSelection();
            }
        });

        doc.addEventListener("mouseup", () => {
            if (isResizingRef.current) {
                isResizingRef.current = false;
                resizeTargetRef.current = null;
                propagateChanges();
            }

            if (isBlockDraggingRef.current) {
                isBlockDraggingRef.current = false;

                const dragTarget = dragTargetRef.current;
                const dropTarget = dropTargetRef.current;
                const position = dropPositionRef.current;
                const ghost = ghostElementRef.current;
                const dropIndicator = doc.getElementById("ag-drop-indicator");

                if (ghost) ghost.remove();
                if (dropIndicator) dropIndicator.style.display = "none";

                if (dragTarget) {
                    dragTarget.style.opacity = "";

                    if (dropTarget && dropTarget.parentNode) {
                        try {
                            if (position === "before") {
                                dropTarget.parentNode.insertBefore(dragTarget, dropTarget);
                            } else {
                                if (dropTarget.nextSibling) {
                                    dropTarget.parentNode.insertBefore(dragTarget, dropTarget.nextSibling);
                                } else {
                                    dropTarget.parentNode.appendChild(dragTarget);
                                }
                            }
                            propagateChanges();
                        } catch (err) {
                            console.error("Failed to reorder element:", err);
                        }
                    }
                }

                dragTargetRef.current = null;
                dropTargetRef.current = null;
                ghostElementRef.current = null;
                setTimeout(updateResizeHandlePosition, 10);
            }
        });

        doc.addEventListener("input", (e) => {
            const target = e.target as HTMLElement;
            if (target.contentEditable === "true") {
                const newContent = target.innerHTML || target.textContent || "";
                setSelectedProps(prev => ({ ...prev, content: newContent }));
                onMjmlChangeRef.current?.(mjmlRef.current, doc.documentElement.outerHTML);
            }
        });

        doc.addEventListener("keydown", (e) => {
            if (e.key === "Escape") clearSelection();
        });

        // Polling update for layout shifts
        const interval = setInterval(updateResizeHandlePosition, 500);
        return () => clearInterval(interval);
    }, [injectIframeStyles, updateResizeHandlePosition, propagateChanges, undo, redo, saveVersion, findSectionFromElement]);

    // Re-inject styles and reposition handle when html changes
    useEffect(() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
            injectIframeStyles(doc);
            updateResizeHandlePosition();
        }
    }, [html, injectIframeStyles, updateResizeHandlePosition]);

    // Apply style changes to the selected iframe element
    const applyStyle = useCallback((prop: Partial<ElementProperties>) => {
        setSelectedProps(prev => {
            const next = { ...prev, ...prop };
            const el = selectedElementRef.current;
            if (el) {
                if (next.isImage) {
                    const img = el as HTMLImageElement;
                    if (prop.width !== undefined) {
                        img.style.width = `${next.width}%`;
                        img.setAttribute("width", `${next.width}%`);
                    }
                    if (prop.borderRadius !== undefined) img.style.borderRadius = typeof next.borderRadius === 'number' ? `${next.borderRadius}px` : (next.borderRadius || "");
                    setTimeout(updateResizeHandlePosition, 0);
                } else {
                    if (prop.fontSize !== undefined) el.style.fontSize = typeof next.fontSize === 'number' ? `${next.fontSize}px` : next.fontSize;
                    if (prop.fontWeight !== undefined) el.style.fontWeight = next.fontWeight;
                    if (prop.color !== undefined) el.style.color = next.color;
                    if (prop.backgroundColor !== undefined) el.style.backgroundColor = next.backgroundColor;
                    if (prop.align !== undefined) {
                        el.style.textAlign = next.align;
                        if (el.hasAttribute("align")) el.setAttribute("align", next.align);
                    }
                    if (prop.fontFamily !== undefined) el.style.fontFamily = next.fontFamily;
                    if (prop.letterSpacing !== undefined) el.style.letterSpacing = next.letterSpacing || "";
                    if (prop.lineHeight !== undefined) el.style.lineHeight = next.lineHeight || "";
                    if (prop.textDecoration !== undefined) el.style.textDecoration = next.textDecoration || "";
                    if (prop.fontStyle !== undefined) el.style.fontStyle = next.fontStyle || "";
                    if (prop.verticalAlign !== undefined) el.style.verticalAlign = next.verticalAlign || "";
                    if (prop.textShadow !== undefined) el.style.textShadow = next.textShadow || "";
                    
                    if (prop.paddingTop !== undefined) el.style.paddingTop = next.paddingTop || "";
                    if (prop.paddingRight !== undefined) el.style.paddingRight = next.paddingRight || "";
                    if (prop.paddingBottom !== undefined) el.style.paddingBottom = next.paddingBottom || "";
                    if (prop.paddingLeft !== undefined) el.style.paddingLeft = next.paddingLeft || "";

                    if (prop.backgroundImage !== undefined) {
                      if (next.backgroundImage === "none" || !next.backgroundImage) {
                         el.style.backgroundImage = "none";
                      } else {
                         el.style.backgroundImage = `url(${next.backgroundImage})`;
                      }
                    }
                    if (prop.backgroundPosition !== undefined) el.style.backgroundPosition = next.backgroundPosition || "";
                    if (prop.backgroundRepeat !== undefined) el.style.backgroundRepeat = next.backgroundRepeat || "";
                    if (prop.backgroundSize !== undefined) el.style.backgroundSize = next.backgroundSize || "";

                    if (prop.borderRadius !== undefined) el.style.borderRadius = typeof next.borderRadius === 'number' ? `${next.borderRadius}px` : (next.borderRadius || "");
                    if (prop.borderWidth !== undefined) el.style.borderWidth = next.borderWidth || "";
                    if (prop.borderStyle !== undefined) el.style.borderStyle = next.borderStyle || "";
                    if (prop.borderColor !== undefined) el.style.borderColor = next.borderColor || "";
                    
                    if (prop.height !== undefined) el.style.height = next.height || "";
                }
            }
            propagateChanges();
            return next;
        });
    }, [propagateChanges, updateResizeHandlePosition]);

    // Enable contentEditable on selected element
    const enableTextEdit = () => {
        const el = selectedElementRef.current;
        if (!el || el.tagName === "IMG") return;
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
            if (el && !next.isImage) {
                el.innerHTML = contentStr;
                reapplyStyles(el, next);
                propagateChanges();
            }
            return next;
        });
    }, [reapplyStyles, propagateChanges]);

    // Handle image replacement
    const handleReplaceImage = () => {
        imageInputRef.current?.click();
    };

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !clickedImageRef.current) return;

        const targetImg = clickedImageRef.current;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl && targetImg) {
                targetImg.src = dataUrl;
                setSelectedProps(prev => ({ ...prev, src: dataUrl }));
                propagateChanges();
                setTimeout(updateResizeHandlePosition, 100);
            }
        };
        reader.readAsDataURL(file);
        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    // Handle adding a new text block
    const handleAddText = useCallback(() => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;

        saveVersion(doc.documentElement.outerHTML);

        const newBlock = doc.createElement("div");
        newBlock.innerHTML = "New Text Block. Click to edit.";
        newBlock.style.padding = "10px";
        newBlock.style.color = "#1e293b";
        newBlock.style.fontSize = "16px";
        newBlock.style.fontFamily = "sans-serif";
        newBlock.style.textAlign = "left";

        const selected = selectedElementRef.current;
        if (selected && selected.parentNode && selected.tagName !== "BODY" && selected.tagName !== "HTML") {
            if (selected.nextSibling) {
                selected.parentNode.insertBefore(newBlock, selected.nextSibling);
            } else {
                selected.parentNode.appendChild(newBlock);
            }
        } else {
            const container = doc.querySelector("body > div") || doc.body;
            container.appendChild(newBlock);
        }

        setTimeout(() => {
            const clickEvent = new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: iframeRef.current?.contentWindow });
            newBlock.dispatchEvent(clickEvent);
            newBlock.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);

        propagateChanges();
    }, [saveVersion, propagateChanges]);

    const handleCopyMjml = () => {
        onCopyMjml();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Section action handlers ──
    const handleSectionAiEdit = useCallback((sectionIndex: number) => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const iframeRect = iframe.getBoundingClientRect();
        const doc = iframe.contentDocument;
        if (!doc) return;

        const sectionEl = doc.querySelector(`[data-section-index="${sectionIndex}"]`) as HTMLElement;
        if (!sectionEl) return;

        const sectionRect = sectionEl.getBoundingClientRect();

        setEditingSectionIndex(sectionIndex);
        setEditBarPosition({
            top: iframeRect.top + sectionRect.top - 48,
            left: iframeRect.left + sectionRect.left,
            width: sectionRect.width,
        });
        setShowSectionEditBar(true);
    }, []);

    const handleSectionEditSubmit = useCallback((instruction: string, sectionIndex: number) => {
        if (onSectionEdit) {
            onSectionEdit(instruction, sectionIndex);
            setShowSectionEditBar(false);
        }
    }, [onSectionEdit]);

    const handleSectionDuplicate = useCallback((sectionIndex: number) => {
        if (onSectionDuplicate) onSectionDuplicate(sectionIndex);
    }, [onSectionDuplicate]);

    const handleSectionDelete = useCallback((sectionIndex: number) => {
        if (onSectionDelete && window.confirm("Delete this section?")) {
            onSectionDelete(sectionIndex);
        }
    }, [onSectionDelete]);

    const handleSectionMoveUp = useCallback((sectionIndex: number) => {
        if (onSectionMove && sectionIndex > 0) onSectionMove(sectionIndex, sectionIndex - 1);
    }, [onSectionMove]);

    const handleSectionMoveDown = useCallback((sectionIndex: number) => {
        if (onSectionMove && sectionIndex < sectionCount - 1) onSectionMove(sectionIndex, sectionIndex + 1);
    }, [onSectionMove, sectionCount]);

    // ── Drag-to-resize logic (Sidebar) ──────────────────────────────────────────
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingRef.current = true;
        dragStartXRef.current = e.clientX;
        dragStartWidthRef.current = panelWidth;

        const onMouseMove = (me: MouseEvent) => {
            if (!isDraggingRef.current) return;
            const delta = dragStartXRef.current - me.clientX;
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

    return (
        <div className="flex flex-col h-full w-full bg-[#f5f7fa]">
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />

            {/* ── Toolbar ── */}
            <PreviewToolbar
                viewMode={viewMode}
                setViewMode={setViewMode}
                showEditPanel={showEditPanel}
                setShowEditPanel={setShowEditPanel}
                undo={undo}
                redo={redo}
                reset={reset}
                undoStackLength={undoStack.length}
                redoStackLength={redoStack.length}
                html={html}
                copied={copied}
                onCopyMjml={handleCopyMjml}
                onOpenHistory={onOpenHistory}
                onSaveTemplate={onSaveTemplate}
                onExportHtml={onExportHtml}
                onAddText={handleAddText}
            />

            {/* ── Section Controls Overlay ── */}
            <AnimatePresence>
                {hoveredSectionIndex !== null && sectionControlsPos && !showSectionEditBar && (
                    <SectionControls
                        key={`section-controls-${hoveredSectionIndex}`}
                        position={sectionControlsPos}
                        sectionIndex={hoveredSectionIndex}
                        totalSections={sectionCount}
                        onAiEdit={handleSectionAiEdit}
                        onDuplicate={handleSectionDuplicate}
                        onDelete={handleSectionDelete}
                        onMoveUp={handleSectionMoveUp}
                        onMoveDown={handleSectionMoveDown}
                    />
                )}
            </AnimatePresence>

            {/* ── Section Edit Bar ── */}
            <AnimatePresence>
                {showSectionEditBar && (
                    <SectionEditBar
                        position={editBarPosition}
                        sectionIndex={editingSectionIndex}
                        onSubmit={handleSectionEditSubmit}
                        onClose={() => setShowSectionEditBar(false)}
                        isLoading={isSectionEditing}
                    />
                )}
            </AnimatePresence>

            {/* ── Content row ── */}
            <div className="flex flex-1 min-h-0">
                <div className="flex-1 overflow-auto p-6 flex items-start justify-center relative scrollbar-hide">
                    {isLoading && (
                        <div className="absolute inset-x-6 top-6 bottom-6 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] animate-fade-in rounded-xl overflow-hidden border border-slate-200/50">
                            <div className="w-full max-w-md bg-white p-8 flex flex-col gap-6 scale-95 opacity-80 pointer-events-none">
                                <div className="flex items-center justify-between">
                                    <Skeleton width="5rem" height="1.5rem" />
                                    <div className="flex gap-2">
                                        <Skeleton width="2rem" height="0.5rem" />
                                        <Skeleton width="2rem" height="0.5rem" />
                                    </div>
                                </div>
                                <Skeleton width="100%" height="160px" borderRadius="12px" />
                                <div className="space-y-3">
                                    <Skeleton width="100%" height="0.8rem" />
                                    <Skeleton width="90%" height="0.8rem" />
                                </div>
                                <div className="flex justify-center pt-2">
                                    <Skeleton width="8rem" height="2.5rem" borderRadius="8px" />
                                </div>
                                <div className="flex flex-col items-center gap-1.5 pt-4">
                                    <div className="flex items-center gap-1">
                                        <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", loadingType === "saving" ? "bg-emerald-500" : "bg-violet-600")} />
                                        <p className="text-sm font-bold text-slate-800 tracking-tight">
                                            {loadingType === "saving" ? "Saving to Supabase..." : "Gemini is crafting your email"}
                                        </p>
                                    </div>
                                    {loadingType === "saving" && (
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                            No AI credits are used for saving
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

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
                                </div>
                            </div>
                        )}
                    </div>
                </div>

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
                            <div
                                onMouseDown={handleDragStart}
                                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group flex items-center justify-center hover:bg-violet-100 transition-colors"
                                title="Drag to resize"
                            >
                                <div className="w-0.5 h-8 bg-slate-300 group-hover:bg-violet-400 rounded-full transition-colors" />
                            </div>

                            <div className="pl-1.5 h-full" style={{ width: panelWidth }}>
                                <PropertiesPanel
                                    hasSelection={hasSelection}
                                    selectedProps={selectedProps}
                                    onContentChange={handleContentChange}
                                    onApplyStyle={applyStyle}
                                    onEnableTextEdit={enableTextEdit}
                                    onReplaceImage={handleReplaceImage}
                                    onClose={() => setShowEditPanel(false)}
                                    mjmlTree={mjmlTree}
                                    selectedLayerNodeId={selectedLayerNodeId}
                                    sectionEditStates={sectionEditStates}
                                    onLayerSelect={onLayerSelect}
                                    onLayerHover={onLayerHover}
                                    onLayerToggleExpand={onLayerToggleExpand}
                                    onLayerToggleHidden={onLayerToggleHidden}
                                    onLayerDelete={onLayerDelete}
                                    onLayerDuplicate={onLayerDuplicate}
                                    onLayerRename={onLayerRename}
                                    onLayerMove={onLayerMove}
                                    onLayerAiEdit={onLayerAiEdit}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
