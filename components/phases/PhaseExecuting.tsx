
import React, { useRef, useEffect } from 'react';
import ActionButton from '../ActionButton';
import LoadingSpinner from '../LoadingSpinner';
import ResearchLogView from '../ResearchLogView';
import { StopIcon } from '../icons';
import { ResearchLogEntry, ResearchMode } from '../../types';

interface PhaseExecutingProps {
  handleCancelResearch: () => void;
  isLoading: boolean;
  loadingMessage: string;
  researchLog: ResearchLogEntry[];
  researchMode: ResearchMode;
  maxIterations: number;
  researchCancelled: boolean; // Renamed from researchCancelledRef.current
}

const PhaseExecuting: React.FC<PhaseExecutingProps> = ({
  handleCancelResearch, isLoading, loadingMessage, researchLog,
  researchMode, maxIterations, researchCancelled
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [researchLog]);

  return (
    <div className="space-y-4 p-2">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-blue-300">Research in Progress...</h2>
        <ActionButton 
          onClick={handleCancelResearch} 
          className="bg-red-600 hover:bg-red-700 focus:ring-red-500 flex items-center space-x-1 px-3 py-1.5 text-sm" 
          // Disable if not loading OR if cancelled and no loading message (meaning cancellation processed)
          disabled={researchCancelled && !loadingMessage} 
          isLoading={false} // Loading state managed by main isLoading prop for spinner
        >
          <StopIcon className="w-4 h-4" /> <span>Cancel</span>
        </ActionButton>
      </div>
      {(isLoading || (researchCancelled && loadingMessage)) && (
        <LoadingSpinner message={loadingMessage || (researchCancelled ? "Cancelling research..." : "Processing...")} />
      )}
      <div ref={logEndRef} className="contents"> {/* This div is just for scrolling, ResearchLogView handles its own container */}
         <ResearchLogView 
            logEntries={researchLog} 
            title={`Live Research Log (Mode: ${researchMode}, Max Iterations: ${maxIterations}):`}
            compact={false}
          />
      </div>
    </div>
  );
};
export default PhaseExecuting;
