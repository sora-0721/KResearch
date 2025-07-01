import { ai } from './geminiClient';
import { researchModeModels } from './models';
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

    const initialReportPrompt = `You are an expert Senior Research Analyst and Strategist, specializing in synthesizing complex information into clear, insightful, and decision-ready reports for executive-level stakeholders.
Your mission is to transform the provided raw research materials and any attached files into a polished and comprehensive final report.
**User's Core Request:** <REQUIREMENT>${query}</REQUIREMENT>
**Attached File:** ${fileData ? `A file named '${fileData.name}' has been provided. Its content is available to you as primary context.` : "No file was provided."}
**Synthesized Research Learnings (Primary Source for the Report):** <LEARNINGS>${learnings || "No specific content was read during research. Base the report on the thought process and any attached file."}</LEARNINGS>
**Full Research History (For Context and Nuance Only):** <HISTORY>${historyText}</HISTORY>
**--- INSTRUCTIONS ---**
**1. Report Structure & Content:**
Adhere to the following professional report structure. Each section should be clearly delineated.
*   **Title:** Create a concise and descriptive title for the report.
*   **Executive Summary:** Begin with a brief, high-level overview summarizing the core request, the most critical findings (from both web research and any provided files), and key recommendations.
*   **Introduction:** State the original request, including the role of any attached files, and the objective of the report.
*   **Detailed Analysis / Key Findings:** This is the main body.
    *   Synthesize information from the \`<LEARNINGS>\` block AND the attached file content into a thorough, coherent analysis.
    *   Organize findings thematically.
    *   Directly address all parts of the user's \`<REQUIREMENT>\`.
*   **Strategic Recommendations / Implications:** Based *only* on the findings, provide actionable recommendations or outline strategic implications.
*   **Conclusion:** Provide a concise final summary.
**2. Tone and Style:**
*   Maintain a professional, objective, and analytical tone.
*   The report's content must be based **exclusively** on the information within the \`<LEARNINGS>\` block and the attached file.
*   Do NOT include inline citations or invent sources.
**3. Data Visualization and Formatting:**
Enhance readability with visual elements where appropriate, using Markdown and Mermaid charts.
**4. Final Output:**
Respond ONLY with the raw markdown content of the final report.
`;

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: initialReportPrompt }];
    if (fileData) {
        parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.data } });
    }
    const reportResponse = await ai.models.generateContent({
        model: researchModeModels[mode].synthesizer,
        contents: { parts },
        config: { temperature: 0.5 }
    });
    
    const reportText = reportResponse.text.trim();
    if (!reportText) {
        return { report: "Failed to generate an initial report.", citations: [] };
    }
    return { report: reportText, citations: [] };
};
