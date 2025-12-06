# KResearch
> Autonomous Deep-Dive Research Agent

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.0-black)
![Gemini](https://img.shields.io/badge/Powered%20by-Gemini-4E88D4)

**KResearch** is an advanced AI-powered research assistant designed to go beyond simple search queries. Utilizing a unique "Spiral" workflow, it orchestrates a team of specialized AI agents—Manager, Worker, and Verifier—to iteratively explore, gather, and validate information, delivering deep, comprehensive, and accurate research reports.

## Table of Contents
- [About The Project](#about-the-project)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## About The Project

Traditional AI search often yields shallow results. KResearch solves this by implementing a "Spiral" architecture where the system loops around a topic, continuously assessing its own knowledge gaps and dispatching agents to fill them until a sufficiency threshold is met.

The interface is built with the **"Liquid Glass"** design system, offering a visually stunning, modern experience that feels alive and responsive.

### Built With
*   **Next.js 15**
*   **React**
*   **Tailwind CSS** (Custom "Liquid Glass" System)
*   **Google Gemini API**

## Key Features

*   **🌀 Spiral Workflow:** An iterative execution loop that dives deeper into topics based on sufficiency scores.
*   **🤖 Multi-Agent System:**
    *   **Manager:** Plans the research and assesses progress.
    *   **Worker:** Executes specific search tasks and gathers facts.
    *   **Verifier:** Deduplicates findings and resolves conflicts.
    *   **Writer:** Synthesizes the final comprehensive report.
*   **✨ Liquid Glass UI:** A premium, glassmorphic interface with fluid animations and dynamic interactions.
*   **🧠 Gemini Powered:** Leverages the latest Google Gemini models (Flash, Pro) for high-speed reasoning and context handling.

## Getting Started

Follow these steps to set up KResearch locally.

### Prerequisites

*   Node.js (v18 or higher)
*   npm
*   A Google Gemini API Key

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/yourusername/kresearch.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd kresearch
    ```
3.  Install dependencies:
    ```sh
    npm install
    ```
4.  Start the development server:
    ```sh
    npm run dev
    ```

## Usage

1.  Open your browser and navigate to `http://localhost:3000`.
2.  **Enter API Key**: Input your Google Gemini API Key in the configuration panel.
3.  **Select Models**: Choose your preferred models for the Manager and Worker agents (e.g., `gemini-2.0-flash-exp`).
4.  **Start Research**: Enter a complex query (e.g., "Why did the Rabbit R1 fail?") and click "Start".
5.  **Watch the Spiral**: Observe the agents in real-time as they plan, search, and verify information.
6.  **Read Report**: Once the research is complete, read the generated comprehensive report.

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [https://github.com/yourusername/kresearch](https://github.com/yourusername/kresearch)
