"use client";

import { useState, useEffect } from "react";
import {
    Type, PencilLine, ImageIcon, X,
    Trash2, Upload, Layers, SlidersHorizontal, Palette, Search,
    Check, ChevronDown, AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RichTextEditor } from "./UI/RichTextEditor";
import { Tooltip } from "./UI/Tooltip";
import { ColorInput } from "./UI/ColorInput";
import { UnitInput } from "./UI/UnitInput";
import { DesignSelect } from "./UI/DesignSelect";
import { ToggleGroup } from "./UI/ToggleGroup";
import { Accordion } from "./UI/Accordion";
import { LayerPanel, SectionEditState } from "./LayerPanel";
import type { MjmlNode } from "@/lib/mjmlTree";
import { DesignTab } from "./DesignTab";

export interface ElementProperties {
    fontSize: number | string;
    fontWeight: string;
    color: string;
    backgroundColor: string;
    align: "left" | "center" | "right" | "justify" | string;
    fontFamily: string;
    content: string;
    elementTag: string;

    isImage?: boolean;
    width?: number | string;
    borderRadius?: number;
    src?: string;
    objectFit?: string;

    letterSpacing?: string;
    lineHeight?: string;
    textDecoration?: string;
    fontStyle?: string;
    verticalAlign?: string;
    textShadow?: string;

    paddingTop?: string;
    paddingRight?: string;
    paddingBottom?: string;
    paddingLeft?: string;

    backgroundImage?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
    backgroundSize?: string;
    containerBackgroundColor?: string;
    innerBackgroundColor?: string;

    borderWidth?: string;
    borderStyle?: string;
    borderColor?: string;

    height?: string;
}

type PanelMode = "layers" | "properties" | "design";

interface PropertiesPanelProps {
    hasSelection: boolean;
    selectedProps: ElementProperties;
    onContentChange: (content: string | null) => void;
    onApplyStyle: (prop: Partial<ElementProperties>) => void;
    onEnableTextEdit: () => void;
    onReplaceImage: () => void;
    onClose: () => void;
    style?: React.CSSProperties;
    mjmlTree: MjmlNode | null;
    selectedLayerNodeId: string | null;
    sectionEditStates: Map<string, SectionEditState>;
    onLayerSelect: (nodeId: string) => void;
    onLayerHover: (nodeId: string | null) => void;
    onLayerToggleExpand: (nodeId: string) => void;
    onLayerToggleHidden: (nodeId: string) => void;
    onLayerDelete: (nodeId: string) => void;
    onLayerDuplicate: (nodeId: string) => void;
    onLayerRename: (nodeId: string, newName: string) => void;
    onLayerMove: (nodeId: string, targetId: string, position: "before" | "after" | "inside") => void;
    onLayerAiEdit: (nodeId: string) => void;
}

/* Shared label class — identical to DesignTab's labelClass */
const lc = "text-xs font-semibold text-slate-500 block mb-1.5";

export function PropertiesPanel({
    hasSelection,
    selectedProps,
    onContentChange,
    onApplyStyle,
    onEnableTextEdit,
    onReplaceImage,
    onClose,
    style,
    mjmlTree,
    selectedLayerNodeId,
    sectionEditStates,
    onLayerSelect,
    onLayerHover,
    onLayerToggleExpand,
    onLayerToggleHidden,
    onLayerDelete,
    onLayerDuplicate,
    onLayerRename,
    onLayerMove,
    onLayerAiEdit,
}: PropertiesPanelProps) {
    const [mode, setMode] = useState<PanelMode>("layers");
    const [pexelsQuery, setPexelsQuery] = useState("");
    const [pexelsPhotos, setPexelsPhotos] = useState<any[]>([]);
    const [isPexelsLoading, setIsPexelsLoading] = useState(false);

    useEffect(() => {
        if (hasSelection && selectedProps.isImage) {
            setMode("properties");
            if (pexelsPhotos.length === 0) {
                const q = "workspace";
                setPexelsQuery(q);
                fetchPexels(q);
            }
        }
    }, [hasSelection, selectedProps.isImage]);

    const fetchPexels = async (query: string) => {
        if (!query.trim()) return;
        setIsPexelsLoading(true);
        try {
            const res = await fetch(`/api/pexels/search?query=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setPexelsPhotos(data.photos || []);
            }
        } catch (err) {
            console.error("[Pexels] Search error:", err);
        } finally {
            setIsPexelsLoading(false);
        }
    };

    /* Parse a css value like "16px" → { val: "16", unit: "px" } */
    const parseUnit = (value: string | number | undefined, defaultUnit = "px") => {
        if (value === undefined || value === null) return { val: "", unit: defaultUnit };
        const str = String(value);
        if (str === "auto" || str === "normal") return { val: str, unit: "" };
        const match = str.match(/^(-?\d*\.?\d+)(.*)$/);
        if (match) return { val: match[1], unit: match[2] || defaultUnit };
        return { val: str, unit: defaultUnit };
    };

    const tabs = [
        { id: "layers",     label: "Layers",     icon: Layers },
        { id: "properties", label: "Properties", icon: SlidersHorizontal },
        { id: "design",     label: "Design",     icon: Palette },
    ];

    /* Derived numeric values */
    const fsValue = typeof selectedProps.fontSize === "number"
        ? selectedProps.fontSize
        : parseInt(String(selectedProps.fontSize || "16"), 10) || 16;

    const widthVal = typeof selectedProps.width === "number"
        ? selectedProps.width
        : parseInt(String(selectedProps.width || "100"), 10) || 100;

    const radiusVal = typeof selectedProps.borderRadius === "number"
        ? selectedProps.borderRadius
        : parseInt(String(selectedProps.borderRadius || "0"), 10) || 0;

    return (
        <div className="w-full h-full flex flex-col bg-white" style={style}>

            {/* ── Tab bar ── */}
            <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg relative">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = mode === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setMode(tab.id as PanelMode)}
                                    className={`relative flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-150 z-10 ${
                                        isActive ? "text-violet-700" : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabPill"
                                            className="absolute inset-0 bg-white rounded-md border border-slate-200 z-[-1]"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <Icon className={`w-3.5 h-3.5 transition-transform duration-150 ${isActive ? "scale-105" : ""}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 active:scale-95"
                        title="Close panel"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ── Content area ── */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="w-full h-full flex flex-col overflow-hidden bg-white"
                    >
                        {/* ── Layers ── */}
                        {mode === "layers" && (
                            <LayerPanel
                                tree={mjmlTree}
                                selectedNodeId={selectedLayerNodeId}
                                sectionEditStates={sectionEditStates}
                                onSelectNode={onLayerSelect}
                                onHoverNode={onLayerHover}
                                onToggleExpand={onLayerToggleExpand}
                                onToggleHidden={onLayerToggleHidden}
                                onDelete={onLayerDelete}
                                onDuplicate={onLayerDuplicate}
                                onRename={onLayerRename}
                                onMove={onLayerMove}
                                onAiEdit={onLayerAiEdit}
                            />
                        )}

                        {/* ── Properties ── */}
                        {mode === "properties" && (
                            <>
                                {!hasSelection ? (
                                    /* Empty state */
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                                        <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                            <Type className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div className="max-w-[230px]">
                                            <p className="text-xs font-semibold text-slate-700 mb-1.5">Nothing selected</p>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                Click any text or image in the preview to start editing its properties.
                                            </p>
                                        </div>
                                        <div className="w-full max-w-[230px] text-left space-y-3 border-t border-slate-100 pt-4">
                                            <div className="space-y-1">
                                                <span className="block text-xs font-semibold text-slate-600">Text element</span>
                                                <span className="block text-xs text-slate-400 leading-normal">Font family, size, alignment, text & background color.</span>
                                            </div>
                                            <div className="h-px bg-slate-100" />
                                            <div className="space-y-1">
                                                <span className="block text-xs font-semibold text-slate-600">Image element</span>
                                                <span className="block text-xs text-slate-400 leading-normal">Width, corner radius, fit style, and stock photo search.</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── Selected element ── */
                                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white pb-10">

                                        {/* Element chip */}
                                        <div className="flex items-center gap-2 mx-3 mt-3 mb-1 px-3 py-2 bg-slate-50 border border-slate-200/70 rounded-lg">
                                            <div className="w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
                                                {selectedProps.isImage
                                                    ? <ImageIcon className="w-3 h-3 text-violet-600" />
                                                    : <Type className="w-3 h-3 text-violet-600" />}
                                            </div>
                                            <span className="text-xs font-semibold text-slate-600 flex-1">
                                                {selectedProps.isImage ? "Image element" : `<${selectedProps.elementTag}> element`}
                                            </span>
                                            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5">
                                                {selectedProps.elementTag}
                                            </span>
                                        </div>

                                        {/* ── Text element sections ── */}
                                        {!selectedProps.isImage ? (
                                            <>
                                                {/* Content */}
                                                <Accordion title="Content" defaultExpanded={true}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className={lc} style={{ marginBottom: 0 }}>Rich text</label>
                                                        <Tooltip content="Edit directly in preview" position="bottom">
                                                            <button
                                                                onClick={onEnableTextEdit}
                                                                className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 px-2 py-0.5 bg-violet-50 hover:bg-violet-100 rounded transition-all"
                                                            >
                                                                <PencilLine className="w-3 h-3" />
                                                                Live edit
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                    <RichTextEditor
                                                        value={selectedProps.content}
                                                        onChange={onContentChange}
                                                        placeholder="Write your email copy here…"
                                                    />
                                                </Accordion>

                                                {/* Typography */}
                                                <Accordion title="Typography" defaultExpanded={true}>
                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-1">
                                                        {/* Font family */}
                                                        <div className="flex flex-col col-span-2">
                                                            <label className={lc}>Font family</label>
                                                            <DesignSelect
                                                                value={selectedProps.fontFamily || "Arial"}
                                                                onChange={(e) => onApplyStyle({ fontFamily: e.target.value })}
                                                                options={[
                                                                    { label: "DM Sans",           value: "DM Sans, sans-serif" },
                                                                    { label: "Poppins",           value: "Poppins, sans-serif" },
                                                                    { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif" },
                                                                    { label: "Inter",             value: "Inter, sans-serif" },
                                                                    { label: "Instrument Sans",   value: "'Instrument Sans', sans-serif" },
                                                                    { label: "Crimson Text",      value: "'Crimson Text', serif" },
                                                                ]}
                                                            />
                                                        </div>

                                                        {/* Font size */}
                                                        <div className="flex flex-col">
                                                            <label className={lc}>Font size</label>
                                                            {(() => {
                                                                const { val, unit } = parseUnit(selectedProps.fontSize, "px");
                                                                return (
                                                                    <UnitInput
                                                                        value={val}
                                                                        onChangeValue={(v) => onApplyStyle({ fontSize: `${v}${unit}` })}
                                                                        units={["px", "em", "rem"]}
                                                                        unit={unit}
                                                                        onChangeUnit={(u) => onApplyStyle({ fontSize: `${val}${u}` })}
                                                                    />
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* Font weight */}
                                                        <div className="flex flex-col">
                                                            <label className={lc}>Weight</label>
                                                            <DesignSelect
                                                                value={selectedProps.fontWeight || "normal"}
                                                                onChange={(e) => onApplyStyle({ fontWeight: e.target.value })}
                                                                options={[
                                                                    { label: "Normal", value: "normal" },
                                                                    { label: "Bold",   value: "bold" },
                                                                    { label: "300",    value: "300" },
                                                                    { label: "400",    value: "400" },
                                                                    { label: "500",    value: "500" },
                                                                    { label: "600",    value: "600" },
                                                                    { label: "700",    value: "700" },
                                                                ]}
                                                            />
                                                        </div>

                                                        {/* Text align */}
                                                        <div className="flex flex-col">
                                                            <label className={lc}>Text align</label>
                                                            <ToggleGroup
                                                                value={selectedProps.align || "left"}
                                                                onChange={(val) => onApplyStyle({ align: val })}
                                                                options={[
                                                                    { value: "left",    icon: <AlignLeft    className="w-3.5 h-3.5" /> },
                                                                    { value: "center",  icon: <AlignCenter  className="w-3.5 h-3.5" /> },
                                                                    { value: "right",   icon: <AlignRight   className="w-3.5 h-3.5" /> },
                                                                    { value: "justify", icon: <AlignJustify className="w-3.5 h-3.5" /> },
                                                                ]}
                                                            />
                                                        </div>

                                                        {/* Line height */}
                                                        <div className="flex flex-col">
                                                            <label className={lc}>Line height</label>
                                                            {(() => {
                                                                const { val, unit } = parseUnit(selectedProps.lineHeight, "px");
                                                                return (
                                                                    <UnitInput
                                                                        value={val}
                                                                        onChangeValue={(v) => onApplyStyle({ lineHeight: unit === "normal" ? "normal" : `${v}${unit}` })}
                                                                        units={["px", "em", "normal"]}
                                                                        unit={unit}
                                                                        onChangeUnit={(u) => onApplyStyle({ lineHeight: u === "normal" ? "normal" : `${val}${u}` })}
                                                                    />
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </Accordion>

                                                {/* Colors */}
                                                <Accordion title="Colors" defaultExpanded={true}>
                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-1">
                                                        <div className="flex flex-col">
                                                            <label className={lc}>Text color</label>
                                                            <ColorInput
                                                                value={selectedProps.color || "#000000"}
                                                                onChange={(val) => onApplyStyle({ color: val })}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className={lc}>Background</label>
                                                            <ColorInput
                                                                value={selectedProps.backgroundColor || ""}
                                                                onChange={(val) => onApplyStyle({ backgroundColor: val })}
                                                            />
                                                        </div>
                                                    </div>
                                                </Accordion>
                                            </>
                                        ) : (
                                            /* ── Image element sections ── */
                                            <>
                                                {/* Dimensions */}
                                                <Accordion title="Dimensions" defaultExpanded={true}>
                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-1">
                                                        <div className="flex flex-col col-span-2">
                                                            <label className={lc}>Width</label>
                                                            <UnitInput
                                                                value={widthVal}
                                                                onChangeValue={(v) => onApplyStyle({ width: Number(v) })}
                                                                units={["%"]}
                                                                unit="%"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col col-span-2">
                                                            <label className={lc}>Corner radius</label>
                                                            <UnitInput
                                                                value={radiusVal}
                                                                onChangeValue={(v) => onApplyStyle({ borderRadius: Number(v) })}
                                                                units={["px", "%"]}
                                                                unit="px"
                                                            />
                                                        </div>
                                                    </div>
                                                </Accordion>

                                                {/* Image fit */}
                                                <Accordion title="Image fit" defaultExpanded={true}>
                                                    <div className="pt-1">
                                                        <label className={lc}>Fit style</label>
                                                        <DesignSelect
                                                            value={selectedProps.objectFit || "cover"}
                                                            onChange={(e) => onApplyStyle({ objectFit: e.target.value })}
                                                            options={[
                                                                { label: "Cover — fill & crop",  value: "cover" },
                                                                { label: "Contain — fit inside", value: "contain" },
                                                                { label: "Fill — stretch",        value: "fill" },
                                                                { label: "Original size",         value: "none" },
                                                                { label: "Scale down",            value: "scale-down" },
                                                            ]}
                                                        />
                                                    </div>
                                                </Accordion>

                                                {/* Stock photos */}
                                                <Accordion title="Stock photos" defaultExpanded={true}>
                                                    <div className="pt-1 space-y-3">
                                                        {/* Search bar */}
                                                        <div className="flex gap-2">
                                                            <div className="relative flex-1">
                                                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                                <input
                                                                    type="text"
                                                                    value={pexelsQuery}
                                                                    onChange={(e) => setPexelsQuery(e.target.value)}
                                                                    placeholder="Search e.g. office, tech…"
                                                                    className="w-full text-xs pl-8 pr-7 py-1.5 border border-slate-200 hover:border-slate-300 focus:border-violet-400 focus:ring-0 rounded-lg outline-none transition-all bg-slate-50 focus:bg-white"
                                                                    onKeyDown={(e) => e.key === "Enter" && fetchPexels(pexelsQuery)}
                                                                />
                                                                {pexelsQuery && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPexelsQuery("")}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => fetchPexels(pexelsQuery)}
                                                                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-all shrink-0"
                                                            >
                                                                Search
                                                            </button>
                                                        </div>

                                                        {/* Quick chips */}
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {["Office", "Tech", "Nature", "Fashion", "Minimal", "Coffee"].map((chip) => (
                                                                <button
                                                                    type="button"
                                                                    key={chip}
                                                                    onClick={() => { setPexelsQuery(chip.toLowerCase()); fetchPexels(chip); }}
                                                                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
                                                                        pexelsQuery.toLowerCase() === chip.toLowerCase()
                                                                            ? "bg-violet-50 text-violet-600 border-violet-200"
                                                                            : "bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600"
                                                                    }`}
                                                                >
                                                                    {chip}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {/* Results grid */}
                                                        {isPexelsLoading ? (
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {Array.from({ length: 6 }).map((_, i) => (
                                                                    <div key={i} className="aspect-square bg-slate-100 animate-pulse rounded-lg" />
                                                                ))}
                                                            </div>
                                                        ) : pexelsPhotos.length > 0 ? (
                                                            <motion.div
                                                                initial="hidden"
                                                                animate="show"
                                                                variants={{
                                                                    hidden: { opacity: 0 },
                                                                    show: { opacity: 1, transition: { staggerChildren: 0.04 } },
                                                                }}
                                                                className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-0.5 custom-scrollbar"
                                                            >
                                                                {pexelsPhotos.map((photo) => {
                                                                    const isSelected = selectedProps.src === photo.src.large;
                                                                    return (
                                                                        <motion.button
                                                                            variants={{
                                                                                hidden: { opacity: 0, scale: 0.95 },
                                                                                show: { opacity: 1, scale: 1, transition: { duration: 0.15 } },
                                                                            }}
                                                                            type="button"
                                                                            key={photo.id}
                                                                            onClick={() => onApplyStyle({ src: photo.src.large })}
                                                                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${
                                                                                isSelected
                                                                                    ? "border-violet-500 scale-[0.96]"
                                                                                    : "border-transparent hover:border-violet-300"
                                                                            }`}
                                                                            title={`By ${photo.photographer}`}
                                                                        >
                                                                            <img
                                                                                src={photo.src.medium}
                                                                                alt={photo.alt}
                                                                                className="w-full h-full object-cover"
                                                                                loading="lazy"
                                                                            />
                                                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                                <p className="text-[10px] text-white truncate font-medium">{photo.photographer}</p>
                                                                            </div>
                                                                            {isSelected && (
                                                                                <div className="absolute top-1 right-1 bg-violet-600 text-white rounded-full p-0.5 border border-white">
                                                                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                                                </div>
                                                                            )}
                                                                        </motion.button>
                                                                    );
                                                                })}
                                                            </motion.div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center py-5 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
                                                                <Search className="w-4 h-4 text-slate-300 mb-1.5" />
                                                                <p className="text-xs font-semibold text-slate-400">No results yet</p>
                                                                <p className="text-[11px] text-slate-300 mt-0.5">Search above to find stock photos</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Accordion>

                                                {/* Actions */}
                                                <Accordion title="Actions" defaultExpanded={true}>
                                                    <div className="flex flex-col gap-2 pt-1">
                                                        <button
                                                            onClick={onReplaceImage}
                                                            className="flex items-center justify-center gap-1.5 w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-all"
                                                        >
                                                            <Upload className="w-3.5 h-3.5" />
                                                            Replace image
                                                        </button>
                                                        <button
                                                            onClick={() => onApplyStyle({ width: 100, borderRadius: 0 })}
                                                            className="flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Reset styles
                                                        </button>
                                                    </div>
                                                </Accordion>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── Design ── */}
                        {mode === "design" && (
                            <DesignTab
                                hasSelection={hasSelection}
                                selectedProps={selectedProps}
                                onApplyStyle={onApplyStyle}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
