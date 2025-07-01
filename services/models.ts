import { ResearchMode } from '../types';

type ModelSet = {
    planner: string;
    searcher: string;
    synthesizer: string;
};

export const researchModeModels: Record<ResearchMode, ModelSet> = {
    Balanced: {
        planner: 'gemini-2.5-flash-preview-04-17',
        searcher: 'gemini-2.5-flash-preview-04-17',
        synthesizer: 'gemini-2.5-flash-preview-04-17'
    },
    DeepDive: {
        planner: 'gemini-2.5-pro',
        searcher: 'gemini-2.5-pro',
        synthesizer: 'gemini-2.5-pro'
    },
    Fast: {
        planner: 'gemini-2.5-flash-preview-04-17',
        searcher: 'gemini-2.5-flash-preview-04-17',
        synthesizer: 'gemini-2.5-flash-preview-04-17'
    },
    UltraFast: {
        planner: 'gemini-2.5-flash-lite-preview-06-17',
        searcher: 'gemini-2.5-flash-lite-preview-06-17',
        synthesizer: 'gemini-2.5-flash-lite-preview-06-17'
    }
};

export const clarificationModels: Record<ResearchMode, string> = {
    Balanced: 'gemini-2.5-flash-preview-04-17',
    DeepDive: 'gemini-2.5-pro',
    Fast: 'gemini-2.5-flash-preview-04-17',
    UltraFast: 'gemini-2.5-flash-lite-preview-06-17',
};
