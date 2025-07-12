import React, { useState, useEffect } from 'react';
import { settingsService } from '../../services/settingsService';
import { getDefaultModelForRole } from '../../services/models';
import { AppSettings, AgentRole, ResearchMode } from '../../types';
import Spinner from '../Spinner';

interface ModelSettingsProps {
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    currentMode: ResearchMode;
}

const AGENT_ROLES: AgentRole[] = ['planner', 'searcher', 'synthesizer', 'clarification', 'visualizer'];

const ModelSettings: React.FC<ModelSettingsProps> = ({ settings, setSettings, currentMode }) => {
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [modelsError, setModelsError] = useState<string | null>(null);

    useEffect(() => {
        const fetchModels = async () => {
            setIsLoadingModels(true);
            setModelsError(null);
            try {
                const models = await settingsService.fetchAvailableModels();
                setAvailableModels(models);
            } catch (e: any) {
                setModelsError(e.message || "An unknown error occurred while fetching models.");
            } finally {
                setIsLoadingModels(false);
            }
        };
        fetchModels();
    }, []);

    const handleModelOverrideChange = (role: AgentRole, value: string) => {
        setSettings(prev => ({
            ...prev,
            modelOverrides: { ...prev.modelOverrides, [role]: value === 'default' ? null : value }
        }));
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Model Configuration</h3>
                {isLoadingModels && <div className="flex items-center gap-2 text-sm"><Spinner /><span>Loading...</span></div>}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Override default models for each agent. Select "Default" to use the model specified by the current research mode.</p>
            {modelsError && <div className="p-3 text-sm rounded-lg bg-red-500/10 text-red-800 dark:text-red-200 border border-red-500/20">{modelsError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {AGENT_ROLES.map(role => {
                    const defaultModelName = getDefaultModelForRole(role, currentMode);
                    return (
                        <div key={role} className="space-y-1">
                            <label htmlFor={`model-${role}`} className="font-semibold text-gray-700 dark:text-gray-300 capitalize text-sm">{role}</label>
                            <select id={`model-${role}`} value={settings.modelOverrides[role] || 'default'} onChange={e => handleModelOverrideChange(role, e.target.value)} disabled={isLoadingModels || availableModels.length === 0} className="w-full p-2 rounded-lg bg-white/60 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all text-sm disabled:opacity-50">
                                <option value="default">{`Default (${defaultModelName})`}</option>
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