import { ResearchMode } from '../types';

type ModelSet = {
    planner: string;
    searcher: string;
    synthesizer: string;
};

export const researchModeModels: Record<ResearchMode, ModelSet> = {
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

export const clarificationModels: Record<ResearchMode, string> = {
    Balanced: 'gemini-2.5-flash',
    DeepDive: 'gemini-2.5-pro',
    Fast: 'gemini-2.5-flash',
    UltraFast: 'gemini-2.5-flash-lite-preview-06-17',
};

export const visualizerModels: Record<ResearchMode, string> = {
    Balanced: 'gemini-2.5-flash',
    DeepDive: 'gemini-2.5-pro',
    Fast: 'gemini-2.5-flash',
    UltraFast: 'gemini-2.5-flash-lite-preview-06-17',
};
