import { TextareaHTMLAttributes, forwardRef, useEffect, useRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    autoResize?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    ({ className, autoResize = false, onChange, ...props }, ref) => {
        const internalRef = useRef<HTMLTextAreaElement | null>(null);

        const setRefs = (element: HTMLTextAreaElement) => {
            internalRef.current = element;
            if (typeof ref === "function") {
                ref(element);
            } else if (ref) {
                (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = element;
            }
        };

        const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            if (autoResize && internalRef.current) {
                internalRef.current.style.height = "auto";
                internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
            }
            if (onChange) onChange(e);
        };

        useEffect(() => {
            if (autoResize && internalRef.current && internalRef.current.value) {
                internalRef.current.style.height = "auto";
                internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
            }
        }, [autoResize]);

        return (
            <textarea
                ref={setRefs}
                onChange={handleInput}
                className={cn(
                    "flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:border-violet-300 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm min-h-[80px]",
                    className
                )}
                {...props}
            />
        );
    }
);
TextArea.displayName = "TextArea";

export { TextArea };
