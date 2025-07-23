import { HistoryItem, FinalResearchData } from '../types';

const HISTORY_KEY = 'k-research-history';

class HistoryService {
    public getHistory(): HistoryItem[] {
        try {
            const stored = localStorage.getItem(HISTORY_KEY);
            if (!stored) return [];
            const history = JSON.parse(stored) as HistoryItem[];
            // Sort by date descending
            return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } catch (e) {
            console.error("Failed to load history:", e);
            return [];
        }
    }

    public addHistoryItem(itemData: Omit<HistoryItem, 'id' | 'date'>): string {
        const history = this.getHistory();
        const newItem: HistoryItem = {
            ...itemData,
            id: Date.now().toString(),
            date: new Date().toISOString(),
        };
        // Avoid adding duplicates based on the initial query if it's a new item
        const existingIndex = history.findIndex(item => item.id === newItem.id || (item.query === newItem.query && item.title === newItem.query));
        if (existingIndex > -1) {
            history.splice(existingIndex, 1);
        }

        history.unshift(newItem); // Add to the top
        this.saveHistory(history);
        return newItem.id;
    }

    public updateHistoryItem(id: string, itemData: { finalData: FinalResearchData; title: string }): void {
        const history = this.getHistory();
        const itemIndex = history.findIndex(item => item.id === id);
        if (itemIndex > -1) {
            history[itemIndex].finalData = itemData.finalData;
            history[itemIndex].title = itemData.title;
            this.saveHistory(history);
        }
    }

    public updateHistoryItemTitle(id: string, title: string): void {
        const history = this.getHistory();
        const itemIndex = history.findIndex(item => item.id === id);
        if (itemIndex > -1) {
            history[itemIndex].title = title;
            this.saveHistory(history);
        }
    }

    public removeHistoryItem(id: string): void {
        let history = this.getHistory();
        history = history.filter(item => item.id !== id);
        this.saveHistory(history);
    }

    public clearHistory(): void {
        this.saveHistory([]);
    }
    
    public getHistoryItem(id: string): HistoryItem | undefined {
        return this.getHistory().find(item => item.id === id);
    }

    private saveHistory(history: HistoryItem[]): void {
        try {
            // Limit history size to prevent localStorage overflow
            const limitedHistory = history.slice(0, 50);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(limitedHistory));
        } catch (e) {
            console.error("Failed to save history:", e);
        }
    }
}

export const historyService = new HistoryService();