import { apiKeyService } from './apiKeyService';
import { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  modelOverrides: {
    planner: null,
    searcher: null,
    synthesizer: null,
    clarification: null,
    visualizer: null,
  },
  researchParams: {
    minCycles: 7,
    maxCycles: 20,
    maxDebateRounds: 20,
  },
};

class SettingsService {
  private settings: AppSettings;
  private availableModels: string[] = [];

  constructor() {
    this.settings = this.load();
  }

  private load(): AppSettings {
    try {
      const storedSettings = localStorage.getItem('k-research-settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        return {
          modelOverrides: { ...DEFAULT_SETTINGS.modelOverrides, ...parsed.modelOverrides },
          researchParams: { ...DEFAULT_SETTINGS.researchParams, ...parsed.researchParams },
        };
      }
    } catch (e) {
      console.error("Failed to load settings from localStorage", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  public save(newSettings: Partial<AppSettings>) {
    const toStore: AppSettings = {
        modelOverrides: newSettings.modelOverrides || this.settings.modelOverrides,
        researchParams: newSettings.researchParams || this.settings.researchParams,
    };
    try {
      localStorage.setItem('k-research-settings', JSON.stringify(toStore));
      this.settings = toStore;
    } catch (e) {
      console.error("Failed to save settings to localStorage", e);
    }
  }

  public getSettings(): AppSettings {
    return this.settings;
  }
  
  public async fetchAvailableModels(): Promise<string[]> {
    const apiKey = apiKeyService.getApiKey();
    if (!apiKey) {
      this.availableModels = [];
      throw new Error("API Key not set.");
    }
    
    // Return cached models if available to avoid refetching
    if(this.availableModels.length > 0) return this.availableModels;

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=50', {
        headers: {
          'x-goog-api-key': apiKey
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || response.statusText;
        throw new Error(`Failed to fetch models: ${errorMessage}`);
      }
      const data = await response.json() as { models?: { name: string }[] };
      const modelNames = (data.models || [])
        .map((m: { name: string }) => m.name.replace(/^models\//, ''))
        .filter((name: string) => name.includes('gemini'))
        .sort();

      this.availableModels = [...new Set(modelNames)];
      return this.availableModels;
    } catch (error) {
      console.error("Error fetching available models:", error);
      this.availableModels = [];
      throw error;
    }
  }
}

export const settingsService = new SettingsService();
