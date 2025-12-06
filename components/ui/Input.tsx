import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export function Input({ className, ...props }: InputProps) {
    return (
        <input
            className={cn(
                "w-full bg-[var(--glass-bg)] backdrop-blur-[10px] backdrop-saturate-[150%] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] px-4 py-3 text-base text-[var(--text-color)] transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] focus:outline-none focus:border-[var(--accent-color)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-color)_30%,transparent)] placeholder:text-[var(--text-color-secondary)]",
                className
            )}
            {...props}
        />
    );
}
