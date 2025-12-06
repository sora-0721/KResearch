"use client";

import React, { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeSwitcherProps {
    className?: string;
}

export function ThemeSwitcher({ className = "" }: ThemeSwitcherProps) {
    const [theme, setTheme] = useState<Theme>("system");

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        if (savedTheme) {
            setTheme(savedTheme);
            applyTheme(savedTheme);
        }
    }, []);

    const applyTheme = (newTheme: Theme) => {
        const body = document.body;
        body.classList.remove("light-mode", "dark-mode");

        if (newTheme === "light") {
            body.classList.add("light-mode");
        } else if (newTheme === "dark") {
            body.classList.add("dark-mode");
        }
        // "system" = no class, let CSS handle it
    };

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        applyTheme(newTheme);
    };

    return (
        <div className={`theme-switcher ${className}`}>
            <button
                onClick={() => handleThemeChange("light")}
                className={theme === "light" ? "active" : ""}
                aria-label="Set light theme"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
            </button>
            <button
                onClick={() => handleThemeChange("dark")}
                className={theme === "dark" ? "active" : ""}
                aria-label="Set dark theme"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
            </button>
            <button
                onClick={() => handleThemeChange("system")}
                className={theme === "system" ? "active" : ""}
                aria-label="Set system theme"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
            </button>
        </div>
    );
}
