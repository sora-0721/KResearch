import { ResearchMode } from '../../types';

// Define model names based on user's specific guidelines for research modes
export const NORMAL_MODE_MODEL = "gemini-2.5-flash-preview-05-20"; // Updated as per new guidelines
export const DEEPER_MODE_MODEL = "gemini-2.5-pro-preview-06-05"; // Updated as per new guidelines

export const MAX_RETRIES = 3;
export const BASE_RETRY_DELAY_MS = 1000;
export const MAX_CONTEXT_TOKENS_APPROX = 7000; // Used in summarizeHistoryForContext

export const getModelNameForMode = (mode: ResearchMode): string => {
  if (mode === 'deeper') {
    return DEEPER_MODE_MODEL;
  }
  return NORMAL_MODE_MODEL;
};