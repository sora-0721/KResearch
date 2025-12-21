"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApiKeySection } from "@/components/settings/ApiKeySection";
import { ResearchModeSection } from "@/components/settings/ResearchModeSection";
import { ModelConfigSection } from "@/components/settings/ModelConfigSection";
import { ModelOption, ApiKeyEntry } from "@/types/research";
import { useLanguage } from "@/components/ui/LanguageContext";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Legacy API key
    apiKey: string;
    setApiKey: (val: string) => void;
    // Multi-API key support
    geminiApiKeys: ApiKeyEntry[];
    addGeminiApiKey: () => void;
    removeGeminiApiKey: (id: string) => void;
    updateGeminiApiKey: (id: string, key: string) => void;
    // Gemini base URL
    geminiBaseUrl: string;
    setGeminiBaseUrl: (val: string) => void;
    // OpenAI settings
    openaiApiKey: string;
    setOpenaiApiKey: (val: string) => void;
    openaiApiHost: string;
    setOpenaiApiHost: (val: string) => void;
    // Model settings
    managerModel: string;
    setManagerModel: (val: string) => void;
    workerModel: string;
    setWorkerModel: (val: string) => void;
    verifierModel: string;
    setVerifierModel: (val: string) => void;
    clarifierModel: string;
    setClarifierModel: (val: string) => void;
    availableModels: ModelOption[];
    isLoadingModels: boolean;
    // Research settings
    researchMode: "standard" | "deeper";
    setResearchMode: (mode: "standard" | "deeper") => void;
    minIterations: number;
    setMinIterations: (val: number) => void;
    maxIterations: number;
    setMaxIterations: (val: number) => void;
}

export function SettingsModal({
    isOpen, onClose,
    apiKey, setApiKey,
    geminiApiKeys, addGeminiApiKey, removeGeminiApiKey, updateGeminiApiKey,
    geminiBaseUrl, setGeminiBaseUrl,
    openaiApiKey, setOpenaiApiKey, openaiApiHost, setOpenaiApiHost,
    managerModel, setManagerModel, workerModel, setWorkerModel,
    verifierModel, setVerifierModel, clarifierModel, setClarifierModel,
    availableModels, isLoadingModels,
    researchMode, setResearchMode, minIterations, setMinIterations, maxIterations, setMaxIterations
}: SettingsModalProps) {
    const { t } = useLanguage();

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    return (
        <>
            <div className={`modal-backdrop ${isOpen ? "visible" : ""}`} onClick={onClose} />
            <div className={`modal-dialog ${isOpen ? "visible" : ""}`} style={{ maxWidth: '600px' }}>
                <Card noHover>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>{t('settings')}</h2>
                        <Button variant="secondary" onClick={onClose} className="!rounded-full !p-2 !w-8 !h-8">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Button>
                    </div>

                    <ApiKeySection
                        apiKey={apiKey} setApiKey={setApiKey}
                        geminiApiKeys={geminiApiKeys}
                        addGeminiApiKey={addGeminiApiKey}
                        removeGeminiApiKey={removeGeminiApiKey}
                        updateGeminiApiKey={updateGeminiApiKey}
                        geminiBaseUrl={geminiBaseUrl}
                        setGeminiBaseUrl={setGeminiBaseUrl}
                        openaiApiKey={openaiApiKey}
                        setOpenaiApiKey={setOpenaiApiKey}
                        openaiApiHost={openaiApiHost}
                        setOpenaiApiHost={setOpenaiApiHost}
                    />
                    <div className="divider" />
                    <ResearchModeSection researchMode={researchMode} setResearchMode={setResearchMode}
                        minIterations={minIterations} setMinIterations={setMinIterations}
                        maxIterations={maxIterations} setMaxIterations={setMaxIterations} />
                    <div className="divider" />
                    <ModelConfigSection managerModel={managerModel} setManagerModel={setManagerModel}
                        workerModel={workerModel} setWorkerModel={setWorkerModel}
                        verifierModel={verifierModel} setVerifierModel={setVerifierModel}
                        clarifierModel={clarifierModel} setClarifierModel={setClarifierModel}
                        availableModels={availableModels} isLoadingModels={isLoadingModels} />
                </Card>
            </div>
        </>
    );
}


