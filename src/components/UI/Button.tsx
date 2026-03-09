import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg" | "icon";
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "primary",
            size = "md",
            isLoading = false,
            leftIcon,
            rightIcon,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        const baseStyles = "inline-flex items-center justify-center rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50";

        const variants = {
            primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-500/20 active:scale-[0.98]",
            secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.98]",
            outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-card active:scale-[0.98]",
            ghost: "hover:bg-slate-100 text-slate-600 hover:text-slate-900 active:scale-[0.98]",
            danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/20 active:scale-[0.98]",
        };

        const sizes = {
            sm: "h-8 px-3 text-xs",
            md: "h-9 px-4 text-sm",
            lg: "h-11 px-8 text-base",
            icon: "h-9 w-9",
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
                {children}
                {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button };
