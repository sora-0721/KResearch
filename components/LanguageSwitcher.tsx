
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contextx/LanguageContext';
import GlassCard from './GlassCard';

const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
];

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selectedLanguage = languages.find(l => l.code === language) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageSelect = (langCode: string) => {
        setLanguage(langCode);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-2 rounded-full cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title={t('changeLanguage')}
            >
                <span className="text-xl select-none">{selectedLanguage.flag}</span>
                <span className="sr-only">{t('changeLanguage')}</span>
            </button>

            <div
                className={`absolute top-full right-0 mt-2 z-50 origin-top-right ease-out duration-200 ${
                    isOpen
                        ? 'scale-100 opacity-100 transition-transform'
                        : 'scale-95 opacity-0 pointer-events-none transition-all'
                }`}
            >
                <GlassCard className="p-2 w-40">
                    <ul className="space-y-1">
                        {languages.map(lang => (
                            <li key={lang.code}>
                                <button
                                    onClick={() => handleLanguageSelect(lang.code)}
                                    className={`w-full flex items-center gap-3 text-left px-3 py-1.5 rounded-2xl text-sm transition-colors ${
                                        language === lang.code
                                            ? 'bg-glow-light/20 dark:bg-glow-dark/30 font-semibold'
                                            : 'hover:bg-black/10 dark:hover:bg-white/10'
                                    }`}
                                >
                                    <span className="text-lg select-none">{lang.flag}</span>
                                    <span>{lang.name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </GlassCard>
            </div>
        </div>
    );
};

export default LanguageSwitcher;