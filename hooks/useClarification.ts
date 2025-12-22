"use client";

import { useState, useCallback, useRef } from "react";
import { ClarificationMessage, ProviderType } from "@/types/research";
import { runClarifierAction } from "@/app/actions";

interface UseClarificationProps {
    activeProvider: ProviderType;
    apiKey: string;
    openaiApiKey: string;
    openaiApiHost: string;
    clarifierModel: string;
    onClear: () => void;
    onStartResearch: () => void;
}

export function useClarification({
    activeProvider, apiKey, openaiApiKey, openaiApiHost,
    clarifierModel, onClear, onStartResearch
}: UseClarificationProps) {
    const [isClarifying, setIsClarifying] = useState(false);
    const [messages, setMessages] = useState<ClarificationMessage[]>([]);
    const [input, setInput] = useState("");
    const [isWaiting, setIsWaiting] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const getApiConfig = useCallback(() => {
        if (activeProvider === "openai") {
            return { key: openaiApiKey, host: openaiApiHost || undefined };
        }
        return { key: apiKey, host: undefined };
    }, [activeProvider, apiKey, openaiApiKey, openaiApiHost]);

    const run = useCallback(async (query: string) => {
        const config = getApiConfig();
        if (!config.key || !query) return false;
        setIsClarifying(true); setIsWaiting(true); setMessages([]);
        try {
            const result = await runClarifierAction(config.key, query, clarifierModel, undefined, config.host, activeProvider);
            if (result.is_clear) {
                setMessages([{ role: "assistant", content: "✅ Your query is clear! Starting research now..." }]);
                setIsClarifying(false); setTimeout(onStartResearch, 500); return true;
            }
            const questionsText = result.questions.length > 0 ? result.questions.map((q, i) => `${i + 1}. ${q}`).join("\n") : "Could you please provide more details?";
            setMessages([{ role: "assistant", content: `I need some clarification:\n\n${questionsText}` }]);
            setIsWaiting(false); return false;
        } catch (error) {
            console.error("Clarification run error:", error);
            setMessages([{ role: "assistant", content: "⚠️ Starting research..." }]);
            setIsClarifying(false); setTimeout(onStartResearch, 500); return true;
        }
    }, [getApiConfig, clarifierModel, onStartResearch, activeProvider]);

    const respond = useCallback(async (query: string) => {
        if (!input.trim() || isWaiting) return;
        const config = getApiConfig();
        const userResponse = input.trim(); setInput("");
        setMessages(prev => [...prev, { role: "user", content: userResponse }]); setIsWaiting(true);
        try {
            const context = messages.map(msg => `${msg.role === "assistant" ? "AI" : "User"}: ${msg.content}`).join("\n") + `\nUser: ${userResponse}`;
            const result = await runClarifierAction(config.key, query, clarifierModel, context, config.host, activeProvider);
            if (result.is_clear) {
                setMessages(prev => [...prev, { role: "assistant", content: "✅ Great! Starting research..." }]);
                setIsClarifying(false); setTimeout(onStartResearch, 500);
            } else {
                const questionsText = result.questions.length > 0 ? result.questions.map((q, i) => `${i + 1}. ${q}`).join("\n") : "Please provide more details.";
                setMessages(prev => [...prev, { role: "assistant", content: `I still need clarity:\n\n${questionsText}` }]);
                setIsWaiting(false);
            }
        } catch (error) {
            console.error("Clarification respond error:", error);
            setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Starting research..." }]);
            setIsClarifying(false); setTimeout(onStartResearch, 500);
        }
    }, [input, isWaiting, messages, getApiConfig, clarifierModel, onStartResearch, activeProvider]);

    const skip = useCallback(() => { setIsClarifying(false); onStartResearch(); }, [onStartResearch]);

    return { isClarifying, messages, input, setInput, isWaiting, endRef, run, respond, skip };
}
