import React from 'react';
import { apiKeyService } from '../../services/apiKeyService';

interface ApiSettingsProps {
    apiKey: string;
    setApiKey: (key: string) => void;
    apiBaseUrl: string;
    setApiBaseUrl: (url: string) => void;
}

const ApiSettings: React.FC<ApiSettingsProps> = ({ apiKey, setApiKey, apiBaseUrl, setApiBaseUrl }) => {
    const isEnvKey = apiKeyService.isEnvKey();

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Gemini API Key(s)</h3>
                {isEnvKey ? (
                    <div className="w-full p-3 rounded-2xl bg-slate-200/60 dark:bg-black/20 text-gray-500 dark:text-gray-400 border border-transparent">
                        API Key(s) are configured by the application host.
                    </div>
                ) : (
                    <textarea 
                        id="api-key-input"
                        value={apiKey} 
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Gemini API Key(s), one per line."
                        className="w-full h-24 p-3 rounded-2xl resize-none bg-white/60 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all text-sm"
                        aria-label="Gemini API Keys"
                    />
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">API Base URL (Optional)</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Change this only if you need to use a proxy or a different API endpoint.</p>
                <input 
                    id="api-base-url-input"
                    type="url"
                    value={apiBaseUrl} 
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder="e.g., https://generativelanguage.googleapis.com"
                    className="w-full p-3 rounded-2xl bg-white/60 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="API Base URL"
                    disabled={isEnvKey}
                />
            </div>
        </div>
    );
};

export default ApiSettings;