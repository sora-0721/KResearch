
import React, { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/settingsService';
import { getDefaultModelForRole } from '../../services/models';
import { AppSettings, AgentRole, ResearchMode } from '../../types';
import Spinner from '../Spinner';
import { useLanguage } from '../../contextx/LanguageContext';

interface ModelSettingsProps {
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    currentMode: ResearchMode;
}

const AGENT_ROLES: AgentRole[] = ['planner', 'searcher', 'outline', 'synthesizer', 'clarification', 'visualizer'];

const ModelSettings: React.FC<ModelSettingsProps> = ({ settings, setSettings, currentMode }) => {
    const { t } = useLanguage();
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [modelsError, setModelsError] = useState<string | null>(null);

    const fetchModels = useCallback(async (force = false) => {
        setIsLoadingModels(true);
        setModelsError(null);
        try {
            const models = await settingsService.fetchAvailableModels(force);
            setAvailableModels(models);
        } catch (e: any) {
            setModelsError(e.message || "An unknown error occurred while fetching models.");
        } finally {
            setIsLoadingModels(false);
        }
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);


    const handleModelOverrideChange = (role: AgentRole, value: string) => {
        setSettings(prev => ({
            ...prev,
            modelOverrides: { ...prev.modelOverrides, [role]: value === 'default' ? null : value }
        }));
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t('modelConfig')}</h3>
                <div className="flex items-center gap-2">
                     {isLoadingModels && <div className="flex items-center gap-2 text-sm"><Spinner /><span>{t('loading')}</span></div>}
                     <button onClick={() => fetchModels(true)} disabled={isLoadingModels} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50" title={t('refreshModelList')}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 -960 960 960" fill="currentColor">
                            <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/>
                        </svg>
                     </button>
                </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('modelConfigDesc')}</p>
            {modelsError && <div className="p-3 text-sm rounded-2xl bg-red-500/10 text-red-800 dark:text-red-200 border border-red-500/20">{modelsError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {AGENT_ROLES.map(role => {
                    const defaultModelName = getDefaultModelForRole(role, currentMode);
                    return (
                        <div key={role} className="space-y-1">
                            <label htmlFor={`model-${role}`} className="font-semibold text-gray-700 dark:text-gray-300 capitalize text-sm">{t(role)}</label>
                            <select id={`model-${role}`} value={settings.modelOverrides[role] || 'default'} onChange={e => handleModelOverrideChange(role, e.target.value)} disabled={isLoadingModels || availableModels.length === 0} className="w-full p-2 rounded-2xl bg-white/60 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all text-sm disabled:opacity-50">
                                <option value="default">{t('defaultModel')} ({defaultModelName})</option>
                                {availableModels.map(modelName => <option key={modelName} value={modelName}>{modelName}</option>)}
                            </select>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ModelSettings;
