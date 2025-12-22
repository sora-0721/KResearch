"use client";

import { Button } from "@/components/ui/Button";
import { NumberInput } from "@/components/ui/NumberInput";
import { useLanguage } from "@/components/ui/LanguageContext";

interface ResearchModeSectionProps {
    researchMode: "standard" | "deeper";
    setResearchMode: (mode: "standard" | "deeper") => void;
    minIterations: number;
    setMinIterations: (val: number) => void;
    maxIterations: number;
    setMaxIterations: (val: number) => void;
}

export function ResearchModeSection({
    researchMode, setResearchMode, minIterations, setMinIterations, maxIterations, setMaxIterations
}: ResearchModeSectionProps) {
    const { t } = useLanguage();

    return (
        <>
            <div className="form-group">
                <label>{t('researchMode')}</label>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant={researchMode === "standard" ? "primary" : "secondary"}
                        onClick={() => setResearchMode("standard")}
                        className="!rounded-2xl"
                    >
                        {t('standard')}
                    </Button>
                    <Button
                        variant={researchMode === "deeper" ? "primary" : "secondary"}
                        onClick={() => setResearchMode("deeper")}
                        className="!rounded-2xl"
                    >
                        {t('deeper')}
                    </Button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-color-secondary)' }}>
                    {researchMode === "deeper" ? t('deeperModeHint') : t('standardModeHint')}
                </p>
            </div>

            {researchMode === "deeper" && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                        <label className="text-sm">{t('minIterations')}</label>
                        <NumberInput value={minIterations} onChange={setMinIterations} min={1} max={100} />
                    </div>
                    <div className="form-group">
                        <label className="text-sm">{t('maxIterations')}</label>
                        <NumberInput value={maxIterations} onChange={setMaxIterations} min={minIterations} max={999} />
                    </div>
                </div>
            )}
        </>
    );
}

