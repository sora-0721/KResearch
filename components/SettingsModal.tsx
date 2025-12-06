"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";

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
    clarifierModel: string;
    setClarifierModel: (model: string) => void;
    availableModels: ModelOption[];
    isLoadingModels: boolean;
    researchMode: "standard" | "deeper";
    setResearchMode: (mode: "standard" | "deeper") => void;
    minIterations: number;
    setMinIterations: (value: number) => void;
    maxIterations: number;
    setMaxIterations: (value: number) => void;
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
    clarifierModel,
    setClarifierModel,
    availableModels,
    isLoadingModels,
    researchMode,
    setResearchMode,
    minIterations,
    setMinIterations,
    maxIterations,
    setMaxIterations,
}: SettingsModalProps) {
    if (!isOpen) return null;

    // Transform models for Select component
    const modelOptions = availableModels.map(m => ({
        value: m.name,
        label: m.displayName
    }));

    return (
        <>
            {/* Backdrop */}
            <div
                className={`modal-backdrop ${isOpen ? 'visible' : ''}`}
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`modal-dialog ${isOpen ? 'visible' : ''}`}>
                <Card noHover className="max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>Settings</h2>
                        <Button
                            variant="secondary"
                            className="!rounded-full !p-2 !w-8 !h-8 flex items-center justify-center"
                            onClick={onClose}
                        >
                            ✕
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {/* API Key */}
                        <div className="form-group">
                            <label>Gemini API Key</label>
                            <Input
                                type="password"
                                placeholder="Enter your API key..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <p className="text-xs mt-2" style={{ color: 'var(--text-color-secondary)' }}>
                                Get your API key from{" "}
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--accent-color)' }}
                                    className="hover:underline"
                                >
                                    Google AI Studio
                                </a>
                            </p>
                        </div>

                        <div className="divider" />

                        {/* Research Mode */}
                        <div className="form-group">
                            <label>Research Mode</label>
                            <div className="flex gap-2">
                                <Button
                                    variant={researchMode === "standard" ? "primary" : "secondary"}
                                    onClick={() => setResearchMode("standard")}
                                    className="flex-1"
                                >
                                    Standard
                                </Button>
                                <Button
                                    variant={researchMode === "deeper" ? "primary" : "secondary"}
                                    onClick={() => setResearchMode("deeper")}
                                    className="flex-1"
                                >
                                    Deeper
                                </Button>
                            </div>
                            <p className="text-xs mt-2" style={{ color: 'var(--text-color-secondary)' }}>
                                {researchMode === "deeper"
                                    ? "Deeper mode: Enforces minimum iterations for exhaustive research"
                                    : "Standard mode: Stops when sufficiency score reaches 95%"}
                            </p>
                        </div>

                        {/* Min/Max Iterations (only shown in Deeper mode) */}
                        {researchMode === "deeper" && (
                            <div
                                className="p-4"
                                style={{
                                    background: 'color-mix(in srgb, var(--glass-bg) 50%, transparent)',
                                    borderRadius: 'var(--radius-2xl)',
                                    border: '1px solid var(--glass-border)'
                                }}
                            >
                                <h4 className="text-sm font-medium mb-4" style={{ color: 'var(--text-color)' }}>
                                    Deeper Mode Settings
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <NumberInput
                                        label="Minimum Iterations"
                                        value={minIterations}
                                        onChange={(value) => {
                                            setMinIterations(value);
                                            if (maxIterations < value && maxIterations !== 999) {
                                                setMaxIterations(value);
                                            }
                                        }}
                                        min={1}
                                        max={50}
                                    />
                                    <NumberInput
                                        label="Maximum Iterations"
                                        value={maxIterations}
                                        onChange={setMaxIterations}
                                        min={minIterations}
                                        max={999}
                                    />
                                </div>
                                <p className="text-xs mt-3" style={{ color: 'var(--text-color-secondary)' }}>
                                    999 = Unlimited (no maximum limit)
                                </p>
                            </div>
                        )}

                        <div className="divider" />

                        {/* Model Selection */}
                        <div className="form-group">
                            <div className="flex items-center gap-2 mb-4">
                                <label className="!mb-0">Model Configuration</label>
                                {isLoadingModels && (
                                    <span className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                                        Loading models...
                                    </span>
                                )}
                            </div>

                            {/* Clarifier Model */}
                            <div className="mb-4">
                                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-color-secondary)' }}>
                                    Clarifier Agent (Pre-Research)
                                </label>
                                <Select
                                    value={clarifierModel}
                                    onChange={setClarifierModel}
                                    options={modelOptions}
                                    placeholder="Select model..."
                                />
                            </div>

                            {/* Manager Model */}
                            <div className="mb-4">
                                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-color-secondary)' }}>
                                    Manager Agent
                                </label>
                                <Select
                                    value={managerModel}
                                    onChange={setManagerModel}
                                    options={modelOptions}
                                    placeholder="Select model..."
                                />
                            </div>

                            {/* Worker Model */}
                            <div className="mb-4">
                                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-color-secondary)' }}>
                                    Worker Agent
                                </label>
                                <Select
                                    value={workerModel}
                                    onChange={setWorkerModel}
                                    options={modelOptions}
                                    placeholder="Select model..."
                                />
                            </div>

                            {/* Verifier Model */}
                            <div>
                                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-color-secondary)' }}>
                                    Verifier Agent
                                </label>
                                <Select
                                    value={verifierModel}
                                    onChange={setVerifierModel}
                                    options={modelOptions}
                                    placeholder="Select model..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Done Button */}
                    <div className="mt-8 flex justify-end">
                        <Button onClick={onClose} className="px-6">
                            Done
                        </Button>
                    </div>
                </Card>
            </div>
        </>
    );
}
