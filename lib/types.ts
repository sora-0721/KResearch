// Type definitions for KResearch agents

export interface GlobalContext {
    project_name: string;
    original_query: string;
    status: "in_progress" | "complete" | "failed";
    iteration: number;
    knowledge_bank: KnowledgeItem[];
    conflicts: ConflictItem[];
    research_mode?: "standard" | "deep";
}

export interface KnowledgeItem {
    topic: string;
    facts: string[];
    sources: string[];
    verified: boolean;
}

export interface ConflictItem {
    point: string;
    claim_a: string;
    claim_b: string;
    status: "unresolved" | "resolved";
}

export interface ManagerOutput {
    thoughts: string;
    sufficiency_score: number;
    is_finished: boolean;
    next_step: {
        task_description: string;
        search_queries: string[];
        focus_area: string;
    };
}

export interface WorkerFinding {
    source_url: string;
    fact: string;
    context: string;
}

export interface ClarifierOutput {
    is_clear: boolean;
    questions: string[];
    reasoning: string;
}
