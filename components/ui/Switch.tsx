"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    id?: string;
}

export function Switch({ checked, onChange, className, id }: SwitchProps) {
    return (
        <div
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-color)]",
                checked ? "bg-[var(--accent-color)]" : "bg-[var(--text-color-secondary)]/30",
                className
            )}
            onClick={() => onChange(!checked)}
            role="switch"
            aria-checked={checked}
            id={id}
        >
            <span className="sr-only">Use setting</span>
            <span
                aria-hidden="true"
                className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </div>
    );
}
