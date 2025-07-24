
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';

// Define the shape of the context
interface LanguageContextType {
    language: string;
    setLanguage: (language: string) => void;
    t: (key: string, options?: { [key: string]: string | number }) => string;
    loading: boolean;
}

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => {},
    t: (key) => key,
    loading: true,
});

// Custom hook for easy consumption
export const useLanguage = () => useContext(LanguageContext);

// The provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<string>(() => {
        try {
            return localStorage.getItem('k-research-lang') || navigator.language.split('-')[0] || 'en';
        } catch {
            return 'en';
        }
    });
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTranslations = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/i18n/${language}.json`);
                 if (!response.ok) {
                    // Try to fetch English as a fallback
                    const fallbackResponse = await fetch(`/i18n/en.json`);
                    if (!fallbackResponse.ok) throw new Error('Failed to load any translations');
                    const data = await fallbackResponse.json();
                    setTranslations(data);
                    setLanguage('en');
                } else {
                    const data = await response.json();
                    setTranslations(data);
                }
            } catch (error) {
                console.error(error);
                setTranslations({}); // No translations available
            } finally {
                setLoading(false);
            }
        };

        fetchTranslations();
    }, [language]);

    const setLanguage = (lang: string) => {
        try {
            localStorage.setItem('k-research-lang', lang);
        } catch (e) {
            console.warn("Could not access localStorage. Language preference will not be saved.");
        }
        setLanguageState(lang);
    };

    const t = useCallback((key: string, options?: { [key: string]: string | number }): string => {
        let translation = translations[key] || key;
        if (options) {
            Object.keys(options).forEach(optionKey => {
                const regex = new RegExp(`{{${optionKey}}}`, 'g');
                translation = translation.replace(regex, String(options[optionKey]));
            });
        }
        return translation;
    }, [translations]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, loading }}>
            {!loading && children}
        </LanguageContext.Provider>
    );
};
