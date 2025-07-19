export type ResearchUpdateType = 'thought' | 'search' | 'read';
export type AgentPersona = 'Alpha' | 'Beta';
export type ResearchMode = 'Balanced' | 'DeepDive' | 'Fast' | 'UltraFast';
export type AppState = 'idle' | 'clarifying' | 'researching' | 'paused' | 'complete';
export type AgentRole = 'planner' | 'searcher' | 'synthesizer' | 'clarification' | 'visualizer';
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
}

export interface ModelOverrides {
    [key: string]: string | null;
}

export interface ResearchParams {
    minCycles: number;
    maxCycles: number;
    maxDebateRounds: number;
}

export interface AppSettings {
    modelOverrides: ModelOverrides;
    researchParams: ResearchParams;
}

export interface ClarificationTurn {
    role: 'user' | 'model';
    content: string;
}

export interface ResearchUpdate {
  id: number;
  type: ResearchUpdateType;
  persona?: AgentPersona;
  // For 'search', content can be an array of queries.
  content: string | string[];
  // For 'search' and 'read', source can be an array of URLs.
  source?: string | string[];
}

export interface Citation {
  url: string;
  title: string;
}

export interface FinalResearchData {
  report: string;
  citations: Citation[];
  researchTimeMs: number;
}

export interface FileData {
  name: string;
  mimeType: string;
  data: string; // base64 encoded string
}