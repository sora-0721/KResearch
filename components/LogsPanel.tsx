"use client";

import { Card } from "@/components/ui/Card";
import { LogEntry } from "@/types/research";
import React from "react";
import { useLanguage } from "@/components/ui/LanguageContext";

interface LogsPanelProps {
    logs: LogEntry[];
    endRef: React.RefObject<HTMLDivElement | null>;
}

const agentColors: Record<string, string> = {
    Manager: "text-blue-500",
    Worker: "text-amber-500",
    Verifier: "text-purple-500",
    Writer: "text-green-500",
    Clarifier: "text-cyan-500",
    System: "text-gray-500"
};

export function LogsPanel({ logs, endRef }: LogsPanelProps) {
    const { t } = useLanguage();

    return (
        <Card noHover className="h-[500px] overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-sm animate-fade-in">
                        <div className="min-w-[80px] text-xs pt-1" style={{ color: 'var(--text-color-secondary)' }}>
                            {log.timestamp}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className={`font-bold text-xs uppercase tracking-wider ${agentColors[log.agent] || "text-gray-500"}`}>
                                    {log.agent}
                                </span>
                            </div>
                            <p style={{ color: 'var(--text-color)' }}>{log.message}</p>
                            {log.details && <LogDetails log={log} t={t} />}
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </Card>
    );
}

const ThoughtIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const ArrowIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
);

const SearchIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

function LogDetails({ log, t }: { log: LogEntry; t: (key: any) => string }) {
    if (log.agent === "Manager" && log.details.thoughts) {
        return (
            <div className="mt-3 space-y-3">
                <DetailCard icon={<ThoughtIcon />} title={t('thoughts')} color="blue">
                    <p className="text-sm leading-relaxed">{log.details.thoughts}</p>
                </DetailCard>
                {log.details.next_step?.task_description && (
                    <DetailCard icon={<ArrowIcon />} title={t('nextStep')} color="emerald">
                        <p className="text-sm">{log.details.next_step.task_description}</p>
                        {log.details.next_step.search_queries?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {log.details.next_step.search_queries.map((q: string, i: number) => (
                                    <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                                        {q}
                                    </span>
                                ))}
                            </div>
                        )}
                    </DetailCard>
                )}
            </div>
        );
    }

    if (log.agent === "Worker" && Array.isArray(log.details)) {
        return (
            <DetailCard icon={<SearchIcon />} title={t('findings')} color="amber" className="mt-3">
                <ul className="space-y-2">
                    {log.details.map((f: any, i: number) => (
                        <li key={i} className="text-sm">
                            <span style={{ color: 'var(--text-color)' }}>{f.fact}</span>
                            <span className="block text-[10px] truncate mt-0.5" style={{ color: 'var(--text-color-secondary)' }}>{f.source_url}</span>
                        </li>
                    ))}
                </ul>
            </DetailCard>
        );
    }

    if (log.agent === "Verifier") {
        return (
            <DetailCard icon={<CheckIcon />} title={t('verification')} color="purple" className="mt-3">
                <div className="flex gap-4 text-sm">
                    <span><strong>{log.details.cleaned_findings?.length || 0}</strong> {t('validFindings')}</span>
                    <span><strong>{log.details.conflicts?.length || 0}</strong> {t('conflicts')}</span>
                </div>
            </DetailCard>
        );
    }

    return null;
}

function DetailCard({ icon, title, color, children, className = "" }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode; className?: string }) {
    const borderColors: Record<string, string> = {
        blue: '#3B82F6', amber: '#F59E0B', emerald: '#10B981', purple: '#8B5CF6'
    };

    return (
        <div className={`p-3 rounded-xl ${className}`} style={{ background: 'var(--glass-bg)', borderLeft: `3px solid ${borderColors[color]}` }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: borderColors[color] }}>
                {icon}
                <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
            </div>
            <div style={{ color: 'var(--text-color-secondary)' }}>{children}</div>
        </div>
    );
}

