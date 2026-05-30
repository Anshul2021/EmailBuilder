import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown } from "lucide-react";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface DesignSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    options: { label: string; value: string }[];
}

export function DesignSelect({ options, className, ...props }: DesignSelectProps) {
    return (
        <div className="relative h-9 rounded-lg">
            <select
                className={cn(
                    "w-full h-full appearance-none bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 pr-6 outline-none hover:border-slate-300 focus:border-violet-400 transition-all cursor-pointer font-medium",
                    className
                )}
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-white text-slate-700 font-medium">
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
            </div>
        </div>
    );
}
