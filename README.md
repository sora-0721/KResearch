# KResearch

> An advanced AI-powered deep research application that synthesizes information from numerous sources to generate comprehensive, well-documented reports on complex topics.

<!-- Badges (Placeholders) -->
![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=flat-square&logo=tailwind-css)

## Table of Contents
- [About The Project](#about-the-project)
  - [Key Features](#key-features)
  - [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgements](#acknowledgements)

## About The Project

KResearch is a sophisticated research assistant designed to tackle complex topics by leveraging a multi-agent AI system. It automates the process of in-depth research by planning, executing, and synthesizing information from the web. The final output is a comprehensive, well-structured report complete with source citations and a visual knowledge graph, making it an invaluable tool for students, analysts, and anyone needing to quickly develop a deep understanding of a subject.

### Key Features

*   **Conversational AI Agents**: Utilizes 'Alpha' (Strategist) and 'Beta' (Tactician) agents who collaborate to create an optimal research plan.
*   **Iterative Research Cycles**: Performs multiple cycles of planning, searching, and reading to gather comprehensive insights.
*   **Real-time Progress Tracking**: Visualizes the AI's entire thought process in a detailed, step-by-step timeline.
*   **Configurable Research Modes**: Offers 'Balanced', 'Deep Dive', 'Fast', and 'Ultra Fast' modes to tailor the research process to your needs.
*   **Comprehensive Final Report**: Generates a well-structured final report in Markdown, synthesizing all findings.
*   **Knowledge Graph Visualization**: Automatically creates a Mermaid.js graph to visualize key entities and their relationships.
*   **Sourced Citations**: Grounds all research using Google Search and provides a complete list of sources.
*   **Modern & Responsive UI**: A sleek, glassmorphism design built with React and Tailwind CSS, featuring light and dark modes.

### Built With

*   [React](https://react.dev/)
*   [TypeScript](https://www.typescriptlang.org/)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [Google Gemini API (`@google/genai`)](https://github.com/google/generative-ai-js)
*   [Mermaid.js](https://mermaid.js.org/)

## Getting Started

This section will guide you through setting up and running the KResearch application locally.

### Prerequisites

You must have a Google Gemini API key to use this application.
*   **Google Gemini API Key**: Obtain from [Google AI Studio](https://aistudio.google.com/app/apikey).
*   **Node.js**: It's recommended to use a recent LTS version.
*   A package manager like **npm** or **yarn**.

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/KuekHaoYang/KResearch.git
    cd KResearch
    ```
2.  Install NPM packages
    ```sh
    npm install
    ```
3.  Set up your environment variables as described in the [Configuration](#configuration) section.


## Usage

Start the development server:
```sh
npm run dev
```
Then navigate to the local address provided in your terminal (e.g., `http://localhost:5173`) in your browser.

1.  **Select a Research Mode**: Choose from 'Balanced', 'Deep Dive', 'Fast', or 'Ultra Fast'.
2.  **Enter Your Query**: Type your research topic or question into the main text area.
3.  **Start Research**: Click the "Start Research" button or press `Enter`.
4.  **Monitor Progress**: Observe the research log as the AI agents work. You can stop the process at any time.
5.  **Review Results**: Once complete, the final report, knowledge graph, and citations will be displayed.

## Configuration

The application requires a Google Gemini API key to function. The key is accessed via `process.env.API_KEY`.

For local development, create a `.env` file in the root of the project and add your key:
```dotenv
# .env file
API_KEY="YOUR_GEMINI_API_KEY"
```
Alternatively, you can enter the API key directly in the application's **Settings** modal. This key will be stored securely in your browser's local storage.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**. Please refer to the project's issue tracker for ways to contribute. If you have suggestions, please open an issue to discuss it first.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Kuek Hao Yang - [@KuekHaoYang](https://github.com/KuekHaoYang)

Project Link: [https://github.com/KuekHaoYang/KResearch](https://github.com/KuekHaoYang/KResearch)

For issues, questions, or feature requests, please use the [GitHub Issues](https://github.com/KuekHaoYang/KResearch/issues) page.

## Acknowledgements
*   Powered by the Google Gemini API.
*   UI inspired by modern glassmorphism design trends.