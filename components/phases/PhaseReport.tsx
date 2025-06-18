
import React, { useRef } from 'react';
import ActionButton from '../ActionButton';
import MarkdownRenderer from '../MarkdownRenderer';
import SourcesListView from '../SourcesListView';
import { ArrowPathIcon, ClipboardDocumentIcon, ArrowDownTrayIcon } from '../icons';
import { ResearchMode, Source } from '../../types';
import { formatDuration } from '../../utils/formatters';
import LoadingSpinner from '../LoadingSpinner';


interface PhaseReportProps {
  researchTopic: string;
  finalReport: string; // This will be the fully synthesized report after all streaming
  initialStreamingContent: string;
  elaboratedStreamingContent: string;
  isElaborating: boolean;
  researchMode: ResearchMode;
  maxIterations: number;
  executedStepsCount: number;
  researchDuration: number | null;
  allSources: Source[];
  areSourcesVisible: boolean;
  toggleSourcesVisibility: () => void;
  resetState: () => void;
  handleCopyMarkdown: () => void;
  handleDownloadTxt: () => void;
  copyStatus: 'idle' | 'copied';
}

const PhaseReport: React.FC<PhaseReportProps> = ({
  researchTopic, finalReport, initialStreamingContent, elaboratedStreamingContent, isElaborating,
  researchMode, maxIterations, executedStepsCount, researchDuration,
  allSources, areSourcesVisible, toggleSourcesVisibility, resetState,
  handleCopyMarkdown, handleDownloadTxt, copyStatus,
}) => {
  const reportContentRef = useRef<HTMLDivElement>(null);

  const displayReportContent = () => {
    if (elaboratedStreamingContent) {
      return elaboratedStreamingContent;
    }
    if (isElaborating && !elaboratedStreamingContent) { 
      // This case means initial is done, elaboration started but no content yet.
      // LoadingSpinner handles this outside. We show nothing here or a placeholder.
      return ""; // Or some placeholder like "Elaboration in progress..." if LoadingSpinner is not enough
    }
    if (initialStreamingContent && !isElaborating) {
      return initialStreamingContent;
    }
    return finalReport; // Fallback to finalReport if no streaming active or completed
  };

  const currentReportText = displayReportContent();

  return (
    <div className="space-y-6 p-2 w-full max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
        <h2 className="text-3xl font-bold text-blue-300 text-center sm:text-left">Final Research Report</h2>
        <ActionButton onClick={resetState} className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 focus:ring-green-500">
          <ArrowPathIcon className="w-5 h-5"/> <span>Start New Research</span>
        </ActionButton>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <h3 className="text-xl font-semibold text-gray-300 mb-1">Topic:</h3>
        <p className="text-blue-300 text-lg mb-4">{researchTopic}</p>
        
        <div className="flex space-x-2 mb-4">
          <ActionButton 
            onClick={handleCopyMarkdown} 
            className="text-sm px-3 py-1.5 flex items-center space-x-1.5" 
            title="Copy report as Markdown"
            // Disable if report is actively streaming and not yet complete in finalReport state
            disabled={ (initialStreamingContent || elaboratedStreamingContent || isElaborating) && !finalReport}
          >
            <ClipboardDocumentIcon /> <span>{copyStatus === 'copied' ? 'Copied!' : 'Copy Markdown'}</span>
          </ActionButton>
          <ActionButton 
            onClick={handleDownloadTxt} 
            className="text-sm px-3 py-1.5 bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 flex items-center space-x-1.5" 
            title="Download .txt"
            disabled={ (initialStreamingContent || elaboratedStreamingContent || isElaborating) && !finalReport}
          >
            <ArrowDownTrayIcon /> <span>Download .txt</span>
          </ActionButton>
        </div>
        
        <p className="text-sm text-gray-400 mb-1">Mode: <span className="font-semibold text-gray-300 capitalize">{researchMode}</span>, Max Iter: <span className="font-semibold text-gray-300">{maxIterations}</span>, Actual Iter: <span className="font-semibold text-gray-300">{executedStepsCount}</span></p>
        {researchDuration !== null && <p className="text-sm text-gray-400 mb-4">Duration: <span className="font-semibold text-gray-300">{formatDuration(researchDuration)}</span></p>}

        <div ref={reportContentRef} id="reportContentArea" className="prose prose-sm sm:prose-base prose-invert max-w-none bg-gray-700 p-4 rounded-md min-h-[200px] max-h-[60vh] overflow-y-auto">
          { (initialStreamingContent && !isElaborating && !elaboratedStreamingContent) && <MarkdownRenderer text={initialStreamingContent} /> }
          { isElaborating && !elaboratedStreamingContent && <LoadingSpinner message="Elaborating report..." /> }
          { elaboratedStreamingContent && <MarkdownRenderer text={elaboratedStreamingContent} /> }
          { !initialStreamingContent && !elaboratedStreamingContent && !isElaborating && finalReport && <MarkdownRenderer text={finalReport} /> }
          { !initialStreamingContent && !elaboratedStreamingContent && !isElaborating && !finalReport && <p className="text-gray-400">Generating report...</p>}
        </div>
      </div>
      <SourcesListView sources={allSources} isVisible={areSourcesVisible} toggleVisibility={toggleSourcesVisibility} />
    </div>
  );
};
export default PhaseReport;