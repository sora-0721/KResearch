"use client";

import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { ModelOption } from "@/types/research";

import { RotateCw } from "lucide-react";

interface ModelConfigSectionProps {
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
    refreshModels: () => void;
}

export function ModelConfigSection({
    managerModel, setManagerModel, workerModel, setWorkerModel,
    verifierModel, setVerifierModel, clarifierModel, setClarifierModel,
    availableModels, isLoadingModels, refreshModels
}: ModelConfigSectionProps) {
    const modelOptions = availableModels.map(m => ({ value: m.name, label: m.displayName }));

    return (
        <>
            <div className="form-group">
                <label className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        Model Configuration
                        {isLoadingModels && <Spinner />}
                    </span>
                    <button
                        onClick={refreshModels}
                        className="p-1 hover:bg-[var(--glass-border)] rounded-full transition-colors"
                        title="Refresh Models"
                    >
                        <RotateCw size={16} className={isLoadingModels ? "animate-spin" : ""} />
                    </button>
                </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                    <label className="text-sm">Manager Agent</label>
                    <Select value={managerModel} onChange={setManagerModel} options={modelOptions} placeholder="Select model..." />
                </div>
                <div className="form-group">
                    <label className="text-sm">Worker Agent</label>
                    <Select value={workerModel} onChange={setWorkerModel} options={modelOptions} placeholder="Select model..." />
                </div>
                <div className="form-group">
                    <label className="text-sm">Verifier Agent</label>
                    <Select value={verifierModel} onChange={setVerifierModel} options={modelOptions} placeholder="Select model..." />
                </div>
                <div className="form-group">
                    <label className="text-sm">Clarifier Agent</label>
                    <Select value={clarifierModel} onChange={setClarifierModel} options={modelOptions} placeholder="Select model..." />
                </div>
            </div>
        </>
    );
}
