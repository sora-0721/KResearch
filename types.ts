
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

export type AppPhase = 'INPUT' | 'ITERATIVE_CLARIFICATION' | 'STRATEGY_REVIEW' | 'ACTION_REVIEW' | 'EXECUTING' | 'REPORT' | 'ERROR';

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

export interface ProposedActionDetails {
  action: string;
  reason: string;
  shouldStop: boolean; // From decideNextResearchAction
}

// For Checkpoint feature
export type CheckpointName = 'POST_CLARIFICATION' | 'POST_STRATEGY';

export interface CheckpointData {
  phaseToRestore: AppPhase; // The phase to enter *after* loading this checkpoint's data
  researchTopic: string;
  researchMode: ResearchMode;
  maxIterations: number;
  accumulatedAnswers: UserAnswer[]; // Always save accumulated, even if empty
  researchStrategy?: string; // Optional, only for POST_STRATEGY
  clarificationQuestions?: ClarificationQuestion[]; // For restoring clarification UI
  userAnswers?: Record<number, string>; // For restoring clarification UI
}

// For streaming report synthesis
export type ReportChunkType = 
  'initial_chunk' | 
  'initial_report_complete' | 
  'elaborated_chunk' | 
  'elaborated_report_complete';

export interface ReportChunk {
  type: ReportChunkType;
  content?: string; // For _chunk types
  fullReportText?: string; // For _complete types
  error?: string; // If an error occurred during this stage
  note?: string; // Additional info, e.g., if elaboration was skipped
}