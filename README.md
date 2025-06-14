# KResearch

KResearch is an advanced web application that leverages the Google Gemini API to conduct in-depth research on a user-specified topic. It features an iterative process that includes clarifying the research scope with the user, devising a research strategy, performing automated research actions using Google Search, and finally, synthesizing a comprehensive, well-cited report. The entire research process is streamed live to the user.

## Core Features

*   **Iterative Topic Clarification:** Asks clarifying questions to refine the research scope and user intent.
*   **AI-Driven Research Strategy:** Generates a high-level research strategy based on the clarified topic.
*   **Automated Iterative Research:** Executes a series of research steps (queries to Google Search via Gemini API) to gather information.
*   **Configurable Iteration Count:** Users can specify the maximum number of research iterations (1-500).
*   **Source Tracking & Citation:** Identifies and lists sources used for each piece of information.
*   **Comprehensive Report Generation:** Synthesizes all findings into a detailed Markdown report, potentially including tables, KaTeX formulas, and Mermaid diagrams.
*   **Two Research Modes:**
    *   **Normal Mode:** Uses the `gemini-2.5-flash-preview-05-20` model for quick and efficient results.
    *   **Deeper Mode:** Uses the `gemini-2.5-pro-preview-06-05` model for higher quality and more in-depth analysis. The mode primarily influences the model and AI's approach, while iteration count is a separate setting.
*   **Live Research Log:** Provides a real-time stream of the AI's thoughts, actions, and findings.
*   **User-Friendly Interface:** Clean, responsive UI built with React and Tailwind CSS.
*   **Error Handling & Retry Logic:** Robust error handling for API calls.

## Tech Stack

*   **Frontend:** React, TypeScript
*   **Styling:** Tailwind CSS
*   **AI Backend:** Google Gemini API (`@google/genai`)

## Prerequisites

*   A modern web browser.
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
    *   Enter your desired research topic in the text area.
    *   Select a **Research Mode**:
        *   **Normal Mode:** Utilizes `gemini-2.5-flash-preview-05-20` for generally faster results.
        *   **Deeper Mode:** Employs `gemini-2.5-pro-preview-06-05` for more thorough analysis.
    *   Set the **Maximum Research Iterations** (e.g., 1-500). This determines how many distinct research actions the AI will attempt.
    *   Click "Next: Clarify Topic".

2.  **Iterative Clarification Phase (Optional):**
    *   The AI will generate a set of questions to help clarify your research topic.
    *   Answer these questions to provide more context and focus.
    *   Click "Submit Answers & Proceed". The AI may ask more follow-up questions if needed.
    *   Alternatively, you can click "Skip Clarification & Generate Strategy" to proceed directly with the initial topic.
    *   You can go "Back to Topic" to change your initial input.

3.  **Strategy Review Phase:**
    *   The AI will propose a research strategy based on your topic and clarifications. You can edit this strategy.
    *   Click "Review First Action & Proceed" to move to the next step where you'll review the AI's first specific research action. The button will indicate the selected mode and iteration count.
    *   You can go "Back to Clarifications" if you want to refine the inputs further.

4.  **Action Review Phase:**
    *   The AI will propose its first specific research action (e.g., a search query) based on the approved strategy.
    *   Review this proposed action. You can edit it if needed.
    *   Click "Execute this Action & Start Research" to begin the automated research process with this first action.
    *   You can go "Back to Strategy Review" if you want to modify the overall strategy.

5.  **Execution Phase:**
    *   The application will now show a "Research in Progress..." screen.
    *   A **Live Research Log** will display the AI's thought process, actions (search queries), summaries of findings, and any errors. The log header will also show your selected mode and maximum iterations.
    *   You can monitor the progress here. This phase can take some time, depending on the number of iterations and complexity.
    *   If you need to stop the research, click the "Cancel" button.

6.  **Report Phase:**
    *   Once the research is complete (or cancelled and has results), a **Final Research Report** will be displayed. The topic line will also reflect the mode and iterations used.
    *   The report is formatted in Markdown and includes synthesized information from the research.
    *   Below the report, you can find:
        *   **All Sources Gathered:** A list of unique sources cited during the research.
    *   Click "Start New Research" to reset the application and begin a new topic. You can also copy the report as Markdown or download it as a .txt file.

7.  **Error Handling:**
    *   If an error occurs, an error message will be displayed. You can usually go back or reset the application.

## Project Structure

*   `index.html`: The main HTML file that loads the application.
*   `index.tsx`: The entry point for the React application, renders the `App` component.
*   `App.tsx`: The core React component containing the main application logic, state management, and UI rendering for different phases.
*   `types.ts`: Defines TypeScript interfaces and types used throughout the application.
*   `services/`: Contains all logic for interacting with the Google Gemini API and managing the research flow.
    *   `geminiService.ts`: Aggregates and exports service functions.
    *   `gemini/`: Directory for specific Gemini service modules (clarification, strategy, execution, synthesis, utils, constants).
*   `components/`: Contains all React components.
    *   `phases/`: Components specific to each phase of the research application.
    *   `icons.tsx`: SVG icons used in the UI.
    *   `LoadingSpinner.tsx`: A simple loading spinner component.
    *   `MarkdownRenderer.tsx`: Component for rendering Markdown content.
    *   Other shared UI components.
*   `utils/`: Utility functions and constants.
    *   `appConstants.ts`: Application-wide constants.
    *   `formatters.ts`: Formatting functions (e.g., for duration).
*   `metadata.json`: Contains metadata about the application, like its name and description.
*   `README.md`: This file.

## Important Notes

*   **API Key Security:** Your Google Gemini API Key is sensitive. Ensure it is kept secure and only exposed to the application environment as `process.env.API_KEY`. Do not commit it to version control or share it publicly.
*   **Information Verification:** While KResearch aims to provide accurate and cited information, all findings are generated by an AI. Always critically evaluate and verify important information from the generated reports and cited sources.
*   **API Costs:** Use of the Google Gemini API may incur costs depending on your usage and Google's pricing model. Be mindful of this when performing research with a high number of iterations.