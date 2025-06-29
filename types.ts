
export type ResearchUpdateType = 'thought' | 'search' | 'read';
export type AgentPersona = 'Alpha' | 'Beta';
export type ResearchMode = 'Balanced' | 'DeepDive' | 'Fast' | 'UltraFast';

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
  mermaidGraph?: string;
}
