"use client";

import { useLanguage } from "./LanguageContext";

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="theme-switcher">
            <button
                onClick={() => setLanguage("en")}
                className={language === "en" ? "active" : ""}
                aria-label="English"
            >
                EN
            </button>
            <button
                onClick={() => setLanguage("zh")}
                className={language === "zh" ? "active" : ""}
                aria-label="中文"
            >
                中
            </button>
        </div>
    );
}
