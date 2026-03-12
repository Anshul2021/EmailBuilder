import React, { useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronRight, ChevronDown } from "lucide-react";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface AccordionProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    className?: string;
}

export function Accordion({ title, children, defaultExpanded = false, className }: AccordionProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div className={cn("border-b border-slate-200", className)}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center w-full py-2.5 px-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-700 hover:bg-slate-50 transition-colors"
                title={title}
            >
                {expanded ? (
                    <ChevronDown className="w-3.5 h-3.5 mr-2 text-slate-400" />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5 mr-2 text-slate-400" />
                )}
                {title}
            </button>
            {expanded && (
                <div className="px-3 pb-4 pt-1">
                    {children}
                </div>
            )}
        </div>
    );
}
