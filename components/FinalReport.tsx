"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useLanguage } from "@/components/ui/LanguageContext";

interface FinalReportProps {
    report: string;
    onRegenerate?: () => void;
    isRegenerating?: boolean;
}

export function FinalReport({ report, onRegenerate, isRegenerating }: FinalReportProps) {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(report);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card noHover className="animate-fade-in relative mb-20">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>
                    {t('finalReport')}
                </h2>
                <div className="flex gap-2">
                    {onRegenerate && (
                        <Button onClick={onRegenerate} variant="secondary" className="text-xs !px-3 !py-1 gap-2" disabled={isRegenerating}>
                            {isRegenerating ? <Spinner /> : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            )}
                            {isRegenerating ? t('regenerating') : t('regenerate')}
                        </Button>
                    )}
                    <Button onClick={copyToClipboard} variant="secondary" className="text-xs !px-3 !py-1">
                        {copied ? t('copied') : t('copyReport')}
                    </Button>
                </div>
            </div>
            <div className="prose prose-sm max-w-none leading-relaxed" style={{ color: 'var(--text-color)' }}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3" style={{ color: 'var(--text-color)' }}>{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2" style={{ color: 'var(--text-color)' }}>{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: 'var(--text-color)' }}>{children}</h3>,
                        p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--text-color)' }}>{children}</strong>,
                        a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent-color)' }}>
                                {children}
                            </a>
                        ),
                        code: ({ children }) => (
                            <code className="px-1 py-0.5 rounded text-sm" style={{ background: 'var(--glass-bg)' }}>{children}</code>
                        ),
                        blockquote: ({ children }) => (
                            <blockquote className="border-l-4 pl-4 my-3 italic" style={{ borderColor: 'var(--accent-color)', color: 'var(--text-color-secondary)' }}>
                                {children}
                            </blockquote>
                        ),
                        table: ({ children }) => (
                            <div className="overflow-x-auto my-4">
                                <table className="min-w-full border-collapse" style={{ border: '1px solid var(--glass-border)' }}>
                                    {children}
                                </table>
                            </div>
                        ),
                        thead: ({ children }) => <thead style={{ background: 'var(--glass-bg)' }}>{children}</thead>,
                        th: ({ children }) => <th className="px-3 py-2 text-left text-sm font-semibold" style={{ border: '1px solid var(--glass-border)', color: 'var(--text-color)' }}>{children}</th>,
                        td: ({ children }) => <td className="px-3 py-2 text-sm" style={{ border: '1px solid var(--glass-border)' }}>{children}</td>,
                        tr: ({ children }) => <tr>{children}</tr>,
                    }}
                >
                    {report}
                </ReactMarkdown>
            </div>
        </Card>
    );
}

