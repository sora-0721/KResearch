import React, { useEffect, useState, useRef } from 'react';
import LiquidButton from '../LiquidButton';
import Spinner from '../Spinner';
import GlassCard from '../GlassCard';
import { Citation, ReportVersion } from '../../types';

interface ReportHeaderProps {
  report: ReportVersion;
  citations: Citation[];
  onVisualize: (reportMarkdown: string) => void;
  isVisualizing: boolean;
  onRegenerate: () => void;
  isRegenerating: boolean;
  isRewriting: boolean;
  isTranslating: boolean;
  onNavigateVersion: (direction: 'prev' | 'next') => void;
  reportCount: number;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ report, citations, onVisualize, isVisualizing, onRegenerate, isRegenerating, isRewriting, onNavigateVersion, reportCount, isTranslating }) => {
  const [isCopyPopoverOpen, setIsCopyPopoverOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [regenStatus, setRegenStatus] = useState<'idle' | 'success'>('idle');
  
  const copyPopoverRef = useRef<HTMLDivElement>(null);
  const prevIsRegenerating = useRef(isRegenerating);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (copyPopoverRef.current && !copyPopoverRef.current.contains(event.target as Node)) {
        setIsCopyPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  useEffect(() => {
    if (prevIsRegenerating.current && !isRegenerating) {
        setRegenStatus('success');
        const timer = setTimeout(() => setRegenStatus('idle'), 2500);
        return () => clearTimeout(timer);
    }
    prevIsRegenerating.current = isRegenerating;
  }, [isRegenerating]);

  const copyToClipboard = async (text: string, withCitations: boolean) => {
    let contentToCopy = text;
    if (withCitations) {
        const citationsHeader = "\n\n---\n\n## Citations\n\n";
        const formattedCitations = citations.map(c => `- [${c.title || c.url}](${c.url})`).join('\n');
        contentToCopy += citationsHeader + formattedCitations;
    }
    try {
        await navigator.clipboard.writeText(contentToCopy);
        setCopyStatus('success');
    } catch (err) {
        console.error('Failed to copy: ', err);
        setCopyStatus('error');
    } finally {
        setIsCopyPopoverOpen(false);
        setTimeout(() => setCopyStatus('idle'), 2500);
    }
  };
  
  const isActionDisabled = isRegenerating || isRewriting || isVisualizing || isTranslating;

  return (
    <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-3xl font-bold">Final Report</h2>
        {reportCount > 1 && (
          <div className="flex items-center gap-1 bg-glass-light dark:bg-glass-dark px-2 py-1 rounded-2xl">
             <button onClick={() => onNavigateVersion('prev')} disabled={report.version === 1} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
             <span className="text-xs font-semibold select-none">v{report.version}/{reportCount}</span>
             <button onClick={() => onNavigateVersion('next')} disabled={report.version === reportCount} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative" ref={copyPopoverRef}>
            <LiquidButton onClick={() => setIsCopyPopoverOpen(p => !p)} disabled={isActionDisabled || copyStatus !== 'idle'} className="px-4 py-2 text-sm shrink-0 flex justify-center">
                {copyStatus === 'success' ? "Copied!" : copyStatus === 'error' ? "Failed!" : "Copy"}
            </LiquidButton>
            {isCopyPopoverOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-max z-10 animate-fade-in">
                <GlassCard className="p-2 flex flex-col gap-1">
                    <button onClick={() => copyToClipboard(report.content, false)} className="text-left w-full text-sm px-3 py-1.5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors">Report Only</button>
                    <button onClick={() => copyToClipboard(report.content, true)} className="text-left w-full text-sm px-3 py-1.5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors">Report & Citations</button>
                </GlassCard>
                </div>
            )}
        </div>
        <LiquidButton onClick={onRegenerate} disabled={isActionDisabled || regenStatus !== 'idle'} className="px-4 py-2 text-sm shrink-0 flex items-center justify-center gap-2">
            {isRegenerating ? <><Spinner /><span>Regenerating</span></> : regenStatus === 'success' ? "Success!" : "Regenerate Report"}
        </LiquidButton>
        <LiquidButton onClick={() => onVisualize(report.content)} disabled={isActionDisabled} className="px-4 py-2 text-sm shrink-0 flex items-center justify-center gap-2">
            {isVisualizing ? <><Spinner /><span>Visualizing...</span></> : "Visualize"}
        </LiquidButton>
      </div>
    </div>
  );
};

export default ReportHeader;