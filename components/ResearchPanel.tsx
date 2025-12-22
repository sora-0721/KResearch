"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BrainVisualization } from "@/components/ui/BrainVisualization";
import { AgentState } from "@/types/research";
import { useLanguage } from "@/components/ui/LanguageContext";

interface ResearchPanelProps {
    isResearching: boolean;
    agentState: AgentState;
    iteration: number;
    researchMode: "standard" | "deeper";
    minIterations: number;
    maxIterations: number;
    startTime: number | null;
    endTime: number | null;
}

function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

export function ResearchPanel({
    isResearching, agentState, iteration, researchMode, minIterations, maxIterations, startTime, endTime
}: ResearchPanelProps) {
    const { t } = useLanguage();
    const [liveElapsed, setLiveElapsed] = useState(0);

    useEffect(() => {
        if (!isResearching || !startTime) {
            setLiveElapsed(0);
            return;
        }
        const interval = setInterval(() => setLiveElapsed(Date.now() - startTime), 1000);
        return () => clearInterval(interval);
    }, [isResearching, startTime]);

    const getTimeDisplay = () => {
        if (isResearching && startTime) return formatTime(liveElapsed);
        if (startTime !== null && endTime !== null) return formatTime(endTime - startTime);
        return '--';
    };

    const isComplete = agentState === 'complete';

    return (
        <Card noHover className="h-full flex flex-col items-center justify-center space-y-6 min-h-[300px]">
            <BrainVisualization isActive={isResearching} agentState={agentState} />

            <div className="space-y-2 w-full px-4">
                <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-color-secondary)' }}>{t('iteration')}</span>
                    <span className="font-mono" style={{ color: 'var(--text-color)' }}>{iteration}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-color-secondary)' }}>{t('status')}</span>
                    <Badge variant={isComplete ? 'primary' : 'secondary'} className="capitalize">{agentState}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-color-secondary)' }}>{t('mode')}</span>
                    <Badge variant={researchMode === 'deeper' ? 'primary' : 'secondary'} className="capitalize">
                        {researchMode === 'deeper' ? t('deeper') : t('standard')}
                    </Badge>
                </div>
                {researchMode === 'deeper' && !isComplete && (
                    <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--text-color-secondary)' }}>{t('target')}</span>
                        <span className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                            {minIterations} - {maxIterations === 999 ? '∞' : maxIterations}
                        </span>
                    </div>
                )}
                <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-color-secondary)' }}>{t('timeUsed')}</span>
                    <span className="font-mono text-xs" style={{ color: 'var(--accent-color)' }}>
                        {getTimeDisplay()}
                    </span>
                </div>
            </div>
        </Card>
    );
}

