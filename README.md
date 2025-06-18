# KResearch

KResearch is an advanced web application that leverages the Google Gemini API to conduct in-depth research on a user-specified topic. It features an iterative process that includes clarifying the research scope with the user, devising a research strategy, performing automated research actions using Google Search, and finally, synthesizing a comprehensive, well-structured report. The entire research process is streamed live to the user.

## Core Features

*   **Iterative Topic Clarification:** Asks insightful clarifying questions, driven by an 'expert researcher' persona, to refine the research scope and user intent.
*   **AI-Driven Research Strategy:** Generates a high-level research strategy based on the clarified topic, emulating an 'expert strategist'.
*   **Automated Iterative Research:** Executes a series of research steps (queries to Google Search via Gemini API) to gather information, with improved decision-making for novel and impactful actions.
*   **Sophisticated AI Reasoning:** Incorporates an 'expert researcher/analyst' persona throughout the process for more insightful questions, robust strategies, analytical decision-making, and detailed summaries/reports.
*   **Improved "Learning" Extraction:** AI focuses on extracting information-dense, unique learnings, including specific entities (people, places, companies), metrics, numbers, and dates.
*   **Configurable Iteration Count:** Users can specify the maximum number of research iterations (1-500).
*   **Comprehensive Report Generation:** Synthesizes all findings into a detailed Markdown report, featuring:
    *   **Advanced Formatting:** Native support for tables, KaTeX for mathematical formulas, and **Mermaid diagrams** for visualizing relationships (e.g., concept maps, hierarchies).
    *   **Enhanced Detail & Structure:** AI aims for in-depth content, following the user-approved strategy and best practices for report organization and adhering to typographical guidelines. Report generation is a two-step streaming process: an initial draft followed by an elaboration pass.
    *   **No Citations/References by Default:** The final report, by default, focuses on synthesizing the narrative without inline citations or a "References" section.
*   **Two Research Modes:**
    *   **Normal Mode:** Uses the `gemini-2.5-flash` model for quick and efficient results.
    *   **Deeper Mode:** Uses the `gemini-2.5-pro` model for higher quality and more in-depth analysis.
*   **Live Research Log:** Provides a real-time stream of the AI's thoughts, actions, and findings.
*   **User-Friendly Interface:** Clean, responsive UI built with React and Tailwind CSS.
*   **Error Handling & Retry Logic:** Robust error handling for API calls, including retry mechanisms for transient issues.
*   **Keep-Alive Pings:** Provides feedback to the user during long operations.
*   **Checkpoint System:** Allows users to save and load research progress at key stages (after clarification, after strategy approval), useful for resuming after interruptions.

## Tech Stack

*   **Frontend:** React, TypeScript
*   **Styling:** Tailwind CSS
*   **AI Backend:** Google Gemini API (`@google/genai`)
*   **Markdown Rendering:** `marked` (for basic Markdown), `KaTeX` (for math), `Mermaid` (for diagrams).

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
    *   If the API key is not configured, the application will display a prominent warning.

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
    *   *Checkpoint "Clarification Complete" is saved if this phase completes successfully.*

3.  **Strategy Review Phase:**
    *   Review the AI's proposed research strategy. You can edit it.
    *   Choose to "Start Research Directly" (AI uses its first proposed action automatically) or "Review First Action & Proceed" (you get to review/edit the AI's first specific action).
    *   *Checkpoint "Strategy Approved" is saved if you proceed from this phase.*

4.  **Action Review Phase (if not skipped):**
    *   Review and optionally edit the AI's first proposed research action (e.g., a search query).
    *   Click "Execute this Action & Start Research".

5.  **Execution Phase:**
    *   Monitor the **Live Research Log** as the AI executes research steps.
    *   The UI will provide "Still working..." pings if an operation takes longer than a minute.
    *   You can "Cancel" the research if needed.

6.  **Report Phase:**
    *   A **Final Research Report** is displayed. The generation process involves an initial draft stream, followed by an elaboration stream.
    *   The report is in Markdown and includes synthesized information, potentially incorporating tables, KaTeX formulas, and Mermaid diagrams.
    *   You can copy the report as Markdown or download it as a `.txt` file.
    *   The UI also provides a separate, collapsible view of "All Sources Gathered" for quick reference (though these are not included in the report itself by default).
    *   Click "Start New Research" to reset.

7.  **Error Handling:**
    *   Error messages guide you if issues arise (e.g., API failures, unexpected empty responses).

8.  **Loading Checkpoints:**
    *   Use the "Load Checkpoint" button (icon in the header) to roll back to previously saved states if the process hangs or you need to restart from a specific point.

## Project Structure

*   `index.html`: Main HTML file with CDN links for Tailwind, Marked, Mermaid, and KaTeX.
*   `index.tsx`: React app entry point.
*   `App.tsx`: Core application logic, state management, and phase routing.
*   `types.ts`: TypeScript definitions for data structures and types.
*   `services/`: Gemini API interaction and research flow logic.
    *   `geminiService.ts`: Aggregator for service functions.
    *   `gemini/`: Specific modules for different parts of the research process:
        *   `clarificationService.ts`: Handles topic clarification and question generation.
        *   `strategyService.ts`: Generates the research strategy.
        *   `executionService.ts`: Decides and executes research steps using Google Search.
        *   `synthesisService.ts`: Summarizes text and synthesizes the final report.
        *   `utils.ts`: Core Gemini API call utilities (including retry logic and stream handling), JSON parsing.
        *   `constants.ts`: Model names, retry limits, etc.
*   `components/`: React UI components.
    *   `phases/`: Components for each distinct research phase (Input, Clarification, Strategy Review, Action Review, Executing, Report, Error).
    *   `AppHeader.tsx`: Application title header.
    *   `ApiKeyWarning.tsx`: Warning for missing API key.
    *   `ActionButton.tsx`: Standardized button component.
    *   `LoadingSpinner.tsx`: Reusable loading spinner.
    *   `MarkdownRenderer.tsx`: Renders Markdown content, including KaTeX and Mermaid. Optimized for streaming.
    *   `ResearchLogView.tsx`: Displays the live research log.
    *   `SourcesListView.tsx`: Displays all gathered sources.
    *   `icons.tsx`: SVG icon components.
*   `utils/`: General utility functions and application constants.
    *   `appConstants.ts`: Default values, API key status check.
    *   `formatters.ts`: Helper functions (e.g., `formatDuration`).
*   `metadata.json`: Application metadata for the environment.
*   `README.md`: This file.

## Important Notes

*   **API Key Security:** Your Google Gemini API Key is sensitive. Ensure it is kept secure and only exposed as `process.env.API_KEY`.
*   **Information Verification:** Always critically evaluate AI-generated information.
*   **API Costs:** Be mindful of potential costs associated with Google Gemini API usage.
*   **Model Updates:** The application uses `gemini-2.5-flash` for "Normal" mode and `gemini-2.5-pro` for "Deeper" mode, as per current guidelines. These are subject to change based on model availability and updates.
*   **Offline Functionality:** While the UI is responsive, core functionality relies on API calls and requires an internet connection.
*   **Error Reporting:** The app will attempt to display errors from the API or internal processes directly to the user.
