"use client";

import React, { useState, useRef, useEffect } from "react";

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
}

export function Select({ value, onChange, options, placeholder = "Select an option...", className = "" }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<"below" | "above">("below");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Calculate dropdown position
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - triggerRect.bottom;
            const dropdownHeight = Math.min(options.length * 44 + 16, 250); // Estimate height

            if (spaceBelow < dropdownHeight && triggerRect.top > spaceBelow) {
                setDropdownPosition("above");
            } else {
                setDropdownPosition("below");
            }
        }
    }, [isOpen, options.length]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            {/* Trigger */}
            <div
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between cursor-pointer"
                style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(10px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(150%)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-2xl)',
                    padding: '0.75rem 1rem',
                    color: 'var(--text-color)',
                    transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span style={{ color: selectedOption ? 'var(--text-color)' : 'var(--text-color-secondary)' }}>
                    {selectedOption?.label || placeholder}
                </span>
                <svg
                    className="w-4 h-4 transition-transform duration-200"
                    style={{
                        color: 'var(--text-color-secondary)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute left-0 right-0 z-50"
                    style={{
                        [dropdownPosition === "below" ? "top" : "bottom"]: 'calc(100% + 8px)',
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(25px) saturate(180%)',
                        borderRadius: 'var(--radius-2xl)',
                        boxShadow: 'var(--shadow-md)',
                        border: '1px solid var(--glass-border)',
                        padding: '0.5rem',
                        maxHeight: '250px',
                        overflowY: 'auto',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                    role="listbox"
                >
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => handleSelect(option.value)}
                            className="cursor-pointer transition-colors duration-150"
                            style={{
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-2xl)',
                                color: option.value === value ? 'var(--accent-color)' : 'var(--text-color)',
                                fontWeight: option.value === value ? 600 : 400,
                                background: option.value === value
                                    ? 'color-mix(in srgb, var(--accent-color) 15%, transparent)'
                                    : 'transparent'
                            }}
                            onMouseEnter={(e) => {
                                if (option.value !== value) {
                                    e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-color) 10%, transparent)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (option.value !== value) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                            role="option"
                            aria-selected={option.value === value}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
