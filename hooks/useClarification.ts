"use client";

import { useState, useCallback, useRef } from "react";
import { ClarificationMessage } from "@/types/research";
import { runClarifierAction } from "@/app/actions";

interface UseClarificationProps {
    apiKey: string;
    clarifierModel: string;
    onClear: () => void;
    onStartResearch: () => void;
}

export function useClarification({ apiKey, clarifierModel, onClear, onStartResearch }: UseClarificationProps) {
    const [isClarifying, setIsClarifying] = useState(false);
    const [messages, setMessages] = useState<ClarificationMessage[]>([]);
    const [input, setInput] = useState("");
    const [isWaiting, setIsWaiting] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const run = useCallback(async (query: string) => {
        if (!apiKey || !query) return false;
        setIsClarifying(true); setIsWaiting(true); setMessages([]);
        try {
            const result = await runClarifierAction(apiKey, query, clarifierModel);
            if (result.is_clear) {
                setMessages([{ role: "assistant", content: "✅ Your query is clear! Starting research now..." }]);
                setIsClarifying(false); setTimeout(onStartResearch, 500); return true;
            }
            const questionsText = result.questions.length > 0 ? result.questions.map((q, i) => `${i + 1}. ${q}`).join("\n") : "Could you please provide more details?";
            setMessages([{ role: "assistant", content: `I need some clarification:\n\n${questionsText}` }]);
            setIsWaiting(false); return false;
        } catch { setMessages([{ role: "assistant", content: "⚠️ Starting research..." }]); setIsClarifying(false); setTimeout(onStartResearch, 500); return true; }
    }, [apiKey, clarifierModel, onStartResearch]);

    const respond = useCallback(async (query: string) => {
        if (!input.trim() || isWaiting) return;
        const userResponse = input.trim(); setInput("");
        setMessages(prev => [...prev, { role: "user", content: userResponse }]); setIsWaiting(true);
        try {
            const context = messages.map(msg => `${msg.role === "assistant" ? "AI" : "User"}: ${msg.content}`).join("\n") + `\nUser: ${userResponse}`;
            const result = await runClarifierAction(apiKey, query, clarifierModel, context);
            if (result.is_clear) {
                setMessages(prev => [...prev, { role: "assistant", content: "✅ Great! Starting research..." }]);
                setIsClarifying(false); setTimeout(onStartResearch, 500);
            } else {
                const questionsText = result.questions.length > 0 ? result.questions.map((q, i) => `${i + 1}. ${q}`).join("\n") : "Please provide more details.";
                setMessages(prev => [...prev, { role: "assistant", content: `I still need clarity:\n\n${questionsText}` }]);
                setIsWaiting(false);
            }
        } catch { setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Starting research..." }]); setIsClarifying(false); setTimeout(onStartResearch, 500); }
    }, [input, isWaiting, messages, apiKey, clarifierModel, onStartResearch]);

    const skip = useCallback(() => { setIsClarifying(false); onStartResearch(); }, [onStartResearch]);

    return { isClarifying, messages, input, setInput, isWaiting, endRef, run, respond, skip };
}
