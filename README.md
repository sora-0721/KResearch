# KResearch

KResearch is an advanced web application that leverages the Google Gemini API to conduct in-depth research on a user-specified topic. It features an iterative process that includes clarifying the research scope with the user, devising a research strategy, performing automated research actions using Google Search, and finally, synthesizing a comprehensive, well-structured report with detailed citations. The entire research process is streamed live to the user.

## Core Features

*   **Iterative Topic Clarification:** Asks insightful clarifying questions, driven by an 'expert researcher' persona, to refine the research scope and user intent.
*   **AI-Driven Research Strategy:** Generates a high-level research strategy based on the clarified topic, emulating an 'expert strategist'.
*   **Automated Iterative Research:** Executes a series of research steps (queries to Google Search via Gemini API) to gather information, with improved decision-making for novel and impactful actions.
*   **Sophisticated AI Reasoning:** Incorporates an 'expert researcher/analyst' persona throughout the process for more insightful questions, robust strategies, analytical decision-making, and detailed summaries/reports.
*   **Improved "Learning" Extraction:** AI focuses on extracting information-dense, unique learnings, including specific entities (people, places, companies), metrics, numbers, and dates.
*   **Configurable Iteration Count:** Users can specify the maximum number of research iterations (1-500).
*   **Comprehensive Report Generation:** Synthesizes all findings into a detailed Markdown report, featuring:
    *   **Advanced Formatting:** Native support for tables, KaTeX for mathematical formulas, and **Mermaid diagrams** for visualizing relationships (e.g., concept maps, hierarchies).
    *   **Structured Citations:** Implements robust inline numerical citations (e.g., `[1]`, `[2][3]`) and a dedicated "References" section at the end of the report, listing all unique sources with titles and URIs.
    *   **Enhanced Detail & Structure:** AI aims for in-depth content, following the user-approved strategy and best practices for report organization and adhering to typographical guidelines.
*   **Two Research Modes:**
    *   **Normal Mode:** Uses the `gemini-2.5-flash-preview-05-20` model for quick and efficient results.
    *   **Deeper Mode:** Uses the `gemini-2.5-pro-preview-06-05` model for higher quality and more in-depth analysis.
*   **Live Research Log:** Provides a real-time stream of the AI's thoughts, actions, and findings.
*   **User-Friendly Interface:** Clean, responsive UI built with React and Tailwind CSS.
*   **Error Handling & Retry Logic:** Robust error handling for API calls.

## Tech Stack

*   **Frontend:** React, TypeScript
*   **Styling:** Tailwind CSS
*   **AI Backend:** Google Gemini API (`@google/genai`)

## Prerequisites

*   A modern web browser with JavaScript enabled.
*   A **Google Gemini API Key**.

## Setup and Running

KResearch is designed to run in an environment where the Google Gemini API key is securely managed.

1.  **API Key Configuration:**
    *   The application **requires** a Google Gemini API Key to function.
    *   This API key **must** be set as an environment variable named `API_KEY`.
    *   **DO NOT** embed your API key directly into the code. The application is designed to pick it up from `process.env.API_KEY`.

    Example (conceptual, how you set environment variables depends on your deployment platform):
    ```bash
    export API_KEY="YOUR_GEMINI_API_KEY"
    ```

2.  **Running the Application:**
    *   Once the `API_KEY` environment variable is set, open the `index.html` file in your web browser. The application should load and be ready to use.
    *   If the API key is not configured, the application will display a message indicating this.

## How to Use

1.  **Input Phase:**
    *   Enter your desired research topic.
    *   Select a **Research Mode** (`Normal` or `Deeper`).
    *   Set the **Maximum Research Iterations** (1-500).
    *   Click "Next: Clarify Topic".

2.  **Iterative Clarification Phase (Optional):**
    *   The AI will generate questions to clarify your topic. Answer them.
    *   Submit answers. The AI may ask follow-up questions or proceed if sufficient.
    *   Optionally, skip clarification.

3.  **Strategy Review Phase:**
    *   Review the AI's proposed research strategy. You can edit it.
    *   Choose to "Start Research Directly" (AI uses its first proposed action automatically) or "Review First Action & Proceed" (you get to review/edit the AI's first specific action).

4.  **Action Review Phase (if not skipped):**
    *   Review and optionally edit the AI's first proposed research action (e.g., a search query).
    *   Click "Execute this Action & Start Research".

5.  **Execution Phase:**
    *   Monitor the **Live Research Log** as the AI executes research steps.
    *   You can "Cancel" the research if needed.

6.  **Report Phase:**
    *   A **Final Research Report** is displayed.
    *   The report is in Markdown and includes synthesized information, potentially incorporating tables, KaTeX formulas, and Mermaid diagrams.
    *   It features **inline numerical citations** (e.g., `[1]`, `[2][3]`) for statements derived from research.
    *   A **"References" section** at the end of the report lists all unique sources with their titles and URIs.
    *   You can copy the report as Markdown or download it as a `.txt` file.
    *   The UI also provides a separate, collapsible view of "All Sources Gathered" for quick reference.
    *   Click "Start New Research" to reset.

7.  **Error Handling:**
    *   Error messages guide you if issues arise.

## Project Structure

*   `index.html`: Main HTML file.
*   `index.tsx`: React app entry point.
*   `App.tsx`: Core application logic and UI.
*   `types.ts`: TypeScript definitions.
*   `services/`: Gemini API interaction and research flow logic.
    *   `geminiService.ts`: Service function aggregator.
    *   `gemini/`: Specific modules (clarification, strategy, execution, synthesis, utils, constants).
*   `components/`: React UI components.
    *   `phases/`: Components for each research phase.
    *   `MarkdownRenderer.tsx`: Renders Markdown, KaTeX, and Mermaid.
*   `utils/`: Utility functions and constants.
*   `metadata.json`: Application metadata.
*   `README.md`: This file.

## Important Notes

*   **API Key Security:** Your Google Gemini API Key is sensitive. Ensure it is kept secure and only exposed as `process.env.API_KEY`.
*   **Information Verification:** Always critically evaluate AI-generated information and verify against cited sources.
*   **API Costs:** Be mindful of potential costs associated with Google Gemini API usage.
