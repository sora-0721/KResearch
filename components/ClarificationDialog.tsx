"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ClarificationMessage } from "@/types/research";
import { useLanguage } from "@/components/ui/LanguageContext";

interface ClarificationDialogProps {
    messages: ClarificationMessage[];
    input: string;
    setInput: (val: string) => void;
    isWaiting: boolean;
    onSend: () => void;
    onSkip: () => void;
    endRef: React.RefObject<HTMLDivElement | null>;
}

export function ClarificationDialog({
    messages, input, setInput, isWaiting, onSend, onSkip, endRef
}: ClarificationDialogProps) {
    const { t } = useLanguage();

    return (
        <Card noHover className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">{t('clarifying')}</Badge>
                    <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                        {isWaiting ? t('thinking') : t('awaitingResponse')}
                    </span>
                </div>
                <Button variant="secondary" onClick={onSkip} className="text-sm">
                    {t('skipStartResearch')}
                </Button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto mb-4">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className="p-3"
                        style={{
                            background: msg.role === "assistant"
                                ? 'color-mix(in srgb, var(--glass-bg) 50%, transparent)'
                                : 'var(--accent-color)',
                            color: msg.role === "assistant" ? 'var(--text-color)' : 'white',
                            borderRadius: 'var(--radius-2xl)',
                            marginLeft: msg.role === "user" ? '2rem' : '0'
                        }}
                    >
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    </div>
                ))}
                {isWaiting && messages.length > 0 && (
                    <div className="flex items-center gap-2" style={{ color: 'var(--text-color-secondary)' }}>
                        <Spinner />
                        <span className="text-sm">{t('analyzingResponse')}</span>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {!isWaiting && messages.length > 0 && (
                <div className="flex gap-2">
                    <Input
                        placeholder={t('typeResponse')}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onSend()}
                        className="flex-grow"
                    />
                    <Button onClick={onSend}>{t('send')}</Button>
                </div>
            )}
        </Card>
    );
}

