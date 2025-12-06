"use client";

import { useState, useEffect } from "react";
import { ModelOption, DEFAULT_MODELS } from "@/types/research";
import { getAvailableModels } from "@/app/actions";

export function useResearchSettings() {
    const [apiKey, setApiKey] = useState("");
    const [managerModel, setManagerModel] = useState("models/gemini-3-pro-preview");
    const [workerModel, setWorkerModel] = useState("gemini-flash-latest");
    const [verifierModel, setVerifierModel] = useState("gemini-flash-latest");
    const [clarifierModel, setClarifierModel] = useState("gemini-flash-latest");
    const [availableModels, setAvailableModels] = useState<ModelOption[]>(DEFAULT_MODELS);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [minIterations, setMinIterations] = useState(15);
    const [maxIterations, setMaxIterations] = useState(999);
    const [researchMode, setResearchMode] = useState<"standard" | "deeper">("standard");

    // Load from localStorage
    useEffect(() => {
        const storedKey = localStorage.getItem("gemini_api_key");
        if (storedKey) setApiKey(storedKey);
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
            if (apiKey.length > 10) {
                localStorage.setItem("gemini_api_key", apiKey);
                setIsLoadingModels(true);
                try {
                    const models = await getAvailableModels(apiKey);
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
    }, [apiKey]);

    return {
        apiKey, setApiKey,
        managerModel, setManagerModel,
        workerModel, setWorkerModel,
        verifierModel, setVerifierModel,
        clarifierModel, setClarifierModel,
        availableModels, isLoadingModels,
        minIterations, setMinIterations,
        maxIterations, setMaxIterations,
        researchMode, setResearchMode
    };
}
