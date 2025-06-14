
// This file now acts as an aggregator for Gemini service functions.
// Specific implementations are in ./gemini/*.ts

export { 
    getInitialTopicContext, 
    generateInitialClarificationQuestions, 
    evaluateAnswersAndGenerateFollowUps 
} from './gemini/clarificationService';
export type { EvaluatedAnswers } from './gemini/clarificationService';

export { generateResearchStrategy } from './gemini/strategyService';

export { 
    decideNextResearchAction, 
    executeResearchStep
} from './gemini/executionService';

export { 
    summarizeText, 
    synthesizeReport 
} from './gemini/synthesisService';

// Constants and core utilities if they need to be exposed, otherwise they are internal.
// For now, these are primarily used internally by other service files.
// export { getModelNameForMode } from './gemini/constants';
// export { geminiApiCallWithRetry, parseJsonFromString } from './gemini/utils';
