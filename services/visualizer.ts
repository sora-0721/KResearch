
import { ai } from './geminiClient';
import { visualizerModels } from './models';
import { ResearchMode } from '../types';

const cleanHtmlResponse = (text: string): string => {
    const fenceRegex = /^```html\s*\n?(.*?)\n?\s*```$/s;
    const match = text.match(fenceRegex);
    if (match && match[1]) {
        return match[1].trim();
    }
    if (text.trim().startsWith('<!DOCTYPE html>')) {
        return text.trim();
    }
    return text;
}


export const generateVisualReport = async (
    reportMarkdown: string,
    mode: ResearchMode
): Promise<string> => {
    const prompt = `You are a world-class AI agent specializing in UI/UX design and front-end development. Your mission is to transform a dry, text-based research report (in Markdown) into a **breathtaking, single-file, interactive HTML visual experience**. Your goal is not just to style the text, but to fundamentally **re-imagine and represent the information visually**.

**Core Theme: "Liquid Glass" (Dark Mode)**
The aesthetic must be a sophisticated, dark-themed "Liquid Glass" design.
- **Foundation:** Dark, subtly graded background (e.g., \`#121212\` to \`#1f2128\`).
- **Glass Panels:** Use translucent, frosted glass panels (\`background: rgba(25, 25, 35, 0.2); backdrop-filter: blur(25px);\`) for content containers.
- **Depth & Light:** Use soft, glowing highlights (\`box-shadow\`), subtle borders (\`border: 1px solid rgba(255, 255, 255, 0.1);\`), and vibrant accent colors that appear to emanate from within components.
- **Typography:** Use a modern, professional font (e.g., Inter, Lexend from Google Fonts, imported in the \`<style>\` tag).

**--- CRITICAL MISSION: VISUAL TRANSFORMATION ---**
This is the most important instruction. Do not simply place the markdown text into HTML tags. You must **interpret the meaning** of the text and create rich, visual components to represent it.

**1. Generate Illustrative Graphics & Icons:**
   - **Hero Illustration:** For the main title, create a prominent, abstract SVG illustration that visually captures the essence of the report's topic.
   - **Section Icons:** Each major section (e.g., "Executive Summary", "Thematic Analysis") must have a unique, custom-designed SVG icon.
   - **Conceptual Icons:** Throughout the report, use smaller inline SVG icons to add visual context to key points, lists, and data. For example, a point about "growth" could have an upward-trending arrow icon.

**2. Create Data Visualizations:**
   - **Charts & Graphs:** If the text mentions data, percentages, or trends, visualize it. Create bar charts, radial progress bars, or simple line graphs using HTML and CSS (or inline SVG). For a SWOT analysis, create a 4-quadrant visual diagram, not just a list.
   - **Render Mermaid.js:** The report may contain \`\`\`mermaid\`\`\` code blocks. You MUST render these diagrams correctly and style them to match the "Liquid Glass" theme. Ensure your page includes the necessary Mermaid.js script and initialization code.

**3. Build Rich, Interactive Components:**
   - **Cards & Layout:** Transform each section of the markdown into a distinct visual component, like a "GlassCard". Use a dynamic layout (e.g., CSS Grid) to arrange these components engagingly.
   - **Interactive Elements:** Add subtle hover effects and smooth, on-scroll animations (\`IntersectionObserver\` is excellent for this) to make the page feel alive. Animate elements fading or sliding into view as the user scrolls.

**Example Transformation:**
- **Markdown:** \`- Market share increased by 15%.\`
- **Bad HTML:** \`<li>Market share increased by 15%.</li>\`
- **EXCELLENT HTML:**
  \`\`\`html
  <div class="stat-card">
    <svg><!-- icon of a pie chart --></svg>
    <div class="stat-info">
      <p>Market Share Growth</p>
      <div class="progress-bar-container"><div class="progress-bar" style="width: 15%;"></div></div>
    </div>
    <span class="stat-value">15%</span>
  </div>
  \`\`\`

**--- TECHNICAL REQUIREMENTS ---**
- **Single File:** ALL CSS and JavaScript must be inlined within \`<style>\` and \`<script>\` tags. No external file links.
- **Responsive:** The layout must be flawless on all screen sizes.
- **Self-Contained:** All assets (SVGs, scripts like Mermaid.js) must be included in the single HTML file. You can use a CDN for Mermaid.js.

**Input Report:**
<REPORT_MARKDOWN>
${reportMarkdown}
</REPORT_MARKDOWN>

**Final Output:**
Respond ONLY with the complete, raw HTML code. The response must start with \`<!DOCTYPE html>\` and end with \`</html>\`. Do not add any explanation or markdown formatting. Your career as a top-tier designer depends on the quality of this output.`;

    const response = await ai.models.generateContent({
        model: visualizerModels[mode],
        contents: prompt,
        config: { temperature: 0.6 }
    });

    return cleanHtmlResponse(response.text);
};
