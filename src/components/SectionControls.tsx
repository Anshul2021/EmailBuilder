"use client";

import { Sparkles, Copy, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip } from "./UI/Tooltip";

interface SectionControlsProps {
    position: { top: number; right: number };
    sectionIndex: number;
    totalSections: number;
    onAiEdit: (sectionIndex: number) => void;
    onDuplicate: (sectionIndex: number) => void;
    onDelete: (sectionIndex: number) => void;
    onMoveUp: (sectionIndex: number) => void;
    onMoveDown: (sectionIndex: number) => void;
}

export function SectionControls({
    position,
    sectionIndex,
    totalSections,
    onAiEdit,
    onDuplicate,
    onDelete,
    onMoveUp,
    onMoveDown,
}: SectionControlsProps) {
    const actions = [
        {
            icon: <Sparkles className="w-3.5 h-3.5" />,
            label: "AI Edit",
            onClick: () => onAiEdit(sectionIndex),
            className: "text-violet-600 hover:bg-violet-50 hover:text-violet-700",
        },
        {
            icon: <Copy className="w-3.5 h-3.5" />,
            label: "Duplicate",
            onClick: () => onDuplicate(sectionIndex),
            className: "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
        },
        {
            icon: <ChevronUp className="w-3.5 h-3.5" />,
            label: "Move Up",
            onClick: () => onMoveUp(sectionIndex),
            disabled: sectionIndex === 0,
            className: "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
        },
        {
            icon: <ChevronDown className="w-3.5 h-3.5" />,
            label: "Move Down",
            onClick: () => onMoveDown(sectionIndex),
            disabled: sectionIndex >= totalSections - 1,
            className: "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
        },
        {
            icon: <Trash2 className="w-3.5 h-3.5" />,
            label: "Delete",
            onClick: () => onDelete(sectionIndex),
            disabled: totalSections <= 1,
            className: "text-red-400 hover:bg-red-50 hover:text-red-600",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-[9998] hidden md:flex items-center gap-0.5 bg-white rounded-lg border border-slate-200 shadow-lg px-1.5 py-1"
            style={{ top: position.top, right: position.right }}
        >
            {actions.map((action) => (
                <Tooltip key={action.label} content={action.label}>
                    <button
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className={`p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${action.className}`}
                    >
                        {action.icon}
                    </button>
                </Tooltip>
            ))}

            {/* Section badge */}
            <div className="ml-1 px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none">
                S{sectionIndex + 1}
            </div>
        </motion.div>
    );
}
