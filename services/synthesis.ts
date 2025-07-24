import { ai } from './geminiClient';
import { getModel } from './models';
import { ResearchUpdate, Citation, FinalResearchData, ResearchMode, FileData, ReportVersion, Role } from '../types';

const getRoleContext = (role: Role | null): string => {
    if (!role) return '';
    return `
**Primary Role Directive:**
You must adopt the following persona and instructions for this entire task. This directive supersedes all other instructions if there is a conflict.
<ROLE_INSTRUCTIONS>
${role.prompt}
</ROLE_INSTRUCTIONS>
`;
};

export const synthesizeReport = async (
    query: string,
    history: ResearchUpdate[],
    citations: Citation[],
    mode: ResearchMode,
    fileData: FileData | null,
    role: Role | null,
    reportOutline: string,
): Promise<Omit<FinalResearchData, 'researchTimeMs' | 'searchCycles' | 'researchUpdates' | 'citations'>> => {
    const learnings = history.filter(h => h.type === 'read').map(h => h.content).join('\n\n---\n\n');
    const historyText = history.map(h => `${h.persona ? h.persona + ' ' : ''}${h.type}: ${Array.isArray(h.content) ? h.content.join(' | ') : h.content}`).join('\n');
    const roleContext = getRoleContext(role);

    const finalReportPrompt = `You are an elite Senior Research Analyst. Your mission is to write a comprehensive, insightful, and substantial research report based on a pre-defined outline and a collection of research materials.
${roleContext}
**Your Task:**
Write a polished and extensive final report by strictly following the provided report outline. You must flesh out each section of the outline using the provided evidence base.

**Core User Requirement:**
<REQUIREMENT>${query}</REQUIREMENT>

**Mandatory Report Outline (Your primary guide for structure and content):**
<OUTLINE>
${reportOutline}
</OUTLINE>

**Evidence Base (Your Sole Source of Truth for content):**
*   **Attached File:** ${fileData ? `A file named '${fileData.name}' was provided and its content is a primary source.` : "No file was provided."}
*   **Role-specific File:** ${role?.file ? `A file named '${role.file.name}' was provided with the role and its content is a primary source.` : "No file was provided with the role."}
*   **Synthesized Research Learnings:** <LEARNINGS>${learnings || "No specific content was read during research."}</LEARNINGS>
*   **Full Research History (For Context and Nuance):** <HISTORY>${historyText}</HISTORY>

**--- CRITICAL REPORTING INSTRUCTIONS ---**

**1. Adherence to Outline & Role:**
*   You **MUST** follow the structure provided in the \`<OUTLINE>\`. This includes all specified headings, subheadings, and content points.
*   Your output and tone must be consistent with your assigned Role Directive.
*   The very first line of your response **MUST BE** the H1 title as specified in the outline.

**2. Content Generation:**
*   Flesh out each section of the outline with detailed analysis, synthesizing information from the \`<LEARNINGS>\` block, the attached files, and the broader research history.
*   Provide in-depth analysis. Do not just list facts; interpret them, connect disparate points, and discuss the implications, all through the lens of your role.

**3. Stylistic and Formatting Requirements:**
*   **Evidence-Based Assertions:** This is non-negotiable. Every key assertion, claim, or data point MUST be grounded in the provided research data.
*   **Data Visualization with Mermaid.js:** If the outline requires a Mermaid.js graph, create it following these strict rules:
    *   1. Use \`graph TD\` (top-down) or \`graph LR\` (left-right).
    *   2. Create a unique, simple English node ID for each identified entity (e.g., \`personA\`, \`orgB\`). The node text must display the full name or description of the entity.
    *   3. All text content (node text, edge labels) **MUST be wrapped in double quotes**. Example: \`personA["Alice Smith"] --> |"is CEO of"| orgB["XYZ Company"]\`.
    *   4. Embed the complete \`\`\`mermaid ... \`\`\` code block directly in the relevant sections of the report.
*   **Tone & Formatting:** Maintain a formal, objective, and authoritative tone, unless your Role Directive specifies otherwise. Use Markdown extensively for clarity (headings, lists, bold text).
*   **Exclusivity:** The report's content must be based **exclusively** on the information provided. Do NOT invent information or use any outside knowledge. Do NOT include inline citations.

**Final Output:**
Respond ONLY with the raw markdown content of the final report, starting with the H1 title from the outline. Do not add any conversational text or explanation.
`;

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: finalReportPrompt }];
    if (fileData) {
        parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.data } });
    }
    if (role?.file) {
        parts.push({ inlineData: { mimeType: role.file.mimeType, data: role.file.data } });
    }
    const reportResponse = await ai.models.generateContent({
        model: getModel('synthesizer', mode),
        contents: { parts },
        config: { temperature: 0.5 }
    });
    
    if (!reportResponse) {
        throw new Error("The API did not return a response during report synthesis. This might be due to content filters blocking the request.");
    }

    const reportText = reportResponse.text;
    
    if (!reportText) {
         return { reports: [{ content: "Failed to generate an initial report. The response from the AI was empty.", version: 1 }], activeReportIndex: 0 };
    }
    
    const initialReport: ReportVersion = { content: reportText.trim(), version: 1 };
    return { reports: [initialReport], activeReportIndex: 0 };
};

export const rewriteReport = async (
    originalReport: string,
    instruction: string,
    mode: ResearchMode,
    file: FileData | null,
    role: Role | null,
): Promise<string> => {
    const roleContext = getRoleContext(role);
    const prompt = `You are an expert copy editor. Your task is to rewrite the provided Markdown report based on a specific instruction.
${roleContext}
You must adhere to these rules:
1.  The output MUST be only the raw Markdown of the rewritten report. Do not add any conversational text, introductions, or explanations.
2.  Preserve the original meaning and data of the report unless the instruction explicitly asks to change it.
3.  Maintain the original Markdown formatting (headings, lists, etc.) as much as possible, including the initial H1 title.

**Original Report:**
<REPORT>
${originalReport}
</REPORT>

**Instruction:**
<INSTRUCTION>
${instruction}
</INSTRUCTION>

**Attached File (if any, provides additional context for the instruction):**
<FILE_CONTEXT>
${file ? `A file named '${file.name}' was attached.` : "No file was attached."}
${role?.file ? `A file named '${role.file.name}' was attached with the role.` : "No file was attached with the role."}
</FILE_CONTEXT>

Respond with the rewritten report now.`;

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: prompt }];
    if (file) {
        parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
    }
    if (role?.file) {
        parts.push({ inlineData: { mimeType: role.file.mimeType, data: role.file.data } });
    }

    const response = await ai.models.generateContent({
        model: getModel('synthesizer', mode),
        contents: { parts },
        config: { temperature: 0.7 }
    });

    if (!response || !response.text) {
        throw new Error("The API did not return a response during report rewrite. This might be due to content filters blocking the request.");
    }

    return response.text.trim();
};
