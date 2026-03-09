import { useState, useRef, ReactNode } from "react";
import { clsx } from "clsx";

interface TooltipProps {
    content: string;
    children: ReactNode;
    position?: "top" | "bottom" | "left" | "right";
    className?: string;
}

export function Tooltip({ content, children, position = "top", className }: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const positionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
        left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
        right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
    };

    return (
        <div
            ref={ref}
            className={clsx("relative inline-flex", className)}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {children}
            {visible && (
                <div
                    className={clsx(
                        "absolute z-50 pointer-events-none animate-fade-in",
                        positionClasses[position]
                    )}
                >
                    <div className="bg-slate-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
}
