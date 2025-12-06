import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "primary" | "secondary";
}

export function Badge({ className, variant = "primary", ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-[var(--radius-full)]",
                variant === "primary"
                    ? "bg-[var(--accent-color)] text-white"
                    : "bg-[var(--glass-bg)] text-[var(--text-color)] border border-[var(--glass-border)]",
                className
            )}
            {...props}
        />
    );
}
