export class AllKeysFailedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AllKeysFailedError';
    }
}

class ApiKeyService {
    private userApiKeys: string[] = [];
    private readonly hasEnvKey: boolean;
    private currentKeyIndex = -1;

    constructor() {
        const envKey = process.env.API_KEY;
        this.hasEnvKey = !!envKey && envKey.length > 0;

        if (this.hasEnvKey) {
            this.userApiKeys = this.parseKeys(envKey);
        } else {
            try {
                const storedKeys = localStorage.getItem('gemini_api_keys');
                this.userApiKeys = this.parseKeys(storedKeys || '');
            } catch (e) {
                console.warn("Could not access localStorage. API keys will not be persisted.");
                this.userApiKeys = [];
            }
        }
    }
    
    private parseKeys(keysString: string): string[] {
        if (!keysString) return [];
        return keysString
            .split(/[\n,]+/)
            .map(k => k.trim())
            .filter(k => k.length > 0);
    }

    public hasKey(): boolean {
        return this.getApiKeys().length > 0;
    }

    public isEnvKey(): boolean {
        return this.hasEnvKey;
    }
    
    public getApiKeys(): string[] {
        return this.userApiKeys;
    }

    public getApiKeysString(): string {
        return this.userApiKeys.join('\n');
    }

    public getNextApiKey(): string | undefined {
        const keys = this.getApiKeys();
        if (keys.length === 0) {
            return undefined;
        }
        this.currentKeyIndex = (this.currentKeyIndex + 1) % keys.length;
        return keys[this.currentKeyIndex];
    }

    public setApiKeys(keysString: string): void {
        if (!this.isEnvKey()) {
            this.userApiKeys = this.parseKeys(keysString);
            try {
                if (this.userApiKeys.length > 0) {
                    localStorage.setItem('gemini_api_keys', keysString);
                } else {
                    localStorage.removeItem('gemini_api_keys');
                }
            } catch (e) {
                 console.warn("Could not access localStorage. API keys will not be persisted.");
            }
        }
    }
}

export const apiKeyService = new ApiKeyService();