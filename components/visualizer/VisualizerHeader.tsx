import React from 'react';
import LiquidButton from '../LiquidButton';

interface VisualizerHeaderProps {
    onClose: () => void;
    onRegenerate?: () => void;
    onDownload: () => void;
    isDownloadDisabled: boolean;
    isRegenerateDisabled: boolean;
}

const VisualizerHeader: React.FC<VisualizerHeaderProps> = ({ onClose, onRegenerate, onDownload, isDownloadDisabled, isRegenerateDisabled }) => {
    return (
        <header className="flex items-center justify-between p-4 sm:p-6 mb-0 shrink-0 border-b border-border-light dark:border-border-dark">
            <h2 className="text-xl sm:text-2xl font-bold">Visual Report</h2>
            <div className="flex items-center gap-2">
                {onRegenerate && <LiquidButton onClick={onRegenerate} disabled={isRegenerateDisabled} className="px-4 py-2 text-sm">Regenerate</LiquidButton>}
                <LiquidButton onClick={onDownload} disabled={isDownloadDisabled} className="px-4 py-2 text-sm">Download</LiquidButton>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </header>
    );
};

export default VisualizerHeader;