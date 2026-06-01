"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Skeleton } from "primereact/skeleton";
import { PreviewToolbar } from "./PreviewToolbar";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { MailOpen, FileCode, X, PencilLine } from "lucide-react";
import { PropertiesPanel } from "./PropertiesPanel";
import type { ElementProperties } from "./PropertiesPanel";
import { SectionControls } from "./SectionControls";
import { SectionEditBar } from "./SectionEditBar";
import type { MjmlNode } from "@/lib/mjmlTree";
import type { SectionEditState } from "./LayerPanel";
import HandLoading from "@/Assets/HandLoading.gif";

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
    onPreview: () => void;
    onSharePreview: () => void;
    onDownloadHtml: () => void;
    onDownloadEml: () => void;
    // Section editing callbacks
    onSectionEdit?: (instruction: string, sectionIndex: number, model: string) => void;
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
    isSharing?: boolean;
    onLoadSample?: () => void;
    isLibraryHighlighted?: boolean;
    onOpenTutorial?: () => void;
}

const GENERATING_MESSAGES = [
    "Drafting subject lines that actually get opened...",
    "Polishing layout blocks for pixel-perfect inbox rendering...",
    "Testing email responsive structures across 50+ virtual inboxes...",
    "Spam-proofing copy and balancing image-to-text ratios...",
    "Optimizing call-to-actions to spark maximum click-through rates...",
    "Weaving semantic HTML wrappers for seamless dark-mode support...",
    "Minifying code payloads to keep under the 102KB Gmail clipping limit...",
    "Polishing call-to-action buttons for irresistible clickability...",
    "Aligning column structure to withstand Outlook's rendering engine...",
    "Sprinkling preview-text hooks to boost open rates...",
    "Curating harmonious typography systems for optimal readability..."
];

const SAVING_MESSAGES = [
    "Encrypting layout variables and updating template history...",
    "Polishing design tokens and backing up block schemas...",
    "Synchronizing template versions with Supabase cloud databases...",
    "Securing email structure configurations for future revisions..."
];

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
    onPreview,
    onSharePreview,
    onDownloadHtml,
    onDownloadEml,
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
    isSharing = false,
    onLoadSample,
    isLibraryHighlighted = false,
    onOpenTutorial,
}: LivePreviewProps) {
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
    const [showEditPanel, setShowEditPanel] = useState(true);
    const [selectedProps, setSelectedProps] = useState<ElementProperties>(DEFAULT_PROPS);
    const [hasSelection, setHasSelection] = useState(false);
    const [copied, setCopied] = useState(false);
    const [simulateLoading, setSimulateLoading] = useState(false);
    const [creativeMessageIndex, setCreativeMessageIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const isMobileRef = useRef(isMobile);
    const [isShaking, setIsShaking] = useState(false);
    const [hasTilted, setHasTilted] = useState(false);

    useEffect(() => {
        isMobileRef.current = isMobile;
    }, [isMobile]);

    useEffect(() => {
        if (hasSelection && !showEditPanel && !hasTilted && isMobile) {
            const timer = setTimeout(() => {
                setHasTilted(true);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [hasSelection, showEditPanel, hasTilted, isMobile]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setShowEditPanel(false);
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (isLoading && isMobile) {
            setShowEditPanel(false);
        }
    }, [isLoading, isMobile]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading || simulateLoading) {
            setCreativeMessageIndex(0);
            const listLength = loadingType === "saving" ? SAVING_MESSAGES.length : GENERATING_MESSAGES.length;
            interval = setInterval(() => {
                setCreativeMessageIndex(prev => (prev + 1) % listLength);
            }, 5000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading, simulateLoading, loadingType]);

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

    const prevIsSectionEditing = useRef(isSectionEditing);
    useEffect(() => {
        if (prevIsSectionEditing.current && !isSectionEditing) {
            setShowSectionEditBar(false);
        }
        prevIsSectionEditing.current = isSectionEditing;
    }, [isSectionEditing]);

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

    const isEditingRef = useRef(false);
    const preEditHtmlRef = useRef<string | null>(null);
    const commitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const commitEditing = useCallback(() => {
        if (commitTimeoutRef.current) {
            clearTimeout(commitTimeoutRef.current);
            commitTimeoutRef.current = null;
        }
        if (isEditingRef.current && preEditHtmlRef.current) {
            const doc = iframeRef.current?.contentDocument;
            if (doc) {
                const currentHtml = doc.documentElement.outerHTML;
                if (currentHtml !== preEditHtmlRef.current) {
                    const htmlToSave = preEditHtmlRef.current;
                    setUndoStack(prev => {
                        if (prev.length > 0 && prev[prev.length - 1] === htmlToSave) return prev;
                        return [...prev, htmlToSave].slice(-50);
                    });
                    setRedoStack([]);
                }
            }
            isEditingRef.current = false;
            preEditHtmlRef.current = null;
        }
    }, []);

    const registerChange = useCallback(() => {
        if (!isEditingRef.current) {
            isEditingRef.current = true;
            const doc = iframeRef.current?.contentDocument;
            if (doc) {
                preEditHtmlRef.current = doc.documentElement.outerHTML;
            }
        }

        if (commitTimeoutRef.current) {
            clearTimeout(commitTimeoutRef.current);
        }
        commitTimeoutRef.current = setTimeout(commitEditing, 800);
    }, [commitEditing]);

    // Resizing state
    const isResizingRef = useRef(false);
    const resizeStartXRef = useRef(0);
    const resizeStartWidthRef = useRef(0);
    const resizeStartYRef = useRef(0);
    const resizeStartHeightRef = useRef(0);
    const resizeTargetRef = useRef<HTMLImageElement | null>(null);

    // Dragging state inside iframe (Block Reordering)
    const isBlockDraggingRef = useRef(false);
    const dragTargetRef = useRef<HTMLElement | null>(null);
    const ghostElementRef = useRef<HTMLElement | null>(null);
    const dropTargetRef = useRef<HTMLElement | null>(null);
    const dropPositionRef = useRef<"before" | "after">("before");
    const imageToolsTimeoutRef = useRef<any>(null);

    // Refs to avoid stale closures in iframe event listeners
    const onMjmlChangeRef = useRef(onMjmlChange);
    const mjmlRef = useRef(mjml);
    const onLayerSelectRef = useRef(onLayerSelect);
    const mjmlTreeRef = useRef(mjmlTree);
    useEffect(() => { onMjmlChangeRef.current = onMjmlChange; }, [onMjmlChange]);
    useEffect(() => { mjmlRef.current = mjml; }, [mjml]);
    useEffect(() => { onLayerSelectRef.current = onLayerSelect; }, [onLayerSelect]);
    useEffect(() => { mjmlTreeRef.current = mjmlTree; }, [mjmlTree]);

    useEffect(() => {
        return () => {
            if (imageToolsTimeoutRef.current) {
                clearTimeout(imageToolsTimeoutRef.current);
            }
        };
    }, []);

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

    // Sync loading state to iframe elements
    useEffect(() => {
        const iframe = iframeRef.current;
        const doc = iframe?.contentDocument;
        const win = iframe?.contentWindow;
        if (!doc || !mjmlTree || !win) return;

        const bodyNode = mjmlTree.children.find(c => c.type === "body") || mjmlTree;
        const sections = bodyNode.children.filter(c => c.type === "section" && !c.isHidden);

        sections.forEach((sectionNode, idx) => {
            const el = doc.querySelector(`[data-section-index="${idx}"]`) as HTMLElement
                || doc.querySelector(`.ag-section-${idx}`) as HTMLElement;
            if (el) {
                const editState = sectionEditStates.get(sectionNode.id);
                const overlayId = `ag-section-overlay-${idx}`;
                let overlay = doc.getElementById(overlayId);

                if (editState === "processing") {
                    el.classList.add("ag-section-loading");
                    if (!overlay) {
                        overlay = doc.createElement("div");
                        overlay.id = overlayId;
                        overlay.className = "ag-section-loading-overlay";
                        doc.body.appendChild(overlay);
                    }
                    const rect = el.getBoundingClientRect();
                    const scrollX = win.scrollX || 0;
                    const scrollY = win.scrollY || 0;
                    overlay.style.top = `${rect.top + scrollY}px`;
                    overlay.style.left = `${rect.left + scrollX}px`;
                    overlay.style.width = `${rect.width}px`;
                    overlay.style.height = `${rect.height}px`;
                    overlay.style.display = "block";
                } else {
                    el.classList.remove("ag-section-loading");
                    if (overlay) {
                        overlay.remove();
                    }
                }
            }
        });
    }, [sectionEditStates, mjmlTree, html]);
    // Helper to propagate iframe DOM changes to parent
    const propagateChanges = useCallback(() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) onMjmlChangeRef.current?.(mjmlRef.current, doc.documentElement.outerHTML);
    }, []);

    // Re-apply all current style properties to the element
    const reapplyStyles = useCallback((el: HTMLElement, props: ElementProperties) => {
        if (props.isImage) {
            const img = el as HTMLImageElement;
            if (props.src !== undefined) {
                img.src = props.src || "";
                img.setAttribute("src", props.src || "");
            }
            if (props.width !== undefined) {
                img.style.width = `${props.width}%`;
                img.setAttribute("width", `${props.width}%`);
            }
            if (props.borderRadius !== undefined) img.style.borderRadius = typeof props.borderRadius === 'number' ? `${props.borderRadius}px` : (props.borderRadius || "");
            img.style.objectFit = props.objectFit || "cover";
        } else {
            if (props.width !== undefined) {
                el.style.width = typeof props.width === 'number' ? `${props.width}%` : props.width;
                el.setAttribute("width", typeof props.width === 'number' ? `${props.width}%` : props.width);
            }
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
                p, h1, h2, h3, h4, h5, h6, td, tr, table, tbody, div, span, a {
                    cursor: pointer !important;
                    transition: outline 0.15s ease;
                }
                img {
                    cursor: pointer !important;
                    transition: outline 0.15s ease, filter 0.15s ease;
                    display: block !important;
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 100% !important;
                    object-fit: cover !important;
                }
                p:hover, h1:hover, h2:hover, h3:hover, h4:hover, h5:hover, h6:hover, td:hover, tr:hover, table:hover, tbody:hover, div:hover, span:hover, a:hover {
                    outline: 1px dashed #c4b5fd !important;
                    outline-offset: 2px;
                }
                img:hover {
                    outline: 2px dashed #7c3aed !important;
                    outline-offset: 3px;
                    filter: brightness(0.3) !important;
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
                    outline: 2.5px solid #7c3aed !important;
                    outline-offset: 4px;
                    border-radius: 4px;
                    white-space: pre-wrap;
                    box-shadow: 0 0 0 6px rgba(124, 58, 237, 0.15) !important;
                    background-color: rgba(245, 243, 255, 0.3) !important;
                    transition: outline 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease !important;
                    caret-color: #7c3aed !important;
                }

                /* Icon drag-and-drop drop target highlight */
                [data-ag-drop-target] {
                    outline: 2px dashed #7c3aed !important;
                    outline-offset: 3px;
                    background-color: rgba(124, 58, 237, 0.06) !important;
                    border-radius: 4px;
                }

                .ag-hover-image-tools {
                    position: absolute;
                    display: none;
                    flex-direction: row;
                    align-items: center;
                    gap: 6px;
                    z-index: 1001;
                    font-family: 'Plus Jakarta Sans', sans-serif !important;
                    background: white;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
                    border-radius: 8px;
                    padding: 4px 6px;
                    pointer-events: auto;
                }
                .ag-hover-replace-btn {
                    background: #7c3aed;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 5px 10px;
                    font-size: 12px !important;
                    font-weight: 600 !important;
                    font-family: 'Plus Jakarta Sans', sans-serif !important;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.15s ease;
                    outline: none;
                    white-space: nowrap;
                }
                .ag-hover-replace-btn:hover {
                    background: #6d28d9;
                }
                .ag-hover-reset-btn {
                    background: white;
                    color: #ef4444;
                    border: 1px solid #fee2e2;
                    border-radius: 6px;
                    padding: 5px 10px;
                    font-size: 12px !important;
                    font-weight: 600 !important;
                    font-family: 'Plus Jakarta Sans', sans-serif !important;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.15s ease, border-color 0.15s ease;
                    outline: none;
                    width: auto;
                    box-sizing: border-box;
                }
                .ag-hover-reset-btn:hover {
                    background: #fef2f2;
                    border-color: #fca5a5;
                }

                /* Section hover highlight */
                .ag-section-highlight {
                    outline: 2px dashed #a78bfa !important;
                    outline-offset: -2px;
                    position: relative;
                }

                /* Section loading state */
                .ag-section-loading {
                    position: relative !important;
                    pointer-events: none !important;
                }
                .ag-section-loading::after {
                    content: "" !important;
                    position: absolute !important;
                    inset: 0 !important;
                    background: linear-gradient(
                        90deg,
                        rgba(245, 243, 255, 0.85) 25%,
                        rgba(237, 233, 254, 0.95) 37%,
                        rgba(245, 243, 255, 0.85) 63%
                    ) !important;
                    background-size: 400% 100% !important;
                    animation: ag-skeleton-loading 1.4s ease infinite !important;
                    z-index: 10 !important;
                    border-radius: 4px !important;
                }
                .ag-section-loading-overlay {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 80px !important;
                    background: linear-gradient(
                        90deg,
                        rgba(245, 243, 255, 0.85) 25%,
                        rgba(237, 233, 254, 0.95) 37%,
                        rgba(245, 243, 255, 0.85) 63%
                    ) !important;
                    background-size: 400% 100% !important;
                    animation: ag-skeleton-loading 1.4s ease infinite !important;
                    z-index: 99999 !important;
                    pointer-events: none !important;
                    border-radius: 6px !important;
                }
                @keyframes ag-skeleton-loading {
                    0% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                .ag-delete-handle {
                    position: absolute;
                    width: 28px;
                    height: 28px;
                    background: #ef4444;
                    color: white;
                    border: 2.5px solid white;
                    border-radius: 8px;
                    cursor: pointer;
                    z-index: 1002;
                    box-shadow: 0 4px 12px rgba(239,68,68,0.35), 0 2px 4px rgba(0,0,0,0.12);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
                }
                .ag-delete-handle:hover {
                    background: #dc2626;
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(239,68,68,0.45), 0 2px 4px rgba(0,0,0,0.15);
                }
                .ag-resize-handle {
                    position: absolute;
                    width: 14px;
                    height: 14px;
                    background: #7c3aed;
                    border: 2.5px solid white;
                    border-radius: 50%;
                    cursor: nwse-resize;
                    z-index: 1002;
                    box-shadow: 0 2px 6px rgba(124,58,237,0.4);
                    display: none;
                    transition: transform 0.15s ease;
                    touch-action: none !important;
                }
                .ag-resize-handle:hover {
                    transform: scale(1.2);
                }
                .ag-resize-handle::after {
                    content: '';
                    position: absolute;
                    top: -15px;
                    left: -15px;
                    right: -15px;
                    bottom: -15px;
                }
                .ag-drag-handle {
                    position: absolute;
                    width: 28px;
                    height: 28px;
                    background: #7c3aed;
                    border: 2.5px solid white;
                    border-radius: 8px;
                    cursor: grab;
                    z-index: 1002;
                    box-shadow: 0 4px 12px rgba(124,58,237,0.35), 0 2px 4px rgba(0,0,0,0.12);
                    display: none;
                    color: white;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
                    touch-action: none !important;
                }
                .ag-drag-handle:hover {
                    background: #6d28d9;
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(124,58,237,0.45), 0 2px 4px rgba(0,0,0,0.15);
                }
                .ag-drag-handle:active {
                    cursor: grabbing;
                    transform: scale(0.96);
                }
                .ag-edit-handle {
                    position: absolute;
                    width: 28px;
                    height: 28px;
                    background: #7c3aed;
                    color: white;
                    border: 2.5px solid white;
                    border-radius: 8px;
                    cursor: pointer;
                    z-index: 1002;
                    box-shadow: 0 4px 12px rgba(124,58,237,0.35), 0 2px 4px rgba(0,0,0,0.12);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
                }
                .ag-edit-handle:hover {
                    background: #6d28d9;
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(124,58,237,0.45), 0 2px 4px rgba(0,0,0,0.15);
                }
                .ag-drag-handle::after, .ag-edit-handle::after, .ag-delete-handle::after {
                    content: '';
                    position: absolute;
                    top: -15px;
                    left: -15px;
                    right: -15px;
                    bottom: -15px;
                }
                .ag-drop-indicator {
                    position: absolute;
                    height: 3px;
                    background: linear-gradient(90deg, #7c3aed, #3b82f6);
                    border-radius: 99px;
                    z-index: 999;
                    display: none;
                    pointer-events: none;
                    box-shadow: 0 0 8px rgba(124,58,237,0.5);
                    transition: top 0.05s ease, left 0.05s ease, width 0.05s ease;
                }
                .ag-drop-indicator::before {
                    content: '';
                    position: absolute;
                    left: -4px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 10px;
                    height: 10px;
                    background: #7c3aed;
                    border-radius: 50%;
                    box-shadow: 0 0 6px rgba(124,58,237,0.6);
                }
                .ag-drop-indicator::after {
                    content: '';
                    position: absolute;
                    right: -4px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 10px;
                    height: 10px;
                    background: #3b82f6;
                    border-radius: 50%;
                    box-shadow: 0 0 6px rgba(59,130,246,0.6);
                }
                .ag-ghost {
                    position: fixed !important;
                    pointer-events: none !important;
                    opacity: 0.75 !important;
                    z-index: 9999 !important;
                    box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.2), 0 8px 16px -4px rgba(124, 58, 237, 0.15) !important;
                    transition: none !important;
                    background: white !important;
                    margin: 0 !important;
                    border-radius: 4px !important;
                    outline: 2px solid rgba(124,58,237,0.4) !important;
                    outline-offset: 2px !important;
                    touch-action: none !important;
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
            handle.title = "Drag to reorder";
            handle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:block;opacity:0.95;"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>`;
            doc.body.appendChild(handle);
        }

        if (!doc.getElementById("ag-delete-handle")) {
            const handle = doc.createElement("div");
            handle.id = "ag-delete-handle";
            handle.className = "ag-delete-handle";
            handle.title = "Delete block";
            handle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
            doc.body.appendChild(handle);
        }

        if (!doc.getElementById("ag-edit-handle")) {
            const handle = doc.createElement("div");
            handle.id = "ag-edit-handle";
            handle.className = "ag-edit-handle";
            handle.title = "Edit text inline";
            handle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
            doc.body.appendChild(handle);
        }
        if (!doc.getElementById("ag-drop-indicator")) {
            const indicator = doc.createElement("div");
            indicator.id = "ag-drop-indicator";
            indicator.className = "ag-drop-indicator";
            doc.body.appendChild(indicator);
        }

        if (!doc.getElementById("ag-hover-image-tools")) {
            const container = doc.createElement("div");
            container.id = "ag-hover-image-tools";
            container.className = "ag-hover-image-tools";

            const replaceBtn = doc.createElement("button");
            replaceBtn.id = "ag-hover-replace-btn";
            replaceBtn.className = "ag-hover-replace-btn";
            replaceBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px; display: inline-block; vertical-align: middle;"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><polyline points="16 3 21 3 21 8"/><line x1="21" y1="3" x2="14" y2="10"/></svg>Replace image`;
            replaceBtn.title = "Replace Image";

            const resetBtn = doc.createElement("button");
            resetBtn.id = "ag-hover-reset-btn";
            resetBtn.className = "ag-hover-reset-btn";
            resetBtn.innerText = "Reset";
            resetBtn.title = "Reset image and properties";

            container.appendChild(replaceBtn);
            container.appendChild(resetBtn);
            doc.body.appendChild(container);
        }

        // Store original src for image reset
        doc.querySelectorAll("img").forEach((img) => {
            if (!img.getAttribute("data-original-src")) {
                img.setAttribute("data-original-src", img.getAttribute("src") || "");
            }
            if (!img.getAttribute("data-original-style")) {
                img.setAttribute("data-original-style", img.getAttribute("style") || "");
            }
        });

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
            const editHandle = doc.getElementById("ag-edit-handle");
            const isEditing = el.getAttribute("contenteditable") === "true";

            // Drag handle: top-left corner of element, offset so it sits half-outside
            if (dragHandle && !isBlockDraggingRef.current) {
                dragHandle.style.left = `${Math.max(0, rect.left + scrollX - 14)}px`;
                dragHandle.style.top = `${Math.max(0, rect.top + scrollY - 14)}px`;
                dragHandle.style.display = "flex";
            } else if (dragHandle) {
                dragHandle.style.display = "none";
            }
            // Delete handle: top-right corner of element, offset so it sits half-outside
            if (deleteHandle && !isBlockDraggingRef.current) {
                deleteHandle.style.left = `${rect.right + scrollX - 14}px`;
                deleteHandle.style.top = `${Math.max(0, rect.top + scrollY - 14)}px`;
                deleteHandle.style.display = "flex";
            } else if (deleteHandle) {
                deleteHandle.style.display = "none";
            }
            // Edit handle: next to drag handle
            if (editHandle && !isBlockDraggingRef.current && el.tagName !== "IMG" && !isEditing) {
                editHandle.style.left = `${Math.max(0, rect.left + scrollX + 18)}px`;
                editHandle.style.top = `${Math.max(0, rect.top + scrollY - 14)}px`;
                editHandle.style.display = "flex";
            } else if (editHandle) {
                editHandle.style.display = "none";
            }

            const isResizableTag = ["IMG", "DIV", "TD", "TABLE", "P", "H1", "H2", "H3", "H4", "H5", "H6"].includes(el.tagName.toUpperCase());
            if (resizeHandle && isResizableTag) {
                resizeHandle.style.left = `${rect.right + scrollX - 7}px`;
                resizeHandle.style.top = `${rect.bottom + scrollY - 7}px`;
                resizeHandle.style.display = "block";
            } else if (resizeHandle) {
                resizeHandle.style.display = "none";
            }
        } else {
            if (resizeHandle) resizeHandle.style.display = "none";
            if (dragHandle) dragHandle.style.display = "none";
            const deleteHandle = doc.getElementById("ag-delete-handle");
            if (deleteHandle) deleteHandle.style.display = "none";
            const editHandle = doc.getElementById("ag-edit-handle");
            if (editHandle) editHandle.style.display = "none";
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
        if (commitTimeoutRef.current) {
            clearTimeout(commitTimeoutRef.current);
            commitTimeoutRef.current = null;
        }
        isEditingRef.current = false;
        preEditHtmlRef.current = null;

        if (undoStack.length === 0) return;
        const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || "";
        const previousHtml = undoStack[undoStack.length - 1];
        setRedoStack(prev => [...prev, currentHtml]);
        setUndoStack(prev => prev.slice(0, -1));
        applyHtmlToIframe(previousHtml);
        if (onMjmlChangeRef.current) onMjmlChangeRef.current(mjmlRef.current, previousHtml);
    }, [undoStack, applyHtmlToIframe]);

    const redo = useCallback(() => {
        if (commitTimeoutRef.current) {
            clearTimeout(commitTimeoutRef.current);
            commitTimeoutRef.current = null;
        }
        isEditingRef.current = false;
        preEditHtmlRef.current = null;

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

    // Global keyboard shortcuts (Undo / Redo) for the main window
    useEffect(() => {
        const handleMainKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;

            // Undo: Ctrl+Z / Cmd+Z
            if (modifier && e.key.toLowerCase() === "z" && !e.shiftKey) {
                const active = document.activeElement;
                const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.hasAttribute("contenteditable"));

                if (!isInput || active.classList.contains("ql-editor")) {
                    e.preventDefault();
                    undo();
                }
            }

            // Redo: Ctrl+Y / Cmd+Y / Ctrl+Shift+Z / Cmd+Shift+Z
            if ((modifier && e.key.toLowerCase() === "y") || (modifier && e.shiftKey && e.key.toLowerCase() === "z")) {
                const active = document.activeElement;
                const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.hasAttribute("contenteditable"));

                if (!isInput || active.classList.contains("ql-editor")) {
                    e.preventDefault();
                    redo();
                }
            }
        };

        window.addEventListener("keydown", handleMainKeyDown);
        return () => {
            window.removeEventListener("keydown", handleMainKeyDown);
        };
    }, [undo, redo]);

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

    const handleGlobalMouseUp = useCallback(() => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;

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
                dragTarget.style.outline = "";
                dragTarget.style.outlineOffset = "";

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
                        saveVersion(doc.documentElement.outerHTML);
                        propagateChanges();
                    } catch (err) {
                        console.error("Failed to reorder element:", err);
                    }
                }
            }

            const win = iframeRef.current?.contentWindow;
            if (win) {
                win.document.body.style.overflow = "";
            }
            document.body.style.overflow = "";

            dragTargetRef.current = null;
            dropTargetRef.current = null;
            ghostElementRef.current = null;
            setTimeout(updateResizeHandlePosition, 10);
        }
    }, [propagateChanges, saveVersion, updateResizeHandlePosition]);

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

        if (imageToolsTimeoutRef.current) {
            clearTimeout(imageToolsTimeoutRef.current);
            imageToolsTimeoutRef.current = null;
        }

        injectIframeStyles(doc);

        const EDITABLE_TAGS = ["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "TD", "TR", "TABLE", "TBODY", "SPAN", "A", "STRONG", "B", "I", "EM"];

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
                const tag = selectedElementRef.current.tagName.toUpperCase();
                const isStructural = ["TR", "TD", "TABLE", "DIV", "TBODY", "THEAD", "TFOOT"].includes(tag);
                if (!isStructural) {
                    e.preventDefault();
                    saveVersion(iframeRef.current?.contentDocument?.documentElement.outerHTML || "");
                    selectedElementRef.current.remove();
                    propagateChanges();
                    clearSelection();
                }
            }
        };
        win.addEventListener("keydown", handleGlobalKeyDown);

        // ── Section hover tracking ──
        let lastHoveredSection: HTMLElement | null = null;
        doc.addEventListener("mousemove", (e) => {
            // Handle element resizing
            if (isResizingRef.current && resizeTargetRef.current) {
                const deltaX = e.clientX - resizeStartXRef.current;
                const newWidthPx = resizeStartWidthRef.current + deltaX;
                const parentWidth = resizeTargetRef.current.parentElement?.offsetWidth || 1;
                const newWidthPercent = Math.min(100, Math.max(10, Math.round((newWidthPx / parentWidth) * 100)));

                resizeTargetRef.current.style.width = `${newWidthPercent}%`;
                resizeTargetRef.current.setAttribute("width", `${newWidthPercent}%`);

                const deltaY = e.clientY - resizeStartYRef.current;
                const newHeightPx = Math.max(10, resizeStartHeightRef.current + deltaY);
                resizeTargetRef.current.style.height = `${newHeightPx}px`;
                resizeTargetRef.current.setAttribute("height", `${newHeightPx}px`);

                setSelectedProps(prev => ({ ...prev, width: newWidthPercent, height: `${newHeightPx}px` }));
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

            // Image hover tools container positioning
            const hoverImageTools = doc.getElementById("ag-hover-image-tools");
            const isOverImg = target.tagName === "IMG";
            const isOverBtn = target === hoverImageTools || hoverImageTools?.contains(target);

            let activeImg = (hoverImageTools as any)?._targetImg;
            if (isOverImg) {
                activeImg = target;
            }

            let isNearImg = false;
            let isNearBtn = false;

            if (activeImg) {
                const rect = activeImg.getBoundingClientRect();
                isNearImg = (
                    e.clientX >= rect.left - 25 &&
                    e.clientX <= rect.right + 25 &&
                    e.clientY >= rect.top - 25 &&
                    e.clientY <= rect.bottom + 25
                );
            }

            if (hoverImageTools && hoverImageTools.style.display === "flex") {
                const rect = hoverImageTools.getBoundingClientRect();
                isNearBtn = (
                    e.clientX >= rect.left - 25 &&
                    e.clientX <= rect.right + 25 &&
                    e.clientY >= rect.top - 25 &&
                    e.clientY <= rect.bottom + 25
                );
            }

            const shouldKeepVisible = (isOverImg || isOverBtn || isNearImg || isNearBtn) && !isResizingRef.current && !isBlockDraggingRef.current;

            if (shouldKeepVisible && activeImg) {
                if (imageToolsTimeoutRef.current) {
                    clearTimeout(imageToolsTimeoutRef.current);
                    imageToolsTimeoutRef.current = null;
                }

                if (hoverImageTools) {
                    const isNewImg = (hoverImageTools as any)._targetImg !== activeImg;
                    const isNotShown = hoverImageTools.style.display !== "flex";

                    if (isOverImg || isNewImg || isNotShown) {
                        const rect = activeImg.getBoundingClientRect();
                        const scrollX = win.scrollX;
                        const scrollY = win.scrollY;
                        const panelWidth = 150;
                        const panelHeight = 32;
                        const iframeWidth = doc.documentElement.clientWidth || doc.body.clientWidth;

                        // Centered horizontally relative to the image, clamped to viewport bounds
                        const left = rect.left + scrollX + (rect.width - panelWidth) / 2;
                        const clampedLeft = Math.max(6, Math.min(iframeWidth - panelWidth - 6, left));

                        // Position above the image, or below if there is no room at the top
                        let top = rect.top + scrollY - panelHeight - 6;
                        if (rect.top - panelHeight - 6 < 0) {
                            top = rect.bottom + scrollY + 6;
                        }

                        hoverImageTools.style.left = `${clampedLeft}px`;
                        hoverImageTools.style.top = `${top}px`;
                        hoverImageTools.style.display = "flex";
                        (hoverImageTools as any)._targetImg = activeImg;
                    }
                }
            } else {
                if (hoverImageTools && hoverImageTools.style.display === "flex" && !imageToolsTimeoutRef.current) {
                    imageToolsTimeoutRef.current = setTimeout(() => {
                        hoverImageTools.style.display = "none";
                        (hoverImageTools as any)._targetImg = null;
                        imageToolsTimeoutRef.current = null;
                    }, 400);
                }
            }
        });

        // Hide tools after delay when cursor leaves the document
        doc.addEventListener("mouseleave", () => {
            const hoverImageTools = doc.getElementById("ag-hover-image-tools");
            if (hoverImageTools && hoverImageTools.style.display === "flex" && !imageToolsTimeoutRef.current) {
                imageToolsTimeoutRef.current = setTimeout(() => {
                    hoverImageTools.style.display = "none";
                    (hoverImageTools as any)._targetImg = null;
                    imageToolsTimeoutRef.current = null;
                }, 300);
            }
        });

        // ── Touch events for mobile block dragging and resizing ──
        doc.addEventListener("touchstart", (e) => {
            const target = e.target as HTMLElement;
            const dragHandle = doc.getElementById("ag-drag-handle");
            const resizeHandle = doc.getElementById("ag-resize-handle");

            // Handle element resize handle touchstart
            const isResizableTag = selectedElementRef.current && ["IMG", "DIV", "TD", "TABLE", "P", "H1", "H2", "H3", "H4", "H5", "H6"].includes(selectedElementRef.current.tagName.toUpperCase());
            if (target === resizeHandle && isResizableTag) {
                e.preventDefault();
                e.stopPropagation();
                isResizingRef.current = true;
                resizeTargetRef.current = selectedElementRef.current as HTMLImageElement;
                const touch = e.touches[0];
                resizeStartXRef.current = touch.clientX;
                resizeStartWidthRef.current = resizeTargetRef.current.offsetWidth;
                resizeStartYRef.current = touch.clientY;
                resizeStartHeightRef.current = resizeTargetRef.current.offsetHeight;
                return;
            }

            // Handle block drag handle touchstart
            if ((target === dragHandle || dragHandle?.contains(target)) && selectedElementRef.current) {
                // Prevent scrolling when dragging blocks on touch devices
                e.preventDefault();
                e.stopPropagation();

                const touch = e.touches[0];
                isBlockDraggingRef.current = true;
                dragTargetRef.current = selectedElementRef.current;

                if (win) {
                    win.document.body.style.setProperty("overflow", "hidden", "important");
                }
                document.body.style.setProperty("overflow", "hidden", "important");

                const deleteHandle2 = doc.getElementById("ag-delete-handle");
                const editHandle2 = doc.getElementById("ag-edit-handle");
                if (dragHandle) dragHandle.style.display = "none";
                if (resizeHandle) resizeHandle.style.display = "none";
                if (deleteHandle2) deleteHandle2.style.display = "none";
                if (editHandle2) editHandle2.style.display = "none";

                const rect = selectedElementRef.current.getBoundingClientRect();
                const ghost = selectedElementRef.current.cloneNode(true) as HTMLElement;
                ghost.removeAttribute("contenteditable");
                ghost.classList.add("ag-ghost");
                ghost.style.width = `${rect.width}px`;
                ghost.style.height = `${Math.min(rect.height, 120)}px`;
                ghost.style.overflow = "hidden";
                ghost.style.left = `${rect.left}px`;
                ghost.style.top = `${rect.top}px`;

                const offsetX = touch.clientX - rect.left;
                const offsetY = touch.clientY - rect.top;
                // Dim the original element
                selectedElementRef.current.style.opacity = "0.25";
                selectedElementRef.current.style.outline = "2px dashed #7c3aed";
                selectedElementRef.current.style.outlineOffset = "2px";
                // Append ghost to DOM so it is visible
                doc.body.appendChild(ghost);
                ghostElementRef.current = ghost;
                (ghost as unknown as { _offsetX: number })._offsetX = offsetX;
                (ghost as unknown as { _offsetY: number })._offsetY = offsetY;
            }
        }, { passive: false });

        doc.addEventListener("touchmove", (e) => {
            // Handle image resize move
            if (isResizingRef.current && resizeTargetRef.current) {
                e.preventDefault();
                const touch = e.touches[0];
                const deltaX = touch.clientX - resizeStartXRef.current;
                const newWidthPx = resizeStartWidthRef.current + deltaX;
                const parentWidth = resizeTargetRef.current.parentElement?.offsetWidth || 1;
                const newWidthPercent = Math.min(100, Math.max(10, Math.round((newWidthPx / parentWidth) * 100)));

                resizeTargetRef.current.style.width = `${newWidthPercent}%`;
                resizeTargetRef.current.setAttribute("width", `${newWidthPercent}%`);

                const deltaY = touch.clientY - resizeStartYRef.current;
                const newHeightPx = Math.max(10, resizeStartHeightRef.current + deltaY);
                resizeTargetRef.current.style.height = `${newHeightPx}px`;
                resizeTargetRef.current.setAttribute("height", `${newHeightPx}px`);

                setSelectedProps(prev => ({ ...prev, width: newWidthPercent, height: `${newHeightPx}px` }));
                updateResizeHandlePosition();
                return;
            }

            // Handle block drag move
            if (isBlockDraggingRef.current && ghostElementRef.current && dragTargetRef.current) {
                e.preventDefault();

                const touch = e.touches[0];
                const ghost = ghostElementRef.current;
                const offsetX = (ghost as unknown as { _offsetX: number })._offsetX || 0;
                const offsetY = (ghost as unknown as { _offsetY: number })._offsetY || 0;
                ghost.style.left = `${touch.clientX - offsetX}px`;
                ghost.style.top = `${touch.clientY - offsetY}px`;

                ghost.style.display = "none";
                const elUnderMouse = doc.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
                ghost.style.display = "";

                const dropIndicator = doc.getElementById("ag-drop-indicator");
                let dropTarget: HTMLElement | null = elUnderMouse;
                while (dropTarget && dropTarget !== doc.body && dropTarget !== doc.documentElement) {
                    if (EDITABLE_TAGS.includes(dropTarget.tagName) || dropTarget.tagName === "IMG") break;
                    dropTarget = dropTarget.parentElement;
                }

                if (dropTarget && dropTarget !== dragTargetRef.current && dropTarget.tagName !== "BODY" && dropTarget.tagName !== "HTML") {
                    const rect = dropTarget.getBoundingClientRect();
                    const isTopHalf = touch.clientY < rect.top + rect.height / 2;
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
            }
        }, { passive: false });

        doc.addEventListener("touchend", () => {
            if (isBlockDraggingRef.current || isResizingRef.current) {
                handleGlobalMouseUp();
            }
        });
        doc.addEventListener("touchcancel", () => {
            if (isBlockDraggingRef.current || isResizingRef.current) {
                handleGlobalMouseUp();
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
            const hoverImageTools = doc.getElementById("ag-hover-image-tools");
            const hoverReplaceBtn = doc.getElementById("ag-hover-replace-btn");
            const hoverResetBtn = doc.getElementById("ag-hover-reset-btn");

            if (target === hoverReplaceBtn || hoverReplaceBtn?.contains(target)) {
                e.preventDefault();
                e.stopPropagation();
                const targetImg = (hoverImageTools as any)?._targetImg as HTMLImageElement;
                if (targetImg) {
                    // Click the image to select it
                    targetImg.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                    // Immediately trigger file selector click
                    clickedImageRef.current = targetImg;
                    imageInputRef.current?.click();
                }
                return;
            }

            if (target === hoverResetBtn || hoverResetBtn?.contains(target)) {
                e.preventDefault();
                e.stopPropagation();
                const targetImg = (hoverImageTools as any)?._targetImg as HTMLImageElement;
                if (targetImg) {
                    const originalSrc = targetImg.getAttribute("data-original-src");
                    const originalStyle = targetImg.getAttribute("data-original-style");
                    if (originalSrc) {
                        saveVersion(doc.documentElement.outerHTML);
                        targetImg.src = originalSrc;
                        targetImg.setAttribute("src", originalSrc);
                        if (originalStyle) {
                            targetImg.setAttribute("style", originalStyle);
                        } else {
                            targetImg.removeAttribute("style");
                        }
                        propagateChanges();

                        // Select the element to update panel states
                        targetImg.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                    }
                }
                return;
            }

            if ((target === deleteHandle || deleteHandle?.contains(target)) && selectedElementRef.current) {
                e.preventDefault();
                e.stopPropagation();
                saveVersion(doc.documentElement.outerHTML);
                selectedElementRef.current.remove();
                propagateChanges();
                clearSelection();
                return;
            }

            const dragHandle = doc.getElementById("ag-drag-handle");
            const editHandle = doc.getElementById("ag-edit-handle");

            if ((target === editHandle || editHandle?.contains(target)) && selectedElementRef.current) {
                e.preventDefault();
                e.stopPropagation();
                enableTextEdit();
                return;
            }

            const isResizableTag = selectedElementRef.current && ["IMG", "DIV", "TD", "TABLE", "P", "H1", "H2", "H3", "H4", "H5", "H6"].includes(selectedElementRef.current.tagName.toUpperCase());
            if (target === resizeHandle && isResizableTag) {
                e.preventDefault();
                isResizingRef.current = true;
                resizeTargetRef.current = selectedElementRef.current as HTMLImageElement;
                resizeStartXRef.current = e.clientX;
                resizeStartWidthRef.current = resizeTargetRef.current.offsetWidth;
                resizeStartYRef.current = e.clientY;
                resizeStartHeightRef.current = resizeTargetRef.current.offsetHeight;
                return;
            }

            if ((target === dragHandle || dragHandle?.contains(target)) && selectedElementRef.current) {
                e.preventDefault();
                e.stopPropagation();

                isBlockDraggingRef.current = true;
                dragTargetRef.current = selectedElementRef.current;

                const deleteHandle2 = doc.getElementById("ag-delete-handle");
                const editHandle2 = doc.getElementById("ag-edit-handle");
                if (dragHandle) dragHandle.style.display = "none";
                if (resizeHandle) resizeHandle.style.display = "none";
                if (deleteHandle2) deleteHandle2.style.display = "none";
                if (editHandle2) editHandle2.style.display = "none";

                const rect = selectedElementRef.current.getBoundingClientRect();
                const ghost = selectedElementRef.current.cloneNode(true) as HTMLElement;
                ghost.removeAttribute("contenteditable");
                ghost.classList.add("ag-ghost");
                ghost.style.width = `${rect.width}px`;
                ghost.style.height = `${Math.min(rect.height, 120)}px`;
                ghost.style.overflow = 'hidden';
                ghost.style.left = `${rect.left}px`;
                ghost.style.top = `${rect.top}px`;

                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;
                // Dim the original element
                selectedElementRef.current.style.opacity = "0.25";
                selectedElementRef.current.style.outline = "2px dashed #7c3aed";
                selectedElementRef.current.style.outlineOffset = "2px";
                // Append ghost to DOM so it is visible
                doc.body.appendChild(ghost);
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
                    src: (target as HTMLImageElement).src,
                    objectFit: cs.objectFit || "cover"
                });
                setHasSelection(true);
                if (!isMobileRef.current) {
                    setShowEditPanel(true);
                } else {
                    setShowEditPanel(false);
                }
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
                    isImage: false,
                    width: widthPercent,
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
                    content: ["TR", "TD", "TABLE", "DIV", "TBODY", "THEAD", "TFOOT"].includes(target.tagName.toUpperCase())
                        ? (target.textContent?.trim() || "")
                        : (target.innerHTML || target.textContent || ""),
                    elementTag: target.tagName.toLowerCase(),
                });
                setHasSelection(true);
                if (!isMobileRef.current) {
                    setShowEditPanel(true);
                } else {
                    setShowEditPanel(false);
                }
                updateResizeHandlePosition();
                return;
            }

            // Clicked outside any editable element
            if (target === doc.body || target === doc.documentElement) {
                clearSelection();
            }
        });

        doc.addEventListener("mouseup", handleGlobalMouseUp);
        win.addEventListener("mouseup", handleGlobalMouseUp);

        doc.addEventListener("input", (e) => {
            const target = e.target as HTMLElement;
            if (target.contentEditable === "true") {
                const newContent = target.innerHTML || target.textContent || "";
                setSelectedProps(prev => ({ ...prev, content: newContent }));
                propagateChanges();
                registerChange();
            }
        });

        doc.addEventListener("focusout", (e) => {
            const target = e.target as HTMLElement;
            if (target && target.getAttribute("contenteditable") === "true") {
                target.removeAttribute("contenteditable");
                propagateChanges();
                commitEditing();
                updateResizeHandlePosition();
            }
        });

        doc.addEventListener("keydown", (e) => {
            if (e.key === "Escape") clearSelection();
        });

        // ── Icon drag-and-drop from PropertiesPanel Icons tab ──
        doc.addEventListener("dragover", (e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
            // Highlight drop target
            const el = doc.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
            doc.querySelectorAll("[data-ag-drop-target]").forEach(n => (n as HTMLElement).removeAttribute("data-ag-drop-target"));
            if (el && el !== doc.body) el.setAttribute("data-ag-drop-target", "1");
        });

        doc.addEventListener("dragleave", (e) => {
            if (!e.relatedTarget || !(doc.documentElement.contains(e.relatedTarget as Node))) {
                doc.querySelectorAll("[data-ag-drop-target]").forEach(n => (n as HTMLElement).removeAttribute("data-ag-drop-target"));
            }
        });

        doc.addEventListener("drop", (e) => {
            e.preventDefault();
            doc.querySelectorAll("[data-ag-drop-target]").forEach(n => (n as HTMLElement).removeAttribute("data-ag-drop-target"));
            if (!e.dataTransfer) return;

            // Prefer our custom type, fall back to text/plain
            const iconUrl =
                e.dataTransfer.getData("application/x-ph-icon-url") ||
                e.dataTransfer.getData("text/plain");

            // Only handle icon drops (SVG data-URL or Iconify CDN)
            if (!iconUrl || (!iconUrl.startsWith("data:image/svg+xml") && !iconUrl.includes("iconify.design"))) return;

            const target = doc.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
            saveVersion(doc.documentElement.outerHTML);

            if (target && target.tagName === "IMG") {
                // Replace existing image src
                (target as HTMLImageElement).src = iconUrl;
                target.setAttribute("src", iconUrl);
                propagateChanges();
            } else {
                // Find the nearest block container to insert into
                let container: Element | null = target;
                while (container && !["TD", "DIV", "BODY", "TABLE"].includes(container.tagName.toUpperCase())) {
                    container = container.parentElement;
                }
                if (!container) container = doc.body;

                const img = doc.createElement("img");
                img.src = iconUrl;
                img.setAttribute("src", iconUrl);
                img.style.cssText = "display:inline-block;vertical-align:middle;max-width:100%;";
                container.appendChild(img);
                propagateChanges();
            }
        });

        // Listen to paste events inside the iframe document and forward to parent window
        doc.addEventListener("paste", (e: ClipboardEvent) => {
            const text = e.clipboardData?.getData("text");
            if (text) {
                const target = e.target as HTMLElement;
                if (target && (
                    target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.hasAttribute("contenteditable") ||
                    target.closest('[contenteditable="true"]') ||
                    target.closest('.ql-editor')
                )) {
                    return;
                }
                e.preventDefault();
                const customPasteEvent = new CustomEvent("iframe-paste", { detail: { text } });
                window.dispatchEvent(customPasteEvent);
            }
        });

        // Polling update for layout shifts
        const interval = setInterval(updateResizeHandlePosition, 500);
        return () => clearInterval(interval);
    }, [injectIframeStyles, updateResizeHandlePosition, propagateChanges, undo, redo, saveVersion, findSectionFromElement, handleGlobalMouseUp, registerChange, commitEditing]);

    // Re-inject styles and reposition handle when html changes
    useEffect(() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
            injectIframeStyles(doc);
            updateResizeHandlePosition();
        }
    }, [html, injectIframeStyles, updateResizeHandlePosition]);

    useEffect(() => {
        window.addEventListener("mouseup", handleGlobalMouseUp);
        window.addEventListener("touchend", handleGlobalMouseUp);
        window.addEventListener("touchcancel", handleGlobalMouseUp);
        return () => {
            window.removeEventListener("mouseup", handleGlobalMouseUp);
            window.removeEventListener("touchend", handleGlobalMouseUp);
            window.removeEventListener("touchcancel", handleGlobalMouseUp);
        };
    }, [handleGlobalMouseUp]);

    // Apply style changes to the selected iframe element
    const applyStyle = useCallback((prop: Partial<ElementProperties>) => {
        setSelectedProps(prev => {
            const next = { ...prev, ...prop };
            const el = selectedElementRef.current;
            if (el) {
                if (next.isImage) {
                    const img = el as HTMLImageElement;
                    if (prop.src !== undefined) {
                        const originalWidth = img.offsetWidth || 1;
                        const originalHeight = img.offsetHeight || 1;
                        const aspectRatio = originalWidth / originalHeight;
                        img.style.aspectRatio = `${aspectRatio}`;
                        img.style.height = "auto";
                        img.style.objectFit = next.objectFit || "cover";

                        const hasWidth = img.getAttribute("width") || img.style.width;
                        if (!hasWidth) {
                            img.style.width = "100%";
                            img.setAttribute("width", "100%");
                        }
                        img.removeAttribute("height");

                        img.src = next.src || "";
                        img.setAttribute("src", next.src || "");
                    }
                    if (prop.objectFit !== undefined) {
                        img.style.objectFit = next.objectFit || "cover";
                    }
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
            registerChange();
            return next;
        });
    }, [propagateChanges, updateResizeHandlePosition, registerChange]);

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
                const isStructural = ["TR", "TD", "TABLE", "DIV", "TBODY", "THEAD", "TFOOT"].includes(el.tagName.toUpperCase());
                const hasHtmlTags = /<[a-z][\s\S]*>/i.test(contentStr);

                let cleanContent = contentStr;
                if (["P", "SPAN", "A", "H1", "H2", "H3", "H4", "H5", "H6"].includes(el.tagName.toUpperCase())) {
                    // If it's wrapped in a single <p>...</p>, strip it to avoid nested paragraphs
                    const pMatch = contentStr.match(/^<p>([\s\S]*)<\/p>$/i);
                    if (pMatch) {
                        cleanContent = pMatch[1];
                    }
                }

                if (!isStructural && (el.children.length === 0 || hasHtmlTags)) {
                    el.innerHTML = cleanContent;
                } else {
                    // Update text nodes recursively to preserve HTML elements/layout
                    const textNodes: Text[] = [];
                    const walk = (node: Node) => {
                        if (node.nodeType === 3) { // Node.TEXT_NODE
                            textNodes.push(node as Text);
                        } else {
                            if (node.nodeName !== "SCRIPT" && node.nodeName !== "STYLE") {
                                node.childNodes.forEach(walk);
                            }
                        }
                    };
                    walk(el);

                    if (textNodes.length > 0) {
                        if (hasHtmlTags) {
                            const parent = textNodes[0].parentNode as HTMLElement;
                            if (parent && parent !== el) {
                                parent.innerHTML = cleanContent;
                            } else {
                                el.innerHTML = cleanContent;
                            }
                        } else {
                            textNodes[0].nodeValue = cleanContent;
                            for (let i = 1; i < textNodes.length; i++) {
                                textNodes[i].nodeValue = "";
                            }
                        }
                    } else {
                        if (hasHtmlTags) {
                            el.innerHTML = cleanContent;
                        } else {
                            el.appendChild(el.ownerDocument.createTextNode(cleanContent));
                        }
                    }
                }
                reapplyStyles(el, next);
                propagateChanges();
                registerChange();
            }
            return next;
        });
    }, [reapplyStyles, propagateChanges, registerChange]);

    // Handle image replacement
    const handleReplaceImage = () => {
        imageInputRef.current?.click();
    };

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !clickedImageRef.current) return;

        const targetImg = clickedImageRef.current;
        const originalWidth = targetImg.offsetWidth || 1;
        const originalHeight = targetImg.offsetHeight || 1;
        const aspectRatio = originalWidth / originalHeight;

        targetImg.style.aspectRatio = `${aspectRatio}`;
        targetImg.style.height = "auto";
        targetImg.style.objectFit = "cover";

        const hasWidth = targetImg.getAttribute("width") || targetImg.style.width;
        if (!hasWidth) {
            targetImg.style.width = "100%";
            targetImg.setAttribute("width", "100%");
        }
        targetImg.removeAttribute("height");

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl && targetImg) {
                targetImg.src = dataUrl;

                let widthPercent = 100;
                if (hasWidth && typeof hasWidth === "string" && hasWidth.endsWith("%")) {
                    widthPercent = parseInt(hasWidth);
                }

                setSelectedProps(prev => ({
                    ...prev,
                    src: dataUrl,
                    width: widthPercent,
                    objectFit: "cover"
                }));
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

    const handleSectionEditSubmit = useCallback((instruction: string, sectionIndex: number, model: string) => {
        if (onSectionEdit) {
            onSectionEdit(instruction, sectionIndex, model);
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
        <div className="flex flex-col h-full w-full bg-slate-100">
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />

            {/* Floating edit pill for mobile */}
            {isMobile && hasSelection && !showEditPanel && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
                    <button
                        onClick={() => {
                            if (typeof navigator !== "undefined" && navigator.vibrate) {
                                navigator.vibrate(50);
                            }
                            setShowEditPanel(true);
                        }}
                        className={`flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-2xl border border-violet-500 font-bold text-xs tracking-wider uppercase active:scale-95 transition-all ${!hasTilted ? "animate-tilt-shake" : ""
                            }`}
                    >
                        <PencilLine className="w-4 h-4" />
                        <span>Edit {selectedProps.isImage ? "Image" : "Text"} & Style</span>
                    </button>
                </div>
            )}

            {/* ── Toolbar ── */}
            <PreviewToolbar
                viewMode={viewMode}
                setViewMode={setViewMode}
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
                onPreview={onPreview}
                onSharePreview={onSharePreview}
                onDownloadHtml={onDownloadHtml}
                onDownloadEml={onDownloadEml}
                onExportHtml={onExportHtml}
                onAddText={handleAddText}
                isSharing={isSharing}
                onSimulateLoading={() => setSimulateLoading(true)}
                isLibraryHighlighted={isLibraryHighlighted}
                onOpenTutorial={onOpenTutorial}
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
                <div className={clsx("flex-1 overflow-auto flex items-start justify-center relative scrollbar-hide", isMobile ? "p-0" : "p-6")}>
                    {/* ── Re-open tab when panel is collapsed ── */}
                    {!showEditPanel && html && (
                        <button
                            onClick={() => setShowEditPanel(true)}
                            title="Open properties panel"
                            className="absolute right-4 top-1/2 z-30 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
                            style={{ transform: "translateY(-50%)" }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    <div
                        className={clsx(
                            "bg-white transition-all duration-500 ease-out scrollbar-hide relative flex flex-col",
                            viewMode === "desktop"
                                ? isMobile
                                    ? "w-full h-full shadow-none border-none overflow-hidden"
                                    : "w-full max-w-3xl min-h-[600px] shadow-2xl rounded-xl border border-slate-200 overflow-hidden"
                                : "w-[360px] max-h-[760px] aspect-[9/19.5] border-[12px] border-slate-900 rounded-[44px] shadow-2xl ring-1 ring-slate-900/10"
                        )}
                        style={viewMode === "desktop" ? { height: isMobile ? "100%" : "calc(100vh - 100px)", maxHeight: isMobile ? "100%" : 800 } : undefined}
                    >
                        {/* Mobile camera notch simulation */}
                        {viewMode === "mobile" && (
                            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center pointer-events-none">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 mr-2" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-700" />
                            </div>
                        )}

                        {(isLoading || simulateLoading) && (
                            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/95 backdrop-blur-[2px] animate-fade-in p-8 text-center gap-6 select-none rounded-[32px] overflow-hidden">
                                <div className="absolute -inset-10 bg-gradient-to-tr from-violet-500/5 via-fuchsia-500/5 to-cyan-500/5 blur-3xl opacity-70 pointer-events-none" />

                                <div className="relative w-96 h-96 flex items-center justify-center">
                                    <img
                                        src={HandLoading.src}
                                        alt="Crafting Email"
                                        className="w-full h-full object-contain"
                                    />
                                </div>

                                <div className="space-y-2.5 max-w-md" style={{ position: "absolute", top: "440px", left: "50%", transform: "translateX(-50%)" }}>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium transition-all duration-300">
                                        {loadingType === "saving"
                                            ? SAVING_MESSAGES[creativeMessageIndex]
                                            : GENERATING_MESSAGES[creativeMessageIndex]}
                                    </p>
                                </div>

                                {simulateLoading && (
                                    <button
                                        type="button"
                                        onClick={() => setSimulateLoading(false)}
                                        className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200/50 relative z-50"
                                    >
                                        Stop Simulation
                                    </button>
                                )}
                            </div>
                        )}
                        {html ? (
                            <iframe
                                ref={iframeRef}
                                title="Email Preview"
                                srcDoc={html}
                                onLoad={handleIframeLoad}
                                className={clsx(
                                    "w-full h-full border-0 bg-white scrollbar-hide",
                                    viewMode === "mobile" && "pt-6 rounded-[32px] overflow-hidden"
                                )}
                                sandbox="allow-same-origin allow-scripts"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <MailOpen className="w-7 h-7 text-slate-300" />
                                </div>
                                <div className="text-center flex flex-col items-center gap-1.5">
                                    <p className="text-sm font-semibold text-slate-500">Your email preview will appear here</p>
                                    {onLoadSample && (
                                        <button
                                            type="button"
                                            onClick={onLoadSample}
                                            className="text-xs text-violet-600 hover:text-violet-700 font-medium underline underline-offset-4 decoration-violet-300 hover:decoration-violet-500 transition-all flex items-center gap-1.5 mt-1"
                                        >
                                            <FileCode className="w-3.5 h-3.5" />
                                            Load a sample template to start editing
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {showEditPanel && html && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: isMobile ? "100vw" : panelWidth, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className={clsx(
                                "shrink-0 relative bg-white h-full border-l border-slate-200",
                                isMobile ? "fixed inset-0 left-0 right-0 top-0 bottom-0 z-[100]" : ""
                            )}
                            style={{ width: isMobile ? "100vw" : panelWidth, left: isMobile ? 0 : undefined }}
                        >
                            {/* Drag resize handle */}
                            {!isMobile && (
                                <div
                                    onMouseDown={handleDragStart}
                                    className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group flex items-center justify-center hover:bg-violet-100 transition-colors"
                                    title="Drag to resize"
                                >
                                    <div className="w-0.5 h-8 bg-slate-300 group-hover:bg-violet-400 rounded-full transition-colors" />
                                </div>
                            )}

                            {/* ── Collapse Toggle Button ── */}
                            <button
                                onClick={() => setShowEditPanel(false)}
                                className={clsx(
                                    "absolute z-30 flex items-center justify-center w-8 h-8 rounded-full border shadow-md transition-all",
                                    isMobile 
                                        ? "right-4 top-[-40px] bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300" 
                                        : "bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300",
                                    !isMobile && "-left-4 top-1/2"
                                )}
                                style={isMobile ? undefined : { transform: "translateY(-50%)" }}
                                title="Collapse panel"
                            >
                                {isMobile ? (
                                    <X className="w-4 h-4" />
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                )}
                            </button>

                            <div className="h-full" style={{ width: isMobile ? "100%" : panelWidth }}>
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
