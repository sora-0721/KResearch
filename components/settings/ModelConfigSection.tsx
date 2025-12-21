"use client";

import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { ModelOption, ProviderType } from "@/types/research";
import { useLanguage } from "@/components/ui/LanguageContext";

interface ModelConfigSectionProps {
    activeProvider: ProviderType;
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
}

export function ModelConfigSection({
    activeProvider,
    managerModel, setManagerModel, workerModel, setWorkerModel,
    verifierModel, setVerifierModel, clarifierModel, setClarifierModel,
    availableModels, isLoadingModels
}: ModelConfigSectionProps) {
    const { t } = useLanguage();
    const modelOptions = availableModels.map(m => ({ value: m.name, label: m.displayName }));

    const providerLabel = activeProvider === "gemini" ? t('gemini') : t('openai');

    return (
        <>
            <div className="form-group">
                <label className="flex items-center gap-2">
                    {t('modelConfiguration') || 'Model Configuration'}
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: activeProvider === "gemini" ? 'var(--accent-color)' : '#10a37f',
                        color: 'white'
                    }}>
                        {providerLabel}
                    </span>
                    {isLoadingModels && <Spinner />}
                </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                    <label className="text-sm">{t('managerAgent') || 'Manager Agent'}</label>
                    <Select value={managerModel} onChange={setManagerModel} options={modelOptions} placeholder="Select model..." />
                </div>
                <div className="form-group">
                    <label className="text-sm">{t('workerAgent') || 'Worker Agent'}</label>
                    <Select value={workerModel} onChange={setWorkerModel} options={modelOptions} placeholder="Select model..." />
                </div>
                <div className="form-group">
                    <label className="text-sm">{t('verifierAgent') || 'Verifier Agent'}</label>
                    <Select value={verifierModel} onChange={setVerifierModel} options={modelOptions} placeholder="Select model..." />
                </div>
                <div className="form-group">
                    <label className="text-sm">{t('clarifierAgent') || 'Clarifier Agent'}</label>
                    <Select value={clarifierModel} onChange={setClarifierModel} options={modelOptions} placeholder="Select model..." />
                </div>
            </div>
        </>
    );
}
