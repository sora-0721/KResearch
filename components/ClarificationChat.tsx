
import React, { useState, useRef, useEffect } from 'react';
import LiquidButton from './LiquidButton';
import Spinner from './Spinner';
import { ClarificationTurn } from '../types';
import { useLanguage } from '../contextx/LanguageContext';


interface ClarificationChatProps {
    history: ClarificationTurn[];
    onAnswerSubmit: (answer: string) => void;
    isLoading: boolean;
    onSkip: () => void;
}

const ClarificationChat: React.FC<ClarificationChatProps> = ({ history, onAnswerSubmit, isLoading, onSkip }) => {
    const [userAnswer, setUserAnswer] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [history, isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userAnswer.trim() || isLoading) return;
        onAnswerSubmit(userAnswer);
        setUserAnswer('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit(e as any);
        }
    };

    const getVisibleHistory = () => {
        const firstUserMessageIndex = history.findIndex(t => t.role === 'user');
        // Return an empty array if no initial user message is found, or show the welcome message from the AI.
        if (firstUserMessageIndex === -1) {
            const modelMessages = history.filter(t => t.role === 'model');
            return modelMessages.length > 0 ? [modelMessages[0]] : [];
        }
        return history.slice(firstUserMessageIndex + 1);
    }

    // Determine the placeholder text based on the history
    const placeholderText = getVisibleHistory().length > 0 ? t('clarificationPlaceholder') : t('clarificationPlaceholderInitial');

    return (
        <div className="w-full animate-fade-in space-y-4">
            <h2 className="text-xl font-bold text-center text-gray-800 dark:text-gray-200">{t('refiningRequest')}</h2>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">{t('refiningRequestDesc')}</p>
            
            <div ref={chatContainerRef} className="max-h-80 overflow-y-auto space-y-4 p-4 rounded-2xl bg-white/10 dark:bg-black/5 scroll-smooth">
                {getVisibleHistory().map((turn, index) => (
                    <div key={index} className={`flex animate-fade-in ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md p-3 rounded-2xl shadow-sm transition-colors duration-300 ${
                            turn.role === 'user' 
                                ? 'bg-blue-500/10 dark:bg-blue-400/10 text-gray-800 dark:text-gray-200 border border-blue-500/20 dark:border-blue-400/30' 
                                : 'bg-glass-light dark:bg-glass-dark text-gray-800 dark:text-gray-200'
                            }`}>
                           <p className="text-sm leading-relaxed whitespace-pre-wrap">{turn.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start animate-fade-in">
                         <div className="max-w-md p-3 rounded-2xl bg-glass-light dark:bg-glass-dark flex items-center gap-2">
                            <Spinner />
                            <span className="text-sm">{t('thinking')}</span>
                         </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                 <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholderText}
                    className="
                        w-full h-20 p-3 rounded-2xl resize-none
                        bg-white/40 dark:bg-black/20 
                        border border-transparent focus:border-glow-light dark:focus:border-glow-dark
                        focus:ring-2 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50
                        focus:outline-none
                        transition-all duration-300
                    "
                    disabled={isLoading}
                    aria-label="Your answer to the AI's question"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     <LiquidButton type="submit" disabled={isLoading || !userAnswer.trim()} className="w-full">
                        {isLoading ? t('waiting') : t('sendAnswer')}
                    </LiquidButton>
                     <LiquidButton type="button" onClick={onSkip} disabled={isLoading} className="w-full bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:shadow-none hover:-translate-y-0 active:translate-y-px">
                        {t('skipAndStart')}
                    </LiquidButton>
                </div>
            </form>
        </div>
    );
};

export default ClarificationChat;
