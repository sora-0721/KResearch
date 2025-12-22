"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ModelOption, ApiKeyEntry, ProviderType } from "@/types/research";
import { getAvailableModels, getOpenAIModels } from "@/app/actions";

export function useResearchSettings() {
    // Active provider selection
    const [activeProvider, setActiveProvider] = useState<ProviderType>("gemini");

    // Multi-API key support
    const [geminiApiKeys, setGeminiApiKeys] = useState<ApiKeyEntry[]>([]);
    const [geminiBaseUrl, setGeminiBaseUrl] = useState("");
    const [openaiApiKey, setOpenaiApiKey] = useState("");
    const [openaiApiHost, setOpenaiApiHost] = useState("");

    // API key rotation index (persisted across calls)
    const currentApiKeyIndexRef = useRef(0);

    // Legacy single API key (for backward compatibility)
    const [apiKey, setApiKey] = useState("");

    // Model settings - empty by default, will be set to first fetched model
    const [managerModel, setManagerModel] = useState("");
    const [workerModel, setWorkerModel] = useState("");
    const [verifierModel, setVerifierModel] = useState("");
    const [clarifierModel, setClarifierModel] = useState("");

    // Separate model lists for each provider - empty until fetched
    const [geminiModels, setGeminiModels] = useState<ModelOption[]>([]);
    const [openaiModels, setOpenaiModels] = useState<ModelOption[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    const [minIterations, setMinIterations] = useState(15);
    const [maxIterations, setMaxIterations] = useState(999);
    const [researchMode, setResearchMode] = useState<"standard" | "deeper">("standard");

    // Computed: available models based on active provider
    const availableModels = activeProvider === "gemini" ? geminiModels : openaiModels;

    // Multi-API key management functions
    const addGeminiApiKey = useCallback(() => {
        const newKey: ApiKeyEntry = {
            id: Math.random().toString(36).substring(7),
            key: ""
        };
        setGeminiApiKeys((prev: ApiKeyEntry[]) => [...prev, newKey]);
    }, []);

    const removeGeminiApiKey = useCallback((id: string) => {
        setGeminiApiKeys((prev: ApiKeyEntry[]) => prev.filter((k: ApiKeyEntry) => k.id !== id));
    }, []);

    const updateGeminiApiKey = useCallback((id: string, key: string) => {
        setGeminiApiKeys((prev: ApiKeyEntry[]) => prev.map((k: ApiKeyEntry) => k.id === id ? { ...k, key } : k));
    }, []);

    // Get next API key in rotation (round-robin)
    const getNextApiKey = useCallback(() => {
        const validKeys = geminiApiKeys.filter((k: ApiKeyEntry) => k.key.length > 10);
        if (validKeys.length === 0) {
            return { key: apiKey, index: 0 };
        }
        const index = currentApiKeyIndexRef.current % validKeys.length;
        currentApiKeyIndexRef.current = (currentApiKeyIndexRef.current + 1) % validKeys.length;
        return { key: validKeys[index].key, index };
    }, [geminiApiKeys, apiKey]);

    // Reset rotation index
    const resetApiKeyRotation = useCallback(() => {
        currentApiKeyIndexRef.current = 0;
    }, []);

    // Get active API key (first valid key or legacy key)
    const getActiveApiKey = useCallback(() => {
        const validKeys = geminiApiKeys.filter((k: ApiKeyEntry) => k.key.length > 10);
        return validKeys.length > 0 ? validKeys[0].key : apiKey;
    }, [geminiApiKeys, apiKey]);

    // Load from localStorage
    useEffect(() => {
        const storedProvider = localStorage.getItem("kresearch_active_provider");
        if (storedProvider === "gemini" || storedProvider === "openai") {
            setActiveProvider(storedProvider);
        }

        const storedKey = localStorage.getItem("gemini_api_key");
        if (storedKey) setApiKey(storedKey);

        const storedGeminiKeys = localStorage.getItem("kresearch_gemini_api_keys");
        if (storedGeminiKeys) {
            try { setGeminiApiKeys(JSON.parse(storedGeminiKeys)); } catch (e) { console.error(e); }
        }

        const storedBaseUrl = localStorage.getItem("kresearch_gemini_base_url");
        if (storedBaseUrl) setGeminiBaseUrl(storedBaseUrl);

        const storedOpenaiKey = localStorage.getItem("kresearch_openai_api_key");
        const storedOpenaiHost = localStorage.getItem("kresearch_openai_api_host");
        if (storedOpenaiKey) setOpenaiApiKey(storedOpenaiKey);
        if (storedOpenaiHost) setOpenaiApiHost(storedOpenaiHost);

        // Model settings - will be overwritten when models are fetched
        const storedManagerModel = localStorage.getItem("kresearch_manager_model");
        const storedWorkerModel = localStorage.getItem("kresearch_worker_model");
        const storedVerifierModel = localStorage.getItem("kresearch_verifier_model");
        const storedClarifierModel = localStorage.getItem("kresearch_clarifier_model");
        if (storedManagerModel) setManagerModel(storedManagerModel);
        if (storedWorkerModel) setWorkerModel(storedWorkerModel);
        if (storedVerifierModel) setVerifierModel(storedVerifierModel);
        if (storedClarifierModel) setClarifierModel(storedClarifierModel);

        const storedMinIterations = localStorage.getItem("kresearch_min_iterations");
        const storedMaxIterations = localStorage.getItem("kresearch_max_iterations");
        const storedResearchMode = localStorage.getItem("kresearch_research_mode");
        if (storedMinIterations) setMinIterations(Number(storedMinIterations));
        if (storedMaxIterations) setMaxIterations(Number(storedMaxIterations));
        if (storedResearchMode === "standard" || storedResearchMode === "deeper") {
            setResearchMode(storedResearchMode);
        }
    }, []);

    // Save to localStorage
    useEffect(() => { localStorage.setItem("kresearch_active_provider", activeProvider); }, [activeProvider]);
    useEffect(() => { localStorage.setItem("kresearch_gemini_api_keys", JSON.stringify(geminiApiKeys)); }, [geminiApiKeys]);
    useEffect(() => { localStorage.setItem("kresearch_gemini_base_url", geminiBaseUrl); }, [geminiBaseUrl]);
    useEffect(() => { localStorage.setItem("kresearch_openai_api_key", openaiApiKey); }, [openaiApiKey]);
    useEffect(() => { localStorage.setItem("kresearch_openai_api_host", openaiApiHost); }, [openaiApiHost]);
    useEffect(() => { if (managerModel) localStorage.setItem("kresearch_manager_model", managerModel); }, [managerModel]);
    useEffect(() => { if (workerModel) localStorage.setItem("kresearch_worker_model", workerModel); }, [workerModel]);
    useEffect(() => { if (verifierModel) localStorage.setItem("kresearch_verifier_model", verifierModel); }, [verifierModel]);
    useEffect(() => { if (clarifierModel) localStorage.setItem("kresearch_clarifier_model", clarifierModel); }, [clarifierModel]);
    useEffect(() => { localStorage.setItem("kresearch_min_iterations", String(minIterations)); }, [minIterations]);
    useEffect(() => { localStorage.setItem("kresearch_max_iterations", String(maxIterations)); }, [maxIterations]);
    useEffect(() => { localStorage.setItem("kresearch_research_mode", researchMode); }, [researchMode]);

    // Fetch Gemini models when API Key or Base URL changes
    useEffect(() => {
        const fetchGeminiModels = async () => {
            const activeKey = getActiveApiKey();
            if (activeKey.length > 10) {
                localStorage.setItem("gemini_api_key", activeKey);
                setIsLoadingModels(true);
                try {
                    const models = await getAvailableModels(activeKey, geminiBaseUrl || undefined);
                    if (models && models.length > 0) {
                        // Use ID for both name and displayName
                        const formattedModels = models
                            .filter((m: any) => m.name.includes("gemini"))
                            .map((m: any) => ({
                                name: m.name,
                                displayName: m.name.replace("models/", "")
                            }))
                            .sort((a: ModelOption, b: ModelOption) => a.name.localeCompare(b.name));

                        if (formattedModels.length > 0) {
                            setGeminiModels(formattedModels);
                            // Auto-select first model if not already set
                            if (!managerModel || !formattedModels.find((m: ModelOption) => m.name === managerModel)) {
                                setManagerModel(formattedModels[0].name);
                            }
                            if (!workerModel || !formattedModels.find((m: ModelOption) => m.name === workerModel)) {
                                setWorkerModel(formattedModels[0].name);
                            }
                            if (!verifierModel || !formattedModels.find((m: ModelOption) => m.name === verifierModel)) {
                                setVerifierModel(formattedModels[0].name);
                            }
                            if (!clarifierModel || !formattedModels.find((m: ModelOption) => m.name === clarifierModel)) {
                                setClarifierModel(formattedModels[0].name);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch Gemini models", error);
                } finally {
                    setIsLoadingModels(false);
                }
            } else {
                setGeminiModels([]);
            }
        };
        const timeoutId = setTimeout(fetchGeminiModels, 500);
        return () => clearTimeout(timeoutId);
    }, [geminiApiKeys, apiKey, geminiBaseUrl, getActiveApiKey]);

    // Fetch OpenAI models when API Key or Host changes
    useEffect(() => {
        const fetchOpenAIModels = async () => {
            if (openaiApiKey.length > 10) {
                setIsLoadingModels(true);
                try {
                    const models = await getOpenAIModels(openaiApiKey, openaiApiHost || undefined);
                    if (models && models.length > 0) {
                        setOpenaiModels(models);
                        // Auto-select first model if currently on OpenAI provider
                        if (activeProvider === "openai") {
                            if (!managerModel || !models.find((m: ModelOption) => m.name === managerModel)) {
                                setManagerModel(models[0].name);
                            }
                            if (!workerModel || !models.find((m: ModelOption) => m.name === workerModel)) {
                                setWorkerModel(models[0].name);
                            }
                            if (!verifierModel || !models.find((m: ModelOption) => m.name === verifierModel)) {
                                setVerifierModel(models[0].name);
                            }
                            if (!clarifierModel || !models.find((m: ModelOption) => m.name === clarifierModel)) {
                                setClarifierModel(models[0].name);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch OpenAI models", error);
                } finally {
                    setIsLoadingModels(false);
                }
            } else {
                setOpenaiModels([]);
            }
        };
        const timeoutId = setTimeout(fetchOpenAIModels, 500);
        return () => clearTimeout(timeoutId);
    }, [openaiApiKey, openaiApiHost, activeProvider]);

    // Auto-select first model when switching providers
    useEffect(() => {
        const currentModels = activeProvider === "gemini" ? geminiModels : openaiModels;
        if (currentModels.length > 0) {
            if (!managerModel || !currentModels.find((m: ModelOption) => m.name === managerModel)) {
                setManagerModel(currentModels[0].name);
            }
            if (!workerModel || !currentModels.find((m: ModelOption) => m.name === workerModel)) {
                setWorkerModel(currentModels[0].name);
            }
            if (!verifierModel || !currentModels.find((m: ModelOption) => m.name === verifierModel)) {
                setVerifierModel(currentModels[0].name);
            }
            if (!clarifierModel || !currentModels.find((m: ModelOption) => m.name === clarifierModel)) {
                setClarifierModel(currentModels[0].name);
            }
        }
    }, [activeProvider, geminiModels, openaiModels]);

    return {
        activeProvider, setActiveProvider,
        apiKey, setApiKey,
        geminiApiKeys, addGeminiApiKey, removeGeminiApiKey, updateGeminiApiKey,
        getNextApiKey, resetApiKeyRotation, getActiveApiKey,
        geminiBaseUrl, setGeminiBaseUrl,
        openaiApiKey, setOpenaiApiKey,
        openaiApiHost, setOpenaiApiHost,
        managerModel, setManagerModel,
        workerModel, setWorkerModel,
        verifierModel, setVerifierModel,
        clarifierModel, setClarifierModel,
        availableModels,
        geminiModels, openaiModels,
        isLoadingModels,
        minIterations, setMinIterations,
        maxIterations, setMaxIterations,
        researchMode, setResearchMode
    };
}
