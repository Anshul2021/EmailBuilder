import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronUp, ChevronDown } from "lucide-react";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface UnitInputProps {
    value: string | number;
    unit?: string;
    onChangeValue: (val: string | number) => void;
    onChangeUnit?: (unit: string) => void;
    units?: string[];
    className?: string;
}

export function UnitInput({ value, unit = "px", onChangeValue, onChangeUnit, units = ["px", "em", "rem", "%", "vw", "vh"], className }: UnitInputProps) {
    const handleUp = () => {
        const num = parseFloat(value.toString()) || 0;
        onChangeValue(num + 1);
    };

    const handleDown = () => {
        const num = parseFloat(value.toString()) || 0;
        onChangeValue(num - 1);
    };

    return (
        <div className={cn("flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden h-7", className)}>
            <input
                type="text"
                value={value !== undefined ? value : ""}
                onChange={(e) => onChangeValue(e.target.value)}
                className="flex-1 bg-transparent text-slate-600 text-xs px-1 ml-0.5 h-full outline-none w-full min-w-0"
            />
            {onChangeUnit ? (
                <select
                    value={unit}
                    onChange={(e) => onChangeUnit(e.target.value)}
                    className="bg-transparent text-slate-500 text-xs px-1 h-full outline-none border-l border-slate-200 appearance-none cursor-pointer hover:bg-slate-100 font-medium text-center transition-colors"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                >
                    {units.map(u => <option key={u} value={u} className="bg-white text-slate-600">{u}</option>)}
                </select>
            ) : (
                <div className="text-xs text-slate-400 font-medium px-1.5 h-full flex items-center border-l border-slate-200 bg-slate-100/50">
                    {unit}
                </div>
            )}
            <div className="flex flex-col border-l border-slate-200 h-full">
                <button onClick={handleUp} className="flex-1 px-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center min-h-0 transition-colors">
                    <ChevronUp className="w-3 h-3" />
                </button>
                <div className="h-[1px] bg-slate-200 w-full shrink-0" />
                <button onClick={handleDown} className="flex-1 px-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center min-h-0 transition-colors">
                    <ChevronDown className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
