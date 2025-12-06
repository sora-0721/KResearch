"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface HistoryItem {
    id: string;
    query: string;
    timestamp: string;
    status: "in_progress" | "complete" | "failed";
    sufficiencyScore: number;
}

interface HistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryItem[];
    onSelect: (id: string) => void;
    onClear: () => void;
}

export function HistoryDrawer({ isOpen, onClose, history, onSelect, onClear }: HistoryDrawerProps) {
    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed top-0 right-0 h-full w-full sm:max-w-sm bg-[var(--glass-bg)] backdrop-blur-2xl border-l border-[var(--glass-border)] shadow-2xl z-50 transition-transform duration-300 ease-out transform p-6 flex flex-col",
                    "sm:rounded-l-[2.5rem]", // Liquid Glass: deeply rounded corners on the visible side for larger screens
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[var(--text-color)]">History</h2>
                    <Button variant="secondary" className="p-2 h-auto rounded-full bg-transparent border-none shadow-none hover:bg-[var(--glass-bg)]" onClick={onClose}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </Button>
                </div>

                {history.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-[var(--text-color-secondary)]">
                        <p>No history yet.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-2"> {/* Tiny negative margin for scrollbar aesthetics */}
                        {history.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => { onSelect(item.id); onClose(); }}
                                className="group p-4 bg-white/5 hover:bg-white/10 dark:bg-black/10 dark:hover:bg-black/20 rounded-[var(--radius-2xl)] cursor-pointer border border-transparent hover:border-[var(--accent-color)] transition-all"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={cn(
                                        "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                                        item.status === 'complete' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                            item.status === 'failed' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    )}>
                                        {item.status === 'in_progress' ? 'Running' : item.status}
                                    </span>
                                    <span className="text-xs text-[var(--text-color-secondary)]">{new Date(item.timestamp).toLocaleDateString()}</span>
                                </div>
                                <h3 className="font-medium text-[var(--text-color)] line-clamp-2 mb-1">{item.query}</h3>
                                <div className="flex items-center gap-2 text-xs text-[var(--text-color-secondary)]">
                                    <span>Score: {item.sufficiencyScore}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {history.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                        <Button variant="secondary" className="w-full text-red-400 hover:text-red-500 hover:border-red-500/50 bg-transparent border-[var(--glass-border)]" onClick={onClear}>
                            Clear History
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}
