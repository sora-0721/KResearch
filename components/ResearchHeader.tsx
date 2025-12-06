"use client";

import { Button } from "@/components/ui/Button";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

interface ResearchHeaderProps {
    onOpenHistory: () => void;
    onOpenSettings: () => void;
}

export function ResearchHeader({ onOpenHistory, onOpenSettings }: ResearchHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4">
            <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-color)' }}>
                    KResearch
                </h1>
                <p className="text-sm font-light" style={{ color: 'var(--text-color-secondary)' }}>
                    Autonomous Deep-Dive Agent
                </p>
            </div>

            <div className="flex items-center gap-3">
                <ThemeSwitcher />
                <Button variant="secondary" className="!rounded-full !p-2 !w-10 !h-10" onClick={onOpenHistory}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </Button>
                <Button variant="secondary" className="!rounded-full !p-2 !w-10 !h-10" onClick={onOpenSettings}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </Button>
            </div>
        </div>
    );
}
