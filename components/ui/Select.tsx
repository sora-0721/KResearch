"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function Select({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className,
    disabled = false,
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const portalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number; width: number; transformOrigin: string } | null>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        const updatePosition = () => {
            if (containerRef.current && isOpen) {
                const rect = containerRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const spaceBelow = viewportHeight - rect.bottom;
                const requiredHeight = Math.min(options.length * 36 + 10, 240); // Estimate height (max 240px)

                let top = rect.bottom + window.scrollY + 8;
                let left = rect.left + window.scrollX;
                let transformOrigin = "top";

                // Flip up if not enough space below
                if (spaceBelow < requiredHeight && rect.top > requiredHeight) {
                    top = rect.top + window.scrollY - 8;
                    // We will use CSS translate-y-full logic or just positioning logic in render
                    // but since we are using absolute positioning in a portal,
                    // we need to set the 'bottom' of the dropdown to 'top' of the trigger.
                    // However, calculating 'top' is easier.
                    // Let's position the `top` of the dropdown at the `top` of the trigger,
                    // and then use `translate-y-[-100%]` in CSS style to move it up.
                    transformOrigin = "bottom";
                }

                setPosition({
                    top,
                    left,
                    width: rect.width,
                    transformOrigin
                });
            }
        };

        if (isOpen) {
            updatePosition();
            window.addEventListener("resize", updatePosition);
            window.addEventListener("scroll", updatePosition, true);
        }

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [isOpen, options.length]);

    // Handle clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // Check if click is inside trigger OR inside portal
            const isInsideContainer = containerRef.current?.contains(target);
            const isInsidePortal = portalRef.current?.contains(target);

            if (!isInsideContainer && !isInsidePortal) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleSelect = (newValue: string) => {
        onChange(newValue);
        setIsOpen(false);
    };

    return (
        <>
            <div
                ref={containerRef}
                className={cn("relative w-full", className)}
            >
                <div
                    className={cn(
                        "select-custom flex items-center justify-between cursor-pointer bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-[var(--radius-2xl)] px-4 py-3 transition-all duration-200",
                        isOpen && "ring-2 ring-[var(--accent-color)] border-transparent",
                        disabled && "opacity-50 cursor-not-allowed",
                        "hover:bg-[var(--glass-bg-hover)]"
                    )}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                >
                    <span className={cn("text-sm text-[var(--text-color)] truncate", !selectedOption && "text-[var(--text-color-secondary)]")}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <svg
                        className={cn(
                            "w-4 h-4 text-[var(--text-color-secondary)] transition-transform duration-200",
                            isOpen && "rotate-180"
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </div>
            </div>

            {isOpen && position && createPortal(
                <div
                    ref={portalRef}
                    className={cn(
                        "fixed z-[9999] bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-2xl max-h-60 overflow-y-auto animate-fade-in p-1",
                        position.transformOrigin === "bottom" && "-translate-y-full"
                    )}
                    style={{
                        top: position.top,
                        left: position.left,
                        width: position.width,
                    }}
                >
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={cn(
                                "px-4 py-2 text-sm cursor-pointer rounded-[var(--radius-2xl)] transition-colors duration-150",
                                option.value === value
                                    ? "bg-[var(--accent-color)] text-white font-medium"
                                    : "text-[var(--text-color)] hover:bg-black/5 dark:hover:bg-white/10"
                            )}
                            onClick={() => handleSelect(option.value)}
                            role="option"
                            aria-selected={option.value === value}
                        >
                            {option.label}
                        </div>
                    ))}
                    {options.length === 0 && (
                        <div className="px-4 py-2 text-sm text-[var(--text-color-secondary)] text-center">
                            No options
                        </div>
                    )}
                </div>,
                document.body
            )}
        </>
    );
}
