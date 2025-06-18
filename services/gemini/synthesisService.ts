
import { ExecutedStepOutcome, ResearchMode, Source, ReportChunk } from '../../types';
import { getModelNameForMode } from './constants';
import { geminiApiCallStreamWithRetry } from './utils'; // Assuming this now exists and works for streaming

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY missing in synthesisService.ts");
}

const EXPERT_ANALYST_SUMMARY_SYSTEM_PROMPT = "You are an expert analyst. Your task is to extract key, dense, and unique information from the provided text. Focus on factual details, including specific entities (people, places, companies, products), metrics, numbers, and dates when available. Be accurate, objective, and concise. Ensure each extracted learning is distinct and not repetitive.";

// summarizeText remains non-streaming as it's a smaller, intermediate step.
export const summarizeText = async (textToSummarize: string, researchMode: ResearchMode, topic?: string): Promise<string> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  if (!(textToSummarize || "").trim()) return "No content to summarize.";
  const modelName = getModelNameForMode(researchMode);

  const prompt = `
Context: You are summarizing text relevant to the research topic: "${topic || 'General Information'}".
The goal is to extract crucial 'learnings' – these should be information-dense, unique, and factual statements.

Input Text to Summarize:
---
${textToSummarize}
---

Instructions:
1.  Read the input text carefully.
2.  Identify the most important pieces of information, facts, and key takeaways.
3.  Synthesize these into a concise summary (typically 2-5 sentences, or a short paragraph).
4.  The summary should highlight:
    *   Key entities (people, organizations, locations, products, concepts).
    *   Specific metrics, numbers, quantities, or values.
    *   Important dates or timeframes.
    *   Core arguments, findings, or conclusions presented in the text.
5.  Ensure the summary is neutral, factual, and directly derived from the provided text.
6.  Avoid redundancy. Each point in the summary should offer unique value.
7.  Do not introduce outside information or personal opinions.

Output ONLY the summary. No introductory phrases like "The summary is:" or "This text states that...".

Example (if text was about a company's quarterly report for topic "Financial Performance of XYZ Corp"):
"XYZ Corp reported Q3 revenue of $150 million, a 15% increase year-over-year, driven by a 25% growth in its software division. Net profit for the quarter was $20 million. The company highlighted strong performance in the North American market and announced plans to expand into Asia Pacific in early 2024. Key challenges mentioned include supply chain disruptions impacting hardware sales."
`;
  try {
    // For summarizeText, we still need the full response, so a non-streaming call is fine if geminiApiCallWithRetry is kept.
    // However, to align with a potential full switch to streaming utils, this could also use geminiApiCallStreamWithRetry and collect all chunks.
    // For simplicity, assuming geminiApiCallWithRetry (non-stream) still exists and is appropriate here.
    // If not, this would need to change to collect stream.
    // Let's assume we need to import the non-streaming version if it's separate now.
    // For this change, I'll assume geminiApiCallWithRetry handles non-streaming.
    const { geminiApiCallWithRetry } = await import('./utils'); // Dynamic import if it was removed
    const response = await geminiApiCallWithRetry({ 
        model: modelName, 
        contents: prompt,
        config: {
            systemInstruction: EXPERT_ANALYST_SUMMARY_SYSTEM_PROMPT
            // Omit thinkingConfig for higher quality
        }
    });
    return (response.text || "").trim();
  } catch (error) {
    console.error("Error summarizing text:", error);
    return `Summarization failed. Preview of content: ${(textToSummarize || "").substring(0, 200)}... (Error: ${error instanceof Error ? error.message : String(error)})`;
  }
};


const REPORT_SYNTHESIS_SYSTEM_INSTRUCTION = `You are an expert researcher and technical writer tasked with producing a comprehensive and well-structured final research report.

Key Persona Traits (Embody these):
-   **Expertise:** Assume the user is a highly experienced analyst; no need to oversimplify. Be as detailed as possible.
-   **Accuracy & Thoroughness:** Ensure all information is correct and well-supported by the provided learnings.
-   **Organization:** Be highly organized. Structure the report logically.
-   **Proactivity (in structuring):** Anticipate the user's need for a clear, readable, and comprehensive document.
-   **Detail-Oriented:** Provide detailed explanations.
-   **Objectivity:** While you can highlight significant findings, maintain a neutral and objective tone overall.
-   **Consideration of Nuance:** If learnings present different perspectives, reflect this in the report.

General Output Guidelines:
-   **Report Structure:** Adhere to the provided Report Plan. Each section must have a distinct purpose with no content overlap. Combine related concepts. Every section MUST be directly relevant to the main topic. Avoid tangential sections.
-   **Content Depth:** Aim for a detailed report (e.g., target 5+ pages of equivalent content if it were a document, though output is plain text Markdown). Include ALL relevant learnings.
-   **Markdown Formatting:**
    -   Headings: Use \`#\` through \`######\`. Use Emoji before titles/subtitles where appropriate (e.g., \`🔢### 1. Section Title\`).
    -   Paragraphs: Separate with blank lines.
    -   Bold Emphasis: Use asterisks (\`**important content**\`) for key terms or findings.
    -   Links: Use \`[link text](URL)\` if URLs are part of learnings (primarily if you are asked to list sources separately, but not for inline citations).
    -   Lists: Unordered (\`-\`, \`*\`, \`+\`), Ordered (\`1.\`, \`2.\`).
    -   Code: Inline (\`code\`), Blocks (\`\`\`language\\ncode\\n\`\`\`).
    -   Quotes: \`> quote\`
    -   Horizontal Rule: \`---\`
    -   Tables: Basic GFM table syntax. No extra spaces for alignment. If complex, use multiple simple tables. No nested tables.
    -   LaTeX: Inline (\`$E=mc^2$\`), Block (\`$$E=mc^2$$\`).
-   **Mermaid Diagrams:** If the content lends itself to visualizing relationships (e.g., organizational structures, processes, concept maps), generate Mermaid graph code (TD or LR).
    -   Use unique English letter/abbreviation node IDs (e.g., \`EntityA["Full Name"]\`).
    -   Label relationships (\`A -->|"Relationship"| B\`).
    -   Ensure all text in Mermaid (nodes, labels) is wrapped in double quotes (e.g., \`"Node Text"\`).
    -   Embed the Mermaid code block (e.g., \`\`\`mermaid\\ngraph TD; A["Node A"] --> B["Node B"];\\n\`\`\`) in the relevant section of the report.
-   **Image Placeholder (Conceptual):** While you cannot generate actual images, if a section of the report would greatly benefit from a visual illustration based on the learnings, you can indicate this with a descriptive placeholder, e.g., \`[An illustrative diagram comparing X and Y would be beneficial here, based on learning Z.]\` Use sparingly and only where highly relevant.

**Important:** This report should NOT contain any inline citations (e.g., [1], [2]) and should NOT include a "References" or "Sources" section at the end listing sources. Focus purely on synthesizing the information from the learnings into a narrative report.

Respond ONLY with the final report content in Markdown. No additional text, greetings, or explanations before or after the report.
`;

const ELABORATION_SYSTEM_INSTRUCTION = `You are an expert editor. Your task is to rewrite and elaborate on the provided draft report to improve its detail, flow, and adherence to Markdown best practices, without altering the core meaning, facts, or narrative. Expand on existing points using only the information implicitly or explicitly available in the draft. Ensure all Markdown, including tables, LaTeX, and Mermaid diagrams, is correctly formatted. If the draft is short, significantly expand it to be more comprehensive. Do not add citations or a references section if the draft does not have them.`;


export async function* synthesizeReport(
  topic: string,
  strategy: string, // This is the "Report Plan"
  executedSteps: ExecutedStepOutcome[],
  researchMode: ResearchMode
): AsyncGenerator<ReportChunk, void, undefined> {
  if (!API_KEY) throw new Error("API Key not configured.");
  const modelName = getModelNameForMode(researchMode);
  
  // Note: Sources are compiled here for potential use in the prompt context,
  // but the REPORT_SYNTHESIS_SYSTEM_INSTRUCTION now explicitly forbids using them for citations/references.
  const allSourcesList: Source[] = [];
  const sourceMap = new Map<string, number>(); // Still useful for internal mapping if needed, but not for output
  let sourceCounter = 1;

  executedSteps.forEach(step => {
    step.sources.forEach(source => {
      if (source.uri && !sourceMap.has(source.uri)) {
        allSourcesList.push(source);
        sourceMap.set(source.uri, sourceCounter++);
      }
    });
  });
  
  const formattedSourcesForPromptContext = allSourcesList.map(s => `${sourceMap.get(s.uri!)}. ${s.title || 'N/A'} (${s.uri})`).join('\n');

  const findingsDetails = executedSteps.map((s, index) => {
    // The "(Internal Citation Marks for Synthesis...)" part is no longer relevant for the AI's output,
    // but can remain in the prompt data as it doesn't hurt.
    const sourceNumbers = s.sources
      .map(src => sourceMap.get(src.uri))
      .filter(num => num !== undefined)
      .map(num => `[${num}]`) // These won't be used by AI for output due to prompt change
      .join('');
    return `
--- Learning from Step ${index + 1} ---
Action Taken: ${s.action}
AI's Reason for Action: ${s.reason || 'N/A'}
Summary of Findings: ${s.summary}
Original Sources for this Finding (context for AI, not for citation in report): ${s.sources.map(src => `"${src.title || src.uri}" (${src.uri})`).join(', ') || 'None explicitly listed for this summary step.'}
(Internal Helper Marks, AI to IGNORE for output: ${sourceNumbers || "N/A"}) 
--- End Learning from Step ${index + 1} ---`;
  }).join('\n\n');

  const initialReportPromptContent = `
Research Topic: <query>${topic}</query>
Report Plan (User-Confirmed Strategy): <PLAN>${strategy}</PLAN>
Consolidated Learnings: <LEARNINGS>${findingsDetails || "No detailed research steps or findings were recorded."}</LEARNINGS>
List of Unique Numbered Sources (Context for AI, DO NOT use for citation/references section in report): <SOURCES_CONTEXT_DATA>${formattedSourcesForPromptContext || "No sources were gathered."}</SOURCES_CONTEXT_DATA>
User's Writing Requirement: <REQUIREMENT>Write a final, comprehensive research report. Make it detailed, include ALL relevant learnings, adhere to the PLAN, and follow all formatting guidelines. Output ONLY Markdown. DO NOT include inline citations or a 'References' section.</REQUIREMENT>`;

  let initialReportFullText = "";
  try {
    console.log(`Synthesizing initial report (model: ${modelName}). Prompt length (approx chars): ${initialReportPromptContent.length}`);
    const initialStream = geminiApiCallStreamWithRetry({ 
        model: modelName, 
        contents: initialReportPromptContent,
        config: {
            systemInstruction: REPORT_SYNTHESIS_SYSTEM_INSTRUCTION,
            // Omit thinkingConfig
        }
    });

    for await (const chunk of initialStream) {
      const textChunk = chunk.text;
      if (typeof textChunk === 'string') {
        initialReportFullText += textChunk;
        yield { type: 'initial_chunk', content: textChunk };
      }
    }
    
    if (!initialReportFullText.trim()) {
        initialReportFullText = `# ${topic}\n\nInitial report generation failed to produce content. \n\n## Learnings Overview:\n${findingsDetails || "No learnings available."}\n\n## Sources (Context Only):\n${formattedSourcesForPromptContext || "No sources available."}`;
        yield { type: 'initial_chunk', content: initialReportFullText }; // yield the fallback as a single chunk
    }
    yield { type: 'initial_report_complete', fullReportText: initialReportFullText };

  } catch (error) {
    console.error("Error synthesizing initial report stream:", error);
    const errorMsg = `Error during initial report synthesis: ${error instanceof Error ? error.message : String(error)}`;
    initialReportFullText = `# Report Generation Error for: ${topic}\n\n${errorMsg}\n\n## Learnings:\n${findingsDetails || "No learnings recorded."}\n\n## Compiled Sources (Context Only):\n${formattedSourcesForPromptContext || "No sources recorded."}`;
    yield { type: 'initial_chunk', content: initialReportFullText }; // Yield error content
    yield { type: 'initial_report_complete', fullReportText: initialReportFullText, error: errorMsg }; // Signal completion with error
    // Do not proceed to elaboration if initial failed catastrophically
    return; 
  }

  // Elaboration step
  const elaborationPromptContent = `
Draft Report Artifact:
<artifact>
${initialReportFullText}
</artifact>

Task:
Rewrite and significantly elaborate on the draft report artifact.
1.  **Enhance Detail:** Expand on existing points, provide more context or explanation where appropriate, drawing only from information inferable from the artifact. Do not introduce new factual claims not supported by the artifact.
2.  **Improve Flow & Cohesion:** Ensure smooth transitions between paragraphs and sections.
3.  **Markdown Excellence:** Verify and correct all Markdown formatting, including headings, lists, tables, LaTeX, and Mermaid diagrams.
4.  **Maximize Length (within reason):** If the artifact is brief, expand it considerably to create a more comprehensive and detailed final report. Aim for thoroughness.
5.  **Preserve Meaning:** Do NOT change the original meaning, story, or factual content of the artifact.
6.  **No Citations/References:** Ensure the elaborated report does NOT contain any inline citations or a "References" section, even if the draft artifact accidentally included some.

Respond ONLY with the updated, elaborated report content in Markdown. No wrappers or conversational text.`;

  let elaboratedReportFullText = "";
  try {
    console.log(`Elaborating report (model: ${modelName}). Initial length: ${initialReportFullText.length}`);
    const elaboratedStream = geminiApiCallStreamWithRetry({ 
        model: modelName, 
        contents: elaborationPromptContent,
        config: {
            systemInstruction: ELABORATION_SYSTEM_INSTRUCTION,
            // Omit thinkingConfig
        }
    });

    for await (const chunk of elaboratedStream) {
      const textChunk = chunk.text;
      if (typeof textChunk === 'string') {
        elaboratedReportFullText += textChunk;
        yield { type: 'elaborated_chunk', content: textChunk };
      }
    }
    
    // Check if elaboration actually added content
    if (!elaboratedReportFullText.trim() || elaboratedReportFullText.length < initialReportFullText.length * 0.8) {
        console.warn("Elaboration did not significantly change the report or returned minimal content. The initial report will be considered final.");
        yield { type: 'elaborated_report_complete', fullReportText: initialReportFullText, note: "Elaboration minimal, using initial."};
        return;
    }
    yield { type: 'elaborated_report_complete', fullReportText: elaboratedReportFullText };

  } catch (error) {
    console.warn("Error during report elaboration. The initial report version will be considered final.", error);
    const errorMsg = `Error during report elaboration: ${error instanceof Error ? error.message : String(error)}. The initial report is available.`;
    yield { type: 'elaborated_chunk', content: `\n\n--- \n**Note:** Elaboration step failed: ${errorMsg}\n---` };
    yield { type: 'elaborated_report_complete', fullReportText: initialReportFullText, error: errorMsg, note: "Elaboration failed, using initial." };
  }
}
