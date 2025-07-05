import { GenerateContentResponse } from "@google/genai";
import { ai } from './geminiClient';
import { getModel } from './models';
import { Citation, ResearchMode } from '../types';

export const executeSingleSearch = async (searchQuery: string, mode: ResearchMode): Promise<{ text: string, citations: Citation[] }> => {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: getModel('searcher', mode),
        contents: `Concisely summarize key information for the query: "${searchQuery}"`,
        config: { tools: [{ googleSearch: {} }] },
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const citations: Citation[] = groundingMetadata
        ? groundingMetadata.map((chunk: any) => ({
              url: chunk.web.uri,
              title: chunk.web.title || chunk.web.uri,
          }))
        : [];
    
    const uniqueCitations = Array.from(new Map(citations.map(c => [c.url, c])).values());
    return { text: `Summary for "${searchQuery}": ${response.text}`, citations: uniqueCitations };
};