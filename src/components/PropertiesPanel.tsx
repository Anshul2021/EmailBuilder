"use client";

import { useState, useEffect, useRef } from "react";
import {
    Type, PencilLine, ImageIcon, X,
    Layers, SlidersHorizontal, Palette, Search,
    Check, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Sparkles, GripVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as Ph from "@phosphor-icons/react";
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

// ── Curated category collections ──
const ICON_COLLECTIONS = [
    { id: "all",           label: "All" },
    { id: "brand",         label: "Social",        icons: ["instagram-logo","facebook-logo","twitter-logo","linkedin-logo","github-logo","youtube-logo","slack-logo","whatsapp-logo","dribbble-logo","figma-logo","google-logo","apple-logo","tiktok-logo","reddit-logo","pinterest-logo","spotify-logo","discord-logo","twitch-logo","telegram-logo","snapchat-logo","messenger-logo","medium-logo","behance-logo","skype-logo","zoom-logo"] },
    { id: "communication", label: "Comms",         icons: ["envelope","envelope-simple","phone","phone-call","chats","chat-bubble","paper-plane-tilt","bell","bell-ringing","broadcast","speaker-high","at","rss","megaphone"] },
    { id: "commerce",      label: "Finance",       icons: ["shopping-cart","shopping-bag","credit-card","bank","wallet","currency-dollar","tag","receipt","package","storefront","ticket","coins"] },
    { id: "design",        label: "Design",        icons: ["paint-brush","palette","pencil-simple","pen","crop","ruler","circle","square","triangle","heart","star","sparkle","crown","flower"] },
    { id: "media",         label: "Media",         icons: ["play","pause","stop","skip-forward","skip-back","music-note","headphones","microphone","video-camera","image","camera","monitor","device-mobile"] },
    { id: "office",        label: "Office",        icons: ["file","file-text","folder","archive","briefcase","calendar","clock","notepad","paperclip","link","book","hourglass","compass","map-pin"] },
    { id: "people",        label: "People",        icons: ["user","users","user-plus","smiley","smiley-wink","smiley-sad","hand-waving","thumbs-up","thumbs-down","heartbeat","fingerprint"] },
    { id: "arrows",        label: "Arrows",        icons: ["arrow-up","arrow-down","arrow-left","arrow-right","caret-up","caret-down","caret-left","caret-right","arrows-left-right","arrow-counter-clockwise","funnel"] },
    { id: "tech",          label: "Tech",          icons: ["lock","lock-open","key","shield","cpu","database","wifi-high","bluetooth","terminal","code","qr-code","hard-drive","cloud-arrow-up"] },
    { id: "weather",       label: "Weather",       icons: ["sun","moon","cloud","cloud-rain","snowflake","wind","drop","fire","leaf","tree","globe","lightning"] },
];

// ── Dynamically build the full list of all Phosphor icons from the React package ──
const ALL_PH_ICON_NAMES: string[] = (() => {
    const names: string[] = [];
    for (const [key, val] of Object.entries(Ph)) {
        if (
            val &&
            /^[A-Z]/.test(key) &&
            key !== "IconContext" &&
            key !== "IconBase" &&
            !key.endsWith("Icon")
        ) {
            // PascalCase → kebab-case
            const kebab = key.replace(/([A-Z])/g, (m, ch, offset: number) =>
                offset === 0 ? ch.toLowerCase() : `-${ch.toLowerCase()}`
            );
            names.push(kebab);
        }
    }
    return names.sort();
})();

// ── Helper: kebab-case → PascalCase component ──
const getPhosphorIconComponent = (kebabName: string) => {
    const pascalName = kebabName
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
    return (Ph as any)[pascalName] || Ph.Question;
};

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

type PanelMode = "layers" | "properties" | "design" | "icons";

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

    // Icons Tab State
    const [iconSearch, setIconSearch] = useState("");
    const [iconCategory, setIconCategory] = useState("all");
    const [iconStyle, setIconStyle] = useState<"regular" | "bold" | "duotone" | "fill" | "light" | "thin">("regular");
    const [iconColor, setIconColor] = useState("#000000");
    const [iconSize, setIconSize] = useState(24);
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
    const [copiedIconHtml, setCopiedIconHtml] = useState(false);
    const [copiedIconUrl, setCopiedIconUrl] = useState(false);
    const [insertedIcon, setInsertedIcon] = useState(false);
    const [vibratingIcon, setVibratingIcon] = useState<string | null>(null);
    const [showAllIcons, setShowAllIcons] = useState(false);
    const iconRenderRef = useRef<HTMLDivElement>(null);

    // Build icon SVG data-URL from the hidden render container
    const getIconDataUrl = (): string => {
        const svgEl = iconRenderRef.current?.querySelector("svg");
        if (!svgEl) return "";
        // Ensure proper xmlns
        svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        const svgStr = new XMLSerializer().serializeToString(svgEl);
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
    };

    // Fallback CDN URL (SVG, not PNG)
    const getIconCdnUrl = (iconName: string): string => {
        const hex = iconColor.replace("#", "");
        const suffix = iconStyle === "regular" ? "" : `-${iconStyle}`;
        return `https://api.iconify.design/ph/${iconName}${suffix}.svg?color=%23${hex}&width=${iconSize}&height=${iconSize}`;
    };

    const handleIconClick = (iconName: string) => {
        setSelectedIcon(iconName);
        setVibratingIcon(iconName);
        setTimeout(() => setVibratingIcon(null), 500);
    };

    const handleIconDragStart = (e: React.DragEvent<HTMLButtonElement>, iconName: string) => {
        const dataUrl = getIconDataUrl();
        const url = dataUrl || getIconCdnUrl(iconName);
        e.dataTransfer.setData("text/plain", url);
        e.dataTransfer.setData("application/x-ph-icon-url", url);
        e.dataTransfer.setData("application/x-ph-icon-name", iconName);
        e.dataTransfer.effectAllowed = "copy";
        // Custom drag image: use the rendered SVG container
        if (iconRenderRef.current) {
            e.dataTransfer.setDragImage(iconRenderRef.current, iconSize / 2, iconSize / 2);
        }
    };

    const handleReplaceImageAction = () => {
        if (!selectedIcon) return;
        const dataUrl = getIconDataUrl();
        const url = dataUrl || getIconCdnUrl(selectedIcon);
        onApplyStyle({ src: url });
        setInsertedIcon(true);
        setTimeout(() => setInsertedIcon(false), 2000);
    };

    const handleInsertInlineAction = () => {
        if (!selectedIcon) return;
        const dataUrl = getIconDataUrl();
        const url = dataUrl || getIconCdnUrl(selectedIcon);
        const imgTag = `<img src="${url}" style="vertical-align: middle; display: inline-block; margin: 0 4px;" width="${iconSize}" height="${iconSize}" alt="${selectedIcon}" />`;
        onContentChange((selectedProps.content || "") + imgTag);
        setInsertedIcon(true);
        setTimeout(() => setInsertedIcon(false), 2000);
    };

    const handleCopyHtmlAction = () => {
        if (!selectedIcon) return;
        const dataUrl = getIconDataUrl();
        const url = dataUrl || getIconCdnUrl(selectedIcon);
        const imgTag = `<img src="${url}" style="vertical-align: middle; display: inline-block; margin: 0 4px;" width="${iconSize}" height="${iconSize}" alt="${selectedIcon}" />`;
        navigator.clipboard.writeText(imgTag).then(() => {
            setCopiedIconHtml(true);
            setTimeout(() => setCopiedIconHtml(false), 2000);
        });
    };

    const handleCopyUrlAction = () => {
        if (!selectedIcon) return;
        const url = getIconCdnUrl(selectedIcon);
        navigator.clipboard.writeText(url).then(() => {
            setCopiedIconUrl(true);
            setTimeout(() => setCopiedIconUrl(false), 2000);
        });
    };

    // Smart filtering: search across the full Phosphor library; categories use curated sets
    const filteredIcons = (() => {
        if (iconSearch.trim()) {
            const q = iconSearch.toLowerCase();
            return ALL_PH_ICON_NAMES.filter(n => n.includes(q));
        }
        if (iconCategory === "all") return ALL_PH_ICON_NAMES;
        const cat = ICON_COLLECTIONS.find(c => c.id === iconCategory);
        return (cat?.icons || []).filter(n => ALL_PH_ICON_NAMES.includes(n));
    })();

    const DISPLAY_LIMIT = 120;
    const displayIcons = (!iconSearch && iconCategory === "all" && !showAllIcons)
        ? filteredIcons.slice(0, DISPLAY_LIMIT)
        : filteredIcons;

    const prevSelectionRef = useRef<boolean>(false);
    const prevElementTagRef = useRef<string | undefined>(undefined);
    const prevContentRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (hasSelection) {
            const isNewSelection = !prevSelectionRef.current || 
                                   prevElementTagRef.current !== selectedProps.elementTag ||
                                   prevContentRef.current !== selectedProps.content;
            if (isNewSelection) {
                setMode("design");
            }
            if (selectedProps.isImage && pexelsPhotos.length === 0) {
                const q = "workspace";
                setPexelsQuery(q);
                fetchPexels(q);
            }
        }
        prevSelectionRef.current = hasSelection;
        prevElementTagRef.current = selectedProps.elementTag;
        prevContentRef.current = selectedProps.content;
    }, [hasSelection, selectedProps.elementTag, selectedProps.content, selectedProps.isImage]);

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
        { id: "design",     label: "Design",     icon: Palette },
        { id: "icons",      label: "Icons",      icon: Sparkles },
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
                <div className="flex items-center w-full">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg relative w-full">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = mode === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setMode(tab.id as PanelMode)}
                                    className={`relative flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-150 z-10 ${
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

                        {/* ── Design ── */}
                        {mode === "design" && (
                            <DesignTab
                                hasSelection={hasSelection}
                                selectedProps={selectedProps}
                                onApplyStyle={onApplyStyle}
                                onContentChange={onContentChange}
                                onEnableTextEdit={onEnableTextEdit}
                                pexelsQuery={pexelsQuery}
                                setPexelsQuery={setPexelsQuery}
                                pexelsPhotos={pexelsPhotos}
                                isPexelsLoading={isPexelsLoading}
                                fetchPexels={fetchPexels}
                            />
                        )}

                        {/* ── Icons ── */}
                        {mode === "icons" && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Hidden icon render container for SVG extraction / drag image */}
                                <div
                                    ref={iconRenderRef}
                                    aria-hidden
                                    className="absolute pointer-events-none opacity-0"
                                    style={{ top: -999, left: -999, width: iconSize + 8, height: iconSize + 8, display: "flex", alignItems: "center", justifyContent: "center", background: "white", borderRadius: 8, padding: 4 }}
                                >
                                    {selectedIcon && (() => {
                                        const IC = getPhosphorIconComponent(selectedIcon);
                                        return <IC size={iconSize} weight={iconStyle} color={iconColor || "#000000"} />;
                                    })()}
                                </div>

                                {/* ── Search bar ── */}
                                <div className="px-3 pt-3 pb-2.5 shrink-0">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={iconSearch}
                                            onChange={(e) => { setIconSearch(e.target.value); setShowAllIcons(false); }}
                                            placeholder={`Search ${ALL_PH_ICON_NAMES.length}+ Phosphor icons…`}
                                            className="w-full text-xs pl-9 pr-8 h-9 border border-slate-200 hover:border-slate-300 focus:border-violet-400 focus:ring-0 rounded-lg outline-none transition-all bg-white"
                                        />
                                        {iconSearch && (
                                            <button type="button" onClick={() => setIconSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ── Category chips ── */}
                                <div className="px-3 pb-2.5 shrink-0 flex gap-1.5 overflow-x-auto scrollbar-hide whitespace-nowrap">
                                    {ICON_COLLECTIONS.map((col) => (
                                        <button
                                            type="button"
                                            key={col.id}
                                            onClick={() => { setIconCategory(col.id); setShowAllIcons(false); }}
                                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border shrink-0 transition-all ${
                                                iconCategory === col.id
                                                    ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                                                    : "bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600"
                                            }`}
                                        >
                                            {col.label}
                                        </button>
                                    ))}
                                </div>

                                {/* ── Controls row: Style / Color / Size ── */}
                                <div className="px-3 py-2.5 border-y border-slate-100 grid grid-cols-3 gap-2.5 shrink-0 bg-slate-50/40">
                                    <div className="col-span-1 flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Style</label>
                                        <DesignSelect
                                            value={iconStyle}
                                            onChange={(e) => setIconStyle(e.target.value as any)}
                                            options={[
                                                { label: "Regular",  value: "regular"  },
                                                { label: "Bold",     value: "bold"     },
                                                { label: "Duotone",  value: "duotone"  },
                                                { label: "Fill",     value: "fill"     },
                                                { label: "Light",    value: "light"    },
                                                { label: "Thin",     value: "thin"     },
                                            ]}
                                        />
                                    </div>
                                    <div className="col-span-1 flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Color</label>
                                        <ColorInput value={iconColor} onChange={setIconColor} />
                                    </div>
                                    <div className="col-span-1 flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Size</label>
                                        <div className="flex items-center gap-1 h-9 border border-slate-200 rounded-lg px-2 bg-white">
                                            <input
                                                type="number" min={12} max={128}
                                                value={iconSize}
                                                onChange={(e) => setIconSize(Number(e.target.value))}
                                                className="w-full text-xs text-center outline-none bg-transparent font-semibold text-slate-700"
                                            />
                                            <span className="text-[10px] text-slate-400 shrink-0">px</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Count + hint ── */}
                                <div className="px-3 py-1.5 flex items-center justify-between shrink-0">
                                    <span className="text-[10px] text-slate-400">
                                        {filteredIcons.length > displayIcons.length
                                            ? `${displayIcons.length} of ${filteredIcons.length}`
                                            : `${filteredIcons.length} icon${filteredIcons.length !== 1 ? "s" : ""}`}
                                    </span>
                                    {selectedIcon && (
                                        <span className="text-[10px] text-violet-500 font-semibold flex items-center gap-1">
                                            <GripVertical className="w-3 h-3" /> drag to canvas
                                        </span>
                                    )}
                                </div>

                                {/* ── Icon Grid ── */}
                                <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar">
                                    {filteredIcons.length > 0 ? (
                                        <>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {displayIcons.map((iconName) => {
                                                    const IconComponent = getPhosphorIconComponent(iconName);
                                                    const isSelected = selectedIcon === iconName;
                                                    const isVibrating = vibratingIcon === iconName;
                                                    return (
                                                        <motion.button
                                                            key={iconName}
                                                            type="button"
                                                            draggable
                                                            onDragStart={(e) => handleIconDragStart(e as any, iconName)}
                                                            onClick={() => handleIconClick(iconName)}
                                                            animate={isVibrating
                                                                ? { rotate: [0, -12, 12, -10, 10, -6, 6, -3, 3, 0], scale: [1, 1.15, 1.15, 1.15, 1.15, 1.05, 1.05, 1.02, 1.02, 1] }
                                                                : { rotate: 0, scale: 1 }
                                                            }
                                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                                            className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-colors cursor-grab active:cursor-grabbing select-none ${
                                                                isSelected
                                                                    ? "bg-violet-50 border-violet-400 shadow-sm"
                                                                    : "bg-white border-slate-200 hover:border-violet-300 hover:bg-slate-50"
                                                            }`}
                                                            title={iconName.replace(/-/g, " ")}
                                                        >
                                                            <IconComponent
                                                                size={20}
                                                                weight={iconStyle}
                                                                color={isSelected ? "#7c3aed" : (iconColor || "#000000")}
                                                            />
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>

                                            {/* Show more */}
                                            {filteredIcons.length > displayIcons.length && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAllIcons(true)}
                                                    className="w-full mt-3 py-2.5 text-xs font-semibold text-violet-600 hover:text-violet-700 border border-violet-200 hover:border-violet-300 rounded-lg transition-all bg-violet-50/50 hover:bg-violet-50"
                                                >
                                                    Show {filteredIcons.length - displayIcons.length} more icons
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <Search className="w-5 h-5 text-slate-300 mb-2" />
                                            <p className="text-xs font-semibold text-slate-500">No icons found</p>
                                            <p className="text-[11px] text-slate-400 mt-1">Try a different keyword</p>
                                        </div>
                                    )}
                                </div>

                                {/* ── Selected icon actions footer (slides up) ── */}
                                <AnimatePresence>
                                    {selectedIcon && (
                                        <motion.div
                                            key="icon-footer"
                                            initial={{ y: 24, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: 24, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                            className="shrink-0 border-t border-slate-100 bg-white p-3 space-y-2.5"
                                        >
                                            {/* Preview row */}
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                                                    {(() => {
                                                        const IC = getPhosphorIconComponent(selectedIcon);
                                                        return <IC size={20} weight={iconStyle} color={iconColor || "#000000"} />;
                                                    })()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-slate-700 capitalize truncate">{selectedIcon.replace(/-/g, " ")}</p>
                                                    <p className="text-[10px] text-slate-400">{iconStyle} · {iconSize}px · drag or click below</p>
                                                </div>
                                                <button type="button" onClick={() => setSelectedIcon(null)} className="text-slate-400 hover:text-slate-600 p-1 shrink-0">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Primary action */}
                                            {hasSelection ? (
                                                selectedProps.isImage ? (
                                                    <button type="button" onClick={handleReplaceImageAction}
                                                        className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5">
                                                        {insertedIcon ? <><Check className="w-3.5 h-3.5" /> Replaced!</> : "Replace Selected Image"}
                                                    </button>
                                                ) : (
                                                    <button type="button" onClick={handleInsertInlineAction}
                                                        className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5">
                                                        {insertedIcon ? <><Check className="w-3.5 h-3.5" /> Inserted!</> : "Insert Inline in Text"}
                                                    </button>
                                                )
                                            ) : (
                                                <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-center">
                                                    <p className="text-[11px] text-amber-700 font-medium">Select a block in preview first</p>
                                                </div>
                                            )}

                                            {/* Copy row */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <button type="button" onClick={handleCopyHtmlAction}
                                                    className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold rounded-lg transition-all">
                                                    {copiedIconHtml ? "✓ Copied!" : "Copy HTML"}
                                                </button>
                                                <button type="button" onClick={handleCopyUrlAction}
                                                    className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold rounded-lg transition-all">
                                                    {copiedIconUrl ? "✓ Copied!" : "Copy URL"}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
