import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface ColorInputProps {
    value: string;
    onChange: (val: string) => void;
    className?: string;
}

export function ColorInput({ value, onChange, className }: ColorInputProps) {
    return (
        <div className={cn("flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden h-9 px-1.5", className)}>
            <input
                type="text"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 bg-transparent text-slate-600 text-xs px-1 h-full outline-none min-w-0"
                placeholder="none"
            />
            <div className="w-7 h-7 rounded-md shrink-0 overflow-hidden relative cursor-pointer border border-slate-300">
                <input
                    type="color"
                    value={value || "#ffffff"}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                />
            </div>
        </div>
    );
}
