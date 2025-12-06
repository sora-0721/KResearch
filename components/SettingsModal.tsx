"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ModelOption {
    name: string;
    displayName: string;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    managerModel: string;
    setManagerModel: (model: string) => void;
    workerModel: string;
    setWorkerModel: (model: string) => void;
    verifierModel: string;
    setVerifierModel: (model: string) => void;
    availableModels: ModelOption[];
    isLoadingModels: boolean;
    researchMode: "standard" | "deep";
    setResearchMode: (mode: "standard" | "deep") => void;
}

export function SettingsModal({
    isOpen,
    onClose,
    apiKey,
    setApiKey,
    managerModel,
    setManagerModel,
    workerModel,
    setWorkerModel,
    verifierModel,
    setVerifierModel,
    availableModels,
    isLoadingModels,
    researchMode,
    setResearchMode,
}: SettingsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <Card className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[var(--text-color)]">Settings</h2>
                    <Button
                        variant="secondary"
                        className="rounded-full p-2 h-8 w-8 flex items-center justify-center"
                        onClick={onClose}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                </div>

                <div className="space-y-6">
                    {/* API Key */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-[var(--text-color)]">
                            Gemini API Key
                        </label>
                        <Input
                            type="password"
                            placeholder="Enter your API key..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                        <p className="text-xs text-[var(--text-color-secondary)]">
                            Get your API key from{" "}
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--accent-color)] hover:underline"
                            >
                                Google AI Studio
                            </a>
                        </p>
                    </div>

                    {/* Research Mode */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-[var(--text-color)]">
                            Research Mode
                        </label>
                        <div className="flex gap-2">
                            <Button
                                variant={researchMode === "standard" ? "primary" : "secondary"}
                                onClick={() => setResearchMode("standard")}
                                className="flex-1"
                            >
                                Standard
                            </Button>
                            <Button
                                variant={researchMode === "deep" ? "primary" : "secondary"}
                                onClick={() => setResearchMode("deep")}
                                className="flex-1"
                            >
                                Deep
                            </Button>
                        </div>
                        <p className="text-xs text-[var(--text-color-secondary)]">
                            {researchMode === "deep"
                                ? "Deep mode: Minimum 15 iterations for exhaustive research"
                                : "Standard mode: Stops when sufficiency score reaches 95%"}
                        </p>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <label className="block text-sm font-medium text-[var(--text-color)]">
                                Model Configuration
                            </label>
                            {isLoadingModels && (
                                <span className="text-xs text-[var(--text-color-secondary)]">Loading models...</span>
                            )}
                        </div>

                        {/* Manager Model */}
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-[var(--text-color-secondary)]">
                                Manager Agent
                            </label>
                            <select
                                value={managerModel}
                                onChange={(e) => setManagerModel(e.target.value)}
                                className="w-full h-10 px-3 rounded-[var(--radius-lg)] bg-[var(--surface-elevated)] border border-[var(--border-color)] text-[var(--text-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                            >
                                {availableModels.map((model) => (
                                    <option key={model.name} value={model.name}>
                                        {model.displayName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Worker Model */}
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-[var(--text-color-secondary)]">
                                Worker Agent
                            </label>
                            <select
                                value={workerModel}
                                onChange={(e) => setWorkerModel(e.target.value)}
                                className="w-full h-10 px-3 rounded-[var(--radius-lg)] bg-[var(--surface-elevated)] border border-[var(--border-color)] text-[var(--text-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                            >
                                {availableModels.map((model) => (
                                    <option key={model.name} value={model.name}>
                                        {model.displayName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Verifier Model */}
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-[var(--text-color-secondary)]">
                                Verifier Agent
                            </label>
                            <select
                                value={verifierModel}
                                onChange={(e) => setVerifierModel(e.target.value)}
                                className="w-full h-10 px-3 rounded-[var(--radius-lg)] bg-[var(--surface-elevated)] border border-[var(--border-color)] text-[var(--text-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                            >
                                {availableModels.map((model) => (
                                    <option key={model.name} value={model.name}>
                                        {model.displayName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Close Button */}
                <div className="mt-8 flex justify-end">
                    <Button onClick={onClose} className="px-6">
                        Done
                    </Button>
                </div>
            </Card>
        </div>
    );
}
