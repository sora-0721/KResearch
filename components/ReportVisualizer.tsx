import React, { useState, useEffect } from 'react';
import GlassCard from './GlassCard';
import LiquidButton from './LiquidButton';
import Spinner from './Spinner';

interface ReportVisualizerProps {
    htmlContent: string | null;
    onClose: () => void;
    isLoading: boolean;
    isOpen: boolean;
    onRegenerate?: () => void;
}

const ReportVisualizer: React.FC<ReportVisualizerProps> = ({ htmlContent, onClose, isLoading, isOpen, onRegenerate }) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const timer = setTimeout(() => setIsActive(true), 10); // Trigger animation
      return () => clearTimeout(timer);
    } else {
      setIsActive(false); // Trigger closing animation
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isActive) {
      setIsRendered(false);
    }
  };
  
  const handleDownload = () => {
    if (!htmlContent) return;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KResearch_Visual_Report.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  if (!isRendered) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <GlassCard className={`w-full h-full max-w-7xl flex flex-col p-4 sm:p-6 bg-slate-100/90 transition-all duration-300 ease-in-out ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <header className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold">Visual Report Preview</h2>
          <div className="flex items-center gap-2">
            {onRegenerate && (
                <LiquidButton onClick={onRegenerate} disabled={isLoading} className="px-4 py-2 text-sm">
                    Regenerate
                </LiquidButton>
            )}
            <LiquidButton onClick={handleDownload} disabled={!htmlContent || isLoading} className="px-4 py-2 text-sm">Download HTML</LiquidButton>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Close"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </header>
        <div className="flex-grow bg-white/80 dark:bg-black/50 rounded-lg border border-border-light dark:border-border-dark relative overflow-hidden">
            {isLoading && !htmlContent && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-glass-light dark:bg-glass-dark z-10">
                    <Spinner />
                    <p className="text-lg">Agent is generating your visual report...</p>
                </div>
            )}
            {htmlContent && (
                 <iframe
                    srcDoc={htmlContent}
                    title="Visual Report"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                />
            )}
        </div>
      </GlassCard>
    </div>
  );
};

export default ReportVisualizer;