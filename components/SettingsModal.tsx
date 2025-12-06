"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApiKeySection } from "@/components/settings/ApiKeySection";
import { ResearchModeSection } from "@/components/settings/ResearchModeSection";
import { ModelConfigSection } from "@/components/settings/ModelConfigSection";
import { ModelOption } from "@/types/research";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    setApiKey: (val: string) => void;
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
    researchMode: "standard" | "deeper";
    setResearchMode: (mode: "standard" | "deeper") => void;
    minIterations: number;
    setMinIterations: (val: number) => void;
    maxIterations: number;
    setMaxIterations: (val: number) => void;
}

export function SettingsModal({
    isOpen, onClose, apiKey, setApiKey,
    managerModel, setManagerModel, workerModel, setWorkerModel,
    verifierModel, setVerifierModel, clarifierModel, setClarifierModel,
    availableModels, isLoadingModels,
    researchMode, setResearchMode, minIterations, setMinIterations, maxIterations, setMaxIterations
}: SettingsModalProps) {

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
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>Settings</h2>
                        <Button variant="secondary" onClick={onClose} className="!rounded-full !p-2 !w-8 !h-8">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Button>
                    </div>

                    <ApiKeySection apiKey={apiKey} setApiKey={setApiKey} />
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
