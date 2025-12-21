"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ApiKeyEntry, ProviderType } from "@/types/research";
import { useLanguage } from "@/components/ui/LanguageContext";

interface ApiKeySectionProps {
    // Active provider selection
    activeProvider: ProviderType;
    setActiveProvider: (provider: ProviderType) => void;
    // Legacy single API key (backward compatibility)
    apiKey: string;
    setApiKey: (val: string) => void;
    // Multi-API key support
    geminiApiKeys: ApiKeyEntry[];
    addGeminiApiKey: () => void;
    removeGeminiApiKey: (id: string) => void;
    updateGeminiApiKey: (id: string, key: string) => void;
    // Gemini base URL
    geminiBaseUrl: string;
    setGeminiBaseUrl: (val: string) => void;
    // OpenAI settings
    openaiApiKey: string;
    setOpenaiApiKey: (val: string) => void;
    openaiApiHost: string;
    setOpenaiApiHost: (val: string) => void;
}

export function ApiKeySection({
    activeProvider, setActiveProvider,
    apiKey, setApiKey,
    geminiApiKeys, addGeminiApiKey, removeGeminiApiKey, updateGeminiApiKey,
    geminiBaseUrl, setGeminiBaseUrl,
    openaiApiKey, setOpenaiApiKey,
    openaiApiHost, setOpenaiApiHost
}: ApiKeySectionProps) {
    const { t } = useLanguage();
    const hasMultipleKeys = geminiApiKeys.length > 0;

    return (
        <div className="space-y-4">
            {/* Provider Toggle Buttons */}
            <div className="form-group">
                <label>{t('apiProvider')}</label>
                <div className="flex gap-2 mt-2">
                    <Button
                        variant={activeProvider === "gemini" ? "primary" : "secondary"}
                        onClick={() => setActiveProvider("gemini")}
                        className="flex-1"
                    >
                        {t('gemini')}
                    </Button>
                    <Button
                        variant={activeProvider === "openai" ? "primary" : "secondary"}
                        onClick={() => setActiveProvider("openai")}
                        className="flex-1"
                    >
                        {t('openai')}
                    </Button>
                </div>
            </div>

            {/* Gemini Configuration */}
            <div
                className={`space-y-4 transition-all duration-300 ${activeProvider !== "gemini" ? "opacity-40 pointer-events-none" : ""}`}
                style={{
                    filter: activeProvider !== "gemini" ? "grayscale(0.5)" : "none"
                }}
            >
                <div className="form-group">
                    <div className="flex justify-between items-center mb-2">
                        <label className="flex items-center gap-2">
                            {t('geminiApiKeys')}
                            {activeProvider !== "gemini" && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                                    background: 'var(--secondary-color)',
                                    color: 'var(--text-color-secondary)'
                                }}>
                                    {t('blocked') || 'Blocked'}
                                </span>
                            )}
                        </label>
                        <Button
                            variant="secondary"
                            onClick={addGeminiApiKey}
                            className="!px-3 !py-1 !text-sm"
                            disabled={activeProvider !== "gemini"}
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('addKey')}
                        </Button>
                    </div>

                    {/* Legacy single key input (shown when no multi-keys exist) */}
                    {!hasMultipleKeys && (
                        <div className="mb-2">
                            <Input
                                type="password"
                                placeholder="Enter your Gemini API Key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                disabled={activeProvider !== "gemini"}
                            />
                            <p className="text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>
                                {t('getKeyFrom')}{" "}
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                    style={{ color: 'var(--accent-color)' }}
                                >
                                    {t('googleAiStudio')}
                                </a>
                            </p>
                        </div>
                    )}

                    {/* Multi-API key list */}
                    {geminiApiKeys.map((entry, index) => (
                        <div key={entry.id} className="flex gap-2 mb-2 items-center">
                            <div className="flex-1">
                                <Input
                                    type="password"
                                    placeholder={`API Key ${index + 1}`}
                                    value={entry.key}
                                    onChange={(e) => updateGeminiApiKey(entry.id, e.target.value)}
                                    disabled={activeProvider !== "gemini"}
                                />
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() => removeGeminiApiKey(entry.id)}
                                className="!p-2 !rounded-full !w-8 !h-8 flex-shrink-0"
                                disabled={activeProvider !== "gemini"}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </Button>
                        </div>
                    ))}

                    {hasMultipleKeys && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>
                            {t('apiKeysRotate')}
                        </p>
                    )}
                </div>

                {/* Gemini Base URL */}
                <div className="form-group">
                    <label>{t('baseUrlOptional')}</label>
                    <Input
                        type="text"
                        placeholder="https://generativelanguage.googleapis.com"
                        value={geminiBaseUrl}
                        onChange={(e) => setGeminiBaseUrl(e.target.value)}
                        disabled={activeProvider !== "gemini"}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>
                        {t('baseUrlHint')}
                    </p>
                </div>
            </div>

            <div className="divider" />

            {/* OpenAI Configuration */}
            <div
                className={`space-y-4 transition-all duration-300 ${activeProvider !== "openai" ? "opacity-40 pointer-events-none" : ""}`}
                style={{
                    filter: activeProvider !== "openai" ? "grayscale(0.5)" : "none"
                }}
            >
                <div className="form-group">
                    <label className="flex items-center gap-2">
                        {t('openaiApiKey')}
                        {activeProvider !== "openai" && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{
                                background: 'var(--secondary-color)',
                                color: 'var(--text-color-secondary)'
                            }}>
                                {t('blocked') || 'Blocked'}
                            </span>
                        )}
                    </label>
                    <Input
                        type="password"
                        placeholder="sk-..."
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                        disabled={activeProvider !== "openai"}
                    />
                </div>

                <div className="form-group">
                    <label>{t('apiHostOptional')}</label>
                    <Input
                        type="text"
                        placeholder="https://api.openai.com/v1"
                        value={openaiApiHost}
                        onChange={(e) => setOpenaiApiHost(e.target.value)}
                        disabled={activeProvider !== "openai"}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>
                        {t('openaiHint')}
                    </p>
                </div>
            </div>
        </div>
    );
}
