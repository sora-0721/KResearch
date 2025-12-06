import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Card({ className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "glass-panel rounded-[var(--radius-2xl)] p-6 transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1 hover:shadow-[0_8px_24px_var(--shadow-color)]",
                className
            )}
            {...props}
        />
    );
}
