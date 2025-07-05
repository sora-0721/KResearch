class ApiKeyService {
    private userApiKey: string | null = null;
    private readonly hasEnvKey: boolean;

    constructor() {
        const envKey = process.env.API_KEY;
        this.hasEnvKey = !!envKey && envKey.length > 0;
        
        if (!this.hasEnvKey) {
            try {
                this.userApiKey = localStorage.getItem('gemini_api_key');
            } catch (e) {
                console.warn("Could not access localStorage. API key will not be persisted.");
                this.userApiKey = null;
            }
        }
    }

    public hasKey(): boolean {
        return this.hasEnvKey || !!this.userApiKey;
    }

    public isEnvKey(): boolean {
        return this.hasEnvKey;
    }

    public getApiKey(): string | undefined {
        if (this.hasEnvKey) {
            return process.env.API_KEY;
        }
        return this.userApiKey || undefined;
    }

    public setApiKey(key: string): void {
        if (!this.hasEnvKey) {
            const trimmedKey = key.trim();
            this.userApiKey = trimmedKey;
            try {
                if (trimmedKey) {
                    localStorage.setItem('gemini_api_key', trimmedKey);
                } else {
                    localStorage.removeItem('gemini_api_key');
                }
            } catch (e) {
                 console.warn("Could not access localStorage. API key will not be persisted.");
            }
        }
    }
}

export const apiKeyService = new ApiKeyService();