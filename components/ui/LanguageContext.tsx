"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Language, TranslationKey, getTranslation } from "@/lib/translations";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectSystemLanguage(): Language {
    if (typeof window === "undefined") return "en";
    const browserLang = navigator.language || (navigator as any).userLanguage || "en";
    return browserLang.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("en");

    useEffect(() => {
        const stored = localStorage.getItem("kresearch_language") as Language | null;
        if (stored && (stored === "en" || stored === "zh")) {
            setLanguageState(stored);
        } else {
            setLanguageState(detectSystemLanguage());
        }
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("kresearch_language", lang);
    }, []);

    const t = useCallback((key: TranslationKey): string => {
        return getTranslation(language, key);
    }, [language]);

    const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextType {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}

