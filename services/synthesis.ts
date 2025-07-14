import { ai } from './geminiClient';
import { getModel } from './models';
import { ResearchUpdate, Citation, FinalResearchData, ResearchMode, FileData } from '../types';

export const synthesizeReport = async (
    query: string,
    history: ResearchUpdate[],
    citations: Citation[],
    mode: ResearchMode,
    fileData: FileData | null
): Promise<Omit<FinalResearchData, 'researchTimeMs'>> => {
    const learnings = history.filter(h => h.type === 'read').map(h => h.content).join('\n\n---\n\n');
    const historyText = history.map(h => `${h.persona ? h.persona + ' ' : ''}${h.type}: ${Array.isArray(h.content) ? h.content.join(' | ') : h.content}`).join('\n');

    const finalReportPrompt = `You are an elite Senior Research Analyst and Strategist. Your mission is to produce a comprehensive, insightful, and substantial research report. Your analysis must be sharp, detailed, and decision-ready. There is no length limit; your goal is to be as thorough as the data allows.

**Your Task:**
Transform the provided raw research materials—synthesized learnings, the full research history, and any attached files—into a polished and extensive final report.

**Core User Requirement:**
<REQUIREMENT>${query}</REQUIREMENT>

**Evidence Base (Your Sole Source of Truth):**
*   **Attached File:** ${fileData ? `A file named '${fileData.name}' was provided and its content is a primary source.` : "No file was provided."}
*   **Synthesized Research Learnings:** <LEARNINGS>${learnings || "No specific content was read during research. Base the report primarily on the research history and any attached file."}</LEARNINGS>
*   **Full Research History (For Context and Nuance):** <HISTORY>${historyText}</HISTORY>

**--- MANDATORY REPORTING INSTRUCTIONS ---**

You must generate a report that strictly adheres to the following guidelines.

**1. Content and Structure:**
*   **# 1. Executive Summary:**
    *   Begin with a dense, high-level overview of the most critical findings and conclusions. This should be a polished summary of the entire document, written for a C-suite audience.
*   **# 2. Detailed Analysis of Findings:**
    *   This is the core of the report and must be extensive and deeply analytical.
    *   Synthesize all information from the \`<LEARNINGS>\` block and the attached file content into a coherent, thematic analysis.
    *   Organize your findings into logical themes using \`##\` for major thematic headings (e.g., "## Market Trends," "## Technical Specifications," "## Competitive Landscape"). Use \`###\` for sub-topics within these themes.
    *   For each theme, provide in-depth analysis. Do not just list facts; interpret them, connect disparate points, and discuss the implications.
*   **# 3. Strategic Implications & Future Outlook:**
    *   Based *exclusively* on your "Detailed Analysis," deduce the strategic implications for the target audience.
    *   Provide a set of clear, actionable recommendations justified by the research findings.
    *   Discuss the likely future trajectory of the topic and identify any unanswered questions or areas for further research that emerged.
*   **# 4. Conclusion:**
    *   Provide a strong, concise final summary of the report, reiterating the most important takeaways and their significance.

**2. Critical Stylistic Requirements:**
*   **Evidence-Based Assertions:** This is non-negotiable. Every key assertion, claim, or data point MUST be grounded in the provided research data. Use phrases that explicitly show your work, such as:
    *   "The research indicates that..."
    *   "According to my findings on [specific search query]..."
    *   "Analysis of the synthesized search results reveals that..."
    *   "Based on the provided data from [source type/document]..."
    *   "Contrasting information was found regarding..."
*   **Data Visualization:** Where it adds significant value, use Mermaid.js charts (e.g., flowcharts, mind maps) to visually represent complex relationships, processes, or data comparisons. Embed them directly in the relevant sections.
*   **Tone & Formatting:** Maintain a formal, objective, and authoritative tone. Use Markdown extensively for clarity (headings, lists, bold text).
*   **Exclusivity:** The report's content must be based **exclusively** on the information provided in the prompt context. Do NOT invent information or use any outside knowledge. Do NOT include inline citations; a separate citation list is provided elsewhere.

**Final Output:**
Respond ONLY with the raw markdown content of the final report, starting with the first H1 heading. Do not add any conversational text or explanation. Your primary directive is to generate the most comprehensive and evidence-backed report possible from the given data.
`;

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: finalReportPrompt }];
    if (fileData) {
        parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.data } });
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
        return { report: "Failed to generate an initial report. The response from the AI was empty.", citations: [] };
    }
    return { report: reportText.trim(), citations: [] };
};

export const rewriteReport = async (
    originalReport: string,
    instruction: string,
    mode: ResearchMode,
    file: FileData | null
): Promise<string> => {
    const prompt = `You are an expert copy editor. Your task is to rewrite the provided Markdown report based on a specific instruction.
You must adhere to these rules:
1.  The output MUST be only the raw Markdown of the rewritten report. Do not add any conversational text, introductions, or explanations.
2.  Preserve the original meaning and data of the report unless the instruction explicitly asks to change it.
3.  Maintain the original Markdown formatting (headings, lists, etc.) as much as possible.

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
</FILE_CONTEXT>

Respond with the rewritten report now.`;

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: prompt }];
    if (file) {
        parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
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
