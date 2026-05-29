import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface ToggleOption {
    value: string;
    icon?: React.ReactNode;
    label?: string;
}

export interface ToggleGroupProps {
    options: ToggleOption[];
    value: string;
    onChange: (val: string) => void;
    className?: string;
}

export function ToggleGroup({ options, value, onChange, className }: ToggleGroupProps) {
    return (
        <div className={cn("flex items-center w-full rounded-lg bg-slate-50 border border-slate-200 overflow-hidden", className)}>
            {options.map((opt, i) => {
                const isActive = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "flex-1 flex items-center justify-center p-1.5 text-xs transition-colors h-7",
                            isActive
                                ? "bg-violet-100 text-violet-700 font-semibold"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
                            i > 0 && "border-l border-slate-200"
                        )}
                        title={opt.label || opt.value}
                    >
                        {opt.icon || opt.label || <span className="text-xs font-semibold">{opt.value.charAt(0)}</span>}
                    </button>
                );
            })}
        </div>
    );
}
