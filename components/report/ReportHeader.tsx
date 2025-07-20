import React, { useEffect, useState, useRef } from 'react';
import LiquidButton from '../LiquidButton';
import Spinner from '../Spinner';
import GlassCard from '../GlassCard';
import { Citation } from '../../types';

interface ReportHeaderProps {
  report: string;
  citations: Citation[];
  onVisualize: (reportMarkdown: string) => void;
  isVisualizing: boolean;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ report, citations, onVisualize, isVisualizing, onRegenerate, isRegenerating }) => {
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

  return (
    <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
      <h2 className="text-3xl font-bold">Final Report</h2>
      <div className="flex items-center gap-2">
        <div className="relative" ref={copyPopoverRef}>
            <LiquidButton onClick={() => setIsCopyPopoverOpen(p => !p)} disabled={isVisualizing || isRegenerating || copyStatus !== 'idle'} className="px-4 py-2 text-sm shrink-0 flex justify-center">
                {copyStatus === 'success' ? "Copied!" : copyStatus === 'error' ? "Failed!" : "Copy"}
            </LiquidButton>
            {isCopyPopoverOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-max z-10 animate-fade-in">
                <GlassCard className="p-2 flex flex-col gap-1">
                    <button onClick={() => copyToClipboard(report, false)} className="text-left w-full text-sm px-3 py-1.5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors">Report Only</button>
                    <button onClick={() => copyToClipboard(report, true)} className="text-left w-full text-sm px-3 py-1.5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors">Report & Citations</button>
                </GlassCard>
                </div>
            )}
        </div>
        <LiquidButton onClick={onRegenerate} disabled={isRegenerating || isVisualizing || regenStatus !== 'idle'} className="px-4 py-2 text-sm shrink-0 flex items-center justify-center gap-2">
            {isRegenerating ? <><Spinner /><span>Regenerating</span></> : regenStatus === 'success' ? "Success!" : "Regenerate Report"}
        </LiquidButton>
        <LiquidButton onClick={() => onVisualize(report)} disabled={isVisualizing || isRegenerating} className="px-4 py-2 text-sm shrink-0 flex items-center justify-center gap-2">
            {isVisualizing ? <><Spinner /><span>Visualizing...</span></> : "Visualize"}
        </LiquidButton>
      </div>
    </div>
  );
};

export default ReportHeader;