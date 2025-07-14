import React, { useState } from 'react';
import { AppSettings, ResearchParams } from '../../types';

interface ParamSettingsProps {
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

type UncappedState = {
    minCycles: boolean;
    maxCycles: boolean;
    maxDebateRounds: boolean;
};

// Default values to revert to if a setting is loaded as "uncapped"
const DEFAULT_PARAMS: ResearchParams = {
    minCycles: 7,
    maxCycles: 20,
    maxDebateRounds: 20,
};

const UNCAPPED_VALUES: ResearchParams = {
    minCycles: 1,
    maxCycles: 99,
    maxDebateRounds: 99,
};

const ParamSettings: React.FC<ParamSettingsProps> = ({ settings, setSettings }) => {
    // This state tracks the user's manually entered values, preserving them when "uncapped" is toggled.
    const [userParamValues, setUserParamValues] = useState<ResearchParams>(() => {
        const initialParams = settings.researchParams;
        // If an initial param is already at the uncapped value, store a reasonable default.
        return {
            minCycles: initialParams.minCycles === UNCAPPED_VALUES.minCycles ? DEFAULT_PARAMS.minCycles : initialParams.minCycles,
            maxCycles: initialParams.maxCycles === UNCAPPED_VALUES.maxCycles ? DEFAULT_PARAMS.maxCycles : initialParams.maxCycles,
            maxDebateRounds: initialParams.maxDebateRounds === UNCAPPED_VALUES.maxDebateRounds ? DEFAULT_PARAMS.maxDebateRounds : initialParams.maxDebateRounds,
        };
    });
    
    // The "isUncapped" state should be derived directly from props on each render to avoid sync issues.
    const isUncapped: UncappedState = {
        minCycles: settings.researchParams.minCycles === UNCAPPED_VALUES.minCycles,
        maxCycles: settings.researchParams.maxCycles === UNCAPPED_VALUES.maxCycles,
        maxDebateRounds: settings.researchParams.maxDebateRounds === UNCAPPED_VALUES.maxDebateRounds,
    };

    const handleParamChange = (key: keyof ResearchParams, value: number) => {
        // If parsing resulted in NaN (e.g., empty input), do nothing to prevent state corruption.
        if (isNaN(value)) {
            return;
        }

        const newParams = { ...settings.researchParams, [key]: value };
        
        // Only update the stored "user value" if the new value is not an uncapped trigger.
        // This preserves the last valid "capped" value for restoration.
        if (value !== UNCAPPED_VALUES[key]) {
            setUserParamValues(prev => ({ ...prev, [key]: value }));
        }

        setSettings(prev => ({ ...prev, researchParams: newParams }));
    };

    const handleUncappedToggle = (key: keyof UncappedState) => {
        const willBeUncapped = !isUncapped[key];
        // If un-capping, use the uncapped value. If re-capping, use the last known user value.
        const valueToSet = willBeUncapped ? UNCAPPED_VALUES[key] : userParamValues[key];
        const newParams = { ...settings.researchParams, [key]: valueToSet };
        setSettings(prev => ({ ...prev, researchParams: newParams }));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-semibold">Research Parameters</h3>
            {[
                { key: 'minCycles', label: 'Min Research Cycles', help: 'Minimum cycles before finishing.' },
                { key: 'maxCycles', label: 'Max Research Cycles', help: 'Hard limit for research iterations.' },
                { key: 'maxDebateRounds', label: 'Max Debate Rounds', help: 'Agent planning conversation length.' },
            ].map(({ key, label, help }) => (
                <div key={key} className="space-y-2">
                    <label htmlFor={key} className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{label}</label>
                    <div className="flex items-center gap-4">
                        <input type="number" id={key} value={settings.researchParams[key as keyof ResearchParams]} onChange={e => handleParamChange(key as keyof ResearchParams, parseInt(e.target.value, 10))} disabled={isUncapped[key as keyof UncappedState]} className="w-full p-2 rounded-2xl bg-white/60 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all disabled:opacity-50" />
                        <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    checked={isUncapped[key as keyof UncappedState]} 
                                    onChange={() => handleUncappedToggle(key as keyof UncappedState)} 
                                    className="sr-only peer"
                                    aria-label={`Toggle uncapped for ${label}`}
                                />
                                <div className="
                                    w-11 h-6 rounded-full 
                                    bg-glass-light dark:bg-glass-dark 
                                    border border-border-light dark:border-border-dark
                                    peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-glow-light/50 dark:peer-focus:ring-glow-dark/50
                                    transition-colors duration-300
                                    peer-checked:bg-glow-light dark:peer-checked:bg-glow-dark
                                "></div>
                                <div className="
                                    absolute left-1 top-1
                                    w-4 h-4 rounded-full
                                    bg-white/90 dark:bg-gray-300
                                    border border-gray-300/50
                                    shadow-md
                                    transition-transform duration-300 ease-in-out
                                    peer-checked:translate-x-5
                                "></div>
                            </div>
                            <span>Uncapped</span>
                        </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{help}</p>
                </div>
            ))}
        </div>
    );
};

export default ParamSettings;