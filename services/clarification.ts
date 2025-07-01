import { ai } from './geminiClient';
import { clarificationModels } from './models';
import { parseJsonFromMarkdown } from './utils';
import { ResearchMode, FileData, ClarificationTurn } from '../types';

export interface ClarificationResponse {
    type: 'question' | 'summary';
    content: string;
}

export const clarifyQuery = async (
    history: ClarificationTurn[],
    mode: ResearchMode,
    fileData: FileData | null
): Promise<ClarificationResponse> => {
    const systemPrompt = `You are a helpful AI assistant. Your goal is to clarify a user's research request. If a file is attached, use its content to inform your questions.

Follow these rules:
1.  Engage in a conversation, asking one clarifying question at a time.
2.  Base each new question on the user's previous answers and any provided file context to narrow down their intent.
3.  Provide examples or options in your questions to guide the user. For example: "I see you've uploaded a document about X. Are you interested in a summary, a critique, or how it compares to Y?"
4.  After asking at least 3-5 questions and you feel you have a very clear understanding of the user's goal, stop asking questions.
5.  When you stop asking questions, you MUST generate a concise, one-paragraph summary of the refined research goal. This summary will be passed to other AI agents.

Your entire output must be a single JSON object with one of two formats:
- If you are asking a question: \`{ "type": "question", "content": "Your question here..." }\`
- When you are finished and providing the summary: \`{ "type": "summary", "content": "Your final summary paragraph here..." }\`
`;
    
    const contents = history.map((turn, index) => {
        const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [{ text: turn.content }];
        if (turn.role === 'user' && index === 0 && fileData) {
            parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.data } });
        }
        return { role: turn.role, parts: parts };
    });

    const response = await ai.models.generateContent({
        model: clarificationModels[mode],
        contents: contents,
        config: { systemInstruction: systemPrompt, responseMimeType: "application/json", temperature: 0.5 }
    });

    const parsedResponse = parseJsonFromMarkdown(response.text) as ClarificationResponse;

    if (!parsedResponse || !parsedResponse.type || !parsedResponse.content) {
        console.error("Failed to parse clarification response:", response.text);
        return { type: 'summary', content: 'AI clarification failed. Proceeding with original query.' };
    }
    
    return parsedResponse;
};
