import { ai } from './geminiClient';
import { getModel } from './models';
import { TranslationStyle, ResearchMode } from '../types';

export const translateText = async (
    textToTranslate: string,
    targetLanguage: string,
    style: TranslationStyle,
    mode: ResearchMode
): Promise<string> => {
    
    const styleInstruction = style === 'colloquial'
        ? "Your translation should be colloquial and evocative, capturing the essence of a native speaker’s speech. Avoid a mechanical, literal translation. Instead, employ idiomatic expressions and natural phrasing that resonate with a native speaker."
        : "Provide a standard, literal translation. Focus on conveying the direct meaning accurately and precisely.";

    const prompt = `Your task is to translate text. Translate the text provided below into ${targetLanguage}.
${styleInstruction}

IMPORTANT: Your response MUST contain *only* the translated text. Do not include the original text, source language name, target language name, or any other explanatory text, preambles, or apologies.

**Text to Translate:**
---
${textToTranslate}
---
`;

    const response = await ai.models.generateContent({
        model: getModel('synthesizer', mode), // Using the synthesizer model is a good choice for this task
        contents: prompt,
        config: {
            temperature: style === 'colloquial' ? 0.7 : 0.2
        }
    });

    if (!response || !response.text) {
        throw new Error("The API did not return a response during translation.");
    }

    return response.text.trim();
};