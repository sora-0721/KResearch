"use client";

import { LanguageProvider } from "@/components/ui/LanguageContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return <LanguageProvider>{children}</LanguageProvider>;
}
