import React from 'react';
import { apiKeyService } from '../../services/apiKeyService';

interface ApiSettingsProps {
    apiKey: string;
    setApiKey: (key: string) => void;
}

const ApiSettings: React.FC<ApiSettingsProps> = ({ apiKey, setApiKey }) => {
    const isEnvKey = apiKeyService.isEnvKey();

    return (
        <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Gemini API Key</h3>
            {isEnvKey ? (
                <div className="w-full p-3 rounded-2xl bg-slate-200/60 dark:bg-black/20 text-gray-500 dark:text-gray-400 border border-transparent">
                    API Key is configured by the application host.
                </div>
            ) : (
                <input 
                    id="api-key-input" 
                    type="password" 
                    value={apiKey} 
                    onChange={(e) => setApiKey(e.target.value)} 
                    placeholder="Enter your Gemini API key" 
                    className="w-full p-3 rounded-2xl bg-white/60 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-2 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all" 
                />
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {isEnvKey ? "This key cannot be changed from the UI." : "Your key is stored only in your browser's local storage."} Get a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.
            </p>
            {!apiKeyService.hasKey() && (
                <div className="p-3 text-sm rounded-2xl bg-yellow-500/10 text-yellow-800 dark:text-yellow-200 border border-yellow-500/20">
                    An API Key is required to use the application.
                </div>
            )}
        </div>
    );
};

export default ApiSettings;