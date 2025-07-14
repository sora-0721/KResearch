import React, { useState, useRef } from 'react';
import LiquidButton from '../LiquidButton';
import Spinner from '../Spinner';
import { FileData } from '../../types';

interface VisualizerFeedbackProps {
    onSubmit: (feedback: string, file: FileData | null) => Promise<void>;
    isSubmitDisabled: boolean;
}

const VisualizerFeedback: React.FC<VisualizerFeedbackProps> = ({ onSubmit, isSubmitDisabled }) => {
    const [isFeedbackMode, setIsFeedbackMode] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackFile, setFeedbackFile] = useState<FileData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [feedbackError, setFeedbackError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target?.result as string;
            setFeedbackFile({ name: file.name, mimeType: file.type, data: base64String.split(',')[1] });
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveFile = () => {
        setFeedbackFile(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async () => {
        if (!feedbackText.trim() && !feedbackFile) return;
        setFeedbackStatus('submitting');
        setFeedbackError(null);
        try {
            await onSubmit(feedbackText, feedbackFile);
            setFeedbackStatus('success');
            setFeedbackText('');
            handleRemoveFile();
        } catch (error: any) {
            setFeedbackStatus('error');
            setFeedbackError(error.message || "An unknown error occurred.");
        } finally {
            setTimeout(() => setFeedbackStatus('idle'), 3000);
        }
    };
    
    const isDisabled = isSubmitDisabled || feedbackStatus === 'submitting';

    return (
        <footer className={`shrink-0 overflow-hidden transition-all duration-500 ease-in-out ${isFeedbackMode ? 'max-h-96' : 'max-h-[68px]'}`}>
            <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
                <h3 className="text-lg font-semibold">Feedback</h3>
                <LiquidButton onClick={() => setIsFeedbackMode(p => !p)} disabled={isSubmitDisabled} className="px-4 py-2 text-sm">{isFeedbackMode ? 'Cancel' : 'Give Feedback'}</LiquidButton>
            </div>
            <div className="p-4 space-y-3">
                <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="e.g., 'Make the charts blue' or 'Add a section about financial impact.'" className="w-full h-24 p-2 rounded-lg resize-none bg-white/40 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-2 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all text-sm"/>
                <div className="flex items-center justify-between gap-4">
                    {!feedbackFile ? (
                        <label htmlFor="feedback-file-upload" className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Attach file"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>Attach File</label>
                    ) : (
                        <div className="flex items-center justify-between px-2 py-1 text-xs rounded-lg bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 w-full max-w-xs"><span className="truncate" title={feedbackFile.name}>{feedbackFile.name}</span><button onClick={handleRemoveFile} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10" title="Remove file"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                    )}
                    <input type="file" id="feedback-file-upload" ref={fileInputRef} className="hidden" onChange={handleFileChange} disabled={isDisabled} />
                        <div className="flex items-center gap-4">
                        {feedbackStatus === 'success' && <p className="text-sm text-green-600 dark:text-green-400 animate-fade-in">Success! Regenerating...</p>}
                        {feedbackStatus === 'error' && <p className="text-sm text-red-600 dark:text-red-400 animate-fade-in" title={feedbackError || ''}>Update failed. Try again.</p>}
                        <LiquidButton onClick={handleSubmit} disabled={isDisabled || (!feedbackText.trim() && !feedbackFile)} className="px-4 py-2 text-sm flex items-center gap-2">
                            {feedbackStatus === 'submitting' && <Spinner />}
                            Generate New Version
                        </LiquidButton>
                        </div>
                </div>
            </div>
        </footer>
    );
};

export default VisualizerFeedback;