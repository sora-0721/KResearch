"use client";

import { Button } from "@/components/ui/Button";
import { NumberInput } from "@/components/ui/NumberInput";

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
    return (
        <>
            <div className="form-group">
                <label>Research Mode</label>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant={researchMode === "standard" ? "primary" : "secondary"}
                        onClick={() => setResearchMode("standard")}
                        className="!rounded-2xl"
                    >
                        Standard
                    </Button>
                    <Button
                        variant={researchMode === "deeper" ? "primary" : "secondary"}
                        onClick={() => setResearchMode("deeper")}
                        className="!rounded-2xl"
                    >
                        Deeper
                    </Button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-color-secondary)' }}>
                    {researchMode === "deeper"
                        ? "Deeper mode enforces minimum iterations for exhaustive research."
                        : "Standard mode completes when sufficient information is gathered."}
                </p>
            </div>

            {researchMode === "deeper" && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                        <label className="text-sm">Min Iterations</label>
                        <NumberInput value={minIterations} onChange={setMinIterations} min={1} max={100} />
                    </div>
                    <div className="form-group">
                        <label className="text-sm">Max Iterations</label>
                        <NumberInput value={maxIterations} onChange={setMaxIterations} min={minIterations} max={999} />
                    </div>
                </div>
            )}
        </>
    );
}
