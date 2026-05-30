import React from "react";
import { Accordion } from "./UI/Accordion";
import { ToggleGroup } from "./UI/ToggleGroup";
import { ColorInput } from "./UI/ColorInput";
import { UnitInput } from "./UI/UnitInput";
import { DesignSelect } from "./UI/DesignSelect";
import { ElementProperties } from "./PropertiesPanel";
import {
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Underline, Strikethrough, Italic, Plus, X,
    ImageIcon, Type, PencilLine, Search, Check
} from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip } from "./UI/Tooltip";
import { RichTextEditor } from "./UI/RichTextEditor";

interface DesignTabProps {
    hasSelection: boolean;
    selectedProps: ElementProperties;
    onApplyStyle: (prop: Partial<ElementProperties>) => void;
    onContentChange: (content: string | null) => void;
    onEnableTextEdit: () => void;
    pexelsQuery: string;
    setPexelsQuery: (query: string) => void;
    pexelsPhotos: any[];
    isPexelsLoading: boolean;
    fetchPexels: (query: string) => Promise<void>;
}

export function DesignTab({
    hasSelection,
    selectedProps,
    onApplyStyle,
    onContentChange,
    onEnableTextEdit,
    pexelsQuery,
    setPexelsQuery,
    pexelsPhotos,
    isPexelsLoading,
    fetchPexels,
}: DesignTabProps) {
    const [activeShadowLayer, setActiveShadowLayer] = React.useState<number | null>(0);
    if (!hasSelection) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 text-center bg-white text-slate-500">
                <p className="text-xs">Select an element to edit its design.</p>
            </div>
        );
    }

    const handleStyleChange = (key: keyof ElementProperties, value: any) => {
        onApplyStyle({ [key]: value });
    };

    const handleUnitChange = (key: keyof ElementProperties, val: string | number, currentUnit: string) => {
        if (!val && val !== 0) {
            handleStyleChange(key, "");
            return;
        }
        if (String(val) === "auto" || String(val) === "normal") {
            handleStyleChange(key, String(val));
            return;
        }
        handleStyleChange(key, `${val}${currentUnit}`);
    };

    const parseUnit = (value: string | number | undefined, defaultUnit = "px") => {
        if (value === undefined || value === null) return { val: "", unit: defaultUnit };
        const str = String(value);
        if (str === "auto" || str === "normal") return { val: str, unit: "" };
        const match = str.match(/^(-?\d*\.?\d+)(.*)$/);
        if (match) {
            return { val: match[1], unit: match[2] || defaultUnit };
        }
        return { val: str, unit: defaultUnit };
    };

    const labelClass = "text-xs font-semibold text-slate-500 block mb-1.5";

    return (
        <div className="flex-1 overflow-y-auto bg-white flex flex-col custom-scrollbar pb-10">
            {/* Element chip */}
            <div className="flex items-center gap-2 mx-3 mt-3 mb-1 px-3 py-2 bg-slate-50 border border-slate-200/70 rounded-lg shrink-0">
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

            {/* Rich text section (for text elements) */}
            {!selectedProps.isImage && (
                <Accordion title="Content" defaultExpanded={true}>
                    <div className="flex items-center justify-between mb-2">
                        <label className={labelClass} style={{ marginBottom: 0 }}>Rich text</label>
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
            )}

            {/* Image specific sections (Image fit & Stock photos) */}
            {selectedProps.isImage && (
                <>
                    {/* Image fit */}
                    <Accordion title="Image fit" defaultExpanded={false}>
                        <div className="pt-1">
                            <label className={labelClass}>Fit style</label>
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
                                        className="w-full text-xs pl-8 pr-7 h-9 border border-slate-200 hover:border-slate-300 focus:border-violet-400 focus:ring-0 rounded-lg outline-none transition-all bg-slate-50 focus:bg-white"
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
                                    className="px-4 h-9 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-all shrink-0 flex items-center justify-center"
                                >
                                    Search
                                </button>
                            </div>

                            {/* Quick chips */}
                            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide whitespace-nowrap py-0.5">
                                {["Office", "Tech", "Nature", "Fashion", "Minimal", "Coffee"].map((chip) => (
                                    <button
                                        type="button"
                                        key={chip}
                                        onClick={() => { setPexelsQuery(chip.toLowerCase()); fetchPexels(chip); }}
                                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-all inline-block ${
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
                </>
            )}

            {/* Dimension Section */}
            <Accordion title="Dimension" defaultExpanded={false}>
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-1">
                    <div className="flex flex-col">
                        <label className={labelClass}>Width</label>
                        {(() => {
                            const { val, unit } = parseUnit(selectedProps.width, "%");
                            return (
                                <UnitInput
                                    value={val}
                                    onChangeValue={(v) => handleUnitChange("width", v, unit)}
                                    units={["px", "%", "vw", "auto"]}
                                    unit={unit}
                                    onChangeUnit={(u) => handleStyleChange("width", `${val}${u}`)}
                                />
                            );
                        })()}
                    </div>
                    <div className="flex flex-col">
                        <label className={labelClass}>Height</label>
                        {(() => {
                            const { val, unit } = parseUnit(selectedProps.height, "px");
                            return (
                                <UnitInput
                                    value={val}
                                    onChangeValue={(v) => handleUnitChange("height", v, unit)}
                                    units={["px", "%", "vh", "auto"]}
                                    unit={unit}
                                    onChangeUnit={(u) => handleStyleChange("height", `${val}${u}`)}
                                />
                            );
                        })()}
                    </div>
                </div>
            </Accordion>

            {/* Typography Section */}
            <Accordion title="Typography" defaultExpanded={true}>
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-1">
                    {/* Font & Font size */}
                    <div className="flex flex-col">
                        <label className={labelClass}>Font</label>
                        <DesignSelect
                            value={selectedProps.fontFamily || "Arial"}
                            onChange={(e) => handleStyleChange("fontFamily", e.target.value)}
                            options={[
                                { label: "DM Sans", value: "DM Sans, sans-serif" },
                                { label: "Poppins", value: "Poppins, sans-serif" },
                                { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif" },
                                { label: "Inter", value: "Inter, sans-serif" },
                                { label: "Instrument Sans", value: "'Instrument Sans', sans-serif" },
                                { label: "Crimson Text", value: "'Crimson Text', serif" },
                            ]}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className={labelClass}>Font size</label>
                        {(() => {
                            const { val, unit } = parseUnit(selectedProps.fontSize, "px");
                            return (
                                <UnitInput
                                    value={val}
                                    onChangeValue={(v) => handleUnitChange("fontSize", v, unit)}
                                    units={["px", "em", "rem"]}
                                    unit={unit}
                                    onChangeUnit={(u) => handleStyleChange("fontSize", `${val}${u}`)}
                                />
                            );
                        })()}
                    </div>

                    {/* Weight & Letter spacing */}
                    <div className="flex flex-col">
                        <label className={labelClass}>Weight</label>
                        <DesignSelect
                            value={selectedProps.fontWeight || "normal"}
                            onChange={(e) => handleStyleChange("fontWeight", e.target.value)}
                            options={[
                                { label: "Normal", value: "normal" },
                                { label: "Bold", value: "bold" },
                                { label: "100", value: "100" },
                                { label: "200", value: "200" },
                                { label: "300", value: "300" },
                                { label: "400", value: "400" },
                                { label: "500", value: "500" },
                                { label: "600", value: "600" },
                                { label: "700", value: "700" },
                                { label: "800", value: "800" },
                                { label: "900", value: "900" },
                            ]}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className={labelClass}>Letter spacing</label>
                        {(() => {
                            const { val, unit } = parseUnit(selectedProps.letterSpacing, "px");
                            return (
                                <UnitInput
                                    value={val}
                                    onChangeValue={(v) => handleUnitChange("letterSpacing", v, unit)}
                                    units={["px", "em", "normal"]}
                                    unit={unit}
                                    onChangeUnit={(u) => handleStyleChange("letterSpacing", u === "normal" ? "normal" : `${val}${u}`)}
                                />
                            );
                        })()}
                    </div>

                    {/* Font color & Line height */}
                    <div className="flex flex-col">
                        <label className={labelClass}>Font color</label>
                        <ColorInput
                            value={selectedProps.color || ""}
                            onChange={(val) => handleStyleChange("color", val)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className={labelClass}>Line height</label>
                        {(() => {
                            const { val, unit } = parseUnit(selectedProps.lineHeight, "px");
                            return (
                                <UnitInput
                                    value={val}
                                    onChangeValue={(v) => handleUnitChange("lineHeight", v, unit)}
                                    units={["px", "em", "normal"]}
                                    unit={unit}
                                    onChangeUnit={(u) => handleStyleChange("lineHeight", u === "normal" ? "normal" : `${val}${u}`)}
                                />
                            );
                        })()}
                    </div>

                    {/* Text align & Text decoration */}
                    <div className="flex flex-col">
                        <label className={labelClass}>Text align</label>
                        <ToggleGroup
                            value={selectedProps.align || "left"}
                            onChange={(val) => handleStyleChange("align", val)}
                            options={[
                                { value: "left", icon: <AlignLeft className="w-3.5 h-3.5" /> },
                                { value: "center", icon: <AlignCenter className="w-3.5 h-3.5" /> },
                                { value: "right", icon: <AlignRight className="w-3.5 h-3.5" /> },
                                { value: "justify", icon: <AlignJustify className="w-3.5 h-3.5" /> },
                            ]}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className={labelClass}>Text decoration</label>
                        <ToggleGroup
                            value={selectedProps.textDecoration || "none"}
                            onChange={(val) => handleStyleChange("textDecoration", val)}
                            options={[
                                { value: "none", icon: <X className="w-3.5 h-3.5" /> },
                                { value: "underline", icon: <Underline className="w-3.5 h-3.5" /> },
                                { value: "line-through", icon: <Strikethrough className="w-3.5 h-3.5" /> },
                            ]}
                        />
                    </div>

                    {/* Font style & Vertical align */}
                    <div className="flex flex-col">
                        <label className={labelClass}>Font style</label>
                        <ToggleGroup
                            value={selectedProps.fontStyle || "normal"}
                            onChange={(val) => handleStyleChange("fontStyle", val)}
                            options={[
                                { value: "normal", label: "A" },
                                { value: "italic", icon: <Italic className="w-3.5 h-3.5" /> },
                            ]}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className={labelClass}>Vertical align</label>
                        <DesignSelect
                            value={selectedProps.verticalAlign || "baseline"}
                            onChange={(e) => handleStyleChange("verticalAlign", e.target.value)}
                            options={[
                                { label: "baseline", value: "baseline" },
                                { label: "top", value: "top" },
                                { label: "middle", value: "middle" },
                                { label: "bottom", value: "bottom" },
                            ]}
                        />
                    </div>
                </div>

                {/* Text Shadow */}
                <div className="mt-5 flex flex-col">
                    {(() => {
                        const shadows = React.useMemo(() => {
                            const str = selectedProps.textShadow;
                            if (!str || str === "none") return [];
                            const layers = str.split(/,(?![^\(]*\))/).map(s => s.trim()).filter(Boolean);
                            return layers.map(layer => {
                                const parts = layer.match(/^([-\d.]+[a-z%]*)\s+([-\d.]+[a-z%]*)(?:\s+([-\d.]+[a-z%]*))?\s*(.*)$/i);
                                if (parts) {
                                    return {
                                        x: parts[1],
                                        y: parts[2],
                                        blur: parts[3] || "0px",
                                        color: parts[4] || "#000000"
                                    };
                                }
                                return { x: "0px", y: "0px", blur: "0px", color: layer }; // fallback
                            });
                        }, [selectedProps.textShadow]);

                        const updateShadows = (newShadows: any[]) => {
                            if (newShadows.length === 0) {
                                handleStyleChange("textShadow", "none");
                            } else {
                                handleStyleChange("textShadow", newShadows.map(s => `${s.x} ${s.y} ${s.blur} ${s.color}`).join(", "));
                            }
                        };

                        const addShadow = () => {
                            updateShadows([...shadows, { x: "2px", y: "2px", blur: "4px", color: "rgba(0, 0, 0, 0.3)" }]);
                            setActiveShadowLayer(shadows.length);
                        };

                        const removeShadow = (index: number) => {
                            const newShadows = shadows.filter((_, i) => i !== index);
                            updateShadows(newShadows);
                            if (activeShadowLayer === index) setActiveShadowLayer(null);
                            else if (activeShadowLayer !== null && activeShadowLayer > index) setActiveShadowLayer(activeShadowLayer - 1);
                        };

                        const updateLayer = (index: number, key: string, value: string) => {
                            const newShadows = [...shadows];
                            newShadows[index] = { ...newShadows[index], [key]: value };
                            updateShadows(newShadows);
                        };

                        return (
                            <>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className={labelClass.replace(" mb-1.5", "")}>Text shadow</label>
                                    <button onClick={addShadow} className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded p-1 transition-colors">
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {shadows.length > 0 && (
                                    <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                                        {shadows.map((shadow, index) => {
                                            const isActive = activeShadowLayer === index;
                                            return (
                                                <div key={index} className="flex flex-col border-b border-slate-200 last:border-b-0">
                                                    <div
                                                        className={`flex items-center justify-between p-2.5 ${isActive ? 'bg-slate-50 border-b border-slate-200' : 'bg-white'}`}
                                                    >
                                                        <div
                                                            className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 flex-1"
                                                            onClick={() => setActiveShadowLayer(isActive ? null : index)}
                                                        >
                                                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold text-slate-550 ${isActive ? 'bg-white border border-slate-200' : 'bg-slate-100'}`}>✛</span>
                                                            <span className={`text-xs font-semibold ${isActive ? 'text-violet-700' : ''}`}>Layer {index + 1}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-4 h-4 border border-slate-200 rounded-[3px] flex items-center justify-center font-semibold text-slate-700 text-xs" style={{ backgroundColor: shadow.color, color: 'transparent' }}>.</div>
                                                            <button onClick={() => removeShadow(index)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {isActive && (
                                                        <div className="p-3 grid grid-cols-2 gap-x-3 gap-y-4 bg-slate-50">
                                                            <div className="flex flex-col">
                                                                <label className={labelClass}>X position</label>
                                                                {(() => {
                                                                    const { val, unit } = parseUnit(shadow.x, "px");
                                                                    return (
                                                                        <UnitInput
                                                                            value={val}
                                                                            onChangeValue={(v) => updateLayer(index, "x", `${v}${unit}`)}
                                                                            units={["px", "em"]}
                                                                            unit={unit}
                                                                            onChangeUnit={(u) => updateLayer(index, "x", `${val}${u}`)}
                                                                        />
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className={labelClass}>Y position</label>
                                                                {(() => {
                                                                    const { val, unit } = parseUnit(shadow.y, "px");
                                                                    return (
                                                                        <UnitInput
                                                                            value={val}
                                                                            onChangeValue={(v) => updateLayer(index, "y", `${v}${unit}`)}
                                                                            units={["px", "em"]}
                                                                            unit={unit}
                                                                            onChangeUnit={(u) => updateLayer(index, "y", `${val}${u}`)}
                                                                        />
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className={labelClass}>Blur</label>
                                                                {(() => {
                                                                    const { val, unit } = parseUnit(shadow.blur, "px");
                                                                    return (
                                                                        <UnitInput
                                                                            value={val}
                                                                            onChangeValue={(v) => updateLayer(index, "blur", `${v}${unit}`)}
                                                                            units={["px", "em"]}
                                                                            unit={unit}
                                                                            onChangeUnit={(u) => updateLayer(index, "blur", `${val}${u}`)}
                                                                        />
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className={labelClass}>Color</label>
                                                                <ColorInput
                                                                    value={shadow.color}
                                                                    onChange={(v) => updateLayer(index, "color", v)}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </Accordion>

            {/* Decorations Section */}
            <Accordion title="Decorations" defaultExpanded={false}>
                <div className="grid grid-cols-1 gap-y-4 pt-1">
                    <div className="flex flex-col">
                        <label className={labelClass}>Background Color</label>
                        <ColorInput
                            value={selectedProps.backgroundColor || ""}
                            onChange={(val) => handleStyleChange("backgroundColor", val)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className={labelClass}>Container Background</label>
                        <ColorInput
                            value={selectedProps.containerBackgroundColor || ""}
                            onChange={(val) => handleStyleChange("containerBackgroundColor", val)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className={labelClass}>Inner Background</label>
                        <ColorInput
                            value={selectedProps.innerBackgroundColor || ""}
                            onChange={(val) => handleStyleChange("innerBackgroundColor", val)}
                        />
                    </div>
                </div>
            </Accordion>

            {/* Space Section */}
            <Accordion title="Space" defaultExpanded={false}>
                <div className="flex flex-col gap-4 pt-1">
                    <label className={labelClass}>Padding</label>

                    {/* Visual Padding Box */}
                    <div className="relative w-full max-w-[220px] aspect-[4/3] mx-auto bg-slate-100 border border-slate-200 rounded-lg p-2 mt-4">
                        {/* Top Input */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-20">
                            <span className="text-xs text-slate-400 font-semibold block text-center mb-0.5">Top</span>
                            {(() => {
                                const { val, unit } = parseUnit(selectedProps.paddingTop, "px");
                                return (
                                    <UnitInput
                                        value={val}
                                        onChangeValue={(v) => handleUnitChange("paddingTop", v, unit)}
                                        units={["px", "%", "em"]}
                                        unit={unit}
                                        onChangeUnit={(u) => handleStyleChange("paddingTop", `${val}${u}`)}
                                    />
                                );
                            })()}
                        </div>

                        {/* Bottom Input */}
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-20">
                            <span className="text-xs text-slate-400 font-semibold block text-center mb-0.5">Bottom</span>
                            {(() => {
                                const { val, unit } = parseUnit(selectedProps.paddingBottom, "px");
                                return (
                                    <UnitInput
                                        value={val}
                                        onChangeValue={(v) => handleUnitChange("paddingBottom", v, unit)}
                                        units={["px", "%", "em"]}
                                        unit={unit}
                                        onChangeUnit={(u) => handleStyleChange("paddingBottom", `${val}${u}`)}
                                    />
                                );
                            })()}
                        </div>

                        {/* Left Input */}
                        <div className="absolute top-1/2 -left-12 -translate-y-1/2 w-20">
                            <span className="text-xs text-slate-400 font-semibold block text-center mb-0.5">Left</span>
                            {(() => {
                                const { val, unit } = parseUnit(selectedProps.paddingLeft, "px");
                                return (
                                    <UnitInput
                                        value={val}
                                        onChangeValue={(v) => handleUnitChange("paddingLeft", v, unit)}
                                        units={["px", "%", "em"]}
                                        unit={unit}
                                        onChangeUnit={(u) => handleStyleChange("paddingLeft", `${val}${u}`)}
                                    />
                                );
                            })()}
                        </div>

                        {/* Right Input */}
                        <div className="absolute top-1/2 -right-12 -translate-y-1/2 w-20">
                            <span className="text-xs text-slate-400 font-semibold block text-center mb-0.5">Right</span>
                            {(() => {
                                const { val, unit } = parseUnit(selectedProps.paddingRight, "px");
                                return (
                                    <UnitInput
                                        value={val}
                                        onChangeValue={(v) => handleUnitChange("paddingRight", v, unit)}
                                        units={["px", "%", "em"]}
                                        unit={unit}
                                        onChangeUnit={(u) => handleStyleChange("paddingRight", `${val}${u}`)}
                                    />
                                );
                            })()}
                        </div>

                        {/* Center Box Visualization */}
                        <div className="w-full h-full bg-white border border-dashed border-slate-300 rounded flex items-center justify-center">
                            <span className="text-slate-300 text-xs font-medium">Content</span>
                        </div>
                    </div>
                    <div className="h-6"></div>
                </div>
            </Accordion>

            {/* Borders Section */}
            <Accordion title="Borders" defaultExpanded={false}>
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-1">
                    <div className="flex flex-col col-span-2">
                        <label className={labelClass}>Border Radius</label>
                        {(() => {
                            const { val, unit } = parseUnit(selectedProps.borderRadius, "px");
                            return (
                                <UnitInput
                                    value={val}
                                    onChangeValue={(v) => handleUnitChange("borderRadius", v, unit)}
                                    units={["px", "%", "rem"]}
                                    unit={unit}
                                    onChangeUnit={(u) => handleStyleChange("borderRadius", `${val}${u}`)}
                                />
                            );
                        })()}
                    </div>

                    <div className="flex flex-col">
                        <label className={labelClass}>Width</label>
                        {(() => {
                            const { val, unit } = parseUnit(selectedProps.borderWidth, "px");
                            return (
                                <UnitInput
                                    value={val}
                                    onChangeValue={(v) => handleUnitChange("borderWidth", v, unit)}
                                    units={["px", "em", "rem"]}
                                    unit={unit}
                                    onChangeUnit={(u) => handleStyleChange("borderWidth", `${val}${u}`)}
                                />
                            );
                        })()}
                    </div>
                    <div className="flex flex-col">
                        <label className={labelClass}>Style</label>
                        <DesignSelect
                            value={selectedProps.borderStyle || "solid"}
                            onChange={(e) => handleStyleChange("borderStyle", e.target.value)}
                            options={[
                                { label: "Solid", value: "solid" },
                                { label: "Dashed", value: "dashed" },
                                { label: "Dotted", value: "dotted" },
                                { label: "Double", value: "double" },
                                { label: "None", value: "none" },
                            ]}
                        />
                    </div>
                    <div className="flex flex-col col-span-2">
                        <label className={labelClass}>Color</label>
                        <ColorInput
                            value={selectedProps.borderColor || "#000000"}
                            onChange={(val) => handleStyleChange("borderColor", val)}
                        />
                    </div>
                </div>
            </Accordion>
        </div>
    );
}
