
export interface Source {
  uri: string;
  title: string;
}

export interface ClarificationQuestion {
  id: number; // Unique within its current batch
  question: string;
}

export interface UserAnswer {
  questionId: number; // Corresponds to ClarificationQuestion.id in the specific batch
  questionText: string; // The text of the question being answered
  answer: string;
}

export type ResearchLogEntryType = 'thought' | 'action' | 'system' | 'error' | 'summary' | 'sources' | 'clarification_q' | 'clarification_a';

export interface ResearchLogEntry {
  id: string; // Unique ID for key prop
  timestamp: number;
  type: ResearchLogEntryType;
  content: string;
  sources?: Source[]; // Optional sources, mainly for 'sources' type or if a summary includes them
}

export interface ExecutedStepOutcome {
  action: string;
  reason?: string; // Reason for taking this action
  rawResultText: string;
  summary: string;
  sources: Source[];
}

export type AppPhase = 'INPUT' | 'ITERATIVE_CLARIFICATION' | 'STRATEGY_REVIEW' | 'EXECUTING' | 'REPORT' | 'ERROR';

// Raw grounding chunk structure from Gemini API when using Google Search
export interface GroundingChunkWeb {
  uri: string;
  title: string;
}
export interface GroundingChunk {
  web: GroundingChunkWeb;
}
export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}
export interface Candidate {
  groundingMetadata?: GroundingMetadata;
}
export interface GeminiResponseForSearch {
 text: string;
 candidates?: Candidate[];
}

export type ResearchMode = 'normal' | 'deeper';
