import React, { useState, useEffect } from 'react';
import GlassCard from './GlassCard';
import Spinner from './Spinner';
import { FileData } from '../types';
import VisualizerHeader from './visualizer/VisualizerHeader';
import VisualizerFeedback from './visualizer/VisualizerFeedback';

interface ReportVisualizerProps {
    htmlContent: string | null;
    onClose: () => void;
    isLoading: boolean;
    isOpen: boolean;
    onRegenerate?: () => void;
    onSubmitFeedback: (feedback: string, file: FileData | null) => Promise<void>;
}

const ReportVisualizer: React.FC<ReportVisualizerProps> = ({ htmlContent, onClose, isLoading, isOpen, onRegenerate, onSubmitFeedback }) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const timer = setTimeout(() => setIsActive(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsActive(false);
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isActive) setIsRendered(false);
  };
  
  if (!isRendered) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <GlassCard className={`w-full h-full max-w-7xl flex flex-col p-0 bg-slate-100/90 transition-[transform,opacity] duration-300 ease-in-out ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <VisualizerHeader 
          onClose={onClose} 
          onRegenerate={onRegenerate} 
          onDownload={() => {
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
          }}
          isDownloadDisabled={!htmlContent || isLoading}
          isRegenerateDisabled={isLoading}
        />
        
        <div className="flex-grow bg-white/80 dark:bg-black/50 border-y border-border-light dark:border-border-dark relative overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-glass-light dark:bg-glass-dark z-20">
                    <Spinner />
                    <p className="text-lg animate-pulse">Agent is generating your visual report...</p>
                </div>
            )}
            {htmlContent ? (
                 <iframe srcDoc={htmlContent} title="Visual Report" className={`w-full h-full border-0 transition-opacity duration-500 ${isLoading ? 'opacity-30' : 'opacity-100'}`} sandbox="allow-scripts allow-same-origin"/>
            ) : !isLoading && (
                 <div className="w-full h-full flex items-center justify-center"><p>No visual report generated yet.</p></div>
            )}
        </div>
        
        {htmlContent && (
          <VisualizerFeedback onSubmit={onSubmitFeedback} isSubmitDisabled={isLoading} />
        )}
      </GlassCard>
    </div>
  );
};

export default ReportVisualizer;
