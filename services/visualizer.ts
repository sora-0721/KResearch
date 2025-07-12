import { ai } from './geminiClient';
import { getModel } from './models';
import { ResearchMode, FileData } from '../types';

const cleanHtmlResponse = (text: string | undefined): string => {
    if (!text) {
        return `<!DOCTYPE html><html><head><title>Error</title><style>body{background-color:#121212;color:white;font-family:sans-serif;text-align:center;padding-top:50px;}</style></head><body><h1>Generation Failed</h1><p>The AI failed to generate a visual report. The response was empty.</p></body></html>`;
    }
    const fenceRegex = /^```html\s*\n?(.*?)\n?\s*```$/s;
    const match = text.match(fenceRegex);
    if (match && match[1]) {
        return match[1].trim();
    }
    if (text.trim().startsWith('<!DOCTYPE html>')) {
        return text.trim();
    }
    return `<!DOCTYPE html><html><head><title>Error</title><style>body{background-color:#121212;color:white;font-family:sans-serif;text-align:center;padding-top:50px;}</style></head><body><h1>Generation Error</h1><p>The AI returned a malformed response that could not be rendered.</p><pre style="white-space:pre-wrap;text-align:left;background-color:#333;padding:1rem;border-radius:8px;">${text}</pre></body></html>`;
}

export const generateVisualReport = async (
    reportMarkdown: string,
    mode: ResearchMode
): Promise<string> => {
    const prompt = `You are a world-class AI agent specializing in UI/UX design and front-end development. Your mission is to transform a dry, text-based research report (in Markdown) into a **breathtaking, single-file, interactive HTML visual experience**. Your goal is not just to style the text, but to fundamentally **re-imagine and represent the information visually**. A text-heavy output is considered a failure.

**Core Theme: "Liquid Glass" (Dark Mode)**
- **Foundation:** Dark, subtly graded background (e.g., \`#121212\` to \`#1f2128\`).
- **Glass Panels:** Use translucent, frosted glass panels (\`background: rgba(25, 25, 35, 0.2); backdrop-filter: blur(25px);\`) for content containers.
- **Depth & Light:** Use soft, glowing highlights (\`box-shadow\`), subtle borders (\`border: 1px solid rgba(255, 255, 255, 0.1);\`), and vibrant accent colors.
- **Typography:** Use a modern, professional font (e.g., Inter, Lexend from Google Fonts, imported in the \`<style>\` tag).

**--- CRITICAL MISSION: VISUAL TRANSFORMATION & ASSET CREATION ---**
This is your most important directive. You must **interpret the meaning** of the text and create rich, visual components to represent it.

**1. Generate Original SVG Graphics & Icons:**
   - **YOUR PRIMARY TASK IS TO CREATE VISUALS.** For each major section and key data point, you must design and embed custom, meaningful SVG icons and illustrations. Do not use generic placeholders.
   - **Hero Illustration:** For the main title, create a prominent, abstract SVG illustration that visually captures the report's topic.
   - **Section Icons:** Each major section (e.g., "Executive Summary") must have a unique, custom-designed SVG icon.

**2. Create Rich Data Visualizations:**
   - **Charts & Graphs:** If the text mentions data, percentages, or trends, visualize it. Create bar charts, radial progress bars, or simple line graphs using HTML/CSS or inline SVG. For a SWOT analysis, create a 4-quadrant visual diagram.
   - **Render Mermaid.js:** The report may contain \`\`\`mermaid\`\`\` code blocks. You MUST render these diagrams correctly and style them to match the "Liquid Glass" theme. Ensure your page includes the necessary Mermaid.js script.

**3. Build Interactive Components:**
   - **Cards & Layout:** Transform each section into a distinct "GlassCard". Use a dynamic layout (e.g., CSS Grid).
   - **Interactivity:** Add subtle hover effects and smooth, on-scroll animations (e.g., using \`IntersectionObserver\`) to make the page feel alive.

**Example Transformation:**
- **Markdown:** \`- Market share increased by 15%.\`
- **EXCELLENT HTML (Your goal):**
  \`\`\`html
  <div class="stat-card">
    <svg><!-- custom-generated icon of a pie chart --></svg>
    <div class="stat-info">
      <p>Market Share Growth</p>
      <div class="progress-bar-container"><div class="progress-bar" style="width: 15%;"></div></div>
    </div>
    <span class="stat-value">15%</span>
  </div>
  \`\`\`

**--- TECHNICAL REQUIREMENTS ---**
- **Single File:** ALL CSS and JavaScript must be inlined. No external file links (except for Google Fonts or a Mermaid.js CDN).
- **Self-Contained & Robust:** All assets must be included. The output MUST be a complete, valid HTML document.
- **Responsive:** Flawless on all screen sizes.

**Input Report:**
<REPORT_MARKDOWN>
${reportMarkdown}
</REPORT_MARKDOWN>

**Final Output:**
Respond ONLY with the complete, raw HTML code. The response must start with \`<!DOCTYPE html>\` and end with \`</html>\`. Do not add any explanation. Your success is measured by the visual richness and originality of the output.`;

    const response = await ai.models.generateContent({
        model: getModel('visualizer', mode),
        contents: prompt,
        config: { temperature: 0.6 }
    });

    return cleanHtmlResponse(response.text);
};

export const regenerateVisualReportWithFeedback = async (
    originalMarkdown: string,
    previousHtml: string,
    feedback: string,
    file: FileData | null,
    mode: ResearchMode
): Promise<string> => {
    const prompt = `You are a UI/UX Designer AI. You previously created a visual HTML report. Now, you must revise it based on user feedback.

**Original Source Material (for context):**
<REPORT_MARKDOWN>
${originalMarkdown}
</REPORT_MARKDOWN>

**Previous HTML Version (The one you are improving):**
<PREVIOUS_HTML>
${previousHtml}
</PREVIOUS_HTML>

**User Feedback (This is the most important instruction):**
<FEEDBACK>
${feedback}
</FEEDBACK>

**Attached File (if any, provides additional context for the revision):**
${file ? `A file named '${file.name}' was attached with the feedback.` : "No file was attached."}

**Your Task:**
Generate a **new, complete, single-file HTML document** that incorporates the user's feedback while retaining the original "Liquid Glass" dark theme and visual richness.
-   If the feedback asks for a style change, apply it universally.
-   If the feedback points out a missing visualization, create it.
-   If the feedback provides new information (textually or in a file), integrate it seamlessly.
-   Adhere to all technical requirements from the original creation (inline CSS/JS, responsive, self-contained).

**Final Output:**
Respond ONLY with the new, complete, raw HTML code, starting with \`<!DOCTYPE html>\`. Do not add any explanation.`;

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: prompt }];
    if (file) {
        parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
    }

    const response = await ai.models.generateContent({
        model: getModel('visualizer', mode),
        contents: { parts },
        config: { temperature: 0.6 }
    });

    return cleanHtmlResponse(response.text);
};
