"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select"; // Use new Liquid Glass Select
import { Switch } from "@/components/ui/Switch"; // Use new Switch
import { cn } from "@/lib/utils";

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <Card className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in shadow-2xl border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-3xl p-6 rounded-[var(--radius-2xl)]">

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[var(--text-color)]">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-6 h-6 text-[var(--text-color-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6">
                    {/* API Key */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-color-secondary)]">Gemini API Key</label>
                        <Input
                            type="password"
                            placeholder="Enter your Gemini API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="bg-[var(--glass-bg)] border-[var(--glass-border)] focus:border-[var(--accent-color)]"
                        />
                        <p className="text-xs text-[var(--text-color-secondary)]">
                            Your key is stored locally in your browser.
                        </p>
                    </div>

                    <div className="h-px bg-[var(--glass-border)] opacity-50" />

                    {/* Model Selection */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--text-color)]">Model Selection</h3>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-color-secondary)]">
                                Manager Agent
                                {isLoadingModels && <span className="ml-2 text-xs animate-pulse opacity-70">Loading models...</span>}
                            </label>
                            <Select
                                value={managerModel}
                                onChange={setManagerModel}
                                options={availableModels.map(m => ({ value: m.name, label: m.displayName }))}
                                placeholder="Select Manager Model"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-color-secondary)]">
                                Worker Agent
                                {isLoadingModels && <span className="ml-2 text-xs animate-pulse opacity-70">Loading models...</span>}
                            </label>
                            <Select
                                value={workerModel}
                                onChange={setWorkerModel}
                                options={availableModels.map(m => ({ value: m.name, label: m.displayName }))}
                                placeholder="Select Worker Model"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-color-secondary)]">
                                Verifier Agent
                                {isLoadingModels && <span className="ml-2 text-xs animate-pulse opacity-70">Loading models...</span>}
                            </label>
                            <Select
                                value={verifierModel}
                                onChange={setVerifierModel}
                                options={availableModels.map(m => ({ value: m.name, label: m.displayName }))}
                                placeholder="Select Verifier Model"
                            />
                        </div>
                    </div>

                    <div className="h-px bg-[var(--glass-border)] opacity-50" />

                    {/* Research Mode */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-[var(--text-color)] block">Deep Research Mode</label>
                            <p className="text-xs text-[var(--text-color-secondary)] max-w-[250px]">
                                Enforces deeper investigation (min 15 iterations) and stricter verification. Experimental.
                            </p>
                        </div>
                        <Switch
                            checked={researchMode === 'deep'}
                            onChange={(checked) => setResearchMode(checked ? 'deep' : 'standard')}
                        />
                    </div>

                </div>

                <div className="mt-8 flex justify-end">
                    <Button onClick={onClose} className="w-full sm:w-auto">
                        Done
                    </Button>
                </div>
            </Card>
        </div>
    );
}
