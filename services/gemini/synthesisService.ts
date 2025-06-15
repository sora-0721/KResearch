
import { ExecutedStepOutcome, ResearchMode, Source } from '../../types';
import { getModelNameForMode } from './constants';
import { geminiApiCallWithRetry } from './utils';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY missing in synthesisService.ts");
}

const EXPERT_ANALYST_SUMMARY_SYSTEM_PROMPT = "You are an expert analyst. Your task is to extract key, dense, and unique information from the provided text. Focus on factual details, including specific entities (people, places, companies, products), metrics, numbers, and dates when available. Be accurate, objective, and concise. Ensure each extracted learning is distinct and not repetitive.";

export const summarizeText = async (textToSummarize: string, researchMode: ResearchMode, topic?: string): Promise<string> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  if (!(textToSummarize || "").trim()) return "No content to summarize.";
  const modelName = getModelNameForMode(researchMode);

  // Guidelines from Prompts 8 & 10 for learnings
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
    const response = await geminiApiCallWithRetry({ 
        model: modelName, 
        contents: prompt,
        config: {
            systemInstruction: EXPERT_ANALYST_SUMMARY_SYSTEM_PROMPT
        }
    });
    return (response.text || "").trim();
  } catch (error) {
    console.error("Error summarizing text:", error);
    return `Summarization failed. Preview of content: ${(textToSummarize || "").substring(0, 200)}... (Error: ${error instanceof Error ? error.message : String(error)})`;
  }
};


const REPORT_SYNTHESIS_SYSTEM_INSTRUCTION = `You are an expert researcher and technical writer tasked with producing a comprehensive, well-structured, and meticulously cited final research report.

Key Persona Traits (Embody these - Prompt 12):
-   **Expertise:** Assume the user is a highly experienced analyst; no need to oversimplify. Be as detailed as possible.
-   **Accuracy & Thoroughness:** Mistakes erode trust. Ensure all information is correct and well-supported by the provided learnings.
-   **Organization:** Be highly organized. Structure the report logically.
-   **Proactivity (in structuring):** Anticipate the user's need for a clear, readable, and comprehensive document.
-   **Detail-Oriented:** Provide detailed explanations.
-   **Objectivity:** While you can highlight significant findings, maintain a neutral and objective tone overall.
-   **Consideration of Nuance:** If learnings present different perspectives, reflect this in the report.

General Output Guidelines (Prompt 13 & 14):
-   **Report Structure:** Adhere to the provided Report Plan. Each section must have a distinct purpose with no content overlap. Combine related concepts. Every section MUST be directly relevant to the main topic. Avoid tangential sections.
-   **Content Depth:** Aim for a detailed report (e.g., target 5+ pages of equivalent content if it were a document, though output is plain text Markdown). Include ALL relevant learnings.
-   **Markdown Formatting:**
    -   Headings: Use \`#\` through \`######\`. Use Emoji before titles/subtitles where appropriate (e.g., \`🔢### 1. Section Title\`).
    -   Paragraphs: Separate with blank lines.
    -   Bold Emphasis: Use asterisks (\`**important content**\`) for key terms or findings.
    -   Links: Use \`[link text](URL)\` if URLs are part of learnings (primarily for the References section).
    -   Lists: Unordered (\`-\`, \`*\`, \`+\`), Ordered (\`1.\`, \`2.\`).
    -   Code: Inline (\`code\`), Blocks (\`\`\`language\\ncode\\n\`\`\`).
    -   Quotes: \`> quote\`
    -   Horizontal Rule: \`---\`
    -   Tables: Basic GFM table syntax. No extra spaces for alignment. If complex, use multiple simple tables. No nested tables.
    -   LaTeX: Inline (\`$E=mc^2$\`), Block (\`$$E=mc^2$$\`).
-   **Mermaid Diagrams (Prompt 1 & 13):** If the content lends itself to visualizing relationships (e.g., organizational structures, processes, concept maps), generate Mermaid graph code (TD or LR).
    -   Use unique English letter/abbreviation node IDs (e.g., \`EntityA["Full Name"]\`).
    -   Label relationships (\`A -->|"Relationship"| B\`).
    -   Ensure all text in Mermaid (nodes, labels) is wrapped in double quotes (e.g., \`"Node Text"\`).
    -   Embed the Mermaid code block (e.g., \`\`\`mermaid\\ngraph TD; A["Node A"] --> B["Node B"];\\n\`\`\`) in the relevant section of the report.
-   **Image Placeholder (Conceptual - as per Prompt 2, adapted):** While you cannot generate actual images, if a section of the report would greatly benefit from a visual illustration based on the learnings, you can indicate this with a descriptive placeholder, e.g., \`[An illustrative diagram comparing X and Y would be beneficial here, based on learning Z.]\` Use sparingly and only where highly relevant.

Citation Rules (Prompt 5, adapted for clarity):
1.  **Source Compilation (Mental Step):** You will be provided with research learnings, many of which will have associated sources (titles and URIs). Mentally (or as a pre-processing step if it helps your generation), compile a single, unique list of all these sources. Assign a number to each unique source (e.g., 1. SourceA URI, 2. SourceB URI).
2.  **Inline Citations:** When writing the report, if specific information, data, or assertions are derived from one or more of these original sources (as indicated in the learnings), cite them using their assigned numbers in square brackets at the end of the relevant sentence or paragraph (e.g., "The sky is blue [1]. This phenomenon is also discussed extensively [2][3].").
3.  **Citation Relevance & Limit:** Only cite the most relevant sources for a given piece of information. Do not include more than 3 citation numbers for a single sentence/paragraph.
4.  **No Direct Citation of "Learnings":** Do not cite the "learning" itself (e.g., "[Learning 3]"). Cite the underlying original source(s) associated with that learning.
5.  **References Section:** At the VERY END of the report, create a section titled "## References". List all the unique, numbered sources here, with their title and URI. Example:
    \`\`\`
    ## References
    1.  [Source Title A](Source_URI_A)
    2.  [Source Title B](Source_URI_B)
    \`\`\`

Respond ONLY with the final report content in Markdown. No additional text, greetings, or explanations before or after the report.
`;


export const synthesizeReport = async (
  topic: string,
  strategy: string, // This is the "Report Plan"
  executedSteps: ExecutedStepOutcome[],
  researchMode: ResearchMode
): Promise<string> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  const modelName = getModelNameForMode(researchMode);

  // Consolidate all unique sources and map them to numbers for citation
  const allSourcesList: Source[] = [];
  const sourceMap = new Map<string, number>();
  let sourceCounter = 1;

  executedSteps.forEach(step => {
    step.sources.forEach(source => {
      if (source.uri && !sourceMap.has(source.uri)) {
        allSourcesList.push(source);
        sourceMap.set(source.uri, sourceCounter++);
      }
    });
  });
  
  const formattedSourcesForPrompt = allSourcesList.map(s => `${sourceMap.get(s.uri!)}. ${s.title || 'N/A'} (${s.uri})`).join('\n');

  // Prepare learnings, now explicitly linking them to their original numbered sources
  const findingsDetails = executedSteps.map((s, index) => {
    const sourceNumbers = s.sources
      .map(src => sourceMap.get(src.uri))
      .filter(num => num !== undefined)
      .map(num => `[${num}]`)
      .join('');
    return `
--- Learning from Step ${index + 1} ---
Action Taken: ${s.action}
AI's Reason for Action: ${s.reason || 'N/A'}
Summary of Findings: ${s.summary}
Original Sources for this Finding: ${s.sources.map(src => `"${src.title || src.uri}" (${src.uri})`).join(', ') || 'None explicitly listed for this summary step, infer from context if possible.'}
(Internal Citation Marks for Synthesis: ${sourceNumbers || "N/A"}) 
--- End Learning from Step ${index + 1} ---`;
  }).join('\n\n');

  // Incorporating elements from Prompts 2 (structure), 12 (persona), 13 (typography/Mermaid), 14 (integration), 5 (citations)
  const initialReportPrompt = `
Research Topic: <query>${topic}</query>

Report Plan (User-Confirmed Strategy):
<PLAN>
${strategy}
</PLAN>

Consolidated Learnings from Research (with source hints for your citation process):
<LEARNINGS>
${findingsDetails || "No detailed research steps or findings were recorded. Synthesize based on the topic and plan if possible, or state that insufficient data is available."}
</LEARNINGS>

List of Unique Numbered Sources (for your reference when creating the bibliography and inline citations):
<SOURCES_BIBLIOGRAPHY_DATA>
${formattedSourcesForPrompt || "No sources were gathered during research."}
</SOURCES_BIBLIOGRAPHY_DATA>

User's Writing Requirement (General Goal):
<REQUIREMENT>
Write a final, comprehensive research report.
Make it as detailed as possible, aiming for significant depth (equivalent of 5+ pages).
Include ALL relevant information from the <LEARNINGS>.
Ensure the report adheres to the <PLAN>.
Follow all typographical, structural, citation, and Mermaid diagram guidelines provided in the System Instructions.
The final output should be ONLY the report content in Markdown.
</REQUIREMENT>
`;

  let initialReportText = "";
  try {
    console.log(`Synthesizing initial report (model: ${modelName}). Prompt length (approx chars): ${initialReportPrompt.length}`);
    const initialResponse = await geminiApiCallWithRetry({ 
        model: modelName, 
        contents: initialReportPrompt,
        config: {
            systemInstruction: REPORT_SYNTHESIS_SYSTEM_INSTRUCTION,
            // Consider adjusting temperature for creative tasks like report writing if needed, e.g., temperature: 0.7
        }
    });
    initialReportText = (initialResponse.text || "").trim();
    if (!initialReportText) {
        // Fallback if AI returns empty
        initialReportText = `# ${topic}\n\nInitial report generation failed to produce content. \n\n## Learnings Overview:\n${findingsDetails || "No learnings available."}\n\n## Sources:\n${formattedSourcesForPrompt || "No sources available."}`;
    }
  } catch (error) {
    console.error("Error synthesizing initial report:", error);
    // Provide a more structured error fallback
    initialReportText = `# Report Generation Error for: ${topic}\n\nAn error occurred during the initial report synthesis: ${error instanceof Error ? error.message : String(error)}\n\nBelow are the raw learnings and sources that were compiled:\n\n## Learnings:\n${findingsDetails || "No learnings recorded."}\n\n## Compiled Sources:\n${formattedSourcesForPrompt || "No sources recorded."}`;
    // No re-throw here, let the (potentially error-laden) initialReportText be returned for the elaboration step or final display.
  }

  // Elaboration step (Prompt 3: Rewrite to Markdown, don't change meaning)
  // The system instruction for elaboration can be simpler, focusing on refinement and expansion.
  const ELABORATION_SYSTEM_INSTRUCTION = `You are an expert editor. Your task is to rewrite and elaborate on the provided draft report to improve its detail, flow, and adherence to Markdown best practices, without altering the core meaning, facts, or narrative. Expand on existing points using only the information implicitly or explicitly available in the draft. Ensure all Markdown, including tables, LaTeX, and Mermaid diagrams, is correctly formatted. If the draft is short, significantly expand it to be more comprehensive.`;

  const elaborationPrompt = `
Draft Report Artifact:
<artifact>
${initialReportText}
</artifact>

Task:
Rewrite and significantly elaborate on the draft report artifact.
1.  **Enhance Detail:** Expand on existing points, provide more context or explanation where appropriate, drawing only from information inferable from the artifact. Do not introduce new factual claims not supported by the artifact.
2.  **Improve Flow & Cohesion:** Ensure smooth transitions between paragraphs and sections.
3.  **Markdown Excellence:** Verify and correct all Markdown formatting, including headings, lists, tables, LaTeX, and Mermaid diagrams.
4.  **Maximize Length (within reason):** If the artifact is brief, expand it considerably to create a more comprehensive and detailed final report. Aim for thoroughness.
5.  **Preserve Meaning:** Do NOT change the original meaning, story, or factual content of the artifact.

Respond ONLY with the updated, elaborated report content in Markdown. No wrappers or conversational text.
`;

  try {
    console.log(`Elaborating report (model: ${modelName}). Initial length: ${initialReportText.length}`);
    // Using a potentially more capable model or different settings for elaboration could be an option,
    // but sticking to researchMode's model for now.
    const elaboratedResponse = await geminiApiCallWithRetry({ 
        model: modelName, 
        contents: elaborationPrompt,
        config: {
            systemInstruction: ELABORATION_SYSTEM_INSTRUCTION,
            // Temperature might be slightly higher for elaboration if more "creative" expansion is desired, e.g. 0.7-0.8
            // temperature: 0.7 
        }
    });
    const elaboratedReportText = (elaboratedResponse.text || "").trim();
    
    // Return elaborated if it's substantial, otherwise fall back to initial.
    // This check helps if elaboration fails or returns minimal content.
    if (elaboratedReportText.length > initialReportText.length * 0.8 || elaboratedReportText.length > 200) { // Heuristic: elaboration should be significant
        console.log(`Elaboration successful. New length: ${elaboratedReportText.length}`);
        return elaboratedReportText;
    } else {
        console.warn("Elaboration did not significantly change the report or returned minimal content. Falling back to initial report. Elaborated length:", elaboratedReportText.length);
        return initialReportText;
    }
  } catch (error) {
    console.warn("Error during report elaboration. Returning the initial report version.", error);
    return initialReportText; // Fallback to initial report text if elaboration fails
  }
};
