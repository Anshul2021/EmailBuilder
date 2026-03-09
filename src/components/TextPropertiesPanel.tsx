"use client";

import { PanelRight, Type, PencilLine, ImageIcon, X } from "lucide-react";
import { RichTextEditor } from "./UI/RichTextEditor";

export interface TextProperties {
    fontSize: number;
    fontWeight: "normal" | "bold";
    color: string;
    align: "left" | "center" | "right";
    fontFamily: string;
    content: string;
    elementTag: string;
}

interface TextPropertiesPanelProps {
    hasSelection: boolean;
    selectedProps: TextProperties;
    onContentChange: (content: string | null) => void;
    onApplyStyle: (prop: Partial<TextProperties>) => void;
    onEnableTextEdit: () => void;
    onClose: () => void;
    style?: React.CSSProperties;
}

export function TextPropertiesPanel({
    hasSelection,
    selectedProps,
    onContentChange,
    onApplyStyle,
    onEnableTextEdit,
    onClose,
    style,
}: TextPropertiesPanelProps) {
    return (
        <div className="w-full h-full flex flex-col bg-white" style={style}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <PanelRight className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-bold text-slate-800">Properties</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                    title="Close panel"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className="text-xs text-slate-400 px-4 pt-1.5 pb-0 shrink-0">Click text or images in the preview</p>

            {!hasSelection ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Type className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-600 mb-1">Nothing selected</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            Click any text to edit its style, or click an image to replace it
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full mt-2">
                        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                            <Type className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                            <span className="text-[11px] text-slate-500">Click text → edit font, size &amp; color</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                            <ImageIcon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                            <span className="text-[11px] text-slate-500">Click image → replace with yours</span>
                        </div>
                    </div>
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
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Content
                            </label>
                            <button
                                onClick={onEnableTextEdit}
                                className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-700 px-1.5 py-0.5 bg-violet-50 rounded transition-colors"
                            >
                                <PencilLine className="w-3 h-3" />
                                Edit inline
                            </button>
                        </div>
                        <RichTextEditor
                            value={selectedProps.content}
                            onChange={onContentChange}
                            placeholder="Write your email copy here..."
                        />
                    </div>

                    {/* Text Color */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                            Color
                        </label>
                        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <div className="w-8 h-8 rounded-lg border border-slate-300 overflow-hidden shrink-0">
                                <input
                                    type="color"
                                    value={selectedProps.color}
                                    onChange={(e) => onApplyStyle({ color: e.target.value })}
                                    className="w-12 h-12 -m-2 cursor-pointer border-0 p-0"
                                />
                            </div>
                            <span className="text-xs font-mono text-slate-600">{selectedProps.color}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
