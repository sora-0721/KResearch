"use client";

import { Input } from "@/components/ui/Input";

interface ApiKeySectionProps {
    apiKey: string;
    setApiKey: (val: string) => void;
}

export function ApiKeySection({ apiKey, setApiKey }: ApiKeySectionProps) {
    return (
        <div className="form-group">
            <label>Gemini API Key</label>
            <Input
                type="password"
                placeholder="Enter your Gemini API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>
                Get your key from{" "}
                <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: 'var(--accent-color)' }}
                >
                    Google AI Studio
                </a>
            </p>
        </div>
    );
}
