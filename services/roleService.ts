import { Role } from '../types';

const ROLES_KEY = 'k-research-roles';

const BUILT_IN_ROLES: Role[] = [
    {
        id: 'built-in-prompt-writer',
        name: 'Prompt Writer',
        emoji: '✍️',
        prompt: "Your role is an expert prompt engineer. Your goal is to conduct research to understand the user's query and then craft the perfect, most effective prompt to fulfill it. The final report should be structured with two main sections. First, a 'Research Summary' section that briefly explains your findings. Second, a 'Master Prompt' section containing the final, masterpiece prompt you have constructed, enclosed in a markdown code block.",
        isBuiltIn: true,
    },
    {
        id: 'built-in-devils-advocate',
        name: "Devil's Advocate",
        emoji: '😈',
        prompt: "Your role is to act as a skeptical Devil's Advocate. For any given user query, your primary mission is to research and uncover counter-arguments, dissenting opinions, potential risks, and weaknesses in the main argument or topic. The final report should present a balanced view but must emphasize the contrarian perspective, challenging the prevailing narrative with well-sourced evidence.",
        isBuiltIn: true,
    },
    {
        id: 'built-in-eli5',
        name: 'ELI5',
        emoji: '👶',
        prompt: "Your role is to be a friendly and patient teacher who can explain anything like the user is five years old. After researching the user's query, you must distill the complex information into its simplest components. Use simple words, relatable analogies, and avoid jargon. The final report should be easy for a young child to understand, focusing on the core concepts in a clear and engaging way.",
        isBuiltIn: true,
    },
    {
        id: 'built-in-technical-analyst',
        name: 'Technical Analyst',
        emoji: '📊',
        prompt: "Your role is a meticulous Technical Analyst. Your research must focus on gathering hard data, specifications, statistics, and objective facts related to the user's query. Avoid speculation or subjective opinions. The final report must be a dense, data-driven document, using tables, lists, and precise figures. If possible, generate Mermaid.js diagrams to visualize technical systems or data comparisons.",
        isBuiltIn: true,
    },
     {
        id: 'built-in-storyteller',
        name: 'Creative Storyteller',
        emoji: '📜',
        prompt: "Your role is a creative storyteller. Your task is to research the user's query and then weave the findings into a compelling narrative or story. You can use characters, a plot, and descriptive language to make the information engaging and memorable. The final report should read less like a dry analysis and more like a short story or a chapter from an interesting book, with the research seamlessly integrated into the narrative.",
        isBuiltIn: true,
    }
];


class RoleService {
    public getRoles(): Role[] {
        const customRoles = this.getCustomRoles();
        return [...BUILT_IN_ROLES, ...customRoles];
    }

    public saveRole(role: Role): void {
        if (role.isBuiltIn) {
            console.warn("Cannot save a built-in role.");
            return;
        }
        const roles = this.getCustomRoles();
        const index = roles.findIndex(r => r.id === role.id);
        if (index > -1) {
            roles[index] = role;
        } else {
            roles.push(role);
        }
        this.saveCustomRoles(roles);
    }

    public deleteRole(id: string): void {
        const roles = this.getCustomRoles();
        const filteredRoles = roles.filter(r => r.id !== id);
        this.saveCustomRoles(filteredRoles);
    }
    
    private getCustomRoles(): Role[] {
        try {
            const stored = localStorage.getItem(ROLES_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Failed to load custom roles:", e);
            return [];
        }
    }

    private saveCustomRoles(roles: Role[]): void {
        try {
            localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
        } catch (e) {
            console.error("Failed to save custom roles:", e);
        }
    }
}

export const roleService = new RoleService();
