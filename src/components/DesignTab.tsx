import React from "react";
import { Accordion } from "./UI/Accordion";
import { ToggleGroup } from "./UI/ToggleGroup";
import { ColorInput } from "./UI/ColorInput";
import { UnitInput } from "./UI/UnitInput";
import { DesignSelect } from "./UI/DesignSelect";
import { ElementProperties } from "./PropertiesPanel";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Underline, Strikethrough, Italic, Plus, X } from "lucide-react";

interface DesignTabProps {
    hasSelection: boolean;
    selectedProps: ElementProperties;
    onApplyStyle: (prop: Partial<ElementProperties>) => void;
}

export function DesignTab({ hasSelection, selectedProps, onApplyStyle }: DesignTabProps) {
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

    const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5";

    return (
        <div className="flex-1 overflow-y-auto bg-white flex flex-col custom-scrollbar pb-10">
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
                                    <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden shadow-sm">
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
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold text-slate-500 shadow-sm ${isActive ? 'bg-white border border-slate-200' : 'bg-slate-100'}`}>✛</span>
                                                            <span className={`text-[11px] font-semibold ${isActive ? 'text-violet-700' : ''}`}>Layer {index + 1}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-4 h-4 shadow-sm border border-slate-200 rounded-[3px] flex items-center justify-center font-bold text-slate-700 text-[9px]" style={{ backgroundColor: shadow.color, color: 'transparent' }}>.</div>
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
                            <span className="text-[9px] text-slate-400 font-bold block text-center mb-0.5">TOP</span>
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
                            <span className="text-[9px] text-slate-400 font-bold block text-center mb-0.5">BOTTOM</span>
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
                            <span className="text-[9px] text-slate-400 font-bold block text-center mb-0.5">LEFT</span>
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
                            <span className="text-[9px] text-slate-400 font-bold block text-center mb-0.5">RIGHT</span>
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
