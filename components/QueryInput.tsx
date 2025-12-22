"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLanguage } from "@/components/ui/LanguageContext";

interface QueryInputProps {
    query: string;
    setQuery: (val: string) => void;
    isResearching: boolean;
    isClarifying: boolean;
    canContinue: boolean;
    onStart: () => void;
    onContinue: () => void;
}

export function QueryInput({
    query, setQuery, isResearching, isClarifying, canContinue, onStart, onContinue
}: QueryInputProps) {
    const { t } = useLanguage();

    return (
        <Card noHover className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-grow">
                    <Input
                        placeholder={t('queryPlaceholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !isResearching && !isClarifying && onStart()}
                        className="!h-12 !text-lg"
                        disabled={isResearching || isClarifying}
                    />
                </div>
                <Button
                    onClick={onStart}
                    className={`min-w-[100px] !h-12 !rounded-full font-semibold ${isResearching ? '!bg-red-500' : ''}`}
                    disabled={isClarifying && !isResearching}
                >
                    {isResearching ? t('stop') : t('start')}
                </Button>
            </div>

            {canContinue && (
                <div className="flex justify-center">
                    <Button onClick={onContinue} variant="secondary" className="gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('continuePrevious')}
                    </Button>
                </div>
            )}
        </Card>
    );
}

