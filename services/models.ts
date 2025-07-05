import { settingsService } from './settingsService';
import { ResearchMode, AgentRole } from '../types';

type ModelSet = {
    planner: string;
    searcher: string;
    synthesizer: string;
};

// Default models used when no override is set
const defaultResearchModeModels: Record<ResearchMode, ModelSet> = {
    Balanced: {
        planner: 'gemini-2.5-pro',
        searcher: 'gemini-2.5-flash-lite-preview-06-17',
        synthesizer: 'gemini-2.5-flash'
    },
    DeepDive: {
        planner: 'gemini-2.5-pro',
        searcher: 'gemini-2.5-pro',
        synthesizer: 'gemini-2.5-pro'
    },
    Fast: {
        planner: 'gemini-2.5-flash',
        searcher: 'gemini-2.5-flash',
        synthesizer: 'gemini-2.5-flash'
    },
    UltraFast: {
        planner: 'gemini-2.5-flash-lite-preview-06-17',
        searcher: 'gemini-2.5-flash-lite-preview-06-17',
        synthesizer: 'gemini-2.5-flash-lite-preview-06-17'
    }
};

const defaultClarificationModels: Record<ResearchMode, string> = {
    Balanced: 'gemini-2.5-flash',
    DeepDive: 'gemini-2.5-pro',
    Fast: 'gemini-2.5-flash',
    UltraFast: 'gemini-2.5-flash-lite-preview-06-17',
};

const defaultVisualizerModels: Record<ResearchMode, string> = {
    Balanced: 'gemini-2.5-flash',
    DeepDive: 'gemini-2.5-pro',
    Fast: 'gemini-2.5-flash',
    UltraFast: 'gemini-2.5-flash-lite-preview-06-17',
};


/**
 * Gets the appropriate model for a given agent role and research mode.
 * It first checks for a user-defined override in settings, then falls back
 * to the default model for the selected mode.
 * @param role The role of the agent (e.g., 'planner', 'searcher').
 * @param mode The current research mode (e.g., 'Balanced', 'DeepDive').
 * @returns The name of the model to be used.
 */
export const getModel = (role: AgentRole, mode: ResearchMode): string => {
    const override = settingsService.getSettings().modelOverrides[role];
    if (override) {
        return override;
    }

    // Fallback to default mode-based models
    switch (role) {
        case 'planner':
            return defaultResearchModeModels[mode].planner;
        case 'searcher':
            return defaultResearchModeModels[mode].searcher;
        case 'synthesizer':
            return defaultResearchModeModels[mode].synthesizer;
        case 'clarification':
            return defaultClarificationModels[mode];
        case 'visualizer':
            return defaultVisualizerModels[mode];
        default:
            // A safe fallback
            return 'gemini-2.5-flash';
    }
};