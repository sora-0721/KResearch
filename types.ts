export type ResearchUpdateType = 'thought' | 'search' | 'read' | 'outline';
export type AgentPersona = 'Alpha' | 'Beta';
export type ResearchMode = 'Balanced' | 'DeepDive' | 'Fast' | 'UltraFast';
export type AppState = 'idle' | 'clarifying' | 'researching' | 'paused' | 'complete';
export type AgentRole = 'planner' | 'searcher' | 'synthesizer' | 'clarification' | 'visualizer' | 'outline';
export type NotificationType = 'success' | 'error' | 'info' | 'warning';
export type TranslationStyle = 'literal' | 'colloquial';


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

export interface ReportVersion {
  content: string;
  version: number;
}

export interface FinalResearchData {
  reports: ReportVersion[];
  activeReportIndex: number;
  citations: Citation[];
  researchTimeMs: number;
  searchCycles: number;
  researchUpdates: ResearchUpdate[];
}

export interface FileData {
  name: string;
  mimeType: string;
  data: string; // base64 encoded string
}

export interface HistoryItem {
  id: string;
  query: string;
  title?: string;
  mode: ResearchMode;
  finalData: FinalResearchData;
  clarificationHistory: ClarificationTurn[];
  selectedFile: FileData | null;
  date: string; // ISO string
  initialSearchResult: { text: string; citations: Citation[] } | null;
  clarifiedContext: string;
}