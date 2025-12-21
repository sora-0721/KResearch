"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ModelOption, DEFAULT_MODELS, ApiKeyEntry } from "@/types/research";
import { getAvailableModels } from "@/app/actions";

export function useResearchSettings() {
    // Multi-API key support
    const [geminiApiKeys, setGeminiApiKeys] = useState<ApiKeyEntry[]>([]);
    const [geminiBaseUrl, setGeminiBaseUrl] = useState("");
    const [openaiApiKey, setOpenaiApiKey] = useState("");
    const [openaiApiHost, setOpenaiApiHost] = useState("");

    // API key rotation index (persisted across calls)
    const currentApiKeyIndexRef = useRef(0);

    // Legacy single API key (for backward compatibility)
    const [apiKey, setApiKey] = useState("");

    // Model settings
    const [managerModel, setManagerModel] = useState("models/gemini-3-pro-preview");
    const [workerModel, setWorkerModel] = useState("gemini-flash-latest");
    const [verifierModel, setVerifierModel] = useState("gemini-flash-latest");
    const [clarifierModel, setClarifierModel] = useState("gemini-flash-latest");
    const [availableModels, setAvailableModels] = useState<ModelOption[]>(DEFAULT_MODELS);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [minIterations, setMinIterations] = useState(15);
    const [maxIterations, setMaxIterations] = useState(999);
    const [researchMode, setResearchMode] = useState<"standard" | "deeper">("standard");

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
            // Fallback to legacy single key
            return { key: apiKey, index: 0 };
        }
        const index = currentApiKeyIndexRef.current % validKeys.length;
        currentApiKeyIndexRef.current = (currentApiKeyIndexRef.current + 1) % validKeys.length;
        return { key: validKeys[index].key, index };
    }, [geminiApiKeys, apiKey]);

    // Reset rotation index (call when starting new research)
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
        // Legacy API key
        const storedKey = localStorage.getItem("gemini_api_key");
        if (storedKey) setApiKey(storedKey);

        // Multi-API keys
        const storedGeminiKeys = localStorage.getItem("kresearch_gemini_api_keys");
        if (storedGeminiKeys) {
            try {
                setGeminiApiKeys(JSON.parse(storedGeminiKeys));
            } catch (e) { console.error("Failed to parse gemini API keys", e); }
        }

        // Gemini base URL
        const storedBaseUrl = localStorage.getItem("kresearch_gemini_base_url");
        if (storedBaseUrl) setGeminiBaseUrl(storedBaseUrl);

        // OpenAI settings
        const storedOpenaiKey = localStorage.getItem("kresearch_openai_api_key");
        const storedOpenaiHost = localStorage.getItem("kresearch_openai_api_host");
        if (storedOpenaiKey) setOpenaiApiKey(storedOpenaiKey);
        if (storedOpenaiHost) setOpenaiApiHost(storedOpenaiHost);

        // Model settings
        const storedManagerModel = localStorage.getItem("kresearch_manager_model");
        const storedWorkerModel = localStorage.getItem("kresearch_worker_model");
        const storedVerifierModel = localStorage.getItem("kresearch_verifier_model");
        const storedClarifierModel = localStorage.getItem("kresearch_clarifier_model");
        if (storedManagerModel) setManagerModel(storedManagerModel);
        if (storedWorkerModel) setWorkerModel(storedWorkerModel);
        if (storedVerifierModel) setVerifierModel(storedVerifierModel);
        if (storedClarifierModel) setClarifierModel(storedClarifierModel);

        // Iteration settings
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
    useEffect(() => { localStorage.setItem("kresearch_gemini_api_keys", JSON.stringify(geminiApiKeys)); }, [geminiApiKeys]);
    useEffect(() => { localStorage.setItem("kresearch_gemini_base_url", geminiBaseUrl); }, [geminiBaseUrl]);
    useEffect(() => { localStorage.setItem("kresearch_openai_api_key", openaiApiKey); }, [openaiApiKey]);
    useEffect(() => { localStorage.setItem("kresearch_openai_api_host", openaiApiHost); }, [openaiApiHost]);
    useEffect(() => { localStorage.setItem("kresearch_manager_model", managerModel); }, [managerModel]);
    useEffect(() => { localStorage.setItem("kresearch_worker_model", workerModel); }, [workerModel]);
    useEffect(() => { localStorage.setItem("kresearch_verifier_model", verifierModel); }, [verifierModel]);
    useEffect(() => { localStorage.setItem("kresearch_clarifier_model", clarifierModel); }, [clarifierModel]);
    useEffect(() => { localStorage.setItem("kresearch_min_iterations", String(minIterations)); }, [minIterations]);
    useEffect(() => { localStorage.setItem("kresearch_max_iterations", String(maxIterations)); }, [maxIterations]);
    useEffect(() => { localStorage.setItem("kresearch_research_mode", researchMode); }, [researchMode]);

    // Fetch models when API Key changes
    useEffect(() => {
        const fetchModels = async () => {
            const activeKey = getActiveApiKey();
            if (activeKey.length > 10) {
                localStorage.setItem("gemini_api_key", activeKey);
                setIsLoadingModels(true);
                try {
                    const models = await getAvailableModels(activeKey);
                    if (models && models.length > 0) {
                        const formattedModels = models
                            .filter((m: any) => m.name.includes("gemini"))
                            .map((m: any) => ({
                                name: m.name,
                                displayName: m.displayName || m.name.replace("models/", "")
                            }));
                        const modelsToPreserve = [
                            { name: "models/gemini-3-pro-preview", displayName: "Gemini 3 Pro Preview (Recommended)" },
                            { name: "gemini-flash-latest", displayName: "Gemini Flash Latest (Fast)" }
                        ];
                        modelsToPreserve.forEach(preserved => {
                            if (!formattedModels.find((m: any) => m.name === preserved.name)) {
                                formattedModels.unshift(preserved);
                            }
                        });
                        setAvailableModels(formattedModels);
                    }
                } catch (error) {
                    console.error("Failed to fetch models", error);
                } finally {
                    setIsLoadingModels(false);
                }
            }
        };
        const timeoutId = setTimeout(fetchModels, 1000);
        return () => clearTimeout(timeoutId);
    }, [geminiApiKeys, apiKey, getActiveApiKey]);

    return {
        // Legacy API key (backward compatibility)
        apiKey, setApiKey,
        // Multi-API key support
        geminiApiKeys, addGeminiApiKey, removeGeminiApiKey, updateGeminiApiKey,
        getNextApiKey, resetApiKeyRotation, getActiveApiKey,
        // Gemini base URL
        geminiBaseUrl, setGeminiBaseUrl,
        // OpenAI settings
        openaiApiKey, setOpenaiApiKey,
        openaiApiHost, setOpenaiApiHost,
        // Model settings
        managerModel, setManagerModel,
        workerModel, setWorkerModel,
        verifierModel, setVerifierModel,
        clarifierModel, setClarifierModel,
        availableModels, isLoadingModels,
        // Iteration settings
        minIterations, setMinIterations,
        maxIterations, setMaxIterations,
        researchMode, setResearchMode
    };
}
