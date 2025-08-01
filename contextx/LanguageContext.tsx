



import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';

// Embed JSON content directly to avoid module resolution issues
const en = {
  "langCode": "en",
  "history": "History",
  "settings": "Settings",
  "github": "View on GitHub",
  "appTagline": "Your AI-powered deep research assistant.",
  "modeBalanced": "Balanced",
  "modeBalancedDesc": "Optimal mix for quality and speed.",
  "modeDeepDive": "Deep Dive",
  "modeDeepDiveDesc": "Highest quality using the most powerful models.",
  "modeFast": "Fast",
  "modeFastDesc": "Quick results with capable models.",
  "modeUltraFast": "Ultra Fast",
  "modeUltraFastDesc": "Lightning-fast results for quick checks.",
  "advancedSearch": "Advanced: Guide Initial Search",
  "guidedSearchPlaceholder": "Initial search topics, one per line...",
  "mainQueryPlaceholder": "What is the future of AI in healthcare? (You can also attach a file)",
  "attachFile": "Attach file",
  "removeFile": "Remove file",
  "startResearch": "Start Research",
  "stopResearch": "Stop Research",
  "continueResearch": "Continue Research",
  "generateReport": "Generate Report",
  "generatingReport": "Generating Report...",
  "toggleResearchLog": "{{action}} Research Log",
  "show": "Show",
  "hide": "Hide",
  "startNewResearch": "Start New Research",
  "footerPoweredBy": "Powered by Gemini.",
  "refiningRequest": "Refining Your Request",
  "refiningRequestDesc": "To get the best results, the AI may ask a few clarifying questions.",
  "clarificationPlaceholder": "Your answer...",
  "clarificationPlaceholderInitial": "Please provide the research topic you would like to refine.",
  "sendAnswer": "Send Answer",
  "skipAndStart": "Skip & Start Research",
  "thinking": "Thinking...",
  "waiting": "Waiting...",
  "researchHistory": "Research History",
  "close": "Close",
  "searchHistory": "Search history...",
  "noMatchingHistory": "No matching history found.",
  "tryDifferentSearch": "Try a different search term.",
  "historyAppearsHere": "Completed research will appear here.",
  "editTitle": "Edit Title",
  "delete": "Delete",
  "load": "Load",
  "clearAllHistory": "Clear All History",
  "researching": "Researching...",
  "researchComplete": "Research Complete",
  "searchingFor": "Searching For:",
  "readAndSynthesized": "Read & Synthesized",
  "sources": "sources",
  "thought": "Thought",
  "outline": "Outlining Report",
  "agentAlpha": "Agent Alpha",
  "agentBeta": "Agent Beta",
  "visualizingReport": "Agent is generating your visual report...",
  "noVisualReport": "No visual report generated yet.",
  "apiKey": "API Key",
  "parameters": "Parameters",
  "models": "Models",
  "restoreDefaults": "Restore Defaults",
  "dark": "Dark",
  "light": "Light",
  "citations": "Citations",
  "untitledSource": "Untitled Source",
  "finalReport": "Final Report",
  "copied": "Copied!",
  "failed": "Failed!",
  "copy": "Copy",
  "reportOnly": "Report Only",
  "reportAndCitations": "Report & Citations",
  "regenerating": "Regenerating",
  "success": "Success!",
  "regenerateReport": "Regenerate Report",
  "visualizing": "Visualizing...",
  "visualize": "Visualize",
  "researchSummary": "Research Summary",
  "researchTime": "Research Time",
  "sourcesFound": "Sources Found",
  "searchCycles": "Search Cycles",
  "translate": "Translate",
  "addEmojis": "Add Emojis",
  "addFinalPolish": "Add Final Polish",
  "readingLevel": "Reading Level",
  "adjustLength": "Adjust Length",
  "customEdit": "Custom Edit",
  "adjustLengthTitle": "Adjust Length",
  "muchShorter": "Much Shorter",
  "shorter": "Shorter",
  "longer": "Longer",
  "muchLonger": "Much Longer",
  "readingLevelTitle": "Reading Level",
  "kindergarten": "Kindergarten",
  "middleSchool": "Middle School",
  "highSchool": "High School",
  "college": "College",
  "graduateSchool": "Graduate School",
  "addEmojisTitle": "Add Emojis",
  "emojisToWords": "To Words",
  "emojisToSections": "To Sections",
  "emojisToLists": "To Lists",
  "emojisRemoveAll": "Remove All",
  "customEditTitle": "Custom Edit",
  "customEditPlaceholder": "e.g., Rewrite this in a more casual tone, using the attached file for context.",
  "attach": "Attach",
  "apply": "Apply",
  "translateReportTitle": "Translate Report",
  "language": "Language",
  "languagePlaceholder": "e.g., Chinese, Malay",
  "style": "Style",
  "colloquial": "Colloquial",
  "literal": "Literal",
  "translating": "Translating...",
  "geminiApiKeys": "Gemini API Key(s)",
  "apiKeysConfiguredByHost": "API Key(s) are configured by the application host.",
  "apiKeysPlaceholder": "Enter your Gemini API Key(s), one per line.",
  "apiBaseUrl": "API Base URL (Optional)",
  "apiBaseUrlDesc": "Change this only if you need to use a proxy or a different API endpoint.",
  "apiBaseUrlPlaceholder": "e.g., https://generativelanguage.googleapis.com",
  "modelConfig": "Model Configuration",
  "refreshModelList": "Refresh Model List",
  "loading": "Loading...",
  "modelConfigDesc": "Override default models for each agent. Select \"Default\" to use the model specified by the current research mode.",
  "defaultModel": "Default",
  "researchParams": "Research Parameters",
  "minCycles": "Min Research Cycles",
  "minCyclesHelp": "Minimum cycles before finishing.",
  "maxCycles": "Max Research Cycles",
  "maxCyclesHelp": "Hard limit for research iterations.",
  "maxDebateRounds": "Max Debate Rounds",
  "maxDebateRoundsHelp": "Agent planning conversation length.",
  "uncapped": "Uncapped",
  "feedback": "Feedback",
  "giveFeedback": "Give Feedback",
  "cancel": "Cancel",
  "feedbackPlaceholder": "e.g., 'Make the charts blue' or 'Add a section about financial impact.'",
  "generateNewVersion": "Generate New Version",
  "feedbackSuccess": "Success! Regenerating...",
  "feedbackError": "Update failed. Try again.",
  "visualReport": "Visual Report",
  "regenerate": "Regenerate",
  "download": "Download",
  "changeLanguage": "Change language",
  "apiKeyRequiredTitle": "API Key Required",
  "apiKeyRequiredMessage": "Please set your Gemini API key in the settings before starting research.",
  "emptyQueryTitle": "Empty Query",
  "emptyQueryMessage": "Cannot start research with an empty query.",
  "initialSearchFailedTitle": "Initial Search Failed",
  "allApiKeysFailedTitle": "All API Keys Failed",
  "allApiKeysFailedMessage": "You can retry the operation or check your keys in Settings.",
  "researchStoppedTitle": "Research Stopped",
  "researchStoppedMessage": "The research process was cancelled by the user.",
  "researchFailedTitle": "Research Failed",
  "clarificationFailedTitle": "Clarification Failed",
  "apiKeysFailedMessage": "All API keys failed. You can retry the operation.",
  "clarifiedContextFailed": "Clarification process failed. Proceeding with original query.",
  "generatingOutlineTitle": "Generating Outline",
  "generatingOutlineMessage": "Creating a structure for the final report.",
  "reportGeneratedTitle": "Report Generated",
  "reportGeneratedMessage": "Report generated from the research completed so far.",
  "synthesisFailedTitle": "Synthesis Failed",
  "synthesisFailedMessage": "Synthesis failed. Please check your keys in Settings.",
  "visualizationFailedTitle": "Visualization Failed",
  "regeneratingOutlineTitle": "Generating New Outline",
  "regeneratingOutlineMessage": "Re-structuring report before regeneration.",
  "reportRegeneratedTitle": "Report Regenerated",
  "reportRegeneratedMessage": "A new version of the report has been generated.",
  "regenerationFailedTitle": "Regeneration Failed",
  "reportUpdatedTitle": "Report Updated",
  "reportUpdatedMessage": "The report has been successfully rewritten.",
  "rewriteFailedTitle": "Rewrite Failed",
  "historyItemRemovedTitle": "History item removed",
  "historyItemRemovedMessage": "The selected item has been deleted from your research history.",
  "historyClearedTitle": "History cleared",
  "historyClearedMessage": "All items have been removed from your research history.",
  "translationCompleteTitle": "Translation Complete",
  "translationCompleteMessage": "Report translated and saved as a new version.",
  "translationFailedTitle": "Translation Failed",
  "defaultsLoadedTitle": "Defaults Loaded",
  "defaultsLoadedMessage": "Settings have been reset to default and saved.",
  "roles": "Roles",
  "selectRole": "Select Role",
  "defaultRole": "Default",
  "defaultRoleDesc": "Standard research agent.",
  "builtIn": "Built-in",
  "custom": "Custom",
  "manageRoles": "Manage Roles",
  "editRole": "Edit Role",
  "createNewRole": "Create New Role",
  "edit": "Edit",
  "roleNamePlaceholder": "Role Name...",
  "rolePromptPlaceholder": "Describe the persona and instructions for this role. e.g., 'Act as a skeptical financial analyst. Focus on risks and financial viability...'",
  "generateNameEmoji": "Generate",
  "refinePrompt": "Refine",
  "creativePrompt": "Creative",
  "attachContextFile": "Attach Context File",
  "saveRole": "Save Role",
  "confirmDeleteRole": "Are you sure you want to delete this role?",
  "roleAI": "Role AI"
};
const zh = {
  "langCode": "zh",
  "history": "历史记录",
  "settings": "设置",
  "github": "在 GitHub 上查看",
  "appTagline": "您的人工智能深度研究助手。",
  "modeBalanced": "平衡模式",
  "modeBalancedDesc": "质量与速度的最佳组合。",
  "modeDeepDive": "深度研究",
  "modeDeepDiveDesc": "使用最强模型以获得最高质量。",
  "modeFast": "快速模式",
  "modeFastDesc": "使用高效模型快速得出结果。",
  "modeUltraFast": "超快模式",
  "modeUltraFastDesc": "闪电般快速的结果，适用于快速检查。",
  "advancedSearch": "高级：引导初始搜索",
  "guidedSearchPlaceholder": "初始搜索主题，每行一个...",
  "mainQueryPlaceholder": "人工智能在医疗保健领域的未来是什么？（您也可以附加文件）",
  "attachFile": "附加文件",
  "removeFile": "移除文件",
  "startResearch": "开始研究",
  "stopResearch": "停止研究",
  "continueResearch": "继续研究",
  "generateReport": "生成报告",
  "generatingReport": "正在生成报告...",
  "toggleResearchLog": "{{action}}研究日志",
  "show": "显示",
  "hide": "隐藏",
  "startNewResearch": "开始新研究",
  "footerPoweredBy": "由 Gemini 驱动。",
  "refiningRequest": "正在优化您的请求",
  "refiningRequestDesc": "为了获得最佳结果，AI 可能会问几个澄清性问题。",
  "clarificationPlaceholder": "您的回答...",
  "clarificationPlaceholderInitial": "请提供您希望优化的研究主题。",
  "sendAnswer": "发送回答",
  "skipAndStart": "跳过并开始研究",
  "thinking": "思考中...",
  "waiting": "等待中...",
  "researchHistory": "研究历史",
  "close": "关闭",
  "searchHistory": "搜索历史...",
  "noMatchingHistory": "未找到匹配的历史记录。",
  "tryDifferentSearch": "请尝试其他搜索词。",
  "historyAppearsHere": "完成的研究将在此处显示。",
  "editTitle": "编辑标题",
  "delete": "删除",
  "load": "加载",
  "clearAllHistory": "清除所有历史记录",
  "researching": "研究中...",
  "researchComplete": "研究完成",
  "searchingFor": "正在搜索：",
  "readAndSynthesized": "阅读与整合",
  "sources": "个来源",
  "thought": "想法",
  "outline": "报告大纲",
  "agentAlpha": "智能体 Alpha",
  "agentBeta": "智能体 Beta",
  "visualizingReport": "智能体正在生成您的可视化报告...",
  "noVisualReport": "尚未生成可视化报告。",
  "apiKey": "API 密钥",
  "parameters": "参数",
  "models": "模型",
  "restoreDefaults": "恢复默认值",
  "dark": "深色",
  "light": "浅色",
  "citations": "引用",
  "untitledSource": "无标题来源",
  "finalReport": "最终报告",
  "copied": "已复制！",
  "failed": "失败！",
  "copy": "复制",
  "reportOnly": "仅报告",
  "reportAndCitations": "报告与引用",
  "regenerating": "重新生成中",
  "success": "成功！",
  "regenerateReport": "重新生成报告",
  "visualizing": "可视化中...",
  "visualize": "可视化",
  "researchSummary": "研究摘要",
  "researchTime": "研究用时",
  "sourcesFound": "找到的来源",
  "searchCycles": "搜索周期",
  "translate": "翻译",
  "addEmojis": "添加表情",
  "addFinalPolish": "最终润色",
  "readingLevel": "阅读水平",
  "adjustLength": "调整长度",
  "customEdit": "自定义编辑",
  "adjustLengthTitle": "调整长度",
  "muchShorter": "大幅缩短",
  "shorter": "缩短",
  "longer": "加长",
  "muchLonger": "大幅加长",
  "readingLevelTitle": "阅读水平",
  "kindergarten": "幼儿园",
  "middleSchool": "初中",
  "highSchool": "高中",
  "college": "大学",
  "graduateSchool": "研究生",
  "addEmojisTitle": "添加表情",
  "emojisToWords": "添加到词语",
  "emojisToSections": "添加到章节",
  "emojisToLists": "添加到列表",
  "emojisRemoveAll": "全部移除",
  "customEditTitle": "自定义编辑",
  "customEditPlaceholder": "例如，用更随意的语气重写，并使用附加文件作为上下文。",
  "attach": "附加",
  "apply": "应用",
  "translateReportTitle": "翻译报告",
  "language": "语言",
  "languagePlaceholder": "例如，中文、马来语",
  "style": "风格",
  "colloquial": "口语化",
  "literal": "字面",
  "translating": "翻译中...",
  "geminiApiKeys": "Gemini API 密钥",
  "apiKeysConfiguredByHost": "API 密钥由应用主机配置。",
  "apiKeysPlaceholder": "输入您的 Gemini API 密钥，每行一个。",
  "apiBaseUrl": "API 基地址 (可选)",
  "apiBaseUrlDesc": "仅在需要使用代理或不同 API 端点时更改此项。",
  "apiBaseUrlPlaceholder": "例如, https://generativelanguage.googleapis.com",
  "modelConfig": "模型配置",
  "refreshModelList": "刷新模型列表",
  "loading": "加载中...",
  "modelConfigDesc": "为每个智能体覆盖默认模型。选择“默认”以使用当前研究模式指定的模型。",
  "defaultModel": "默认",
  "researchParams": "研究参数",
  "minCycles": "最少研究周期",
  "minCyclesHelp": "完成前的最少周期。",
  "maxCycles": "最多研究周期",
  "maxCyclesHelp": "研究迭代的硬性限制。",
  "maxDebateRounds": "最多辩论回合",
  "maxDebateRoundsHelp": "智能体规划对话的长度。",
  "uncapped": "无上限",
  "feedback": "反馈",
  "giveFeedback": "提供反馈",
  "cancel": "取消",
  "feedbackPlaceholder": "例如，“把图表变成蓝色”或“添加一个关于财务影响的部分”。",
  "generateNewVersion": "生成新版本",
  "feedbackSuccess": "成功！正在重新生成...",
  "feedbackError": "更新失败，请重试。",
  "visualReport": "可视化报告",
  "regenerate": "重新生成",
  "download": "下载",
  "changeLanguage": "切换语言",
  "apiKeyRequiredTitle": "需要 API 密钥",
  "apiKeyRequiredMessage": "开始研究前，请在设置中配置您的 Gemini API 密钥。",
  "emptyQueryTitle": "查询为空",
  "emptyQueryMessage": "无法使用空查询开始研究。",
  "initialSearchFailedTitle": "初始搜索失败",
  "allApiKeysFailedTitle": "所有 API 密钥均失败",
  "allApiKeysFailedMessage": "您可以重试该操作或在设置中检查您的密钥。",
  "researchStoppedTitle": "研究已停止",
  "researchStoppedMessage": "研究过程已被用户取消。",
  "researchFailedTitle": "研究失败",
  "clarificationFailedTitle": "澄清失败",
  "apiKeysFailedMessage": "所有 API 密钥均失败。您可以重试该操作。",
  "clarifiedContextFailed": "澄清过程失败。将按原始查询继续。",
  "generatingOutlineTitle": "正在生成大纲",
  "generatingOutlineMessage": "正在为最终报告创建结构。",
  "reportGeneratedTitle": "报告已生成",
  "reportGeneratedMessage": "已根据目前完成的研究生成报告。",
  "synthesisFailedTitle": "整合失败",
  "synthesisFailedMessage": "整合失败。请在设置中检查您的密钥。",
  "visualizationFailedTitle": "可视化失败",
  "regeneratingOutlineTitle": "正在重新生成大纲",
  "regeneratingOutlineMessage": "在重新生成前重构报告结构。",
  "reportRegeneratedTitle": "报告已重新生成",
  "reportRegeneratedMessage": "已生成新版本的报告。",
  "regenerationFailedTitle": "重新生成失败",
  "reportUpdatedTitle": "报告已更新",
  "reportUpdatedMessage": "报告已成功重写。",
  "rewriteFailedTitle": "重写失败",
  "historyItemRemovedTitle": "历史项已移除",
  "historyItemRemovedMessage": "所选项已从您的研究历史中删除。",
  "historyClearedTitle": "历史已清除",
  "historyClearedMessage": "所有项都已从您的研究历史中移除。",
  "translationCompleteTitle": "翻译完成",
  "translationCompleteMessage": "报告已翻译并另存为新版本。",
  "translationFailedTitle": "翻译失败",
  "defaultsLoadedTitle": "已加载默认值",
  "defaultsLoadedMessage": "设置已重置为默认值并保存。",
  "roles": "角色",
  "selectRole": "选择角色",
  "defaultRole": "默认",
  "defaultRoleDesc": "标准研究智能体。",
  "builtIn": "内置",
  "custom": "自定义",
  "manageRoles": "管理角色",
  "editRole": "编辑角色",
  "createNewRole": "创建新角色",
  "edit": "编辑",
  "roleNamePlaceholder": "角色名称...",
  "rolePromptPlaceholder": "描述此角色的身份和指令。例如，'扮演一个持怀疑态度的财务分析师。关注风险和财务可行性...'",
  "generateNameEmoji": "生成",
  "refinePrompt": "优化",
  "creativePrompt": "创意",
  "attachContextFile": "附加背景文件",
  "saveRole": "保存角色",
  "confirmDeleteRole": "您确定要删除此角色吗？",
  "roleAI": "角色AI"
};

const translationsData: Record<string, Record<string, any>> = { en, zh };

// Define the shape of the context
interface LanguageContextType {
    language: string;
    setLanguage: (language: string) => void;
    t: (key: string, options?: { [key: string]: string | number }) => string;
    loading: boolean;
}

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => {},
    t: (key) => key,
    loading: true,
});

// Custom hook for easy consumption
export const useLanguage = () => useContext(LanguageContext);

// The provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<string>(() => {
        try {
            const storedLang = localStorage.getItem('k-research-lang');
            if (storedLang && translationsData[storedLang]) {
                return storedLang;
            }
            const browserLang = navigator.language.split('-')[0];
            return translationsData[browserLang] ? browserLang : 'en';
        } catch {
            return 'en';
        }
    });
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const selectedTranslations = translationsData[language] || translationsData.en;
        setTranslations(selectedTranslations);
        // If the language in state is not available, default to English.
        if (!translationsData[language]) {
            setLanguageState('en');
        }
        setLoading(false);
    }, [language]);

    const setLanguage = (lang: string) => {
        if (translationsData[lang]) {
            try {
                localStorage.setItem('k-research-lang', lang);
            } catch (e) {
                console.warn("Could not access localStorage. Language preference will not be saved.");
            }
            setLanguageState(lang);
        } else {
            console.warn(`Language '${lang}' not available. Defaulting to 'en'.`);
            setLanguageState('en');
        }
    };

    const t = useCallback((key: string, options?: { [key: string]: string | number }): string => {
        let translation = translations[key] || key;
        if (options) {
            Object.keys(options).forEach(optionKey => {
                const regex = new RegExp(`{{${optionKey}}}`, 'g');
                translation = translation.replace(regex, String(options[optionKey]));
            });
        }
        return translation;
    }, [translations]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, loading }}>
            {!loading && children}
        </LanguageContext.Provider>
    );
};