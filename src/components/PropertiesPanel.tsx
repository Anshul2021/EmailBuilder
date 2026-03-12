"use client";

import { useState } from "react";
import { Type, PencilLine, ImageIcon, X, Maximize2, CornerUpRight, Trash2, Upload, Layers, SlidersHorizontal } from "lucide-react";
import { RichTextEditor } from "./UI/RichTextEditor";
import { Tooltip } from "./UI/Tooltip";
import { LayerPanel, SectionEditState } from "./LayerPanel";
import type { MjmlNode } from "@/lib/mjmlTree";

export interface ElementProperties {
    // Text props
    fontSize: number;
    fontWeight: "normal" | "bold";
    color: string;
    backgroundColor: string;
    align: "left" | "center" | "right";
    fontFamily: string;
    content: string;
    elementTag: string;
    
    // Image props
    isImage?: boolean;
    width?: number;
    borderRadius?: number;
    src?: string;
}

type PanelMode = "layers" | "properties";

interface PropertiesPanelProps {
    hasSelection: boolean;
    selectedProps: ElementProperties;
    onContentChange: (content: string | null) => void;
    onApplyStyle: (prop: Partial<ElementProperties>) => void;
    onEnableTextEdit: () => void;
    onReplaceImage: () => void;
    onClose: () => void;
    style?: React.CSSProperties;
    // Layer panel props
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

export function PropertiesPanel({
    hasSelection,
    selectedProps,
    onContentChange,
    onApplyStyle,
    onEnableTextEdit,
    onReplaceImage,
    onClose,
    style,
    // Layer props
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

    return (
        <div className="w-full h-full flex flex-col bg-white" style={style}>
            {/* Header with tabs */}
            <div className="shrink-0 border-b border-slate-100">
                <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setMode("layers")}
                            className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md transition-all ${
                                mode === "layers"
                                    ? "bg-white text-violet-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            Layers
                        </button>
                        <button
                            onClick={() => setMode("properties")}
                            className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md transition-all ${
                                mode === "properties"
                                    ? "bg-white text-violet-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Properties
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                        title="Close panel"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ── Layer Mode ── */}
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

            {/* ── Property Mode ── */}
            {mode === "properties" && (
                <>
                    <p className="text-xs text-slate-400 px-4 pt-2 pb-0 shrink-0">
                        {selectedProps.isImage ? "Refine your visual elements" : "Click text or images in the preview"}
                    </p>

                    {!hasSelection ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                                <Type className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-600 mb-1">Nothing selected</p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Click any text to edit its style, or click an image to resize and replace it
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 w-full mt-2">
                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                    <Type className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                    <span className="text-[11px] text-slate-500">Click text → edit font, size &amp; color</span>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                    <ImageIcon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                    <span className="text-[11px] text-slate-500">Click image → resize &amp; replace</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Element info */}
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                    {selectedProps.isImage ? (
                                        <ImageIcon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                    ) : (
                                        <Type className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                    )}
                                    <span className="text-xs font-medium text-slate-500">
                                        {selectedProps.isImage ? "Selected Image" : `<${selectedProps.elementTag}> Element`}
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100 shadow-sm">
                                    {selectedProps.elementTag}
                                </span>
                            </div>

                            {!selectedProps.isImage ? (
                                <>
                                    {/* Text Content editing */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Content
                                            </label>
                                            <Tooltip content="Edit directly in preview">
                                                <button
                                                    onClick={onEnableTextEdit}
                                                    className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-700 px-1.5 py-0.5 bg-violet-50 rounded transition-colors"
                                                >
                                                    <PencilLine className="w-3 h-3" />
                                                    Live Edit
                                                </button>
                                            </Tooltip>
                                        </div>
                                        <RichTextEditor
                                            value={selectedProps.content}
                                            onChange={onContentChange}
                                            placeholder="Write your email copy here..."
                                        />
                                    </div>

                                    {/* Text Style Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                                                Font Size
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="range"
                                                    min="8"
                                                    max="72"
                                                    value={selectedProps.fontSize}
                                                    onChange={(e) => onApplyStyle({ fontSize: parseInt(e.target.value) })}
                                                    className="flex-1 accent-violet-600"
                                                />
                                                <span className="text-xs font-mono text-slate-600 w-8">{selectedProps.fontSize}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                                                Text Color
                                            </label>
                                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                                                <div className="w-6 h-6 rounded border border-slate-300 overflow-hidden shrink-0">
                                                    <input
                                                        type="color"
                                                        value={selectedProps.color}
                                                        onChange={(e) => onApplyStyle({ color: e.target.value })}
                                                        className="w-10 h-10 -m-2 cursor-pointer border-0 p-0"
                                                    />
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-500 uppercase">{selectedProps.color}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                                                Background
                                            </label>
                                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                                                <div className="w-6 h-6 rounded border border-slate-300 overflow-hidden shrink-0">
                                                    <input
                                                        type="color"
                                                        value={selectedProps.backgroundColor}
                                                        onChange={(e) => onApplyStyle({ backgroundColor: e.target.value })}
                                                        className="w-10 h-10 -m-2 cursor-pointer border-0 p-0 bg-transparent"
                                                    />
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-500 uppercase">{selectedProps.backgroundColor === "#ffffff" ? "None" : selectedProps.backgroundColor}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Image Controls */}
                                    <div className="space-y-6">
                                        {/* Width Slider */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Maximize2 className="w-3 h-3" />
                                                    Width
                                                </label>
                                                <span className="text-xs font-mono text-violet-600 font-bold bg-violet-50 px-1.5 py-0.5 rounded">
                                                    {selectedProps.width}%
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="10"
                                                max="100"
                                                value={selectedProps.width || 100}
                                                onChange={(e) => onApplyStyle({ width: parseInt(e.target.value) })}
                                                className="w-full accent-violet-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                                            />
                                            <div className="flex justify-between mt-1.5">
                                                <span className="text-[9px] text-slate-400">10%</span>
                                                <span className="text-[9px] text-slate-400">100%</span>
                                            </div>
                                        </div>

                                        {/* Border Radius Slider */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <CornerUpRight className="w-3 h-3 rotate-90" />
                                                    Corners
                                                </label>
                                                <span className="text-xs font-mono text-violet-600 font-bold bg-violet-50 px-1.5 py-0.5 rounded">
                                                    {selectedProps.borderRadius || 0}px
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={selectedProps.borderRadius || 0}
                                                onChange={(e) => onApplyStyle({ borderRadius: parseInt(e.target.value) })}
                                                className="w-full accent-violet-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                                            />
                                            <div className="flex justify-between mt-1.5">
                                                <span className="text-[9px] text-slate-400">Sharp</span>
                                                <span className="text-[9px] text-slate-400">Round</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                                                Actions
                                            </label>
                                            <div className="grid grid-cols-1 gap-2">
                                                <button
                                                    onClick={onReplaceImage}
                                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-violet-200"
                                                >
                                                    <Upload className="w-3.5 h-3.5" />
                                                    Replace Image
                                                </button>
                                                <button
                                                    onClick={() => onApplyStyle({ width: 100, borderRadius: 0 })}
                                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 hover:bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Reset Styles
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
