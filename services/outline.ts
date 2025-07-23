import { ai } from './geminiClient';
import { getModel } from './models';
import { ResearchUpdate, ResearchMode, FileData } from '../types';

export const generateOutline = async (
    query: string,
    history: ResearchUpdate[],
    mode: ResearchMode,
    fileData: FileData | null
): Promise<string> => {
    const learnings = history.filter(h => h.type === 'read').map(h => h.content).join('\n\n---\n\n');
    const historyText = history.map(h => `${h.persona ? h.persona + ' ' : ''}${h.type}: ${Array.isArray(h.content) ? h.content.join(' | ') : h.content}`).join('\n');

    const outlinePrompt = `You are a meticulous Senior Research Analyst and Report Planner. Your task is to create a detailed, hierarchical outline for a comprehensive research report. This outline will be used by another AI to write the final document, so it must be clear, logical, and exhaustive.

**Core User Requirement:**
<REQUIREMENT>${query}</REQUIREMENT>

**Evidence Base (Your Sole Source of Truth):**
*   **Attached File:** ${fileData ? `A file named '${fileData.name}' was provided. Its content must be a central part of the outline.` : "No file was provided."}
*   **Synthesized Research Learnings:** <LEARNINGS>${learnings || "No specific content was read during research."}</LEARNINGS>
*   **Full Research History (For Context):** <HISTORY>${historyText}</HISTORY>

**--- MANDATORY OUTLINING INSTRUCTIONS ---**

1.  **Generate a Report Title:** Your first line MUST be an H1 Markdown heading (e.g., \`# An In-Depth Analysis of X\`). This title should be insightful and reflect the core theme of the research.
2.  **Structure the Outline:** Use Markdown headings (\`#\`, \`##\`, \`###\`) and bullet points (\`-\`) to create a clear hierarchy. The outline MUST follow this top-level structure:
    *   **# [Your Generated Report Title]**
    *   **## Executive Summary:**
        *   - Briefly list the key points that should be covered in the summary.
    *   **## Detailed Analysis of Findings:**
        *   - Identify 3-5 main themes from the research. Create a \`###\` subheading for each theme.
        *   - Under each theme, list specific data points, findings, and insights from the \`<LEARNINGS>\` and file content that should be discussed. Be specific.
    *   **## Strategic Implications & Future Outlook:**
        *   - Deduce the strategic importance of the findings.
        *   - List actionable recommendations that can be drawn from the analysis.
        *   - Identify potential future trends or unanswered questions.
    *   **## Conclusion:**
        *   - List the main takeaways to be summarized.
3.  **Incorporate Mermaid.js:** Identify at least one key area where a visual diagram would enhance understanding (e.g., relationships between entities, a process flow, a SWOT analysis). In the outline, specify where this diagram should go and what it should represent. For example:
    *   \`- [INSERT MERMAID.JS GRAPH: A flowchart illustrating the competitive landscape between Company A, B, and C.]\`
4.  **Be an Architect, Not a Writer:** Your output is the blueprint. Do not write full paragraphs. Use concise phrases and bullet points. Your goal is to provide structure and direction for the writer.

**Final Output:**
Respond ONLY with the raw markdown of the report outline. Do not add any conversational text or explanation.`;

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: outlinePrompt }];
    if (fileData) {
        parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.data } });
    }

    const response = await ai.models.generateContent({
        model: getModel('outline', mode),
        contents: { parts },
        config: { temperature: 0.6 }
    });

    if (!response || !response.text) {
        throw new Error("The API did not return a response during report outlining.");
    }

    return response.text.trim();
};