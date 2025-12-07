"use client";

export type Language = "en" | "zh";

export const translations = {
    en: {
        // Header
        subtitle: "Autonomous Deep-Dive Agent",

        // Query Input
        queryPlaceholder: "What do you want to research?",
        start: "Start",
        stop: "Stop",
        continuePrevious: "Continue Previous Session",

        // Settings
        settings: "Settings",
        apiProvider: "API Provider",
        gemini: "Gemini",
        openai: "OpenAI",
        geminiApiKeys: "Gemini API Keys",
        addKey: "Add Key",
        getKeyFrom: "Get your key from",
        googleAiStudio: "Google AI Studio",
        apiKeysRotate: "API keys will rotate automatically (1→2→3→1→2→3...) for each call.",
        baseUrlOptional: "Base URL (Optional)",
        baseUrlHint: "Leave empty to use the default Google API endpoint.",
        openaiApiKey: "OpenAI API Key",
        apiHostOptional: "API Host (Optional)",
        openaiHint: "When OpenAI is configured, search will use DuckDuckGo instead of Google grounding.",

        // Research Mode
        researchMode: "Research Mode",
        standard: "Standard",
        deeper: "Deeper",
        deeperModeHint: "Deeper mode enforces minimum iterations for exhaustive research.",
        standardModeHint: "Standard mode completes when sufficient information is gathered.",
        minIterations: "Min Iterations",
        maxIterations: "Max Iterations",

        // Model Config
        modelConfig: "Model Configuration",
        managerModel: "Manager",
        workerModel: "Worker",
        verifierModel: "Verifier",
        clarifierModel: "Clarifier",
        loadingModels: "Loading models...",
        noModelsFound: "No models found",

        // History
        history: "History",
        noHistory: "No history yet.",
        clearHistory: "Clear History",
        running: "Running",
        complete: "Complete",
        failed: "Failed",
        score: "Score",

        // Research Panel
        iteration: "Iteration",
        status: "Status",
        mode: "Mode",
        target: "Target",
        timeUsed: "Time Used",

        // Logs Panel
        thoughts: "Thoughts",
        nextStep: "Next Step",
        findings: "Findings",
        verification: "Verification",
        validFindings: "valid findings",
        conflicts: "conflicts",

        // Final Report
        finalReport: "Final Research Report",
        regenerate: "Regenerate",
        regenerating: "Regenerating...",
        copyReport: "Copy Report",
        copied: "✓ Copied!",

        // Clarification
        clarifying: "Clarifying",
        thinking: "Thinking...",
        awaitingResponse: "Awaiting your response",
        skipStartResearch: "Skip & Start Research",
        typeResponse: "Type your response...",
        send: "Send",
        analyzingResponse: "Analyzing response...",

        // Alerts
        alertApiKeyQuery: "Please provide an API Key and a Query.",
    },
    zh: {
        // Header
        subtitle: "自主深度研究代理",

        // Query Input
        queryPlaceholder: "你想研究什么?",
        start: "开始",
        stop: "停止",
        continuePrevious: "继续上次会话",

        // Settings
        settings: "设置",
        apiProvider: "API 提供商",
        gemini: "Gemini",
        openai: "OpenAI",
        geminiApiKeys: "Gemini API 密钥",
        addKey: "添加密钥",
        getKeyFrom: "从这里获取密钥",
        googleAiStudio: "Google AI Studio",
        apiKeysRotate: "API 密钥将自动轮换 (1→2→3→1→2→3...)。",
        baseUrlOptional: "Base URL (可选)",
        baseUrlHint: "留空则使用默认的 Google API 端点。",
        openaiApiKey: "OpenAI API 密钥",
        apiHostOptional: "API Host (可选)",
        openaiHint: "配置 OpenAI 后，搜索将使用 DuckDuckGo 而非 Google。",

        // Research Mode
        researchMode: "研究模式",
        standard: "标准",
        deeper: "深度",
        deeperModeHint: "深度模式强制执行最小迭代次数以进行详尽研究。",
        standardModeHint: "标准模式在收集到足够信息后完成。",
        minIterations: "最小迭代次数",
        maxIterations: "最大迭代次数",

        // Model Config
        modelConfig: "模型配置",
        managerModel: "管理者",
        workerModel: "执行者",
        verifierModel: "验证者",
        clarifierModel: "澄清者",
        loadingModels: "加载模型中...",
        noModelsFound: "未找到模型",

        // History
        history: "历史记录",
        noHistory: "暂无历史记录。",
        clearHistory: "清空历史",
        running: "进行中",
        complete: "完成",
        failed: "失败",
        score: "分数",

        // Research Panel
        iteration: "迭代次数",
        status: "状态",
        mode: "模式",
        target: "目标",
        timeUsed: "用时",

        // Logs Panel
        thoughts: "思考",
        nextStep: "下一步",
        findings: "发现",
        verification: "验证",
        validFindings: "有效发现",
        conflicts: "冲突",

        // Final Report
        finalReport: "最终研究报告",
        regenerate: "重新生成",
        regenerating: "重新生成中...",
        copyReport: "复制报告",
        copied: "✓ 已复制!",

        // Clarification
        clarifying: "澄清中",
        thinking: "思考中...",
        awaitingResponse: "等待您的回复",
        skipStartResearch: "跳过并开始研究",
        typeResponse: "输入您的回复...",
        send: "发送",
        analyzingResponse: "分析回复中...",

        // Alerts
        alertApiKeyQuery: "请提供 API 密钥和查询内容。",
    },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function getTranslation(language: Language, key: TranslationKey): string {
    return translations[language][key];
}
