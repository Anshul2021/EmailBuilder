import React, { SelectHTMLAttributes, forwardRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown } from "lucide-react";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface SelectOption {
    label: string;
    value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    options: SelectOption[];
    label?: string;
    containerClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, options, label, containerClassName, ...props }, ref) => {
        return (
            <div className={cn("relative flex flex-col gap-1", containerClassName)}>
                {label && (
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-0.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={cn(
                            "appearance-none w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all cursor-pointer hover:border-slate-300 shadow-card font-medium",
                            className
                        )}
                        {...props}
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        );
    }
);

Select.displayName = "Select";

export { Select };
