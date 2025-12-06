import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary";
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center px-5 py-3 text-base font-semibold transition-all duration-200 ease-out active:scale-95 active:brightness-95 disabled:opacity-50 disabled:pointer-events-none rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_4px_8px_var(--shadow-color)]",
                variant === "primary"
                    ? "bg-[var(--accent-color)] text-white border-none"
                    : "bg-[var(--glass-bg)] text-[var(--text-color)] border border-[var(--glass-border)]",
                className
            )}
            {...props}
        />
    );
}
