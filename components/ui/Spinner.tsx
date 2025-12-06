import React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Spinner({ className, ...props }: SpinnerProps) {
    return (
        <div
            className={cn(
                "w-12 h-12 border-[5px] border-[color-mix(in_srgb,var(--glass-bg)_50%,transparent)] border-t-[var(--accent-color)] rounded-[var(--radius-full)] animate-spin",
                className
            )}
            {...props}
        />
    );
}
